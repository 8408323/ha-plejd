"""Tests for the Plejd switch platform."""

from __future__ import annotations

import types

from plejd.cloud import PlejdCloudDevice
from plejd.protocol import OutputState
from plejd.switch import PlejdScheduleSwitch, PlejdSwitch, async_setup_entry


def _device(category="switch", address=7):
    return PlejdCloudDevice(
        device_id="r1",
        output_index=0,
        name="Pump",
        address=address,
        outputs=[address],
        hardware_id=18,
        model="REL-02",
        category=category,
        dimmable=False,
        traits=1,
        room_id="r1",
    )


class _Coordinator:
    site_id = "site-1"

    def __init__(self, devices, state=None):
        self.devices = devices
        self._state = state
        self.commands = []
        self.listeners = []
        self.programmed = []
        self.removed = []

    def state_for(self, address):
        return self._state

    def async_add_listener(self, cb):
        self.listeners.append(cb)
        return lambda: self.listeners.remove(cb)

    async def async_set_output(self, address, output, on, level):
        self.commands.append((address, output, on, level))

    async def async_program_time_event(self, slot, mask, hour, minute, second, scene, fade):
        self.programmed.append((slot, mask, hour, minute, second, scene, fade))

    async def async_remove_time_event(self, slot):
        self.removed.append(slot)


_SCHEDULE = {"slot": 1, "name": "Evening", "days": [0, 6], "time": "18:30:00", "scene": 4, "fade": 0}


async def test_setup_creates_switches_and_schedule_switches():
    coord = _Coordinator([_device(), _device(category="light"), _device(address=None)])
    entry = types.SimpleNamespace(runtime_data=coord, options={"schedules": [_SCHEDULE]})
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 2  # one relay + one schedule
    assert any(isinstance(e, PlejdScheduleSwitch) for e in added)


async def test_schedule_switch_turn_on_programs_event():
    coord = _Coordinator([])
    sw = PlejdScheduleSwitch(coord, _SCHEDULE)
    await sw.async_turn_on()
    # days [0,6] -> mask 0x41, 18:30:00, scene 4, fade 0
    assert coord.programmed == [(1, 0x41, 18, 30, 0, 4, 0)]
    assert sw.is_on is True and sw._attr_unique_id == "site-1_schedule_1"


async def test_schedule_switch_turn_off_removes_event():
    coord = _Coordinator([])
    sw = PlejdScheduleSwitch(coord, _SCHEDULE)
    await sw.async_turn_off()
    assert coord.removed == [1] and sw.is_on is False


async def test_schedule_switch_restores_on_and_reprograms():
    coord = _Coordinator([])
    sw = PlejdScheduleSwitch(coord, _SCHEDULE)

    async def _last():
        return types.SimpleNamespace(state="on")

    sw.async_get_last_state = _last
    await sw.async_added_to_hass()
    assert coord.programmed == [(1, 0x41, 18, 30, 0, 4, 0)] and coord.removed == []


async def test_schedule_switch_restores_off_and_removes():
    coord = _Coordinator([])
    sw = PlejdScheduleSwitch(coord, _SCHEDULE)

    async def _last():
        return types.SimpleNamespace(state="off")

    sw.async_get_last_state = _last
    await sw.async_added_to_hass()
    assert coord.removed == [1] and coord.programmed == []


async def test_schedule_switch_defaults_on_without_prior_state():
    coord = _Coordinator([])
    sw = PlejdScheduleSwitch(coord, {"slot": 2, "name": "Morning", "days": [], "time": "06:00", "scene": 1})
    await sw.async_added_to_hass()
    # no weekdays -> mask 0, no seconds in "06:00" -> 0, missing fade -> 0
    assert coord.programmed == [(2, 0, 6, 0, 0, 1, 0)]


def test_is_on_from_state():
    coord = _Coordinator([], state=OutputState(output=0, on=True, level=255))
    assert PlejdSwitch(coord, _device()).is_on is True


def test_is_on_unknown():
    assert PlejdSwitch(_Coordinator([], state=None), _device()).is_on is None


async def test_turn_on_off():
    coord = _Coordinator([])
    sw = PlejdSwitch(coord, _device())
    await sw.async_turn_on()
    await sw.async_turn_off()
    assert coord.commands == [(7, 0, True, 255), (7, 0, False, 0)]


async def test_added_to_hass_subscribes():
    coord = _Coordinator([])
    await PlejdSwitch(coord, _device()).async_added_to_hass()
    assert len(coord.listeners) == 1


def test_device_info():
    sw = PlejdSwitch(_Coordinator([]), _device())
    assert sw._attr_unique_id == "r1"
    assert sw._attr_device_info["model"] == "REL-02"
