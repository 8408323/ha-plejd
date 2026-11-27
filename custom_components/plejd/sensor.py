"""Plejd sensor platform (connection, WMS-01 illuminance, TRM floor/room temperature).

The lux value comes from the Lux sub-package of the motion broadcast; its exact
unit/scale is best-effort (decoded, lightly validated).
"""

from __future__ import annotations

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import LIGHT_LUX, EntityCategory, UnitOfTemperature
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .cloud import PlejdCloudDevice, PlejdCloudMotion
from .const import CATEGORY_CLIMATE, DOMAIN, TRM_SENSOR_FLOOR, TRM_SENSOR_ROOM
from .coordinator import PlejdCoordinator
from .protocol import MotionEvent


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd sensors (connection, WMS-01 illuminance, TRM temperatures) for the config entry."""
    coordinator: PlejdCoordinator = entry.runtime_data
    entities: list[SensorEntity] = [PlejdConnectivitySensor(coordinator)]
    entities.extend(PlejdIlluminanceSensor(coordinator, sensor) for sensor in coordinator.motion)
    entities.extend(
        PlejdThermostatTemperatureSensor(coordinator, device, sensor)
        for device in coordinator.devices
        if device.category == CATEGORY_CLIMATE and device.address is not None
        for sensor in (TRM_SENSOR_FLOOR, TRM_SENSOR_ROOM)
    )
    async_add_entities(entities)


class PlejdConnectivitySensor(SensorEntity):
    """Which transport the integration is connected over (gateway / Bluetooth / none)."""

    _attr_has_entity_name = True
    _attr_translation_key = "connection"
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_device_class = SensorDeviceClass.ENUM
    _attr_options = ["gateway", "ble", "disconnected"]

    def __init__(self, coordinator: PlejdCoordinator) -> None:
        self._coordinator = coordinator
        self._attr_unique_id = f"connection_{coordinator.site_id}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.site_id)},
            name="Plejd",
            manufacturer="Plejd",
        )

    @property
    def native_value(self) -> str:
        return self._coordinator.active_transport or "disconnected"

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._coordinator.async_add_listener(self.async_write_ha_state))


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


class PlejdThermostatTemperatureSensor(SensorEntity):
    """A TRM thermostat's floor or room temperature (polled 0x045B reading)."""

    _attr_has_entity_name = True
    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS

    _KEYS = {TRM_SENSOR_FLOOR: "floor_temperature", TRM_SENSOR_ROOM: "room_temperature"}

    def __init__(self, coordinator: PlejdCoordinator, device: PlejdCloudDevice, sensor: int) -> None:
        self._coordinator = coordinator
        self._device = device
        self._sensor = sensor
        self._attr_translation_key = self._KEYS[sensor]
        self._attr_unique_id = f"{self._KEYS[sensor]}_{device.device_id}"
        self._attr_device_info = DeviceInfo(identifiers={(DOMAIN, device.device_id)})

    @property
    def available(self) -> bool:
        return self._coordinator.available and self.native_value is not None

    @property
    def native_value(self) -> float | None:
        return self._coordinator.climate_temperature(self._device.address, self._sensor)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._coordinator.async_add_listener(self.async_write_ha_state))
