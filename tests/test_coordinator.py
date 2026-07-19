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
    CONF_DEVICE_ADDRESSES,
    CONF_DEVICES,
    CONF_DISCOVERED_ADDRESS,
    CONF_GATEWAYS,
    CONF_INSTALLATION_ID,
    CONF_RESOURCE_SET_ID,
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


async def test_set_group_output_writes_group_command_and_reflects_member_state(monkeypatch):
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    seen = []
    c.async_add_listener(lambda: seen.append(1))
    await c.async_set_group_output(14, True, 120, [5, 6])
    # the single command was written to the room's group address...
    cmd = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert cmd.address == 14
    # ...and each member's own state is reflected immediately, without waiting on its
    # own notification (a group command's echo is keyed by the group address, not them)
    assert c.state_for(5).on is True and c.state_for(5).level == 120 and c.state_for(5).output == 5
    assert c.state_for(6).on is True and c.state_for(6).level == 120 and c.state_for(6).output == 6
    assert seen == [1]  # listeners notified of the optimistic update


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
    # one output-state read per unique non-None address (addr 5); None address + duplicate skipped.
    # (Other DATA reads after connect — dimmable-settings, boot-state, the NotifyEvents health
    # poll — use different opcodes and are filtered out below.)
    from plejd.const import CMD_OUTPUT_STATE_AND_LEVEL
    from plejd.protocol import TYPE_READ, decode_command

    reads = [
        cmd
        for w in client.writes
        if w[0] == PLEJD_CHAR_DATA_UUID
        for cmd in [decode_command(c._connection.mesh.decrypt(w[1]))]
        if cmd.command_type == TYPE_READ and cmd.command == CMD_OUTPUT_STATE_AND_LEVEL
    ]
    assert len(reads) == 1  # exactly one state read per unique address


async def test_read_all_states_noop_without_mesh():
    c = PlejdCoordinator(_hass(), _entry())
    await c._async_read_all_states()  # mesh is None — returns without writing


async def test_read_all_settings_noop_without_mesh():
    c = PlejdCoordinator(_hass(), _entry())
    await c._async_read_all_settings()  # mesh is None — returns without writing


async def test_settings_short_reply_ignored_for_all_commands(monkeypatch):
    """val-is-None guard returns early for every settings command on short data."""
    from plejd.const import (
        CMD_OUTPUT_BOOT_STATE,
        CMD_OUTPUT_CURVE_TYPE,
        CMD_OUTPUT_MAX_LEVEL,
        CMD_OUTPUT_PHASE_DIM_TYPE,
        CMD_OUTPUT_RELAY_OFF_TIME,
        CMD_OUTPUT_SPEED,
    )
    from plejd.protocol import Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()

    # 1-byte payload → decode_output_level_reply returns None → max-level guard line
    c._on_event(Command(5, 0x03, CMD_OUTPUT_MAX_LEVEL, bytes([0x01])))
    # 1-byte payload → decode_output_speed_reply returns None → speed guard line
    c._on_event(Command(5, 0x03, CMD_OUTPUT_SPEED, bytes([0x01])))
    # 0-byte payload → decode_output_curve_reply returns None → curve guard line
    c._on_event(Command(5, 0x03, CMD_OUTPUT_CURVE_TYPE, b""))
    # 0-byte payload → decode_output_phase_dim_reply returns None → phase guard line
    c._on_event(Command(5, 0x03, CMD_OUTPUT_PHASE_DIM_TYPE, b""))
    # 0-byte payload → decode_output_boot_state_reply returns None → boot-state guard line
    c._on_event(Command(5, 0x03, CMD_OUTPUT_BOOT_STATE, b""))
    # 1-byte payload → decode_output_relay_off_time_reply returns None → relay-off-time guard
    c._on_event(Command(5, 0x03, CMD_OUTPUT_RELAY_OFF_TIME, bytes([0x01])))

    # None of the short replies should be stored
    assert c.settings_for(5) is None


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
        self.on_event = kwargs.get("on_event")

    async def connect(self):
        if self.fail:
            raise OSError("gw down")
        self.connected = True

    async def write(self, vector):
        self.writes.append(vector)

    def state_for(self, address):
        return self.state.get(address)

    def set_state(self, address, state):
        self.state[address] = state

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
            CONF_DEVICE_ADDRESSES: {"d1": 5},
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


