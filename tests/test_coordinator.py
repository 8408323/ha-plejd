"""Tests for the Plejd coordinator."""

from __future__ import annotations

import types

import pytest
from plejd import connection as conn
from plejd.const import CONF_CRYPTO_KEY, CONF_DEVICES, CONF_DISCOVERED_ADDRESS, PLEJD_SERVICE_UUID
from plejd.coordinator import PlejdCoordinator

_KEY_HEX = "00112233445566778899aabbccddeeff"
_DEV = {
    "device_id": "d1",
    "name": "Kitchen",
    "address": 5,
    "output_index": 0,
    "outputs": [5],
    "hardware_id": 1,
    "model": "DIM-01",
    "category": "light",
    "dimmable": True,
    "traits": 3,
    "room_id": "r1",
}


class _FakeClient:
    is_connected = True

    def __init__(self):
        self.writes = []
        self.notify_cb = None

    async def write_gatt_char(self, uuid, data, response=False):
        self.writes.append((uuid, bytes(data)))

    async def read_gatt_char(self, uuid):
        return bytes(range(16))

    async def start_notify(self, uuid, cb):
        self.notify_cb = cb

    async def disconnect(self):
        self.is_connected = False


def _entry(discovered="AA:BB:CC:DD:EE:01"):
    return types.SimpleNamespace(
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [_DEV], CONF_DISCOVERED_ADDRESS: discovered}
    )


def _info(address, rssi=-50):
    return types.SimpleNamespace(address=address, service_uuids=[PLEJD_SERVICE_UUID], rssi=rssi)


def _hass(infos=(), ble=None):
    return types.SimpleNamespace(service_infos=list(infos), ble_devices=ble or {})


def _patch_connect(monkeypatch, client):
    async def _establish(cls, device, name, **kw):
        return client

    monkeypatch.setattr(conn, "establish_connection", _establish)


def test_devices_loaded_from_entry():
    c = PlejdCoordinator(_hass(), _entry())
    assert [d.device_id for d in c.devices] == ["d1"]


async def test_start_connects_to_a_plejd_device(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    assert client.notify_cb is not None  # connected + subscribed


async def test_start_raises_when_no_device_in_range():
    from homeassistant.exceptions import ConfigEntryNotReady

    c = PlejdCoordinator(_hass([]), _entry())
    with pytest.raises(ConfigEntryNotReady, match="no Plejd device"):
        await c.async_start()


async def test_start_raises_when_address_unresolvable():
    from homeassistant.exceptions import ConfigEntryNotReady

    hass = _hass([_info("01:02:03:04:05:a0")], {})  # discovered but not resolvable
    c = PlejdCoordinator(hass, _entry(discovered=None))
    with pytest.raises(ConfigEntryNotReady, match="could not resolve"):
        await c.async_start()


async def test_start_wraps_connect_failure(monkeypatch):
    from homeassistant.exceptions import ConfigEntryNotReady

    async def _boom(cls, device, name, **kw):
        raise OSError("ble down")

    monkeypatch.setattr(conn, "establish_connection", _boom)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    with pytest.raises(ConfigEntryNotReady, match="failed to connect"):
        await c.async_start()


def test_pick_device_prefers_discovered_then_rssi():
    hass = _hass([_info("X", rssi=-30), _info("AA:BB:CC:DD:EE:01", rssi=-80)])
    c = PlejdCoordinator(hass, _entry(discovered="AA:BB:CC:DD:EE:01"))
    assert c._pick_device().address == "AA:BB:CC:DD:EE:01"  # discovered wins despite weaker rssi


def test_pick_device_uses_rssi_without_preference():
    hass = _hass([_info("X", rssi=-80), _info("Y", rssi=-40)])
    c = PlejdCoordinator(hass, _entry(discovered=None))
    assert c._pick_device().address == "Y"


async def test_set_output_writes_and_state_reflects(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_set_output(5, 0, True, 120)
    # the written command, fed back as a notification, becomes the live state
    _, payload = client.writes[-1]
    client.notify_cb(None, bytearray(payload))
    assert c.state_for(5).level == 120


async def test_set_output_without_connection_raises():
    from homeassistant.exceptions import HomeAssistantError

    c = PlejdCoordinator(_hass(), _entry())
    with pytest.raises(HomeAssistantError, match="not connected"):
        await c.async_set_output(5, 0, True, 1)


def test_pick_device_handles_missing_rssi():
    hass = _hass([_info("X", rssi=None), _info("Y", rssi=-40)])
    c = PlejdCoordinator(hass, _entry(discovered=None))
    assert c._pick_device().address == "Y"  # None rssi treated as weakest, no crash


def test_state_for_none_before_connect():
    assert PlejdCoordinator(_hass(), _entry()).state_for(5) is None


def test_listeners_add_notify_remove():
    c = PlejdCoordinator(_hass(), _entry())
    seen = []
    remove = c.async_add_listener(lambda: seen.append(1))
    c._notify()
    remove()
    c._notify()
    assert seen == [1]


async def test_shutdown(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_shutdown()
    assert not client.is_connected
