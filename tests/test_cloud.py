"""Tests for the Plejd cloud (Parse) client."""

from __future__ import annotations

import aiohttp
import pytest
from aioresponses import aioresponses
from plejd.cloud import (
    PlejdAuthError,
    PlejdCloudError,
    async_get_site,
    async_get_sites,
    async_login,
    parse_site,
)
from plejd.const import PLEJD_PARSE_URL

_LOGIN = PLEJD_PARSE_URL + "login"
_SITE_LIST = PLEJD_PARSE_URL + "functions/getSiteList"
_SITE_BY_ID = PLEJD_PARSE_URL + "functions/getSiteById"

_SITE = {
    "siteId": "S1",
    "title": "Home",
    "plejdMesh": {"cryptoKey": "00112233445566778899aabbccddeeff"},
    "deviceAddress": {"d1": 1, "d2": 2, "d3": 3},
    "outputAddress": {"d1": {"0": 11}, "d2": {"0": 21, "1": 22}},
    "inputAddress": {"d1": {"0": 11, "1": 11}, "d3": {"0": 31}},
    "plejdDevices": [
        {"deviceId": "d1", "hardwareId": "1"},
        {"deviceId": "d2", "hardwareId": "18"},
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
