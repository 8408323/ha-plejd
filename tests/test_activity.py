"""Tests for the dashboard's activity log."""

from __future__ import annotations

import types
from datetime import UTC, datetime

import pytest
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
    def reg(uid, platform="plejd", **kw):
        defaults = {"config_entry_id": "e1", "device_id": None, "area_id": None, "labels": set()}
        return types.SimpleNamespace(unique_id=uid, platform=platform, **{**defaults, **kw})

    registry = er.EntityRegistry(
        {
            "light.kontor": reg("d1"),
            "light.room_kontor": reg("room_r1", entity_id="light.room_kontor", device_id="dev_room"),
            "light.other_brand": reg("x1", platform="hue"),
            "switch.relay": reg("d2"),
            "cover.blind": reg("d1"),
        }
    )
    coordinator = types.SimpleNamespace(
        devices=[
            types.SimpleNamespace(device_id="d1", output_index=0, address=42),
            types.SimpleNamespace(device_id="d2", output_index=0, address=None),
        ],
        rooms=[types.SimpleNamespace(room_id="r1", member_addresses=[42])],
        toggle_origin=lambda address: origin,
    )
    users = {"u1": types.SimpleNamespace(name="Jonathan")}

    async def _get_user(user_id):
        return users.get(user_id)

    group_states = {
        "group.downstairs": types.SimpleNamespace(attributes={"entity_id": ["group.inner", "light.other"]}),
        "group.inner": types.SimpleNamespace(attributes={"entity_id": ["light.room_kontor", "group.downstairs"]}),
    }
    return types.SimpleNamespace(
        states=types.SimpleNamespace(get=group_states.get),
        data={DATA_ENTRY: types.SimpleNamespace(runtime_data=coordinator, entry_id="e1")},
        device_registry=types.SimpleNamespace(
            async_get=lambda device_id: (
                types.SimpleNamespace(area_id="kontor", labels={"dev-label"}) if device_id == "dev_room" else None
            )
        ),
        area_registry=types.SimpleNamespace(
            async_get_area=lambda area_id: (
                types.SimpleNamespace(floor_id="upstairs", labels={"area-label"}) if area_id == "kontor" else None
            )
        ),
        bus=_Bus(),
        entity_registry=registry,
        auth=types.SimpleNamespace(async_get_user=_get_user),
    )


async def _log(hass):
    log = activity.PlejdActivityLog(hass, hass.data[DATA_ENTRY])
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
    fire(_change(_state("cover.blind", "open"), _state("cover.blind", "closed")))  # covers aren't logged
    fire(_change(_state("light.unregistered", "off"), _state("light.unregistered", "on")))
    assert hass.data[activity.DATA_ACTIVITY].entries == []


async def test_without_a_loaded_coordinator_plejd_entities_are_skipped():
    hass = _hass()
    hass.data[DATA_ENTRY].runtime_data = None
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
    reloaded = activity.PlejdActivityLog(hass, hass.data[DATA_ENTRY])
    await reloaded.async_load()
    assert reloaded.entries == hass.data[activity.DATA_ACTIVITY].entries


async def test_run_contexts_are_kept_for_a_day_and_bounded(monkeypatch):
    clock = [1000.0]
    monkeypatch.setattr(activity.time, "monotonic", lambda: clock[0])
    monkeypatch.setattr(activity, "_MAX_CONTEXTS", 3)
    hass = await _log_hass()

    def run(cid):
        hass.bus.listeners["automation_triggered"](
            types.SimpleNamespace(event_type="automation_triggered", context=_ctx(cid), data={"entity_id": "a"})
        )

    run("old")
    clock[0] += 20 * 3600
    run("r1")  # a run that waits for hours still has its context...
    assert list(hass.data[activity.DATA_ACTIVITY]._runs) == ["old", "r1"]
    clock[0] += 5 * 3600
    run("r2")  # ...but one older than a day is dropped
    assert list(hass.data[activity.DATA_ACTIVITY]._runs) == ["r1", "r2"]
    run("r3")
    run("r4")  # and the count stays bounded
    assert list(hass.data[activity.DATA_ACTIVITY]._runs) == ["r2", "r3", "r4"]


