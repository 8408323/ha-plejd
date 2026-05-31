"""Diagnostics for the Plejd integration.

Downloadable config-entry diagnostics for troubleshooting. All secrets and PII —
credentials, the site crypto key, session/resource/installation ids, BLE addresses,
and device/room names — are redacted; only non-identifying structure (transport,
counts, models) is exposed.
"""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import (
    CONF_CRYPTO_KEY,
    CONF_DISCOVERED_ADDRESS,
    CONF_GATEWAYS,
    CONF_INSTALLATION_ID,
    CONF_RESOURCE_SET_ID,
    CONF_SITE_ID,
)
from .coordinator import PlejdCoordinator

# Keys to redact wherever they appear (entry data is nested: devices/scenes/inputs/…).
TO_REDACT = {
    "email",
    "password",
    CONF_CRYPTO_KEY,
    CONF_SITE_ID,
    CONF_RESOURCE_SET_ID,
    CONF_INSTALLATION_ID,
    CONF_DISCOVERED_ADDRESS,
    CONF_GATEWAYS,
    "device_id",
    "deviceId",
    "address",
    "outputs",
    "name",
    "room_id",
    "scene_id",
}


async def async_get_config_entry_diagnostics(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, Any]:
    """Return redacted diagnostics for a config entry."""
    coordinator: PlejdCoordinator = entry.runtime_data
    return {
        "entry_data": async_redact_data(dict(entry.data), TO_REDACT),
        "options": async_redact_data(dict(entry.options), TO_REDACT),
        "active_transport": coordinator.active_transport or "disconnected",
        "available": coordinator.available,
        "counts": {
            "devices": len(coordinator.devices),
            "scenes": len(coordinator.scenes),
            "inputs": len(coordinator.inputs),
            "motion": len(coordinator.motion),
            "gateways": len(entry.data.get(CONF_GATEWAYS) or []),
        },
        "models": sorted({device.model for device in coordinator.devices}),
    }
