"""Tests for plejd integration setup/teardown."""

from __future__ import annotations

import types
from unittest.mock import AsyncMock

import plejd
import pytest
from plejd import (
    PLATFORMS,
    SERVICE_ADD_DEVICE,
    SERVICE_SCAN_DEVICES,
    async_setup_entry,
    async_unload_entry,
)


class _FakeCoordinator:
    instances: list = []

    def __init__(self, hass, entry):
        self.started = False
        self.shutdown = False
        _FakeCoordinator.instances.append(self)

    async def async_start(self):
        self.started = True

    async def async_shutdown(self):
        self.shutdown = True

    async def async_handle_device_registry_update(self, event):
        return None


class _FakeConfigEntries:
    unload_result = True

    async def async_forward_entry_setups(self, entry, platforms):
        self.forwarded = platforms

    async def async_unload_platforms(self, entry, platforms):
        return self.unload_result

    async def async_reload(self, entry_id):
        self.reloaded = entry_id

    def async_update_entry(self, entry, *, data=None, **kwargs):
        if data is not None:
            entry.data = data


class _FakeServices:
    def __init__(self):
        self._handlers: dict[str, object] = {}

    def async_register(self, domain, service, handler, schema=None):
        self._handlers[f"{domain}.{service}"] = handler

    def async_remove(self, domain, service):
        self._handlers.pop(f"{domain}.{service}", None)


class _FakeBus:
    def __init__(self):
        self.fired: list[tuple[str, dict]] = []
        self.listeners = []

    def async_fire(self, event_type: str, data: dict) -> None:
        self.fired.append((event_type, data))

    def async_listen(self, event, handler):
        self.listeners.append((event, handler))
        return lambda: None


async def _register_static_paths(configs):
    return None


def _hass():
    h = types.SimpleNamespace(config_entries=_FakeConfigEntries())
    h.services = _FakeServices()
    h.bus = _FakeBus()
    h.session = None
    h.ble_devices = {}
    h.service_infos = []
    h.http = types.SimpleNamespace(async_register_static_paths=_register_static_paths)
    h.data = {}
    return h


def _entry(data=None):
    return types.SimpleNamespace(
        entry_id="e1",
        data=data or {},
        options={},
        runtime_data=None,
        async_on_unload=lambda f: None,
        add_update_listener=lambda f: lambda: None,
    )


