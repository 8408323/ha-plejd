"""Tests for async_add_device (the HA-facing add-a-device orchestration)."""

from __future__ import annotations

import types
from unittest.mock import AsyncMock, MagicMock

import pytest
from bleak.backends.device import BLEDevice
from homeassistant.exceptions import HomeAssistantError
from plejd.add_device import async_add_device
from plejd.cloud import NewDeviceAddresses, PlejdCloudError, PlejdCloudSite

_KEY = bytes(range(16))
_ADDR = "AA:BB:CC:DD:EE:FF"


def _device(address: str = _ADDR) -> BLEDevice:
    d = MagicMock(spec=BLEDevice)
    d.address = address
    return d


def _site(mesh_key: str = "01-02-03-04") -> PlejdCloudSite:
    return PlejdCloudSite(
        site_id="S1",
        title="Home",
        crypto_key=_KEY,
        mesh_key=mesh_key,
        devices=[],
        inputs=[],
        motion=[],
        scenes=[],
        gateways=[],
        resource_set_id=None,
    )


def _hass(service_infos=None, ble_devices=None):
    # Default to a valid unprovisioned advertisement for _ADDR, matching what the
    # options-flow wizard would already have filtered for - tests that care about
    # rejecting a non-unprovisioned address pass their own service_infos instead.
    if service_infos is None:
        service_infos = [_fake_service_info(_ADDR, {887: bytes([0x08, 0, 0, 1])})]
    return types.SimpleNamespace(
        service_infos=list(service_infos),
        ble_devices=ble_devices or {},
        config_entries=types.SimpleNamespace(
            async_update_entry=lambda entry, data: setattr(entry, "data", data),
            async_reload=AsyncMock(),
        ),
    )


def _entry(data=None):
    return types.SimpleNamespace(entry_id="e1", data=data or {"email": "u@x.com", "password": "pw", "site_id": "S1"})


def _fake_service_info(address, mfr_data, service_uuids=None, rssi=-70, name=None):
    from plejd.const import PLEJD_SERVICE_UUID

    return types.SimpleNamespace(
        address=address,
        name=name,
        rssi=rssi,
        service_uuids=service_uuids or [PLEJD_SERVICE_UUID],
        manufacturer_data=mfr_data,
    )


async def test_add_device_raises_if_not_in_range():
    hass = _hass()  # ble_devices is empty -> device not found
    with pytest.raises(HomeAssistantError, match="not found"):
        await async_add_device(hass, _entry(), address=_ADDR, name="X")


async def test_add_device_raises_when_bluetooth_unavailable():
    hass = _hass(ble_devices={_ADDR: _device()})
    hass.scanner_count = 0  # no local adapter, no ESPHome Bluetooth proxy
    with pytest.raises(HomeAssistantError, match="Bluetooth is not available"):
        await async_add_device(hass, _entry(), address=_ADDR, name="X")


async def test_add_device_raises_if_not_advertising_unprovisioned():
    # No advertisement at all for this address (e.g. called directly via a service
    # call/automation, bypassing the wizard's own unprovisioned-only filtering).
    hass = _hass(service_infos=[], ble_devices={_ADDR: _device()})
    with pytest.raises(HomeAssistantError, match="not currently advertising as unprovisioned"):
        await async_add_device(hass, _entry(), address=_ADDR, name="X")


async def test_add_device_raises_if_already_provisioned():
    # login_byte 0x07 = has access address + node index + crypto key, no default-mesh bit -> provisioned.
    adv = _fake_service_info(_ADDR, {887: bytes([0x07, 0, 0, 1])})
    hass = _hass(service_infos=[adv], ble_devices={_ADDR: _device()})
    with pytest.raises(HomeAssistantError, match="not currently advertising as unprovisioned"):
        await async_add_device(hass, _entry(), address=_ADDR, name="X")


