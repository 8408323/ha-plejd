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
from homeassistant.const import PERCENTAGE, EntityCategory, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .cloud import PlejdCloudDevice
from .const import CATEGORY_LIGHT, DOMAIN
from .coordinator import PlejdCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd dimmer settings (min + max brightness + transition time per dimmable output)."""
    coordinator: PlejdCoordinator = entry.runtime_data
    entities: list[RestoreNumber] = []
    for device in coordinator.devices:
        if device.category == CATEGORY_LIGHT and device.dimmable and device.address is not None:
            entities.append(PlejdDimLevelNumber(coordinator, device, "min"))
            entities.append(PlejdDimLevelNumber(coordinator, device, "max"))
            entities.append(PlejdDimLevelNumber(coordinator, device, "start"))
            entities.append(PlejdTransitionTimeNumber(coordinator, device))
    async_add_entities(entities)


class PlejdDimLevelNumber(RestoreNumber):
    """A dimmer's minimum, maximum, or start brightness, as a 0-100% setting."""

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
        setters: dict[str, Callable[[int, int, float], Awaitable[None]]] = {
            "min": coordinator.async_set_output_min_level,
            "max": coordinator.async_set_output_max_level,
            "start": coordinator.async_set_output_start_level,
        }
        self._setter = setters[kind]
        self._attr_translation_key = {"min": "min_dim_level", "max": "max_dim_level", "start": "start_level"}[kind]
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


class PlejdTransitionTimeNumber(RestoreNumber):
    """A dimmer's fade/transition time in seconds (0 = instant)."""

    _attr_has_entity_name = True
    _attr_entity_category = EntityCategory.CONFIG
    _attr_translation_key = "transition_time"
    _attr_native_min_value = 0
    _attr_native_max_value = 10
    _attr_native_step = 0.1
    _attr_native_unit_of_measurement = UnitOfTime.SECONDS
    _attr_mode = NumberMode.BOX

    def __init__(self, coordinator: PlejdCoordinator, device: PlejdCloudDevice) -> None:
        self._coordinator = coordinator
        self._device = device
        base = device.device_id if device.output_index == 0 else f"{device.device_id}_{device.output_index}"
        self._attr_unique_id = f"{base}_transition_time"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device.device_id)},
            name=device.name,
            manufacturer="Plejd",
            model=device.model,
        )

    async def async_set_native_value(self, value: float) -> None:
        await self._coordinator.async_set_output_speed(self._device.address, self._device.output_index, value)
        self._attr_native_value = value
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_number_data()
        if last is not None and last.native_value is not None:
            self._attr_native_value = last.native_value
