"""Tests for the Plejd coordinator."""

from __future__ import annotations

import asyncio
import types

import pytest
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from plejd import connection as conn
from plejd import coordinator as coordinator_mod
from plejd.const import (
    CONF_CRYPTO_KEY,
    CONF_DEVICES,
    CONF_DISCOVERED_ADDRESS,
    CONF_GATEWAYS,
    CONF_INPUTS,
    CONF_INSTALLATION_ID,
    CONF_MOTION,
    CONF_RESOURCE_SET_ID,
    CONF_SCENES,
    CONF_SITE_ID,
    CONF_TRANSPORT,
    PLEJD_CHAR_DATA_UUID,
    PLEJD_SERVICE_UUID,
)
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
    "object_id": None,
    "device_address": 5,
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
        entry_id="e1",
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [_DEV], CONF_DISCOVERED_ADDRESS: discovered},
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
        entry_id="e1",
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [legacy], CONF_DISCOVERED_ADDRESS: None},
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
    await c.async_set_output(5, True, 120)
    # the written command, fed back as a notification, becomes the live state
    _, payload = client.writes[-1]
    client.notify_cb(None, bytearray(payload))
    assert c.state_for(5).level == 120


async def test_set_output_without_connection_raises():
    from homeassistant.exceptions import HomeAssistantError

    c = PlejdCoordinator(_hass(), _entry())
    with pytest.raises(HomeAssistantError, match="not connected"):
        await c.async_set_output(5, True, 1)


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


def test_notify_outputs_calls_listeners():
    c = PlejdCoordinator(_hass(), _entry())
    seen = []
    remove = c.async_add_listener(lambda: seen.append(1))
    c._notify_outputs()
    remove()
    c._notify_outputs()
    assert seen == [1]


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


