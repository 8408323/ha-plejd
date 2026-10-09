"""Keep each Plejd device's HA area in step with its room in the Plejd app.

HA only applies a device's suggested area when the device is first registered, so a
device later moved to another room in the Plejd app kept its old HA area forever -
remotes and automations targeting an area then switched the wrong lamps. The daily
cloud poll already reloads the entry whenever the site changes; this runs at the end
of every setup and moves a device whose Plejd room changed since the last sync to the
HA area matching that room.

A room matches an area by name or alias, or by any " / "-separated part of the room
name ("Vardagsrum / Allrum" -> "Vardagsrum"), case-insensitively. A room with no
matching area is left alone rather than creating areas the user never asked for. An
area picked by hand in HA sticks until the device's Plejd room changes again.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.storage import Store

from .const import CONF_DEVICES, CONF_ROOMS, DOMAIN, ROOM_DEVICE_ID_PREFIX

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

STORE_VERSION = 1
STORE_KEY = f"{DOMAIN}.area_sync"


def _fold(name: str) -> str:
    return name.strip().casefold()


def match_area(room_name: str, areas: list[Any]) -> Any | None:
    """The HA area for a Plejd room: whole-name match first, then any " / " part."""
    by_name: dict[str, Any] = {}
    for area in areas:
        for name in (area.name, *(getattr(area, "aliases", None) or ())):
            by_name.setdefault(_fold(name), area)
    for candidate in (room_name, *room_name.split("/")):
        area = by_name.get(_fold(candidate))
        if area is not None:
            return area
    return None


def device_rooms(entry_data: dict[str, Any]) -> dict[str, str]:
    """Plejd HA-device identifier -> room_id, as of the cached site snapshot.

    A multi-output device is one HA device; its first output's room decides (outputs
    are stored in canonical order). A room's own group-light device is in that room.
    """
    rooms: dict[str, str] = {}
    for device in entry_data.get(CONF_DEVICES, []):
        if device.get("room_id"):
            rooms.setdefault(device["device_id"], device["room_id"])
    for room in entry_data.get(CONF_ROOMS, []):
        rooms[f"{ROOM_DEVICE_ID_PREFIX}{room['room_id']}"] = room["room_id"]
    return rooms


async def async_sync_areas(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Move devices whose Plejd room changed since the last sync to the matching area."""
    # ponytail: room names come from CONF_ROOMS, which only lists rooms with a light in
    # them; a device in a lights-free room is skipped until that list covers every room.
    room_names = {room["room_id"]: room["name"] for room in entry.data.get(CONF_ROOMS, [])}
    store: Store = Store(hass, STORE_VERSION, f"{STORE_KEY}.{entry.entry_id}")
    synced: dict[str, str] = await store.async_load() or {}
    devices = dr.async_get(hass)
    areas = list(ar.async_get(hass).async_list_areas())

    current = device_rooms(entry.data)
    for plejd_id, room_id in current.items():
        if synced.get(plejd_id) == room_id:
            continue
        device = devices.async_get_device(identifiers={(DOMAIN, plejd_id)})
        area = match_area(room_names.get(room_id, ""), areas) if room_id in room_names else None
        if device is not None and area is not None and device.area_id != area.id:
            _LOGGER.info("Plejd: moving %s to area %s (Plejd room changed)", device.name, area.name)
            devices.async_update_device(device.id, area_id=area.id)
    if current != synced:
        await store.async_save(current)
