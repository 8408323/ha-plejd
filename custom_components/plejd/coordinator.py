"""Plejd coordinator — owns the active mesh transport and pushes state to entities.

Control runs over one of two transports, chosen gateway-first: the remote
gateway/cloud WebSocket (gateway_transport.py) when the site has a Plejd Gateway,
otherwise the local BLE mesh (connection.py), falling back to BLE if the gateway is
unreachable. The coordinator connects (with reconnect/backoff), exposes the cloud
device list + live output state to platforms, and routes entity commands — building
plaintext command vectors that the BLE path encrypts and the gateway path relays.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable, Coroutine
from datetime import timedelta
from typing import Any

from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady, HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from . import protocol
from .cloud import PlejdAuthError, PlejdCloudDevice, PlejdCloudInput, PlejdCloudMotion, PlejdCloudScene, async_login
from .connection import PlejdConnection
from .const import (
    CMD_GROUP_STATE_AND_LEVEL,
    CMD_INPUT_BUTTON,
    CMD_OUTPUT_SET,
    CMD_OUTPUT_STATE_AND_LEVEL,
    CONF_CRYPTO_KEY,
    CONF_DEVICES,
    CONF_DISCOVERED_ADDRESS,
    CONF_GATEWAYS,
    CONF_INPUTS,
    CONF_INSTALLATION_ID,
    CONF_MOTION,
    CONF_RESOURCE_SET_ID,
    CONF_SCENES,
    CONF_SITE_ID,
    CONF_TRANSPORT,
    PLEJD_SERVICE_UUID,
    TIME_EVENT_REP_FOREVER,
    TIME_EVENT_RESULT_SCENE,
    TRANSPORT_AUTO,
    TRANSPORT_BLE,
    TRANSPORT_GATEWAY,
)
from .gateway_transport import PlejdGatewayConnection
from .protocol import Command, MotionEvent, OutputState, decode_motion

_LOGGER = logging.getLogger(__name__)

RECONNECT_INITIAL_DELAY = 1.0
RECONNECT_MAX_DELAY = 60.0


class PlejdCoordinator:
    """Holds the BLE connection and the site's devices; notifies HA entities."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        # Tolerate entries stored before a field existed (e.g. output_index).
        self.devices = [PlejdCloudDevice(**{"output_index": 0, **device}) for device in entry.data[CONF_DEVICES]]
        self.scenes = [PlejdCloudScene(**scene) for scene in entry.data.get(CONF_SCENES, [])]
        self.inputs = [PlejdCloudInput(**i) for i in entry.data.get(CONF_INPUTS, [])]
        self.motion = [PlejdCloudMotion(**m) for m in entry.data.get(CONF_MOTION, [])]
        self._motion_addresses = {m.address for m in self.motion}
        self.site_id = entry.data.get(CONF_SITE_ID, entry.entry_id)
        self._preferred = entry.data.get(CONF_DISCOVERED_ADDRESS)
        self._transport_pref = (getattr(entry, "options", None) or {}).get(CONF_TRANSPORT, TRANSPORT_AUTO)
        self._connection = PlejdConnection(
            bytes.fromhex(entry.data[CONF_CRYPTO_KEY]), self._on_event, self._handle_disconnect
        )
        # Gateway (remote/cloud) transport, when the site has one - preferred over BLE.
        self._gateway: PlejdGatewayConnection | None = None
        gateways = entry.data.get(CONF_GATEWAYS) or []
        resource_set_id = entry.data.get(CONF_RESOURCE_SET_ID)
        if gateways and resource_set_id:
            self._email = entry.data[CONF_EMAIL]
            self._password = entry.data[CONF_PASSWORD]
            self._gateway = PlejdGatewayConnection(
                async_get_clientsession(hass),
                entry.data[CONF_SITE_ID],
                resource_set_id,
                entry.data[CONF_INSTALLATION_ID],
                self._async_get_token,
                self._notify_outputs,
                self._handle_disconnect,
            )
        self._listeners: list[Callable[[], None]] = []
        self._button_listeners: list[Callable[[int, bool], None]] = []
        self._motion_listeners: list[Callable[[MotionEvent], None]] = []
        self._clock_unsub: Callable[[], None] | None = None
        self._available = False
        self._active: str | None = None  # "gateway" | "ble"
        self._closed = False
        self._reconnecting = False
        self._reconnect_task: asyncio.Task | None = None

    def _active_transport(self) -> PlejdConnection | PlejdGatewayConnection | None:
        if self._active == "gateway":
            return self._gateway
        if self._active == "ble":
            return self._connection
        return None

    @property
    def available(self) -> bool:
        """Whether the active transport (gateway or BLE) is currently connected."""
        transport = self._active_transport()
        return self._available and transport is not None and transport.connected

    @property
    def active_transport(self) -> str | None:
        """The connected transport ('gateway' or 'ble'), or None when not connected."""
        return self._active if self.available else None

    @callback
    def _notify_outputs(self) -> None:
        for update in list(self._listeners):
            update()

    @callback
    def async_add_listener(self, update: Callable[[], None]) -> Callable[[], None]:
        """Register an output-state update callback; returns an unsubscribe function."""
        self._listeners.append(update)

        def _remove() -> None:
            self._listeners.remove(update)

        return _remove

    @callback
    def async_add_button_listener(self, cb: Callable[[int, bool], None]) -> Callable[[], None]:
        """Register a button callback cb(address, pressed); returns an unsubscribe."""
        self._button_listeners.append(cb)

        def _remove() -> None:
            self._button_listeners.remove(cb)

        return _remove

    @callback
    def async_add_motion_listener(self, cb: Callable[[MotionEvent], None]) -> Callable[[], None]:
        """Register a motion callback cb(MotionEvent); returns an unsubscribe."""
        self._motion_listeners.append(cb)

        def _remove() -> None:
            self._motion_listeners.remove(cb)

        return _remove

    @callback
    def _on_event(self, command: Command) -> None:
        if command.command in (CMD_GROUP_STATE_AND_LEVEL, CMD_OUTPUT_STATE_AND_LEVEL):
            for update in list(self._listeners):
                update()
        elif command.command == CMD_INPUT_BUTTON:
            pressed = bool(command.data and command.data[0])
            for cb in list(self._button_listeners):
                cb(command.address, pressed)
        elif command.command == CMD_OUTPUT_SET and command.address in self._motion_addresses:
            event = decode_motion(command)
            if event is not None:
                for motion_cb in list(self._motion_listeners):
                    motion_cb(event)

    def state_for(self, address: int) -> OutputState | None:
        """Last-known output state for a mesh address, if seen."""
        if self._active == "gateway" and self._gateway is not None:
            return self._gateway.state_for(address)
        if self._connection.mesh is None:
            return None
        return self._connection.mesh.state.get(address)

    def _pick_device(self) -> bluetooth.BluetoothServiceInfoBleak | None:
        candidates = [
            info
            for info in bluetooth.async_discovered_service_info(self.hass, connectable=True)
            if PLEJD_SERVICE_UUID in info.service_uuids
        ]
        if not candidates:
            return None
        # Prefer the device the config flow discovered, else the strongest signal.
        # rssi can be None for adverts without a reported signal — treat as weakest.
        candidates.sort(key=lambda info: (info.address != self._preferred, -(info.rssi or -127)))
        return candidates[0]

    async def async_start(self) -> None:
        """Connect to the mesh — gateway-first when one exists, else BLE."""
        await self._async_select_and_connect()

    async def _async_select_and_connect(self) -> None:
        """Connect over the chosen transport.

        Honour the user's forced preference; otherwise prefer the gateway and fall
        back to BLE when it's absent or unreachable.
        """
        if self._transport_pref == TRANSPORT_BLE:
            await self._async_connect_ble()
            return
        if self._transport_pref == TRANSPORT_GATEWAY:
            if self._gateway is None:
                raise ConfigEntryNotReady("Gateway transport selected, but this site has no gateway")
            await self._async_connect_gateway()
            return
        if self._gateway is not None:
            try:
                await self._async_connect_gateway()
                return
            except ConfigEntryNotReady as err:
                _LOGGER.warning("Plejd gateway connect failed, falling back to BLE: %s", err)
        await self._async_connect_ble()

    async def _async_connect_gateway(self) -> None:
        try:
            await self._gateway.connect()
        except PlejdAuthError as err:
            # Bad/expired cloud credentials: trigger reauth, don't mask as a transient outage.
            raise ConfigEntryAuthFailed("Plejd cloud credentials rejected") from err
        except Exception as err:  # noqa: BLE001 - transient gateway failure: fall back / retry
            raise ConfigEntryNotReady(f"gateway connect failed: {err}") from err
        self._active = "gateway"
        self._available = True
        self._notify_outputs()

    async def _async_connect_ble(self) -> None:
        info = self._pick_device()
        if info is None:
            raise ConfigEntryNotReady("no Plejd device in range")
        device = bluetooth.async_ble_device_from_address(self.hass, info.address, connectable=True)
        if device is None:
            raise ConfigEntryNotReady(f"could not resolve {info.address}")
        _LOGGER.debug("connecting to Plejd mesh via %s", info.address)
        try:
            await self._connection.connect(device)
        except Exception as err:  # noqa: BLE001 - surface any BLE failure as a setup retry
            raise ConfigEntryNotReady(f"failed to connect: {err}") from err
        await self._async_read_all_states()
        self._active = "ble"
        self._available = True
        self._notify_outputs()
        try:
            await self.async_sync_clock()
        except Exception:  # noqa: BLE001 - clock sync is auxiliary, never fail setup over it
            _LOGGER.warning("Plejd clock sync after connect failed", exc_info=True)
        # Keep device RTCs aligned (they drive on-device time/astro events) across drift + DST.
        if self._clock_unsub is not None:
            self._clock_unsub()
        self._clock_unsub = async_track_time_interval(self.hass, self._async_periodic_clock_sync, timedelta(days=1))

    async def _async_periodic_clock_sync(self, _now: object) -> None:
        try:
            await self.async_sync_clock()
        except Exception:  # noqa: BLE001 - best-effort; a missed daily sync is not fatal
            _LOGGER.warning("Plejd periodic clock sync failed", exc_info=True)

    async def _async_get_token(self) -> str:
        """Fetch a fresh Parse session token for the gateway WebSocket (login each time)."""
        return await async_login(async_get_clientsession(self.hass), self._email, self._password)

    async def _async_read_all_states(self) -> None:
        """Ask each output for its current state so entities populate on connect."""
        mesh = self._connection.mesh
        if mesh is None:
            return
        seen: set[int] = set()
        for device in self.devices:
            if device.address is None or device.address in seen:
                continue
            seen.add(device.address)
            await self._connection.write(mesh.request_output(device.address, device.output_index))

    @callback
    def _handle_disconnect(self) -> None:
        # The link dropped: entities go unavailable until a reconnect succeeds.
        self._available = False
        self._notify_outputs()
        if not self._closed:
            self._reconnect_task = self._spawn(self._async_reconnect())

    def _spawn(self, coro: Coroutine[Any, Any, None]) -> asyncio.Task:
        # Prefer HA's owned background task; fall back to a bare task outside HA (tests).
        create = getattr(self.hass, "async_create_background_task", None)
        if create is not None:
            return create(coro, name="plejd-reconnect")
        return asyncio.ensure_future(coro)

    async def _async_reconnect(self) -> None:
        """Reconnect to the mesh with exponential backoff until it succeeds or we close."""
        if self._reconnecting:
            return
        self._reconnecting = True
        delay = RECONNECT_INITIAL_DELAY
        try:
            while not self._closed and not self.available:
                await asyncio.sleep(delay)
                if self._closed:
                    return
                try:
                    await self._async_select_and_connect()
                    _LOGGER.debug("reconnected to Plejd mesh")
                    return
                except ConfigEntryNotReady as err:
                    delay = min(delay * 2, RECONNECT_MAX_DELAY)
                    _LOGGER.debug("Plejd reconnect failed (retry in %ss): %s", delay, err)
        finally:
            self._reconnecting = False

    async def _write_vector(self, vector: bytes) -> None:
        """Send a plaintext command vector over the active transport.

        The gateway relays plaintext (it holds the crypto key); BLE encrypts first.
        """
        if self._active == "gateway" and self._gateway is not None and self._gateway.connected:
            await self._gateway.write(vector)
            return
        mesh = self._connection.mesh
        if mesh is None:
            raise HomeAssistantError("Plejd mesh is not connected")
        await self._connection.write(mesh.encrypt(vector))

    async def async_sync_clock(self) -> None:
        """Broadcast the current local wall-clock to every mesh device (0x001B)."""
        now = dt_util.now()
        epoch = int(now.timestamp() + now.utcoffset().total_seconds())
        await self._write_vector(protocol.set_timestamp(epoch))

    async def async_program_time_event(
        self, slot: int, mask: int, hour: int, minute: int, second: int, scene: int, fade: int
    ) -> None:
        """Program an on-device weekly time event that runs a scene (3-step config)."""
        await self._write_vector(protocol.set_time_event_time(slot, mask, hour, minute, second, TIME_EVENT_REP_FOREVER))
        await self._write_vector(protocol.set_time_event_type(slot, TIME_EVENT_RESULT_SCENE))
        await self._write_vector(protocol.set_time_event_scene(slot, scene, fade))

    async def async_remove_time_event(self, slot: int) -> None:
        """Delete an on-device time event."""
        await self._write_vector(protocol.remove_time_event(slot))

    async def async_set_output(self, address: int, output: int, on: bool, level: int) -> None:
        """Send an on/off + level command for an output."""
        await self._write_vector(
            protocol.set_output_state_and_level(address, output, on, level, command_type=protocol.TYPE_DONT_RESPOND)
        )

    async def async_set_output_min_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's minimum dim level (0-1 fraction)."""
        await self._write_vector(protocol.set_output_min_level(address, output, fraction))

    async def async_set_output_max_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's maximum dim level (0-1 fraction)."""
        await self._write_vector(protocol.set_output_max_level(address, output, fraction))

    async def async_set_output_start_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's start level (0-1 fraction)."""
        await self._write_vector(protocol.set_output_start_level(address, output, fraction))

    async def async_set_output_speed(self, address: int, output: int, seconds: float) -> None:
        """Set an output's dim transition time (seconds; 0 = instant)."""
        await self._write_vector(protocol.set_output_speed(address, output, seconds))

    async def async_set_output_curve(self, address: int, output: int, curve: int) -> None:
        """Set an output's dimming curve (LoadCurve byte)."""
        await self._write_vector(protocol.set_output_curve(address, output, curve))

    async def async_set_output_phase_dim(self, address: int, output: int, phase: int) -> None:
        """Set an output's phase-dim edge (PhaseOutputType byte)."""
        await self._write_vector(protocol.set_output_phase_dim(address, output, phase))

    async def async_execute_scene(self, index: int) -> None:
        """Trigger a Plejd scene (broadcast to address 0)."""
        await self._write_vector(protocol.execute_scene(0, index))

    async def async_set_climate_setpoint(self, address: int, celsius: float) -> None:
        """Set a thermostat target temperature."""
        await self._write_vector(protocol.set_climate_setpoint(address, celsius))

    async def async_set_climate_mode(self, address: int, mode: int) -> None:
        """Set a thermostat operating mode."""
        await self._write_vector(protocol.set_climate_mode(address, mode))

    async def async_set_cover_position(self, address: int, position: int) -> None:
        """Move a cover to a position (0-100)."""
        await self._write_vector(protocol.set_cover_position(address, position))

    async def async_cover_stop(self, address: int) -> None:
        """Halt a cover."""
        await self._write_vector(protocol.cover_stop(address))

    async def async_shutdown(self) -> None:
        self._closed = True
        if self._clock_unsub is not None:
            self._clock_unsub()
            self._clock_unsub = None
        if self._reconnect_task is not None:
            self._reconnect_task.cancel()
            self._reconnect_task = None
        if self._gateway is not None:
            await self._gateway.disconnect()
        await self._connection.disconnect()