async def test_available_reflects_connection(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    assert c.available is False  # not connected yet
    await c.async_start()
    assert c.available is True


async def test_initial_state_read_one_per_address(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    dev_none = {**_DEV, "device_id": "d2", "address": None}
    dev_dup = {**_DEV, "device_id": "d3", "address": 5}
    entry = types.SimpleNamespace(
        entry_id="e1",
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [_DEV, dev_none, dev_dup], CONF_DISCOVERED_ADDRESS: None},
    )
    c = PlejdCoordinator(hass, entry)
    await c.async_start()
    # one output-state read written per unique non-None address (addr 5); None + duplicate skipped.
    # (Other DATA reads after connect — e.g. the NotifyEvents health poll — use a different opcode.)
    from plejd.const import CMD_OUTPUT_STATE_AND_LEVEL
    from plejd.protocol import TYPE_READ, decode_command

    reads = [
        cmd
        for w in client.writes
        if w[0] == PLEJD_CHAR_DATA_UUID
        for cmd in [decode_command(c._connection.mesh.decrypt(w[1]))]
        if cmd.command_type == TYPE_READ and cmd.command == CMD_OUTPUT_STATE_AND_LEVEL
    ]
    assert len(reads) == 1


async def test_read_all_states_noop_without_mesh():
    c = PlejdCoordinator(_hass(), _entry())
    await c._async_read_all_states()  # mesh is None — returns without writing


async def test_disconnect_marks_unavailable_and_reconnects(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()

    async def _fake_sleep(_delay):
        client.is_connected = True  # the device comes back into range

    monkeypatch.setattr(coordinator_mod.asyncio, "sleep", _fake_sleep)
    client.is_connected = False
    c._connection._handle_disconnect(client)  # bleak signals the drop
    assert c.available is False
    await c._reconnect_task
    assert c.available is True


def test_spawn_prefers_hass_background_task():
    c = PlejdCoordinator(_hass(), _entry())
    captured = {}
    c.hass.async_create_background_task = lambda co, name: captured.update(coro=co, name=name) or "TASK"
    coro = c._async_reconnect()
    assert c._spawn(coro) == "TASK"
    assert captured["name"] == "plejd-reconnect"
    captured["coro"].close()  # we never scheduled it


async def test_reconnect_guard_when_already_running():
    c = PlejdCoordinator(_hass(), _entry())
    c._reconnecting = True
    await c._async_reconnect()  # returns immediately, leaves the flag as-is
    assert c._reconnecting is True


async def test_reconnect_stops_when_closed(monkeypatch):
    c = PlejdCoordinator(_hass(), _entry())  # no device in range

    async def _fake_sleep(_delay):
        c._closed = True

    monkeypatch.setattr(coordinator_mod.asyncio, "sleep", _fake_sleep)
    await c._async_reconnect()
    assert c._reconnecting is False


async def test_reconnect_backs_off_on_failure(monkeypatch):
    c = PlejdCoordinator(_hass(), _entry())  # no device → each attempt raises ConfigEntryNotReady
    calls = {"n": 0}

    async def _fake_sleep(_delay):
        calls["n"] += 1
        if calls["n"] >= 2:
            c._closed = True

    monkeypatch.setattr(coordinator_mod.asyncio, "sleep", _fake_sleep)
    await c._async_reconnect()
    assert calls["n"] == 2  # retried after the first failure, then gave up on close


async def test_reconnect_stops_and_starts_reauth_on_auth_failure(monkeypatch):
    from homeassistant.exceptions import ConfigEntryAuthFailed

    c = PlejdCoordinator(_hass(), _entry())
    started = []
    c._entry = types.SimpleNamespace(async_start_reauth=lambda h: started.append(h))

    async def _fake_sleep(_delay):
        pass

    async def _auth_fail():
        raise ConfigEntryAuthFailed("credentials rejected")

    monkeypatch.setattr(coordinator_mod.asyncio, "sleep", _fake_sleep)
    monkeypatch.setattr(c, "_async_select_and_connect", _auth_fail)
    await c._async_reconnect()
    assert started == [c.hass]  # reauth started, loop didn't retry forever
    assert c._reconnecting is False


async def test_reconnect_retries_on_unexpected_exception(monkeypatch):
    c = PlejdCoordinator(_hass(), _entry())
    calls = {"n": 0}

    async def _fake_sleep(_delay):
        pass

    async def _flaky():
        calls["n"] += 1
        if calls["n"] < 3:
            raise RuntimeError("boom")

    monkeypatch.setattr(coordinator_mod.asyncio, "sleep", _fake_sleep)
    monkeypatch.setattr(c, "_async_select_and_connect", _flaky)
    await c._async_reconnect()
    assert calls["n"] == 3  # two unexpected failures were retried, not fatal


async def test_shutdown_cancels_reconnect_task(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()

    async def _sleeper():
        await asyncio.sleep(100)

    c._reconnect_task = asyncio.ensure_future(_sleeper())
    task = c._reconnect_task
    await c.async_shutdown()
    assert c._reconnect_task is None and not client.is_connected
    drained = await asyncio.gather(task, return_exceptions=True)
    assert isinstance(drained[0], asyncio.CancelledError)  # shutdown cancelled the reconnect task


class _FakeGateway:
    def __init__(self, *args, **kwargs):
        self.connected = False
        self.writes: list[bytes] = []
        self.state: dict = {}
        self.fail = False
        self.disconnected = False

    async def connect(self):
        if self.fail:
            raise OSError("gw down")
        self.connected = True

    async def write(self, vector):
        self.writes.append(vector)

    def state_for(self, address):
        return self.state.get(address)

    async def disconnect(self):
        self.disconnected = True
        self.connected = False


def _gateway_entry():
    return types.SimpleNamespace(
        entry_id="e1",
        data={
            CONF_CRYPTO_KEY: _KEY_HEX,
            CONF_DEVICES: [_DEV],
            CONF_DISCOVERED_ADDRESS: None,
            CONF_GATEWAYS: ["gw1"],
            CONF_RESOURCE_SET_ID: "rs1",
            CONF_INSTALLATION_ID: "inst-1",
            CONF_SITE_ID: "S1",
            CONF_EMAIL: "u@x.se",
            CONF_PASSWORD: "pw",
        },
    )


async def test_gateway_is_preferred_and_routes_commands(monkeypatch):
    from plejd.protocol import OutputState, set_group_state_and_level

    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    hass = _hass()
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    await c.async_start()
    assert c._active == "gateway" and c.available is True
    c._gateway.state = {11: OutputState(output=11, on=True, level=80)}
    assert c.state_for(11).level == 80
    await c.async_set_output(11, True, 80)
    assert c._gateway.writes[-1] == set_group_state_and_level(11, True, 80)


async def test_gateway_failure_falls_back_to_ble(monkeypatch):
    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    c._gateway.fail = True
    await c.async_start()
    assert c._active == "ble" and c.available is True


async def test_gateway_auth_failure_raises_reauth(monkeypatch):
    from homeassistant.exceptions import ConfigEntryAuthFailed
    from plejd.cloud import PlejdAuthError

    class _AuthFailGateway(_FakeGateway):
        async def connect(self):
            raise PlejdAuthError("bad creds")

    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _AuthFailGateway)
    # BLE device is in range, but auth failure must NOT silently fall back to it.
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    with pytest.raises(ConfigEntryAuthFailed):
        await c.async_start()
    assert c._active is None  # did not connect over BLE


async def test_transport_force_ble_skips_gateway(monkeypatch):
    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    hass.session = object()
    entry = _gateway_entry()
    entry.options = {CONF_TRANSPORT: "ble"}
    c = PlejdCoordinator(hass, entry)
    await c.async_start()
    assert c._active == "ble" and c._gateway.connected is False  # gateway present but unused


async def test_transport_force_gateway(monkeypatch):
    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    hass = _hass()
    hass.session = object()
    entry = _gateway_entry()
    entry.options = {CONF_TRANSPORT: "gateway"}
    c = PlejdCoordinator(hass, entry)
    await c.async_start()
    assert c._active == "gateway"


async def test_transport_force_gateway_without_gateway_raises():
    from homeassistant.exceptions import ConfigEntryNotReady

    entry = _entry()
    entry.options = {CONF_TRANSPORT: "gateway"}
    c = PlejdCoordinator(_hass(), entry)
    with pytest.raises(ConfigEntryNotReady, match="no gateway"):
        await c.async_start()


async def test_active_transport_reflects_connection(monkeypatch):
    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    hass = _hass()
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    assert c.active_transport is None  # not connected yet
    await c.async_start()
    assert c.active_transport == "gateway"


async def test_gateway_get_token(monkeypatch):
    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)

    async def _login(session, email, password):
        return "TOKEN"

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    hass = _hass()
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    assert await c._async_get_token() == "TOKEN"


async def test_shutdown_disconnects_gateway(monkeypatch):
    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    hass = _hass()
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    await c.async_start()
    await c.async_shutdown()
    assert c._gateway.disconnected is True


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
        entry_id="e1",
        data={
            CONF_CRYPTO_KEY: _KEY_HEX,
            CONF_DEVICES: [_DEV],
            CONF_DISCOVERED_ADDRESS: None,
            "motion": [{"device_id": "w1", "name": "Motion", "address": 33}],
        },
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
    from plejd.const import (
        CMD_OUTPUT_MAX_LEVEL,
        CMD_OUTPUT_MIN_LEVEL,
        CMD_OUTPUT_SPEED,
        CMD_OUTPUT_START_LEVEL,
    )
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
    await c.async_set_output_speed(9, 1, 1.0)
    speed = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert speed.command == CMD_OUTPUT_SPEED and speed.data == bytes([1, 0x8F, 0x82])
    await c.async_set_output_start_level(9, 1, 0.5)
    start = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert start.command == CMD_OUTPUT_START_LEVEL and start.data == bytes([1, 0x00, 0x80])


def _expected_clock_bytes():
    from homeassistant.util import dt as dt_util

    now = dt_util.now()
    epoch = int(now.timestamp() + now.utcoffset().total_seconds())
    return bytes([epoch & 0xFF, (epoch >> 8) & 0xFF, (epoch >> 16) & 0xFF, (epoch >> 24) & 0xFF, 0x00])


async def test_clock_synced_on_connect(monkeypatch):
    from plejd.const import CMD_SYSTEM_TIME
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    clock = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert clock.address == 0 and clock.command == CMD_SYSTEM_TIME
    assert clock.data == _expected_clock_bytes()


async def test_periodic_sync_and_shutdown_cancels(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    cancelled = []
    c._clock_unsub = lambda: cancelled.append(True)
    before = len(client.writes)
    await c._async_periodic_clock_sync(None)
    assert len(client.writes) == before + 1  # periodic tick re-broadcasts the clock
    await c.async_shutdown()
    assert cancelled == [True] and c._clock_unsub is None


async def test_program_and_remove_time_event(monkeypatch):
    from plejd.const import CMD_TIME_EVENT_SCENE, CMD_TIME_EVENT_TIME, CMD_TIME_EVENT_TYPE
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    start = len(client.writes)
    await c.async_program_time_event(2, 0x7F, 6, 0, 0, 4, 0)
    cmds = [decode_command(c._connection.mesh.decrypt(w[1])) for w in client.writes[start:]]
    assert [x.command for x in cmds] == [CMD_TIME_EVENT_TIME, CMD_TIME_EVENT_TYPE, CMD_TIME_EVENT_SCENE]
    assert cmds[2].data == bytes([2, 1, 4])
    await c.async_remove_time_event(2)
    rm = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert rm.command == CMD_TIME_EVENT_TIME and rm.data == bytes([2])


async def test_clock_sync_failures_are_logged_not_raised(monkeypatch):
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))

    async def _boom():
        raise RuntimeError("mesh dropped")

    monkeypatch.setattr(c, "async_sync_clock", _boom)
    await c.async_start()  # on-connect sync raises -> warning, setup still succeeds
    assert c._connection.mesh is not None
    await c._async_periodic_clock_sync(None)  # periodic sync raises -> warning, no exception


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


