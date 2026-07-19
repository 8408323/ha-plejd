"""Tests for remote → light dim bindings (generic ramp + trigger-attach engine)."""

from __future__ import annotations

import asyncio
import types

import pytest
from plejd import bindings as bindings_mod
from plejd.bindings import DimRamp, PlejdDimBindings


async def _raise_disk_full(_data):
    raise OSError("disk full")


class _Services:
    def __init__(self):
        self.calls = []

    async def async_call(self, domain, service, data, blocking=False):
        self.calls.append((domain, service, data))


def _hass(data=None):
    return types.SimpleNamespace(services=_Services(), data=data if data is not None else {})


async def _noop_sleep(_seconds):
    return None


def _fake_monotonic(step=1.0):
    """A deterministic monotonic clock that advances `step` per call."""
    now = [0.0]

    def _mono():
        value = now[0]
        now[0] += step
        return value

    return _mono


# ── DimRamp ───────────────────────────────────────────────────────────────────


async def test_ramp_up_steps_brightness_up(monkeypatch):
    monkeypatch.setattr(bindings_mod.asyncio, "sleep", _noop_sleep)
    monkeypatch.setattr(bindings_mod.time, "monotonic", _fake_monotonic(1))  # 0,1,2,3,…
    hass = _hass()
    ramp = DimRamp(hass, step_pct=5, interval=1, max_duration=4)  # deadline 4 → 3 ticks
    ramp.start("b1", {"entity_id": ["light.a"]}, "up")
    await ramp._tasks["b1"]
    await asyncio.sleep(0)
    assert len(hass.services.calls) == 3
    assert hass.services.calls[0] == ("light", "turn_on", {"entity_id": ["light.a"], "brightness_step_pct": 5})


async def test_ramp_down_uses_negative_step(monkeypatch):
    monkeypatch.setattr(bindings_mod.asyncio, "sleep", _noop_sleep)
    monkeypatch.setattr(bindings_mod.time, "monotonic", _fake_monotonic(1))
    hass = _hass()
    ramp = DimRamp(hass, step_pct=7, interval=1, max_duration=3)
    ramp.start("b1", {"area_id": ["kitchen"]}, "down")
    await ramp._tasks["b1"]
    await asyncio.sleep(0)
    assert hass.services.calls[0] == ("light", "turn_on", {"area_id": ["kitchen"], "brightness_step_pct": -7})


async def test_ramp_logs_and_forgets_when_service_call_fails(monkeypatch):
    monkeypatch.setattr(bindings_mod.time, "monotonic", _fake_monotonic(1))
    hass = _hass()

    async def _boom(domain, service, data, blocking=False):
        raise RuntimeError("light unavailable")

    hass.services.async_call = _boom
    logged = []
    monkeypatch.setattr(bindings_mod._LOGGER, "warning", lambda *a, **k: logged.append((a, k)))
    ramp = DimRamp(hass, interval=1, max_duration=4)
    ramp.start("b1", {"entity_id": ["light.a"]}, "up")
    await asyncio.sleep(0)
    await asyncio.sleep(0)
    assert "b1" not in ramp._tasks  # forgotten, exception retrieved (no "never retrieved" warning)
    assert logged and isinstance(logged[0][1]["exc_info"], RuntimeError)


async def test_ramp_empty_target_is_noop():
    hass = _hass()
    ramp = DimRamp(hass)
    ramp.start("b1", {}, "up")
    assert "b1" not in ramp._tasks and hass.services.calls == []


async def test_ramp_stop_cancels():
    hass = _hass()
    ramp = DimRamp(hass, interval=3600)  # parks at the sleep after the first call
    ramp.start("b1", {"entity_id": ["light.a"]}, "up")
    await asyncio.sleep(0)
    task = ramp._tasks["b1"]
    ramp.stop("b1")
    await asyncio.sleep(0)
    await asyncio.sleep(0)
    assert task.cancelled()
    assert "b1" not in ramp._tasks
    assert len(hass.services.calls) == 1  # one step before parking


async def test_ramp_stop_unknown_is_noop():
    DimRamp(_hass()).stop("nope")  # must not raise


async def test_ramp_restart_replaces_task():
    hass = _hass()
    ramp = DimRamp(hass, interval=3600)
    ramp.start("b1", {"entity_id": ["light.a"]}, "up")
    await asyncio.sleep(0)
    first = ramp._tasks["b1"]
    ramp.start("b1", {"entity_id": ["light.a"]}, "down")
    await asyncio.sleep(0)
    assert first.cancelled() and ramp._tasks["b1"] is not first
    ramp.shutdown()


