"""Tests for plejd integration setup/teardown."""

from __future__ import annotations

import types
from unittest.mock import AsyncMock, MagicMock

import plejd
import pytest
from plejd import PLATFORMS, SERVICE_ADD_DEVICE, SERVICE_SCAN_DEVICES, async_setup_entry, async_unload_entry
from plejd.cloud import PlejdCloudError, PlejdCloudSite


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
        key = f"{domain}.{service}"
        self._handlers[key] = handler
        return lambda: self._handlers.pop(key, None)


class _FakeBus:
    def __init__(self):
        self.fired: list[tuple[str, dict]] = []
        self.listeners = []

    def async_fire(self, event_type: str, data: dict) -> None:
        self.fired.append((event_type, data))

    def async_listen(self, event, handler):
        self.listeners.append((event, handler))
        return lambda: None


def _hass():
    h = types.SimpleNamespace(config_entries=_FakeConfigEntries())
    h.services = _FakeServices()
    h.bus = _FakeBus()
    h.session = None
    h.ble_devices = {}
    h.service_infos = []
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


def _site() -> PlejdCloudSite:
    return PlejdCloudSite(
        site_id="S1",
        title="Home",
        crypto_key=bytes(16),
        mesh_key="AA-BB-CC-DD",
        devices=[],
        inputs=[],
        motion=[],
        scenes=[],
        gateways=[],
        resource_set_id=None,
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


async def test_add_device_service_is_registered_on_setup(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    await async_setup_entry(hass, entry)
    assert f"plejd.{SERVICE_ADD_DEVICE}" in hass.services._handlers


async def test_add_device_service_handler_commissions_and_reloads(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    ble_dev = MagicMock()
    hass = _hass()
    hass.ble_devices = {"AA:BB:CC:DD:EE:FF": ble_dev}
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    monkeypatch.setattr(plejd, "async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(plejd, "async_get_site", AsyncMock(return_value=_site()))
    commissioned: list = []

    async def _fake_commission(http_session, token, site, ble_device, name, hw="0", fw=0, room_id=None):
        commissioned.append({"name": name, "hw": hw, "room_id": room_id})
        from plejd.cloud import NewDeviceAddresses

        return NewDeviceAddresses(device_address=5, output_addresses={0: 50})

    monkeypatch.setattr(plejd, "async_commission_device", _fake_commission)

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]

    call = types.SimpleNamespace(
        data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "Bedroom", "hardware_id": "1", "room_id": "r1"}
    )
    await handler(call)

    assert commissioned[0] == {"name": "Bedroom", "hw": "1", "room_id": "r1"}
    assert hass.config_entries.reloaded == "e1"


async def test_add_device_service_raises_if_device_not_in_range(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    hass = _hass()  # ble_devices is empty → device not found
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    monkeypatch.setattr(plejd, "async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(plejd, "async_get_site", AsyncMock(return_value=_site()))

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]

    from homeassistant.exceptions import HomeAssistantError

    call = types.SimpleNamespace(data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "X"})
    with pytest.raises(HomeAssistantError, match="not found"):
        await handler(call)


async def test_add_device_service_raises_on_cloud_error(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    hass = _hass()
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    monkeypatch.setattr(plejd, "async_login", AsyncMock(side_effect=PlejdCloudError("down")))

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]

    from homeassistant.exceptions import HomeAssistantError

    call = types.SimpleNamespace(data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "X"})
    with pytest.raises(HomeAssistantError, match="cloud error"):
        await handler(call)


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


async def test_scan_finds_unprovisioned_on_default_mesh(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    # LoginByte 0x08 = IsOnDefaultMesh, hardware_id byte at offset 3 = 1 (DIM-01)
    hass.service_infos = [_fake_service_info("AA:BB:CC:DD:EE:FF", None, {0x02E5: bytes([0x08, 0, 0, 1])})]
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
    hass.service_infos = [_fake_service_info("11:22:33:44:55:66", None, {0x02E5: bytes([0x00, 0, 0, 3])})]
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
    hass.service_infos = [_fake_service_info("AA:BB:CC:DD:EE:FF", None, {0x02E5: bytes([0x07, 0, 0, 1])})]
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
        _fake_service_info(
            "AA:BB:CC:DD:EE:FF", ["0000180a-0000-1000-8000-00805f9b34fb"], {0x02E5: bytes([0x08, 0, 0, 1])}
        )
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


# ── Helper: _parse_plejd_mfr_data ────────────────────────────────────────────


def test_parse_mfr_data_on_default_mesh():
    from plejd import _parse_plejd_mfr_data

    result = _parse_plejd_mfr_data({0x02E5: bytes([0x08, 0, 0, 2])})
    assert result == {"hardware_id": 2, "is_unprovisioned": True, "firmware_build_time": 0}


def test_parse_mfr_data_provisioned():
    from plejd import _parse_plejd_mfr_data

    result = _parse_plejd_mfr_data({0x02E5: bytes([0x07, 0, 0, 1])})
    assert result == {"hardware_id": 1, "is_unprovisioned": False, "firmware_build_time": 0}


def test_parse_mfr_data_includes_build_time():
    from plejd import _parse_plejd_mfr_data

    # 17 bytes: LoginByte + pad[2] + hw_id + mac[6] + buildTime[6 BE] + extra
    bt = (20240701133622).to_bytes(6, "big")
    data = bytes([0x08, 0, 0, 22]) + bytes(6) + bt + bytes([0x07])
    result = _parse_plejd_mfr_data({0x02E5: data})
    assert result is not None
    assert result["hardware_id"] == 22
    assert result["firmware_build_time"] == 20240701133622


def test_parse_mfr_data_empty_dict_returns_none():
    from plejd import _parse_plejd_mfr_data

    assert _parse_plejd_mfr_data({}) is None


def test_parse_mfr_data_too_short_returns_none():
    from plejd import _parse_plejd_mfr_data

    assert _parse_plejd_mfr_data({0x02E5: bytes([0x08, 0, 0])}) is None


# ── Service: add_device (error paths) ────────────────────────────────────────


async def test_add_device_service_wraps_commission_error(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    ble_dev = MagicMock()
    hass = _hass()
    hass.ble_devices = {"AA:BB:CC:DD:EE:FF": ble_dev}
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    monkeypatch.setattr(plejd, "async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(plejd, "async_get_site", AsyncMock(return_value=_site()))
    monkeypatch.setattr(plejd, "async_commission_device", AsyncMock(side_effect=RuntimeError("BLE failed")))

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]

    from homeassistant.exceptions import HomeAssistantError

    call = types.SimpleNamespace(data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "X"})
    with pytest.raises(HomeAssistantError, match="commissioning failed"):
        await handler(call)


async def test_add_device_creates_room_from_room_title(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    ble_dev = MagicMock()
    hass = _hass()
    hass.ble_devices = {"AA:BB:CC:DD:EE:FF": ble_dev}
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    monkeypatch.setattr(plejd, "async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(plejd, "async_get_site", AsyncMock(return_value=_site()))
    monkeypatch.setattr(plejd, "async_create_room", AsyncMock(return_value="room-uuid-1"))
    monkeypatch.setattr(plejd, "async_commission_device", AsyncMock())
    monkeypatch.setattr(plejd, "async_set_input_setting", AsyncMock())

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]
    call = types.SimpleNamespace(
        data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "Taklampa", "room_title": "Bibliotek"}
    )
    await handler(call)

    plejd.async_create_room.assert_awaited_once()
    _, kwargs = plejd.async_commission_device.call_args
    assert kwargs.get("room_id") == "room-uuid-1" or plejd.async_commission_device.call_args[0][7] == "room-uuid-1"


async def test_add_device_applies_input_settings(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    ble_dev = MagicMock()
    hass = _hass()
    hass.ble_devices = {"AA:BB:CC:DD:EE:FF": ble_dev}
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    monkeypatch.setattr(plejd, "async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(plejd, "async_get_site", AsyncMock(return_value=_site()))
    monkeypatch.setattr(plejd, "async_create_room", AsyncMock(return_value="r1"))
    monkeypatch.setattr(plejd, "async_commission_device", AsyncMock())
    set_input = AsyncMock()
    monkeypatch.setattr(plejd, "async_set_input_setting", set_input)

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]
    call = types.SimpleNamespace(
        data={
            "device_address": "AA:BB:CC:DD:EE:FF",
            "name": "Taklampa",
            "input_settings": [{"input": 0, "button_type": "Toggle"}],
        }
    )
    await handler(call)

    set_input.assert_awaited_once()
    args = set_input.call_args[0]
    assert args[3] == "aabbccddeeff"  # device_id derived from address
    assert args[4] == 0  # input_index
    assert args[5] == "Toggle"  # button_type


async def test_add_device_auto_extracts_hw_and_build_time_from_advertisement(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    ble_dev = MagicMock()
    hass = _hass()
    hass.ble_devices = {"AA:BB:CC:DD:EE:FF": ble_dev}
    # 17-byte mfr data: unprovisioned, hw=22, 6-byte build time 20240701133622
    bt = (20240701133622).to_bytes(6, "big")
    mfr = bytes([0x08, 0, 0, 22]) + bytes(6) + bt + bytes([0x07])
    hass.service_infos = [_fake_service_info("AA:BB:CC:DD:EE:FF", None, {0x02E5: mfr})]
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    monkeypatch.setattr(plejd, "async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(plejd, "async_get_site", AsyncMock(return_value=_site()))

    commissioned = []

    async def _fake_commission(http_session, token, site, ble_device, name, hw="0", fw=0, room_id=None):
        commissioned.append({"hw": hw, "fw": fw})

    monkeypatch.setattr(plejd, "async_commission_device", _fake_commission)

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]
    # Neither hardware_id nor firmware_build_time provided — both should be auto-extracted.
    call = types.SimpleNamespace(data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "X"})
    await handler(call)

    assert commissioned[0]["hw"] == "22"
    assert commissioned[0]["fw"] == 20240701133622


async def test_add_device_raises_on_device_list_refresh_error(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()

    ble_dev = MagicMock()
    hass = _hass()
    hass.ble_devices = {"AA:BB:CC:DD:EE:FF": ble_dev}
    entry_data = {"email": "u@x.com", "password": "pw", "site_id": "S1"}
    entry = _entry(data=entry_data)

    # First call succeeds (site setup), second call fails (device list refresh).
    monkeypatch.setattr(plejd, "async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(
        plejd,
        "async_get_site",
        AsyncMock(side_effect=[_site(), PlejdCloudError("network error")]),
    )
    monkeypatch.setattr(plejd, "async_commission_device", AsyncMock())

    await async_setup_entry(hass, entry)
    handler = hass.services._handlers[f"plejd.{SERVICE_ADD_DEVICE}"]

    from homeassistant.exceptions import HomeAssistantError

    call = types.SimpleNamespace(data={"device_address": "AA:BB:CC:DD:EE:FF", "name": "X", "hardware_id": "1"})
    with pytest.raises(HomeAssistantError, match="refreshing"):
        await handler(call)