def test_fault_event_routes_to_listeners():
    from plejd.const import CMD_NOTIFY_EVENTS
    from plejd.protocol import Command

    c = PlejdCoordinator(_hass(), _entry())
    seen = []
    remove = c.async_add_fault_listener(lambda addr, faults: seen.append((addr, faults)))
    c._on_event(Command(address=5, command_type=0x03, command=CMD_NOTIFY_EVENTS, data=(0x8).to_bytes(8, "little")))
    assert c.faults_for(5) == frozenset({"overtemperature"})
    assert seen == [(5, frozenset({"overtemperature"}))]
    remove()
    assert c.faults_for(99) == frozenset()  # unknown address -> empty


async def test_poll_faults_reads_each_device(monkeypatch):
    from plejd.const import CMD_NOTIFY_EVENTS
    from plejd.protocol import TYPE_READ, decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()  # sets up the poll (the one-shot itself doesn't fire in this test harness)
    await c._async_poll_faults(None)
    reads = [decode_command(c._connection.mesh.decrypt(w[1])) for w in client.writes if w[0] == PLEJD_CHAR_DATA_UUID]
    notify = [r for r in reads if r.command == CMD_NOTIFY_EVENTS]
    assert notify and notify[0].command_type == TYPE_READ and notify[0].address == 5


