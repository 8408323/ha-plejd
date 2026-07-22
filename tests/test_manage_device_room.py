"""Tests for async_move_device_to_room (the HA-facing move-device orchestration)."""

from __future__ import annotations

import types
from unittest.mock import AsyncMock, MagicMock

import pytest
from homeassistant.exceptions import HomeAssistantError
from plejd.cloud import (
    PlejdAuthError,
    PlejdCloudDevice,
    PlejdCloudError,
    PlejdCloudRoom,
    PlejdCloudRoomInfo,
    PlejdCloudSite,
)
from plejd.manage_device_room import async_move_device_to_room

_KEY = bytes(range(16))


def _device(device_id="d1", room_id="r1", address=39, outputs=None, dimmable=True) -> PlejdCloudDevice:
    return PlejdCloudDevice(
        device_id=device_id,
        name="Diskbank",
        address=address,
        output_index=0,
        outputs=outputs if outputs is not None else [address],
        hardware_id=1,
        model="DIM-02",
        category="light",
        dimmable=dimmable,
        traits=9,
        room_id=room_id,
    )


def _room(room_id, name, address) -> PlejdCloudRoomInfo:
    return PlejdCloudRoomInfo(room_id=room_id, name=name, has_devices=True, address=address)


def _site(devices=None, all_rooms=None, device_addresses=None, rooms=None) -> PlejdCloudSite:
    return PlejdCloudSite(
        site_id="S1",
        title="Home",
        crypto_key=_KEY,
        mesh_key="01-02-03-04",
        devices=devices or [],
        inputs=[],
        motion=[],
        scenes=[],
        gateways=[],
        resource_set_id=None,
        device_addresses=device_addresses or {},
        all_rooms=all_rooms or [],
        rooms=rooms or [],
    )


def _coordinator():
    return types.SimpleNamespace(
        async_leave_mesh_group=AsyncMock(),
        async_join_mesh_group=AsyncMock(),
    )


def _hass():
    return types.SimpleNamespace(
        data={},
        config_entries=types.SimpleNamespace(
            async_update_entry=lambda entry, data: setattr(entry, "data", data),
            async_reload=AsyncMock(),
        ),
    )


def _entry(data=None, runtime_data=None):
    return types.SimpleNamespace(
        entry_id="e1",
        data=data or {"email": "u@x.com", "password": "pw", "site_id": "S1"},
        runtime_data=runtime_data or _coordinator(),
        async_start_reauth=lambda hass: None,
    )


async def test_move_device_raises_if_device_not_found(monkeypatch):
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(return_value=_site()))
    with pytest.raises(HomeAssistantError, match="not found"):
        await async_move_device_to_room(_hass(), _entry(), device_id="missing", room_id="r2")


async def test_move_device_raises_on_login_failure(monkeypatch):
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(side_effect=PlejdCloudError("down")))
    with pytest.raises(HomeAssistantError, match="Plejd cloud error"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r2")


async def test_move_device_triggers_reauth_on_stale_credentials(monkeypatch):
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(side_effect=PlejdAuthError("bad creds")))
    hass = _hass()
    entry = _entry()
    entry.async_start_reauth = MagicMock()
    with pytest.raises(HomeAssistantError, match="reauthentication started"):
        await async_move_device_to_room(hass, entry, device_id="d1", room_id="r2")
    entry.async_start_reauth.assert_called_once_with(hass)