async def test_failed_load_never_overwrites_the_stored_log(monkeypatch):
    hass = _hass()
    hass.data[("store", "plejd.activity.e1")] = {"entries": [{"kept": True}]}
    log = activity.PlejdActivityLog(hass, hass.data[DATA_ENTRY])

    async def _fail():
        raise ValueError("newer storage version")

    monkeypatch.setattr(log._store, "async_load", _fail)
    with pytest.raises(ValueError):  # setup catches this and starts the log anyway
        await log.async_load()
    log.async_start()
    hass.bus.listeners["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on")))
    await log.async_stop()
    assert log.entries[-1]["state"] == "on"  # still logged in memory
    assert hass.data[("store", "plejd.activity.e1")] == {"entries": [{"kept": True}]}  # but the store is untouched


async def test_stop_removes_the_listeners_and_flushes_pending_entries():
    hass = await _log_hass()
    log = hass.data[activity.DATA_ACTIVITY]
    log._store.async_delay_save = lambda *a, **k: None  # a delayed save that hasn't run yet
    hass.bus.listeners["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on")))
    await log.async_stop()
    assert hass.bus.listeners == {}
    reloaded = activity.PlejdActivityLog(hass, hass.data[DATA_ENTRY])  # what a reload's new log sees
    await reloaded.async_load()
    assert [e["state"] for e in reloaded.entries] == ["on"]


async def test_each_setup_has_its_own_log_and_removing_it_deletes_it():
    hass = await _log_hass()
    hass.bus.listeners["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on")))
    other = activity.PlejdActivityLog(hass, types.SimpleNamespace(entry_id="e2"))
    await other.async_load()
    assert other.entries == []
    await activity.async_remove_store(hass, "e1")
    gone = activity.PlejdActivityLog(hass, hass.data[DATA_ENTRY])
    await gone.async_load()
    assert gone.entries == []


async def test_a_script_called_by_an_automation_keeps_the_automation_as_source():
    hass = await _log_hass()
    fire = hass.bus.listeners
    fire["automation_triggered"](
        types.SimpleNamespace(
            event_type="automation_triggered", context=_ctx("run"), data={"name": "Kväll", "entity_id": "automation.k"}
        )
    )
    fire["script_started"](
        types.SimpleNamespace(event_type="script_started", context=_ctx("run"), data={"entity_id": "script.s"})
    )
    fire["state_changed"](_change(_state("light.kontor", "off"), _state("light.kontor", "on", _ctx("run"))))
    assert hass.data[activity.DATA_ACTIVITY].entries[-1]["source"]["kind"] == "automation"


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


def _room_call(hass, ctx, service="turn_on", domain="light", **target):
    hass.bus.listeners["call_service"](
        types.SimpleNamespace(context=ctx, data={"domain": domain, "service": service, "service_data": target})
    )


def _member(hass, old, new):
    hass.bus.listeners["state_changed"](_change(_state("light.kontor", old), _state("light.kontor", new)))
    return hass.data[activity.DATA_ACTIVITY].entries[-1]["source"]


async def test_room_command_from_ha_is_credited_to_the_one_transition_it_caused(monkeypatch):
    clock = [100.0]
    monkeypatch.setattr(activity.time, "monotonic", lambda: clock[0])
    hass = await _log_hass()
    _room_call(hass, _ctx(user_id="u1"), entity_id="light.room_kontor")
    assert _member(hass, "off", "on") == {"kind": "user", "user_id": "u1"}
    assert _member(hass, "on", "off") == {"kind": "external"}  # consumed: a second change isn't credited

    _room_call(hass, _ctx(user_id="u1"), entity_id="light.room_kontor")  # turn_on to a member that is already on...
    assert _member(hass, "on", "off") == {"kind": "external"}  # ...is used up by the next (off) transition...
    assert _member(hass, "off", "on") == {"kind": "external"}  # ...so a later outside "on" isn't credited to it

    _room_call(hass, _ctx(user_id="u1"), service="turn_on", entity_id=["light.room_kontor"])
    assert _member(hass, "on", "off") == {"kind": "external"}  # wrong direction for turn_on
    clock[0] += 20
    assert _member(hass, "off", "on") == {"kind": "external"}  # outside the window

    _room_call(hass, _ctx(user_id="u1"), service="toggle", entity_id="light.room_kontor")
    assert _member(hass, "on", "off") == {"kind": "user", "user_id": "u1"}  # toggle: either direction