async def test_gateway_set_group_output_reflects_member_state(monkeypatch):
    from plejd.protocol import set_group_state_and_level

    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    hass = _hass()
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    await c.async_start()
    await c.async_set_group_output(14, True, 90, [5, 6])
    assert c._gateway.writes[-1] == set_group_state_and_level(14, True, 90)
    assert c.state_for(5).on is True and c.state_for(5).level == 90 and c.state_for(5).output == 5
    assert c.state_for(6).on is True and c.state_for(6).level == 90 and c.state_for(6).output == 6


async def test_gateway_connect_starts_fault_polling(monkeypatch):
    from plejd.const import CMD_NOTIFY_EVENTS
    from plejd.protocol import decode_command

    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    hass = _hass()
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    await c.async_start()
    assert c._faults_unsub is not None
    reads = [decode_command(w) for w in c._gateway.writes]
    assert any(r.command == CMD_NOTIFY_EVENTS for r in reads)


async def test_gateway_pushes_route_notify_events_to_faults(monkeypatch):
    from plejd.const import CMD_NOTIFY_EVENTS
    from plejd.protocol import Command

    monkeypatch.setattr(coordinator_mod, "PlejdGatewayConnection", _FakeGateway)
    hass = _hass()
    hass.session = object()
    c = PlejdCoordinator(hass, _gateway_entry())
    await c.async_start()
    # The gateway forwards every decoded mesh.out command through on_event, same as BLE.
    c._gateway.on_event(
        Command(address=5, command_type=0x03, command=CMD_NOTIFY_EVENTS, data=(0x8).to_bytes(8, "little"))
    )
    assert c.faults_for(5) == frozenset({"overtemperature"})


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
    # Local writes update the settings cache immediately, without waiting for a BLE read-back.
    settings = c.settings_for(9)
    assert settings.min_level == 0.0
    assert settings.max_level == 100.0
    assert settings.speed == 1.0


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
    settings = c.settings_for(9)
    assert settings.curve == 3
    assert settings.phase_dim == 1


async def test_local_write_cache_survives_unrelated_ble_notification(monkeypatch):
    """A stale BLE reply for a different field must not clobber a just-written setting."""
    from plejd.const import CMD_OUTPUT_MIN_LEVEL
    from plejd.protocol import Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    await c.async_set_output_max_level(9, 1, 0.5)
    assert c.settings_for(9).max_level == 50.0
    # An unrelated settings read-back arrives for the same address (e.g. min level).
    c._on_event(Command(9, 0x03, CMD_OUTPUT_MIN_LEVEL, bytes([0x00, 0x00])))
    assert c.settings_for(9).max_level == 50.0  # untouched by the unrelated reply


def test_settings_for_returns_none_before_connect():
    c = PlejdCoordinator(_hass(), _entry())
    assert c.settings_for(5) is None


async def test_settings_read_on_ble_connect(monkeypatch):
    """Connect issues READ requests for each dimmable output's settings."""
    from plejd.const import CMD_OUTPUT_CURVE_TYPE, CMD_OUTPUT_MAX_LEVEL, CMD_OUTPUT_MIN_LEVEL, CMD_OUTPUT_SPEED
    from plejd.protocol import TYPE_READ, decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()

    # Only DATA characteristic writes are valid commands; filter and ignore decode errors.
    def _try_decode(payload):
        try:
            return decode_command(c._connection.mesh.decrypt(payload))
        except ValueError:
            return None

    cmds = [_try_decode(w[1]) for w in client.writes if w[0] == PLEJD_CHAR_DATA_UUID]
    read_cmds = [cmd for cmd in cmds if cmd is not None and cmd.command_type == TYPE_READ]
    # Expect state read + 5 settings reads (min, max, speed, curve, phase) for the dimmable device.
    settings_codes = {cmd.command for cmd in read_cmds}
    assert CMD_OUTPUT_MIN_LEVEL in settings_codes
    assert CMD_OUTPUT_MAX_LEVEL in settings_codes
    assert CMD_OUTPUT_SPEED in settings_codes
    assert CMD_OUTPUT_CURVE_TYPE in settings_codes


