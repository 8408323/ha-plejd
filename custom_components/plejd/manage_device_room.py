"""Move a Plejd device to a different room.

Unlike the other manage_*.py modules, this is not a Parse cloud call - the app
models room membership as mesh group membership (confirmed via a live BLE
capture of the app's own "move device to room" action: it leaves the old
room's mesh group, then joins the new one). The cloud's own roomId/outputGroups
records converge afterward (observed within seconds on a live site with a
gateway online) - refreshing the site after the mesh write picks it up, the
same as the cloud-mutation manage_*.py modules' own refresh cycle.

This can't be fully atomic: if the join fails after the leave already
succeeded (e.g. the mesh connection drops mid-operation), the device is left
in no room until the operation is retried.
"""

from __future__ import annotations

from dataclasses import asdict

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import schedule_ws
from .cloud import PlejdAuthError, PlejdCloudError, async_get_site, async_login
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
)


async def _async_login_and_get_site(hass: HomeAssistant, entry: ConfigEntry):
    http_session = async_get_clientsession(hass)
    try:
        token = await async_login(http_session, entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD])
    except PlejdAuthError as err:
        # Raising ConfigEntryAuthFailed only triggers reauth from async_setup_entry or a
        # coordinator's own update method - a service handler must start it explicitly.
        entry.async_start_reauth(hass)
        raise HomeAssistantError("Plejd cloud credentials rejected; reauthentication started") from err
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error: {err}") from err
    try:
        site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error: {err}") from err
    return http_session, token, site


async def _async_refresh_and_reload(
    hass: HomeAssistant, entry: ConfigEntry, http_session, token, *, moved_device_id: str, moved_room_id: str
) -> None:
    try:
        fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error refreshing site: {err}") from err
    # Claim the manual-reload so the entry's update listener (_async_reload_entry) doesn't
    # also reload for this same data change, racing this one - same guard schedule_ws's
    # own _async_persist uses for the identical async_update_entry -> listener race.
    hass.data[schedule_ws.DATA_MANUAL_RELOAD] = entry.entry_id
    try:
        # The moved device's roomId is forced to the intended destination regardless of
        # what this fresh cloud fetch says: the cloud's own roomId/outputGroups records
        # are only known to converge automatically when a gateway is online (confirmed
        # live) - on a BLE-only site there's no such convergence path, so trusting the
        # cloud fetch here could silently persist/reload the device's OLD room even
        # though the mesh write already moved it.
        device_dicts = [
            {**asdict(d), "room_id": moved_room_id} if d.device_id == moved_device_id else asdict(d)
            for d in fresh_site.devices
        ]
        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_DEVICES: device_dicts,
                CONF_INPUTS: [asdict(i) for i in fresh_site.inputs],
                CONF_MOTION: [asdict(m) for m in fresh_site.motion],
                CONF_SCENES: [asdict(s) for s in fresh_site.scenes],
                CONF_ROOMS: [asdict(r) for r in fresh_site.rooms],
                CONF_GATEWAYS: fresh_site.gateways,
                CONF_RESOURCE_SET_ID: fresh_site.resource_set_id,
                CONF_DEVICE_ADDRESSES: fresh_site.device_addresses,
            },
        )
        if not await hass.config_entries.async_reload(entry.entry_id):
            # e.g. a platform refused to unload - the entry may still be running the old
            # data/entities for the just-moved device, so this can't be reported as a
            # clean success.
            raise HomeAssistantError("Plejd device moved, but reloading the integration failed - reload it manually")
    finally:
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD, None)
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD_SEEN, None)
        if hass.data.get(schedule_ws.DATA_RELOAD_PENDING) == entry.entry_id:
            # A concurrent options/data change's own reload was suppressed by the guard
            # above while ours was in flight; give it a reload of its own instead of
            # dropping it silently (see _async_reload_entry).
            hass.data.pop(schedule_ws.DATA_RELOAD_PENDING, None)
            await hass.config_entries.async_reload(entry.entry_id)


async def async_move_device_to_room(hass: HomeAssistant, entry: ConfigEntry, *, device_id: str, room_id: str) -> None:
    """Move a device to a different room by rejoining its mesh group, then refresh + reload."""
    http_session, token, site = await _async_login_and_get_site(hass, entry)
    own_address = site.device_addresses.get(device_id)
    if own_address is None:
        raise HomeAssistantError(f"Plejd device {device_id} not found on this site")
    outputs = [d for d in site.devices if d.device_id == device_id]
    if len(outputs) > 1:
        # The mesh command targets the device's own (shared) address, not a per-output
        # one, but a live capture confirmed a multi-output device's outputs can have
        # independently different rooms - without a capture of moving a second output to
        # confirm how (or whether) the command disambiguates between them, moving a
        # multi-output device risks silently moving the wrong output, or both.
        raise HomeAssistantError(
            f"Plejd device {device_id} has multiple outputs; move_device_to_room isn't safe for it yet"
        )
    new_room = next((r for r in site.all_rooms if r.room_id == room_id), None)
    if new_room is None:
        raise HomeAssistantError(f"Plejd room {room_id} not found on this site")
    if new_room.address is None:
        raise HomeAssistantError(f"Plejd room '{new_room.name}' has no mesh group address")
    current_room_id = outputs[0].room_id
    if current_room_id == room_id:
        raise HomeAssistantError(f"Device is already in room '{new_room.name}'")

    coordinator = entry.runtime_data
    old_room = next((r for r in site.all_rooms if r.room_id == current_room_id), None) if current_room_id else None
    if old_room is not None and old_room.address is not None:
        await coordinator.async_leave_mesh_group(own_address, old_room.address)
    await coordinator.async_join_mesh_group(own_address, new_room.address)

    await _async_refresh_and_reload(hass, entry, http_session, token, moved_device_id=device_id, moved_room_id=room_id)
