"""Tests for the Plejd switch platform."""

from __future__ import annotations

import types

from plejd.cloud import PlejdCloudDevice
from plejd.protocol import OutputState
from plejd.switch import PlejdSwitch, async_setup_entry


def _device(category="switch", address=7):
    return PlejdCloudDevice(
        device_id="r1",
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
    def __init__(self, devices, state=None):
        self.devices = devices
        self._state = state
        self.commands = []
        self.listeners = []

    def state_for(self, address):
        return self._state

    def async_add_listener(self, cb):
        self.listeners.append(cb)
        return lambda: self.listeners.remove(cb)

    async def async_set_output(self, address, output, on, level):
        self.commands.append((address, output, on, level))


async def test_setup_creates_switches_only_for_switch_devices():
    coord = _Coordinator([_device(), _device(category="light"), _device(address=None)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 1


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
