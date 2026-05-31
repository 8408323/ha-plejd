"""Plejd binary_sensor platform (WMS-01 motion)."""

from __future__ import annotations

from homeassistant.components.binary_sensor import BinarySensorDeviceClass, BinarySensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.event import async_call_later

from .cloud import PlejdCloudMotion
from .const import DOMAIN
from .coordinator import PlejdCoordinator
from .protocol import MotionEvent

MOTION_OFF_DELAY = 60  # seconds with no broadcast before clearing motion


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd motion sensors for the config entry."""
    coordinator: PlejdCoordinator = entry.runtime_data
    async_add_entities(PlejdMotionBinarySensor(coordinator, sensor) for sensor in coordinator.motion)


class PlejdMotionBinarySensor(BinarySensorEntity):
    """A WMS-01 motion sensor (momentary; auto-clears after a delay)."""

    _attr_has_entity_name = True
    _attr_device_class = BinarySensorDeviceClass.MOTION
    _attr_is_on = False

    def __init__(self, coordinator: PlejdCoordinator, sensor: PlejdCloudMotion) -> None:
        self._coordinator = coordinator
        self._sensor = sensor
        self._attr_unique_id = f"motion_{sensor.device_id}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, sensor.device_id)},
            name=sensor.name,
            manufacturer="Plejd",
            model="WMS-01",
        )
        self._cancel = None

    @callback
    def _handle(self, event: MotionEvent) -> None:
        if event.address != self._sensor.address or not event.motion:
            return
        self._attr_is_on = True
        if self._cancel is not None:
            self._cancel()
        self._cancel = async_call_later(self.hass, MOTION_OFF_DELAY, self._clear)
        self.async_write_ha_state()

    @callback
    def _clear(self, _now: object) -> None:
        self._attr_is_on = False
        self._cancel = None
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._coordinator.async_add_motion_listener(self._handle))
