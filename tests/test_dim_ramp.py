"""Tests for the remote hold-to-dim ramp engine."""

from __future__ import annotations

import asyncio
import types

from plejd.const import CATEGORY_LIGHT
from plejd.dim_ramp import DIM_MAX, DIM_MIN, PlejdDimRamp, resolve_addresses
from plejd.protocol import OutputState


class _FakeCoord:
    def __init__(self, states=None, devices=()):
        self._states = states or {}
        self.devices = list(devices)
        self.sets: list[tuple[int, bool, int]] = []

    def state_for(self, address):
        return self._states.get(address)

    async def async_set_output(self, address, on, level):
        self.sets.append((address, on, level))


def _ramp(coord, **kw):
    # No async_create_background_task on this fake hass → _spawn uses asyncio.ensure_future.
    return PlejdDimRamp(types.SimpleNamespace(), coord, **kw)


async def _drain():
    # let scheduled done-callbacks / cancellations run
    await asyncio.sleep(0)
    await asyncio.sleep(0)


# Completion tests use interval=0 (steps back-to-back, no real delay); cancel/restart
# tests use a long interval so the ramp is parked mid-sleep when we cancel it. No
# monkeypatching of asyncio.sleep — patching it globally would also break the tests'
# own asyncio.sleep(0) scheduling yields.
PARKED = 3600


# ── ramp behaviour ────────────────────────────────────────────────────────────


async def test_ramp_up_from_off_reaches_max():
    coord = _FakeCoord()  # address 11 off/unknown
    ramp = _ramp(coord, step=100, interval=0)
    ramp.start(11, 1)
    await ramp._tasks[11]
    await _drain()
    assert coord.sets == [(11, True, 100), (11, True, 200), (11, True, DIM_MAX)]
    assert 11 not in ramp._tasks  # ended on its own → forgotten


async def test_ramp_down_from_on_reaches_floor():
    coord = _FakeCoord({11: OutputState(output=11, on=True, level=80)})
    ramp = _ramp(coord, step=100, interval=0)
    ramp.start(11, -1)
    await ramp._tasks[11]
    await _drain()
    assert coord.sets == [(11, True, DIM_MIN)]  # 80 - 100 clamped to the floor, still on


async def test_ramp_down_from_off_is_noop():
    coord = _FakeCoord()  # off
    ramp = _ramp(coord, step=100, interval=0)
    ramp.start(11, -1)
    await ramp._tasks[11]
    await _drain()
    assert coord.sets == []  # nothing to dim down on an off light


async def test_ramp_down_at_floor_is_noop():
    coord = _FakeCoord({11: OutputState(output=11, on=True, level=DIM_MIN)})
    ramp = _ramp(coord, step=100, interval=0)
    ramp.start(11, -1)
    await ramp._tasks[11]
    await _drain()
    assert coord.sets == []


async def test_ramp_up_walks_in_steps():
    coord = _FakeCoord({11: OutputState(output=11, on=True, level=200)})
    ramp = _ramp(coord, step=25, interval=0)
    ramp.start(11, 1)
    await ramp._tasks[11]
    await _drain()
    assert coord.sets == [(11, True, 225), (11, True, 250), (11, True, DIM_MAX)]


# ── stop / restart / shutdown ─────────────────────────────────────────────────


async def test_stop_cancels_in_flight_ramp():
    coord = _FakeCoord({11: OutputState(output=11, on=True, level=100)})
    ramp = _ramp(coord, step=10, interval=PARKED)
    ramp.start(11, 1)
    await asyncio.sleep(0)  # run first step, then park at the long sleep
    task = ramp._tasks[11]
    ramp.stop(11)
    await _drain()
    assert task.cancelled()
    assert 11 not in ramp._tasks  # done-callback cleaned it up
    assert coord.sets == [(11, True, 110)]  # exactly one step happened before parking


async def test_stop_unknown_address_is_noop():
    ramp = _ramp(_FakeCoord())
    ramp.stop(999)  # never started — must not raise


async def test_spawn_uses_hass_background_task_when_available():
    created = []

    def _create(coro, name):
        created.append(name)
        return asyncio.ensure_future(coro)

    hass = types.SimpleNamespace(async_create_background_task=_create)
    coord = _FakeCoord({11: OutputState(output=11, on=True, level=100)})
    ramp = PlejdDimRamp(hass, coord, step=100, interval=0)
    ramp.start(11, 1)
    await ramp._tasks[11]
    await _drain()
    assert created == ["plejd-dim-ramp"]  # HA-owned task (surfaces failures), not a bare future


async def test_restart_replaces_task_without_evicting_new_one():
    coord = _FakeCoord({11: OutputState(output=11, on=True, level=100)})
    ramp = _ramp(coord, step=10, interval=PARKED)
    ramp.start(11, 1)
    await asyncio.sleep(0)
    first = ramp._tasks[11]
    ramp.start(11, 1)  # restart: cancels `first`, installs a new task
    await asyncio.sleep(0)
    second = ramp._tasks[11]
    assert first.cancelled() and second is not first
    await _drain()
    # the cancelled first task's done-callback must NOT evict the live second task
    assert ramp._tasks.get(11) is second
    ramp.shutdown()


async def test_shutdown_cancels_all():
    coord = _FakeCoord(
        {11: OutputState(output=11, on=True, level=100), 12: OutputState(output=12, on=True, level=100)}
    )
    ramp = _ramp(coord, step=10, interval=PARKED)
    ramp.start(11, 1)
    ramp.start(12, -1)
    await asyncio.sleep(0)
    tasks = [ramp._tasks[11], ramp._tasks[12]]
    ramp.shutdown()
    await _drain()
    assert all(t.cancelled() for t in tasks)
    assert ramp._tasks == {}