async def test_poll_faults_best_effort_when_not_connected():
    c = PlejdCoordinator(_hass(), _entry())  # never connected -> _write_vector raises
    await c._async_poll_faults(None)  # swallowed, no exception propagates
    assert c.faults_for(5) == frozenset()


def test_schedule_fault_polling_is_idempotent():
    c = PlejdCoordinator(_hass(), _entry())
    c._schedule_fault_polling()
    first_unsub = c._faults_unsub
    c._schedule_fault_polling()  # e.g. a second async_start - must not reschedule
    assert c._faults_unsub is first_unsub


async def test_poll_faults_skips_devices_without_a_physical_address(monkeypatch):
    from plejd.cloud import PlejdCloudDevice

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    # A device with no physical address (e.g. a not-yet-fully-parsed entry) is skipped.
    c.devices.append(PlejdCloudDevice(**{**_DEV, "device_id": "d2", "device_address": None}))
    await c._async_poll_faults(None)  # must not raise


# --- cloud poll tests ---


def _cloud_poll_entry():
    """Entry with all site-derived fields populated, used for cloud-poll tests."""
    return types.SimpleNamespace(
        entry_id="e1",
        data={
            CONF_CRYPTO_KEY: _KEY_HEX,
            CONF_DEVICES: [_DEV],
            CONF_DISCOVERED_ADDRESS: None,
            CONF_EMAIL: "user@example.com",
            CONF_PASSWORD: "secret",
            CONF_SITE_ID: "S1",
            CONF_INPUTS: [],
            CONF_MOTION: [],
            CONF_SCENES: [],
            CONF_GATEWAYS: [],
            CONF_RESOURCE_SET_ID: None,
        },
    )


def _fake_site(devices=None, gateways=None, resource_set_id=None):
    """A PlejdCloudSite-like object matching _DEV by default (no change)."""
    from plejd.cloud import PlejdCloudSite

    return PlejdCloudSite(
        site_id="S1",
        title="Villa",
        crypto_key=bytes.fromhex(_KEY_HEX),
        devices=devices
        if devices is not None
        else [__import__("plejd.cloud", fromlist=["PlejdCloudDevice"]).PlejdCloudDevice(**_DEV)],
        inputs=[],
        motion=[],
        scenes=[],
        gateways=gateways or [],
        resource_set_id=resource_set_id,
    )


