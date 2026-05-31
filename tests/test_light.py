"""Tests for the Plejd light platform."""

from __future__ import annotations

import types

from homeassistant.components.light import ATTR_BRIGHTNESS, ColorMode
from plejd.cloud import PlejdCloudDevice
from plejd.light import PlejdLight, async_setup_entry
from plejd.protocol import OutputState


def _device(category="light", dimmable=True, address=5):
    return PlejdCloudDevice(
        device_id="d1",
        name="Kitchen",
        address=address,
        outputs=[address],
        hardware_id=1,
        model="DIM-01",
        category=category,
        dimmable=dimmable,
        traits=3,
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


async def test_setup_entry_creates_lights_only_for_light_devices():
    coord = _Coordinator([_device(), _device(category="switch"), _device(category="light", address=None)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 1  # the switch and the address-less light are skipped


def test_dimmable_light_color_mode():
    light = PlejdLight(_Coordinator([]), _device(dimmable=True))
    assert light._attr_color_mode == ColorMode.BRIGHTNESS
    assert light._attr_supported_color_modes == {ColorMode.BRIGHTNESS}
    assert light._attr_unique_id == "d1"
    assert light._attr_device_info["model"] == "DIM-01"


def test_non_dimmable_light_is_onoff():
    light = PlejdLight(_Coordinator([]), _device(dimmable=False))
    assert light._attr_color_mode == ColorMode.ONOFF


def test_is_on_and_brightness_from_state():
    coord = _Coordinator([], state=OutputState(output=0, on=True, level=180))
    light = PlejdLight(coord, _device(dimmable=True))
    assert light.is_on is True
    assert light.brightness == 180


def test_unknown_state_is_none():
    light = PlejdLight(_Coordinator([], state=None), _device())
    assert light.is_on is None
    assert light.brightness is None


def test_non_dimmable_has_no_brightness():
    coord = _Coordinator([], state=OutputState(output=0, on=True, level=180))
    light = PlejdLight(coord, _device(dimmable=False))
    assert light.brightness is None


async def test_turn_on_with_brightness():
    coord = _Coordinator([])
    light = PlejdLight(coord, _device())
    await light.async_turn_on(**{ATTR_BRIGHTNESS: 77})
    assert coord.commands == [(5, 0, True, 77)]


async def test_turn_on_without_brightness_defaults_full():
    coord = _Coordinator([], state=None)
    light = PlejdLight(coord, _device())
    await light.async_turn_on()
    assert coord.commands == [(5, 0, True, 255)]


async def test_turn_off():
    coord = _Coordinator([])
    light = PlejdLight(coord, _device())
    await light.async_turn_off()
    assert coord.commands == [(5, 0, False, 0)]


async def test_added_to_hass_subscribes():
    coord = _Coordinator([])
    light = PlejdLight(coord, _device())
    await light.async_added_to_hass()
    assert len(coord.listeners) == 1
