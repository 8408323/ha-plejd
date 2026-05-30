"""Tests for the Plejd config flow."""

from __future__ import annotations

import types

from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from plejd.config_flow import PlejdConfigFlow
from plejd.const import CONF_DISCOVERED_ADDRESS

_LOGIN = {CONF_EMAIL: "user@example.com", CONF_PASSWORD: "x"}


async def test_user_step_shows_form():
    flow = PlejdConfigFlow()
    result = await flow.async_step_user()
    assert result["type"] == "form"
    assert result["step_id"] == "user"


async def test_user_step_creates_entry_without_discovery():
    flow = PlejdConfigFlow()
    result = await flow.async_step_user(_LOGIN)
    assert result["type"] == "create_entry"
    assert result["data"][CONF_EMAIL] == "user@example.com"
    assert result["data"][CONF_DISCOVERED_ADDRESS] is None


async def test_bluetooth_step_remembers_device_and_routes_to_form():
    flow = PlejdConfigFlow()
    flow.context = {}
    info = types.SimpleNamespace(address="AA:BB:CC:DD:EE:FF", name="Plejd DIM-01")
    result = await flow.async_step_bluetooth(info)
    assert result["type"] == "form"
    assert flow._discovered_address == "AA:BB:CC:DD:EE:FF"
    assert flow.context["title_placeholders"] == {"name": "Plejd DIM-01"}


async def test_discovered_address_flows_into_entry():
    flow = PlejdConfigFlow()
    flow.context = {}
    info = types.SimpleNamespace(address="11:22:33:44:55:66", name="Plejd")
    await flow.async_step_bluetooth(info)
    result = await flow.async_step_user(_LOGIN)
    assert result["data"][CONF_DISCOVERED_ADDRESS] == "11:22:33:44:55:66"
