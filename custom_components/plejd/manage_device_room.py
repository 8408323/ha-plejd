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

Known, accepted limitation of the pending-moves cache below: it trusts "the room
we ourselves last moved this device to" over the cloud for a device with a
pending entry, so that a repeat move before the cloud converges doesn't
re-derive "current room" from data already known to be stale. If the SAME
device is ALSO moved via the Plejd app in that same narrow window (before this
integration's own move converges), this cache has no way to detect that and
would still act on its own (by then wrong) last-known room. Resolving this
properly would need a way to read live mesh group membership directly, which
isn't confirmed to exist - this integration only pushes mesh commands, it
doesn't have a query path for them. Given the window is normally seconds (on a
site with a gateway, the only setup this has been live-tested against), this is
judged an acceptable tradeoff rather than something to chase further here.

A second, related, and equally accepted limitation: the pending-moves cache is
only ever consulted from THIS module's own refresh cycle. Every other
manage_*.py module (rooms, scenes, devices, add_device, ...) refreshes the site
and writes entry.data independently, with no shared choke point this module
could hook into short of a cross-cutting refactor of every management module's
own refresh path. If one of those unrelated actions runs after a move but
before the cloud converges, it can overwrite the locally-corrected room_id and
membership with the still-stale cloud snapshot - the same class of "we can only
protect what we ourselves touch" tradeoff as the one above, just triggered by a
different actor (another feature's refresh instead of the Plejd app). Given how
narrow the convergence window normally is, this is accepted rather than solved
by plumbing pending-move awareness through every other feature in the
integration.
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
    CONF_PENDING_ROOM_MOVES,
    CONF_RESOURCE_SET_ID,
    CONF_ROOMS,
    CONF_SCENES,
    CONF_SITE_ID,
    DOMAIN,
)

# Our own not-yet-cloud-confirmed moves (hass.data[DATA_PENDING_ROOM_MOVES][entry_id] =
# {device_id: {"room_id", "output_address", "is_light", "dimmable", "new_room_address",
# "from_room_id"}}),
# scoped to this integration's own calls only - never populated from a device's plain
# entry.data/cloud room_id. This is what lets a repeat move trust "what we ourselves just
# did" without ALSO blindly trusting stale local data for a device this integration never
# touched (which could have been moved by the app instead, in which case the fresh cloud
# fetch is the authoritative one - see the module docstring's note on this cache's limits).
# Stores the full move, not just the destination room_id, so a later refresh (for a
# still-different device's move) can keep re-patching every pending device's own
# room-group membership too, not just its roomId - otherwise an earlier still-unconverged
# move's membership patch would get overwritten by the next refresh's fresh (stale) cloud
# snapshot. Also mirrored into entry.data[CONF_PENDING_ROOM_MOVES] so it survives an HA
# restart - hass.data alone would lose an in-flight (not-yet-converged) move, silently
# falling back to a fresh (still-stale) cloud fetch for "current room" on the very next
# call for that device.
DATA_PENDING_ROOM_MOVES = f"{DOMAIN}_pending_room_moves"
# Serializes move_device_to_room calls for the whole entry, not just per-device: every
# successful move ends in an async_reload of the config entry, which tears down and
# rebuilds entry.runtime_data (the coordinator) - two DIFFERENT devices moved concurrently
# could otherwise have one call's reload swap out the coordinator out from under the
# other's still-in-flight leave/join mesh writes. Reload already serializes the *effect* of
# concurrent moves, so a per-entry lock doesn't cost any real concurrency.
DATA_MOVE_LOCKS = f"{DOMAIN}_move_locks"


def _pending_moves(hass: HomeAssistant, entry: ConfigEntry) -> dict[str, dict]:
    all_pending = hass.data.setdefault(DATA_PENDING_ROOM_MOVES, {})
    if entry.entry_id not in all_pending:
        # First access since an HA (re)start: hass.data has nothing yet, but entry.data may
        # already hold moves this integration made and persisted before the restart.
        all_pending[entry.entry_id] = dict(entry.data.get(CONF_PENDING_ROOM_MOVES, {}))
    return all_pending[entry.entry_id]


