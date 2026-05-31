"""Plejd coordinator — owns the BLE connection and pushes state to entities.

Plejd is push-based: we connect to one in-range mesh device, then state arrives on
notifications. The coordinator finds a device, connects (auth handshake in
connection.py), exposes the cloud device list + live output state to platforms,
and lets entities send commands.
"""

from __future__ import annotations

import logging
from collections.abc import Callable

from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryNotReady, HomeAssistantError

from .cloud import PlejdCloudDevice
from .connection import PlejdConnection
from .const import CONF_CRYPTO_KEY, CONF_DEVICES, CONF_DISCOVERED_ADDRESS, PLEJD_SERVICE_UUID
from .protocol import OutputState

_LOGGER = logging.getLogger(__name__)


class PlejdCoordinator:
    """Holds the BLE connection and the site's devices; notifies HA entities."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        # Tolerate entries stored before a field existed (e.g. output_index).
        self.devices = [PlejdCloudDevice(**{"output_index": 0, **device}) for device in entry.data[CONF_DEVICES]]
        self._preferred = entry.data.get(CONF_DISCOVERED_ADDRESS)
        self._connection = PlejdConnection(bytes.fromhex(entry.data[CONF_CRYPTO_KEY]), self._notify)
        self._listeners: list[Callable[[], None]] = []

    @callback
    def async_add_listener(self, update: Callable[[], None]) -> Callable[[], None]:
        """Register an entity update callback; returns an unsubscribe function."""
        self._listeners.append(update)

        def _remove() -> None:
            self._listeners.remove(update)

        return _remove

    @callback
    def _notify(self) -> None:
        for update in list(self._listeners):
            update()

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

    async def async_set_output(self, address: int, output: int, on: bool, level: int) -> None:
        """Send an on/off + level command for an output."""
        if self._connection.mesh is None:
            raise HomeAssistantError("Plejd mesh is not connected")
        await self._connection.write(self._connection.mesh.set_output(address, output, on, level))

    async def async_shutdown(self) -> None:
        await self._connection.disconnect()