async def test_settings_stored_on_event_and_listener_notified(monkeypatch):
    """_on_event for a settings reply stores the value and fires listeners."""
    from plejd.const import CMD_OUTPUT_MIN_LEVEL
    from plejd.protocol import Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    seen = []
    c.async_add_listener(lambda: seen.append(1))
    # Simulate a min-level reply for address 5: [0xFF, 0xFF] = 100%.
    # command_type=0x03 (TYPE_READ|TYPE_ACK) — replies carry the Ack bit set (docs/protocol.md).
    c._on_event(Command(address=5, command_type=0x03, command=CMD_OUTPUT_MIN_LEVEL, data=bytes([0xFF, 0xFF])))
    assert c.settings_for(5) is not None
    assert c.settings_for(5).min_level == 100.0
    assert seen == [1]


async def test_settings_ignores_write_echo_not_a_read_reply(monkeypatch):
    """A write (TYPE_DONT_RESPOND) echoed back on the same feed must not be decoded as a
    reply — it carries [output, value...], not the reply's value-only bytes, and would
    corrupt the cache with a bogus value."""
    from plejd.const import CMD_OUTPUT_MIN_LEVEL
    from plejd.protocol import TYPE_DONT_RESPOND, Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    # Our own set_output_min_level(addr, output=1, 0.0) write payload: [output, lo, hi].
    c._on_event(Command(address=5, command_type=TYPE_DONT_RESPOND, command=CMD_OUTPUT_MIN_LEVEL, data=bytes([1, 0, 0])))
    assert c.settings_for(5) is None  # not cached as if it were a read reply


async def test_settings_all_commands_stored(monkeypatch):
    """All settings command codes are stored in _output_settings."""
    from plejd.const import (
        CMD_OUTPUT_BOOT_STATE,
        CMD_OUTPUT_CURVE_TYPE,
        CMD_OUTPUT_INRUSH_CURRENT,
        CMD_OUTPUT_MAX_LEVEL,
        CMD_OUTPUT_MIN_LEVEL,
        CMD_OUTPUT_PHASE_DIM_TYPE,
        CMD_OUTPUT_RELAY_CONFIG,
        CMD_OUTPUT_RELAY_OFF_TIME,
        CMD_OUTPUT_SPEED,
    )
    from plejd.protocol import Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()

    # min: 50% = 0x7FFF
    c._on_event(Command(5, 0x03, CMD_OUTPUT_MIN_LEVEL, bytes([0xFF, 0x7F])))
    # max: 100%
    c._on_event(Command(5, 0x03, CMD_OUTPUT_MAX_LEVEL, bytes([0xFF, 0xFF])))
    # speed: instant
    c._on_event(Command(5, 0x03, CMD_OUTPUT_SPEED, bytes([0xFF, 0xFF])))
    # curve: logarithmic (1)
    c._on_event(Command(5, 0x03, CMD_OUTPUT_CURVE_TYPE, bytes([1])))
    # phase: leading_edge (1)
    c._on_event(Command(5, 0x03, CMD_OUTPUT_PHASE_DIM_TYPE, bytes([1])))
    # boot state: use_last (1-byte reply)
    c._on_event(Command(5, 0x03, CMD_OUTPUT_BOOT_STATE, bytes([0x00])))
    # relay off time: 2s = 200 centiseconds = [0xC8, 0x00]
    c._on_event(Command(5, 0x03, CMD_OUTPUT_RELAY_OFF_TIME, bytes([0xC8, 0x00])))
    # relay pole config: one_pole (wire byte 1)
    c._on_event(Command(5, 0x03, CMD_OUTPUT_RELAY_CONFIG, bytes([1])))
    # inrush current: 500ms = 50 centiseconds
    c._on_event(Command(5, 0x03, CMD_OUTPUT_INRUSH_CURRENT, bytes([50, 0])))

    s = c.settings_for(5)
    assert s.max_level == 100.0
    assert s.speed == 0.0
    assert s.curve == 1
    assert s.phase_dim == 1
    assert s.boot_state is True  # 1-byte reply → use_last
    assert s.relay_off_time == 2.0
    assert s.relay_pole_config == 1
    assert s.inrush_current_ms == 500


