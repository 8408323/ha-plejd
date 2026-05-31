"""Tests for the Plejd select platform (dimmer curve + phase-dim edge)."""

from __future__ import annotations

import types

from homeassistant.const import EntityCategory
from plejd.cloud import PlejdCloudDevice
from plejd.select import PlejdOutputSettingSelect, async_setup_entry


def _device(category="light", address=5, dimmable=True, output_index=0, hardware_id=1):
    return PlejdCloudDevice(
        device_id="d1",
        name="Lamp",
        address=address,
        output_index=output_index,
        outputs=[address],
        hardware_id=hardware_id,
        model="DIM-01",
        category=category,
        dimmable=dimmable,
        traits=0x03,
        room_id="r1",
    )


class _Coordinator:
    def __init__(self, devices):
        self.devices = devices
        self.curve_calls = []
        self.phase_calls = []

    async def async_set_output_curve(self, address, output, curve):
        self.curve_calls.append((address, output, curve))

    async def async_set_output_phase_dim(self, address, output, phase):
        self.phase_calls.append((address, output, phase))


async def test_setup_creates_curve_and_phase_only_for_dimmable_lights():
    coord = _Coordinator([_device(), _device(category="switch"), _device(dimmable=False), _device(address=None)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 2
    assert {e._attr_translation_key for e in added} == {"dim_curve", "phase_dim"}


async def test_non_phase_dimmer_gets_curve_only():
    # LED-10 (hardware 5) dims but isn't a phase-cut dimmer -> no phase-edge select.
    coord = _Coordinator([_device(hardware_id=5)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert [e._attr_translation_key for e in added] == ["dim_curve"]


def test_options_and_unique_id():
    curve = PlejdOutputSettingSelect(_Coordinator([]), _device(), "curve")
    phase = PlejdOutputSettingSelect(_Coordinator([]), _device(output_index=2), "phase")
    assert curve._attr_entity_category == EntityCategory.CONFIG
    assert curve._attr_options == ["linear", "logarithmic", "antilogarithmic"]
    assert curve._attr_unique_id == "d1_curve"
    assert phase._attr_options == ["trailing_edge", "leading_edge"]
    assert phase._attr_unique_id == "d1_2_phase"


async def test_select_option_sends_mapped_wire_value():
    coord = _Coordinator([])
    curve = PlejdOutputSettingSelect(coord, _device(), "curve")
    phase = PlejdOutputSettingSelect(coord, _device(), "phase")
    await curve.async_select_option("antilogarithmic")  # -> 3
    await phase.async_select_option("leading_edge")  # -> 1
    assert coord.curve_calls == [(5, 0, 3)]
    assert coord.phase_calls == [(5, 0, 1)]
    assert curve._attr_current_option == "antilogarithmic"


async def test_restores_last_known_option():
    entity = PlejdOutputSettingSelect(_Coordinator([]), _device(), "curve")

    async def _last():
        return types.SimpleNamespace(state="logarithmic")

    entity.async_get_last_state = _last
    await entity.async_added_to_hass()
    assert entity._attr_current_option == "logarithmic"


async def test_ignores_unknown_restored_option():
    entity = PlejdOutputSettingSelect(_Coordinator([]), _device(), "phase")

    async def _last():
        return types.SimpleNamespace(state="bogus")

    entity.async_get_last_state = _last
    await entity.async_added_to_hass()
    assert getattr(entity, "_attr_current_option", None) is None
