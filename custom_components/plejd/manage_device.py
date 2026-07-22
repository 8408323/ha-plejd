"""Remove a Plejd device from the site.

The HA-facing orchestration around cloud.py's async_remove_device: mutate on
the cloud, then refresh and reload the config entry so the change is
reflected. Shared by the remove_device service.

Removing a device is decommissioning it - unlike removing a room or scene
(which still exist for other things to reference), a removed device's own
automations/dim-bindings naturally going stale afterward is expected, the
same as removing any other HA device, not a dependency to guard against.
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
from .cloud import async_remove_device as async_cloud_remove_device
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


async def _async_refresh_and_reload(hass: HomeAssistant, entry: ConfigEntry, http_session, token) -> None:
    try:
        fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error refreshing site: {err}") from err
    # Claim the manual-reload so the entry's update listener (_async_reload_entry) doesn't
    # also reload for this same data change, racing this one - same guard schedule_ws's
    # own _async_persist uses for the identical async_update_entry -> listener race.
    hass.data[schedule_ws.DATA_MANUAL_RELOAD] = entry.entry_id
    try:
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
    finally:
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD, None)
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD_SEEN, None)
        if hass.data.get(schedule_ws.DATA_RELOAD_PENDING) == entry.entry_id:
            # A concurrent options/data change's own reload was suppressed by the guard
            # above while ours was in flight; give it a reload of its own instead of
            # dropping it silently (see _async_reload_entry).
            hass.data.pop(schedule_ws.DATA_RELOAD_PENDING, None)
            await hass.config_entries.async_reload(entry.entry_id)


async def async_remove_device(hass: HomeAssistant, entry: ConfigEntry, *, device_id: str) -> None:
    """Remove a device from the site, then refresh + reload the config entry."""
    http_session, token, site = await _async_login_and_get_site(hass, entry)
    device = next((d for d in site.devices if d.device_id == device_id), None)
    if device is None:
        raise HomeAssistantError(f"Plejd device {device_id} not found on this site")
    try:
        ok = await async_cloud_remove_device(http_session, token, site.site_id, device_id)
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error removing device: {err}") from err
    if not ok:
        raise HomeAssistantError(f"Plejd cloud rejected removing device '{device.name}'")
    await _async_refresh_and_reload(hass, entry, http_session, token)
