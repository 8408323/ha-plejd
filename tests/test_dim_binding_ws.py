"""Tests for the dim-binding WebSocket API."""

from __future__ import annotations

import types

from plejd import dim_binding_ws
from plejd.dim_binding_ws import DATA_BINDINGS


class _Conn:
    def __init__(self):
        self.result = None
        self.error = None

    def send_result(self, msg_id, payload):
        self.result = (msg_id, payload)

    def send_error(self, msg_id, code, message):
        self.error = (msg_id, code, message)


class _Bindings:
    def __init__(self, items):
        self.bindings = items
        self.replaced = None

    async def async_replace(self, items):
        self.replaced = items
        self.bindings = items


def _hass(**kw):
    return types.SimpleNamespace(data={}, **kw)


async def test_list_returns_bindings():
    hass = _hass()
    hass.data[DATA_BINDINGS] = _Bindings([{"id": "b1"}])
    conn = _Conn()
    await dim_binding_ws.ws_list(hass, conn, {"id": 7})
    assert conn.result == (7, {"bindings": [{"id": "b1"}]})


async def test_list_empty_when_not_loaded():
    conn = _Conn()
    await dim_binding_ws.ws_list(_hass(), conn, {"id": 7})
    assert conn.result == (7, {"bindings": []})


async def test_save_replaces_and_returns():
    hass = _hass()
    store = _Bindings([])
    hass.data[DATA_BINDINGS] = store
    conn = _Conn()
    new = [{"id": "b1", "up": {"x": 1}}]
    await dim_binding_ws.ws_save(hass, conn, {"id": 8, "bindings": new})
    assert store.replaced == new
    assert conn.result == (8, {"bindings": new})


async def test_save_errors_when_not_loaded():
    conn = _Conn()
    await dim_binding_ws.ws_save(_hass(), conn, {"id": 9, "bindings": []})
    assert conn.error[0] == 9 and conn.error[1] == "not_loaded"
    assert conn.result is None


async def test_device_triggers_returns_devices_triggers():
    trigs = [{"type": "brightness_move_up"}, {"type": "brightness_stop"}]
    hass = _hass(device_automations={"dev1": trigs})
    conn = _Conn()
    await dim_binding_ws.ws_device_triggers(hass, conn, {"id": 5, "device_id": "dev1"})
    assert conn.result == (5, {"triggers": trigs})


async def test_device_triggers_empty_for_unknown_device():
    hass = _hass(device_automations={})
    conn = _Conn()
    await dim_binding_ws.ws_device_triggers(hass, conn, {"id": 5, "device_id": "gone"})
    assert conn.result == (5, {"triggers": []})


def test_async_register_registers_all_commands():
    hass = _hass()
    dim_binding_ws.async_register(hass)
    registered = hass.data["ws_commands"]
    assert dim_binding_ws.ws_list in registered
    assert dim_binding_ws.ws_save in registered
    assert dim_binding_ws.ws_device_triggers in registered


class _FailingBindings:
    bindings: list = []

    async def async_replace(self, items):
        raise ValueError("bad payload")


async def test_save_returns_error_when_replace_fails():
    hass = _hass()
    hass.data[DATA_BINDINGS] = _FailingBindings()
    conn = _Conn()
    await dim_binding_ws.ws_save(hass, conn, {"id": 3, "bindings": [{}]})
    assert conn.error[0] == 3 and conn.error[1] == "save_failed"
    assert conn.result is None