def _move_lock(hass: HomeAssistant, entry: ConfigEntry) -> asyncio.Lock:
    locks = hass.data.setdefault(DATA_MOVE_LOCKS, {})
    return locks.setdefault(entry.entry_id, asyncio.Lock())


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
    new_room_address: int,
) -> list[PlejdCloudRoom]:
    """Locally correct the device's room-group membership for rooms already present.

    Needed for the same reason as the roomId override above: on a BLE-only site the
    cloud's outputGroups (what `rooms`/PlejdRoomLight's aggregate membership is built
    from) may never reflect a mesh-only move. Uses the output's own mesh address (what
    member_addresses actually stores), not the device's own join/leave-command address -
    they can differ, since an output's address is preferred from outputAddress and only
    falls back to deviceAddress when missing.

    Strips the output from EVERY room other than new_room_address - not a single tracked
    "old" room - since a device only ever belongs to one room by the app's own convention;
    whichever room this fresh cloud fetch currently (maybe only partially) lists it under
    is exactly the stale membership to remove, whether that's the room it started in, an
    intermediate hop in a chain of un-converged moves, or a room whose membership
    converged before its roomId did. Tracking a single fixed "old room" address across
    calls instead does NOT correctly handle either of those cases.

    PlejdCloudRoom is a light-only aggregate - parse_site() excludes a group entirely if
    it has any non-light member, since a group command would hit that member too. For a
    non-light move, the destination room's mesh group now genuinely has a non-light member
    - even when this move's own output_address couldn't be resolved (the mesh join command
    still targets the device's own address, not a per-output one) - even though this
    function can't safely ADD an unresolved output to member_addresses (see below). So
    instead of just leaving a stale entry cached as "safe", drop any existing room entry at
    new_room_address entirely; a device already joined to that mesh group broadcasts would
    otherwise still hit it via a room light that no longer reflects reality. This drop must
    happen BEFORE the output_address check below, since it doesn't need output_address at
    all - only the light-only add/strip logic does.

    If the output has no resolvable address, this leaves `rooms` untouched for a light
    move (nothing to key off for the add/strip logic below).

    Deliberately does NOT synthesize a new room entry when new_room_address isn't found
    here - parse_site() can have excluded it for a real reason (no other light member, or
    a non-light member sharing the same group address), which this function has no way
    to distinguish from "just empty"; a genuinely new light-group entity for it will
    appear once the cloud does converge.
    """
    if not is_light:
        return [r for r in rooms if r.address != new_room_address]
    if output_address is None:
        return list(rooms)
    patched = []
    for room in rooms:
        if room.address != new_room_address and output_address in room.member_addresses:
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


def _room_membership_converged(fresh_rooms: list[PlejdCloudRoom], fresh_devices: list, move: dict) -> bool:
    """Whether the cloud's own rooms snapshot already reflects this move's membership.

    For a light move: the output must be a member of new_room_address AND absent from
    every OTHER room - a device only ever belongs to one room, so still being listed
    anywhere else means membership hasn't fully caught up yet (it can converge slightly
    before or after roomId does). A non-light move has no membership to add (only ever a
    stale entry to defensively drop) - converged once the cloud's own view no longer has
    ANY room entry at new_room_address either, matching what this module's own patch
    already forces every round regardless of pending state.

    A light move into a room that ALSO has a non-light member is a permanent edge case,
    not a "hasn't converged yet" one: parse_site() excludes any group with a non-light
    member from `rooms` entirely, so new_room_address can never appear there, no matter how
    long we wait - it must be told apart from the ordinary "hasn't appeared as its own
    group yet" case (where treating absence as convergence would prune the pending entry,
    and thus stop re-patching the destination's light-group membership, before the cloud's
    own aggregate has actually caught up). fresh_devices settles it directly: if some OTHER
    device is already reported in the destination room_id and isn't a light, the exclusion
    is permanent and absence from every other room is the strongest signal available;
    otherwise it's ordinary non-convergence and this must keep waiting.
    """
    if move["output_address"] is None:
        return True
    if not move["is_light"]:
        return not any(r.address == move["new_room_address"] for r in fresh_rooms)
    new_room = next((r for r in fresh_rooms if r.address == move["new_room_address"]), None)
    absent_elsewhere = not any(
        r.address != move["new_room_address"] and move["output_address"] in r.member_addresses for r in fresh_rooms
    )
    if new_room is None:
        permanently_excluded = any(d.room_id == move["room_id"] and d.category != CATEGORY_LIGHT for d in fresh_devices)
        return permanently_excluded and absent_elsewhere
    return move["output_address"] in new_room.member_addresses and absent_elsewhere