async def test_add_device_raises_on_cloud_error(monkeypatch):
    hass = _hass(ble_devices={_ADDR: _device()})
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(side_effect=PlejdCloudError("down")))
    with pytest.raises(HomeAssistantError, match="cloud error"):
        await async_add_device(hass, _entry(), address=_ADDR, name="X")


async def test_add_device_wraps_commission_error(monkeypatch):
    hass = _hass(ble_devices={_ADDR: _device()})
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.add_device.async_get_site", AsyncMock(return_value=_site()))
    monkeypatch.setattr("plejd.add_device.async_commission_device", AsyncMock(side_effect=RuntimeError("BLE failed")))
    with pytest.raises(HomeAssistantError, match="commissioning failed"):
        await async_add_device(hass, _entry(), address=_ADDR, name="X")


async def test_add_device_commissions_and_reloads(monkeypatch):
    hass = _hass(ble_devices={_ADDR: _device()})
    entry = _entry()
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.add_device.async_get_site", AsyncMock(return_value=_site()))
    commissioned: list = []

    async def _fake_commission(
        http_session, token, site, ble_device, name, hw="0", fw=0, room_id=None, room_title=None
    ):
        commissioned.append({"name": name, "hw": hw, "room_id": room_id})
        return NewDeviceAddresses(device_address=5, output_addresses={0: 50})

    monkeypatch.setattr("plejd.add_device.async_commission_device", _fake_commission)

    await async_add_device(hass, entry, address=_ADDR, name="Bedroom", hardware_id="1", room_id="r1")

    assert commissioned[0] == {"name": "Bedroom", "hw": "1", "room_id": "r1"}
    hass.config_entries.async_reload.assert_awaited_once_with("e1")


async def test_add_device_refreshes_gateway_metadata(monkeypatch):
    hass = _hass(ble_devices={_ADDR: _device()})
    entry = _entry()
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    fresh_site = PlejdCloudSite(
        site_id="S1",
        title="Home",
        crypto_key=_KEY,
        mesh_key="01-02-03-04",
        devices=[],
        inputs=[],
        motion=[],
        scenes=[],
        gateways=["gw-new"],
        resource_set_id="rs-new",
        device_addresses={"new-device": 5},
    )
    monkeypatch.setattr("plejd.add_device.async_get_site", AsyncMock(return_value=fresh_site))
    monkeypatch.setattr(
        "plejd.add_device.async_commission_device",
        AsyncMock(return_value=NewDeviceAddresses(device_address=5, output_addresses={})),
    )

    await async_add_device(hass, entry, address=_ADDR, name="X")

    assert entry.data["gateways"] == ["gw-new"]
    assert entry.data["resource_set_id"] == "rs-new"
    # the newly-added device's physical address must be present for fault polling/sensors
    assert entry.data["device_addresses"] == {"new-device": 5}


async def test_add_device_passes_room_title_through_to_commission(monkeypatch):
    # Room creation itself now happens inside async_commission_device, after its
    # own mesh_key/compatibility preflight - add_device just forwards room_title.
    hass = _hass(ble_devices={_ADDR: _device()})
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.add_device.async_get_site", AsyncMock(return_value=_site()))
    commission_mock = AsyncMock(return_value=NewDeviceAddresses(device_address=5, output_addresses={}))
    monkeypatch.setattr("plejd.add_device.async_commission_device", commission_mock)
    monkeypatch.setattr("plejd.add_device.async_set_input_setting", AsyncMock())

    await async_add_device(hass, _entry(), address=_ADDR, name="Taklampa", room_title="Bibliotek")

    assert commission_mock.call_args[0][8] == "Bibliotek"


async def test_add_device_applies_input_settings(monkeypatch):
    hass = _hass(ble_devices={_ADDR: _device()})
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.add_device.async_get_site", AsyncMock(return_value=_site()))
    monkeypatch.setattr(
        "plejd.add_device.async_commission_device",
        AsyncMock(return_value=NewDeviceAddresses(device_address=5, output_addresses={})),
    )
    set_input = AsyncMock()
    monkeypatch.setattr("plejd.add_device.async_set_input_setting", set_input)

    await async_add_device(
        hass,
        _entry(),
        address=_ADDR,
        name="Taklampa",
        input_settings=[{"input": 0, "button_type": "Toggle"}],
    )

    set_input.assert_awaited_once()
    args = set_input.call_args[0]
    assert args[3] == "aabbccddeeff"  # device_id derived from address
    assert args[4] == 0  # input_index
    assert args[5] == "Toggle"  # button_type


