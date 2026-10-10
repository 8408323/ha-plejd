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
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
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
# How long after an HA command to a Plejd room its member lights' changes are credited to it.
_ROOM_COMMAND_WINDOW = 10.0


class PlejdActivityLog:
    """Listens to state changes and keeps the newest MAX_ENTRIES of them."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        self.hass = hass
        self._store: Store = Store(hass, 1, f"{_STORE_KEY}.{entry_id}")
        self.entries: list[dict[str, Any]] = []  # oldest first
        self._runs: OrderedDict[str, tuple[float, dict[str, str]]] = OrderedDict()  # context id -> (started, run)
        # Saving is off until the stored log has been read: after a failed read, saving would replace it.
        self._can_save = False
        # member mesh address -> (when, source) of an HA command sent to its Plejd room light. The room light
        # isn't logged, and the member changes it causes carry no context of their own.
        self._room_commands: dict[int, tuple[float, dict[str, Any], str | None]] = {}  # + the expected new state
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
            bus.async_listen("call_service", self._on_call_service),
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
    def _on_call_service(self, event) -> None:
        if event.data.get("domain") != "light":
            return
        source = self._ha_source(event.context)
        if source is None:
            return
        # Only these switch a light: turn_on/turn_off say which way, toggle can go either way. Anything else
        # (start_dim/stop_dim, ...) causes no on/off transition and must not be credited with one.
        service = event.data.get("service")
        if service not in ("turn_on", "turn_off", "toggle"):
            return
        expected = {"turn_on": "on", "turn_off": "off"}.get(service)
        now = time.monotonic()
        for address in self._targeted_room_members(event.data.get("service_data") or {}):
            self._room_commands[address] = (now, source, expected)

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

    def _targeted_room_members(self, service_data: dict[str, Any]) -> list[int]:
        """Member addresses of every Plejd room light a light service call targets.

        Matches each room light against the call's entity/device/area/floor/label targets itself rather than
        through HA's target helper, whose signature differs across the supported HA versions.
        """
        coordinator = getattr(self.hass.data.get(DATA_ENTRY), "runtime_data", None)
        if coordinator is None:
            return []

        def ids(key: str) -> set[str]:
            value = service_data.get(key) or []
            return {value} if isinstance(value, str) else set(value)

        def expand_groups(targets: set[str]) -> set[str]:
            """Members of any (nested) legacy group.* target, like HA's own expansion."""
            out, todo = set(), list(targets)
            while todo:
                entity_id = todo.pop()
                if entity_id in out:
                    continue
                out.add(entity_id)
                if entity_id.startswith("group.") and (group := self.hass.states.get(entity_id)):
                    todo.extend(group.attributes.get("entity_id") or [])
            return out

        entity_ids, device_ids, area_ids, floor_ids, label_ids = (
            expand_groups(ids("entity_id")),
            ids("device_id"),
            ids("area_id"),
            ids("floor_id"),
            ids("label_id"),
        )
        registry = er.async_get(self.hass)
        by_unique_id = {
            e.unique_id: e for e in er.async_entries_for_config_entry(registry, self.hass.data[DATA_ENTRY].entry_id)
        }
        members: list[int] = []
        for room in coordinator.rooms:
            reg = by_unique_id.get(f"room_{room.room_id}")
            if reg is None:
                continue
            # Mirrors HA's target expansion: the entity's own area, else its device's; labels on the entity,
            # its device or its area; and the floor of that area.
            device = dr.async_get(self.hass).async_get(reg.device_id) if reg.device_id else None
            area_id = reg.area_id or getattr(device, "area_id", None)
            area = ar.async_get(self.hass).async_get_area(area_id) if area_id else None
            labels = (
                set(reg.labels or ())
                | set(getattr(device, "labels", ()) or ())
                | set(getattr(area, "labels", ()) or ())
            )
            if (
                "all" in entity_ids  # entity_id: all targets every light
                or reg.entity_id in entity_ids
                or (reg.device_id and reg.device_id in device_ids)
                or (area_id and area_id in area_ids)
                or (getattr(area, "floor_id", None) in floor_ids)
                or labels & label_ids
            ):
                members.extend(room.member_addresses)
        return members

    def _ha_source(self, ctx) -> dict[str, Any] | None:
        """The automation/script run or user behind an HA context; None when it didn't come from HA."""
        run = self._runs.get(ctx.id) or (self._runs.get(ctx.parent_id) if ctx.parent_id else None)
        if run:
            return dict(run[1])
        if ctx.user_id:
            return {"kind": "user", "user_id": ctx.user_id}
        return None

    def _source(self, state, address: int | None) -> dict[str, Any]:
        ha = self._ha_source(state.context)
        if ha:
            return ha
        # A room command is used up by the member's first transition after it, whichever way that goes: it
        # credits that transition if it's the one the command asked for, and nothing later either way.
        cmd = self._room_commands.pop(address, None) if address is not None else None
        if cmd and time.monotonic() - cmd[0] <= _ROOM_COMMAND_WINDOW and cmd[2] in (None, state.state):
            return dict(cmd[1])
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
