"""Plejd button platform — site-level actions (clock sync).

Plejd time/astro events run on the devices themselves, so their clocks must be
set. The coordinator syncs on connect and daily; this exposes a manual re-sync.
The entity lives on a per-site "hub" device that groups mesh-wide controls.
"""

from __future__ import annotations

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import PlejdCoordinator


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback) -> None:
    """Set up the Plejd site-level buttons."""
    coordinator: PlejdCoordinator = entry.runtime_data
    async_add_entities([PlejdSyncClockButton(coordinator)])


class PlejdSyncClockButton(ButtonEntity):
    """Broadcasts the current local time to every device in the mesh."""

    _attr_has_entity_name = True
    _attr_translation_key = "sync_clock"
    _attr_entity_category = EntityCategory.CONFIG

    def __init__(self, coordinator: PlejdCoordinator) -> None:
        self._coordinator = coordinator
        self._attr_unique_id = f"{coordinator.site_id}_sync_clock"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, coordinator.site_id)},
            name="Plejd",
            manufacturer="Plejd",
            model="Site",
        )

    async def async_press(self) -> None:
        await self._coordinator.async_sync_clock()
