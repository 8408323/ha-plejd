"""WebSocket API for the dashboard's schedule editor.

Admin-only commands to list/add/delete on-device weekly time-event schedules — the same
data the config-flow "Configure -> Schedules" step manages — so the panel can offer this
without the native-HA-form dialog. Schedules live in the config entry's options; adding
or deleting one persists there and reloads the entry so the schedule's `switch` entity
(switch.py) is (re)created, which is what actually programs/clears the on-device event.
"""

from __future__ import annotations

import asyncio
import logging

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

from .const import (
    CONF_GATEWAYS,
    CONF_RESOURCE_SET_ID,
    CONF_SCENES,
    CONF_SCHEDULES,
    CONF_TRANSPORT,
    DOMAIN,
    TIME_EVENT_SLOTS,
    TRANSPORT_AUTO,
)

_LOGGER = logging.getLogger(__name__)

DATA_ENTRY = f"{DOMAIN}_schedule_entry"

# Per-entry lock held across every management operation's own update_entry+reload
# sequence (schedule WS saves, add_device, room/scene/schedule services, ...) so they
# serialize against EACH OTHER and against the entry's update listener
# (_async_reload_entry in __init__.py), instead of racing a shared flag that any one
# of them could clear out from under another still-in-flight caller.
_DATA_RELOAD_LOCKS = f"{DOMAIN}_reload_locks"

# Set by _async_reload_entry when it finds async_get_reload_lock() already held - some
# other operation owns an update+reload cycle for this entry right now and will pick up
# this change; the current lock holder checks this after releasing and runs a follow-up
# reload for it, instead of silently dropping it. Like _DATA_EXPECTING_SELF_RELOAD below,
# this is a single hass.data slot holding one entry_id, not a per-entry structure - correct
# only because manifest.json declares single_config_entry (exactly one entry_id ever
# exists). Would need to become per-entry if that ever changes.
DATA_RELOAD_PENDING = f"{DOMAIN}_schedule_reload_pending"

# Set by a reload-lock holder right before its own single async_update_entry() call, so
# the listener invocation that call triggers is recognized as self-triggered - already
# covered by this session's own upcoming reload - rather than mistaken for a genuinely
# concurrent change made by someone else while the lock was held (which would otherwise
# queue a redundant extra reload on every single successful call). Consumed by whichever
# listener invocation sees it first; cleared unconditionally once the session ends so it
# can never leak into a later, unrelated session if the listener never got a chance to run.
_DATA_EXPECTING_SELF_RELOAD = f"{DOMAIN}_reload_expecting_self_reload"

_NEXT_ID_KEY = "next_schedule_id"


def async_get_reload_lock(hass: HomeAssistant, entry_id: str) -> asyncio.Lock:
    """Return the per-entry lock serializing this integration's own reload cycles."""
    locks: dict[str, asyncio.Lock] = hass.data.setdefault(_DATA_RELOAD_LOCKS, {})
    return locks.setdefault(entry_id, asyncio.Lock())


def async_mark_expecting_self_reload(hass: HomeAssistant, entry_id: str) -> None:
    """Call immediately before a reload-lock holder's own async_update_entry(), see above."""
    hass.data[_DATA_EXPECTING_SELF_RELOAD] = entry_id


def async_consume_expected_self_reload(hass: HomeAssistant, entry_id: str) -> bool:
    """True (and clears the marker) if a self-triggered listener invocation was expected."""
    if hass.data.get(_DATA_EXPECTING_SELF_RELOAD) == entry_id:
        hass.data.pop(_DATA_EXPECTING_SELF_RELOAD, None)
        return True
    return False


