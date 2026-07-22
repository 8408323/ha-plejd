"""The Plejd integration."""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import device_registry

from . import dim_binding_ws, panel, remote_profile_ws, schedule_ws
from .add_device import async_add_device
from .bindings import PlejdDimBindings
from .const import CONF_SHOW_PANEL, DOMAIN, ROOM_CATEGORIES
from .coordinator import PlejdCoordinator
from .discovery import async_bluetooth_available, async_scan_unprovisioned
from .holiday_mode import DATA_HOLIDAY_MODE, PlejdHolidayMode
from .manage_device import async_remove_device
from .manage_device_room import async_move_device_to_room
from .manage_room import async_remove_room, async_update_room
from .manage_scene import async_create_scene, async_remove_scene, async_update_scene
from .remote_profiles import PlejdRemoteProfiles

_WS_REGISTERED = f"{DOMAIN}_ws_registered"
# The config entry the permanently-registered service handlers below should act on -
# refreshed on every async_setup_entry call (including a retry or a later reinstall), so
# the handlers stay bound to whichever entry is actually current instead of the first one
# ever seen. Deliberately never cleared on unload: see the registration comment below.
_DATA_CURRENT_ENTRY = f"{DOMAIN}_current_entry"

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
SERVICE_ALL_OFF = "all_off"
SERVICE_UPDATE_ROOM = "update_room"
SERVICE_REMOVE_ROOM = "remove_room"
SERVICE_CREATE_SCENE = "create_scene"
SERVICE_UPDATE_SCENE = "update_scene"
SERVICE_REMOVE_SCENE = "remove_scene"
SERVICE_REMOVE_DEVICE = "remove_device"
SERVICE_MOVE_DEVICE_TO_ROOM = "move_device_to_room"

_INPUT_SETTING_SCHEMA = vol.Schema({vol.Required("input"): int, vol.Required("button_type"): str})

_SCENE_STEP_SCHEMA = vol.Schema(
    {
        vol.Required("device_id"): str,
        vol.Required("output"): int,
        vol.Required("state"): vol.In(["On", "Off", "Temperature", "PWM", "Boost", "Frost"]),
        vol.Required("value"): int,
        vol.Optional("color_temperature"): int,
        vol.Optional("coverable_tilt"): int,
        vol.Optional("climate_boost_time"): int,
    }
)

_ADD_DEVICE_SCHEMA = vol.Schema(
    {
        vol.Required("device_address"): str,
        vol.Required("name"): str,
        vol.Optional("hardware_id", default="0"): str,
        vol.Optional("room_id"): str,
        vol.Optional("room_title"): str,
        vol.Optional("room_category"): vol.In(ROOM_CATEGORIES),
        vol.Optional("firmware_build_time", default=0): int,
        vol.Optional("input_settings", default=[]): [_INPUT_SETTING_SCHEMA],
    }
)

_UPDATE_ROOM_SCHEMA = vol.Schema(
    {
        vol.Required("room_id"): str,
        vol.Optional("title"): str,
        vol.Optional("order"): vol.All(int, vol.Range(min=0)),
        vol.Optional("category"): vol.In(ROOM_CATEGORIES),
    }
)

_REMOVE_ROOM_SCHEMA = vol.Schema({vol.Required("room_id"): str})

_CREATE_SCENE_SCHEMA = vol.Schema(
    {
        vol.Required("title"): str,
        vol.Required("scene_steps"): [_SCENE_STEP_SCHEMA],
        vol.Optional("order", default=0): vol.All(int, vol.Range(min=0)),
        vol.Optional("hidden_from_scene_list", default=False): bool,
    }
)

_UPDATE_SCENE_SCHEMA = vol.Schema(
    {
        vol.Required("scene_id"): str,
        vol.Optional("title"): str,
        vol.Optional("order"): vol.All(int, vol.Range(min=0)),
        vol.Optional("scene_steps"): [_SCENE_STEP_SCHEMA],
        vol.Optional("hidden_from_scene_list"): bool,
    }
)

_REMOVE_SCENE_SCHEMA = vol.Schema({vol.Required("scene_id"): str})

_REMOVE_DEVICE_SCHEMA = vol.Schema({vol.Required("device_id"): str})

