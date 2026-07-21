"""Tests for the Plejd cloud (Parse) client."""

from __future__ import annotations

import aiohttp
import pytest
from aioresponses import aioresponses
from plejd.cloud import (
    NewDeviceInfo,
    PlejdAuthError,
    PlejdCloudError,
    _parse_new_device_addresses,
    async_create_device,
    async_create_room,
    async_get_available_firmware,
    async_get_needed_output_count,
    async_get_site,
    async_get_sites,
    async_login,
    async_remove_room,
    async_set_device_title,
    async_set_input_setting,
    async_update_room,
    parse_site,
)
from plejd.const import (
    PLEJD_FN_COMPATIBLE_DEVICES,
    PLEJD_FN_CREATE_DEVICE,
    PLEJD_FN_CREATE_ROOM,
    PLEJD_FN_REMOVE_ROOM,
    PLEJD_FN_SET_INPUT,
    PLEJD_FN_UPDATE_ROOM,
    PLEJD_PARSE_URL,
)

_LOGIN = PLEJD_PARSE_URL + "login"
_SITE_LIST = PLEJD_PARSE_URL + "functions/getSiteList"
_SITE_BY_ID = PLEJD_PARSE_URL + "functions/getSiteById"
_FIRMWARE = PLEJD_PARSE_URL + "functions/getFirmwaresByHardwareId"
_CREATE_DEVICE = PLEJD_PARSE_URL + PLEJD_FN_CREATE_DEVICE
_CREATE_ROOM = PLEJD_PARSE_URL + PLEJD_FN_CREATE_ROOM
_UPDATE_ROOM = PLEJD_PARSE_URL + PLEJD_FN_UPDATE_ROOM
_REMOVE_ROOM = PLEJD_PARSE_URL + PLEJD_FN_REMOVE_ROOM
_SET_INPUT = PLEJD_PARSE_URL + PLEJD_FN_SET_INPUT

_SITE = {
    "siteId": "S1",
    "title": "Home",
    "plejdMesh": {"cryptoKey": "00112233445566778899aabbccddeeff"},
    "deviceAddress": {"d1": 1, "d2": 2, "d3": 3, "w1": 33},
    "outputAddress": {"d1": {"0": 11}, "d2": {"0": 21, "1": 22}},
    "inputAddress": {"d1": {"0": 11, "1": 11}, "d3": {"0": 31}},
    "plejdDevices": [
        {"deviceId": "d1", "hardwareId": "1"},
        {"deviceId": "d2", "hardwareId": "18"},
        {"deviceId": "w1", "hardwareId": "70"},
        {"deviceId": "d3", "hardwareId": "16"},
    ],
    "devices": [
        {"deviceId": "d1", "title": "Kitchen", "roomId": "r1", "outputType": "LIGHT"},
        {"deviceId": "d2", "title": "Pump", "roomId": "r1", "outputType": "RELAY"},
        {"deviceId": "d3", "title": "Blind", "roomId": "r2", "outputType": "COVERABLE"},
        {"title": "ghost"},  # no deviceId -> skipped
    ],
    "scenes": [{"sceneId": "sc1", "title": "Movie"}, {"sceneId": "sc2", "title": "NoIndex"}],
    "sceneIndex": {"sc1": 3},
}


async def _session():
    return aiohttp.ClientSession()


async def test_login_returns_session_token():
    with aioresponses() as m:
        m.post(_LOGIN, payload={"sessionToken": "r:abc"})
        async with aiohttp.ClientSession() as s:
            assert await async_login(s, "User@Example.com", "pw") == "r:abc"


async def test_login_bad_credentials_raises_auth_error():
    with aioresponses() as m:
        m.post(_LOGIN, status=404, payload={"error": "invalid login", "code": 101})
        async with aiohttp.ClientSession() as s:
            with pytest.raises(PlejdAuthError, match="invalid login"):
                await async_login(s, "u@x.se", "bad")


async def test_login_without_token_raises():
    with aioresponses() as m:
        m.post(_LOGIN, payload={"objectId": "u1"})  # 200 but no token
        async with aiohttp.ClientSession() as s:
            with pytest.raises(PlejdAuthError):
                await async_login(s, "u@x.se", "pw")