async def test_ramp_shutdown_cancels_all():
    hass = _hass()
    ramp = DimRamp(hass, interval=3600)
    ramp.start("b1", {"entity_id": ["light.a"]}, "up")
    ramp.start("b2", {"entity_id": ["light.b"]}, "up")
    await asyncio.sleep(0)
    tasks = [ramp._tasks["b1"], ramp._tasks["b2"]]
    ramp.shutdown()
    await asyncio.sleep(0)
    assert all(t.cancelled() for t in tasks) and ramp._tasks == {}


async def test_ramp_uses_hass_background_task_when_available():
    created = []

    def _create(coro, name):
        created.append(name)
        return asyncio.ensure_future(coro)

    hass = types.SimpleNamespace(services=_Services(), async_create_background_task=_create, interval=3600)
    ramp = DimRamp(hass, interval=3600)
    ramp.start("b1", {"entity_id": ["light.a"]}, "up")
    await asyncio.sleep(0)
    assert created == ["plejd-dim-binding"]
    ramp.shutdown()


# ── PlejdDimBindings ──────────────────────────────────────────────────────────


def _spy_triggers(recorder):
    async def _init(hass, configs, action, domain, name, log_cb, **kwargs):
        recorder.append((configs, action))
        return lambda: recorder.append(("unsub",))

    return _init


class _SpyRamp:
    def __init__(self):
        self.calls = []

    def start(self, key, target, direction):
        self.calls.append(("start", key, target, direction))

    def stop(self, key):
        self.calls.append(("stop", key))

    def shutdown(self):
        self.calls.append(("shutdown",))


async def test_load_attaches_up_down_stop_and_actions_drive_ramp(monkeypatch):
    captured = []
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers(captured))
    binding = {
        "id": "b1",
        "targets": {"entity_id": ["light.kok"], "area_id": [], "device_id": []},
        "up": {"platform": "device", "type": "brightness_move_up"},
        "down": {"platform": "device", "type": "brightness_move_down"},
        "stop": {"platform": "device", "type": "brightness_stop"},
    }
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [binding]
    pb = PlejdDimBindings(hass)
    pb._ramp = _SpyRamp()
    await pb.async_load()
    assert pb.bindings == [binding]
    assert len(captured) == 3  # up, down, stop each attached
    # invoke each captured action and check it drives the ramp with the resolved target
    target = {"entity_id": ["light.kok"]}
    await captured[0][1]()  # up
    await captured[1][1]()  # down
    await captured[2][1]()  # stop
    assert pb._ramp.calls == [
        ("start", "b1", target, "up"),
        ("start", "b1", target, "down"),
        ("stop", "b1"),
    ]


async def test_replace_persists_and_reattaches(monkeypatch):
    captured = []
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers(captured))
    hass = _hass()
    pb = PlejdDimBindings(hass)
    await pb.async_load()  # empty
    assert pb.bindings == []
    new = [{"id": "b1", "targets": {"entity_id": ["light.a"]}, "up": {"x": 1}}]
    await pb.async_replace(new)
    assert pb.bindings == new
    assert hass.data[("store", bindings_mod.STORE_KEY)] == new  # persisted
    assert len(captured) == 1  # the one "up" trigger attached


async def test_replace_detaches_previous(monkeypatch):
    captured = []
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers(captured))
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [{"id": "b1", "targets": {"entity_id": ["light.a"]}, "up": {"x": 1}}]
    pb = PlejdDimBindings(hass)
    await pb.async_load()
    await pb.async_replace([])  # remove all
    assert ("unsub",) in captured  # the previous trigger was detached


async def test_load_survives_a_bad_binding(monkeypatch):
    calls = []

    async def _init(hass, configs, action, domain, name, log_cb, **kwargs):
        calls.append(configs)
        if configs == [{"bad": 1}]:
            raise ValueError("stale device")
        return lambda: None

    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _init)
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [
        {"id": "bad", "targets": {"entity_id": ["light.a"]}, "up": {"bad": 1}},
        {"id": "good", "targets": {"entity_id": ["light.b"]}, "up": {"ok": 1}},
    ]
    pb = PlejdDimBindings(hass)
    await pb.async_load()  # must not raise
    assert [{"ok": 1}] in calls  # the good binding still attached