_MOVE_DEVICE_TO_ROOM_SCHEMA = vol.Schema({vol.Required("device_id"): str, vol.Required("room_id"): str})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    coordinator = PlejdCoordinator(hass, entry)
    # Assign before connecting so diagnostics work even while setup is still failing.
    entry.runtime_data = coordinator
    # Refreshed on every attempt (including a retry, or a later remove+reinstall) so the
    # permanently-registered handlers below always act on whichever entry is current -
    # see _DATA_CURRENT_ENTRY.
    hass.data[_DATA_CURRENT_ENTRY] = entry

    async def _async_handle_add_device(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_add_device(
            hass,
            current_entry,
            address=call.data["device_address"],
            name=call.data["name"],
            hardware_id=call.data.get("hardware_id", "0"),
            room_id=call.data.get("room_id"),
            room_title=call.data.get("room_title"),
            room_category=call.data.get("room_category"),
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

    async def _async_handle_all_off(call) -> None:
        # entry.runtime_data of the CURRENT entry, not a closed-over coordinator: this
        # handler is only ever (re-)registered on the first setup attempt (see the
        # registration guard below), so a later retry's or reinstall's coordinator must
        # be looked up fresh.
        await hass.data[_DATA_CURRENT_ENTRY].runtime_data.async_all_off()

    async def _async_handle_update_room(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_update_room(
            hass,
            current_entry,
            room_id=call.data["room_id"],
            title=call.data.get("title"),
            order=call.data.get("order"),
            category=call.data.get("category"),
        )

    async def _async_handle_remove_room(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_remove_room(hass, current_entry, room_id=call.data["room_id"])

    async def _async_handle_create_scene(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_create_scene(
            hass,
            current_entry,
            title=call.data["title"],
            scene_steps=call.data["scene_steps"],
            order=call.data["order"],
            hidden_from_scene_list=call.data["hidden_from_scene_list"],
        )

    async def _async_handle_update_scene(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_update_scene(
            hass,
            current_entry,
            scene_id=call.data["scene_id"],
            title=call.data.get("title"),
            order=call.data.get("order"),
            scene_steps=call.data.get("scene_steps"),
            hidden_from_scene_list=call.data.get("hidden_from_scene_list"),
        )

    async def _async_handle_remove_scene(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_remove_scene(hass, current_entry, scene_id=call.data["scene_id"])

    async def _async_handle_remove_device(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_remove_device(hass, current_entry, device_id=call.data["device_id"])

    async def _async_handle_move_device_to_room(call) -> None:
        current_entry = hass.data[_DATA_CURRENT_ENTRY]
        await async_move_device_to_room(
            hass, current_entry, device_id=call.data["device_id"], room_id=call.data["room_id"]
        )

    # Registered once per hass lifetime, before coordinator.async_start(), and NOT torn
    # down by entry.async_on_unload: HA runs every already-registered on_unload callback
    # as cleanup when async_setup_entry raises ConfigEntryNotReady (same path a failed
    # mesh connection takes), which would otherwise unregister these services again right
    # after registering them - defeating the point of registering early (e.g. being able
    # to remove_device the one stale device that's keeping the mesh from connecting).
    # Same permanent-registration pattern already used below for the WS commands; safe
    # here too since this integration is single_config_entry (only one entry ever exists)
    # and every handler above reads hass.data[_DATA_CURRENT_ENTRY] fresh rather than
    # closing over this specific attempt's entry, so they rebind correctly even after a
    # full remove+reinstall (not just a setup retry) without needing to re-register.
    # Checked per-service (not one all-or-nothing flag): a service added by a later
    # integration update would otherwise stay unregistered on a reload of an already-
    # loaded HA process, needing a full HA restart just to appear.
    def _register_once(service: str, handler, schema=None) -> None:
        if not hass.services.has_service(DOMAIN, service):
            hass.services.async_register(DOMAIN, service, handler, schema=schema)

    _register_once(SERVICE_ADD_DEVICE, _async_handle_add_device, _ADD_DEVICE_SCHEMA)
    _register_once(SERVICE_SCAN_DEVICES, _async_handle_scan_devices)
    _register_once(SERVICE_ALL_OFF, _async_handle_all_off)
    _register_once(SERVICE_UPDATE_ROOM, _async_handle_update_room, _UPDATE_ROOM_SCHEMA)
    _register_once(SERVICE_REMOVE_ROOM, _async_handle_remove_room, _REMOVE_ROOM_SCHEMA)
    _register_once(SERVICE_CREATE_SCENE, _async_handle_create_scene, _CREATE_SCENE_SCHEMA)
    _register_once(SERVICE_UPDATE_SCENE, _async_handle_update_scene, _UPDATE_SCENE_SCHEMA)
    _register_once(SERVICE_REMOVE_SCENE, _async_handle_remove_scene, _REMOVE_SCENE_SCHEMA)
    _register_once(SERVICE_REMOVE_DEVICE, _async_handle_remove_device, _REMOVE_DEVICE_SCHEMA)
    _register_once(SERVICE_MOVE_DEVICE_TO_ROOM, _async_handle_move_device_to_room, _MOVE_DEVICE_TO_ROOM_SCHEMA)

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

    # Holiday mode (presence simulation) — constructed before platform forwarding so the
    # switch platform can look it up; the switch entity itself controls start/stop.
    hass.data[DATA_HOLIDAY_MODE] = PlejdHolidayMode(hass, entry)

    try:
        await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    except Exception:
        # Don't leak the BLE connection, or a running holiday-mode timer, if platform setup
        # fails partway — a platform forwarded before the failure (e.g. a restored-on
        # holiday switch) may have already started it.
        holiday_mode = hass.data.pop(DATA_HOLIDAY_MODE, None)
        if holiday_mode is not None:
            # A platform earlier than switch may not have run yet, so this manager's
            # persisted deadlines were never loaded; start() loads them (idempotent if
            # a restored switch already did) so stop()'s persist can't wipe the store
            # with an empty, never-loaded in-memory state.
            await holiday_mode.async_start()
            await holiday_mode.async_stop()
        await coordinator.async_shutdown()
        raise
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    # Mirror HA device renames back to the Plejd app (cloud title update).
    entry.async_on_unload(
        hass.bus.async_listen(
            device_registry.EVENT_DEVICE_REGISTRY_UPDATED, coordinator.async_handle_device_registry_update
        )
    )

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

    # Schedules (managed from the dashboard via the WebSocket API too, mirroring bindings above).
    hass.data[schedule_ws.DATA_ENTRY] = entry
    entry.async_on_unload(lambda: hass.data.pop(schedule_ws.DATA_ENTRY, None))

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
        schedule_ws.async_register(hass)
        remote_profile_ws.async_register(hass)
        hass.data[_WS_REGISTERED] = True
    return True


async def _async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    # Schedules live in the entry options; reload so added/removed switches take effect.
    # Skip when the schedule WebSocket API is already reloading this entry itself (it awaits
    # the reload to report success/failure back to the dashboard) - avoids a double reload.
    if hass.data.get(schedule_ws.DATA_MANUAL_RELOAD) == entry.entry_id:
        # The first skipped call is always this listener firing for _async_persist's own
        # async_update_entry() below, already covered by the reload it's about to await -
        # not a real concurrent change, so it must not schedule a follow-up reload too.
        if hass.data.get(schedule_ws.DATA_MANUAL_RELOAD_SEEN) == entry.entry_id:
            # A second skipped call while still guarded IS a genuinely different options
            # change (e.g. a concurrent options-flow edit) that may land after the in-flight
            # reload already read entry state - mark it for a follow-up instead of dropping it.
            hass.data[schedule_ws.DATA_RELOAD_PENDING] = entry.entry_id
        else:
            hass.data[schedule_ws.DATA_MANUAL_RELOAD_SEEN] = entry.entry_id
        return
    await hass.config_entries.async_reload(entry.entry_id)


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    # Stop holiday mode (and turn off any lights it owns) before the light platform and
    # the mesh connection go away, or the cleanup calls would target entities that no
    # longer exist / a mesh that can no longer reach them. Unlike the coordinator below,
    # this runs unconditionally (not gated on unload_ok): its own timer/state is this
    # integration's alone to own, independent of whether some other platform's unload fails.
    # Only *remove* it from hass.data once the unload actually succeeds, though — if a
    # platform refuses to unload, the entry (and its holiday switch, still reporting on)
    # stays loaded, so resume it instead of leaving presence simulation silently stopped —
    # but only if it was actually running before this stop, or a switch left off would
    # come back with a hidden timer behind an entity that still reads off (#89 review).
    # A later retry must still be able to find it either way (async_stop() is idempotent,
    # so re-running it then is a no-op).
    holiday_mode = hass.data.get(DATA_HOLIDAY_MODE)
    was_holiday_mode_running = holiday_mode is not None and holiday_mode.is_running
    if holiday_mode is not None:
        await holiday_mode.async_stop()
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data.pop(DATA_HOLIDAY_MODE, None)
        await entry.runtime_data.async_shutdown()
    elif was_holiday_mode_running:
        await holiday_mode.async_start()
    return unload_ok