async def test_get_sites_returns_list():
    with aioresponses() as m:
        m.post(_SITE_LIST, payload={"result": [{"siteId": "S1", "title": "Home"}]})
        async with aiohttp.ClientSession() as s:
            sites = await async_get_sites(s, "tok")
    assert sites == [{"siteId": "S1", "title": "Home"}]


async def test_get_sites_non_list_result_is_empty():
    with aioresponses() as m:
        m.post(_SITE_LIST, payload={"result": None})
        async with aiohttp.ClientSession() as s:
            assert await async_get_sites(s, "tok") == []


async def test_call_function_error_status_raises():
    with aioresponses() as m:
        m.post(_SITE_LIST, status=500, payload={"error": "boom"})
        async with aiohttp.ClientSession() as s:
            with pytest.raises(PlejdCloudError, match="boom"):
                await async_get_sites(s, "tok")


async def test_get_site_parses_devices():
    with aioresponses() as m:
        m.post(_SITE_BY_ID, payload={"result": [_SITE]})
        async with aiohttp.ClientSession() as s:
            site = await async_get_site(s, "tok", "S1")
    assert site.crypto_key == bytes.fromhex("00112233445566778899aabbccddeeff")
    by_id = {d.device_id: d for d in site.devices}
    assert set(by_id) == {"d1", "d2", "d3"}  # ghost skipped
    assert by_id["d1"].category == "light" and by_id["d1"].dimmable is True
    assert by_id["d1"].model == "DIM-01" and by_id["d1"].outputs == [11]
    assert by_id["d2"].category == "switch" and by_id["d2"].dimmable is False
    assert by_id["d2"].outputs == [21, 22] and by_id["d2"].address == 21
    assert by_id["d3"].category == "cover" and by_id["d3"].model == "JAL-01"
    # scenes: only those with a sceneIndex entry are kept
    assert [(s.name, s.index) for s in site.scenes] == [("Movie", 3)]
    # inputs: deduped by address; named from devices[]; input_index kept for later writes
    assert sorted((i.address, i.name, i.input_index) for i in site.inputs) == [(11, "Kitchen", 0), (31, "Blind", 0)]
    # physical device addresses (for fault polling), keyed by device_id, incl. sensor w1
    assert site.device_addresses == {"d1": 1, "d2": 2, "d3": 3, "w1": 33}
    assert [(m.address, m.name) for m in site.motion] == [(33, "Motion sensor")]


def test_parse_site_keeps_input_index_for_two_input_device():
    # A real two-input device (distinct addresses per input, unlike d1's fixture above
    # where both indices share one address and get deduped) must keep each input's own
    # index, since async_set_input_setting needs it to target the right physical input.
    site = {**_SITE, "inputAddress": {"d1": {"0": 11, "1": 12}}}
    parsed = parse_site(site)
    assert sorted((i.address, i.input_index) for i in parsed.inputs) == [(11, 0), (12, 1)]


def test_parse_site_skips_malformed_input_address_entries():
    # A non-numeric index or address must not abort the whole site parse - just that entry.
    site = {**_SITE, "inputAddress": {"d1": {"bad": 11, "1": "also-bad", "2": 13}}}
    parsed = parse_site(site)
    assert [(i.address, i.input_index) for i in parsed.inputs] == [(13, 2)]


async def test_get_site_accepts_dict_result():
    with aioresponses() as m:
        m.post(_SITE_BY_ID, payload={"result": _SITE})  # not wrapped in a list
        async with aiohttp.ClientSession() as s:
            site = await async_get_site(s, "tok", "S1")
    assert site.site_id == "S1"


async def test_get_site_empty_result_raises():
    with aioresponses() as m:
        m.post(_SITE_BY_ID, payload={"result": []})
        async with aiohttp.ClientSession() as s:
            with pytest.raises(PlejdCloudError, match="not found"):
                await async_get_site(s, "tok", "S1")


async def test_get_site_malformed_result_raises():
    with aioresponses() as m:
        m.post(_SITE_BY_ID, payload={"result": "nope"})
        async with aiohttp.ClientSession() as s:
            with pytest.raises(PlejdCloudError, match="malformed"):
                await async_get_site(s, "tok", "S1")


def test_parse_site_requires_crypto_key():
    with pytest.raises(PlejdCloudError, match="cryptoKey"):
        parse_site({"siteId": "S1", "plejdMesh": {}})


