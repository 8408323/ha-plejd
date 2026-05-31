"""Tests for the Plejd motion binary_sensor."""

from __future__ import annotations

import types

from plejd.binary_sensor import PlejdMotionBinarySensor, async_setup_entry
from plejd.cloud import PlejdCloudMotion
from plejd.protocol import MotionEvent


class _Coordinator:
    def __init__(self, motion):
        self.motion = motion
        self.motion_listeners = []

    def async_add_motion_listener(self, cb):
        self.motion_listeners.append(cb)
        return lambda: self.motion_listeners.remove(cb)


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