async def test_cloud_poll_no_change_does_nothing(monkeypatch):
    async def _login(session, email, password):
        return "TOKEN"

    async def _get_site(session, token, site_id):
        return _fake_site()

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)

    entry = _cloud_poll_entry()
    updated = {}
    reloaded = []
    config_entries = types.SimpleNamespace(
        async_get_entry=lambda eid: entry,
        async_update_entry=lambda e, data: updated.update(data),
        async_reload=lambda eid: reloaded.append(eid),
    )
    hass = _hass()
    hass.session = object()
    hass.config_entries = config_entries
    c = PlejdCoordinator(hass, entry)
    await c._async_poll_cloud(None)
    assert not reloaded  # no difference → no reload


async def test_cloud_poll_device_added_reloads(monkeypatch):
    from plejd.cloud import PlejdCloudDevice

    new_dev = PlejdCloudDevice(**{**_DEV, "device_id": "d2", "name": "Matbord", "address": 9})

    async def _login(session, email, password):
        return "TOKEN"

    async def _get_site(session, token, site_id):
        return _fake_site(devices=[PlejdCloudDevice(**_DEV), new_dev])

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)

    entry = _cloud_poll_entry()
    updated = {}

    async def _reload(eid):
        reloaded.append(eid)

    reloaded = []
    config_entries = types.SimpleNamespace(
        async_get_entry=lambda eid: entry,
        async_update_entry=lambda e, data: updated.update(data),
        async_reload=_reload,
    )
    hass = _hass()
    hass.session = object()
    hass.config_entries = config_entries
    c = PlejdCoordinator(hass, entry)
    await c._async_poll_cloud(None)
    assert reloaded == ["e1"]
    assert len(updated[CONF_DEVICES]) == 2


async def test_cloud_poll_seeds_installation_id_for_new_gateway(monkeypatch):
    async def _login(session, email, password):
        return "TOKEN"

    async def _get_site(session, token, site_id):
        return _fake_site(gateways=["gw1"], resource_set_id="rs1")

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)

    entry = _cloud_poll_entry()  # no CONF_INSTALLATION_ID - predates the gateway feature
    updated = {}

    async def _reload(eid):
        reloaded.append(eid)

    reloaded = []
    config_entries = types.SimpleNamespace(
        async_get_entry=lambda eid: entry,
        async_update_entry=lambda e, data: updated.update(data),
        async_reload=_reload,
    )
    hass = _hass()
    hass.session = object()
    hass.config_entries = config_entries
    c = PlejdCoordinator(hass, entry)
    await c._async_poll_cloud(None)
    assert reloaded == ["e1"]
    assert updated[CONF_INSTALLATION_ID]  # a fresh id was generated, not left missing


async def test_cloud_poll_auth_error_logs_warning(monkeypatch):
    from plejd.cloud import PlejdAuthError

    async def _login(session, email, password):
        raise PlejdAuthError("bad creds")

    monkeypatch.setattr(coordinator_mod, "async_login", _login)

    entry = _cloud_poll_entry()
    reloaded = []
    config_entries = types.SimpleNamespace(
        async_get_entry=lambda eid: entry,
        async_update_entry=lambda e, data: None,
        async_reload=lambda eid: reloaded.append(eid),
    )
    hass = _hass()
    hass.session = object()
    hass.config_entries = config_entries
    c = PlejdCoordinator(hass, entry)
    await c._async_poll_cloud(None)  # must not raise
    assert not reloaded


async def test_cloud_poll_entry_gone_does_nothing(monkeypatch):
    """Poll is a no-op when the entry has already been removed."""
    config_entries = types.SimpleNamespace(
        async_get_entry=lambda eid: None,
    )
    hass = _hass()
    hass.config_entries = config_entries
    c = PlejdCoordinator(hass, _cloud_poll_entry())
    await c._async_poll_cloud(None)  # must not raise


async def test_cloud_poll_cloud_error_skips_reload(monkeypatch):
    from plejd.cloud import PlejdCloudError

    async def _login(session, email, password):
        raise PlejdCloudError("unreachable")

    monkeypatch.setattr(coordinator_mod, "async_login", _login)

    entry = _cloud_poll_entry()
    reloaded = []
    config_entries = types.SimpleNamespace(
        async_get_entry=lambda eid: entry,
        async_update_entry=lambda e, data: None,
        async_reload=lambda eid: reloaded.append(eid),
    )
    hass = _hass()
    hass.session = object()
    hass.config_entries = config_entries
    c = PlejdCoordinator(hass, entry)
    await c._async_poll_cloud(None)  # must not raise
    assert not reloaded


