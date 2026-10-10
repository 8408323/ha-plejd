"""Tests for the dashboard's activity log."""

from __future__ import annotations

import types
from datetime import UTC, datetime

from homeassistant.helpers import entity_registry as er
from plejd import activity
from plejd.schedule_ws import DATA_ENTRY


class _Bus:
    def __init__(self):
        self.listeners = {}

    def async_listen(self, event_type, cb):
        self.listeners[event_type] = cb
        return lambda: self.listeners.pop(event_type)


class _Conn:
    def __init__(self):
        self.result = None
        self.error = None

    def send_result(self, msg_id, payload):
        self.result = (msg_id, payload)

    def send_error(self, msg_id, code, message):
        self.error = (msg_id, code, message)


def _ctx(id_="c1", user_id=None, parent_id=None):
    return types.SimpleNamespace(id=id_, user_id=user_id, parent_id=parent_id)


def _state(entity_id, state, ctx=None, **attrs):
    return types.SimpleNamespace(
        entity_id=entity_id,
        state=state,
        attributes={"friendly_name": entity_id.split(".")[1].title(), **attrs},
        context=ctx or _ctx(),
        last_changed=datetime(2026, 10, 10, 19, 5, tzinfo=UTC),
    )


def _change(old, new):
    return types.SimpleNamespace(event_type="state_changed", data={"old_state": old, "new_state": new})


def _hass(origin=None):
    reg = lambda uid, platform="plejd": types.SimpleNamespace(unique_id=uid, platform=platform)  # noqa: E731
    registry = er.EntityRegistry(
        {
            "light.kontor": reg("d1"),
            "light.room_kontor": reg("room_r1"),
            "light.other_brand": reg("x1", platform="hue"),
            "switch.relay": reg("d2"),
        }
    )
    coordinator = types.SimpleNamespace(
        devices=[
            types.SimpleNamespace(device_id="d1", output_index=0, address=42),
            types.SimpleNamespace(device_id="d2", output_index=0, address=None),
        ],
        toggle_origin=lambda address: origin,
    )
    users = {"u1": types.SimpleNamespace(name="Jonathan")}

    async def _get_user(user_id):
        return users.get(user_id)

    return types.SimpleNamespace(
        data={DATA_ENTRY: types.SimpleNamespace(runtime_data=coordinator)},
        bus=_Bus(),
        entity_registry=registry,
        auth=types.SimpleNamespace(async_get_user=_get_user),
    )


async def _log(hass):
    log = activity.PlejdActivityLog(hass)
    await log.async_load()
    log.async_start()
    hass.data[activity.DATA_ACTIVITY] = log
    return log


async def test_ha_user_change_is_logged_with_the_user_name():
    hass = await _log_hass()
    hass.bus.listeners["state_changed"](
        _change(_state("light.kontor", "off"), _state("light.kontor", "on", _ctx(user_id="u1"), brightness=128))
    )
    conn = _Conn()
    await activity.ws_list(hass, conn, {"id": 1, "limit": 10})
    assert conn.result[1]["entries"] == [
        {
            "t": "2026-10-10T19:05:00+00:00",
            "entity_id": "light.kontor",
            "name": "Kontor",
            "state": "on",
            "brightness": 50,
            "source": {"kind": "user", "user_id": "u1", "name": "Jonathan"},
        }
    ]


async def _log_hass(origin=None):
    hass = _hass(origin)
    await _log(hass)
    return hass


async def test_automation_and_script_runs_are_named():
    hass = await _log_hass()
    fire = hass.bus.listeners
    fire["automation_triggered"](
        types.SimpleNamespace(
            event_type="automation_triggered",
            context=_ctx("run1"),
            data={"name": "Kvällsljus", "entity_id": "automation.kvall"},
        )
    )
    fire["script_started"](
        types.SimpleNamespace(event_type="script_started", context=_ctx("run2"), data={"entity_id": "script.natt"})
    )
    fire["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on", _ctx("run1"))))
    fire["state_changed"](
        _change(_state("light.kontor", "on"), _state("light.kontor", "off", _ctx("x", parent_id="run2")))
    )
    log = hass.data[activity.DATA_ACTIVITY]
    assert [e["source"] for e in log.entries] == [
        {"kind": "automation", "name": "Kvällsljus", "entity_id": "automation.kvall"},
        {"kind": "script", "name": "script.natt", "entity_id": "script.natt"},
    ]


