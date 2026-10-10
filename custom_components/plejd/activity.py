"""Activity log for the dashboard: every on/off of a Plejd light or switch and every alarm change, with its source.

HA's own context says when a change came from Home Assistant (a user, an automation or a script). For
changes from outside HA, the mesh shows only part of the story - see PlejdCoordinator.toggle_origin - and
an alarm panel may name who changed it (Verisure's ``changed_by``). Kept in its own Store so the log
survives restarts and recorder purges.
"""

from __future__ import annotations

import time
from collections import OrderedDict
from typing import Any

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .const import DOMAIN
from .schedule_ws import DATA_ENTRY

DATA_ACTIVITY = f"{DOMAIN}_activity"
MAX_ENTRIES = 1000
_STORE_KEY = f"{DOMAIN}.activity"  # + ".<entry_id>": one log per Plejd setup
# Covers aren't logged: Plejd covers have no state read-back, so they never change state in HA.
_TRACKED_PLEJD_DOMAINS = ("light", "switch")
_IGNORED_STATES = ("unavailable", "unknown")
# Automation/script runs remembered for attribution: long enough for runs with delays/waits, bounded for memory.
_RUN_TTL = 24 * 3600
_MAX_CONTEXTS = 5000


class PlejdActivityLog:
    """Listens to state changes and keeps the newest MAX_ENTRIES of them."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.hass = hass
        self._store: Store = Store(hass, 1, f"{_STORE_KEY}.{entry_id}")
        self.entries: list[dict[str, Any]] = []  # oldest first
        self._runs: OrderedDict[str, tuple[float, dict[str, str]]] = OrderedDict()  # context id -> (started, run)
        # Saving is off until the stored log has been read: after a failed read, saving would replace it.
        self._can_save = False
        self._unsubs: list = []

    async def async_load(self) -> None:
        self.entries = list((await self._store.async_load() or {}).get("entries", []))[-MAX_ENTRIES:]
        self._can_save = True

    @callback
    def async_start(self) -> None:
        bus = self.hass.bus
        self._unsubs = [
            bus.async_listen("state_changed", self._on_state_changed),
            bus.async_listen("automation_triggered", self._on_run),
            bus.async_listen("script_started", self._on_run),
        ]

    async def async_stop(self) -> None:
        """Stop listening and write out what's pending, so a reload's new log loads everything."""
        for unsub in self._unsubs:
            unsub()
        self._unsubs = []
        if self._can_save:
            await self._store.async_save({"entries": self.entries})

    @callback
    def _on_run(self, event) -> None:
        kind = "automation" if event.event_type == "automation_triggered" else "script"
        if event.context.id in self._runs:
            return  # a script called by an automation runs in its context: the automation stays the source
        now = time.monotonic()
        self._runs[event.context.id] = (
            now,
            {
                "kind": kind,
                "name": event.data.get("name") or event.data.get("entity_id", ""),
                "entity_id": event.data.get("entity_id", ""),
            },
        )
        while self._runs and (len(self._runs) > _MAX_CONTEXTS or now - next(iter(self._runs.values()))[0] > _RUN_TTL):
            self._runs.popitem(last=False)

    @callback
    def _on_state_changed(self, event) -> None:
        old, new = event.data.get("old_state"), event.data.get("new_state")
        if old is None or new is None or old.state == new.state:
            return  # added/removed, or only an attribute (e.g. brightness) changed
        if old.state in _IGNORED_STATES or new.state in _IGNORED_STATES:
            return  # connection drops and restarts, not someone switching anything
        entity_id = new.entity_id
        domain = entity_id.split(".")[0]
        address = None
        if domain != "alarm_control_panel":
            address = self._plejd_address(entity_id, domain)
            if address is None:
                return
        entry = {
            "t": new.last_changed.isoformat(),
            "entity_id": entity_id,
            "name": new.attributes.get("friendly_name", entity_id),
            "state": new.state,
            "source": self._source(new, address),
        }
        if new.attributes.get("brightness") is not None:
            entry["brightness"] = round(new.attributes["brightness"] / 255 * 100)
        self.entries.append(entry)
        del self.entries[:-MAX_ENTRIES]
        if self._can_save:
            self._store.async_delay_save(lambda: {"entries": self.entries}, 10)

    def _plejd_address(self, entity_id: str, domain: str) -> int | None:
        """The mesh address of a Plejd output entity; None for anything that isn't one."""
        if domain not in _TRACKED_PLEJD_DOMAINS:
            return None
        reg = er.async_get(self.hass).async_get(entity_id)
        coordinator = getattr(self.hass.data.get(DATA_ENTRY), "runtime_data", None)
        if reg is None or reg.platform != DOMAIN or coordinator is None:
            return None
        for device in coordinator.devices:
            uid = device.device_id if device.output_index == 0 else f"{device.device_id}_{device.output_index}"
            if uid == reg.unique_id and device.address is not None:
                return device.address
        return None  # e.g. a room-group light, which only mirrors its member lights

    def _source(self, state, address: int | None) -> dict[str, Any]:
        ctx = state.context
        run = self._runs.get(ctx.id) or (self._runs.get(ctx.parent_id) if ctx.parent_id else None)
        if run:
            return dict(run[1])
        if ctx.user_id:
            return {"kind": "user", "user_id": ctx.user_id}
        if address is None:  # an alarm panel: its own integration may know who changed it
            changed_by = state.attributes.get("changed_by")
            return {"kind": "alarm", "name": changed_by} if changed_by else {"kind": "external"}
        coordinator = getattr(self.hass.data.get(DATA_ENTRY), "runtime_data", None)
        origin = coordinator.toggle_origin(address) if coordinator is not None else None
        return origin or {"kind": "external"}


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/activity/list", vol.Optional("limit", default=300): int})
@websocket_api.async_response
async def ws_list(hass: HomeAssistant, connection, msg) -> None:
    log: PlejdActivityLog | None = hass.data.get(DATA_ACTIVITY)
    if log is None:
        connection.send_error(msg["id"], "not_loaded", "Plejd is not loaded")
        return
    entries = log.entries[-max(1, min(msg["limit"], MAX_ENTRIES)) :][::-1]  # newest first
    names: dict[str, str] = {}
    for entry in entries:
        user_id = entry["source"].get("user_id")
        if user_id and user_id not in names:
            user = await hass.auth.async_get_user(user_id)
            names[user_id] = user.name if user else user_id
    connection.send_result(
        msg["id"],
        {
            "entries": [
                {**e, "source": {**e["source"], "name": names[e["source"]["user_id"]]}}
                if e["source"].get("user_id")
                else e
                for e in entries
            ]
        },
    )


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)


async def async_remove_store(hass: HomeAssistant, entry_id: str) -> None:
    """Delete a removed Plejd setup's log, so a later setup doesn't inherit it."""
    await Store(hass, 1, f"{_STORE_KEY}.{entry_id}").async_remove()