async def async_reload_entry_with_lock(
    hass: HomeAssistant, entry: ConfigEntry, data: dict, *, options: dict | None = None, error_context: str
) -> None:
    """Write `data` (and optionally `options`) onto the entry and reload it under the
    shared per-entry reload lock.

    Shared by every management operation (room/scene/schedule/device services, add_device,
    ...) that needs to persist a full entry.data (and, for some, entry.options) overlay and
    reload for it to take effect. Raises HomeAssistantError if the entry's own reload
    reports failure. A follow-up reload for a genuinely concurrent change the update
    listener detected meanwhile (see DATA_RELOAD_PENDING) is only logged on failure, since
    it isn't this caller's own operation to fail loudly for.
    """
    lock = async_get_reload_lock(hass, entry.entry_id)
    reloaded = True
    try:
        async with lock:
            async_mark_expecting_self_reload(hass, entry.entry_id)
            if options is not None:
                hass.config_entries.async_update_entry(entry, data=data, options=options)
            else:
                hass.config_entries.async_update_entry(entry, data=data)
            try:
                reloaded = await hass.config_entries.async_reload(entry.entry_id)
            except Exception:  # noqa: BLE001 - surfaced below as the HomeAssistantError callers expect
                _LOGGER.exception("Plejd: failed to reload after %s", error_context)
                reloaded = False
    finally:
        hass.data.pop(_DATA_EXPECTING_SELF_RELOAD, None)
        if hass.data.get(DATA_RELOAD_PENDING) == entry.entry_id:
            # A concurrent change's own reload was suppressed by the lock above while ours
            # was in flight; give it a reload of its own instead of dropping it silently.
            hass.data.pop(DATA_RELOAD_PENDING, None)
            async with lock:
                try:
                    await hass.config_entries.async_reload(entry.entry_id)
                except Exception:  # noqa: BLE001 - best-effort follow-up for someone else's change
                    _LOGGER.warning("Plejd: follow-up reload for a concurrent change failed")
    if not reloaded:
        raise HomeAssistantError(f"Plejd: entry failed to reload after {error_context}")


def _parse_time(value: str) -> tuple[int, int, int] | None:
    """Parse 'HH:MM' or 'HH:MM:SS' into (hour, minute, second), or None if invalid."""
    parts = value.split(":")
    if len(parts) not in (2, 3) or not all(p.isdigit() for p in parts):
        return None
    hour, minute = int(parts[0]), int(parts[1])
    second = int(parts[2]) if len(parts) == 3 else 0
    if hour > 23 or minute > 59 or second > 59:
        return None
    return hour, minute, second


def _current_transport(entry) -> str:
    """Mirror the config-flow schedules step: drop a gateway-only preference once there's no usable gateway."""
    has_gateway = bool(entry.data.get(CONF_GATEWAYS) and entry.data.get(CONF_RESOURCE_SET_ID))
    return entry.options.get(CONF_TRANSPORT, TRANSPORT_AUTO) if has_gateway else TRANSPORT_AUTO


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/schedules/list"})
@websocket_api.async_response
async def ws_list(hass: HomeAssistant, connection, msg) -> None:
    entry = hass.data.get(DATA_ENTRY)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Plejd is not loaded")
        return
    scenes = [{"index": s["index"], "name": s["name"]} for s in entry.data.get(CONF_SCENES, [])]
    connection.send_result(msg["id"], {"schedules": entry.options.get(CONF_SCHEDULES, []), "scenes": scenes})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "plejd/schedules/add",
        vol.Required("name"): str,
        vol.Required("days"): [int],
        vol.Required("time"): str,
        vol.Required("scene"): int,
        vol.Optional("fade", default=0): int,
    }
)
@websocket_api.async_response
async def ws_add(hass: HomeAssistant, connection, msg) -> None:
    entry = hass.data.get(DATA_ENTRY)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Plejd is not loaded")
        return

    name = msg["name"].strip()
    if not name:
        connection.send_error(msg["id"], "name_required", "Name is required")
        return
    days = msg["days"]
    if not isinstance(days, list) or not days or not all(isinstance(d, int) and 0 <= d <= 6 for d in days):
        connection.send_error(msg["id"], "invalid_days", "Pick at least one valid day")
        return
    parsed = _parse_time(msg["time"])
    if parsed is None:
        connection.send_error(msg["id"], "invalid_time", "Invalid time")
        return
    scene_indices = {s["index"] for s in entry.data.get(CONF_SCENES, [])}
    if msg["scene"] not in scene_indices:
        connection.send_error(msg["id"], "invalid_scene", "Unknown scene")
        return
    fade = msg["fade"]
    if not isinstance(fade, int) or fade < 0:
        connection.send_error(msg["id"], "invalid_fade", "Fade must be a non-negative number of seconds")
        return

    schedules: list[dict] = list(entry.options.get(CONF_SCHEDULES, []))
    used_slots = {s["slot"] for s in schedules}
    slot = next((i for i in range(TIME_EVENT_SLOTS) if i not in used_slots), None)
    if slot is None:
        connection.send_error(msg["id"], "no_free_slots", "No free schedule slots")
        return

    next_id: int = entry.options.get(_NEXT_ID_KEY, 0)
    hour, minute, second = parsed
    schedule = {
        "id": next_id,
        "slot": slot,
        "name": name,
        "days": sorted(set(days)),
        "time": f"{hour:02d}:{minute:02d}:{second:02d}",
        "scene": msg["scene"],
        "fade": fade,
    }
    schedules.append(schedule)
    options = {
        **entry.options,
        CONF_SCHEDULES: schedules,
        _NEXT_ID_KEY: next_id + 1,
        CONF_TRANSPORT: _current_transport(entry),
    }
    await _async_persist(hass, connection, msg, entry, options, {"schedules": schedules})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/schedules/delete", vol.Required("schedule_id"): int})
