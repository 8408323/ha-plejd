"""Tests for following Plejd room moves into HA areas."""

from __future__ import annotations

import types

from plejd import area_sync
from plejd.area_sync import async_sync_areas, get_device_rooms, match_area


def _area(area_id, name, aliases=()):
    return types.SimpleNamespace(id=area_id, name=name, aliases=set(aliases))


AREAS = [_area("vardagsrum", "Vardagsrum"), _area("garage", "Garage"), _area("hall", "Hall", aliases=["Entré"])]


class _Devices:
    def __init__(self, devices):
        self.devices = {d.id: d for d in devices}

    def async_get_device(self, identifiers):
        return next((d for d in self.devices.values() if d.identifiers & identifiers), None)

    def async_update_device(self, device_id, area_id):
        self.devices[device_id].area_id = area_id


def _device(device_id, plejd_id, area_id):
    return types.SimpleNamespace(id=device_id, name=plejd_id, identifiers={("plejd", plejd_id)}, area_id=area_id)


def _hass(devices):
    return types.SimpleNamespace(
        data={},
        device_registry=_Devices(devices),
        area_registry=types.SimpleNamespace(async_list_areas=lambda: AREAS),
    )


ENTRY_DATA = {
    "devices": [
        {"device_id": "TEKNIK", "output_index": 0, "room_id": "r-garage"},
        {"device_id": "FONSTER", "output_index": 0, "room_id": "r-vardag"},
        {"device_id": "FONSTER", "output_index": 1, "room_id": "r-garage"},
        {"device_id": "LOOSE", "output_index": 0, "room_id": None},
        {"device_id": "ODD", "output_index": 0, "room_id": "r-ovrigt"},
    ],
    "rooms": [
        {"room_id": "r-vardag", "name": "Vardagsrum / Allrum"},
        {"room_id": "r-garage", "name": "Garage"},
        {"room_id": "r-ovrigt", "name": "Övrigt"},
    ],
}


def _entry(data=ENTRY_DATA):
    return types.SimpleNamespace(entry_id="e1", data=data)


def test_match_area_matches_whole_name_part_or_alias_case_insensitively():
    assert match_area("garage", AREAS).id == "garage"
    assert match_area("Vardagsrum / Allrum", AREAS).id == "vardagsrum"
    assert match_area("Entré", AREAS).id == "hall"
    assert match_area("Övrigt", AREAS) is None


def test_get_device_rooms_uses_first_output_and_includes_room_devices():
    assert get_device_rooms(ENTRY_DATA) == {
        "TEKNIK": "r-garage",
        "FONSTER": "r-vardag",
        "ODD": "r-ovrigt",
        "room_r-vardag": "r-vardag",
        "room_r-garage": "r-garage",
        "room_r-ovrigt": "r-ovrigt",
    }


async def test_first_sync_moves_devices_to_their_plejd_room_area():
    hass = _hass(
        [_device("d1", "TEKNIK", "vardagsrum"), _device("d2", "FONSTER", "badrum"), _device("d3", "ODD", "kok")]
    )
    await async_sync_areas(hass, _entry())
    areas = {d.name: d.area_id for d in hass.device_registry.devices.values()}
    assert areas == {"TEKNIK": "garage", "FONSTER": "vardagsrum", "ODD": "kok"}  # Övrigt has no area: untouched


async def test_area_picked_in_ha_sticks_until_plejd_room_changes():
    hass = _hass([_device("d1", "TEKNIK", "garage")])
    await async_sync_areas(hass, _entry())
    hass.device_registry.devices["d1"].area_id = "hall"  # user's own choice in HA
    await async_sync_areas(hass, _entry())
    assert hass.device_registry.devices["d1"].area_id == "hall"

    moved = {**ENTRY_DATA, "devices": [{"device_id": "TEKNIK", "output_index": 0, "room_id": "r-vardag"}]}
    await async_sync_areas(hass, _entry(moved))
    assert hass.device_registry.devices["d1"].area_id == "vardagsrum"


async def test_unchanged_rooms_do_not_rewrite_the_store():
    hass = _hass([_device("d1", "TEKNIK", "garage")])
    await async_sync_areas(hass, _entry())
    key = ("store", f"{area_sync.STORE_KEY}.e1")
    saved = hass.data[key]
    hass.data[key] = dict(saved)  # a different object with the same content
    marker = hass.data[key]
    await async_sync_areas(hass, _entry())
    assert hass.data[key] is marker


async def test_device_in_unresolved_room_is_moved_once_the_room_resolves():
    hass = _hass([_device("d1", "TEKNIK", "vardagsrum")])
    lights_free = {"devices": [{"device_id": "TEKNIK", "output_index": 0, "room_id": "r-garage"}], "rooms": []}
    await async_sync_areas(hass, _entry(lights_free))
    assert hass.device_registry.devices["d1"].area_id == "vardagsrum"  # room name unknown yet

    await async_sync_areas(hass, _entry())  # a light was added, so the room now has a name
    assert hass.device_registry.devices["d1"].area_id == "garage"


async def test_renamed_plejd_room_is_evaluated_again():
    hass = _hass([_device("d1", "ODD", "kok")])
    await async_sync_areas(hass, _entry())
    renamed = {**ENTRY_DATA, "rooms": [{"room_id": "r-ovrigt", "name": "Hall"}]}
    await async_sync_areas(hass, _entry(renamed))
    assert hass.device_registry.devices["d1"].area_id == "hall"