# ── resolve_addresses ─────────────────────────────────────────────────────────


class _FakeEntityRegistry:
    def __init__(self, entries):
        self._entries = entries  # entity_id -> SimpleNamespace(unique_id, platform) | None

    def async_get(self, entity_id):
        return self._entries.get(entity_id)


class _FakeDeviceRegistry:
    def __init__(self, by_id=None, by_identifiers=None):
        self._by_id = by_id or {}  # ha device_id -> entry
        self._by_identifiers = by_identifiers or {}  # frozenset(identifiers) -> entry

    def async_get(self, device_id):
        return self._by_id.get(device_id)

    def async_get_device(self, identifiers):
        return self._by_identifiers.get(frozenset(identifiers))


def _device(device_id, address, output_index=0, *, category=CATEGORY_LIGHT, dimmable=True):
    return types.SimpleNamespace(
        device_id=device_id, address=address, output_index=output_index, category=category, dimmable=dimmable
    )


def _hass_with_registries(entities=None, device_registry=None):
    return types.SimpleNamespace(
        entity_registry=_FakeEntityRegistry(entities or {}), device_registry=device_registry
    )


def _ent(unique_id, platform="plejd"):
    return types.SimpleNamespace(unique_id=unique_id, platform=platform)


def test_resolve_maps_entities_to_addresses():
    coord = _FakeCoord(devices=[_device("aabb", 11), _device("ccdd", 12, output_index=1)])
    hass = _hass_with_registries({"light.a": _ent("aabb"), "light.b": _ent("ccdd_1")})
    assert resolve_addresses(hass, coord, ["light.a", "light.b"]) == [11, 12]


def test_resolve_skips_unknown_entity():
    coord = _FakeCoord(devices=[_device("aabb", 11)])
    hass = _hass_with_registries({"light.a": _ent("aabb"), "light.gone": None})
    assert resolve_addresses(hass, coord, ["light.gone", "light.a"]) == [11]


def test_resolve_skips_non_plejd_entity():
    coord = _FakeCoord(devices=[_device("aabb", 11)])
    hass = _hass_with_registries({"light.hue": _ent("x", platform="hue")})
    assert resolve_addresses(hass, coord, ["light.hue"]) == []


def test_resolve_skips_unmatched_and_addressless():
    coord = _FakeCoord(devices=[_device("aabb", None), _device("ccdd", 12)])
    hass = _hass_with_registries({"light.noaddr": _ent("aabb"), "light.orphan": _ent("nope")})
    assert resolve_addresses(hass, coord, ["light.noaddr", "light.orphan"]) == []


def test_resolve_area_expands_to_dimmable_room_lights():
    # Kitchen: two dimmable lights + one relay + one light in another area; only the two dim.
    devices = [
        _device("k1", 11),
        _device("k2", 12),
        _device("relay", 13, dimmable=False),
        _device("hall", 14),
    ]
    coord = _FakeCoord(devices=devices)
    entry = lambda area: types.SimpleNamespace(area_id=area)  # noqa: E731
    dev_reg = _FakeDeviceRegistry(
        by_identifiers={
            frozenset({("plejd", "k1")}): entry("kitchen"),
            frozenset({("plejd", "k2")}): entry("kitchen"),
            frozenset({("plejd", "relay")}): entry("kitchen"),
            frozenset({("plejd", "hall")}): entry("hall"),
        }
    )
    hass = _hass_with_registries(device_registry=dev_reg)
    assert resolve_addresses(hass, coord, [], area_ids=["kitchen"]) == [11, 12]


def test_resolve_area_skips_unregistered_device():
    coord = _FakeCoord(devices=[_device("k1", 11)])
    hass = _hass_with_registries(device_registry=_FakeDeviceRegistry())  # device not in registry
    assert resolve_addresses(hass, coord, [], area_ids=["kitchen"]) == []


def test_resolve_device_target_expands_to_all_outputs():
    coord = _FakeCoord(devices=[_device("dev", 11), _device("dev", 12, output_index=1), _device("other", 13)])
    dev_reg = _FakeDeviceRegistry(
        by_id={"ha-dev-1": types.SimpleNamespace(identifiers={("plejd", "dev"), ("other_domain", "x")})}
    )
    hass = _hass_with_registries(device_registry=dev_reg)
    assert resolve_addresses(hass, coord, [], device_ids=["ha-dev-1"]) == [11, 12]


def test_resolve_device_target_skips_unknown_device():
    coord = _FakeCoord(devices=[_device("dev", 11)])
    hass = _hass_with_registries(device_registry=_FakeDeviceRegistry())
    assert resolve_addresses(hass, coord, [], device_ids=["ha-missing"]) == []


def test_resolve_dedups_across_targets():
    coord = _FakeCoord(devices=[_device("k1", 11)])
    dev_reg = _FakeDeviceRegistry(by_identifiers={frozenset({("plejd", "k1")}): types.SimpleNamespace(area_id="kitchen")})
    hass = _hass_with_registries({"light.k1": _ent("k1")}, device_registry=dev_reg)
    # Same output reached via both an entity target and its area — returned once.
    assert resolve_addresses(hass, coord, ["light.k1"], area_ids=["kitchen"]) == [11]
