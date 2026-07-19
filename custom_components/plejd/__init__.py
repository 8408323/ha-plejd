"""The Plejd integration."""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry

from .add_device import async_add_device
from .const import DOMAIN
from .coordinator import PlejdCoordinator
from .dim_ramp import PlejdDimRamp, resolve_addresses
from .discovery import async_bluetooth_available, async_scan_unprovisioned

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
SERVICE_START_DIM = "start_dim"
SERVICE_STOP_DIM = "stop_dim"

_ID_LIST = vol.All(vol.Any(str, [str]), lambda v: [v] if isinstance(v, str) else v)
# Standard HA target: any of entity / area / device. Area = "a whole Plejd room".
_DIM_TARGET = {
    vol.Optional("entity_id", default=list): _ID_LIST,
    vol.Optional("area_id", default=list): _ID_LIST,
    vol.Optional("device_id", default=list): _ID_LIST,
}
_START_DIM_SCHEMA = vol.Schema({**_DIM_TARGET, vol.Required("direction"): vol.In(["up", "down"])})
_STOP_DIM_SCHEMA = vol.Schema(dict(_DIM_TARGET))

_INPUT_SETTING_SCHEMA = vol.Schema({vol.Required("input"): int, vol.Required("button_type"): str})

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
        await async_add_device(
            hass,
            entry,
            address=call.data["device_address"],
            name=call.data["name"],
            hardware_id=call.data.get("hardware_id", "0"),
            room_id=call.data.get("room_id"),
            room_title=call.data.get("room_title"),
            firmware_build_time=int(call.data.get("firmware_build_time", 0)),
            input_settings=call.data.get("input_settings", []),
        )

    async def _async_handle_scan_devices(call) -> None:
        if not async_bluetooth_available(hass):
            raise HomeAssistantError(
                "Bluetooth is not available on this Home Assistant instance. Add a local "
                "Bluetooth adapter or an ESPHome Bluetooth proxy, then try again."
            )
        new_devices = async_scan_unprovisioned(hass)
        _LOGGER.info("Plejd scan found %d unprovisioned device(s)", len(new_devices))
        _LOGGER.debug("Plejd scan found unprovisioned device(s): %s", [d["address"] for d in new_devices])
        hass.bus.async_fire(f"{DOMAIN}_new_devices_found", {"devices": new_devices})

    hass.services.async_register(DOMAIN, SERVICE_ADD_DEVICE, _async_handle_add_device, schema=_ADD_DEVICE_SCHEMA)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, SERVICE_ADD_DEVICE))
    hass.services.async_register(DOMAIN, SERVICE_SCAN_DEVICES, _async_handle_scan_devices)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, SERVICE_SCAN_DEVICES))

    # Remote hold-to-dim: bind a dimmer remote's move/stop actions to these services and
    # the ramp walks the light smoothly over the gateway (#76). Remote-agnostic — the
    # caller supplies any Plejd light entity_id.
    ramp = PlejdDimRamp(hass, coordinator)
    entry.async_on_unload(ramp.shutdown)

    async def _async_handle_start_dim(call) -> None:
        direction = 1 if call.data["direction"] == "up" else -1
        for address in resolve_addresses(
            hass, coordinator, call.data["entity_id"], call.data["area_id"], call.data["device_id"]
        ):
            ramp.start(address, direction)

    async def _async_handle_stop_dim(call) -> None:
        for address in resolve_addresses(
            hass, coordinator, call.data["entity_id"], call.data["area_id"], call.data["device_id"]
        ):
            ramp.stop(address)

    hass.services.async_register(DOMAIN, SERVICE_START_DIM, _async_handle_start_dim, schema=_START_DIM_SCHEMA)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, SERVICE_START_DIM))
    hass.services.async_register(DOMAIN, SERVICE_STOP_DIM, _async_handle_stop_dim, schema=_STOP_DIM_SCHEMA)
    entry.async_on_unload(lambda: hass.services.async_remove(DOMAIN, SERVICE_STOP_DIM))
    return True


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    # Schedules live in the entry options; reload so added/removed switches take effect.
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.async_shutdown()
    return unload_ok
