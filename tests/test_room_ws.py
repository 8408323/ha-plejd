"""Tests for the room-card WebSocket API (Plejd rooms + lamp styles)."""

from __future__ import annotations

import types

import pytest
from homeassistant.helpers import entity_registry as er
from plejd import room_ws
from plejd.cloud import PlejdCloudRoom
from plejd.schedule_ws import DATA_ENTRY


class _Conn:
    def __init__(self):
        self.result = None
        self.error = None

    def send_result(self, msg_id, payload):
        self.result = (msg_id, payload)

    def send_error(self, msg_id, code, message):
        self.error = (msg_id, code, message)


def _reg(unique_id, entity_id):
    return types.SimpleNamespace(unique_id=unique_id, entity_id=entity_id, config_entry_id="e1")


def _device(device_id, room_id, output_index=0, category="light"):
    return types.SimpleNamespace(device_id=device_id, room_id=room_id, output_index=output_index, category=category)


def _hass(coordinator=None):
    entry = types.SimpleNamespace(entry_id="e1", runtime_data=coordinator)
    registry = er.EntityRegistry(
        {
            e.entity_id: e
            for e in [
                _reg("room_r1", "light.kok"),
                _reg("d1", "light.kok_tak"),
                _reg("d2_1", "light.kok_spot"),
                _reg("d3", "light.hall"),
                _reg("room_r2", "light.tom"),
            ]
        }
    )
    return types.SimpleNamespace(data={DATA_ENTRY: entry}, entity_registry=registry)


async def test_rooms_maps_each_plejd_room_to_its_group_light_and_members():
    coordinator = types.SimpleNamespace(
        rooms=[
            PlejdCloudRoom("r1", "Kök", 1, [], True, []),
            PlejdCloudRoom("r2", "Tomt", 2, [], False, []),
        ],
        devices=[
            _device("d1", "r1"),
            _device("d2", "r1", output_index=1),
            _device("d3", None),
            _device("d4", "r1", category="relay"),  # not a light
            _device("d5", "r1"),  # no entity registered
        ],
    )
    conn = _Conn()
    await room_ws.ws_rooms(_hass(coordinator), conn, {"id": 1})
    assert conn.result == (
        1,
        {
            "rooms": [
                {
                    "room_id": "r1",
                    "name": "Kök",
                    "entity_id": "light.kok",
                    "lights": ["light.kok_tak", "light.kok_spot"],
                },
                {"room_id": "r2", "name": "Tomt", "entity_id": "light.tom", "lights": []},
            ]
        },
    )


async def test_rooms_errors_when_not_loaded():
    conn = _Conn()
    await room_ws.ws_rooms(_hass(None), conn, {"id": 2})
    assert conn.error == (2, "not_loaded", "Plejd is not loaded")


async def test_styles_default_to_empty_and_list_the_lamp_types():
    conn = _Conn()
    await room_ws.ws_styles_get(_hass(), conn, {"id": 3})
    assert conn.result == (3, {"styles": {}, "available": list(room_ws.LIGHT_STYLES)})


@pytest.mark.parametrize("style", ["pendant", "spot"])
async def test_style_set_persists_and_clear_removes(style):
    hass = _hass()
    conn = _Conn()
    await room_ws.ws_styles_set(hass, conn, {"id": 4, "entity_id": "light.kok_tak", "style": style})
    await room_ws.ws_styles_set(hass, conn, {"id": 5, "entity_id": "light.hall", "style": "wall"})
    await room_ws.ws_styles_get(hass, conn, {"id": 6})
    assert conn.result[1]["styles"] == {"light.kok_tak": style, "light.hall": "wall"}
    await room_ws.ws_styles_set(hass, conn, {"id": 7, "entity_id": "light.hall", "style": None})
    assert conn.result == (7, {"styles": {"light.kok_tak": style}})


def test_async_register_registers_all_commands():
    hass = types.SimpleNamespace(data={})
    room_ws.async_register(hass)
    assert {room_ws.ws_rooms, room_ws.ws_styles_get, room_ws.ws_styles_set} <= set(hass.data["ws_commands"])
