"""Move a Plejd device to a different room.

Unlike the other manage_*.py modules, this is not a Parse cloud call - the app
models room membership as mesh group membership (confirmed via a live BLE
capture of the app's own "move device to room" action: it leaves the old
room's mesh group, then joins the new one). The cloud's own roomId/outputGroups
records converge afterward (observed within seconds on a live site with a
gateway online) - refreshing the site after the mesh write picks it up, the
same as the cloud-mutation manage_*.py modules' own refresh cycle.

This can't be fully atomic: if the join fails after the leave already
succeeded (e.g. the mesh connection drops mid-operation), the device is left
in no room until the operation is retried.
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import schedule_ws
from .cloud import PlejdAuthError, PlejdCloudError, PlejdCloudRoom, async_get_site, async_login
from .const import (
    CATEGORY_LIGHT,
    CONF_DEVICE_ADDRESSES,
    CONF_DEVICES,
    CONF_GATEWAYS,
    CONF_INPUTS,
    CONF_MOTION,
    CONF_RESOURCE_SET_ID,
    CONF_ROOMS,
    CONF_SCENES,
    CONF_SITE_ID,
    DOMAIN,
)

# Our own not-yet-cloud-confirmed moves (hass.data[DATA_PENDING_ROOM_MOVES][entry_id] =
# {device_id: {"room_id", "output_address", "is_light", "dimmable", "old_room_address",
# "new_room_address"}}), scoped to this integration's own calls only - never populated
# from a device's plain entry.data/cloud room_id. This is what lets a repeat move trust
# "what we ourselves just did" without ALSO blindly trusting stale local data for a
# device this integration never touched (which could have been moved by the app instead,
# in which case the fresh cloud fetch is the authoritative one). Stores the full move,
# not just the destination room_id, so a later refresh (for a still-different device's
# move) can keep re-patching every pending device's own room-group membership too, not
# just its roomId - otherwise an earlier still-unconverged move's membership patch would
# get overwritten by the next refresh's fresh (stale) cloud snapshot. Deliberately
# in-memory only: lost on an HA restart, which is fine - entry.data itself already holds
# our last-written correction by then, this cache only informs the *next* call before
# that happens.
DATA_PENDING_ROOM_MOVES = f"{DOMAIN}_pending_room_moves"
# Serializes concurrent move_device_to_room calls for the SAME device - two overlapping
# calls could otherwise both read the same "current room" before either writes its own
# move back, ending with the device joined to both destinations and left from neither's
# actual current room. Different devices still move fully concurrently.
DATA_MOVE_LOCKS = f"{DOMAIN}_move_locks"


def _pending_moves(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, dict]:
    return hass.data.setdefault(DATA_PENDING_ROOM_MOVES, {}).setdefault(entry.entry_id, {})


def _move_lock(hass: HomeAssistant, entry: ConfigEntry, device_id: str) -> asyncio.Lock:
    locks = hass.data.setdefault(DATA_MOVE_LOCKS, {}).setdefault(entry.entry_id, {})
    return locks.setdefault(device_id, asyncio.Lock())


async def _async_login_and_get_site(hass: HomeAssistant, entry: ConfigEntry):
    http_session = async_get_clientsession(hass)
    try:
        token = await async_login(http_session, entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD])
    except PlejdAuthError as err:
        # Raising ConfigEntryAuthFailed only triggers reauth from async_setup_entry or a
        # coordinator's own update method - a service handler must start it explicitly.
        entry.async_start_reauth(hass)
        raise HomeAssistantError("Plejd cloud credentials rejected; reauthentication started") from err
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error: {err}") from err
    try:
        site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error: {err}") from err
    return http_session, token, site


def _patch_room_membership(
    rooms: list[PlejdCloudRoom],
    *,
    output_address: int | None,
    is_light: bool,
    dimmable: bool,
    old_room_address: int | None,
    new_room_address: int,
) -> list[PlejdCloudRoom]:
    """Locally correct the device's room-group membership for rooms already present.

    Needed for the same reason as the roomId override above: on a BLE-only site the
    cloud's outputGroups (what `rooms`/PlejdRoomLight's aggregate membership is built
    from) may never reflect a mesh-only move. Uses the output's own mesh address (what
    member_addresses actually stores), not the device's own join/leave-command address -
    they can differ, since an output's address is preferred from outputAddress and only
    falls back to deviceAddress when missing.

    PlejdCloudRoom is a light-only aggregate - parse_site() excludes a group entirely if
    it has any non-light member, since a group command would hit that member too. If the
    output has no resolvable address, this leaves `rooms` untouched (nothing to key off).
    For a non-light move, the destination room's mesh group now genuinely has a non-light
    member even though this function can't safely ADD it there (see below) - so instead
    of just leaving a stale entry cached as "safe", drop any existing room entry at
    new_room_address entirely; a device already joined to that mesh group broadcasts
    would otherwise still hit it via a room light that no longer reflects reality.

    Deliberately does NOT synthesize a new room entry when new_room_address isn't found
    here - parse_site() can have excluded it for a real reason (no other light member, or
    a non-light member sharing the same group address), which this function has no way
    to distinguish from "just empty"; a genuinely new light-group entity for it will
    appear once the cloud does converge.
    """
    if output_address is None:
        return list(rooms)
    if not is_light:
        return [r for r in rooms if r.address != new_room_address]
    patched = []
    for room in rooms:
        if room.address == old_room_address and output_address in room.member_addresses:
            members = [m for m in room.member_addresses if m != output_address]
            if not members:
                continue  # matches parse_site(): a room with no controllable outputs isn't kept
            dimmable_addresses = [m for m in room.dimmable_addresses if m != output_address]
            patched.append(
                PlejdCloudRoom(
                    room_id=room.room_id,
                    name=room.name,
                    address=room.address,
                    member_addresses=members,
                    dimmable=bool(dimmable_addresses),
                    dimmable_addresses=dimmable_addresses,
                )
            )
        elif room.address == new_room_address:
            dimmable_addresses = sorted(set(room.dimmable_addresses) | ({output_address} if dimmable else set()))
            patched.append(
                PlejdCloudRoom(
                    room_id=room.room_id,
                    name=room.name,
                    address=room.address,
                    member_addresses=sorted(set(room.member_addresses) | {output_address}),
                    dimmable=room.dimmable or dimmable,
                    dimmable_addresses=dimmable_addresses,
                )
            )
        else:
            patched.append(room)
    return patched


async def _async_refresh_and_reload(
    hass: HomeAssistant,
    entry: ConfigEntry,
    http_session,
    token,
    *,
    pending: dict[str, dict],
) -> None:
    try:
        fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error refreshing site: {err}") from err
    # Claim the manual-reload so the entry's update listener (_async_reload_entry) doesn't
    # also reload for this same data change, racing this one - same guard schedule_ws's
    # own _async_persist uses for the identical async_update_entry -> listener race.
    hass.data[schedule_ws.DATA_MANUAL_RELOAD] = entry.entry_id
    try:
        # Every device with a pending (not-yet-cloud-confirmed) move keeps its intended
        # room_id regardless of what this fresh cloud fetch says - not just the device
        # this particular call just moved - or an earlier move's own correction would get
        # reverted the next time any device is moved before the cloud converges. A pending
        # entry is dropped once the fresh fetch actually agrees with it (converged).
        device_dicts = []
        for d in fresh_site.devices:
            move = pending.get(d.device_id)
            if move is not None:
                if move["room_id"] == d.room_id:
                    del pending[d.device_id]
                else:
                    device_dicts.append({**asdict(d), "room_id": move["room_id"]})
                    continue
            device_dicts.append(asdict(d))
        # Re-apply every still-pending device's own room-group membership patch too, not
        # just the room_id above - otherwise refreshing for one device's move would wipe
        # out an earlier, still-unconverged device's own membership correction, since this
        # always starts fresh from the cloud's own (possibly stale) rooms snapshot.
        rooms = fresh_site.rooms
        for move in pending.values():
            rooms = _patch_room_membership(
                rooms,
                output_address=move["output_address"],
                is_light=move["is_light"],
                dimmable=move["dimmable"],
                old_room_address=move["old_room_address"],
                new_room_address=move["new_room_address"],
            )
        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_DEVICES: device_dicts,
                CONF_INPUTS: [asdict(i) for i in fresh_site.inputs],
                CONF_MOTION: [asdict(m) for m in fresh_site.motion],
                CONF_SCENES: [asdict(s) for s in fresh_site.scenes],
                CONF_ROOMS: [asdict(r) for r in rooms],
                CONF_GATEWAYS: fresh_site.gateways,
                CONF_RESOURCE_SET_ID: fresh_site.resource_set_id,
                CONF_DEVICE_ADDRESSES: fresh_site.device_addresses,
            },
        )
        if not await hass.config_entries.async_reload(entry.entry_id):
            # e.g. a platform refused to unload - the entry may still be running the old
            # data/entities for the just-moved device, so this can't be reported as a
            # clean success.
            raise HomeAssistantError("Plejd device moved, but reloading the integration failed - reload it manually")
    finally:
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD, None)
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD_SEEN, None)
        if hass.data.get(schedule_ws.DATA_RELOAD_PENDING) == entry.entry_id:
            # A concurrent options/data change's own reload was suppressed by the guard
            # above while ours was in flight; give it a reload of its own instead of
            # dropping it silently (see _async_reload_entry).
            hass.data.pop(schedule_ws.DATA_RELOAD_PENDING, None)
            await hass.config_entries.async_reload(entry.entry_id)


async def async_move_device_to_room(hass: HomeAssistant, entry: ConfigEntry, *, device_id: str, room_id: str) -> None:
    """Move a device to a different room by rejoining its mesh group, then refresh + reload."""
    # Serializes calls for this SAME device: two overlapping moves could otherwise both
    # read the same "current room" before either recorded its own, ending with the device
    # joined to both destinations. Different devices still move fully concurrently.
    async with _move_lock(hass, entry, device_id):
        http_session, token, site = await _async_login_and_get_site(hass, entry)
        own_address = site.device_addresses.get(device_id)
        if own_address is None:
            raise HomeAssistantError(f"Plejd device {device_id} not found on this site")
        outputs = [d for d in site.devices if d.device_id == device_id]
        if not outputs:
            # A real physical device with no controllable output (a motion sensor, an
            # input-only device, a gateway) - has an entry in device_addresses but none in
            # site.devices.
            raise HomeAssistantError(f"Plejd device {device_id} has no controllable output to move")
        if len(outputs) > 1 or len(outputs[0].outputs) > 1:
            # The mesh command targets the device's own (shared) address, not a per-output
            # one, but a live capture confirmed a multi-output device's outputs can have
            # independently different rooms - without a capture of moving a second output
            # to confirm how (or whether) the command disambiguates between them, moving a
            # multi-output device risks silently moving the wrong output, or both. Checked
            # both ways since a single site.devices record can itself list every output
            # address for the device (built from outputAddress), not just len(outputs).
            raise HomeAssistantError(
                f"Plejd device {device_id} has multiple outputs; move_device_to_room isn't safe for it yet"
            )
        new_room = next((r for r in site.all_rooms if r.room_id == room_id), None)
        if new_room is None:
            raise HomeAssistantError(f"Plejd room {room_id} not found on this site")
        if new_room.address is None:
            raise HomeAssistantError(f"Plejd room '{new_room.name}' has no mesh group address")

        # Prefer our own pending (not-yet-cloud-confirmed) move over this fresh cloud
        # fetch's room_id - the cloud may still report a prior mesh-only move's OLD room
        # if it hasn't converged yet (see _async_refresh_and_reload), and a second move
        # before that convergence must not re-derive "current room" from data already
        # known to be stale, or it can reject a legitimate "move back", or leave the wrong
        # (still-actually-current) room's mesh group. A device this integration has never
        # moved has no pending entry, so it correctly falls back to trusting the cloud
        # directly - e.g. if it was instead moved via the app itself, the cloud (not any
        # of our own state) is the authoritative source for that.
        pending = _pending_moves(hass, entry)
        this_move = pending.get(device_id)
        current_room_id = this_move["room_id"] if this_move is not None else outputs[0].room_id
        if current_room_id == room_id:
            raise HomeAssistantError(f"Device is already in room '{new_room.name}'")

        old_room = next((r for r in site.all_rooms if r.room_id == current_room_id), None) if current_room_id else None
        if current_room_id is not None and (old_room is None or old_room.address is None):
            # Silently skipping the leave and only joining would leave the device
            # subscribed to BOTH the old and new room's mesh groups - fail before sending
            # any mesh command rather than risk a partial move.
            raise HomeAssistantError(f"Plejd device {device_id}'s current room has no resolvable mesh group address")

        coordinator = entry.runtime_data
        if old_room is not None:
            await coordinator.async_leave_mesh_group(own_address, old_room.address)
        await coordinator.async_join_mesh_group(own_address, new_room.address)

        output = outputs[0]
        pending[device_id] = {
            "room_id": room_id,
            "output_address": output.address,
            "is_light": output.category == CATEGORY_LIGHT,
            "dimmable": output.dimmable,
            "old_room_address": old_room.address if old_room is not None else None,
            "new_room_address": new_room.address,
        }

        await _async_refresh_and_reload(hass, entry, http_session, token, pending=pending)
