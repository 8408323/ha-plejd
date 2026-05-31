"""Plejd sensor platform (WMS-01 illuminance).

The lux value comes from the Lux sub-package of the motion broadcast; its exact
unit/scale is best-effort (decoded, lightly validated).
"""

from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import LIGHT_LUX
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .cloud import PlejdCloudMotion
from .const import DOMAIN
from .coordinator import PlejdCoordinator
from .protocol import MotionEvent


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd illuminance sensors for the config entry."""
    coordinator: PlejdCoordinator = entry.runtime_data
    async_add_entities(PlejdIlluminanceSensor(coordinator, sensor) for sensor in coordinator.motion)


class PlejdIlluminanceSensor(SensorEntity):
    """The ambient-light reading reported by a WMS-01."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.ILLUMINANCE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = LIGHT_LUX

    def __init__(self, coordinator: PlejdCoordinator, sensor: PlejdCloudMotion) -> None:
        self._coordinator = coordinator
        self._sensor = sensor
        self._attr_unique_id = f"illuminance_{sensor.device_id}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, sensor.device_id)},
            name=sensor.name,
            manufacturer="Plejd",
            model="WMS-01",
        )

    @callback
    def _handle(self, event: MotionEvent) -> None:
        if event.address == self._sensor.address and event.lux is not None:
            self._attr_native_value = event.lux
            self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._coordinator.async_add_motion_listener(self._handle))
