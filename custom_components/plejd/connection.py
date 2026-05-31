"""Plejd BLE connection — connect to a mesh device, authenticate, write, and listen.

Thin bleak wrapper around the mesh engine: it establishes a connection to one
Plejd device, runs the SHA-256 challenge/response login on the AuthKey
characteristic, writes encrypted commands to Datavector, and routes
LastChangedDatavector notifications into the mesh state. See docs/protocol.md.
"""

from __future__ import annotations

import logging
from collections.abc import Callable

from bleak.backends.device import BLEDevice
from bleak_retry_connector import BleakClientWithServiceCache, establish_connection

from . import crypto
from .const import PLEJD_CHAR_AUTH_UUID, PLEJD_CHAR_DATA_UUID, PLEJD_CHAR_LAST_DATA_UUID
from .mesh import PlejdMesh

_LOGGER = logging.getLogger(__name__)


def reversed_mac(address: str) -> bytes:
    """The BLE MAC (``AA:BB:..``) reversed — the address the cipher is keyed on."""
    return bytes(reversed(bytes.fromhex(address.replace(":", ""))))


class PlejdConnection:
    """Owns the bleak client for one mesh device and the mesh state."""

    def __init__(self, crypto_key: bytes, on_state: Callable[[], None]) -> None:
        self._key = crypto_key
        self._on_state = on_state
        self._client: BleakClientWithServiceCache | None = None
        self.mesh: PlejdMesh | None = None

    @property
    def connected(self) -> bool:
        return self._client is not None and self._client.is_connected

    async def connect(self, device: BLEDevice) -> None:
        """Connect to ``device``, authenticate, and subscribe to state updates."""
        _LOGGER.debug("connecting to Plejd device %s", device.address)
        self._client = await establish_connection(BleakClientWithServiceCache, device, device.address)
        self.mesh = PlejdMesh(self._key, reversed_mac(device.address))
        await self._authenticate()
        await self._client.start_notify(PLEJD_CHAR_LAST_DATA_UUID, self._handle_notify)
        _LOGGER.debug("connected and authenticated to Plejd mesh via %s", device.address)

    async def _authenticate(self) -> None:
        # Trigger a fresh challenge, read it, write back the folded SHA-256 response.
        await self._client.write_gatt_char(PLEJD_CHAR_AUTH_UUID, b"\x00", response=False)
        challenge = await self._client.read_gatt_char(PLEJD_CHAR_AUTH_UUID)
        response = crypto.auth_response(bytes(challenge), self._key)
        await self._client.write_gatt_char(PLEJD_CHAR_AUTH_UUID, response, response=False)

    def _handle_notify(self, _characteristic: object, data: bytearray) -> None:
        if self.mesh is not None and self.mesh.handle_notification(bytes(data)) is not None:
            self._on_state()

    async def write(self, payload: bytes) -> None:
        """Write an encrypted command to the Datavector characteristic."""
        if self._client is None:
            raise RuntimeError("not connected")
        await self._client.write_gatt_char(PLEJD_CHAR_DATA_UUID, payload, response=False)

    async def disconnect(self) -> None:
        if self._client is not None:
            _LOGGER.debug("disconnecting from Plejd mesh")
            await self._client.disconnect()
            self._client = None
            self.mesh = None
