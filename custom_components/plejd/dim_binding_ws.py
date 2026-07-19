"""WebSocket API for the dashboard's dim-binding editor.

Admin-only commands to list/save bindings and enumerate a remote device's triggers,
so the panel can offer a picker for any remote (device triggers from any integration).
"""

from __future__ import annotations

import logging

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.components.device_automation import DeviceAutomationType, async_get_device_automations
from homeassistant.core import HomeAssistant

from .bindings import InvalidDimBinding
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

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
    try:
        await bindings.async_replace(msg["bindings"])
    except InvalidDimBinding as err:
        # A known validation failure (e.g. a start trigger with no stop) — safe to surface
        # the reason. Only this specific type, so an unrelated ValueError can't leak internals.
        connection.send_error(msg["id"], "invalid_binding", str(err))
        return
    except Exception:  # noqa: BLE001 - log the detail server-side, return a stable generic message
        _LOGGER.exception("Plejd: failed to save dim bindings")
        connection.send_error(msg["id"], "save_failed", "Could not save bindings")
        return
    connection.send_result(msg["id"], {"bindings": bindings.bindings})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): "plejd/device_triggers", vol.Required("device_id"): str})
@websocket_api.async_response
async def ws_device_triggers(hass: HomeAssistant, connection, msg) -> None:
    """Return the HA device triggers available for a device (the remote picker)."""
    device_id = msg["device_id"]
    try:
        triggers = await async_get_device_automations(hass, DeviceAutomationType.TRIGGER, [device_id])
    except Exception:  # noqa: BLE001 - a genuine lookup failure, not "device has no triggers"
        # Surface the failure instead of an empty list: a real, user-picked device returning
        # empty reads as "no triggers" in the editor and its trigger cache then blocks a retry.
        # An unknown device with genuinely no triggers returns {} without raising (empty below).
        _LOGGER.warning("Plejd: could not get triggers for device %s", device_id, exc_info=True)
        connection.send_error(msg["id"], "triggers_failed", "Could not load device triggers")
        return
    connection.send_result(msg["id"], {"triggers": triggers.get(device_id, [])})


def async_register(hass: HomeAssistant) -> None:
    websocket_api.async_register_command(hass, ws_list)
    websocket_api.async_register_command(hass, ws_save)
    websocket_api.async_register_command(hass, ws_device_triggers)