async def test_room_command_targeted_by_device_area_or_label_is_credited():
    hass = await _log_hass()
    reg = hass.entity_registry.async_get("light.room_kontor")
    reg.labels = {"evening"}
    for target in (
        {"entity_id": "all"},
        {"entity_id": "group.downstairs"},  # a nested (and self-referencing) legacy group
        {"device_id": "dev_room"},
        {"area_id": ["kontor"]},
        {"floor_id": "upstairs"},
        {"label_id": "evening"},  # on the entity
        {"label_id": "dev-label"},  # on its device
        {"label_id": "area-label"},  # on its area
    ):
        _room_call(hass, _ctx(user_id="u1"), **target)
        assert _member(hass, "off", "on") == {"kind": "user", "user_id": "u1"}, target
        _member(hass, "on", "off")
    reg.area_id = "office"  # an entity's own area wins over its device's
    _room_call(hass, _ctx(user_id="u1"), area_id="kontor")
    assert _member(hass, "off", "on") == {"kind": "external"}


async def test_room_calls_that_are_not_credited():
    hass = await _log_hass()
    _room_call(hass, _ctx(), entity_id="light.room_kontor")  # no HA source
    _room_call(hass, _ctx(user_id="u1"), entity_id=["light.kontor", "light.unregistered"])  # not a room
    _room_call(hass, _ctx(user_id="u1"), domain="switch", entity_id="light.room_kontor")  # not a light call
    _room_call(hass, _ctx(user_id="u1"), area_id="elsewhere")  # targets something else
    _room_call(hass, _ctx(user_id="u1"), service="stop_dim", entity_id="light.room_kontor")  # switches nothing
    assert _member(hass, "off", "on") == {"kind": "external"}
    hass.entity_registry._entities.pop("light.room_kontor")  # room light not registered
    _room_call(hass, _ctx(user_id="u1"), device_id="dev_room")
    assert _member(hass, "on", "off") == {"kind": "external"}


async def test_room_commands_are_ignored_without_a_loaded_coordinator():
    hass = await _log_hass()
    hass.data[DATA_ENTRY].runtime_data = None
    hass.bus.listeners["call_service"](
        types.SimpleNamespace(
            context=_ctx(user_id="u1"),
            data={"domain": "light", "service": "turn_on", "service_data": {"entity_id": "light.room_kontor"}},
        )
    )
    assert hass.data[activity.DATA_ACTIVITY]._room_commands == {}


async def test_all_off_service_is_credited_to_whoever_called_it():
    hass = await _log_hass()
    hass.bus.listeners["call_service"](
        types.SimpleNamespace(
            context=_ctx(user_id="u1"), data={"domain": "plejd", "service": "all_off", "service_data": {}}
        )
    )
    assert _member(hass, "on", "off") == {"kind": "user", "user_id": "u1"}
    hass.bus.listeners["call_service"](  # called from outside HA (no user or run): nothing to credit
        types.SimpleNamespace(context=_ctx(), data={"domain": "plejd", "service": "all_off", "service_data": {}})
    )
    assert _member(hass, "on", "off") == {"kind": "external"}


async def test_an_alarm_with_a_non_numeric_brightness_attribute_is_still_logged():
    hass = await _log_hass()
    alarm = "alarm_control_panel.v"
    hass.bus.listeners["state_changed"](
        _change(_state(alarm, "disarmed"), _state(alarm, "armed_home", brightness="high"))
    )
    entry = hass.data[activity.DATA_ACTIVITY].entries[-1]
    assert entry["state"] == "armed_home" and "brightness" not in entry