def test_dimmable_follows_traits_when_present():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "plejdDevices": [{"deviceId": "a", "hardwareId": "1"}, {"deviceId": "b", "hardwareId": "1"}],
            "devices": [
                {"deviceId": "a", "outputType": "LIGHT", "traits": 0x01},  # Powerable only -> on/off light
                {"deviceId": "b", "outputType": "LIGHT", "traits": 0x03},  # Powerable|Dimmable
            ],
        }
    )
    by_id = {d.device_id: d for d in site.devices}
    assert by_id["a"].category == "light" and by_id["a"].dimmable is False
    assert by_id["b"].dimmable is True and by_id["b"].traits == 0x03


def test_parse_site_extracts_gateway_and_resource_set():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "devices": [],
            "gateways": [{"deviceId": "gw1", "hardwareId": "4", "resourceSetId": "rsABC"}],
            "resourceSets": [{"objectId": "rsXYZ"}],
        }
    )
    assert site.gateways == ["gw1"]
    assert site.resource_set_id == "rsABC"  # the gateway's own resourceSetId wins


def test_parse_site_resource_set_falls_back_to_resource_sets():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "devices": [],
            "gateways": [{"deviceId": "gw1"}],  # no resourceSetId on the gateway
            "resourceSets": [{"objectId": "rsXYZ"}],
        }
    )
    assert site.gateways == ["gw1"] and site.resource_set_id == "rsXYZ"


def test_parse_site_ambiguous_resource_sets_yields_none():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "devices": [],
            "gateways": [{"deviceId": "gw1"}],  # no resourceSetId on the gateway
            "resourceSets": [{"objectId": "rsA"}, {"objectId": "rsB"}],  # ambiguous
        }
    )
    assert site.gateways == ["gw1"] and site.resource_set_id is None


def test_parse_site_no_gateway():
    site = parse_site({"plejdMesh": {"cryptoKey": "00" * 16}, "devices": []})
    assert site.gateways == [] and site.resource_set_id is None


def test_parse_site_handles_missing_address_and_hardware():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "devices": [{"deviceId": "x", "outputType": "Unknown"}],
        }
    )
    dev = site.devices[0]
    assert dev.address is None and dev.outputs == []
    assert dev.hardware_id == 0 and dev.category == "none"
    assert site.title == "Plejd"  # default


def test_parse_site_captures_output_settings():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "devices": [
                {"deviceId": "a", "outputType": "LIGHT", "outputSettings": {"minDim": 100, "dimCurve": 1}},
                {"deviceId": "b", "outputType": "LIGHT"},  # no outputSettings
            ],
        }
    )
    by_id = {d.device_id: d for d in site.devices}
    assert by_id["a"].output_settings == {"minDim": 100, "dimCurve": 1}
    assert by_id["b"].output_settings is None


def test_parse_site_ignores_non_dict_output_settings():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "devices": [{"deviceId": "a", "outputType": "LIGHT", "outputSettings": "bad"}],
        }
    )
    assert site.devices[0].output_settings is None


def test_parse_site_firmware_by_device_covers_all_physical_devices():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "plejdDevices": [
                {
                    "deviceId": "d1",
                    "hardwareId": "1",
                    "faceplateId": 7,
                    "firmware": {"version": "6.43.3", "buildTime": 20260324155701},
                },
                {"deviceId": "w1", "hardwareId": "70", "firmware": {"version": "4.41.3", "buildTime": 20240910153670}},
            ],
            # A GWY-01 lives in gateways[], not plejdDevices, and carries its firmware
            # dict under `firmwareObject` (its `firmware` is a bare buildTime int).
            "gateways": [
                {
                    "deviceId": "gw1",
                    "hardwareId": "4",
                    "firmware": 20230207104904,
                    "firmwareObject": {"version": "2.3.1", "buildTime": 20230207104904},
                }
            ],
            "devices": [{"deviceId": "d1", "outputType": "LIGHT"}],  # only d1 is a controllable output
        }
    )
    fw = site.firmware_by_device
    assert set(fw) == {"d1", "w1", "gw1"}  # outputs + sensors + gateway, not just controllable outputs
    assert fw["d1"].version == "6.43.3" and fw["d1"].build_time == 20260324155701
    assert fw["d1"].hardware_id == 1 and fw["d1"].faceplate_id == "7"
    assert fw["w1"].version == "4.41.3"
    # gateway firmware comes from firmwareObject, not the bare int `firmware`
    assert fw["gw1"].version == "2.3.1" and fw["gw1"].build_time == 20230207104904 and fw["gw1"].hardware_id == 4