def _fw_site(firmware_by_device):
    from plejd.cloud import PlejdDeviceFirmware

    fw = {
        device_id: PlejdDeviceFirmware(version=v, build_time=bt, hardware_id=hw, faceplate_id=face)
        for device_id, (v, bt, hw, face) in firmware_by_device.items()
    }
    return types.SimpleNamespace(firmware_by_device=fw)


def _cloud_entry():
    return types.SimpleNamespace(
        entry_id="e1",
        data={
            CONF_CRYPTO_KEY: _KEY_HEX,
            CONF_DEVICES: [_DEV],
            CONF_DISCOVERED_ADDRESS: None,
            CONF_SITE_ID: "S1",
            CONF_EMAIL: "u@x.se",
            CONF_PASSWORD: "pw",
        },
    )


async def test_refresh_firmware_populates_status(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())
    site = _fw_site({"d1": ("6.40.0", 20251201000000, 1, "0")})

    async def _login(*a):
        return "tok"

    async def _get_site(*a):
        return site

    async def _latest(session, token, hw, face):
        return ("6.43.3", 20260324155701)

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)
    monkeypatch.setattr(coordinator_mod, "async_get_available_firmware", _latest)

    await c.async_refresh_firmware()
    status = c.firmware["d1"]
    assert status.installed_version == "6.40.0" and status.installed_build_time == 20251201000000
    assert status.latest_version == "6.43.3" and status.update_available is True


async def test_refresh_firmware_caches_lookups_per_hardware(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())
    # two devices sharing one (hardware, faceplate) + a motion sensor on different hardware
    site = _fw_site(
        {
            "d1": ("6.40.0", 20251201000000, 1, "0"),
            "d2": ("6.40.0", 20251201000000, 1, "0"),
            "w1": ("4.41.3", 20240910153670, 70, None),
        }
    )
    calls = []

    async def _login(*a):
        return "tok"

    async def _get_site(*a):
        return site

    async def _latest(session, token, hw, face):
        calls.append((hw, face))
        return None  # up to date

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)
    monkeypatch.setattr(coordinator_mod, "async_get_available_firmware", _latest)

    await c.async_refresh_firmware()
    assert sorted(calls) == [(1, "0"), (70, None)]  # one lookup per distinct (hardware, faceplate)
    assert set(c.firmware) == {"d1", "d2", "w1"}  # sensors covered, not just outputs
    assert c.firmware["w1"].update_available is False and c.firmware["w1"].latest_version is None


async def test_refresh_firmware_tolerates_one_failed_lookup(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())
    site = _fw_site(
        {
            "d1": ("6.40.0", 20251201000000, 1, "0"),  # this hardware's lookup will raise
            "w1": ("4.41.3", 20240910153670, 70, None),  # this one succeeds
        }
    )

    async def _login(*a):
        return "tok"

    async def _get_site(*a):
        return site

    async def _latest(session, token, hw, face):
        if hw == 1:
            raise coordinator_mod.PlejdAuthError("boom")  # one flaky combo
        return ("4.42.0", 20260101000000)

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)
    monkeypatch.setattr(coordinator_mod, "async_get_available_firmware", _latest)

    await c.async_refresh_firmware()
    # the whole refresh survives: every device still gets a status
    assert set(c.firmware) == {"d1", "w1"}
    assert c.firmware["d1"].latest_version is None  # failed lookup -> treated as up to date
    assert c.firmware["w1"].update_available is True  # the successful one still resolves


async def test_refresh_firmware_no_credentials_is_noop(monkeypatch):
    c = PlejdCoordinator(_hass(), _entry())  # no CONF_EMAIL / CONF_PASSWORD

    async def _boom(*a):
        raise AssertionError("must not log in without credentials")

    monkeypatch.setattr(coordinator_mod, "async_login", _boom)
    await c.async_refresh_firmware()
    assert c.firmware == {}


async def test_firmware_check_swallows_errors(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())

    async def _boom(*a):
        raise RuntimeError("cloud down")

    monkeypatch.setattr(coordinator_mod, "async_login", _boom)
    await c._async_firmware_check(None)  # best-effort: no exception
    assert c.firmware == {}


def test_schedule_firmware_checks_registers_timers_once():
    c = PlejdCoordinator(_hass(), _cloud_entry())
    c._schedule_firmware_checks()
    daily, one_shot = c._firmware_unsub, c._firmware_now_unsub
    assert daily is not None and one_shot is not None
    c._schedule_firmware_checks()  # a second start must not re-register
    assert c._firmware_unsub is daily and c._firmware_now_unsub is one_shot