async def test_shutdown_detaches_and_stops_ramp(monkeypatch):
    captured = []
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers(captured))
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [{"id": "b1", "targets": {"entity_id": ["light.a"]}, "up": {"x": 1}}]
    pb = PlejdDimBindings(hass)
    pb._ramp = _SpyRamp()
    await pb.async_load()
    pb.shutdown()
    assert ("unsub",) in captured and ("shutdown",) in pb._ramp.calls


async def test_attach_rolls_back_partial_binding_on_failure(monkeypatch):
    events = []

    async def _init(hass, configs, action, domain, name, log_cb, **kwargs):
        events.append(("attach", configs))
        if configs == [{"boom": 1}]:
            raise ValueError("stop trigger invalid")

        def _unsub():
            events.append(("unsub", configs))

        return _unsub

    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _init)
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [
        {"id": "b1", "targets": {"entity_id": ["light.a"]}, "up": {"ok": 1}, "stop": {"boom": 1}},
    ]
    pb = PlejdDimBindings(hass)
    await pb.async_load()  # the per-binding guard logs the failure
    # the already-attached "up" trigger is rolled back, so no half-attached ramp lingers
    assert ("attach", [{"ok": 1}]) in events and ("unsub", [{"ok": 1}]) in events
    assert pb._unsubs == []


async def test_replace_keeps_old_bindings_when_save_fails(monkeypatch):
    captured = []
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers(captured))
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [{"id": "b1", "targets": {"entity_id": ["light.a"]}, "up": {"x": 1}}]
    pb = PlejdDimBindings(hass)
    await pb.async_load()
    old = pb.bindings
    pb._store.async_save = _raise_disk_full
    with pytest.raises(OSError):
        await pb.async_replace([{"id": "b2", "targets": {"entity_id": ["light.b"]}, "up": {"y": 1}}])
    assert pb.bindings == old  # in-memory bindings untouched, old triggers never detached
    assert ("unsub",) not in captured


async def test_load_stays_empty_when_legacy_id_save_fails(monkeypatch):
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers([]))
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [{"targets": {"entity_id": ["light.a"]}}]  # no id → forces a save
    pb = PlejdDimBindings(hass)
    pb._store.async_save = _raise_disk_full
    with pytest.raises(OSError):
        await pb.async_load()
    assert pb.bindings == []  # nothing committed → manager stays empty and consistent


async def test_replace_assigns_missing_ids(monkeypatch):
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers([]))
    hass = _hass()
    pb = PlejdDimBindings(hass)
    await pb.async_load()
    await pb.async_replace([{"targets": {"entity_id": ["light.a"]}}])  # no id supplied
    assert pb.bindings[0]["id"]  # assigned
    assert hass.data[("store", bindings_mod.STORE_KEY)][0]["id"]  # and persisted


async def test_replace_reassigns_duplicate_ids(monkeypatch):
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers([]))
    hass = _hass()
    pb = PlejdDimBindings(hass)
    await pb.async_load()
    await pb.async_replace(
        [
            {"id": "dup", "targets": {"entity_id": ["light.a"]}},
            {"id": "dup", "targets": {"entity_id": ["light.b"]}},
        ]
    )
    assert pb.bindings[0]["id"] == "dup"
    assert pb.bindings[1]["id"] != "dup"
    assert pb.bindings[0]["id"] != pb.bindings[1]["id"]


async def test_load_persists_ids_assigned_to_legacy_data(monkeypatch):
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers([]))
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [{"targets": {"entity_id": ["light.a"]}}]  # no id
    pb = PlejdDimBindings(hass)
    await pb.async_load()
    assert pb.bindings[0]["id"]  # assigned
    assert hass.data[("store", bindings_mod.STORE_KEY)][0]["id"]  # and saved back, so it's stable


async def test_load_persists_reassigned_duplicate_ids(monkeypatch):
    monkeypatch.setattr(bindings_mod, "async_initialize_triggers", _spy_triggers([]))
    hass = _hass()
    hass.data[("store", bindings_mod.STORE_KEY)] = [
        {"id": "dup", "targets": {"entity_id": ["light.a"]}},
        {"id": "dup", "targets": {"entity_id": ["light.b"]}},
    ]
    pb = PlejdDimBindings(hass)
    await pb.async_load()
    assert pb.bindings[0]["id"] == "dup"
    assert pb.bindings[1]["id"] != "dup"
    assert hass.data[("store", bindings_mod.STORE_KEY)][1]["id"] == pb.bindings[1]["id"]
