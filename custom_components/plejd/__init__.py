"""The Plejd integration."""

from __future__ import annotations

import logging
from dataclasses import asdict

import voluptuous as vol
from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD, Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .cloud import PlejdCloudError, async_create_room, async_get_site, async_login, async_set_input_setting
from .commission import async_commission_device
from .const import (
    CONF_DEVICES,
    CONF_INPUTS,
    CONF_MOTION,
    CONF_SCENES,
    CONF_SITE_ID,
    DOMAIN,
    HARDWARE_TYPES,
    PLEJD_BLE_COMPANY_ID,
    PLEJD_SERVICE_UUID,
)
from .coordinator import PlejdCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [
    Platform.LIGHT,
    Platform.SWITCH,
    Platform.SCENE,
    Platform.CLIMATE,
    Platform.EVENT,
    Platform.BINARY_SENSOR,
    Platform.SENSOR,
    Platform.COVER,
    Platform.NUMBER,
    Platform.SELECT,
    Platform.BUTTON,
    Platform.UPDATE,
]

SERVICE_ADD_DEVICE = "add_device"
SERVICE_SCAN_DEVICES = "scan_new_devices"

_INPUT_SETTING_SCHEMA = vol.Schema({"input": int, "button_type": str})

_ADD_DEVICE_SCHEMA = vol.Schema(
    {
        vol.Required("device_address"): str,
        vol.Required("name"): str,
        vol.Optional("hardware_id", default="0"): str,
        vol.Optional("room_id"): str,
        vol.Optional("room_title"): str,
        vol.Optional("firmware_build_time", default=0): int,
        vol.Optional("input_settings", default=[]): [_INPUT_SETTING_SCHEMA],
    }
)

# Offsets in bleak's manufacturer_data value (i.e. raw byte offset minus 2 for company ID).
_MFR_LOGIN_OFFSET = 0  # provisioning status flags (raw byte 2)
_MFR_HW_OFFSET = 3  # hardware type ID (raw byte 5)
_MFR_BUILD_TIME_OFFSET = 10  # firmware build timestamp: 6 bytes big-endian (YYYYMMDDHHMMSS decimal)
_MFR_BUILD_TIME_LEN = 6
# LoginByte flags (from Plejd.Shared BleAdvertisementData constants).
_FLAG_HAS_ACCESS_ADDRESS = 0x01
_FLAG_HAS_NODE_INDEX = 0x02
_FLAG_HAS_CRYPTO_KEY = 0x04
_FLAG_ON_DEFAULT_MESH = 0x08


