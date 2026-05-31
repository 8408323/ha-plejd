"""Plejd number platform — per-output min/max dim level config.

These are device *settings* (the floor/ceiling a dimmer scales to), not live state.
The read-back response doesn't echo the output index, so reliable per-output reads
over the shared broadcast channel aren't possible; the entities are therefore
optimistic and restore their last value across restarts. The wire encoding (a
0-1 fraction as u16 little-endian) is byte-exact, decoded from the app.
"""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from homeassistant.components.number import NumberMode, RestoreNumber
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import PERCENTAGE, EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .cloud import PlejdCloudDevice
from .const import CATEGORY_LIGHT, DOMAIN
from .coordinator import PlejdCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd dim-level settings (one min + one max per dimmable output)."""
    coordinator: PlejdCoordinator = entry.runtime_data
    entities: list[PlejdDimLevelNumber] = []
    for device in coordinator.devices:
        if device.category == CATEGORY_LIGHT and device.dimmable and device.address is not None:
            entities.append(PlejdDimLevelNumber(coordinator, device, "min"))
            entities.append(PlejdDimLevelNumber(coordinator, device, "max"))
    async_add_entities(entities)


class PlejdDimLevelNumber(RestoreNumber):
    """A dimmer's minimum or maximum brightness, as a 0-100% setting."""

    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.CONFIG
    _attr_native_min_value = 0
    _attr_native_max_value = 100
    _attr_native_step = 1
    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_mode = NumberMode.SLIDER

    def __init__(self, coordinator: PlejdCoordinator, device: PlejdCloudDevice, kind: str) -> None:
        self._coordinator = coordinator
        self._device = device
        self._setter: Callable[[int, int, float], Awaitable[None]] = (
            coordinator.async_set_output_min_level if kind == "min" else coordinator.async_set_output_max_level
        )
        self._attr_translation_key = "min_dim_level" if kind == "min" else "max_dim_level"
        base = device.device_id if device.output_index == 0 else f"{device.device_id}_{device.output_index}"
        self._attr_unique_id = f"{base}_{kind}_level"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device.device_id)},
            name=device.name,
            manufacturer="Plejd",
            model=device.model,
        )

    async def async_set_native_value(self, value: float) -> None:
        await self._setter(self._device.address, self._device.output_index, value / 100)
        self._attr_native_value = value
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_number_data()
        if last is not None and last.native_value is not None:
            self._attr_native_value = last.native_value
