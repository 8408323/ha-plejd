"""WebSocket API for the dashboard's room cards: Plejd rooms and per-light display styles.

`plejd/rooms` maps each Plejd room to its member light entities and, where the room has a safe
light-only group, its room-group light entity (one mesh command for the whole room), so the panel
groups lights the way the app does. Light styles are purely cosmetic (which lamp the panel draws),
live in their own Store and are keyed by unique_id.
"""

from __future__ import annotations

import asyncio

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .const import CATEGORY_LIGHT, CONF_ROOM_NAMES, DOMAIN, ROOM_DEVICE_ID_PREFIX
from .schedule_ws import DATA_ENTRY

# Mirrors the lamp models in frontend/src/lamps.ts.
LIGHT_STYLES = ("bulb", "pendant", "spot", "ceiling", "strip", "table", "floor", "wall")

EVENT_ROOMS_CHANGED = f"{DOMAIN}_rooms_changed"

_STORE_KEY = f"{DOMAIN}.light_styles"
_DATA_STYLES_LOCK = f"{DOMAIN}_light_styles_lock"


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/rooms"})
@websocket_api.async_response
async def ws_rooms(hass: HomeAssistant, connection, msg) -> None:
    entry = hass.data.get(DATA_ENTRY)
    coordinator = getattr(entry, "runtime_data", None)
    if coordinator is None:
        connection.send_error(msg["id"], "not_loaded", "Plejd is not loaded")
        return
    by_unique_id = _entity_ids(hass, entry)
    # Every room, not just coordinator.rooms: that list leaves out rooms whose group would also
    # switch a non-light output, and their lights still belong in their own room card. Such rooms
    # get no entity_id, so the panel switches their lights individually instead of by group.
    # Stored names come from the latest full-site fetch; the cached group rooms' names are a fallback.
    names: dict[str, str] = {
        **{r.room_id: r.name for r in coordinator.rooms},
        **(entry.data.get(CONF_ROOM_NAMES) or {}),
    }
    rooms = {
        room_id: {
            "room_id": room_id,
            "name": name,
            "entity_id": by_unique_id.get(f"{ROOM_DEVICE_ID_PREFIX}{room_id}"),
            "lights": [],
        }
        for room_id, name in names.items()
    }
    for d in coordinator.devices:
        uid = d.device_id if d.output_index == 0 else f"{d.device_id}_{d.output_index}"
        if d.category == CATEGORY_LIGHT and d.room_id in rooms and uid in by_unique_id:
            rooms[d.room_id]["lights"].append(by_unique_id[uid])
    connection.send_result(msg["id"], {"rooms": list(rooms.values())})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/light_styles/get"})
@websocket_api.async_response
async def ws_styles_get(hass: HomeAssistant, connection, msg) -> None:
    stored = await Store(hass, 1, _STORE_KEY).async_load() or {}
    connection.send_result(msg["id"], {"styles": _by_entity_id(hass, stored), "available": list(LIGHT_STYLES)})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): "plejd/light_styles/set",
        vol.Required("entity_id"): str,
        # None clears the override, back to the default lamp
        vol.Required("style"): vol.Any(None, vol.In(LIGHT_STYLES)),
    }
)
@websocket_api.async_response
async def ws_styles_set(hass: HomeAssistant, connection, msg) -> None:
    # Stored by the entity's unique_id, so renaming the entity_id keeps its lamp type.
    reg_entry = er.async_get(hass).async_get(msg["entity_id"])
    if reg_entry is None:
        connection.send_error(msg["id"], "not_found", "Unknown light")
        return
    store = Store(hass, 1, _STORE_KEY)
    # Load-modify-save under a lock, so two quick edits can't drop each other's change.
    async with hass.data.setdefault(_DATA_STYLES_LOCK, asyncio.Lock()):
        stored = dict(await store.async_load() or {})
        if msg["style"] is None:
            stored.pop(reg_entry.unique_id, None)
        else:
            stored[reg_entry.unique_id] = msg["style"]
        await store.async_save(stored)
    connection.send_result(msg["id"], {"styles": _by_entity_id(hass, stored)})


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_rooms)
    websocket_api.async_register_command(hass, ws_styles_get)
    websocket_api.async_register_command(hass, ws_styles_set)


def _entity_ids(hass: HomeAssistant, entry) -> dict[str, str]:
    """This entry's entities, unique_id -> current entity_id."""
    registry = er.async_get(hass)
    return {e.unique_id: e.entity_id for e in er.async_entries_for_config_entry(registry, entry.entry_id)}


def _by_entity_id(hass: HomeAssistant, stored: dict[str, str]) -> dict[str, str]:
    entry = hass.data.get(DATA_ENTRY)
    if entry is None:
        return {}
    ids = _entity_ids(hass, entry)
    return {ids[uid]: style for uid, style in stored.items() if uid in ids}
