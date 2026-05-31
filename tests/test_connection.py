"""Tests for the Plejd BLE connection layer."""

from __future__ import annotations

import types

import pytest
from plejd import connection as conn
from plejd import crypto
from plejd.connection import PlejdConnection, reversed_mac
from plejd.const import PLEJD_CHAR_AUTH_UUID, PLEJD_CHAR_DATA_UUID, PLEJD_CHAR_LAST_DATA_UUID

_KEY = bytes.fromhex("00112233445566778899aabbccddeeff")
_ADDR = "01:02:03:04:05:a0"
_CHALLENGE = bytes(range(16))


class _FakeClient:
    def __init__(self):
        self.is_connected = True
        self.writes: list[tuple[str, bytes]] = []
        self.notify_uuid: str | None = None
        self.notify_cb = None

    async def write_gatt_char(self, uuid, data, response=False):
        self.writes.append((uuid, bytes(data)))

    async def read_gatt_char(self, uuid):
        return _CHALLENGE

    async def start_notify(self, uuid, cb):
        self.notify_uuid = uuid
        self.notify_cb = cb

    async def disconnect(self):
        self.is_connected = False


def _device():
    return types.SimpleNamespace(address=_ADDR, name="Plejd")


def _patch(monkeypatch, client):
    async def _establish(cls, device, name, **kw):
        return client

    monkeypatch.setattr(conn, "establish_connection", _establish)


def test_reversed_mac():
    assert reversed_mac("01:02:03:04:05:a0") == bytes.fromhex("a005040302 01".replace(" ", ""))


async def test_connect_runs_auth_handshake(monkeypatch):
    client = _FakeClient()
    _patch(monkeypatch, client)
    c = PlejdConnection(_KEY, on_state=lambda: None)
    await c.connect(_device())
    assert c.connected and c.mesh is not None
    # auth: write 0x00 to AuthKey, then the folded SHA-256 response
    assert client.writes[0] == (PLEJD_CHAR_AUTH_UUID, b"\x00")
    assert client.writes[1] == (PLEJD_CHAR_AUTH_UUID, crypto.auth_response(_CHALLENGE, _KEY))
    assert client.notify_uuid == PLEJD_CHAR_LAST_DATA_UUID


async def test_write_goes_to_datavector(monkeypatch):
    client = _FakeClient()
    _patch(monkeypatch, client)
    c = PlejdConnection(_KEY, on_state=lambda: None)
    await c.connect(_device())
    await c.write(b"payload")
    assert (PLEJD_CHAR_DATA_UUID, b"payload") in client.writes


async def test_write_without_connection_raises():
    c = PlejdConnection(_KEY, on_state=lambda: None)
    with pytest.raises(RuntimeError, match="not connected"):
        await c.write(b"x")


async def test_notify_updates_state_and_fires_callback(monkeypatch):
    client = _FakeClient()
    _patch(monkeypatch, client)
    fired = []
    c = PlejdConnection(_KEY, on_state=lambda: fired.append(True))
    await c.connect(_device())
    vector = c.mesh.set_output(address=5, output=0, on=True, level=99)  # a real encrypted state vector
    client.notify_cb(None, bytearray(vector))
    assert fired == [True]
    assert c.mesh.state[5].level == 99


async def test_notify_ignores_garbage(monkeypatch):
    client = _FakeClient()
    _patch(monkeypatch, client)
    fired = []
    c = PlejdConnection(_KEY, on_state=lambda: fired.append(True))
    await c.connect(_device())
    client.notify_cb(None, bytearray(bytes(9)))  # won't decode
    assert fired == []


async def test_disconnect(monkeypatch):
    client = _FakeClient()
    _patch(monkeypatch, client)
    c = PlejdConnection(_KEY, on_state=lambda: None)
    await c.connect(_device())
    await c.disconnect()
    assert not c.connected and c.mesh is None
    await c.disconnect()  # idempotent
