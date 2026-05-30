"""Tests for plejd integration setup/teardown."""

from __future__ import annotations

from plejd import PLATFORMS, async_setup_entry, async_unload_entry
from plejd.const import DOMAIN


class _FakeConfigEntries:
    unload_result = True

    async def async_forward_entry_setups(self, entry, platforms):
        return None

    async def async_unload_platforms(self, entry, platforms):
        return self.unload_result


class _FakeHass:
    def __init__(self):
        self.data: dict = {}
        self.config_entries = _FakeConfigEntries()


class _FakeEntry:
    entry_id = "entry-1"
    data = {"email": "user@example.com"}


async def test_setup_stores_entry_data():
    hass = _FakeHass()
    assert await async_setup_entry(hass, _FakeEntry()) is True
    assert hass.data[DOMAIN]["entry-1"] == {"email": "user@example.com"}


async def test_unload_removes_entry_data():
    hass = _FakeHass()
    entry = _FakeEntry()
    await async_setup_entry(hass, entry)
    assert await async_unload_entry(hass, entry) is True
    assert "entry-1" not in hass.data[DOMAIN]


async def test_failed_unload_keeps_entry_data():
    hass = _FakeHass()
    hass.config_entries.unload_result = False
    entry = _FakeEntry()
    await async_setup_entry(hass, entry)
    assert await async_unload_entry(hass, entry) is False
    assert "entry-1" in hass.data[DOMAIN]


def test_platforms_start_empty():
    assert PLATFORMS == []