async def test_add_device_rejects_malformed_input_settings_before_commissioning():
    # Missing "input"/"button_type" must fail fast, before the device ever joins
    # the mesh - not surface as a raw KeyError once commissioning is underway.
    hass = _hass(ble_devices={_ADDR: _device()})
    with pytest.raises(HomeAssistantError, match="Invalid input_settings entry"):
        await async_add_device(
            hass, _entry(), address=_ADDR, name="Taklampa", input_settings=[{"button_type": "Toggle"}]
        )


async def test_add_device_refreshes_and_reloads_despite_input_setting_failure(monkeypatch):
    # The device already joined the mesh by this point - a failed (optional) input
    # setting must not skip the refresh/reload, or HA never learns about it.
    hass = _hass(ble_devices={_ADDR: _device()})
    entry = _entry()
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.add_device.async_get_site", AsyncMock(return_value=_site()))
    monkeypatch.setattr(
        "plejd.add_device.async_commission_device",
        AsyncMock(return_value=NewDeviceAddresses(device_address=5, output_addresses={})),
    )
    monkeypatch.setattr(
        "plejd.add_device.async_set_input_setting", AsyncMock(side_effect=RuntimeError("invalid button type"))
    )

    with pytest.raises(HomeAssistantError, match="input settings failed"):
        await async_add_device(
            hass,
            entry,
            address=_ADDR,
            name="Taklampa",
            input_settings=[{"input": 0, "button_type": "Bogus"}],
        )

    hass.config_entries.async_reload.assert_awaited_once_with("e1")


async def test_add_device_auto_extracts_hw_and_build_time_from_advertisement(monkeypatch):
    # 17-byte mfr data: unprovisioned, hw=22, 6-byte build time 20240701133622
    bt = (20240701133622).to_bytes(6, "big")
    mfr = bytes([0x08, 0, 0, 22]) + bytes(6) + bt + bytes([0x07])
    hass = _hass(service_infos=[_fake_service_info(_ADDR, {887: mfr})], ble_devices={_ADDR: _device()})
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.add_device.async_get_site", AsyncMock(return_value=_site()))

    commissioned = []

    async def _fake_commission(
        http_session, token, site, ble_device, name, hw="0", fw=0, room_id=None, room_title=None
    ):
        commissioned.append({"hw": hw, "fw": fw})
        return NewDeviceAddresses(device_address=5, output_addresses={})

    monkeypatch.setattr("plejd.add_device.async_commission_device", _fake_commission)

    # Neither hardware_id nor firmware_build_time provided -> both auto-extracted.
    await async_add_device(hass, _entry(), address=_ADDR, name="X")

    assert commissioned[0]["hw"] == "22"
    assert commissioned[0]["fw"] == 20240701133622


async def test_add_device_raises_on_device_list_refresh_error(monkeypatch):
    hass = _hass(ble_devices={_ADDR: _device()})
    monkeypatch.setattr("plejd.add_device.async_login", AsyncMock(return_value="tok"))
    # First call succeeds (site setup), second call fails (device list refresh).
    monkeypatch.setattr(
        "plejd.add_device.async_get_site",
        AsyncMock(side_effect=[_site(), PlejdCloudError("network error")]),
    )
    monkeypatch.setattr(
        "plejd.add_device.async_commission_device",
        AsyncMock(return_value=NewDeviceAddresses(device_address=5, output_addresses={})),
    )

    with pytest.raises(HomeAssistantError, match="refreshing"):
        await async_add_device(hass, _entry(), address=_ADDR, name="X", hardware_id="1")
