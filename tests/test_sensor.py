"""Tests for the Plejd illuminance sensor."""

from __future__ import annotations

import types

from plejd.cloud import PlejdCloudMotion
from plejd.protocol import MotionEvent
from plejd.sensor import PlejdIlluminanceSensor, async_setup_entry


class _Coordinator:
    def __init__(self, motion):
        self.motion = motion
        self.motion_listeners = []

    def async_add_motion_listener(self, cb):
        self.motion_listeners.append(cb)
        return lambda: self.motion_listeners.remove(cb)


def _sensor():
    return PlejdIlluminanceSensor(_Coordinator([]), PlejdCloudMotion("w1", "Motion", 33))


async def test_setup_creates_illuminance_sensor():
    coord = _Coordinator([PlejdCloudMotion("w1", "Motion", 33)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 1


def test_lux_updates_on_matching_address():
    s = _sensor()
    s._handle(MotionEvent(33, True, 42))
    assert s._attr_native_value == 42


def test_lux_ignores_other_address_or_missing_lux():
    s = _sensor()
    s._handle(MotionEvent(99, True, 5))
    s._handle(MotionEvent(33, True, None))
    assert not hasattr(s, "_attr_native_value")


def test_attributes():
    s = _sensor()
    assert s._attr_unique_id == "illuminance_w1"
    assert s._attr_native_unit_of_measurement == "lx"


async def test_added_to_hass_subscribes():
    coord = _Coordinator([PlejdCloudMotion("w1", "M", 33)])
    await PlejdIlluminanceSensor(coord, coord.motion[0]).async_added_to_hass()
    assert len(coord.motion_listeners) == 1
