"""Plejd mesh command codec.

Reverse-engineered from the Plejd app (`BleCommands` / `CommandType`). A command
written to the Datavector characteristic (before XOR-encryption) is::

    [address] [0x01] [command_type] [opcode_hi] [opcode_lo] [payload...]

`address` is the recipient's mesh node index (0x00 = broadcast/own); the opcode is
2-byte **big-endian**. The same framing comes back on LastChangedDatavector for
state changes. See docs/reverse_engineering.md.
"""

from __future__ import annotations

from dataclasses import dataclass

from .const import (
    CMD_OUTPUT_STATE_AND_LEVEL,
    CMD_SCENE,
)

# CommandType byte (from the app's CommandType enum).
TYPE_WRITE = 0x00
TYPE_ACK = 0x01
TYPE_READ = 0x02
TYPE_DONT_RESPOND = 0x10

_MARKER = 0x01  # constant second byte of every command vector


def encode_command(address: int, command: int, data: bytes = b"", command_type: int = TYPE_WRITE) -> bytes:
    """Build a Datavector command vector (plaintext, pre-encryption)."""
    return bytes([address & 0xFF, _MARKER, command_type & 0xFF, (command >> 8) & 0xFF, command & 0xFF]) + data


@dataclass(frozen=True)
class Command:
    """A decoded Datavector vector."""

    address: int
    command_type: int
    command: int
    data: bytes


def decode_command(vector: bytes) -> Command:
    """Parse a decrypted Datavector vector into its fields.

    Rejects vectors whose marker byte isn't 0x01: the payload cipher has no MAC, so
    data decrypted with the wrong address/key (or corrupted) would otherwise be
    mis-parsed as a real command and drive bogus state.
    """
    if len(vector) < 5:
        raise ValueError(f"command vector too short: {len(vector)} bytes")
    if vector[1] != _MARKER:
        raise ValueError(f"bad command marker {vector[1]:#04x} (expected {_MARKER:#04x})")
    address = vector[0]
    command_type = vector[2]
    command = (vector[3] << 8) | vector[4]
    return Command(address=address, command_type=command_type, command=command, data=vector[5:])


def set_output_state_and_level(
    address: int, output: int, on: bool, level: int, command_type: int = TYPE_WRITE
) -> bytes:
    """Set an output on/off and dim level (0x00C8). `level` is the 8-bit dim value.

    Defaults to the app's Write `StateAndLevelCommand`; callers that don't need an
    ack (live control relies on the LastChangedDatavector broadcast) pass
    `TYPE_DONT_RESPOND`.
    """
    lvl = level & 0xFF
    payload = bytes([output & 0xFF, 1 if on else 0, lvl, lvl])
    return encode_command(address, CMD_OUTPUT_STATE_AND_LEVEL, payload, command_type=command_type)


def request_output_state_and_level(address: int, output: int) -> bytes:
    """Read an output's current state and level (0x00C8, Read)."""
    return encode_command(address, CMD_OUTPUT_STATE_AND_LEVEL, bytes([output & 0xFF]), command_type=TYPE_READ)


def execute_scene(address: int, scene: int) -> bytes:
    """Trigger a scene by index (0x0021).

    The app's ExecuteScene sends only the 1-byte index with the DontRespond type;
    the slewrate/level fields in the schema belong to scene *configuration* (0x0022).
    """
    return encode_command(address, CMD_SCENE, bytes([scene & 0xFF]), command_type=TYPE_DONT_RESPOND)


@dataclass(frozen=True)
class OutputState:
    """Decoded on/off + level for one output."""

    output: int
    on: bool
    level: int


def decode_output_state(cmd: Command) -> OutputState | None:
    """Decode an Output-state-and-level vector (0x00C8) into on/off + level.

    Returns None for other opcodes. State vectors carry [output, state, level, ...];
    a read-reply without a state byte (length 1) is reported as unknown level 0.
    """
    if cmd.command != CMD_OUTPUT_STATE_AND_LEVEL or not cmd.data:
        return None
    output = cmd.data[0]
    on = len(cmd.data) > 1 and cmd.data[1] != 0
    level = cmd.data[2] if len(cmd.data) > 2 else 0
    return OutputState(output=output, on=on, level=level)
