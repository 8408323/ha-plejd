"""Tests for async_update_room / async_remove_room (the HA-facing room-management orchestration)."""

from __future__ import annotations

import types
from unittest.mock import AsyncMock

import pytest
from homeassistant.exceptions import ConfigEntryAuthFailed, HomeAssistantError
from plejd.cloud import PlejdAuthError, PlejdCloudError, PlejdCloudRoomInfo, PlejdCloudSite
from plejd.manage_room import async_remove_room, async_update_room

_KEY = bytes(range(16))


def _room(room_id="r1", name="Vardagsrum", has_devices=False) -> PlejdCloudRoomInfo:
    return PlejdCloudRoomInfo(room_id=room_id, name=name, has_devices=has_devices)


def _site(all_rooms=None) -> PlejdCloudSite:
    return PlejdCloudSite(
        site_id="S1",
        title="Home",
        crypto_key=_KEY,
        mesh_key="01-02-03-04",
        devices=[],
        inputs=[],
        motion=[],
        scenes=[],
        gateways=[],
        resource_set_id=None,
        all_rooms=all_rooms or [],
    )


def _hass():
    return types.SimpleNamespace(
        config_entries=types.SimpleNamespace(
            async_update_entry=lambda entry, data: setattr(entry, "data", data),
            async_reload=AsyncMock(),
        ),
    )


def _entry(data=None):
    return types.SimpleNamespace(entry_id="e1", data=data or {"email": "u@x.com", "password": "pw", "site_id": "S1"})


async def test_update_room_raises_with_no_fields(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([_room()])))
    with pytest.raises(HomeAssistantError, match="at least one of"):
        await async_update_room(_hass(), _entry(), room_id="r1")


async def test_update_room_rejects_invalid_category(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([_room()])))
    with pytest.raises(HomeAssistantError, match="Invalid room category"):
        await async_update_room(_hass(), _entry(), room_id="r1", category="NotARealCategory")


async def test_update_room_raises_if_room_not_found(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([])))
    with pytest.raises(HomeAssistantError, match="not found"):
        await async_update_room(_hass(), _entry(), room_id="missing", title="X")


async def test_update_room_raises_on_login_failure(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(side_effect=PlejdCloudError("down")))
    with pytest.raises(HomeAssistantError, match="Plejd cloud error"):
        await async_update_room(_hass(), _entry(), room_id="r1", title="X")


async def test_update_room_raises_on_get_site_failure(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(side_effect=PlejdCloudError("down")))
    with pytest.raises(HomeAssistantError, match="Plejd cloud error"):
        await async_update_room(_hass(), _entry(), room_id="r1", title="X")


async def test_update_room_triggers_reauth_on_stale_credentials(monkeypatch):
    # A rejected password must start HA's reauth flow, not just fail the service call
    # forever (#114 review) - mirrors coordinator.py's own PlejdAuthError handling.
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(side_effect=PlejdAuthError("bad creds")))
    with pytest.raises(ConfigEntryAuthFailed):
        await async_update_room(_hass(), _entry(), room_id="r1", title="X")


async def test_update_room_raises_when_cloud_rejects_update(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([_room()])))
    monkeypatch.setattr("plejd.manage_room.async_cloud_update_room", AsyncMock(return_value=False))
    with pytest.raises(HomeAssistantError, match="rejected"):
        await async_update_room(_hass(), _entry(), room_id="r1", title="X")


async def test_update_room_forwards_fields_and_reloads(monkeypatch):
    hass = _hass()
    entry = _entry()
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(
        "plejd.manage_room.async_get_site",
        AsyncMock(side_effect=[_site([_room()]), _site([_room(name="Kök")])]),
    )
    update_mock = AsyncMock(return_value=True)
    monkeypatch.setattr("plejd.manage_room.async_cloud_update_room", update_mock)

    await async_update_room(hass, entry, room_id="r1", title="Kök", order=1, category="Kitchen")

    update_mock.assert_awaited_once_with(None, "tok", "S1", "r1", title="Kök", order=1, category="Kitchen")
    assert entry.data["rooms"] == []  # refreshed from fresh_site.rooms (unrelated light-grouping list)
    hass.config_entries.async_reload.assert_awaited_once_with("e1")


async def test_update_room_raises_on_cloud_error_during_update(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([_room()])))
    monkeypatch.setattr("plejd.manage_room.async_cloud_update_room", AsyncMock(side_effect=PlejdCloudError("down")))
    with pytest.raises(HomeAssistantError, match="Plejd cloud error updating room"):
        await async_update_room(_hass(), _entry(), room_id="r1", title="X")


async def test_update_room_raises_on_cloud_error_during_refresh(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(
        "plejd.manage_room.async_get_site",
        AsyncMock(side_effect=[_site([_room()]), PlejdCloudError("down")]),
    )
    monkeypatch.setattr("plejd.manage_room.async_cloud_update_room", AsyncMock(return_value=True))
    with pytest.raises(HomeAssistantError, match="Plejd cloud error refreshing site"):
        await async_update_room(_hass(), _entry(), room_id="r1", title="X")


async def test_remove_room_raises_if_room_not_found(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([])))
    with pytest.raises(HomeAssistantError, match="not found"):
        await async_remove_room(_hass(), _entry(), room_id="missing")


async def test_remove_room_refuses_when_room_has_devices(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([_room(has_devices=True)])))
    remove_mock = AsyncMock()
    monkeypatch.setattr("plejd.manage_room.async_cloud_remove_room", remove_mock)
    with pytest.raises(HomeAssistantError, match="still has devices"):
        await async_remove_room(_hass(), _entry(), room_id="r1")
    remove_mock.assert_not_awaited()  # must not even attempt the cloud call


async def test_remove_room_raises_on_cloud_error_during_removal(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([_room()])))
    monkeypatch.setattr("plejd.manage_room.async_cloud_remove_room", AsyncMock(side_effect=PlejdCloudError("down")))
    with pytest.raises(HomeAssistantError, match="Plejd cloud error removing room"):
        await async_remove_room(_hass(), _entry(), room_id="r1")


async def test_remove_room_raises_when_cloud_rejects_removal(monkeypatch):
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr("plejd.manage_room.async_get_site", AsyncMock(return_value=_site([_room()])))
    monkeypatch.setattr("plejd.manage_room.async_cloud_remove_room", AsyncMock(return_value=False))
    with pytest.raises(HomeAssistantError, match="rejected"):
        await async_remove_room(_hass(), _entry(), room_id="r1")


async def test_remove_room_succeeds_and_reloads(monkeypatch):
    hass = _hass()
    entry = _entry()
    monkeypatch.setattr("plejd.manage_room.async_login", AsyncMock(return_value="tok"))
    monkeypatch.setattr(
        "plejd.manage_room.async_get_site",
        AsyncMock(side_effect=[_site([_room()]), _site([])]),
    )
    remove_mock = AsyncMock(return_value=True)
    monkeypatch.setattr("plejd.manage_room.async_cloud_remove_room", remove_mock)

    await async_remove_room(hass, entry, room_id="r1")

    remove_mock.assert_awaited_once_with(None, "tok", "S1", "r1")
    assert entry.data["rooms"] == []
    hass.config_entries.async_reload.assert_awaited_once_with("e1")
