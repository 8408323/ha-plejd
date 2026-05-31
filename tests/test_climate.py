"""Tests for the Plejd climate platform."""

from __future__ import annotations

import types

from homeassistant.components.climate import ClimateEntityFeature, HVACMode
from homeassistant.const import ATTR_TEMPERATURE
from plejd.climate import PlejdClimate, async_setup_entry
from plejd.cloud import PlejdCloudDevice


def _device(category="climate", address=9):
    return PlejdCloudDevice(
        device_id="t1",
        name="Floor",
        address=address,
        output_index=0,
        outputs=[address],
        hardware_id=100,
        model="TRM-01",
        category=category,
        dimmable=False,
        traits=0x20,
        room_id="r1",
    )


class _Coordinator:
    def __init__(self, devices):
        self.devices = devices
        self.setpoints: list = []
        self.modes: list = []
        self.listeners: list = []
        self.available = True

    def async_add_listener(self, cb):
        self.listeners.append(cb)
        return lambda: self.listeners.remove(cb)

    async def async_set_climate_setpoint(self, address, celsius):
        self.setpoints.append((address, celsius))

    async def async_set_climate_mode(self, address, mode):
        self.modes.append((address, mode))


async def test_setup_creates_climate_only_for_climate_devices():
    coord = _Coordinator([_device(), _device(category="light"), _device(address=None)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 1


def test_climate_available_follows_coordinator():
    coord = _Coordinator([])
    c = PlejdClimate(coord, _device())
    assert c.available is True
    coord.available = False
    assert c.available is False


def test_attributes():
    c = PlejdClimate(_Coordinator([]), _device())
    assert c._attr_hvac_modes == [HVACMode.HEAT]
    assert c._attr_supported_features == (ClimateEntityFeature.TARGET_TEMPERATURE | ClimateEntityFeature.PRESET_MODE)
    assert "boost" in c._attr_preset_modes and c._attr_preset_mode == "none"
    assert c._attr_unique_id == "t1" and c._attr_device_info["model"] == "TRM-01"


async def test_set_temperature_sends_setpoint():
    coord = _Coordinator([])
    c = PlejdClimate(coord, _device())
    await c.async_set_temperature(**{ATTR_TEMPERATURE: 21.5})
    assert coord.setpoints == [(9, 21.5)]
    assert c._attr_target_temperature == 21.5


async def test_set_temperature_without_value_noops():
    coord = _Coordinator([])
    await PlejdClimate(coord, _device()).async_set_temperature()
    assert coord.setpoints == []


async def test_set_preset_maps_to_mode():
    coord = _Coordinator([])
    c = PlejdClimate(coord, _device())
    await c.async_set_preset_mode("boost")
    assert coord.modes == [(9, 3)]  # OperatingMode.Boost
    assert c._attr_preset_mode == "boost"


async def test_set_unknown_preset_falls_back_to_normal():
    coord = _Coordinator([])
    await PlejdClimate(coord, _device()).async_set_preset_mode("weird")
    assert coord.modes == [(9, 7)]  # OperatingMode.Normal


async def test_set_hvac_mode_noop():
    coord = _Coordinator([])
    await PlejdClimate(coord, _device()).async_set_hvac_mode(HVACMode.HEAT)
    assert coord.setpoints == [] and coord.modes == []


async def test_added_to_hass_subscribes():
    coord = _Coordinator([])
    await PlejdClimate(coord, _device()).async_added_to_hass()
    assert len(coord.listeners) == 1
