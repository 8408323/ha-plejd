"""Plejd coordinator — owns the BLE connection and pushes state to entities.

Plejd is push-based: we connect to one in-range mesh device, then state arrives on
notifications. The coordinator finds a device, connects (auth handshake in
connection.py), exposes the cloud device list + live output state to platforms,
and lets entities send commands.
"""

from __future__ import annotations

import logging
from collections.abc import Callable
from datetime import timedelta

from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady, HomeAssistantError
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .cloud import PlejdCloudDevice, PlejdCloudInput, PlejdCloudMotion, PlejdCloudScene
from .connection import PlejdConnection
from .const import (
    CMD_GROUP_STATE_AND_LEVEL,
    CMD_INPUT_BUTTON,
    CMD_OUTPUT_SET,
    CMD_OUTPUT_STATE_AND_LEVEL,
    CONF_CRYPTO_KEY,
    CONF_DEVICES,
    CONF_DISCOVERED_ADDRESS,
    CONF_INPUTS,
    CONF_MOTION,
    CONF_SCENES,
    CONF_SITE_ID,
    PLEJD_SERVICE_UUID,
)
from .protocol import Command, MotionEvent, OutputState, decode_motion

_LOGGER = logging.getLogger(__name__)


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
        self._connection = PlejdConnection(bytes.fromhex(entry.data[CONF_CRYPTO_KEY]), self._on_event)
        self._listeners: list[Callable[[], None]] = []
        self._button_listeners: list[Callable[[int, bool], None]] = []
        self._motion_listeners: list[Callable[[MotionEvent], None]] = []
        self._clock_unsub: Callable[[], None] | None = None

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
        """Find a Plejd device in range and connect (raises if none/connect fails)."""
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
        try:
            await self.async_sync_clock()
        except Exception:  # noqa: BLE001 - clock sync is auxiliary, never fail setup over it
            _LOGGER.warning("Plejd clock sync after connect failed", exc_info=True)
        # Keep device RTCs aligned (they drive on-device time/astro events) across drift + DST.
        self._clock_unsub = async_track_time_interval(self.hass, self._async_periodic_clock_sync, timedelta(days=1))

    async def _async_periodic_clock_sync(self, _now: object) -> None:
        try:
            await self.async_sync_clock()
        except Exception:  # noqa: BLE001 - best-effort; a missed daily sync is not fatal
            _LOGGER.warning("Plejd periodic clock sync failed", exc_info=True)

    async def _send(self, build: Callable[[object], bytes]) -> None:
        mesh = self._connection.mesh
        if mesh is None:
            raise HomeAssistantError("Plejd mesh is not connected")
        await self._connection.write(build(mesh))

    async def async_sync_clock(self) -> None:
        """Broadcast the current local wall-clock to every mesh device (0x001B)."""
        now = dt_util.now()
        epoch = int(now.timestamp() + now.utcoffset().total_seconds())
        await self._send(lambda mesh: mesh.set_timestamp(epoch))

    async def async_set_output(self, address: int, output: int, on: bool, level: int) -> None:
        """Send an on/off + level command for an output."""
        await self._send(lambda mesh: mesh.set_output(address, output, on, level))

    async def async_set_output_min_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's minimum dim level (0-1 fraction)."""
        await self._send(lambda mesh: mesh.set_output_min_level(address, output, fraction))

    async def async_set_output_max_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's maximum dim level (0-1 fraction)."""
        await self._send(lambda mesh: mesh.set_output_max_level(address, output, fraction))

    async def async_set_output_curve(self, address: int, output: int, curve: int) -> None:
        """Set an output's dimming curve (LoadCurve byte)."""
        await self._send(lambda mesh: mesh.set_output_curve(address, output, curve))

    async def async_set_output_phase_dim(self, address: int, output: int, phase: int) -> None:
        """Set an output's phase-dim edge (PhaseOutputType byte)."""
        await self._send(lambda mesh: mesh.set_output_phase_dim(address, output, phase))

    async def async_execute_scene(self, index: int) -> None:
        """Trigger a Plejd scene (broadcast to address 0)."""
        await self._send(lambda mesh: mesh.scene(0, index))

    async def async_set_climate_setpoint(self, address: int, celsius: float) -> None:
        """Set a thermostat target temperature."""
        await self._send(lambda mesh: mesh.set_climate_setpoint(address, celsius))

    async def async_set_climate_mode(self, address: int, mode: int) -> None:
        """Set a thermostat operating mode."""
        await self._send(lambda mesh: mesh.set_climate_mode(address, mode))

    async def async_set_cover_position(self, address: int, position: int) -> None:
        """Move a cover to a position (0-100)."""
        await self._send(lambda mesh: mesh.set_cover_position(address, position))

    async def async_cover_stop(self, address: int) -> None:
        """Halt a cover."""
        await self._send(lambda mesh: mesh.cover_stop(address))

    async def async_shutdown(self) -> None:
        if self._clock_unsub is not None:
            self._clock_unsub()
            self._clock_unsub = None
        await self._connection.disconnect()