async def test_one_shot_handle_cleared_after_firing(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())
    c._firmware_now_unsub = lambda: None

    async def _noop(*a):
        return None

    monkeypatch.setattr(c, "async_refresh_firmware", _noop)
    await c._async_firmware_check(None)
    assert c._firmware_now_unsub is None  # cleared once the one-shot fires


async def test_shutdown_cancels_both_firmware_timers():
    c = PlejdCoordinator(_hass(), _cloud_entry())
    cancelled = []
    c._firmware_unsub = lambda: cancelled.append("daily")
    c._firmware_now_unsub = lambda: cancelled.append("one_shot")
    await c.async_shutdown()
    assert sorted(cancelled) == ["daily", "one_shot"]
    assert c._firmware_unsub is None and c._firmware_now_unsub is None


class _FakeDevice:
    def __init__(self, identifiers, name_by_user):
        self.identifiers = identifiers
        self.name_by_user = name_by_user


class _FakeRegistry:
    def __init__(self, device):
        self._device = device

    def async_get(self, device_id):
        return self._device


def _reg_event(action="update", changes=None, device_id="ha1"):
    return types.SimpleNamespace(
        data={"action": action, "changes": changes if changes is not None else {}, "device_id": device_id}
    )


def test_output_parse_id_picks_lowest_output_index():
    from plejd.cloud import PlejdCloudDevice
    from plejd.coordinator import PlejdCoordinator

    def _dev(output_index, object_id):
        return PlejdCloudDevice(
            device_id="d1",
            name="Dev",
            address=1,
            output_index=output_index,
            outputs=[1],
            hardware_id=1,
            model="DIM-02",
            category="light",
            dimmable=True,
            traits=0,
            room_id=None,
            object_id=object_id,
        )

    # output_index=1 comes first in the list but output_index=0 is the primary
    devices = [_dev(1, "parse-id-1"), _dev(0, "parse-id-0")]
    assert PlejdCoordinator._output_parse_id(devices, "d1") == "parse-id-0"


async def test_rename_device_calls_cloud(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())
    c.devices[0].object_id = "p1"  # device_id "d1"
    captured = {}

    async def _login(*a):
        return "tok"

    async def _set(session, token, site_id, device_id, parse_id, title):
        captured.update(site_id=site_id, device_id=device_id, parse_id=parse_id, title=title)
        return True

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_set_device_title", _set)
    await c.async_rename_device("d1", "New Name")
    assert captured == {"site_id": "S1", "device_id": "d1", "parse_id": "p1", "title": "New Name"}


async def test_rename_device_falls_back_to_cloud_lookup(monkeypatch):
    # entries cached before object_id existed (e.g. _DEV) resolve it from a fresh site fetch
    from plejd.cloud import PlejdCloudDevice

    c = PlejdCoordinator(_hass(), _cloud_entry())  # _DEV has no object_id
    fresh = PlejdCloudDevice(
        device_id="d1",
        name="Kitchen",
        address=5,
        output_index=0,
        outputs=[5],
        hardware_id=1,
        model="DIM-01",
        category="light",
        dimmable=True,
        traits=3,
        room_id="r1",
        object_id="p2",
    )
    captured = {}

    async def _login(*a):
        return "tok"

    async def _get_site(*a):
        return types.SimpleNamespace(devices=[fresh])

    async def _set(session, token, site_id, device_id, parse_id, title):
        captured.update(parse_id=parse_id, title=title)
        return True

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)
    monkeypatch.setattr(coordinator_mod, "async_set_device_title", _set)
    await c.async_rename_device("d1", "X")
    assert captured == {"parse_id": "p2", "title": "X"}


async def test_rename_device_skips_when_not_resolvable(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())  # _DEV has no object_id

    async def _login(*a):
        return "tok"

    async def _get_site(*a):
        return types.SimpleNamespace(devices=[])  # device not found in the cloud either

    async def _fail(*a):
        raise AssertionError("must not call updateDevice when no Parse id is resolvable")

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)
    monkeypatch.setattr(coordinator_mod, "async_set_device_title", _fail)
    await c.async_rename_device("d1", "X")  # resolves to nothing -> skip, no write