async def test_move_device_raises_on_get_site_failure(monkeypatch):
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=PlejdCloudError("down")))
    with pytest.raises(HomeAssistantError, match="Plejd cloud error"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r2")


async def test_move_device_raises_for_a_multi_output_device(monkeypatch):
    site = _site(
        devices=[_device(device_id="d1", room_id="r1"), _device(device_id="d1", room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(return_value=site))
    with pytest.raises(HomeAssistantError, match="multiple outputs"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r2")


async def test_move_device_raises_for_a_single_record_with_multiple_output_addresses(monkeypatch):
    # A single site.devices record can itself list every output address for the device
    # (PlejdCloudDevice.outputs, built from outputAddress) - the multi-output rejection
    # must catch this shape too, not just multiple separate records.
    site = _site(
        devices=[_device(device_id="d1", room_id="r1", outputs=[39, 40])],
        device_addresses={"d1": 39},
        all_rooms=[_room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(return_value=site))
    with pytest.raises(HomeAssistantError, match="multiple outputs"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r2")


async def test_move_device_raises_for_a_device_with_no_controllable_output(monkeypatch):
    # A real physical device (a motion sensor, an input-only device, a gateway) has an
    # entry in device_addresses but none in site.devices.
    site = _site(devices=[], device_addresses={"d1": 39})
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(return_value=site))
    with pytest.raises(HomeAssistantError, match="no controllable output"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r2")


async def test_move_device_raises_if_room_not_found(monkeypatch):
    site = _site(devices=[_device()], device_addresses={"d1": 39})
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(return_value=site))
    with pytest.raises(HomeAssistantError, match="not found"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="missing")


async def test_move_device_raises_if_destination_room_has_no_address(monkeypatch):
    site = _site(
        devices=[_device()],
        device_addresses={"d1": 39},
        all_rooms=[_room("r2", "Stora badrummet", address=None)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(return_value=site))
    with pytest.raises(HomeAssistantError, match="no mesh group address"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r2")


async def test_move_device_raises_if_already_in_destination_room(monkeypatch):
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(return_value=site))
    with pytest.raises(HomeAssistantError, match="already in room"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r1")


async def test_move_device_leaves_old_room_and_joins_new(monkeypatch):
    hass = _hass()
    coordinator = _coordinator()
    entry = _entry(runtime_data=coordinator)
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, site]))

    await async_move_device_to_room(hass, entry, device_id="d1", room_id="r2")

    coordinator.async_leave_mesh_group.assert_awaited_once_with(39, 14)
    coordinator.async_join_mesh_group.assert_awaited_once_with(39, 34)
    hass.config_entries.async_reload.assert_awaited_once_with("e1")
    moved = next(d for d in entry.data["devices"] if d["device_id"] == "d1")
    assert moved["room_id"] == "r2"


async def test_move_device_patches_room_membership_when_both_rooms_already_exist(monkeypatch):
    hass = _hass()
    entry = _entry()
    old_room = PlejdCloudRoom(
        room_id="r1", name="Kok", address=14, member_addresses=[39, 41], dimmable=True, dimmable_addresses=[39, 41]
    )
    new_room = PlejdCloudRoom(
        room_id="r2", name="Stora badrummet", address=34, member_addresses=[50], dimmable=True, dimmable_addresses=[50]
    )
    unrelated_room = PlejdCloudRoom(
        room_id="r3", name="Garage", address=17, member_addresses=[60], dimmable=True, dimmable_addresses=[60]
    )
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
        rooms=[old_room, new_room, unrelated_room],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, site]))

    await async_move_device_to_room(hass, entry, device_id="d1", room_id="r2")

    rooms_by_id = {r["room_id"]: r for r in entry.data["rooms"]}
    assert rooms_by_id["r1"]["member_addresses"] == [41]
    assert rooms_by_id["r1"]["dimmable_addresses"] == [41]
    assert rooms_by_id["r2"]["member_addresses"] == [39, 50]
    assert rooms_by_id["r2"]["dimmable_addresses"] == [39, 50]
    assert rooms_by_id["r3"]["member_addresses"] == [60]  # unrelated room passed through unchanged


async def test_move_device_does_not_synthesize_a_room_not_already_present(monkeypatch):
    # parse_site() can exclude a room from `rooms` for a real reason (no other light
    # member, or a non-light member sharing its group address) that this function has no
    # way to distinguish from "just empty" - it must never invent a new entry.
    hass = _hass()
    entry = _entry()
    old_room = PlejdCloudRoom(
        room_id="r1", name="Kok", address=14, member_addresses=[39], dimmable=True, dimmable_addresses=[39]
    )
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
        rooms=[old_room],  # r2 (the destination) has no light-group entity yet
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, site]))

    await async_move_device_to_room(hass, entry, device_id="d1", room_id="r2")

    room_ids = {r["room_id"] for r in entry.data["rooms"]}
    assert room_ids == {"r1"}  # unchanged count - no synthesized r2 entry
    assert entry.data["rooms"][0]["member_addresses"] == []  # 39 removed from r1, nowhere to add it


