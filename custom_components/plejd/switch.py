"""Plejd switch platform (relays / non-dimmable loads)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .cloud import PlejdCloudDevice
from .const import CATEGORY_SWITCH, DOMAIN
from .coordinator import PlejdCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd switches for the config entry."""
    coordinator: PlejdCoordinator = entry.runtime_data
    async_add_entities(
        PlejdSwitch(coordinator, device)
        for device in coordinator.devices
        if device.category == CATEGORY_SWITCH and device.address is not None
    )


class PlejdSwitch(SwitchEntity):
    """A Plejd relay output exposed as a switch."""

    _attr_has_entity_name = True
    _attr_name = None

    def __init__(self, coordinator: PlejdCoordinator, device: PlejdCloudDevice) -> None:
        self._coordinator = coordinator
        self._device = device
        self._attr_unique_id = f"{device.device_id}_{device.output_index}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, device.device_id)},
            name=device.name,
            manufacturer="Plejd",
            model=device.model,
        )

    @property
    def is_on(self) -> bool | None:
        state = self._coordinator.state_for(self._device.address)
        return state.on if state is not None else None

    async def async_turn_on(self, **kwargs: Any) -> None:
        await self._coordinator.async_set_output(self._device.address, self._device.output_index, True, 255)

    async def async_turn_off(self, **kwargs: Any) -> None:
        await self._coordinator.async_set_output(self._device.address, self._device.output_index, False, 0)

    async def async_added_to_hass(self) -> None:
        self.async_on_remove(self._coordinator.async_add_listener(self.async_write_ha_state))
