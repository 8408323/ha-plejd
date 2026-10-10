"""Tests for reading sunset/sunrise schedules (astroEvents) back from the cloud."""

from __future__ import annotations

import types

import pytest
from plejd import schedule_ws
from plejd.cloud import PlejdAuthError, PlejdCloudError, parse_astro_events
from plejd.schedule_ws import DATA_ENTRY

_EVENT = {
    "astroEventId": "ae1",
    "sceneId": "sc9",
    "fadeTime": 2,
    "activated": True,
    "sunsetOffset": 15,
    "sunriseOffset": -10,
    "scheduledDays": [6, 0, 1, "x"],
    "targetDevices": [{"deviceId": "d1", "index": 0}, {"deviceId": "d1", "index": 1}, {"index": 2}],
    "nightReduction": {
        "startTime": "23:00",
        "endTime": "05:00",
        "sceneId": "sc10",
        "weekendDeviation": {"startTime": "01:00", "endTime": "06:00"},
    },
    "dirtyRemove": False,
}
_SITE = {
    "siteId": "S1",
    "title": "Home",
    "plejdMesh": {"cryptoKey": "00112233445566778899aabbccddeeff"},
    "deviceAddress": {"d1": 1},
    "outputAddress": {"d1": {"0": 11}},
    "plejdDevices": [{"deviceId": "d1", "hardwareId": "1"}],
    "devices": [{"deviceId": "d1", "title": "Kontor", "roomId": "r1", "outputType": "LIGHT"}],
    "scenes": [{"sceneId": "sc9", "title": "Kvällsljus", "hiddenFromSceneList": True}],
    "astroEvents": [_EVENT],
}


def test_parse_astro_events_reads_an_app_schedule():
    (ev,) = parse_astro_events(_SITE)
    assert (ev.schedule_id, ev.scene_id, ev.fade_time, ev.activated) == ("ae1", "sc9", 2, True)
    assert (ev.sunset_offset, ev.sunrise_offset) == (15, -10)
    assert ev.scheduled_days == [0, 1, 6] and ev.device_ids == ["d1"]
    assert ev.night_reduction == {
        "start_time": "23:00",
        "end_time": "05:00",
        "scene_id": "sc10",
        "weekend_start_time": "01:00",
        "weekend_end_time": "06:00",
    }


def test_parse_astro_events_defaults_missing_fields():
    (ev,) = parse_astro_events({"astroEvents": [{"astroEventId": "a", "sceneId": "s", "nightReduction": {}}]})
    assert (ev.fade_time, ev.activated, ev.sunset_offset, ev.sunrise_offset) == (0, True, 0, 0)
    assert ev.scheduled_days == [] and ev.device_ids == []
    assert ev.night_reduction["weekend_start_time"] is None


def test_parse_astro_events_skips_removed_and_malformed():
    site = {
        "astroEvents": [{**_EVENT, "dirtyRemove": True}, {"sceneId": "s"}, "junk", {**_EVENT, "nightReduction": None}]
    }
    (ev,) = parse_astro_events(site)
    assert ev.night_reduction is None
    assert parse_astro_events({"astroEvents": "nope"}) == []


class _Conn:
    def __init__(self):
        self.result = self.error = None

    def send_result(self, msg_id, payload):
        self.result = (msg_id, payload)

    def send_error(self, msg_id, code, message):
        self.error = (msg_id, code, message)


def _hass(tracked=()):
    entry = types.SimpleNamespace(
        data={"email": "u", "password": "p", "site_id": "S1", "cloud_schedules": [{"schedule_id": t} for t in tracked]},
        reauth=False,
    )
    entry.async_start_reauth = lambda hass: setattr(entry, "reauth", True)
    return types.SimpleNamespace(data={DATA_ENTRY: entry}), entry


@pytest.fixture
def cloud(monkeypatch):
    state = {"site": [_SITE], "login_error": None}

    async def login(session, email, password):
        if state["login_error"]:
            raise state["login_error"]
        return "t"

    async def raw(session, token, site_id):
        return state["site"]

    monkeypatch.setattr(schedule_ws, "async_get_clientsession", lambda hass: None)
    monkeypatch.setattr(schedule_ws, "async_login", login)
    monkeypatch.setattr(schedule_ws, "async_get_site_raw", raw)
    return state


async def test_cloud_list_names_devices_and_scenes_and_flags_app_schedules(cloud):
    hass, _ = _hass()
    conn = _Conn()
    await schedule_ws.ws_cloud_list(hass, conn, {"id": 1})
    (sched,) = conn.result[1]["schedules"]
    assert sched["schedule_id"] == "ae1" and sched["scene_name"] == "Kvällsljus"
    assert sched["devices"] == ["Kontor"] and sched["from_app"] is True


async def test_cloud_list_marks_integration_created_schedules(cloud):
    hass, _ = _hass(tracked=["ae1"])
    conn = _Conn()
    await schedule_ws.ws_cloud_list(hass, conn, {"id": 1})
    assert conn.result[1]["schedules"][0]["from_app"] is False


async def test_cloud_list_errors_when_not_loaded():
    conn = _Conn()
    await schedule_ws.ws_cloud_list(types.SimpleNamespace(data={}), conn, {"id": 1})
    assert conn.error == (1, "not_loaded", "Plejd is not loaded")


async def test_cloud_list_starts_reauth_on_rejected_credentials(cloud):
    cloud["login_error"] = PlejdAuthError("bad")
    hass, entry = _hass()
    conn = _Conn()
    await schedule_ws.ws_cloud_list(hass, conn, {"id": 1})
    assert conn.error[1] == "auth_failed" and entry.reauth is True


async def test_cloud_list_reports_cloud_errors(cloud):
    cloud["login_error"] = PlejdCloudError("down")
    hass, _ = _hass()
    conn = _Conn()
    await schedule_ws.ws_cloud_list(hass, conn, {"id": 1})
    assert conn.error == (1, "cloud_error", "Plejd cloud error: down")


async def test_cloud_list_rejects_a_malformed_site(cloud):
    cloud["site"] = []
    hass, _ = _hass()
    conn = _Conn()
    await schedule_ws.ws_cloud_list(hass, conn, {"id": 1})
    assert conn.error == (1, "cloud_error", "Plejd cloud error: malformed site response")
