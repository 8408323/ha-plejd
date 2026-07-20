"""Tests for the schedule WebSocket API."""

from __future__ import annotations

import types

from plejd import schedule_ws
from plejd.schedule_ws import DATA_ENTRY, DATA_MANUAL_RELOAD


class _Conn:
    def __init__(self):
        self.result = None
        self.error = None

    def send_result(self, msg_id, payload):
        self.result = (msg_id, payload)

    def send_error(self, msg_id, code, message):
        self.error = (msg_id, code, message)


class _ConfigEntries:
    def __init__(self):
        self.updated = None
        self.reloaded = None
        self.reload_fails = False
        self.reload_ok = True

    def async_update_entry(self, entry, *, options):
        self.updated = options
        entry.options = options

    async def async_reload(self, entry_id):
        if self.reload_fails:
            raise RuntimeError("reload failed")
        self.reloaded = entry_id
        return self.reload_ok


class _Coordinator:
    def __init__(self, fails=False):
        self.removed = []
        self.fails = fails

    async def async_remove_time_event(self, slot):
        if self.fails:
            raise RuntimeError("BLE link dropped")
        self.removed.append(slot)


def _entry(options=None, scenes=None, runtime_data=None):
    return types.SimpleNamespace(
        entry_id="e1",
        options=options or {},
        data={"scenes": scenes if scenes is not None else [{"index": 3, "name": "Movie"}]},
        runtime_data=runtime_data,
    )


def _hass(entry=None, **kw):
    hass = types.SimpleNamespace(data={}, config_entries=_ConfigEntries(), **kw)
    if entry is not None:
        hass.data[DATA_ENTRY] = entry
    return hass


_SCHEDULE = {"id": 0, "slot": 1, "name": "Evening", "days": [0, 6], "time": "18:30:00", "scene": 3, "fade": 0}


# ── list ─────────────────────────────────────────────────────────────────────


async def test_list_returns_schedules_and_scenes():
    entry = _entry(options={"schedules": [_SCHEDULE]})
    conn = _Conn()
    await schedule_ws.ws_list(_hass(entry), conn, {"id": 7})
    assert conn.result == (7, {"schedules": [_SCHEDULE], "scenes": [{"index": 3, "name": "Movie"}]})


async def test_list_errors_when_not_loaded():
    conn = _Conn()
    await schedule_ws.ws_list(_hass(), conn, {"id": 7})
    assert conn.error == (7, "not_loaded", "Plejd is not loaded")
    assert conn.result is None


# ── add ──────────────────────────────────────────────────────────────────────


async def test_add_assigns_slot_and_id_then_reloads():
    entry = _entry(options={})
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_add(
        hass, conn, {"id": 1, "name": "Evening", "days": [0, 6], "time": "18:30", "scene": 3, "fade": 5}
    )
    sched = conn.result[1]["schedules"][0]
    assert sched == {
        "id": 0,
        "slot": 0,
        "name": "Evening",
        "days": [0, 6],
        "time": "18:30:00",
        "scene": 3,
        "fade": 5,
    }
    assert entry.options["schedules"] == [sched]
    assert entry.options["next_schedule_id"] == 1
    assert hass.config_entries.reloaded == "e1"


async def test_add_uses_next_free_slot():
    existing = [{"id": 0, "slot": 0, "name": "A", "days": [0], "time": "06:00:00", "scene": 3, "fade": 0}]
    entry = _entry(options={"schedules": existing, "next_schedule_id": 1})
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_add(hass, conn, {"id": 1, "name": "B", "days": [1], "time": "07:00", "scene": 3, "fade": 0})
    added = conn.result[1]["schedules"][1]
    assert added["slot"] == 1 and added["id"] == 1


