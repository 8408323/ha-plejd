"""Tests for the Plejd motion binary_sensor."""

from __future__ import annotations

import types

from plejd.binary_sensor import PlejdMotionBinarySensor, PlejdProblemBinarySensor, async_setup_entry
from plejd.cloud import PlejdCloudDevice, PlejdCloudMotion
from plejd.protocol import MotionEvent


def _device(device_id="d1", address=5, output_index=0, device_address=None):
    return PlejdCloudDevice(
        device_id=device_id,
        name="Lamp",
        address=address,
        output_index=output_index,
        outputs=[address] if address is not None else [],
        hardware_id=1,
        model="DIM-01",
        category="light",
        dimmable=True,
        traits=3,
        room_id="r1",
        device_address=device_address if device_address is not None else address,
    )


class _Coordinator:
    def __init__(self, motion, devices=()):
        self.motion = motion
        self.devices = list(devices)
        self.motion_listeners = []
        self.fault_listeners = []
        self._faults = {}

    def async_add_motion_listener(self, cb):
        self.motion_listeners.append(cb)
        return lambda: self.motion_listeners.remove(cb)

    def async_add_fault_listener(self, cb):
        self.fault_listeners.append(cb)
        return lambda: self.fault_listeners.remove(cb)

    def faults_for(self, address):
        return self._faults.get(address, frozenset())


def _sensor():
    s = PlejdMotionBinarySensor(_Coordinator([]), PlejdCloudMotion("w1", "Motion", 33))
    s.hass = None
    return s


async def test_setup_creates_motion_sensor():
    coord = _Coordinator([PlejdCloudMotion("w1", "Motion", 33)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 1


def test_motion_on_then_clear():
    s = _sensor()
    assert s._attr_is_on is False
    s._handle(MotionEvent(33, True, 5))
    assert s._attr_is_on is True
    s._handle(MotionEvent(33, True, 6))  # re-trigger cancels the previous timer
    s._clear(None)
    assert s._attr_is_on is False


def test_motion_ignores_other_address_and_non_motion():
    s = _sensor()
    s._handle(MotionEvent(99, True, 5))
    s._handle(MotionEvent(33, False, 5))
    assert s._attr_is_on is False


def test_attributes():
    s = _sensor()
    assert s._attr_unique_id == "motion_w1" and s._attr_device_info["model"] == "WMS-01"


async def test_added_to_hass_subscribes():
    coord = _Coordinator([PlejdCloudMotion("w1", "M", 33)])
    await PlejdMotionBinarySensor(coord, coord.motion[0]).async_added_to_hass()
    assert len(coord.motion_listeners) == 1


async def test_setup_creates_one_problem_sensor_per_device():
    devices = [_device("d1", 5), _device("d1", 5, output_index=1), _device("d2", 7)]  # d1 shares device_id
    coord = _Coordinator([PlejdCloudMotion("w1", "M", 33)], devices=devices)
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    problems = [e for e in added if isinstance(e, PlejdProblemBinarySensor)]
    assert len(problems) == 2  # one per physical device (d1, d2), not per output
    assert {p._attr_unique_id for p in problems} == {"fault_d1", "fault_d2"}


def test_problem_sensor_reflects_faults():
    coord = _Coordinator([], devices=[_device("d1", 5)])
    s = PlejdProblemBinarySensor(coord, coord.devices[0])
    assert s.is_on is False and s.extra_state_attributes == {"active_faults": []}
    coord._faults[5] = frozenset({"overtemperature", "hard_fault"})
    assert s.is_on is True
    assert s.extra_state_attributes == {"active_faults": ["hard_fault", "overtemperature"]}


async def test_problem_sensor_subscribes_and_updates_on_match():
    coord = _Coordinator([], devices=[_device("d1", 5)])
    s = PlejdProblemBinarySensor(coord, coord.devices[0])
    writes = []
    s.async_write_ha_state = lambda: writes.append(1)
    await s.async_added_to_hass()
    assert len(coord.fault_listeners) == 1
    coord.fault_listeners[0](5, frozenset({"overtemperature"}))  # matching address -> writes
    coord.fault_listeners[0](99, frozenset({"x"}))  # other address -> ignored
    assert writes == [1]
