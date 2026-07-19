"""Remote → light dim bindings, managed by the integration.

A binding maps a remote's hold/release actions (any HA device trigger — IKEA, Hue, ZHA,
Zigbee2MQTT, …) to smooth hold-to-dim of a target: any Home Assistant light or a whole
area, Plejd or not. Bindings are stored here and their triggers attached via HA's generic
trigger machinery; when one fires, a brightness-step ramp runs on the target via
`light.turn_on` (so it works for every light, and rides Plejd's acked path when the
target is Plejd).
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any
from uuid import uuid4

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store
from homeassistant.helpers.trigger import async_initialize_triggers

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

STORE_VERSION = 1
STORE_KEY = f"{DOMAIN}.dim_bindings"

# Brightness delta per tick (percent), tick spacing, and a safety cap so a missed
# release event can't ramp forever.
DIM_STEP_PCT = 5
DIM_INTERVAL = 0.12
DIM_MAX_DURATION = 8.0

_TARGET_KEYS = ("entity_id", "device_id", "area_id")


def _target(binding: dict) -> dict[str, Any]:
    """The HA service target from a binding (entity/device/area), non-empty keys only."""
    targets = binding.get("targets") or {}
    return {key: targets[key] for key in _TARGET_KEYS if targets.get(key)}


def _ensure_ids(bindings: list[dict]) -> bool:
    """Give every binding a stable unique id (so ramps never collide under a shared key).

    Mutates in place; returns True if any id was newly assigned.
    """
    assigned = False
    for binding in bindings:
        if not binding.get("id"):
            binding["id"] = uuid4().hex
            assigned = True
    return assigned


class DimRamp:
    """Generic hold-to-dim: steps a target's brightness via `light.turn_on` while held.

    Keyed so each binding gets its own cancellable ramp. Works on any light because it
    hands the whole target (entity/device/area) to `light.turn_on`, which expands an
    area to its lights. Runs as a system action (a remote trigger fired it), so no user
    context or per-user permission check applies — like any automation-driven call.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        *,
        step_pct: int = DIM_STEP_PCT,
        interval: float = DIM_INTERVAL,
        max_duration: float = DIM_MAX_DURATION,
    ) -> None:
        self._hass = hass
        self._step_pct = step_pct
        self._interval = interval
        self._max_duration = max_duration
        self._tasks: dict[str, asyncio.Task] = {}

    def start(self, key: str, target: dict[str, Any], direction: str) -> None:
        """Begin ramping `target` up/down while held (restarts if already running)."""
        self.stop(key)
        if not target:
            return  # nothing to dim
        task = self._spawn(self._run(target, direction))
        self._tasks[key] = task
        task.add_done_callback(lambda finished, k=key: self._forget(k, finished))

    def stop(self, key: str) -> None:
        """Stop ramping for this binding (no-op if not running)."""
        task = self._tasks.get(key)
        if task is not None:
            task.cancel()

    def shutdown(self) -> None:
        for task in list(self._tasks.values()):
            task.cancel()
        self._tasks.clear()

    def _forget(self, key: str, task: asyncio.Task) -> None:
        if self._tasks.get(key) is task:
            del self._tasks[key]

    def _spawn(self, coro) -> asyncio.Task:
        create = getattr(self._hass, "async_create_background_task", None)
        if create is not None:
            return create(coro, name="plejd-dim-binding")
        return asyncio.ensure_future(coro)

    async def _run(self, target: dict[str, Any], direction: str) -> None:
        step = self._step_pct if direction == "up" else -self._step_pct
        elapsed = 0.0
        while elapsed < self._max_duration:
            await self._hass.services.async_call(
                "light", "turn_on", {**target, "brightness_step_pct": step}, blocking=True
            )
            await asyncio.sleep(self._interval)
            elapsed += self._interval


class PlejdDimBindings:
    """Loads/persists dim bindings and attaches their triggers to the ramp."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store = Store(hass, STORE_VERSION, STORE_KEY)
        self._bindings: list[dict] = []
        self._unsubs: list = []
        self._ramp = DimRamp(hass)

    @property
    def bindings(self) -> list[dict]:
        return self._bindings

    async def async_load(self) -> None:
        self._bindings = await self._store.async_load() or []
        if _ensure_ids(self._bindings):
            await self._store.async_save(self._bindings)  # persist ids assigned to legacy data
        await self._async_attach()

    async def async_replace(self, bindings: list[dict]) -> None:
        """Persist the full set of bindings and re-attach their triggers."""
        self._bindings = bindings
        _ensure_ids(self._bindings)
        await self._store.async_save(self._bindings)
        self._detach()
        await self._async_attach()

    async def _async_attach(self) -> None:
        for binding in self._bindings:
            try:
                await self._attach(binding)
            except Exception:  # noqa: BLE001 - a stale binding (e.g. removed remote) mustn't break the rest
                _LOGGER.warning("Plejd: could not attach dim binding %s", binding.get("id"), exc_info=True)

    async def _attach(self, binding: dict) -> None:
        bid = binding["id"]  # guaranteed by _ensure_ids
        target = _target(binding)
        # Attach atomically: if any trigger fails, roll back the ones already attached for
        # this binding, so we never leave a ramp that can start but not stop.
        attached: list = []
        try:
            for key, direction in (("up", "up"), ("down", "down")):
                trigger = binding.get(key)
                if trigger:
                    await self._attach_trigger(attached, trigger, self._start_action(bid, target, direction))
            stop = binding.get("stop")
            if stop:
                await self._attach_trigger(attached, stop, self._stop_action(bid))
        except Exception:
            for unsub in attached:
                unsub()
            raise
        self._unsubs.extend(attached)

    async def _attach_trigger(self, attached: list, trigger, action) -> None:
        configs = trigger if isinstance(trigger, list) else [trigger]
        unsub = await async_initialize_triggers(self._hass, configs, action, DOMAIN, "plejd-dim", _LOGGER.log)
        if unsub is not None:
            attached.append(unsub)

    def _start_action(self, bid, target, direction):
        async def _action(run_variables=None, context=None):
            self._ramp.start(bid, target, direction)

        return _action

    def _stop_action(self, bid):
        async def _action(run_variables=None, context=None):
            self._ramp.stop(bid)

        return _action

    def _detach(self) -> None:
        for unsub in self._unsubs:
            unsub()
        self._unsubs = []

    def shutdown(self) -> None:
        self._detach()
        self._ramp.shutdown()