async def _async_refresh_and_reload(
    hass: HomeAssistant,
    entry: ConfigEntry,
    http_session,
    token,
    *,
    pending: dict[str, dict],
    device_id: str,
    this_move: dict,
) -> None:
    # Recorded as pending BEFORE this refresh, not after - the mesh writes that produced
    # this_move have already physically happened by the time this function runs, so a
    # refresh failure below must not erase the only record of that. Losing it here would
    # mean a follow-up move (to a THIRD room) derives "current room" from the stale
    # pre-move cloud data and never sends a leave for the room the device is actually
    # already in - the safe failure mode is an "already in room" rejection on an exact
    # retry of the same move (still true, physically), not a silently wrong leave target.
    pending[device_id] = this_move
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
        # entry is dropped only once the fresh fetch agrees with it on BOTH room_id and
        # room-group membership (they can converge at slightly different times).
        device_dicts = []
        for d in fresh_site.devices:
            move = pending.get(d.device_id)
            if move is not None:
                if move["room_id"] == d.room_id and _room_membership_converged(
                    fresh_site.rooms, fresh_site.devices, move
                ):
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
                # Mirrors the in-memory pending cache so a restart doesn't lose an
                # in-flight (not-yet-converged) move - see _pending_moves().
                CONF_PENDING_ROOM_MOVES: dict(pending),
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
    # Serializes every move for this entry (not just this device): every successful move
    # ends in an async_reload that tears down and rebuilds entry.runtime_data (the
    # coordinator) - without this, two DIFFERENT devices moved concurrently could have one
    # call's reload swap the coordinator out from under the other's still-in-flight mesh
    # writes. It also still covers the original same-device TOCTOU (two overlapping calls
    # both reading the same stale "current room" before either records its own).
    async with _move_lock(hass, entry):
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
        existing_pending = pending.get(device_id)
        if existing_pending is not None:
            # Revalidate against the fresh fetch already in hand, rather than trusting the
            # pending entry blindly forever - nothing else in the integration revisits it on
            # its own, so without this it can sit stale indefinitely once nothing but this
            # same device's own next move ever looks at it again.
            fresh_room_id = outputs[0].room_id
            if fresh_room_id == existing_pending["room_id"] and _room_membership_converged(
                site.rooms, site.devices, existing_pending
            ):
                # The cloud already agrees on BOTH room_id and room-group membership - the
                # earlier move has actually converged by now, so drop the stale entry
                # instead of continuing to treat this device as still "pending".
                del pending[device_id]
                existing_pending = None
            elif fresh_room_id not in (existing_pending["room_id"], existing_pending.get("from_room_id")):
                # Fresh cloud shows neither the room this pending move started from NOR its
                # target - the only way that happens is if something else (almost certainly
                # the app) moved this device again after our own move must have already
                # converged. Our pending state is proven stale rather than merely
                # unconfirmed; trust the fresh fetch instead of a value known to be wrong.
                # (Matching the target alone, as opposed to the `if` above, means room_id
                # converged before membership did - still ordinary non-convergence, not
                # staleness, so it must NOT be treated as proof of an external change.)
                del pending[device_id]
                existing_pending = None
        current_room_id = existing_pending["room_id"] if existing_pending is not None else outputs[0].room_id
        if current_room_id == room_id:
            raise HomeAssistantError(f"Device is already in room '{new_room.name}'")

        old_room = next((r for r in site.all_rooms if r.room_id == current_room_id), None) if current_room_id else None
        if current_room_id is not None and (old_room is None or old_room.address is None):
            # Silently skipping the leave and only joining would leave the device
            # subscribed to BOTH the old and new room's mesh groups - fail before sending
            # any mesh command rather than risk a partial move.
            raise HomeAssistantError(f"Plejd device {device_id}'s current room has no resolvable mesh group address")

        # Read entry.runtime_data fresh at each call, not once for both: an unrelated
        # action (an options edit, a schedule/room/scene change, a manual reload) can
        # still reload this entry between the leave and the join, which replaces the
        # coordinator - reusing a captured reference from before the leave would send the
        # join through a coordinator that's already been torn down.
        if old_room is not None:
            await entry.runtime_data.async_leave_mesh_group(own_address, old_room.address)
        await entry.runtime_data.async_join_mesh_group(own_address, new_room.address)

        output = outputs[0]
        this_move = {
            "room_id": room_id,
            "output_address": output.address,
            "is_light": output.category == CATEGORY_LIGHT,
            "dimmable": output.dimmable,
            "new_room_address": new_room.address,
            # The room this exact move started from - lets a later call's revalidation
            # (see above) tell "still hasn't converged" (fresh cloud == from_room_id) apart
            # from "converged, then moved again by someone else" (fresh cloud == neither).
            "from_room_id": current_room_id,
        }

        await _async_refresh_and_reload(
            hass, entry, http_session, token, pending=pending, device_id=device_id, this_move=this_move
        )