async def test_add_defaults_fade_to_zero():
    entry = _entry(options={})
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_add(hass, conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": 0})
    assert conn.result[1]["schedules"][0]["fade"] == 0


async def test_add_errors_when_not_loaded():
    conn = _Conn()
    await schedule_ws.ws_add(_hass(), conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": 0})
    assert conn.error == (1, "not_loaded", "Plejd is not loaded")
    assert conn.result is None


async def test_add_rejects_blank_name():
    entry = _entry(options={})
    conn = _Conn()
    await schedule_ws.ws_add(
        _hass(entry), conn, {"id": 1, "name": "  ", "days": [0], "time": "06:00", "scene": 3, "fade": 0}
    )
    assert conn.error == (1, "name_required", "Name is required")


async def test_add_rejects_empty_days():
    entry = _entry(options={})
    conn = _Conn()
    await schedule_ws.ws_add(
        _hass(entry), conn, {"id": 1, "name": "X", "days": [], "time": "06:00", "scene": 3, "fade": 0}
    )
    assert conn.error[1] == "invalid_days"


async def test_add_rejects_out_of_range_day():
    entry = _entry(options={})
    conn = _Conn()
    await schedule_ws.ws_add(
        _hass(entry), conn, {"id": 1, "name": "X", "days": [7], "time": "06:00", "scene": 3, "fade": 0}
    )
    assert conn.error[1] == "invalid_days"


async def test_add_rejects_invalid_time():
    entry = _entry(options={})
    for bad in ("7", "25:00", "07:xx", ""):
        conn = _Conn()
        await schedule_ws.ws_add(
            _hass(entry), conn, {"id": 1, "name": "X", "days": [0], "time": bad, "scene": 3, "fade": 0}
        )
        assert conn.error[1] == "invalid_time", bad


async def test_add_rejects_unknown_scene():
    entry = _entry(options={})
    conn = _Conn()
    await schedule_ws.ws_add(
        _hass(entry), conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 99, "fade": 0}
    )
    assert conn.error[1] == "invalid_scene"


async def test_add_rejects_negative_fade():
    entry = _entry(options={})
    conn = _Conn()
    await schedule_ws.ws_add(
        _hass(entry), conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": -1}
    )
    assert conn.error[1] == "invalid_fade"


async def test_add_errors_when_no_free_slots():
    full = [
        {"id": i, "slot": i, "name": f"s{i}", "days": [0], "time": "07:00:00", "scene": 3, "fade": 0} for i in range(20)
    ]
    entry = _entry(options={"schedules": full})
    conn = _Conn()
    await schedule_ws.ws_add(
        _hass(entry), conn, {"id": 1, "name": "More", "days": [0], "time": "06:00", "scene": 3, "fade": 0}
    )
    assert conn.error == (1, "no_free_slots", "No free schedule slots")


async def test_add_returns_error_when_reload_fails():
    entry = _entry(options={})
    hass = _hass(entry)
    hass.config_entries.reload_fails = True
    conn = _Conn()
    await schedule_ws.ws_add(hass, conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": 0})
    assert conn.error == (1, "save_failed", "Could not save schedules")
    assert conn.result is None


async def test_add_returns_error_when_reload_reports_failure():
    # async_reload() can return False (e.g. setup entered retry) instead of raising.
    entry = _entry(options={})
    hass = _hass(entry)
    hass.config_entries.reload_ok = False
    conn = _Conn()
    await schedule_ws.ws_add(hass, conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": 0})
    assert conn.error == (1, "reload_failed", "Schedule saved, but Plejd failed to reload; try again")
    assert conn.result is None
    assert DATA_MANUAL_RELOAD not in hass.data


async def test_add_does_not_double_reload_via_update_listener():
    # DATA_MANUAL_RELOAD must be cleared once persist finishes so the entry's update
    # listener (_async_reload_entry) reloads normally on the next unrelated options change.
    entry = _entry(options={})
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_add(hass, conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": 0})
    assert DATA_MANUAL_RELOAD not in hass.data


async def test_add_resets_stale_gateway_transport_when_no_gateway():
    entry = _entry(options={"transport": "gateway"})  # entry.data has no gateways/resource_set_id
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_add(hass, conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": 0})
    assert entry.options["transport"] == "auto"


async def test_add_preserves_transport_when_gateway_present():
    entry = _entry(options={"transport": "gateway"})
    entry.data["gateways"] = ["GWY-1"]
    entry.data["resource_set_id"] = "rs1"
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_add(hass, conn, {"id": 1, "name": "X", "days": [0], "time": "06:00", "scene": 3, "fade": 0})
    assert entry.options["transport"] == "gateway"


# ── delete ───────────────────────────────────────────────────────────────────


async def test_delete_clears_device_event_and_reloads():
    coordinator = _Coordinator()
    entry = _entry(options={"schedules": [_SCHEDULE]}, runtime_data=coordinator)
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_delete(hass, conn, {"id": 2, "schedule_id": 0})
    assert conn.result == (2, {"schedules": []})
    assert entry.options["schedules"] == []
    assert coordinator.removed == [1]
    assert hass.config_entries.reloaded == "e1"


async def test_delete_persists_even_if_mesh_write_fails():
    coordinator = _Coordinator(fails=True)
    entry = _entry(options={"schedules": [_SCHEDULE]}, runtime_data=coordinator)
    conn = _Conn()
    await schedule_ws.ws_delete(_hass(entry), conn, {"id": 2, "schedule_id": 0})
    assert conn.result == (2, {"schedules": []})
    assert entry.options["schedules"] == []


async def test_delete_is_best_effort_when_mesh_unavailable():
    # runtime_data None -> async_remove_time_event raises AttributeError, swallowed.
    entry = _entry(options={"schedules": [_SCHEDULE]})
    conn = _Conn()
    await schedule_ws.ws_delete(_hass(entry), conn, {"id": 2, "schedule_id": 0})
    assert conn.result == (2, {"schedules": []})


async def test_delete_errors_when_not_loaded():
    conn = _Conn()
    await schedule_ws.ws_delete(_hass(), conn, {"id": 2, "schedule_id": 0})
    assert conn.error == (2, "not_loaded", "Plejd is not loaded")
    assert conn.result is None


async def test_delete_errors_when_schedule_not_found():
    entry = _entry(options={"schedules": [_SCHEDULE]})
    conn = _Conn()
    await schedule_ws.ws_delete(_hass(entry), conn, {"id": 2, "schedule_id": 999})
    assert conn.error == (2, "not_found", "Schedule not found")
    assert conn.result is None


async def test_delete_returns_error_when_reload_fails():
    coordinator = _Coordinator()
    entry = _entry(options={"schedules": [_SCHEDULE]}, runtime_data=coordinator)
    hass = _hass(entry)
    hass.config_entries.reload_fails = True
    conn = _Conn()
    await schedule_ws.ws_delete(hass, conn, {"id": 2, "schedule_id": 0})
    assert conn.error == (2, "save_failed", "Could not save schedules")
    assert conn.result is None


async def test_delete_returns_error_when_reload_reports_failure():
    coordinator = _Coordinator()
    entry = _entry(options={"schedules": [_SCHEDULE]}, runtime_data=coordinator)
    hass = _hass(entry)
    hass.config_entries.reload_ok = False
    conn = _Conn()
    await schedule_ws.ws_delete(hass, conn, {"id": 2, "schedule_id": 0})
    assert conn.error == (2, "reload_failed", "Schedule saved, but Plejd failed to reload; try again")
    assert conn.result is None


async def test_delete_resets_stale_gateway_transport_when_no_gateway():
    coordinator = _Coordinator()
    entry = _entry(options={"schedules": [_SCHEDULE], "transport": "gateway"}, runtime_data=coordinator)
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_delete(hass, conn, {"id": 2, "schedule_id": 0})
    assert entry.options["transport"] == "auto"


async def test_delete_preserves_concurrent_edit_made_during_mesh_clear():
    # A schedule added by another WS call while we awaited async_remove_time_event() must
    # survive the delete's persist instead of being overwritten by the pre-await snapshot.
    other = {"id": 5, "slot": 2, "name": "Other", "days": [1], "time": "07:00:00", "scene": 3, "fade": 0}

    class _ConcurrentCoordinator:
        def __init__(self, entry):
            self.entry = entry

        async def async_remove_time_event(self, slot):
            # Simulate a concurrent ws_add completing (and persisting) mid-await.
            self.entry.options = {**self.entry.options, "schedules": [*self.entry.options["schedules"], other]}

    entry = _entry(options={"schedules": [_SCHEDULE]})
    entry.runtime_data = _ConcurrentCoordinator(entry)
    hass = _hass(entry)
    conn = _Conn()
    await schedule_ws.ws_delete(hass, conn, {"id": 2, "schedule_id": 0})
    assert entry.options["schedules"] == [other]
    assert conn.result == (2, {"schedules": [other]})


# ── registration ─────────────────────────────────────────────────────────────


def test_async_register_registers_all_commands():
    hass = _hass()
    schedule_ws.async_register(hass)
    registered = hass.data["ws_commands"]
    assert schedule_ws.ws_list in registered
    assert schedule_ws.ws_add in registered
    assert schedule_ws.ws_delete in registered