def test_parse_site_firmware_tolerates_missing_or_garbage():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "plejdDevices": [
                {"deviceId": "a", "hardwareId": "1"},  # no firmware/faceplate at all
                {"deviceId": "b", "hardwareId": "1", "firmware": {"version": 5, "buildTime": "nope"}},
                {"hardwareId": "1"},  # no deviceId -> skipped
            ],
            "devices": [],
        }
    )
    fw = site.firmware_by_device
    assert set(fw) == {"a", "b"}
    assert fw["a"].version is None and fw["a"].build_time is None and fw["a"].faceplate_id is None
    assert fw["b"].version is None  # non-str version dropped
    assert fw["b"].build_time is None  # non-numeric buildTime dropped


def test_parse_site_device_addresses_drops_garbage_values():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "deviceAddress": {"d1": 5, "d2": "not-a-number", "d3": None},
            "devices": [],
        }
    )
    assert site.device_addresses == {"d1": 5}


async def test_available_firmware_returns_newest_offered():
    with aioresponses() as m:
        m.post(
            _FIRMWARE,
            payload={
                "result": [
                    {"version": "6.40.0", "buildTime": 20251201000000},
                    {"version": "6.43.3", "buildTime": 20260324155701},
                ]
            },
        )
        async with aiohttp.ClientSession() as s:
            latest = await async_get_available_firmware(s, "tok", 1, "0")
    assert latest == ("6.43.3", 20260324155701)


async def test_available_firmware_empty_list_means_up_to_date():
    with aioresponses() as m:
        m.post(_FIRMWARE, payload={"result": []})
        async with aiohttp.ClientSession() as s:
            assert await async_get_available_firmware(s, "tok", 1, None) is None


async def test_available_firmware_skips_malformed_entries():
    with aioresponses() as m:
        m.post(
            _FIRMWARE,
            payload={"result": ["junk", {"version": "x"}, {"buildTime": 1}, {"version": "6.1.0", "buildTime": 42}]},
        )
        async with aiohttp.ClientSession() as s:
            assert await async_get_available_firmware(s, "tok", 9, None) == ("6.1.0", 42)


_COMPATIBLE_DEVICES = PLEJD_PARSE_URL + PLEJD_FN_COMPATIBLE_DEVICES


async def test_needed_output_count_reads_needed_addresses():
    with aioresponses() as m:
        m.post(_COMPATIBLE_DEVICES, payload={"result": {"compatible": [{"24": {"neededAddresses": 2}}]}})
        async with aiohttp.ClientSession() as s:
            assert await async_get_needed_output_count(s, "tok", "24", 20240101000000) == 2


async def test_needed_output_count_zero_for_wall_controller():
    with aioresponses() as m:
        m.post(_COMPATIBLE_DEVICES, payload={"result": {"compatible": [{"10": {"neededAddresses": 0}}]}})
        async with aiohttp.ClientSession() as s:
            assert await async_get_needed_output_count(s, "tok", "10", 20240101000000) == 0


async def test_needed_output_count_falls_back_to_one_when_not_confirmed():
    with aioresponses() as m:
        m.post(_COMPATIBLE_DEVICES, payload={"result": {"compatible": [], "incompatible": ["22"]}})
        async with aiohttp.ClientSession() as s:
            assert await async_get_needed_output_count(s, "tok", "22", 20240101000000) == 1


async def test_needed_output_count_sends_hardware_and_build_time():
    from aioresponses import CallbackResult

    captured: dict = {}

    def _capture(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        return CallbackResult(payload={"result": {"compatible": [{"22": {"neededAddresses": 1}}]}})

    with aioresponses() as m:
        m.post(_COMPATIBLE_DEVICES, callback=_capture)
        async with aiohttp.ClientSession() as s:
            await async_get_needed_output_count(s, "tok", "22", 20240701133622)
    assert captured["devices"] == [
        {"buildTime": 20240701133622, "firmwareNumber": None, "hardwareId": "22", "faceplateId": "0", "variant": None}
    ]


_UPDATE_DEVICE = PLEJD_PARSE_URL + "functions/updateDevice_V2"


def test_parse_site_extracts_output_object_id():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16},
            "plejdDevices": [{"deviceId": "F161F68198AF", "hardwareId": "1"}],
            "devices": [{"deviceId": "F161F68198AF", "outputType": "LIGHT", "objectId": "7MK7dlrcfz"}],
        }
    )
    assert site.devices[0].object_id == "7MK7dlrcfz"


