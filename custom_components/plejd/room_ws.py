"""WebSocket API for the dashboard's room cards: Plejd rooms and per-light display styles.

`plejd/rooms` maps each Plejd room to its room-group light entity (one mesh command for the
whole room) and its member light entities, so the panel can group lights the way the app does.
Light styles are purely cosmetic (which lamp the panel draws) and live in their own Store.
"""

from __future__ import annotations

import asyncio

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.storage import Store

from .const import CATEGORY_LIGHT, DOMAIN, ROOM_DEVICE_ID_PREFIX
from .schedule_ws import DATA_ENTRY

# Mirrors the lamp models in frontend/src/lamps.ts.
LIGHT_STYLES = ("bulb", "pendant", "spot", "ceiling", "strip", "table", "floor", "wall")

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
    registry = er.async_get(hass)
    by_unique_id = {e.unique_id: e.entity_id for e in er.async_entries_for_config_entry(registry, entry.entry_id)}
    rooms = []
    for room in coordinator.rooms:
        members = [
            by_unique_id[uid]
            for d in coordinator.devices
            if d.category == CATEGORY_LIGHT
            and d.room_id == room.room_id
            and (uid := d.device_id if d.output_index == 0 else f"{d.device_id}_{d.output_index}") in by_unique_id
        ]
        rooms.append(
            {
                "room_id": room.room_id,
                "name": room.name,
                "entity_id": by_unique_id.get(f"{ROOM_DEVICE_ID_PREFIX}{room.room_id}"),
                "lights": members,
            }
        )
    connection.send_result(msg["id"], {"rooms": rooms})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/light_styles/get"})
@websocket_api.async_response
async def ws_styles_get(hass: HomeAssistant, connection, msg) -> None:
    styles = await Store(hass, 1, _STORE_KEY).async_load() or {}
    connection.send_result(msg["id"], {"styles": styles, "available": list(LIGHT_STYLES)})


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
    store = Store(hass, 1, _STORE_KEY)
    # Load-modify-save under a lock, so two quick edits can't drop each other's change.
    async with hass.data.setdefault(_DATA_STYLES_LOCK, asyncio.Lock()):
        styles = dict(await store.async_load() or {})
        if msg["style"] is None:
            styles.pop(msg["entity_id"], None)
        else:
            styles[msg["entity_id"]] = msg["style"]
        await store.async_save(styles)
    connection.send_result(msg["id"], {"styles": styles})


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_rooms)
    websocket_api.async_register_command(hass, ws_styles_get)
    websocket_api.async_register_command(hass, ws_styles_set)
