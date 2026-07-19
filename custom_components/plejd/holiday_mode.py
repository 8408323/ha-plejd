"""Holiday mode: presence simulation, the HA equivalent of the Plejd app's "Semesterläge".

While enabled and within a configured time-of-day window, periodically turns a
random subset of the target lights on for a randomized duration, so an empty home
looks lived-in while away. Drives plain `light.turn_on`/`light.turn_off` (not
Plejd-specific mesh commands), matching this integration's existing "generic ramp"
approach (bindings.py) so it composes with any light in the user's HA setup, not
only Plejd ones.
"""

from __future__ import annotations

import logging
import random
from collections.abc import Callable
from datetime import datetime, time, timedelta
from typing import TYPE_CHECKING

from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import (
    CONF_HOLIDAY_LIGHTS,
    CONF_HOLIDAY_WINDOW_END,
    CONF_HOLIDAY_WINDOW_START,
    DOMAIN,
    HOLIDAY_WINDOW_END_DEFAULT,
    HOLIDAY_WINDOW_START_DEFAULT,
)

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

DATA_HOLIDAY_MODE = f"{DOMAIN}_holiday_mode"

CHECK_INTERVAL = timedelta(minutes=5)
TOGGLE_FRACTION = 0.4  # fraction of currently-off target lights turned on per tick
MIN_ON_MINUTES = 10
MAX_ON_MINUTES = 45


def _parse_hhmm(value: str) -> time:
    hour, minute = (int(p) for p in value.split(":")[:2])
    return time(hour, minute)


def _in_window(now: time, start: time, end: time) -> bool:
    """Whether `now` falls in [start, end); handles a window that crosses midnight."""
    if start <= end:
        return start <= now < end
    return now >= start or now < end


class PlejdHolidayMode:
    """Randomly varies target lights on a recurring schedule, only within an active window."""

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        *,
        rng: random.Random | None = None,
    ) -> None:
        self._hass = hass
        self._entry = entry
        self._rng = rng or random.Random()
        self._unsub: Callable[[], None] | None = None
        self._on_until: dict[str, datetime] = {}

    @property
    def is_running(self) -> bool:
        return self._unsub is not None

    def start(self) -> None:
        """Begin the recurring schedule (idempotent)."""
        if self._unsub is not None:
            return
        self._unsub = async_track_time_interval(self._hass, self._async_tick, CHECK_INTERVAL)

    def stop(self) -> None:
        """Stop the recurring schedule (idempotent)."""
        if self._unsub is not None:
            self._unsub()
            self._unsub = None
        self._on_until.clear()

    def _window(self) -> tuple[time, time]:
        options = self._entry.options
        start = _parse_hhmm(options.get(CONF_HOLIDAY_WINDOW_START, HOLIDAY_WINDOW_START_DEFAULT))
        end = _parse_hhmm(options.get(CONF_HOLIDAY_WINDOW_END, HOLIDAY_WINDOW_END_DEFAULT))
        return start, end

    def _target_lights(self) -> list[str]:
        """Configured target lights, or every Plejd light entity if none are configured."""
        configured = self._entry.options.get(CONF_HOLIDAY_LIGHTS)
        if configured:
            return list(configured)
        registry = er.async_get(self._hass)
        entries = er.async_entries_for_config_entry(registry, self._entry.entry_id)
        return [entry.entity_id for entry in entries if entry.entity_id.startswith("light.")]

    async def _async_tick(self, _now: object) -> None:
        now_local = dt_util.now()
        start, end = self._window()
        if not _in_window(now_local.time(), start, end):
            return
        await self._async_apply(now_local)

    async def _async_apply(self, now_local: datetime) -> None:
        await self._async_turn_off_expired(now_local)
        off_lights = [entity_id for entity_id in self._target_lights() if entity_id not in self._on_until]
        if not off_lights:
            return
        count = min(len(off_lights), max(1, round(len(off_lights) * TOGGLE_FRACTION)))
        for entity_id in self._rng.sample(off_lights, count):
            minutes = self._rng.uniform(MIN_ON_MINUTES, MAX_ON_MINUTES)
            self._on_until[entity_id] = now_local + timedelta(minutes=minutes)
            await self._hass.services.async_call("light", "turn_on", {"entity_id": entity_id}, blocking=True)

    async def _async_turn_off_expired(self, now_local: datetime) -> None:
        expired = [entity_id for entity_id, deadline in self._on_until.items() if deadline <= now_local]
        for entity_id in expired:
            del self._on_until[entity_id]
            await self._hass.services.async_call("light", "turn_off", {"entity_id": entity_id}, blocking=True)