async def test_set_device_title_success():
    with aioresponses() as m:
        m.post(_UPDATE_DEVICE, payload={"result": True})
        async with aiohttp.ClientSession() as s:
            ok = await async_set_device_title(s, "tok", "site-1", "F161F68198AF", "7MK7dlrcfz", "Vardagsrum")
    assert ok is True


async def test_set_device_title_false_when_cloud_rejects():
    with aioresponses() as m:
        m.post(_UPDATE_DEVICE, payload={"result": False})
        async with aiohttp.ClientSession() as s:
            assert await async_set_device_title(s, "tok", "site-1", "d1", "p1", "X") is False


def test_parse_site_extracts_mesh_key():
    site = parse_site(
        {
            "plejdMesh": {"cryptoKey": "00" * 16, "meshKey": "AB-CD-EF-01"},
            "devices": [],
        }
    )
    assert site.mesh_key == "AB-CD-EF-01"


def test_parse_site_mesh_key_defaults_to_empty_string():
    site = parse_site({"plejdMesh": {"cryptoKey": "00" * 16}, "devices": []})
    assert site.mesh_key == ""


# ---- createPlejdDevice_V2 ----


def test_parse_new_device_addresses_full_response():
    result = {
        "deviceAddress": 5,
        "outputAddress": {"0": 50, "1": 51},
    }
    addrs = _parse_new_device_addresses(result)
    assert addrs.device_address == 5
    assert addrs.output_addresses == {0: 50, 1: 51}


def test_parse_new_device_addresses_non_dict_returns_empty():
    addrs = _parse_new_device_addresses(None)
    assert addrs.device_address is None
    assert addrs.output_addresses == {}


def test_parse_new_device_addresses_skips_invalid_output_keys():
    result = {"deviceAddress": 7, "outputAddress": {"0": 70, "bad": "skip", "1": None}}
    addrs = _parse_new_device_addresses(result)
    assert addrs.device_address == 7
    assert addrs.output_addresses == {0: 70}


async def test_async_create_device_sends_required_fields():
    with aioresponses() as m:
        m.post(_CREATE_DEVICE, payload={"result": {"deviceAddress": 10, "outputAddress": {"0": 100}}})
        async with aiohttp.ClientSession() as s:
            addrs = await async_create_device(s, "tok", "site1", "aabbccddeeff", "1", 20241101000000)
    assert addrs.device_address == 10
    assert addrs.output_addresses == {0: 100}


