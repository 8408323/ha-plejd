"""WebSocket API for the dashboard's dim-binding editor.

Admin-only commands to list/save bindings and enumerate a remote device's triggers,
so the panel can offer a picker for any remote (device triggers from any integration).
"""

from __future__ import annotations

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.device_automation import DeviceAutomationType, async_get_device_automations
from homeassistant.core import HomeAssistant

from .const import DOMAIN

DATA_BINDINGS = f"{DOMAIN}_dim_bindings"


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/dim_bindings/list"})
@websocket_api.async_response
async def ws_list(hass: HomeAssistant, connection, msg) -> None:
    bindings = hass.data.get(DATA_BINDINGS)
    connection.send_result(msg["id"], {"bindings": bindings.bindings if bindings is not None else []})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/dim_bindings/save", vol.Required("bindings"): [dict]})
@websocket_api.async_response
async def ws_save(hass: HomeAssistant, connection, msg) -> None:
    bindings = hass.data.get(DATA_BINDINGS)
    if bindings is None:
        connection.send_error(msg["id"], "not_loaded", "Plejd is not loaded")
        return
    await bindings.async_replace(msg["bindings"])
    connection.send_result(msg["id"], {"bindings": bindings.bindings})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/device_triggers", vol.Required("device_id"): str})
@websocket_api.async_response
async def ws_device_triggers(hass: HomeAssistant, connection, msg) -> None:
    """Return the HA device triggers available for a device (the remote picker)."""
    device_id = msg["device_id"]
    triggers = await async_get_device_automations(hass, DeviceAutomationType.TRIGGER, [device_id])
    connection.send_result(msg["id"], {"triggers": triggers.get(device_id, [])})


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)
    websocket_api.async_register_command(hass, ws_save)
    websocket_api.async_register_command(hass, ws_device_triggers)
