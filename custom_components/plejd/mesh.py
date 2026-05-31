"""Plejd mesh engine — the pure, transport-independent core of the coordinator.

Encrypts outgoing commands and decodes incoming state notifications, tracking the
last-known on/off + level per mesh output address. All BLE payloads are encrypted
with the *connected* device's BLE MAC (reversed) and the site crypto key — see
crypto.py. The bleak connection/auth glue lives in the coordinator; this part is
fully unit-testable.
"""

from __future__ import annotations

from . import crypto, protocol
from .protocol import TYPE_DONT_RESPOND, OutputState


class PlejdMesh:
    """Builds encrypted commands and folds decrypted notifications into state."""

    def __init__(self, crypto_key: bytes, connection_address: bytes) -> None:
        # connection_address: the connected mesh device's BLE MAC, reversed (6 bytes).
        self._key = crypto_key
        self._address = connection_address
        self._state: dict[int, OutputState] = {}

    @property
    def state(self) -> dict[int, OutputState]:
        """A copy of the last-known output state, keyed by mesh output address."""
        return dict(self._state)

    def encrypt(self, plaintext: bytes) -> bytes:
        """Encrypt a Datavector payload for the connected device."""
        return crypto.encrypt_decrypt(self._address, plaintext, self._key)

    def decrypt(self, ciphertext: bytes) -> bytes:
        """Decrypt an incoming Datavector/LastChangedDatavector payload (symmetric)."""
        return crypto.encrypt_decrypt(self._address, ciphertext, self._key)

    def set_output(self, address: int, output: int, on: bool, level: int) -> bytes:
        """Encrypted command to set an output on/off + dim level (0x00C8).

        Sent fire-and-forget (DontRespond); the resulting state arrives on the
        LastChangedDatavector broadcast.
        """
        plaintext = protocol.set_output_state_and_level(address, output, on, level, command_type=TYPE_DONT_RESPOND)
        return self.encrypt(plaintext)

    def request_output(self, address: int, output: int) -> bytes:
        """Encrypted command to read an output's current state (0x00C8, Read)."""
        return self.encrypt(protocol.request_output_state_and_level(address, output))

    def scene(self, address: int, scene: int) -> bytes:
        """Encrypted command to execute a scene (0x0021)."""
        return self.encrypt(protocol.execute_scene(address, scene))

    def handle_notification(self, ciphertext: bytes) -> OutputState | None:
        """Decrypt + decode an incoming vector; update and return output state.

        Returns None for vectors that aren't valid output-state commands (a wrong-key
        or corrupt decryption fails the marker check and is dropped).
        """
        try:
            command = protocol.decode_command(self.decrypt(ciphertext))
        except ValueError:
            return None
        state = protocol.decode_output_state(command)
        if state is not None:
            self._state[command.address] = state
        return state