async def test_setup_starts_coordinator_and_forwards(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    assert await async_setup_entry(hass, entry) is True
    coord = entry.runtime_data
    assert coord.started is True
    assert hass.config_entries.forwarded == PLATFORMS


async def test_setup_registers_device_rename_listener(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    await async_setup_entry(hass, entry)
    events = [e for e, _ in hass.bus.listeners]
    assert "device_registry_updated" in events
    handler = next(h for e, h in hass.bus.listeners if e == "device_registry_updated")
    assert handler == entry.runtime_data.async_handle_device_registry_update


async def test_setup_shuts_down_when_forward_fails(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()

    async def _boom(entry, platforms):
        raise RuntimeError("platform setup failed")

    hass.config_entries.async_forward_entry_setups = _boom
    with pytest.raises(RuntimeError, match="platform setup failed"):
        await async_setup_entry(hass, entry)
    assert _FakeCoordinator.instances[-1].shutdown is True


async def test_unload_shuts_down_coordinator(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    entry = _entry()
    entry.runtime_data = _FakeCoordinator(None, entry)
    hass = _hass()
    assert await async_unload_entry(hass, entry) is True
    assert entry.runtime_data.shutdown is True


async def test_failed_unload_keeps_coordinator(monkeypatch):
    entry = _entry()
    entry.runtime_data = _FakeCoordinator(None, entry)
    hass = _hass()
    hass.config_entries.unload_result = False
    assert await async_unload_entry(hass, entry) is False
    assert entry.runtime_data.shutdown is False


async def test_reload_listener_reloads_entry():
    from plejd import _async_reload_entry

    hass, entry = _hass(), _entry()
    await _async_reload_entry(hass, entry)
    assert hass.config_entries.reloaded == "e1"


async def test_reload_listener_skips_when_schedule_ws_reloading_manually():
    from plejd import _async_reload_entry, schedule_ws

    hass, entry = _hass(), _entry()
    hass.data[schedule_ws.DATA_MANUAL_RELOAD] = entry.entry_id
    await _async_reload_entry(hass, entry)
    assert getattr(hass.config_entries, "reloaded", None) is None
    # The suppressed reload isn't just dropped: it's marked pending so the in-flight manual
    # reload runs a follow-up for it once done (issue #94 thread 2), rather than this
    # concurrent options change never taking effect.
    assert hass.data[schedule_ws.DATA_RELOAD_PENDING] == entry.entry_id


async def test_reload_listener_does_not_mark_pending_for_a_different_entry():
    from plejd import _async_reload_entry, schedule_ws

    hass, entry = _hass(), _entry()
    hass.data[schedule_ws.DATA_MANUAL_RELOAD] = "some-other-entry"
    await _async_reload_entry(hass, entry)
    assert hass.config_entries.reloaded == "e1"
    assert schedule_ws.DATA_RELOAD_PENDING not in hass.data


def test_every_platform_module_is_forwarded():
    # Guard against adding a platform file but forgetting to forward it.
    import pathlib

    cc = pathlib.Path(__file__).parent.parent / "custom_components" / "plejd"
    platform_files = {
        f.stem
        for f in cc.glob("*.py")
        if f.stem in {"light", "switch", "cover", "climate", "binary_sensor", "sensor", "event", "scene"}
    }
    forwarded = {p.value for p in PLATFORMS}
    assert platform_files <= forwarded, f"not forwarded: {platform_files - forwarded}"


# ── Service: add_device ───────────────────────────────────────────────────────
#
# async_add_device() itself (cloud calls, BLE validation, commissioning, error
# paths) is unit-tested in test_add_device.py, where it lives. These tests only
# cover that the service is registered and forwards call.data correctly.


async def test_add_device_service_is_registered_on_setup(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    await async_setup_entry(hass, entry)
    assert f"plejd.{SERVICE_ADD_DEVICE}" in hass.services._handlers


def test_input_setting_schema_requires_input_and_button_type():
    import voluptuous as vol

    with pytest.raises(vol.Invalid):
        plejd._INPUT_SETTING_SCHEMA({"button_type": "Toggle"})
    with pytest.raises(vol.Invalid):
        plejd._INPUT_SETTING_SCHEMA({"input": 0})
    assert plejd._INPUT_SETTING_SCHEMA({"input": 0, "button_type": "Toggle"}) == {
        "input": 0,
        "button_type": "Toggle",
    }


async def test_add_device_service_unregistered_on_unload(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    unloads: list = []
    entry.async_on_unload = unloads.append
    await async_setup_entry(hass, entry)
    assert f"plejd.{SERVICE_ADD_DEVICE}" in hass.services._handlers
    for unload in unloads:
        unload()
    assert f"plejd.{SERVICE_ADD_DEVICE}" not in hass.services._handlers


async def test_add_device_service_forwards_call_data(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()

    add_device = AsyncMock()
    monkeypatch.setattr(plejd, "async_add_device", add_device)

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]
    call = types.SimpleNamespace(
        data={
            "device_address": "AA:BB:CC:DD:EE:FF",
            "name": "Taklampa",
            "hardware_id": "1",
            "room_id": "r1",
            "room_title": "Sovrum",
            "firmware_build_time": 123,
            "input_settings": [{"input": 0, "button_type": "Toggle"}],
        }
    )
    await handler(call)

    add_device.assert_awaited_once_with(
        hass,
        entry,
        address="AA:BB:CC:DD:EE:FF",
        name="Taklampa",
        hardware_id="1",
        room_id="r1",
        room_title="Sovrum",
        firmware_build_time=123,
        input_settings=[{"input": 0, "button_type": "Toggle"}],
    )


async def test_add_device_service_forwards_defaults(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()

    add_device = AsyncMock()
    monkeypatch.setattr(plejd, "async_add_device", add_device)

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]
    call = types.SimpleNamespace(data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "X"})
    await handler(call)

    add_device.assert_awaited_once_with(
        hass,
        entry,
        address="AA:BB:CC:DD:EE:FF",
        name="X",
        hardware_id="0",
        room_id=None,
        room_title=None,
        firmware_build_time=0,
        input_settings=[],
    )


# ── Service: scan_new_devices ─────────────────────────────────────────────────


def _fake_service_info(address, service_uuids, mfr_data, rssi=-70, name=None):
    """Build a minimal BluetoothServiceInfoBleak stand-in for scanner tests."""
    from plejd.const import PLEJD_SERVICE_UUID

    return types.SimpleNamespace(
        address=address,
        name=name,
        rssi=rssi,
        service_uuids=service_uuids or [PLEJD_SERVICE_UUID],
        manufacturer_data=mfr_data,
    )


async def test_scan_service_is_registered_on_setup(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    await async_setup_entry(hass, entry)
    assert f"plejd.{SERVICE_SCAN_DEVICES}" in hass.services._handlers


async def test_scan_raises_when_bluetooth_unavailable(monkeypatch):
    from homeassistant.exceptions import HomeAssistantError

    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    hass.scanner_count = 0  # no local adapter, no ESPHome Bluetooth proxy
    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_SCAN_DEVICES}"]
    with pytest.raises(HomeAssistantError, match="Bluetooth is not available"):
        await handler(types.SimpleNamespace(data={}))


async def test_scan_finds_unprovisioned_on_default_mesh(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    # LoginByte 0x08 = IsOnDefaultMesh, hardware_id byte at offset 3 = 1 (DIM-01)
    hass.service_infos = [_fake_service_info("AA:BB:CC:DD:EE:FF", None, {887: bytes([0x08, 0, 0, 1])})]
    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_SCAN_DEVICES}"]
    await handler(types.SimpleNamespace(data={}))
    assert len(hass.bus.fired) == 1
    event_type, data = hass.bus.fired[0]
    assert event_type == "plejd_new_devices_found"
    devs = data["devices"]
    assert len(devs) == 1
    assert devs[0]["address"] == "AA:BB:CC:DD:EE:FF"
    assert devs[0]["hardware_id"] == "1"
    assert devs[0]["model"] == "DIM-01"


async def test_scan_finds_unclaimed_device(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    # LoginByte 0x00 = no flags set = unclaimed; hardware_id at offset 3 = 3 (CTR-01)
    hass.service_infos = [_fake_service_info("11:22:33:44:55:66", None, {887: bytes([0x00, 0, 0, 3])})]
    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_SCAN_DEVICES}"]
    await handler(types.SimpleNamespace(data={}))
    devs = hass.bus.fired[0][1]["devices"]
    assert devs[0]["model"] == "CTR-01"


async def test_scan_excludes_provisioned_device(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    # LoginByte 0x07 = all three provisioning bits set, not on default mesh → provisioned
    hass.service_infos = [_fake_service_info("AA:BB:CC:DD:EE:FF", None, {887: bytes([0x07, 0, 0, 1])})]
    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_SCAN_DEVICES}"]
    await handler(types.SimpleNamespace(data={}))
    devs = hass.bus.fired[0][1]["devices"]
    assert devs == []


async def test_scan_excludes_non_plejd_devices(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    # Different service UUID — not a Plejd device
    hass.service_infos = [
        _fake_service_info("AA:BB:CC:DD:EE:FF", ["0000180a-0000-1000-8000-00805f9b34fb"], {887: bytes([0x08, 0, 0, 1])})
    ]
    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_SCAN_DEVICES}"]
    await handler(types.SimpleNamespace(data={}))
    devs = hass.bus.fired[0][1]["devices"]
    assert devs == []


async def test_scan_fires_event_with_empty_list_when_no_devices(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    hass.service_infos = []
    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_SCAN_DEVICES}"]
    await handler(types.SimpleNamespace(data={}))
    assert hass.bus.fired[0] == ("plejd_new_devices_found", {"devices": []})


# ── Dashboard panel ───────────────────────────────────────────────────────────


async def test_setup_registers_panel_by_default(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    calls = []

    async def _reg(hass):
        calls.append(hass)

    monkeypatch.setattr(plejd.panel, "async_register_panel", _reg)
    hass, entry = _hass(), _entry()
    await async_setup_entry(hass, entry)
    assert calls == [hass]  # dashboard registered by default


async def test_setup_skips_panel_when_disabled(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    calls = []

    async def _reg(hass):
        calls.append(hass)

    monkeypatch.setattr(plejd.panel, "async_register_panel", _reg)
    hass, entry = _hass(), _entry()
    entry.options = {"show_panel": False}
    await async_setup_entry(hass, entry)
    assert calls == []  # hidden → not registered


async def test_unload_removes_panel(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    monkeypatch.setattr(plejd.panel, "async_register_panel", _noop_async)
    removed = []
    monkeypatch.setattr(plejd.panel, "async_unregister_panel", lambda hass: removed.append(hass))
    hass, entry = _hass(), _entry()
    unloads: list = []
    entry.async_on_unload = unloads.append
    await async_setup_entry(hass, entry)
    for unload in unloads:
        unload()
    assert removed == [hass]  # sidebar entry removed on unload/reload


async def _noop_async(hass):
    return None


async def test_setup_survives_panel_registration_failure(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    async def _boom(hass):
        raise ValueError("panel url path already taken")

    monkeypatch.setattr(plejd.panel, "async_register_panel", _boom)
    hass, entry = _hass(), _entry()
    # A url-path clash must NOT abort setup — the mesh/lights still load.
    assert await async_setup_entry(hass, entry) is True
    assert entry.runtime_data.started is True


# ── Dim bindings wiring ───────────────────────────────────────────────────────


async def test_setup_loads_bindings_and_registers_ws(monkeypatch):
    from plejd.dim_binding_ws import DATA_BINDINGS

    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    await async_setup_entry(hass, entry)
    assert DATA_BINDINGS in hass.data  # bindings manager available for the WS API
    assert "ws_commands" in hass.data  # WS commands registered


async def test_unload_cleans_up_bindings(monkeypatch):
    from plejd.dim_binding_ws import DATA_BINDINGS

    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    unloads: list = []
    entry.async_on_unload = unloads.append
    await async_setup_entry(hass, entry)
    assert DATA_BINDINGS in hass.data
    for unload in unloads:
        unload()
    assert DATA_BINDINGS not in hass.data


# ── Schedules wiring ─────────────────────────────────────────────────────────


async def test_setup_stores_entry_and_registers_schedule_ws(monkeypatch):
    from plejd.schedule_ws import DATA_ENTRY, ws_add, ws_delete, ws_list

    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    await async_setup_entry(hass, entry)
    assert hass.data[DATA_ENTRY] is entry  # entry available for the schedule WS API
    registered = hass.data["ws_commands"]
    assert ws_list in registered and ws_add in registered and ws_delete in registered


async def test_unload_cleans_up_schedule_entry(monkeypatch):
    from plejd.schedule_ws import DATA_ENTRY

    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    unloads: list = []
    entry.async_on_unload = unloads.append
    await async_setup_entry(hass, entry)
    assert DATA_ENTRY in hass.data
    for unload in unloads:
        unload()
    assert DATA_ENTRY not in hass.data


async def test_setup_survives_binding_load_failure(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    class _BadBindings:
        def __init__(self, hass):
            pass

        async def async_load(self):
            raise ValueError("corrupt store")

        def shutdown(self):
            return None

    monkeypatch.setattr(plejd, "PlejdDimBindings", _BadBindings)
    hass, entry = _hass(), _entry()
    assert await async_setup_entry(hass, entry) is True  # storage error must not abort setup
