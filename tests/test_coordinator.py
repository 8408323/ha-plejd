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


def test_devices_migrate_when_output_index_missing():
    legacy = {k: v for k, v in _DEV.items() if k != "output_index"}  # entry stored before the field
    entry = types.SimpleNamespace(
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [legacy], CONF_DISCOVERED_ADDRESS: None}
    )
    c = PlejdCoordinator(_hass(), entry)
    assert c.devices[0].output_index == 0


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


async def test_execute_scene_broadcasts(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_execute_scene(2)
    # scene is a broadcast (address 0) of opcode 0x0021 with the index
    from plejd.protocol import CMD_SCENE, decode_command

    cmd = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert cmd.address == 0 and cmd.command == CMD_SCENE and cmd.data == bytes([2])


async def test_execute_scene_without_connection_raises():
    from homeassistant.exceptions import HomeAssistantError

    c = PlejdCoordinator(_hass(), _entry())
    with pytest.raises(HomeAssistantError, match="not connected"):
        await c.async_execute_scene(1)


def test_pick_device_handles_missing_rssi():
    hass = _hass([_info("X", rssi=None), _info("Y", rssi=-40)])
    c = PlejdCoordinator(hass, _entry(discovered=None))
    assert c._pick_device().address == "Y"  # None rssi treated as weakest, no crash


def test_state_for_none_before_connect():
    assert PlejdCoordinator(_hass(), _entry()).state_for(5) is None


def test_output_event_notifies_listeners():
    from plejd.const import CMD_GROUP_STATE_AND_LEVEL
    from plejd.protocol import Command

    c = PlejdCoordinator(_hass(), _entry())
    seen = []
    remove = c.async_add_listener(lambda: seen.append(1))
    state_cmd = Command(address=5, command_type=0x10, command=CMD_GROUP_STATE_AND_LEVEL, data=bytes([1, 0, 0]))
    c._on_event(state_cmd)
    remove()
    c._on_event(state_cmd)
    assert seen == [1]


def test_button_event_dispatches_press_and_release():
    from plejd.const import CMD_INPUT_BUTTON
    from plejd.protocol import Command

    c = PlejdCoordinator(_hass(), _entry())
    events = []
    remove = c.async_add_button_listener(lambda addr, pressed: events.append((addr, pressed)))
    c._on_event(Command(address=11, command_type=0x10, command=CMD_INPUT_BUTTON, data=bytes([1])))
    c._on_event(Command(address=11, command_type=0x10, command=CMD_INPUT_BUTTON, data=bytes([0])))
    remove()
    c._on_event(Command(address=11, command_type=0x10, command=CMD_INPUT_BUTTON, data=b""))
    assert events == [(11, True), (11, False)]


async def test_shutdown(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_shutdown()
    assert not client.is_connected


async def test_set_climate_commands(monkeypatch):
    from plejd.const import CMD_TRM_MODE, CMD_TRM_SETPOINT
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_set_climate_setpoint(9, 22.0)
    assert decode_command(c._connection.mesh.decrypt(client.writes[-1][1])).command == CMD_TRM_SETPOINT
    await c.async_set_climate_mode(9, 3)
    assert decode_command(c._connection.mesh.decrypt(client.writes[-1][1])).command == CMD_TRM_MODE


def test_motion_event_dispatches_to_listeners():
    from plejd.const import CMD_OUTPUT_SET
    from plejd.protocol import Command

    # entry with a motion sensor at address 33
    entry = types.SimpleNamespace(
        data={
            CONF_CRYPTO_KEY: _KEY_HEX,
            CONF_DEVICES: [_DEV],
            CONF_DISCOVERED_ADDRESS: None,
            "motion": [{"device_id": "w1", "name": "Motion", "address": 33}],
        }
    )
    c = PlejdCoordinator(_hass(), entry)
    events = []
    remove = c.async_add_motion_listener(events.append)
    # a real WMS motion broadcast (Source=Motion + Lux=2)
    c._on_event(Command(33, 0x10, CMD_OUTPUT_SET, bytes.fromhex("03031f0700b00f08460602")))
    c._on_event(Command(99, 0x10, CMD_OUTPUT_SET, b"\x03\x03"))  # not a motion address -> ignored
    remove()
    assert len(events) == 1 and events[0].motion is True and events[0].lux == 2


async def test_cover_commands(monkeypatch):
    from plejd.const import CMD_OUTPUT_SET
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_set_cover_position(7, 100)
    pos = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert pos.command == CMD_OUTPUT_SET and pos.data[:2] == bytes([0x03, 0x08])
    await c.async_cover_stop(7)
    stop = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert stop.data == bytes([0x03, 0x08, 0x07, 0x00])


async def test_dim_level_settings(monkeypatch):
    from plejd.const import CMD_OUTPUT_MAX_LEVEL, CMD_OUTPUT_MIN_LEVEL
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_set_output_min_level(9, 1, 0.0)
    low = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert low.command == CMD_OUTPUT_MIN_LEVEL and low.data == bytes([1, 0x00, 0x00])
    await c.async_set_output_max_level(9, 1, 1.0)
    high = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert high.command == CMD_OUTPUT_MAX_LEVEL and high.data == bytes([1, 0xFF, 0xFF])


async def test_dimmer_tuning_settings(monkeypatch):
    from plejd.const import CMD_OUTPUT_CURVE_TYPE, CMD_OUTPUT_PHASE_DIM_TYPE
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_set_output_curve(9, 1, 3)
    cv = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert cv.command == CMD_OUTPUT_CURVE_TYPE and cv.data == bytes([1, 3])
    await c.async_set_output_phase_dim(9, 1, 1)
    ph = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert ph.command == CMD_OUTPUT_PHASE_DIM_TYPE and ph.data == bytes([1, 1])