def _parse_plejd_mfr_data(manufacturer_data: dict[int, bytes]) -> dict | None:
    """Extract Plejd provisioning state from BLE manufacturer data.

    Returns None if no usable data is found. The 'is_unprovisioned' flag is True
    when the device is on the default mesh (bit 3) or has no provisioning at all.
    """
    data = manufacturer_data.get(PLEJD_BLE_COMPANY_ID)
    if data is None or len(data) < _MFR_HW_OFFSET + 1:
        return None
    login = data[_MFR_LOGIN_OFFSET]
    hardware_id = data[_MFR_HW_OFFSET]
    on_default_mesh = bool(login & _FLAG_ON_DEFAULT_MESH)
    unclaimed = not (login & (_FLAG_HAS_ACCESS_ADDRESS | _FLAG_HAS_NODE_INDEX | _FLAG_HAS_CRYPTO_KEY))
    end = _MFR_BUILD_TIME_OFFSET + _MFR_BUILD_TIME_LEN
    firmware_build_time = int.from_bytes(data[_MFR_BUILD_TIME_OFFSET:end], "big") if len(data) >= end else 0
    return {
        "hardware_id": hardware_id,
        "is_unprovisioned": on_default_mesh or unclaimed,
        "firmware_build_time": firmware_build_time,
    }


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = PlejdCoordinator(hass, entry)
    # Assign before connecting so diagnostics work even while setup is still failing.
    entry.runtime_data = coordinator
    await coordinator.async_start()
    try:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    except Exception:
        # Don't leak the BLE connection if platform setup fails.
        await coordinator.async_shutdown()
        raise
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    # Mirror HA device renames back to the Plejd app (cloud title update).
    entry.async_on_unload(
        hass.bus.async_listen(
            device_registry.EVENT_DEVICE_REGISTRY_UPDATED, coordinator.async_handle_device_registry_update
        )
    )

    async def _async_handle_add_device(call) -> None:
        address: str = call.data["device_address"]
        name: str = call.data["name"]
        hardware_id: str = call.data.get("hardware_id", "0")
        room_id: str | None = call.data.get("room_id")
        room_title: str | None = call.data.get("room_title")
        firmware_build_time: int = int(call.data.get("firmware_build_time", 0))
        input_settings: list[dict] = call.data.get("input_settings", [])

        # Validate the device is actually in range before touching the cloud, so a
        # typo'd address fails fast instead of creating an orphaned cloud room first.
        ble_device = bluetooth.async_ble_device_from_address(hass, address, connectable=True)
        if ble_device is None:
            raise HomeAssistantError(f"Plejd device {address} not found in Bluetooth range")

        # Auto-fill hardware_id and firmware_build_time from the BLE advertisement when not provided.
        if hardware_id == "0" or firmware_build_time == 0:
            service_infos = bluetooth.async_discovered_service_info(hass, connectable=True)
            adv = next((si for si in service_infos if si.address == address), None)
            if adv:
                parsed_adv = _parse_plejd_mfr_data(adv.manufacturer_data or {})
                if parsed_adv:
                    if hardware_id == "0":
                        hardware_id = str(parsed_adv["hardware_id"])
                    if firmware_build_time == 0:
                        firmware_build_time = parsed_adv["firmware_build_time"]

        http_session = async_get_clientsession(hass)
        try:
            token = await async_login(http_session, entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD])
            site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
            if room_title and not room_id:
                room_id = await async_create_room(http_session, token, site.site_id, room_title)
        except PlejdCloudError as err:
            raise HomeAssistantError(f"Plejd cloud error during device add: {err}") from err

        device_id = address.replace(":", "").lower()
        try:
            await async_commission_device(
                http_session, token, site, ble_device, name, hardware_id, firmware_build_time, room_id
            )
            for cfg in input_settings:
                await async_set_input_setting(
                    http_session, token, site.site_id, device_id, cfg["input"], cfg["button_type"]
                )
        except Exception as err:
            raise HomeAssistantError(f"Plejd commissioning failed: {err}") from err

        # Refresh device list from cloud so the new device is present on reload.
        try:
            fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
        except PlejdCloudError as err:
            raise HomeAssistantError(f"Plejd cloud error refreshing device list: {err}") from err
        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_DEVICES: [asdict(d) for d in fresh_site.devices],
                CONF_INPUTS: [asdict(i) for i in fresh_site.inputs],
                CONF_MOTION: [asdict(m) for m in fresh_site.motion],
                CONF_SCENES: [asdict(s) for s in fresh_site.scenes],
            },
        )
        await hass.config_entries.async_reload(entry.entry_id)

    async def _async_handle_scan_devices(call) -> None:
        service_infos = bluetooth.async_discovered_service_info(hass, connectable=True)
        new_devices = []
        for info in service_infos:
            if PLEJD_SERVICE_UUID not in (info.service_uuids or []):
                continue
            parsed = _parse_plejd_mfr_data(info.manufacturer_data or {})
            if not parsed or not parsed["is_unprovisioned"]:
                continue
            hw_id = parsed["hardware_id"]
            model = HARDWARE_TYPES.get(hw_id, "Unknown")
            new_devices.append(
                {
                    "address": info.address,
                    "name": info.name or model,
                    "rssi": info.rssi,
                    "hardware_id": str(hw_id),
                    "model": model,
                    "firmware_build_time": parsed["firmware_build_time"],
                }
            )
        _LOGGER.info("Plejd scan found %d unprovisioned device(s)", len(new_devices))
        _LOGGER.debug("Plejd scan found unprovisioned device(s): %s", [d["address"] for d in new_devices])
        hass.bus.async_fire(f"{DOMAIN}_new_devices_found", {"devices": new_devices})

    hass.services.async_register(DOMAIN, SERVICE_ADD_DEVICE, _async_handle_add_device, schema=_ADD_DEVICE_SCHEMA)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, SERVICE_ADD_DEVICE))
    hass.services.async_register(DOMAIN, SERVICE_SCAN_DEVICES, _async_handle_scan_devices)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, SERVICE_SCAN_DEVICES))
    return True


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    # Schedules live in the entry options; reload so added/removed switches take effect.
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.async_shutdown()
    return unload_ok
