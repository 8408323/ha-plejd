"""Tests for plejd integration setup/teardown."""

from __future__ import annotations

import types

import plejd
import pytest
from plejd import PLATFORMS, async_setup_entry, async_unload_entry


class _FakeCoordinator:
    instances: list = []

    def __init__(self, hass, entry):
        self.started = False
        self.shutdown = False
        _FakeCoordinator.instances.append(self)

    async def async_start(self):
        self.started = True

    async def async_shutdown(self):
        self.shutdown = True


class _FakeConfigEntries:
    unload_result = True

    async def async_forward_entry_setups(self, entry, platforms):
        self.forwarded = platforms

    async def async_unload_platforms(self, entry, platforms):
        return self.unload_result


def _hass():
    return types.SimpleNamespace(config_entries=_FakeConfigEntries())


def _entry():
    return types.SimpleNamespace(data={}, runtime_data=None)


async def test_setup_starts_coordinator_and_forwards(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()
    assert await async_setup_entry(hass, entry) is True
    coord = entry.runtime_data
    assert coord.started is True
    assert hass.config_entries.forwarded == PLATFORMS


async def test_setup_shuts_down_when_forward_fails(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    _FakeCoordinator.instances.clear()
    hass, entry = _hass(), _entry()

    async def _boom(entry, platforms):
        raise RuntimeError("platform setup failed")

    hass.config_entries.async_forward_entry_setups = _boom
    with pytest.raises(RuntimeError, match="platform setup failed"):
        await async_setup_entry(hass, entry)
    assert _FakeCoordinator.instances[-1].shutdown is True


async def test_unload_shuts_down_coordinator(monkeypatch):
    monkeypatch.setattr(plejd, "PlejdCoordinator", _FakeCoordinator)
    entry = _entry()
    entry.runtime_data = _FakeCoordinator(None, entry)
    hass = _hass()
    assert await async_unload_entry(hass, entry) is True
    assert entry.runtime_data.shutdown is True


async def test_failed_unload_keeps_coordinator(monkeypatch):
    entry = _entry()
    entry.runtime_data = _FakeCoordinator(None, entry)
    hass = _hass()
    hass.config_entries.unload_result = False
    assert await async_unload_entry(hass, entry) is False
    assert entry.runtime_data.shutdown is False


def test_every_platform_module_is_forwarded():
    # Guard against adding a platform file but forgetting to forward it.
    import pathlib

    cc = pathlib.Path(__file__).parent.parent / "custom_components" / "plejd"
    platform_files = {
        f.stem
        for f in cc.glob("*.py")
        if f.stem in {"light", "switch", "cover", "climate", "binary_sensor", "sensor", "event", "scene"}
    }
    forwarded = {p.value for p in PLATFORMS}
    assert platform_files <= forwarded, f"not forwarded: {platform_files - forwarded}"