async def test_rename_device_skips_without_credentials(monkeypatch):
    c = PlejdCoordinator(_hass(), _entry())  # no CONF_EMAIL / CONF_PASSWORD

    async def _boom(*a):
        raise AssertionError("must not log in without credentials")

    monkeypatch.setattr(coordinator_mod, "async_login", _boom)
    await c.async_rename_device("d1", "X")


async def test_rename_device_raises_when_cloud_rejects(monkeypatch):
    from homeassistant.exceptions import HomeAssistantError

    c = PlejdCoordinator(_hass(), _cloud_entry())
    c.devices[0].object_id = "p1"

    async def _login(*a):
        return "tok"

    async def _set(*a):
        return False

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_set_device_title", _set)
    with pytest.raises(HomeAssistantError):
        await c.async_rename_device("d1", "X")


async def test_registry_update_mirrors_rename(monkeypatch):
    from plejd.const import DOMAIN

    hass = _hass()
    c = PlejdCoordinator(hass, _cloud_entry())
    hass.device_registry = _FakeRegistry(_FakeDevice({(DOMAIN, "F1AF")}, "New Name"))
    called = {}

    async def _rename(device_id, title):
        called.update(device_id=device_id, title=title)

    monkeypatch.setattr(c, "async_rename_device", _rename)
    await c.async_handle_device_registry_update(_reg_event(changes={"name_by_user": "Old"}))
    assert called == {"device_id": "F1AF", "title": "New Name"}


async def test_registry_update_ignores_non_rename_events(monkeypatch):
    c = PlejdCoordinator(_hass(), _cloud_entry())

    async def _fail(*a):
        raise AssertionError("rename must not be triggered")

    monkeypatch.setattr(c, "async_rename_device", _fail)
    await c.async_handle_device_registry_update(_reg_event(action="create", changes={"name_by_user": "x"}))
    await c.async_handle_device_registry_update(_reg_event(action="update", changes={"area_id": None}))


async def test_registry_update_ignores_missing_device_and_non_plejd(monkeypatch):
    from plejd.const import DOMAIN

    hass = _hass()
    c = PlejdCoordinator(hass, _cloud_entry())

    async def _fail(*a):
        raise AssertionError("rename must not be triggered")

    monkeypatch.setattr(c, "async_rename_device", _fail)
    hass.device_registry = _FakeRegistry(None)  # device gone
    await c.async_handle_device_registry_update(_reg_event(changes={"name_by_user": "x"}))
    hass.device_registry = _FakeRegistry(_FakeDevice({("other", "z")}, "Name"))  # not a Plejd device
    await c.async_handle_device_registry_update(_reg_event(changes={"name_by_user": "x"}))
    hass.device_registry = _FakeRegistry(_FakeDevice({(DOMAIN, "d1")}, None))  # name cleared
    await c.async_handle_device_registry_update(_reg_event(changes={"name_by_user": "x"}))
    # no registry set yet (early startup)
    del hass.device_registry
    await c.async_handle_device_registry_update(_reg_event(changes={"name_by_user": "x"}))
    # device_id missing from event data
    hass.device_registry = _FakeRegistry(None)
    await c.async_handle_device_registry_update(
        types.SimpleNamespace(data={"action": "update", "changes": {"name_by_user": "x"}})
    )


async def test_registry_update_swallows_rename_errors(monkeypatch):
    from plejd.const import DOMAIN

    hass = _hass()
    c = PlejdCoordinator(hass, _cloud_entry())
    hass.device_registry = _FakeRegistry(_FakeDevice({(DOMAIN, "d1")}, "Name"))

    async def _boom(*a):
        raise RuntimeError("cloud down")

    monkeypatch.setattr(c, "async_rename_device", _boom)
    await c.async_handle_device_registry_update(_reg_event(changes={"name_by_user": "x"}))  # no exception


async def test_registry_update_triggers_reauth_on_auth_error(monkeypatch):
    from plejd.const import DOMAIN

    hass = _hass()
    c = PlejdCoordinator(hass, _cloud_entry())
    started = []
    c._entry = types.SimpleNamespace(async_start_reauth=lambda h: started.append(h))
    hass.device_registry = _FakeRegistry(_FakeDevice({(DOMAIN, "d1")}, "New"))

    async def _auth_fail(*a):
        raise coordinator_mod.PlejdAuthError("bad creds")

    monkeypatch.setattr(coordinator_mod, "async_login", _auth_fail)
    await c.async_handle_device_registry_update(_reg_event(changes={"name_by_user": "x"}))
    assert started == [hass]  # reauth flow prompted instead of silently swallowed