async def test_move_device_forces_local_room_id_when_cloud_has_not_converged(monkeypatch):
    # A BLE-only site (no gateway) has no path for the cloud to learn about a mesh-only
    # room change - simulate the refresh fetch still reporting the device's OLD room, and
    # confirm the persisted data is corrected to the intended destination regardless.
    hass = _hass()
    entry = _entry()
    initial_site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
    )
    stale_refresh_site = _site(
        devices=[_device(room_id="r1")],  # still "r1" - the cloud hasn't converged yet
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(
        "plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[initial_site, stale_refresh_site])
    )

    await async_move_device_to_room(hass, entry, device_id="d1", room_id="r2")

    moved = next(d for d in entry.data["devices"] if d["device_id"] == "d1")
    assert moved["room_id"] == "r2"


async def test_move_device_skips_leave_when_device_has_no_current_room(monkeypatch):
    hass = _hass()
    coordinator = _coordinator()
    entry = _entry(runtime_data=coordinator)
    site = _site(
        devices=[_device(room_id=None)],
        device_addresses={"d1": 39},
        all_rooms=[_room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, site]))

    await async_move_device_to_room(hass, entry, device_id="d1", room_id="r2")

    coordinator.async_leave_mesh_group.assert_not_awaited()
    coordinator.async_join_mesh_group.assert_awaited_once_with(39, 34)


async def test_move_device_skips_leave_when_old_room_has_no_address(monkeypatch):
    hass = _hass()
    coordinator = _coordinator()
    entry = _entry(runtime_data=coordinator)
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=None), _room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, site]))

    await async_move_device_to_room(hass, entry, device_id="d1", room_id="r2")

    coordinator.async_leave_mesh_group.assert_not_awaited()
    coordinator.async_join_mesh_group.assert_awaited_once_with(39, 34)


async def test_move_device_raises_on_cloud_error_during_refresh(monkeypatch):
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(
        "plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, PlejdCloudError("down")])
    )
    with pytest.raises(HomeAssistantError, match="Plejd cloud error refreshing site"):
        await async_move_device_to_room(_hass(), _entry(), device_id="d1", room_id="r2")


async def test_move_device_raises_when_reload_fails(monkeypatch):
    hass = _hass()
    hass.config_entries.async_reload = AsyncMock(return_value=False)
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, site]))

    with pytest.raises(HomeAssistantError, match="reloading the integration failed"):
        await async_move_device_to_room(hass, _entry(), device_id="d1", room_id="r2")


async def test_move_device_runs_a_follow_up_reload_for_a_concurrent_change(monkeypatch):
    from plejd import schedule_ws

    hass = _hass()
    site = _site(
        devices=[_device(room_id="r1")],
        device_addresses={"d1": 39},
        all_rooms=[_room("r1", "Kok", address=14), _room("r2", "Stora badrummet", address=34)],
    )
    monkeypatch.setattr("plejd.manage_device_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_device_room.async_get_site", AsyncMock(side_effect=[site, site]))

    calls: list[str] = []

    async def _reload_sets_pending(entry_id):
        calls.append(entry_id)
        if len(calls) == 1:  # only the first reload race-loses to the concurrent change
            hass.data[schedule_ws.DATA_RELOAD_PENDING] = entry_id
        return True

    hass.config_entries.async_reload = AsyncMock(side_effect=_reload_sets_pending)

    await async_move_device_to_room(hass, _entry(), device_id="d1", room_id="r2")

    assert hass.config_entries.async_reload.await_count == 2  # ours, then the follow-up
    assert schedule_ws.DATA_RELOAD_PENDING not in hass.data
