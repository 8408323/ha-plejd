"""Smooth remote-driven dimming for Plejd lights over the fast gateway path.

A dimmer remote's "move while held, stop on release" actions (IKEA/Hue style) map to
:meth:`PlejdDimRamp.start` / :meth:`PlejdDimRamp.stop`: start walks the target output's
brightness one step per tick in the given direction until released or a bound is hit.
It rides the coordinator's gateway command path, which delivers each step reliably since
v0.8.0 (#70) — so the ramp is smooth instead of the chunky input_number workaround.
"""

from __future__ import annotations

import asyncio
import logging

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from .const import CATEGORY_LIGHT, DOMAIN
from .coordinator import PlejdCoordinator

_LOGGER = logging.getLogger(__name__)

# Per-tick brightness delta (0-255) and tick spacing. ~13/255 every 100 ms walks the
# full range in ~2 s, matching a comfortable hold-to-dim feel.
DIM_STEP = 13
DIM_INTERVAL = 0.1
# Holding "down" dims to a low floor, not fully off — releasing leaves the light on,
# like a physical dimmer.
DIM_MIN = 1
DIM_MAX = 255


def resolve_addresses(
    hass: HomeAssistant,
    coordinator: PlejdCoordinator,
    entity_ids: list[str],
    area_ids: list[str] = (),
    device_ids: list[str] = (),
) -> list[int]:
    """Resolve target Plejd light entities, areas, and/or devices to mesh output addresses.

    Entity targets resolve to their own output; a device target to all its outputs. An
    area target ("a whole Plejd room") expands to every *dimmable* Plejd light in that HA
    area, so a remote can dim the room in one gesture without listing each light. Unknown
    / non-Plejd targets are skipped; the result is de-duplicated in target order.
    """
    ent_reg = er.async_get(hass)
    by_unique_id: dict[str, int] = {}
    for device in coordinator.devices:
        if device.address is None:
            continue
        unique_id = device.device_id if device.output_index == 0 else f"{device.device_id}_{device.output_index}"
        by_unique_id[unique_id] = device.address

    addresses: list[int] = []
    seen: set[int] = set()

    def _add(address: int) -> None:
        if address not in seen:
            seen.add(address)
            addresses.append(address)

    for entity_id in entity_ids:
        entry = ent_reg.async_get(entity_id)
        if entry is None or entry.platform != DOMAIN:
            _LOGGER.warning("Plejd dim: %s is not a Plejd entity; skipping", entity_id)
            continue
        address = by_unique_id.get(entry.unique_id)
        if address is None:
            _LOGGER.warning("Plejd dim: no Plejd output found for %s; skipping", entity_id)
            continue
        _add(address)

    if device_ids:
        dev_reg = dr.async_get(hass)
        plejd_device_ids: set[str] = set()
        for ha_device_id in device_ids:
            entry = dev_reg.async_get(ha_device_id)
            if entry is not None:
                plejd_device_ids.update(ident[1] for ident in entry.identifiers if ident[0] == DOMAIN)
        for device in coordinator.devices:
            if device.address is not None and device.device_id in plejd_device_ids:
                _add(device.address)

    if area_ids:
        dev_reg = dr.async_get(hass)
        for device in coordinator.devices:
            if device.address is None or device.category != CATEGORY_LIGHT or not device.dimmable:
                continue
            dev_entry = dev_reg.async_get_device(identifiers={(DOMAIN, device.device_id)})
            if dev_entry is not None and dev_entry.area_id in area_ids:
                _add(device.address)

    return addresses


class PlejdDimRamp:
    """Runs and cancels per-output brightness ramps, one background task per address."""

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: PlejdCoordinator,
        *,
        step: int = DIM_STEP,
        interval: float = DIM_INTERVAL,
    ) -> None:
        self._hass = hass
        self._coordinator = coordinator
        self._step = step
        self._interval = interval
        self._tasks: dict[int, asyncio.Task] = {}

    def start(self, address: int, direction: int) -> None:
        """Begin ramping `address` up (direction >= 0) or down (direction < 0) while held."""
        self.stop(address)
        task = self._spawn(self._run(address, direction))
        self._tasks[address] = task
        # Drop the entry when the ramp ends on its own (bound reached), but only if it's
        # still the current task — a start() that replaced it must not be evicted.
        task.add_done_callback(lambda finished, addr=address: self._forget(addr, finished))

    def stop(self, address: int) -> None:
        """Stop ramping `address` (no-op if it isn't ramping)."""
        task = self._tasks.get(address)
        if task is not None:
            task.cancel()

    def shutdown(self) -> None:
        """Cancel every in-flight ramp (entry unload/reload)."""
        for task in list(self._tasks.values()):
            task.cancel()
        self._tasks.clear()

    def _forget(self, address: int, task: asyncio.Task) -> None:
        if self._tasks.get(address) is task:
            del self._tasks[address]

    def _spawn(self, coro) -> asyncio.Task:
        create = getattr(self._hass, "async_create_background_task", None)
        if create is not None:
            return create(coro, name="plejd-dim-ramp")
        return asyncio.ensure_future(coro)

    async def _run(self, address: int, direction: int) -> None:
        state = self._coordinator.state_for(address)
        is_on = state is not None and state.on
        level = state.level if state is not None else 0
        if direction < 0 and (not is_on or level <= DIM_MIN):
            return  # already off or at the floor — nothing to dim down
        if not is_on:
            level = 0  # ramping up from off starts at the bottom
        step = self._step if direction >= 0 else -self._step
        while True:
            level = max(DIM_MIN, min(DIM_MAX, level + step))
            await self._coordinator.async_set_output(address, True, level)
            if level <= DIM_MIN or level >= DIM_MAX:
                return  # reached a bound; hold there until released
            await asyncio.sleep(self._interval)
