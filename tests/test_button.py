"""Tests for the Plejd button platform (site clock-sync)."""

from __future__ import annotations

import types

from homeassistant.const import EntityCategory
from plejd.button import PlejdSyncClockButton, async_setup_entry


class _Coordinator:
    site_id = "site-1"

    def __init__(self):
        self.syncs = 0

    async def async_sync_clock(self):
        self.syncs += 1


async def test_setup_creates_one_clock_button():
    entry = types.SimpleNamespace(runtime_data=_Coordinator())
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 1
    assert added[0]._attr_unique_id == "site-1_sync_clock"
    assert added[0]._attr_entity_category == EntityCategory.CONFIG


async def test_press_syncs_the_clock():
    coord = _Coordinator()
    button = PlejdSyncClockButton(coord)
    await button.async_press()
    assert coord.syncs == 1
