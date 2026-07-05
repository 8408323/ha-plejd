"""Plejd light platform."""

from __future__ import annotations

from typing import Any

from homeassistant.components.light import ATTR_BRIGHTNESS, ColorMode, LightEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .cloud import PlejdCloudDevice
from .const import CATEGORY_LIGHT, DOMAIN
from .coordinator import PlejdCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd lights for the config entry."""
    coordinator: PlejdCoordinator = entry.runtime_data
    async_add_entities(
        PlejdLight(coordinator, device)
        for device in coordinator.devices
        if device.category == CATEGORY_LIGHT and device.address is not None
    )


class PlejdLight(LightEntity):
    """A Plejd dimmer/relay output exposed as a light."""

    _attr_has_entity_name = True
    _attr_name = None

    def __init__(self, coordinator: PlejdCoordinator, device: PlejdCloudDevice) -> None:
        self._coordinator = coordinator
        self._device = device
        self._attr_unique_id = (
            device.device_id if device.output_index == 0 else f"{device.device_id}_{device.output_index}"
        )
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device.device_id)},
            name=device.name,
            manufacturer="Plejd",
            model=device.model,
        )
        mode = ColorMode.BRIGHTNESS if device.dimmable else ColorMode.ONOFF
        self._attr_color_mode = mode
        self._attr_supported_color_modes = {mode}

    @property
    def available(self) -> bool:
        return self._coordinator.available

    @property
    def is_on(self) -> bool | None:
        state = self._coordinator.state_for(self._device.address)
        return state.on if state is not None else None

    @property
    def brightness(self) -> int | None:
        if not self._device.dimmable:
            return None
        state = self._coordinator.state_for(self._device.address)
        return state.level if state is not None else None

    async def async_turn_on(self, **kwargs: Any) -> None:
        level = kwargs.get(ATTR_BRIGHTNESS)
        if level is None:
            # No brightness requested: restore the last level, or full if unknown/off.
            current = self.brightness
            level = current if current else 255
        await self._coordinator.async_set_output(self._device.address, True, level)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._coordinator.async_set_output(self._device.address, False, 0)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._coordinator.async_add_listener(self.async_write_ha_state))