async def test_async_create_device_always_sends_variant_and_installation_location():
    """The cloud function rejects the request if these keys are missing entirely (even as null)."""
    from aioresponses import CallbackResult

    captured: dict = {}

    def _capture(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        return CallbackResult(payload={"result": {"deviceAddress": 1}})

    with aioresponses() as m:
        m.post(_CREATE_DEVICE, callback=_capture)
        async with aiohttp.ClientSession() as s:
            await async_create_device(s, "tok", "site1", "aabbccddeeff", "1", 0)
    assert "variant" in captured and captured["variant"] is None
    assert "installationLocation" in captured and captured["installationLocation"] == ""


async def test_async_create_device_sends_optional_fields():
    with aioresponses() as m:
        m.post(_CREATE_DEVICE, payload={"result": {"deviceAddress": 3}})
        async with aiohttp.ClientSession() as s:
            addrs = await async_create_device(
                s,
                "tok",
                "site1",
                "aabbccddeeff",
                "1",
                20241101000000,
                device_infos=[NewDeviceInfo(title="Kitchen", output_index=0, room_id="r1")],
                faceplate_id="fp1",
                variant="v2",
                installation_location="ceiling",
            )
    assert addrs.device_address == 3


async def test_async_create_device_error_raises():
    with aioresponses() as m:
        m.post(_CREATE_DEVICE, status=400, payload={"error": "bad request"})
        async with aiohttp.ClientSession() as s:
            with pytest.raises(PlejdCloudError, match="bad request"):
                await async_create_device(s, "tok", "site1", "aabbccddeeff", "1", 0)


async def test_create_room_posts_correct_payload_and_returns_uuid():
    with aioresponses() as m:
        m.post(_CREATE_ROOM, payload={"result": 1})
        async with aiohttp.ClientSession() as s:
            room_id = await async_create_room(s, "tok", "site1", "Bibliotek")
    # room_id must be a UUID string
    import uuid as _uuid

    _uuid.UUID(room_id)  # raises if not a valid UUID


async def test_create_room_uses_supplied_category():
    from aioresponses import CallbackResult

    captured: dict = {}

    def _capture(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        return CallbackResult(payload={"result": 1})

    with aioresponses() as m:
        m.post(_CREATE_ROOM, callback=_capture)
        async with aiohttp.ClientSession() as s:
            await async_create_room(s, "tok", "site1", "Garage", category="Garage")
    assert captured["title"] == "Garage"
    assert captured["category"] == "Garage"


async def test_update_room_sends_only_provided_fields():
    from aioresponses import CallbackResult

    captured: dict = {}

    def _capture(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        return CallbackResult(payload={"result": True})

    with aioresponses() as m:
        m.post(_UPDATE_ROOM, callback=_capture)
        async with aiohttp.ClientSession() as s:
            ok = await async_update_room(s, "tok", "site1", "room1", title="Vardagsrum")
    assert ok is True
    assert captured == {"siteId": "site1", "roomId": "room1", "title": "Vardagsrum"}


async def test_update_room_sends_all_provided_fields():
    from aioresponses import CallbackResult

    captured: dict = {}

    def _capture(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        return CallbackResult(payload={"result": True})

    with aioresponses() as m:
        m.post(_UPDATE_ROOM, callback=_capture)
        async with aiohttp.ClientSession() as s:
            await async_update_room(s, "tok", "site1", "room1", title="Kök", order=2, category="Kitchen")
    assert captured == {"siteId": "site1", "roomId": "room1", "title": "Kök", "order": 2, "category": "Kitchen"}


async def test_update_room_rejects_malformed_truthy_result():
    # A malformed but truthy `result` (not the literal True the real API sends on success)
    # must not be treated as a successful update - reject it strictly, like device rename.
    with aioresponses() as m:
        m.post(_UPDATE_ROOM, payload={"result": "yes"})
        async with aiohttp.ClientSession() as s:
            ok = await async_update_room(s, "tok", "site1", "room1", title="X")
    assert ok is False


async def test_remove_room_posts_correct_payload():
    from aioresponses import CallbackResult

    captured: dict = {}

    def _capture(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        return CallbackResult(payload={"result": True})

    with aioresponses() as m:
        m.post(_REMOVE_ROOM, callback=_capture)
        async with aiohttp.ClientSession() as s:
            ok = await async_remove_room(s, "tok", "site1", "room1")
    assert ok is True
    assert captured == {"siteId": "site1", "roomId": "room1"}


async def test_remove_room_rejects_malformed_truthy_result():
    with aioresponses() as m:
        m.post(_REMOVE_ROOM, payload={"result": {}})
        async with aiohttp.ClientSession() as s:
            ok = await async_remove_room(s, "tok", "site1", "room1")
    assert ok is False


async def test_set_input_setting_posts_toggle():
    from aioresponses import CallbackResult

    captured: dict = {}

    def _capture(url, **kwargs):
        captured.update(kwargs.get("json", {}))
        return CallbackResult(payload={"result": True})

    with aioresponses() as m:
        m.post(_SET_INPUT, callback=_capture)
        async with aiohttp.ClientSession() as s:
            await async_set_input_setting(s, "tok", "site1", "aabbccddeeff", 0, "Toggle")
    assert captured["deviceId"] == "aabbccddeeff"
    assert captured["input"] == 0
    assert captured["buttonType"] == "Toggle"
    assert captured["doubleSidedDirectionButton"] is False


def test_parse_site_parses_rooms_with_group_addresses():
    site = {
        **_SITE,
        "rooms": [
            {"roomId": "r1", "title": "Kitchen"},
            {"roomId": "r3", "title": "Empty room"},
        ],
        # r2 is absent from rooms[] -> name falls back to "Room"; r4's address is non-int -> skipped
        "roomAddress": {"r1": 14, "r2": 16, "r3": 99, "r4": "bad"},
        # d1 (a LIGHT) belongs to both groups; both groups have only light members.
        "outputGroups": {"d1": {"0": [14, 16]}},
    }
    rooms = parse_site(site).rooms
    by_addr = {r.address: r for r in rooms}
    assert set(by_addr) == {14, 16}  # r3 (no members) and r4 (bad address) are dropped
    assert by_addr[14].name == "Kitchen"
    assert by_addr[14].member_addresses == [11]
    assert by_addr[14].dimmable is True
    assert by_addr[16].name == "Room"  # fallback when the room has no title entry
    assert by_addr[16].member_addresses == [11]  # d1.out0 also belongs to group 16


def test_parse_site_all_rooms_includes_empty_and_non_light_rooms():
    # all_rooms (for room management) must not share `rooms`'s light-grouping filtering:
    # an empty room (r3, no group members) and a room with only a non-light member would
    # both be silently dropped from `rooms`, which is exactly wrong for "does this room
    # exist" / "is it safe to delete" (see PR #114 review).
    site = {
        **_SITE,
        "rooms": [
            {"roomId": "r1", "title": "Kitchen"},
            {"roomId": "r3", "title": "Empty room"},
        ],
        "roomAddress": {"r1": 14, "r3": 99},
        "outputGroups": {"d1": {"0": [14]}},
    }
    parsed = parse_site(site)
    assert [r.address for r in parsed.rooms] == [14]  # r3 still excluded from the light-group list
    by_id = {r.room_id: r for r in parsed.all_rooms}
    assert set(by_id) == {"r1", "r3"}
    assert by_id["r1"].name == "Kitchen"
    assert by_id["r1"].has_devices is True  # d1/d2 (from _SITE's devices[]) have roomId "r1"
    assert by_id["r3"].name == "Empty room"
    assert by_id["r3"].has_devices is False


def test_parse_site_all_rooms_skips_malformed_room_entries():
    site = {**_SITE, "rooms": [{"roomId": "r1", "title": "Kitchen"}, "not-a-dict", {"title": "no id"}, None]}
    all_rooms = parse_site(site).all_rooms
    assert [r.room_id for r in all_rooms] == ["r1"]


def test_parse_site_excludes_room_with_non_light_member():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        # d1 (a LIGHT) and d2 (a RELAY) both belong to group 14 - a 0x0098 group command
        # would also toggle the relay, so the whole room is excluded rather than silently
        # dropping the non-light member from an otherwise-created room.
        "outputGroups": {"d1": {"0": [14]}, "d2": {"0": [14]}},
    }
    assert parse_site(site).rooms == []


def test_parse_site_rejects_out_of_range_group_address():
    site = {
        **_SITE,
        # mesh addresses are single-byte (encode_command masks with & 0xFF); 0, negative,
        # and >255 group addresses must not silently wrap onto a real device's address.
        "roomAddress": {"r1": 0, "r2": -1, "r3": 256, "r4": 14},
        "outputGroups": {"d1": {"0": [0, -1, 256, 14]}},
    }
    rooms = parse_site(site).rooms
    assert [r.room_id for r in rooms] == ["r4"]


def test_parse_site_skips_malformed_output_group_entries():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        # d1's own group list has one malformed (non-int) group id alongside the valid one;
        # d5 (not in devices[], so its own outputAddress cast can't crash devices-parsing)
        # has a malformed (non-int) output address for an otherwise-valid group. Neither
        # entry may abort the whole site parse - both are skipped like a bad roomAddress.
        "outputGroups": {"d1": {"0": [14, "bad-group"]}, "d5": {"0": [14]}},
        "outputAddress": {**_SITE["outputAddress"], "d5": {"0": "bad-address"}},
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1
    assert rooms[0].member_addresses == [11]  # only d1.out0 survives


def test_parse_site_skips_non_list_output_group_value():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        # d1's own group membership is a scalar, not a list of group addresses -> must be
        # skipped instead of raising (an int isn't iterable; a dict would silently iterate
        # its keys instead of the intended group addresses).
        "outputGroups": {"d1": {"0": 14}},
    }
    rooms = parse_site(site).rooms
    assert rooms == []  # the malformed membership yields no members -> room dropped


def test_parse_site_tolerates_non_dict_room_and_group_fields():
    site = {**_SITE, "roomAddress": ["not", "a", "dict"], "outputGroups": ["also", "not", "a", "dict"]}
    assert parse_site(site).rooms == []  # both malformed top-level fields are treated as absent


def test_parse_site_skips_non_dict_room_entry():
    site = {
        **_SITE,
        # a stray non-dict entry alongside a valid one must not abort parsing
        "rooms": [{"roomId": "r1", "title": "Kitchen"}, "not-a-dict", None],
        "roomAddress": {"r1": 14},
        "outputGroups": {"d1": {"0": [14]}},
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1 and rooms[0].name == "Kitchen"


def test_parse_site_tolerates_non_list_rooms_field():
    site = {
        **_SITE,
        # rooms is a scalar (untrusted cloud data), not a list -> treated as absent
        # instead of raising when building room_titles.
        "rooms": "not-a-list",
        "roomAddress": {"r1": 14},
        "outputGroups": {"d1": {"0": [14]}},
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1 and rooms[0].name == "Room"  # falls back like a missing title does


def test_parse_site_skips_non_dict_output_group_membership_map():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        # d1's whole membership map is a scalar, not {outputIdx: [groups]} -> skipped
        # entirely instead of raising on a bad .items() call.
        "outputGroups": {"d1": "not-a-dict"},
    }
    assert parse_site(site).rooms == []


def test_parse_site_ignores_non_string_room_title():
    site = {
        **_SITE,
        # a non-string title must not crash the .strip() call -> falls back like a
        # missing title does ("Room")
        "rooms": [{"roomId": "r1", "title": 123}],
        "roomAddress": {"r1": 14},
        "outputGroups": {"d1": {"0": [14]}},
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1 and rooms[0].name == "Room"


def test_parse_site_tolerates_non_dict_output_address_fields():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        "outputGroups": {"d1": {"0": [14]}},
        # the whole outputAddress map is malformed (untrusted cloud data) -> treated as
        # empty rather than raising when the room-membership loop calls .get() on it;
        # d1 is still resolved via the deviceAddress fallback (mirrors the device
        # parser's own fallback for a single-output light)
        "outputAddress": ["not", "a", "dict"],
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1
    assert rooms[0].member_addresses == [1]  # d1's deviceAddress (1), not its missing outputAddress


def test_parse_site_skips_non_dict_per_device_output_address():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        # d5 doesn't appear in devices[] (so its malformed entry can't crash the
        # unrelated device-parsing loop); its own outputAddress value is a scalar, not
        # {outputIdx: address} -> its membership must be skipped, not raise.
        "outputGroups": {"d5": {"0": [14]}},
        "outputAddress": {**_SITE["outputAddress"], "d5": "not-a-dict"},
    }
    assert parse_site(site).rooms == []


def test_parse_site_room_membership_falls_back_to_device_address():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        "outputGroups": {"d1": {"0": [14]}},
        # d1 has no entry in outputAddress at all (a valid dict, just missing this key)
        # -> falls back to deviceAddress, mirroring the device parser's own fallback
        # for a single-output light whose outputAddress the cloud omits.
        "outputAddress": {"d2": _SITE["outputAddress"]["d2"]},
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1
    assert rooms[0].member_addresses == [1]  # d1's deviceAddress


def test_parse_site_room_not_dimmable_when_no_member_is_dimmable():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        "outputGroups": {"d1": {"0": [14]}},
        # d1 is a LIGHT but explicitly lacks the Dimmable trait -> on/off only.
        "devices": [
            {"deviceId": "d1", "title": "Kitchen", "roomId": "r1", "outputType": "LIGHT", "traits": 0},
        ],
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1
    assert rooms[0].dimmable is False


def test_parse_site_room_dimmable_addresses_excludes_on_off_only_members():
    site = {
        **_SITE,
        "roomAddress": {"r1": 14},
        "outputGroups": {"d1": {"0": [14]}, "d6": {"0": [14]}},
        "outputAddress": {**_SITE["outputAddress"], "d6": {"0": 61}},
        "plejdDevices": [*_SITE["plejdDevices"], {"deviceId": "d6", "hardwareId": "1"}],
        "devices": [
            *_SITE["devices"],
            {"deviceId": "d6", "title": "Lamp", "roomId": "r1", "outputType": "LIGHT", "traits": 0},
        ],
    }
    rooms = parse_site(site).rooms
    assert len(rooms) == 1
    room = rooms[0]
    assert set(room.member_addresses) == {11, 61}
    assert room.dimmable_addresses == [11]  # d1 is dimmable; d6 (traits=0) is on/off only
