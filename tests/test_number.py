"""Tests for the Plejd number platform (min/max dim level settings)."""

from __future__ import annotations

import types

from homeassistant.const import EntityCategory
from plejd.cloud import PlejdCloudDevice
from plejd.number import PlejdDimLevelNumber, PlejdTransitionTimeNumber, async_setup_entry


def _device(category="light", address=5, dimmable=True, output_index=0):
    return PlejdCloudDevice(
        device_id="d1",
        name="Lamp",
        address=address,
        output_index=output_index,
        outputs=[address],
        hardware_id=1,
        model="DIM-01",
        category=category,
        dimmable=dimmable,
        traits=0x03,
        room_id="r1",
    )


class _Coordinator:
    def __init__(self, devices):
        self.devices = devices
        self.min_calls = []
        self.max_calls = []
        self.start_calls = []
        self.speed_calls = []

    async def async_set_output_min_level(self, address, output, fraction):
        self.min_calls.append((address, output, fraction))

    async def async_set_output_max_level(self, address, output, fraction):
        self.max_calls.append((address, output, fraction))

    async def async_set_output_start_level(self, address, output, fraction):
        self.start_calls.append((address, output, fraction))

    async def async_set_output_speed(self, address, output, seconds):
        self.speed_calls.append((address, output, seconds))


async def test_setup_creates_settings_only_for_dimmable_lights():
    coord = _Coordinator(
        [
            _device(),
            _device(category="switch"),
            _device(dimmable=False),
            _device(address=None),
        ]
    )
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    # One dimmable light -> min + max + start brightness + a transition-time entity.
    assert len(added) == 4
    assert {e._attr_translation_key for e in added} == {
        "min_dim_level",
        "max_dim_level",
        "start_level",
        "transition_time",
    }


def test_attributes_and_unique_id():
    minimum = PlejdDimLevelNumber(_Coordinator([]), _device(), "min")
    maximum = PlejdDimLevelNumber(_Coordinator([]), _device(output_index=2), "max")
    assert minimum._attr_entity_category == EntityCategory.CONFIG
    assert minimum._attr_unique_id == "d1_min_level"
    assert maximum._attr_unique_id == "d1_2_max_level"
    assert (minimum._attr_native_min_value, minimum._attr_native_max_value) == (0, 100)


async def test_set_value_routes_to_kind_setter_as_fraction():
    coord = _Coordinator([])
    minimum = PlejdDimLevelNumber(coord, _device(), "min")
    maximum = PlejdDimLevelNumber(coord, _device(), "max")
    start = PlejdDimLevelNumber(coord, _device(), "start")
    await minimum.async_set_native_value(20)
    await maximum.async_set_native_value(80)
    await start.async_set_native_value(40)
    assert coord.min_calls == [(5, 0, 0.2)]
    assert coord.max_calls == [(5, 0, 0.8)]
    assert coord.start_calls == [(5, 0, 0.4)]
    assert start._attr_translation_key == "start_level" and start._attr_unique_id == "d1_start_level"


async def test_restores_last_value_on_add():
    entity = PlejdDimLevelNumber(_Coordinator([]), _device(), "min")

    async def _last():
        return types.SimpleNamespace(native_value=35)

    entity.async_get_last_number_data = _last
    await entity.async_added_to_hass()
    assert entity._attr_native_value == 35


async def test_no_restore_when_no_prior_state():
    entity = PlejdDimLevelNumber(_Coordinator([]), _device(), "max")
    await entity.async_added_to_hass()
    assert getattr(entity, "_attr_native_value", None) is None


def test_transition_time_attributes():
    t = PlejdTransitionTimeNumber(_Coordinator([]), _device(output_index=2))
    assert t._attr_entity_category == EntityCategory.CONFIG
    assert t._attr_translation_key == "transition_time"
    assert t._attr_unique_id == "d1_2_transition_time"
    assert (t._attr_native_min_value, t._attr_native_max_value) == (0, 10)


async def test_transition_time_sets_seconds_and_restores():
    coord = _Coordinator([])
    t = PlejdTransitionTimeNumber(coord, _device())
    await t.async_set_native_value(2.5)
    assert coord.speed_calls == [(5, 0, 2.5)] and t._attr_native_value == 2.5

    async def _last():
        return types.SimpleNamespace(native_value=1.0)

    t.async_get_last_number_data = _last
    await t.async_added_to_hass()
    assert t._attr_native_value == 1.0
