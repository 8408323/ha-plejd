"""Tests for the Plejd mesh engine."""

from __future__ import annotations

from plejd.mesh import PlejdMesh
from plejd.protocol import CMD_OUTPUT_STATE_AND_LEVEL, TYPE_DONT_RESPOND, TYPE_READ, decode_command

_KEY = bytes.fromhex("00112233445566778899aabbccddeeff")
_MAC = bytes.fromhex("0102030405a0")  # connected device MAC, reversed


def _mesh():
    return PlejdMesh(_KEY, _MAC)


def test_set_output_round_trips_through_encryption():
    mesh = _mesh()
    cipher = mesh.set_output(address=5, output=0, on=True, level=200)
    plain = mesh.decrypt(cipher)
    cmd = decode_command(plain)
    assert cmd.address == 5
    assert cmd.command == CMD_OUTPUT_STATE_AND_LEVEL
    assert cmd.command_type == TYPE_DONT_RESPOND  # fire-and-forget control
    assert cmd.data == bytes([0, 1, 200, 200])


def test_request_output_uses_read_type():
    mesh = _mesh()
    cmd = decode_command(mesh.decrypt(mesh.request_output(address=3, output=1)))
    assert cmd.command_type == TYPE_READ
    assert cmd.data == bytes([1])


def test_scene_command_encrypts():
    mesh = _mesh()
    cipher = mesh.scene(address=0, scene=7)
    assert decode_command(mesh.decrypt(cipher)).data == bytes([7])


def test_handle_notification_updates_state():
    mesh = _mesh()
    # A device reports output 5 as on at level 128: feed its own encrypted vector back.
    vector = mesh.set_output(address=5, output=0, on=True, level=128)
    state = mesh.handle_notification(vector)
    assert state is not None
    assert (state.on, state.level) == (True, 128)
    assert mesh.state[5] == state


def test_handle_notification_drops_undecodable():
    mesh = _mesh()
    # Random ciphertext won't decrypt to a valid marker -> dropped, state untouched.
    assert mesh.handle_notification(bytes(range(9))) is None
    assert mesh.state == {}


def test_handle_notification_ignores_non_output_commands():
    mesh = _mesh()
    assert mesh.handle_notification(mesh.scene(address=1, scene=2)) is None
    assert mesh.state == {}


def test_state_returns_a_copy():
    mesh = _mesh()
    mesh.handle_notification(mesh.set_output(address=2, output=0, on=True, level=10))
    snapshot = mesh.state
    snapshot.clear()
    assert 2 in mesh.state  # mutating the snapshot doesn't affect the engine


def test_climate_commands_round_trip():
    from plejd.const import CMD_TRM_MODE, CMD_TRM_SETPOINT

    mesh = _mesh()
    sp = decode_command(mesh.decrypt(mesh.set_climate_setpoint(9, 20.0)))
    assert sp.command == CMD_TRM_SETPOINT and sp.data == bytes([200 & 0xFF, 0])
    md = decode_command(mesh.decrypt(mesh.set_climate_mode(9, 7)))
    assert md.command == CMD_TRM_MODE and md.data == bytes([7])
