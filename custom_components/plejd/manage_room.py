"""Rename, reorder, recategorize, and remove Plejd rooms.

The HA-facing orchestration around cloud.py's room functions: mutate on the
cloud, then refresh and reload the config entry so the change is reflected.
Shared by the update_room and remove_room services.
"""

from __future__ import annotations

from dataclasses import asdict

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .cloud import PlejdCloudError, async_get_site, async_login
from .cloud import async_remove_room as async_cloud_remove_room
from .cloud import async_update_room as async_cloud_update_room
from .const import (
    CONF_DEVICE_ADDRESSES,
    CONF_DEVICES,
    CONF_GATEWAYS,
    CONF_INPUTS,
    CONF_MOTION,
    CONF_RESOURCE_SET_ID,
    CONF_ROOMS,
    CONF_SCENES,
    CONF_SITE_ID,
    ROOM_CATEGORIES,
)


async def _async_login_and_get_site(hass: HomeAssistant, entry: ConfigEntry):
    http_session = async_get_clientsession(hass)
    try:
        token = await async_login(http_session, entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD])
        site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error: {err}") from err
    return http_session, token, site


async def _async_refresh_and_reload(hass: HomeAssistant, entry: ConfigEntry, http_session, token) -> None:
    try:
        fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error refreshing site: {err}") from err
    hass.config_entries.async_update_entry(
        entry,
        data={
            **entry.data,
            CONF_DEVICES: [asdict(d) for d in fresh_site.devices],
            CONF_INPUTS: [asdict(i) for i in fresh_site.inputs],
            CONF_MOTION: [asdict(m) for m in fresh_site.motion],
            CONF_SCENES: [asdict(s) for s in fresh_site.scenes],
            CONF_ROOMS: [asdict(r) for r in fresh_site.rooms],
            CONF_GATEWAYS: fresh_site.gateways,
            CONF_RESOURCE_SET_ID: fresh_site.resource_set_id,
            CONF_DEVICE_ADDRESSES: fresh_site.device_addresses,
        },
    )
    await hass.config_entries.async_reload(entry.entry_id)


async def async_update_room(
    hass: HomeAssistant,
    entry: ConfigEntry,
    *,
    room_id: str,
    title: str | None = None,
    order: int | None = None,
    category: str | None = None,
) -> None:
    """Rename, reorder, and/or recategorize a room, then refresh + reload the config entry."""
    if title is None and order is None and category is None:
        raise HomeAssistantError("update_room needs at least one of title, order, or category")
    if category is not None and category not in ROOM_CATEGORIES:
        raise HomeAssistantError(f"Invalid room category '{category}'; must be one of {', '.join(ROOM_CATEGORIES)}")
    http_session, token, site = await _async_login_and_get_site(hass, entry)
    if not any(r.room_id == room_id for r in site.all_rooms):
        raise HomeAssistantError(f"Plejd room {room_id} not found on this site")
    try:
        ok = await async_cloud_update_room(
            http_session, token, site.site_id, room_id, title=title, order=order, category=category
        )
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error updating room: {err}") from err
    if not ok:
        raise HomeAssistantError(f"Plejd cloud rejected the room update for {room_id}")
    await _async_refresh_and_reload(hass, entry, http_session, token)


async def async_remove_room(hass: HomeAssistant, entry: ConfigEntry, *, room_id: str) -> None:
    """Remove an empty room, then refresh + reload the config entry.

    The app itself refuses to delete a room that still has devices in it (shown as a
    dialog rather than a cloud round-trip) - mirrored here as a fast, clear local check
    instead of relying on the cloud's own rejection.
    """
    http_session, token, site = await _async_login_and_get_site(hass, entry)
    room = next((r for r in site.all_rooms if r.room_id == room_id), None)
    if room is None:
        raise HomeAssistantError(f"Plejd room {room_id} not found on this site")
    if room.has_devices:
        raise HomeAssistantError(f"Plejd room '{room.name}' still has devices in it and can't be removed")
    try:
        ok = await async_cloud_remove_room(http_session, token, site.site_id, room_id)
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error removing room: {err}") from err
    if not ok:
        raise HomeAssistantError(f"Plejd cloud rejected removing room '{room.name}'")
    await _async_refresh_and_reload(hass, entry, http_session, token)