async def test_change_from_outside_ha_uses_the_mesh_origin_or_external():
    hass = await _log_hass(origin={"kind": "plejd_room", "name": "Kontor"})
    hass.bus.listeners["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on")))
    assert hass.data[activity.DATA_ACTIVITY].entries[-1]["source"] == {"kind": "plejd_room", "name": "Kontor"}

    hass = await _log_hass(origin=None)
    hass.bus.listeners["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on")))
    assert hass.data[activity.DATA_ACTIVITY].entries[-1]["source"] == {"kind": "external"}


async def test_alarm_change_names_who_changed_it_when_the_panel_knows():
    hass = await _log_hass()
    fire = hass.bus.listeners["state_changed"]
    alarm = "alarm_control_panel.verisure"
    fire(_change(_state(alarm, "disarmed"), _state(alarm, "armed_away", changed_by="Jonathan Haraldsson")))
    fire(_change(_state(alarm, "armed_away"), _state(alarm, "disarmed")))
    assert [(e["state"], e["source"]) for e in hass.data[activity.DATA_ACTIVITY].entries] == [
        ("armed_away", {"kind": "alarm", "name": "Jonathan Haraldsson"}),
        ("disarmed", {"kind": "external"}),
    ]


async def test_noise_and_unrelated_entities_are_not_logged():
    hass = await _log_hass()
    fire = hass.bus.listeners["state_changed"]
    fire(_change(None, _state("light.kontor", "on")))  # added
    fire(_change(_state("light.kontor", "on"), _state("light.kontor", "on", brightness=10)))  # attribute only
    fire(_change(_state("light.kontor", "unavailable"), _state("light.kontor", "on")))  # reconnect
    fire(_change(_state("light.room_kontor", "off"), _state("light.room_kontor", "on")))  # room group light
    fire(_change(_state("light.other_brand", "off"), _state("light.other_brand", "on")))  # not Plejd
    fire(_change(_state("switch.relay", "off"), _state("switch.relay", "on")))  # Plejd, but no address
    fire(_change(_state("sensor.temp", "1"), _state("sensor.temp", "2")))  # other domain
    fire(_change(_state("light.unregistered", "off"), _state("light.unregistered", "on")))
    assert hass.data[activity.DATA_ACTIVITY].entries == []


async def test_without_a_loaded_coordinator_plejd_entities_are_skipped():
    hass = _hass()
    hass.data[DATA_ENTRY] = None
    log = await _log(hass)
    hass.bus.listeners["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on")))
    assert log.entries == []


async def test_log_is_capped_persisted_and_reloaded(monkeypatch):
    monkeypatch.setattr(activity, "MAX_ENTRIES", 3)
    hass = await _log_hass()
    for i in range(5):
        old, new = ("off", "on") if i % 2 == 0 else ("on", "off")
        hass.bus.listeners["state_changed"](_change(_state("light.kontor", old), _state("light.kontor", new)))
    assert len(hass.data[activity.DATA_ACTIVITY].entries) == 3
    reloaded = activity.PlejdActivityLog(hass)
    await reloaded.async_load()
    assert reloaded.entries == hass.data[activity.DATA_ACTIVITY].entries


async def test_run_contexts_are_bounded(monkeypatch):
    monkeypatch.setattr(activity, "_MAX_CONTEXTS", 2)
    hass = await _log_hass()
    for i in range(3):
        hass.bus.listeners["automation_triggered"](
            types.SimpleNamespace(event_type="automation_triggered", context=_ctx(f"r{i}"), data={"entity_id": "a"})
        )
    assert list(hass.data[activity.DATA_ACTIVITY]._runs) == ["r1", "r2"]


async def test_stop_removes_the_listeners():
    hass = await _log_hass()
    hass.data[activity.DATA_ACTIVITY].async_stop()
    assert hass.bus.listeners == {}


async def test_list_errors_when_not_loaded_and_keeps_unknown_user_ids():
    conn = _Conn()
    await activity.ws_list(types.SimpleNamespace(data={}), conn, {"id": 1, "limit": 5})
    assert conn.error == (1, "not_loaded", "Plejd is not loaded")

    hass = await _log_hass()
    for user in ("gone", "gone"):
        hass.bus.listeners["state_changed"](
            _change(_state("light.kontor", "off"), _state("light.kontor", "on", _ctx(user_id=user)))
        )
    await activity.ws_list(hass, conn, {"id": 2, "limit": 5})
    assert [e["source"]["name"] for e in conn.result[1]["entries"]] == ["gone", "gone"]


def test_async_register_registers_the_command():
    hass = types.SimpleNamespace(data={})
    activity.async_register(hass)
    assert activity.ws_list in hass.data["ws_commands"]
