"""Plejd switch platform (relays / non-dimmable loads)."""

from __future__ import annotations

from typing import Any

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.restore_state import RestoreEntity

from .cloud import PlejdCloudDevice
from .const import CATEGORY_SWITCH, CONF_SCHEDULES, DOMAIN
from .coordinator import PlejdCoordinator
from .protocol import weekday_mask


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up Plejd relay switches and on-device schedule switches."""
    coordinator: PlejdCoordinator = entry.runtime_data
    entities: list[SwitchEntity] = [
        PlejdSwitch(coordinator, device)
        for device in coordinator.devices
        if device.category == CATEGORY_SWITCH and device.address is not None
    ]
    entities.extend(PlejdScheduleSwitch(coordinator, sched) for sched in entry.options.get(CONF_SCHEDULES, []))
    async_add_entities(entities)


def _schedule_args(schedule: dict) -> tuple[int, int, int, int, int, int]:
    """Derive (weekday_mask, hour, minute, second, scene, fade) from a schedule dict."""
    parts = [int(p) for p in schedule["time"].split(":")]
    hour, minute = parts[0], parts[1]
    second = parts[2] if len(parts) > 2 else 0
    return weekday_mask(schedule["days"]), hour, minute, second, schedule["scene"], schedule.get("fade", 0)


class PlejdScheduleSwitch(SwitchEntity, RestoreEntity):
    """Enable/disable an on-device time event that runs a scene on a weekly schedule."""

    _attr_entity_category = EntityCategory.CONFIG
    _attr_icon = "mdi:calendar-clock"

    def __init__(self, coordinator: PlejdCoordinator, schedule: dict) -> None:
        self._coordinator = coordinator
        self._schedule = schedule
        self._slot = schedule["slot"]
        self._attr_name = schedule["name"]
        self._attr_is_on = True
        self._attr_unique_id = f"{coordinator.site_id}_schedule_{self._slot}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.site_id)},
            name="Plejd",
            manufacturer="Plejd",
            model="Site",
        )

    async def _program(self) -> None:
        await self._coordinator.async_program_time_event(self._slot, *_schedule_args(self._schedule))

    async def async_turn_on(self, **kwargs: object) -> None:
        await self._program()
        self._attr_is_on = True
        self.async_write_ha_state()

    async def async_turn_off(self, **kwargs: object) -> None:
        await self._coordinator.async_remove_time_event(self._slot)
        self._attr_is_on = False
        self.async_write_ha_state()

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        last = await self.async_get_last_state()
        if last is not None:
            self._attr_is_on = last.state == "on"
        # Re-assert the device-side event so the mesh matches HA's intent after a restart.
        if self._attr_is_on:
            await self._program()
        else:
            await self._coordinator.async_remove_time_event(self._slot)


class PlejdSwitch(SwitchEntity):
    """A Plejd relay output exposed as a switch."""

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
