"""Add a new Plejd device to a Home Assistant config entry.

The HA-facing orchestration around commission.py's transport-independent BLE
commissioning: resolves the device via HA's Bluetooth integration, registers +
commissions it, then refreshes and reloads the config entry. Shared by the
add_device service and the "Add a device" options-flow wizard.
"""

from __future__ import annotations

import logging
from dataclasses import asdict

from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import schedule_ws
from .cloud import (
    PlejdCloudError,
    async_get_site,
    async_login,
    async_set_input_setting,
)
from .commission import async_commission_device
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
from .discovery import _parse_plejd_mfr_data, async_bluetooth_available

_LOGGER = logging.getLogger(__name__)


async def async_add_device(
    hass: HomeAssistant,
    entry: ConfigEntry,
    *,
    address: str,
    name: str,
    hardware_id: str = "0",
    room_id: str | None = None,
    room_title: str | None = None,
    room_category: str | None = None,
    firmware_build_time: int = 0,
    input_settings: list[dict] | None = None,
) -> None:
    """Add a new Plejd device end-to-end: cloud registration, BLE commissioning,
    input-button config, then refresh + reload the config entry.
    """
    for cfg in input_settings or []:
        if "input" not in cfg or "button_type" not in cfg:
            raise HomeAssistantError(f"Invalid input_settings entry (needs 'input' and 'button_type'): {cfg}")

    if not async_bluetooth_available(hass):
        raise HomeAssistantError(
            "Bluetooth is not available on this Home Assistant instance. Add a local "
            "Bluetooth adapter or an ESPHome Bluetooth proxy (in active mode), then try again."
        )

    # Validate the device is actually in range before touching the cloud, so a
    # typo'd address fails fast instead of creating an orphaned cloud room first.
    ble_device = bluetooth.async_ble_device_from_address(hass, address, connectable=True)
    if ble_device is None:
        raise HomeAssistantError(f"Plejd device {address} not found in Bluetooth range")

    # Confirm the address is actually advertising as unprovisioned before any cloud
    # mutation - the options-flow wizard only ever offers unprovisioned addresses,
    # but this service can be called directly (Developer Tools, automations) with
    # any address, including an already-commissioned device or an unrelated one.
    service_infos = bluetooth.async_discovered_service_info(hass, connectable=True)
    adv = next((si for si in service_infos if si.address == address), None)
    parsed_adv = _parse_plejd_mfr_data(adv.manufacturer_data or {}) if adv else None
    if parsed_adv is None or not parsed_adv["is_unprovisioned"]:
        raise HomeAssistantError(
            f"Plejd device {address} is not currently advertising as unprovisioned "
            "(it may already be commissioned, or isn't a Plejd device)"
        )
    if hardware_id == "0":
        hardware_id = str(parsed_adv["hardware_id"])
    if firmware_build_time == 0:
        firmware_build_time = parsed_adv["firmware_build_time"]

    http_session = async_get_clientsession(hass)
    try:
        token = await async_login(http_session, entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD])
        site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error during device add: {err}") from err

    device_id = address.replace(":", "").lower()
    try:
        await async_commission_device(
            http_session,
            token,
            site,
            ble_device,
            name,
            hardware_id,
            firmware_build_time,
            room_id,
            room_title,
            room_category,
        )
    except Exception as err:
        raise HomeAssistantError(f"Plejd commissioning failed: {err}") from err

    # The device has joined the mesh at this point - input-setting failures are
    # reported but must not skip the refresh/reload below, or HA never learns
    # about a device that's already been commissioned.
    input_setting_errors: list[str] = []
    for cfg in input_settings or []:
        try:
            await async_set_input_setting(
                http_session, token, site.site_id, device_id, cfg["input"], cfg["button_type"]
            )
        except Exception as err:  # noqa: BLE001 - collected below, not fatal to the add
            _LOGGER.warning("Plejd add_device: failed to set input %s button type", cfg["input"], exc_info=True)
            input_setting_errors.append(str(err))

    # Refresh device list from cloud so the new device is present on reload.
    try:
        fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error refreshing device list: {err}") from err
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

    if input_setting_errors:
        raise HomeAssistantError(f"Device added, but some input settings failed: {'; '.join(input_setting_errors)}")
