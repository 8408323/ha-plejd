"""Tests for the Plejd config flow."""

from __future__ import annotations

import types

import pytest
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from plejd import config_flow as cf
from plejd.cloud import PlejdAuthError, PlejdCloudDevice, PlejdCloudError, PlejdCloudSite
from plejd.config_flow import PlejdConfigFlow
from plejd.const import CONF_CRYPTO_KEY, CONF_DEVICES, CONF_SITE_ID

_LOGIN = {CONF_EMAIL: "user@example.com", CONF_PASSWORD: "pw"}


def _flow():
    flow = PlejdConfigFlow()
    flow.hass = types.SimpleNamespace(session=None)
    flow.context = {}
    return flow


def _site(site_id="S1"):
    dev = PlejdCloudDevice(
        device_id="d1",
        name="Kitchen",
        address=1,
        outputs=[11],
        hardware_id=1,
        model="DIM-01",
        category="light",
        dimmable=True,
        traits=3,
        room_id="r1",
    )
    return PlejdCloudSite(site_id=site_id, title="Home", crypto_key=bytes(16), devices=[dev])


def _patch_cloud(monkeypatch, *, login=None, sites=None, site=None):
    async def _login(session, email, password):
        if isinstance(login, Exception):
            raise login
        return login or "tok"

    async def _get_sites(session, token):
        if isinstance(sites, Exception):
            raise sites
        return sites if sites is not None else []

    async def _get_site(session, token, site_id):
        if isinstance(site, Exception):
            raise site
        return site if site is not None else _site(site_id)

    monkeypatch.setattr(cf, "async_login", _login)
    monkeypatch.setattr(cf, "async_get_sites", _get_sites)
    monkeypatch.setattr(cf, "async_get_site", _get_site)


async def test_user_step_shows_form():
    result = await _flow().async_step_user()
    assert result["type"] == "form" and result["step_id"] == "user"


async def test_invalid_auth(monkeypatch):
    _patch_cloud(monkeypatch, login=PlejdAuthError("bad"))
    result = await _flow().async_step_user(_LOGIN)
    assert result["errors"] == {"base": "invalid_auth"}


async def test_cannot_connect(monkeypatch):
    _patch_cloud(monkeypatch, sites=PlejdCloudError("down"))
    result = await _flow().async_step_user(_LOGIN)
    assert result["errors"] == {"base": "cannot_connect"}


async def test_no_sites(monkeypatch):
    _patch_cloud(monkeypatch, sites=[])
    result = await _flow().async_step_user(_LOGIN)
    assert result["errors"] == {"base": "no_sites"}


async def test_single_site_creates_entry(monkeypatch):
    _patch_cloud(monkeypatch, sites=[{"siteId": "S1", "title": "Home"}])
    result = await _flow().async_step_user(_LOGIN)
    assert result["type"] == "create_entry"
    assert result["title"] == "Home"
    assert result["data"][CONF_CRYPTO_KEY] == bytes(16).hex()
    assert result["data"][CONF_SITE_ID] == "S1"
    assert result["data"][CONF_DEVICES][0]["model"] == "DIM-01"


async def test_multiple_sites_shows_picker(monkeypatch):
    _patch_cloud(monkeypatch, sites=[{"siteId": "S1", "title": "Home"}, {"siteId": "S2", "title": "Cabin"}])
    flow = _flow()
    result = await flow.async_step_user(_LOGIN)
    assert result["type"] == "form" and result["step_id"] == "site"
    # then pick one
    result2 = await flow.async_step_site({CONF_SITE_ID: "S2"})
    assert result2["type"] == "create_entry"
    assert result2["data"][CONF_SITE_ID] == "S2"


async def test_site_step_shows_form_when_no_input(monkeypatch):
    _patch_cloud(monkeypatch)
    flow = _flow()
    flow._sites = [{"siteId": "S1", "title": "Home"}, {"siteId": "S2"}]
    result = await flow.async_step_site()
    assert result["type"] == "form" and result["step_id"] == "site"


async def test_create_entry_handles_site_fetch_error(monkeypatch):
    _patch_cloud(monkeypatch, sites=[{"siteId": "S1"}], site=PlejdCloudError("nope"))
    result = await _flow().async_step_user(_LOGIN)
    assert result["type"] == "form" and result["errors"] == {"base": "cannot_connect"}


async def test_bluetooth_step_routes_to_user(monkeypatch):
    flow = _flow()
    info = types.SimpleNamespace(address="AA:BB:CC:DD:EE:FF", name="Plejd DIM-01")
    result = await flow.async_step_bluetooth(info)
    assert result["type"] == "form" and result["step_id"] == "user"
    assert flow._discovered_address == "AA:BB:CC:DD:EE:FF"
    assert flow.context["title_placeholders"] == {"name": "Plejd DIM-01"}


@pytest.mark.parametrize("title", [None, "Home"])
async def test_site_label_fallback(monkeypatch, title):
    _patch_cloud(
        monkeypatch, sites=[{"siteId": "S1", "title": "A"}, {"siteId": "S2", **({"title": title} if title else {})}]
    )
    flow = _flow()
    await flow.async_step_user(_LOGIN)
    result = await flow.async_step_site()
    assert result["step_id"] == "site"
