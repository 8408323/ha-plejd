"""WebSocket API for the dashboard's schedule editor.

Admin-only commands to list/add/delete on-device weekly time-event schedules — the same
data the config-flow "Configure -> Schedules" step manages — so the panel can offer this
without the native-HA-form dialog. Schedules live in the config entry's options; adding
or deleting one persists there and reloads the entry so the schedule's `switch` entity
(switch.py) is (re)created, which is what actually programs/clears the on-device event.
"""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant

from .const import CONF_SCENES, CONF_SCHEDULES, DOMAIN, TIME_EVENT_SLOTS

_LOGGER = logging.getLogger(__name__)

DATA_ENTRY = f"{DOMAIN}_schedule_entry"

_NEXT_ID_KEY = "next_schedule_id"


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
    options = {**entry.options, CONF_SCHEDULES: schedules, _NEXT_ID_KEY: next_id + 1}
    if not await _async_persist(hass, connection, msg, entry, options):
        return
    connection.send_result(msg["id"], {"schedules": schedules})


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

    kept = [s for s in schedules if s["id"] != msg["schedule_id"]]
    options = {**entry.options, CONF_SCHEDULES: kept}
    if not await _async_persist(hass, connection, msg, entry, options):
        return
    connection.send_result(msg["id"], {"schedules": kept})


async def _async_persist(hass: HomeAssistant, connection, msg, entry, options: dict) -> bool:
    """Save `options` on the entry and reload it so the switch platform picks up the change."""
    try:
        hass.config_entries.async_update_entry(entry, options=options)
        await hass.config_entries.async_reload(entry.entry_id)
    except Exception:  # noqa: BLE001 - log the detail server-side, return a stable generic message
        _LOGGER.exception("Plejd: failed to save schedules")
        connection.send_error(msg["id"], "save_failed", "Could not save schedules")
        return False
    return True


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)
    websocket_api.async_register_command(hass, ws_add)
    websocket_api.async_register_command(hass, ws_delete)
