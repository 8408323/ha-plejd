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

    def set_output_min_level(self, address: int, output: int, fraction: float) -> bytes:
        """Encrypted minimum-dim-level setting (0x00C9)."""
        return self.encrypt(protocol.set_output_min_level(address, output, fraction))

    def set_output_max_level(self, address: int, output: int, fraction: float) -> bytes:
        """Encrypted maximum-dim-level setting (0x00CA)."""
        return self.encrypt(protocol.set_output_max_level(address, output, fraction))

    def set_output_curve(self, address: int, output: int, curve: int) -> bytes:
        """Encrypted dimming-curve setting (0x00CC)."""
        return self.encrypt(protocol.set_output_curve(address, output, curve))

    def set_output_phase_dim(self, address: int, output: int, phase: int) -> bytes:
        """Encrypted phase-dim-edge setting (0x00CE)."""
        return self.encrypt(protocol.set_output_phase_dim(address, output, phase))

    def scene(self, address: int, scene: int) -> bytes:
        """Encrypted command to execute a scene (0x0021)."""
        return self.encrypt(protocol.execute_scene(address, scene))

    def set_climate_setpoint(self, address: int, celsius: float) -> bytes:
        """Encrypted thermostat target-temperature command (0x045C)."""
        return self.encrypt(protocol.set_climate_setpoint(address, celsius))

    def set_climate_mode(self, address: int, mode: int) -> bytes:
        """Encrypted thermostat operating-mode command (0x045F)."""
        return self.encrypt(protocol.set_climate_mode(address, mode))

    def set_cover_position(self, address: int, position: int) -> bytes:
        """Encrypted cover position command (0x0420 WindowControl)."""
        return self.encrypt(protocol.set_cover_position(address, position))

    def cover_stop(self, address: int) -> bytes:
        """Encrypted cover stop command (0x0420 WindowControl)."""
        return self.encrypt(protocol.cover_stop(address))

    def handle_notification(self, ciphertext: bytes) -> protocol.Command | None:
        """Decrypt + decode an incoming vector, updating output state as a side effect.

        Returns the decoded Command so the coordinator can route non-output events
        (buttons, motion), or None if it fails the marker check (wrong key / corrupt).
        """
        try:
            command = protocol.decode_command(self.decrypt(ciphertext))
        except ValueError:
            return None
        state = protocol.decode_output_state(command)
        if state is not None:
            self._state[command.address] = state
        return command