async def test_settings_short_reply_ignored(monkeypatch):
    """A too-short settings reply is silently dropped."""
    from plejd.const import CMD_OUTPUT_MIN_LEVEL
    from plejd.protocol import Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    c._on_event(Command(5, 0x03, CMD_OUTPUT_MIN_LEVEL, bytes([0x01])))  # only 1 byte, too short
    assert c.settings_for(5) is None  # not stored


def test_settings_from_cloud_with_values():
    from plejd.coordinator import _settings_from_cloud

    s = _settings_from_cloud({"minDim": 32767, "maxDim": 65535, "dimCurve": 1})
    assert s is not None
    assert s.curve == 1
    assert s.min_level == pytest.approx(50.0, abs=0.1)
    assert s.max_level == 100.0


def test_settings_from_cloud_empty_returns_none():
    from plejd.coordinator import _settings_from_cloud

    assert _settings_from_cloud({}) is None


def test_coordinator_pre_populates_from_cloud_output_settings():
    """Cloud outputSettings pre-populate _output_settings on init."""
    dev = {**_DEV, "output_settings": {"minDim": 32767, "maxDim": 65535, "dimCurve": 1}}
    entry = types.SimpleNamespace(
        entry_id="e1",
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [dev], CONF_DISCOVERED_ADDRESS: None},
    )
    c = PlejdCoordinator(_hass(), entry)
    s = c.settings_for(_DEV["address"])
    assert s is not None
    assert s.curve == 1


async def test_relay_off_time_read_on_ble_connect(monkeypatch):
    """Devices in RELAY_HARDWARE get a relay-off-time READ issued during connect."""
    from plejd.const import CMD_OUTPUT_RELAY_OFF_TIME
    from plejd.protocol import TYPE_READ, decode_command

    relay_dev = {**_DEV, "hardware_id": 3, "model": "CTR-01", "dimmable": False}
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    entry = types.SimpleNamespace(
        entry_id="e1",
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [relay_dev], CONF_DISCOVERED_ADDRESS: None},
    )
    c = PlejdCoordinator(hass, entry)
    await c.async_start()

    cmds = [decode_command(c._connection.mesh.decrypt(w[1])) for w in client.writes if w[0] == PLEJD_CHAR_DATA_UUID]
    read_cmds = {cmd.command for cmd in cmds if cmd.command_type == TYPE_READ}
    assert CMD_OUTPUT_RELAY_OFF_TIME in read_cmds


async def test_boot_state_and_relay_off_time_setters(monkeypatch):
    """async_set_output_boot_state and async_set_output_relay_off_time write correct vectors."""
    from plejd.const import CMD_OUTPUT_BOOT_STATE, CMD_OUTPUT_RELAY_OFF_TIME
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()

    await c.async_set_output_boot_state(9, 0, True)
    bs = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert bs.command == CMD_OUTPUT_BOOT_STATE and bs.data == bytes([0x00])

    await c.async_set_output_relay_off_time(9, 0, 2.0)
    rt = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert rt.command == CMD_OUTPUT_RELAY_OFF_TIME and rt.data == bytes([0x00, 0xC8, 0x00])

    settings = c.settings_for(9)
    assert settings.boot_state is True
    assert settings.relay_off_time == 2.0


