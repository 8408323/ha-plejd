"""Tests for the Plejd config flow."""

from __future__ import annotations

import types

import pytest
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from plejd import config_flow as cf
from plejd.cloud import (
    PlejdAuthError,
    PlejdCloudDevice,
    PlejdCloudError,
    PlejdCloudInput,
    PlejdCloudMotion,
    PlejdCloudScene,
    PlejdCloudSite,
)
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
        output_index=0,
        outputs=[11],
        hardware_id=1,
        model="DIM-01",
        category="light",
        dimmable=True,
        traits=3,
        room_id="r1",
    )
    scene = PlejdCloudScene("sc1", "Movie", 3)
    return PlejdCloudSite(
        site_id=site_id,
        title="Home",
        crypto_key=bytes(16),
        devices=[dev],
        inputs=[PlejdCloudInput("d1", "Kitchen", 11)],
        motion=[PlejdCloudMotion("w1", "Motion", 33)],
        scenes=[scene],
    )


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


def _opt_flow(options=None, scenes=None, runtime_data=None):
    entry = types.SimpleNamespace(
        options=options or {},
        data={"scenes": scenes if scenes is not None else [{"index": 3, "name": "Movie"}]},
        runtime_data=runtime_data,
    )
    return cf.PlejdOptionsFlow(entry)


def test_get_options_flow_returns_options_flow():
    flow = cf.PlejdConfigFlow.async_get_options_flow(types.SimpleNamespace())
    assert isinstance(flow, cf.PlejdOptionsFlow)


async def test_options_form_shown_first_time():
    res = await _opt_flow().async_step_init()
    assert res["type"] == "form" and res["step_id"] == "init"


async def test_options_form_with_existing_offers_delete():
    existing = [{"slot": 0, "name": "X", "days": [0], "time": "07:00", "scene": 1, "fade": 0}]
    res = await _opt_flow(options={"schedules": existing}).async_step_init()
    assert res["type"] == "form"


async def test_options_add_schedule_assigns_slot_and_maps_days():
    res = await _opt_flow().async_step_init(
        {"name": "Evening", "days": ["mon", "sun"], "time": "18:30", "scene": "3", "fade": 5}
    )
    sched = res["data"]["schedules"]
    assert len(sched) == 1
    assert sched[0]["slot"] == 0 and sched[0]["days"] == [0, 6] and sched[0]["scene"] == 3 and sched[0]["fade"] == 5
    assert sched[0]["id"] == 0 and sched[0]["time"] == "18:30:00"  # normalized
    assert res["data"]["next_schedule_id"] == 1


async def test_options_add_uses_monotonic_id_not_slot():
    opts = {"schedules": [], "next_schedule_id": 7}
    res = await _opt_flow(options=opts).async_step_init({"name": "X", "time": "06:00", "scene": "3"})
    assert res["data"]["schedules"][0]["id"] == 7 and res["data"]["next_schedule_id"] == 8


async def test_options_add_without_scene_errors():
    res = await _opt_flow().async_step_init({"name": "X", "time": "06:00"})
    assert res["type"] == "form" and res["errors"] == {"base": "scene_required"}


async def test_options_add_with_invalid_time_errors():
    for bad in ("7", "25:00", "07:xx", ""):
        res = await _opt_flow().async_step_init({"name": "X", "time": bad, "scene": "3"})
        assert res["type"] == "form" and res["errors"] == {"time": "invalid_time"}, bad


async def test_options_delete_schedule_clears_device_event():
    existing = [{"slot": 0, "name": "X", "days": [0], "time": "07:00", "scene": 1, "fade": 0}]
    removed = []

    class _Coord:
        async def async_remove_time_event(self, slot):
            removed.append(slot)

    flow = _opt_flow(options={"schedules": existing}, runtime_data=_Coord())
    res = await flow.async_step_init({"delete": ["0"]})
    assert res["data"]["schedules"] == [] and removed == [0]


async def test_options_delete_when_mesh_unavailable_is_best_effort():
    existing = [{"slot": 0, "name": "X", "days": [0], "time": "07:00", "scene": 1, "fade": 0}]
    # runtime_data None -> async_remove_time_event raises AttributeError, swallowed.
    res = await _opt_flow(options={"schedules": existing}).async_step_init({"delete": ["0"]})
    assert res["data"]["schedules"] == []


async def test_options_delete_persists_even_if_ble_write_fails():
    existing = [{"slot": 0, "name": "X", "days": [0], "time": "07:00", "scene": 1, "fade": 0}]

    class _Coord:
        async def async_remove_time_event(self, slot):
            raise RuntimeError("BLE link dropped")  # transport error, not HomeAssistantError

    res = await _opt_flow(options={"schedules": existing}, runtime_data=_Coord()).async_step_init({"delete": ["0"]})
    assert res["data"]["schedules"] == []


async def test_options_save_without_adding():
    existing = [{"slot": 2, "name": "Keep", "days": [1], "time": "08:00", "scene": 1, "fade": 0}]
    res = await _opt_flow(options={"schedules": existing}).async_step_init({"name": "", "delete": []})
    assert res["data"]["schedules"] == existing


async def test_options_no_free_slots_errors():
    full = [{"slot": i, "name": f"s{i}", "days": [0], "time": "07:00", "scene": 1, "fade": 0} for i in range(20)]
    res = await _opt_flow(options={"schedules": full}).async_step_init({"name": "More", "time": "06:00", "scene": "3"})
    assert res["type"] == "form" and res["errors"] == {"base": "no_free_slots"}
