"""The Plejd integration."""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry

from . import dim_binding_ws, panel, remote_profile_ws
from .add_device import async_add_device
from .bindings import PlejdDimBindings
from .const import CONF_SHOW_PANEL, DOMAIN
from .coordinator import PlejdCoordinator
from .discovery import async_bluetooth_available, async_scan_unprovisioned
from .remote_profiles import PlejdRemoteProfiles

_WS_REGISTERED = f"{DOMAIN}_ws_registered"

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
    # Register the sidebar dashboard before starting the coordinator. It's optional, so a
    # failure (e.g. another panel already owns the `plejd` url path) must not abort setup —
    # the mesh/lights still work, and options remain reachable to hide it. HA also runs
    # this on_unload if a later setup step fails. Toggle via the options.
    if entry.options.get(CONF_SHOW_PANEL, True):
        try:
            await panel.async_register_panel(hass)
        except Exception:  # noqa: BLE001 - the dashboard is optional; never fail setup over it
            _LOGGER.warning("Plejd dashboard panel could not be registered; continuing without it", exc_info=True)
    entry.async_on_unload(lambda: panel.async_unregister_panel(hass))
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

    # Remote → light dim bindings (managed from the dashboard via the WebSocket API).
    # Optional, like the panel: a storage error must not stop the mesh/lights loading.
    dim_bindings = PlejdDimBindings(hass)
    try:
        await dim_bindings.async_load()
    except Exception:  # noqa: BLE001 - bindings are optional; continue with an empty manager
        _LOGGER.warning("Plejd: could not load dim bindings; continuing without them", exc_info=True)
    hass.data[dim_binding_ws.DATA_BINDINGS] = dim_bindings
    entry.async_on_unload(lambda: hass.data.pop(dim_binding_ws.DATA_BINDINGS, None))
    entry.async_on_unload(dim_bindings.shutdown)

    # Custom remote button-profile overrides (see remote_profiles.py). Same optional,
    # storage-backed pattern as the dim bindings above.
    remote_profiles = PlejdRemoteProfiles(hass)
    try:
        await remote_profiles.async_load()
    except Exception:  # noqa: BLE001 - optional; continue with an empty manager
        _LOGGER.warning("Plejd: could not load remote profiles; continuing without them", exc_info=True)
    hass.data[remote_profile_ws.DATA_REMOTE_PROFILES] = remote_profiles
    entry.async_on_unload(lambda: hass.data.pop(remote_profile_ws.DATA_REMOTE_PROFILES, None))

    if not hass.data.get(_WS_REGISTERED):
        dim_binding_ws.async_register(hass)  # hass-global commands; register once
        remote_profile_ws.async_register(hass)
        hass.data[_WS_REGISTERED] = True
    return True


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    # Schedules live in the entry options; reload so added/removed switches take effect.
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        await entry.runtime_data.async_shutdown()
    return unload_ok