async def test_relay_config_and_inrush_setters(monkeypatch):
    """async_set_output_relay_config and async_set_output_inrush_current write correct vectors."""
    from plejd.const import CMD_OUTPUT_INRUSH_CURRENT, CMD_OUTPUT_RELAY_CONFIG
    from plejd.protocol import decode_command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()

    await c.async_set_output_relay_config(9, 0, 1)  # one_pole
    rc = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert rc.command == CMD_OUTPUT_RELAY_CONFIG and rc.data == bytes([0x00, 0x01])

    await c.async_set_output_inrush_current(9, 0, 500)  # 500ms = 50 cs
    ic = decode_command(c._connection.mesh.decrypt(client.writes[-1][1]))
    assert ic.command == CMD_OUTPUT_INRUSH_CURRENT and ic.data == bytes([0x00, 50, 0x00])

    settings = c.settings_for(9)
    assert settings.relay_pole_config == 1
    assert settings.inrush_current_ms == 500


async def test_relay_config_hardware_read_during_connect(monkeypatch):
    """Devices in RELAY_CONFIG_HARDWARE get a relay-config READ issued during connect."""
    from plejd.const import CMD_OUTPUT_RELAY_CONFIG
    from plejd.protocol import TYPE_READ, decode_command

    relay_config_dev = {**_DEV, "hardware_id": 11, "model": "DIM-01-2P"}
    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    entry = types.SimpleNamespace(
        entry_id="e1",
        data={CONF_CRYPTO_KEY: _KEY_HEX, CONF_DEVICES: [relay_config_dev], CONF_DISCOVERED_ADDRESS: None},
    )
    c = PlejdCoordinator(hass, entry)
    await c.async_start()

    cmds = [decode_command(c._connection.mesh.decrypt(w[1])) for w in client.writes if w[0] == PLEJD_CHAR_DATA_UUID]
    read_cmds = {cmd.command for cmd in cmds if cmd.command_type == TYPE_READ}
    assert CMD_OUTPUT_RELAY_CONFIG in read_cmds


async def test_relay_config_short_reply_ignored(monkeypatch):
    """An empty relay config reply is silently dropped."""
    from plejd.const import CMD_OUTPUT_RELAY_CONFIG
    from plejd.protocol import Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    c._on_event(Command(5, 0x03, CMD_OUTPUT_RELAY_CONFIG, b""))
    assert c.settings_for(5) is None


async def test_inrush_current_short_reply_ignored(monkeypatch):
    """A too-short inrush current reply is silently dropped."""
    from plejd.const import CMD_OUTPUT_INRUSH_CURRENT
    from plejd.protocol import Command

    client = _FakeClient()
    _patch_connect(monkeypatch, client)
    ble = types.SimpleNamespace(address="01:02:03:04:05:a0")
    hass = _hass([_info("01:02:03:04:05:a0")], {"01:02:03:04:05:a0": ble})
    c = PlejdCoordinator(hass, _entry(discovered=None))
    await c.async_start()
    c._on_event(Command(5, 0x03, CMD_OUTPUT_INRUSH_CURRENT, bytes([50])))  # only 1 byte
    assert c.settings_for(5) is None


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
    entry = _entry(discovered=None)
    entry.data[CONF_DEVICE_ADDRESSES] = {"d1": 5}  # physical device address, cached at setup
    c = PlejdCoordinator(hass, entry)
    await c.async_start()  # sets up the poll and does an initial fault read
    reads = [decode_command(c._connection.mesh.decrypt(w[1])) for w in client.writes if w[0] == PLEJD_CHAR_DATA_UUID]
    notify = [r for r in reads if r.command == CMD_NOTIFY_EVENTS]
    assert notify and notify[0].command_type == TYPE_READ and notify[0].address == 5


async def test_poll_faults_best_effort_when_not_connected():
    c = PlejdCoordinator(_hass(), _entry())  # never connected -> _write_vector raises
    await c._async_poll_faults(None)  # swallowed, no exception propagates
    assert c.faults_for(5) == frozenset()