@websocket_api.async_response
async def ws_delete(hass: HomeAssistant, connection, msg) -> None:
    entry = hass.data.get(DATA_ENTRY)
    if entry is None:
        connection.send_error(msg["id"], "not_loaded", "Plejd is not loaded")
        return

    schedules: list[dict] = list(entry.options.get(CONF_SCHEDULES, []))
    target = next((s for s in schedules if s["id"] == msg["schedule_id"]), None)
    if target is None:
        connection.send_error(msg["id"], "not_found", "Schedule not found")
        return

    coordinator = getattr(entry, "runtime_data", None)
    try:
        await coordinator.async_remove_time_event(target["slot"])
    except Exception:  # noqa: BLE001 - best-effort; persist the deletion whatever the mesh does
        _LOGGER.warning("Plejd: could not clear schedule slot %s from the mesh", target["slot"])

    # Re-read after the await: another schedule WS edit may have completed and persisted
    # options while this one was in flight, and the pre-await `schedules` snapshot is stale.
    current: list[dict] = list(entry.options.get(CONF_SCHEDULES, []))
    kept = [s for s in current if s["id"] != msg["schedule_id"]]
    options = {**entry.options, CONF_SCHEDULES: kept, CONF_TRANSPORT: _current_transport(entry)}
    await _async_persist(hass, connection, msg, entry, options, {"schedules": kept})


async def _async_persist(hass: HomeAssistant, connection, msg, entry, options: dict, result: dict) -> None:
    """Save `options` on the entry, reload it, and send the WS response for `result`."""
    # Hold the reload lock so the entry's update listener (_async_reload_entry) doesn't
    # also reload for this same options change - we need this reload's own success/failure.
    lock = async_get_reload_lock(hass, entry.entry_id)
    reloaded = True
    async with lock:
        try:
            async_mark_expecting_self_reload(hass, entry.entry_id)
            try:
                hass.config_entries.async_update_entry(entry, options=options)
            except Exception:  # noqa: BLE001 - nothing was persisted; a genuine save failure
                _LOGGER.exception("Plejd: failed to save schedules")
                save_failed = True
            else:
                save_failed = False
                try:
                    reloaded = await hass.config_entries.async_reload(entry.entry_id)
                except Exception:  # noqa: BLE001 - options are already persisted; treat like a failed reload below
                    _LOGGER.exception("Plejd: failed to reload after saving schedules")
                    reloaded = False
        finally:
            hass.data.pop(_DATA_EXPECTING_SELF_RELOAD, None)
    if hass.data.get(DATA_RELOAD_PENDING) == entry.entry_id:
        # A concurrent options change's own reload was suppressed by the lock above while
        # ours was in flight; it may have landed after we already read entry state, so give
        # it a reload of its own instead of dropping it silently (see _async_reload_entry).
        hass.data.pop(DATA_RELOAD_PENDING, None)
        async with lock:
            try:
                await hass.config_entries.async_reload(entry.entry_id)
            except Exception:  # noqa: BLE001 - best-effort follow-up; already logged if the underlying issue recurs
                _LOGGER.warning("Plejd: follow-up reload for a concurrent option change failed")
    if save_failed:
        connection.send_error(msg["id"], "save_failed", "Could not save schedules")
        return
    if reloaded is False:
        # Send a result, not an error: `options` are already persisted above, and an error with
        # no data would leave the dashboard showing its old list, where a "try again" click adds
        # a second, duplicate schedule instead of seeing the one that already saved.
        connection.send_result(
            msg["id"], {**result, "reload_failed": "Schedule saved, but Plejd failed to reload; try again"}
        )
        return
    connection.send_result(msg["id"], result)


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)
    websocket_api.async_register_command(hass, ws_add)
    websocket_api.async_register_command(hass, ws_delete)
