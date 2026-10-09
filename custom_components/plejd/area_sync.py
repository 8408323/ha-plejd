"""Keep each Plejd device's HA area in step with its room in the Plejd app."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.storage import Store

from .const import CONF_DEVICES, CONF_ROOM_NAMES, CONF_ROOMS, DOMAIN, ROOM_DEVICE_ID_PREFIX

if TYPE_CHECKING:
    from collections.abc import Callable

    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import Event, HomeAssistant

_LOGGER = logging.getLogger(__name__)

STORE_VERSION = 1
STORE_KEY = f"{DOMAIN}.area_sync"


def _store(hass: HomeAssistant, entry: ConfigEntry) -> Store:
    return Store(hass, STORE_VERSION, f"{STORE_KEY}.{entry.entry_id}")


def _fold(name: str) -> str:
    return name.strip().casefold()


def match_area(room_name: str, areas: list[Any]) -> Any | None:
    """Return the area named like the room, its alias, or one " / " part of it."""
    by_name: dict[str, Any] = {}
    for area in areas:
        by_name.setdefault(_fold(area.name), area)
    for area in areas:  # aliases only after every canonical name, so an exact name always wins
        for alias in getattr(area, "aliases", None) or ():
            by_name.setdefault(_fold(alias), area)
    for candidate in (room_name, *room_name.split("/")):
        area = by_name.get(_fold(candidate))
        if area is not None:
            return area
    return None


def get_device_rooms(entry_data: dict[str, Any]) -> dict[str, str]:
    """Map each Plejd HA-device identifier to its room_id; a multi-output device follows its first output."""
    rooms: dict[str, str] = {}
    seen: set[str] = set()
    for device in entry_data.get(CONF_DEVICES, []):
        if device["device_id"] in seen:
            continue
        seen.add(device["device_id"])
        if device.get("room_id"):
            rooms[device["device_id"]] = device["room_id"]
    for room in entry_data.get(CONF_ROOMS, []):
        rooms[f"{ROOM_DEVICE_ID_PREFIX}{room['room_id']}"] = room["room_id"]
    return rooms


async def async_sync_areas(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Move devices whose Plejd room changed since the last sync to the matching HA area."""
    # NOTE: record a device only once its room resolved to an area, so later room/area changes re-evaluate it;
    # remembering the area we assigned lets a changed match retarget it without overriding a hand-picked one.
    room_names = {
        **{room["room_id"]: room["name"] for room in entry.data.get(CONF_ROOMS, [])},
        **(entry.data.get(CONF_ROOM_NAMES) or {}),
    }
    store = _store(hass, entry)
    synced: dict[str, dict[str, str]] = await store.async_load() or {}
    devices = dr.async_get(hass)
    areas = list(ar.async_get(hass).async_list_areas())

    resolved: dict[str, dict[str, str]] = {}
    for plejd_id, room_id in get_device_rooms(entry.data).items():
        room_key = f"{room_id}:{room_names[room_id]}" if room_id in room_names else None
        device = devices.async_get_device(identifiers={(DOMAIN, plejd_id)})
        area = match_area(room_names[room_id], areas) if room_key else None
        if device is None or area is None:
            continue
        resolved[plejd_id] = {"room": room_key, "area": area.id}
        previous = synced.get(plejd_id) or {}
        room_changed = previous.get("room") != room_key
        match_changed = previous.get("area") != area.id and device.area_id == previous.get("area")
        if (room_changed or match_changed) and device.area_id != area.id:
            _LOGGER.info("Plejd: moving %s to area %s (Plejd room changed)", device.name, area.name)
            devices.async_update_device(device.id, area_id=area.id)
    if resolved != synced:
        await store.async_save(resolved)


async def async_reset_areas(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Forget what was synced; run while the option is off and on entry removal."""
    await _store(hass, entry).async_remove()


def async_listen_area_changes(hass: HomeAssistant, entry: ConfigEntry) -> Callable[[], None]:
    """Re-run the sync when an area is added or renamed, so a newly matching room takes effect."""

    async def _on_area_change(_event: Event) -> None:
        try:
            await async_sync_areas(hass, entry)
        except Exception:  # noqa: BLE001 - optional; never let a registry event handler raise
            _LOGGER.warning("Plejd: could not sync device areas after an area change", exc_info=True)

    return hass.bus.async_listen(ar.EVENT_AREA_REGISTRY_UPDATED, _on_area_change)