async def test_poll_faults_one_device_failure_does_not_skip_the_rest(monkeypatch):
    """A write failure for one device must not abort polling the remaining devices."""
    from homeassistant.exceptions import HomeAssistantError

    dev2 = {**_DEV, "device_id": "d2", "address": 6}
    entry = types.SimpleNamespace(
        entry_id="e1",
        data={
            CONF_CRYPTO_KEY: _KEY_HEX,
            CONF_DEVICES: [_DEV, dev2],
            CONF_DISCOVERED_ADDRESS: None,
            CONF_DEVICE_ADDRESSES: {"d1": 5, "d2": 6},
        },
    )
    c = PlejdCoordinator(_hass(), entry)
    attempted: list[int] = []

    async def _write_vector(vector):
        attempted.append(vector[0])
        if vector[0] == 5:
            raise HomeAssistantError("not connected")

    monkeypatch.setattr(c, "_write_vector", _write_vector)
    await c._async_poll_faults(None)
    assert sorted(attempted) == [5, 6]  # device 6 was still polled despite device 5 failing


def test_device_address_for_resolves_cached_physical_addresses():
    entry = types.SimpleNamespace(
        entry_id="e1",
        data={
            CONF_CRYPTO_KEY: _KEY_HEX,
            CONF_DEVICES: [_DEV],
            CONF_DISCOVERED_ADDRESS: None,
            CONF_DEVICE_ADDRESSES: {"d1": 5, "w1": 33},
        },
    )
    c = PlejdCoordinator(_hass(), entry)
    assert c.device_address_for("d1") == 5
    assert c.device_address_for("w1") == 33
    assert c.device_address_for("unknown") is None


async def test_poll_faults_resolves_addresses_from_cloud_when_not_cached(monkeypatch):
    """Entries added before CONF_DEVICE_ADDRESSES existed resolve it via one cloud fetch."""
    c = PlejdCoordinator(_hass(), _cloud_entry())  # has credentials, no cached device_addresses
    site = types.SimpleNamespace(device_addresses={"d1": 5, "w1": 33})

    async def _login(*a):
        return "tok"

    async def _get_site(*a):
        return site

    attempted: list[int] = []

    async def _write_vector(vector):
        attempted.append(vector[0])

    monkeypatch.setattr(coordinator_mod, "async_login", _login)
    monkeypatch.setattr(coordinator_mod, "async_get_site", _get_site)
    monkeypatch.setattr(c, "_write_vector", _write_vector)

    await c._async_poll_faults(None)
    assert sorted(attempted) == [5, 33]
    assert c._device_addresses == {"d1": 5, "w1": 33}  # cached — no repeat fetch on the next poll

    await c._async_poll_faults(None)
    assert sorted(attempted) == [5, 5, 33, 33]  # polled again, but from the cache


async def test_poll_faults_swallows_cloud_fetch_failure(monkeypatch):
    """A failed address-resolution fetch is best-effort: no crash, retried next interval."""
    c = PlejdCoordinator(_hass(), _cloud_entry())  # has credentials, no cached device_addresses

    async def _boom(*a):
        raise coordinator_mod.PlejdAuthError("bad creds")

    attempted: list[int] = []

    async def _write_vector(vector):
        attempted.append(vector[0])

    monkeypatch.setattr(coordinator_mod, "async_login", _boom)
    monkeypatch.setattr(c, "_write_vector", _write_vector)
    await c._async_poll_faults(None)  # no exception propagates
    assert attempted == [] and c._device_addresses == {}


async def test_poll_faults_without_credentials_or_cache_is_noop(monkeypatch):
    """No cached addresses and no credentials to fetch them -> nothing polled, no crash."""
    c = PlejdCoordinator(_hass(), _entry())  # no CONF_EMAIL/CONF_PASSWORD, no CONF_DEVICE_ADDRESSES

    async def _boom(*a):
        raise AssertionError("must not log in without credentials")

    attempted: list[int] = []

    async def _write_vector(vector):
        attempted.append(vector[0])

    monkeypatch.setattr(coordinator_mod, "async_login", _boom)
    monkeypatch.setattr(c, "_write_vector", _write_vector)
    await c._async_poll_faults(None)
    assert attempted == []
