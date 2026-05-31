"""Tests for the Plejd mesh command codec."""

from __future__ import annotations

import pytest
from plejd.const import CMD_GROUP_STATE_AND_LEVEL, CMD_OUTPUT_STATE_AND_LEVEL, CMD_SCENE
from plejd.protocol import (
    TYPE_DONT_RESPOND,
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
    assert v[2] == TYPE_DONT_RESPOND  # app sends ExecuteScene with DontRespond
    assert v[5:] == bytes([9])


def test_decode_command_rejects_bad_marker():
    v = bytearray(set_output_state_and_level(0x09, output=2, on=True, level=1))
    v[1] = 0x02  # corrupt the marker (e.g. wrong-key decryption)
    with pytest.raises(ValueError, match="bad command marker"):
        decode_command(bytes(v))


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


def test_decode_state_report_0x0098_keyed_by_address():
    # Real devices broadcast state on 0x0098: [state, level_lo, level_hi, ...]; the
    # vector address identifies the output, brightness = the level high byte.
    cmd = Command(
        address=11, command_type=0x10, command=CMD_GROUP_STATE_AND_LEVEL, data=bytes([0x01, 0xC8, 0xC8, 0x00])
    )
    st = decode_output_state(cmd)
    assert st == st.__class__(output=11, on=True, level=0xC8)


def test_decode_state_report_off():
    cmd = Command(
        address=11, command_type=0x10, command=CMD_GROUP_STATE_AND_LEVEL, data=bytes([0x00, 0x00, 0x00, 0x00])
    )
    assert decode_output_state(cmd).on is False


def test_decode_output_state_ignores_other_opcodes_and_short_data():
    assert decode_output_state(Command(0, 0, CMD_SCENE, b"\x01")) is None
    assert decode_output_state(Command(0, 0, CMD_OUTPUT_STATE_AND_LEVEL, b"")) is None
    assert decode_output_state(Command(11, 0, CMD_GROUP_STATE_AND_LEVEL, b"\x01")) is None


def test_set_climate_setpoint_bytes():
    from plejd.const import CMD_TRM_SETPOINT
    from plejd.protocol import set_climate_setpoint

    v = set_climate_setpoint(9, 21.5)  # 215 = 0x00D7 little-endian
    assert (v[3] << 8) | v[4] == CMD_TRM_SETPOINT
    assert v[5:] == bytes([0xD7, 0x00])


def test_set_climate_mode_bytes():
    from plejd.const import CMD_TRM_MODE
    from plejd.protocol import set_climate_mode

    v = set_climate_mode(9, 3)
    assert (v[3] << 8) | v[4] == CMD_TRM_MODE and v[5:] == bytes([3])


def test_decode_temperature():
    from plejd.protocol import decode_temperature

    assert decode_temperature(bytes([0xD7, 0x00])) == 21.5
    assert decode_temperature(b"\x00") is None


def test_parse_mini_package_real_wms_capture():
    from plejd.protocol import parse_mini_package

    # captured live from a WMS-01 motion broadcast
    data = bytes.fromhex("0303 1f07 00b0 0f08 46 0602".replace(" ", ""))
    pkgs = parse_mini_package(data)
    assert pkgs[0] == (3, bytes([0x03]))  # Source = Motion
    assert (22, bytes([0x00, 0xB0])) in pkgs  # escaped type 15+7
    assert (6, bytes([0x02])) in pkgs  # Lux


def test_decode_motion_from_capture():
    from plejd.const import CMD_OUTPUT_SET
    from plejd.protocol import Command, decode_motion

    cmd = Command(address=33, command_type=0x10, command=CMD_OUTPUT_SET, data=bytes.fromhex("03031f0700b00f08460602"))
    m = decode_motion(cmd)
    assert m.address == 33 and m.motion is True and m.lux == 2


def test_decode_motion_ignores_other_opcodes():
    from plejd.const import CMD_SCENE
    from plejd.protocol import Command, decode_motion

    assert decode_motion(Command(0, 0, CMD_SCENE, b"\x01")) is None


def test_set_cover_position_bytes():
    from plejd.const import CMD_OUTPUT_SET
    from plejd.protocol import set_cover_position

    open_cmd = set_cover_position(5, 100)  # level 255 -> inverted 0
    assert (open_cmd[3] << 8) | open_cmd[4] == CMD_OUTPUT_SET
    assert open_cmd[5:] == bytes([0x03, 0x08, 0x27, 0x01, 0x00, 0x00])
    close_cmd = set_cover_position(5, 0)  # level 0 -> inverted 255
    assert close_cmd[5:] == bytes([0x03, 0x08, 0x27, 0x01, 0xFF, 0xFF])


def test_cover_stop_bytes():
    from plejd.protocol import cover_stop

    assert cover_stop(5)[5:] == bytes([0x03, 0x08, 0x07, 0x00])


def test_dim_level_setting_bytes():
    from plejd.const import CMD_OUTPUT_MAX_LEVEL, CMD_OUTPUT_MIN_LEVEL
    from plejd.protocol import TYPE_DONT_RESPOND, set_output_max_level, set_output_min_level

    minimum = set_output_min_level(9, 1, 0.5)  # 0.5 * 65535 = 32768 (0x8000) le
    assert (minimum[3] << 8) | minimum[4] == CMD_OUTPUT_MIN_LEVEL
    assert minimum[2] == TYPE_DONT_RESPOND
    assert minimum[5:] == bytes([0x01, 0x00, 0x80])
    full = set_output_max_level(9, 0, 1.0)  # 65535 -> 0xFFFF
    assert (full[3] << 8) | full[4] == CMD_OUTPUT_MAX_LEVEL
    assert full[5:] == bytes([0x00, 0xFF, 0xFF])
    zero = set_output_min_level(9, 0, 0.0)
    assert zero[5:] == bytes([0x00, 0x00, 0x00])


def test_dimmer_tuning_setting_bytes():
    from plejd.const import CMD_OUTPUT_CURVE_TYPE, CMD_OUTPUT_PHASE_DIM_TYPE
    from plejd.protocol import set_output_curve, set_output_phase_dim

    curve = set_output_curve(9, 1, 3)  # antilogarithmic
    assert (curve[3] << 8) | curve[4] == CMD_OUTPUT_CURVE_TYPE
    assert curve[5:] == bytes([0x01, 0x03])
    phase = set_output_phase_dim(9, 0, 1)  # leading edge
    assert (phase[3] << 8) | phase[4] == CMD_OUTPUT_PHASE_DIM_TYPE
    assert phase[5:] == bytes([0x00, 0x01])
