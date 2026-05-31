"""Tests for the Plejd mesh command codec."""

from __future__ import annotations

import pytest
from plejd.const import CMD_OUTPUT_STATE_AND_LEVEL, CMD_SCENE
from plejd.protocol import (
    TYPE_READ,
    TYPE_WRITE,
    Command,
    decode_command,
    decode_output_state,
    encode_command,
    execute_scene,
    request_output_state_and_level,
    set_output_state_and_level,
)


def test_encode_command_layout():
    v = encode_command(0x05, CMD_OUTPUT_STATE_AND_LEVEL, bytes([0x00, 0x01]), command_type=TYPE_WRITE)
    # [address, 0x01, type, op_hi, op_lo, data...] with big-endian opcode 0x00C8
    assert v == bytes([0x05, 0x01, 0x00, 0x00, 0xC8, 0x00, 0x01])


def test_set_output_state_and_level_bytes():
    v = set_output_state_and_level(0x02, output=3, on=True, level=200)
    assert v == bytes([0x02, 0x01, 0x00, 0x00, 0xC8, 0x03, 0x01, 200, 200])


def test_set_output_off_zeroes_state_byte():
    v = set_output_state_and_level(0, output=1, on=False, level=0)
    assert v[5:] == bytes([0x01, 0x00, 0x00, 0x00])


def test_request_uses_read_type_and_single_output_byte():
    v = request_output_state_and_level(0x07, output=4)
    assert v[2] == TYPE_READ
    assert v[5:] == bytes([0x04])


def test_execute_scene_opcode():
    v = execute_scene(0x01, scene=9)
    assert (v[3] << 8) | v[4] == CMD_SCENE
    assert v[5:] == bytes([9])


def test_decode_command_round_trip():
    v = set_output_state_and_level(0x09, output=2, on=True, level=128)
    cmd = decode_command(v)
    assert cmd.address == 0x09
    assert cmd.command == CMD_OUTPUT_STATE_AND_LEVEL
    assert cmd.data == bytes([0x02, 0x01, 128, 128])


def test_decode_command_rejects_short_vector():
    with pytest.raises(ValueError, match="too short"):
        decode_command(b"\x00\x01\x00")


def test_decode_output_state_on_and_level():
    cmd = decode_command(set_output_state_and_level(0, output=5, on=True, level=77))
    st = decode_output_state(cmd)
    assert st is not None
    assert (st.output, st.on, st.level) == (5, True, 77)


def test_decode_output_state_off():
    cmd = decode_command(set_output_state_and_level(0, output=5, on=False, level=0))
    st = decode_output_state(cmd)
    assert st is not None and st.on is False


def test_decode_output_state_read_reply_without_state_byte():
    cmd = Command(address=0, command_type=0, command=CMD_OUTPUT_STATE_AND_LEVEL, data=bytes([3]))
    st = decode_output_state(cmd)
    assert st == st.__class__(output=3, on=False, level=0)


def test_decode_output_state_ignores_other_opcodes():
    assert decode_output_state(Command(0, 0, CMD_SCENE, b"\x01")) is None
    assert decode_output_state(Command(0, 0, CMD_OUTPUT_STATE_AND_LEVEL, b"")) is None
