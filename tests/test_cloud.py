"""Tests for the Plejd cloud (Parse) client."""

from __future__ import annotations

import aiohttp
import pytest
from aioresponses import aioresponses
from plejd.cloud import (
    PlejdAuthError,
    PlejdCloudError,
    async_get_available_firmware,
    async_get_site,
    async_get_sites,
    async_login,
    async_set_device_title,
    parse_site,
)
from plejd.const import PLEJD_PARSE_URL

_LOGIN = PLEJD_PARSE_URL + "login"
_SITE_LIST = PLEJD_PARSE_URL + "functions/getSiteList"
_SITE_BY_ID = PLEJD_PARSE_URL + "functions/getSiteById"
_FIRMWARE = PLEJD_PARSE_URL + "functions/getFirmwaresByHardwareId"

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
    # inputs: deduped by address; named from devices[]
    assert sorted((i.address, i.name) for i in site.inputs) == [(11, "Kitchen"), (31, "Blind")]
    assert [(m.address, m.name) for m in site.motion] == [(33, "Motion sensor")]


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
