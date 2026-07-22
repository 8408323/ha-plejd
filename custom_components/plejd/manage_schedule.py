"""Create and update Plejd cloud schedules (astro triggers + night reduction).

The real Plejd app's "Schemaläggning" feature - confirmed via a live capture to be
entirely cloud-side: an updateTimeEvent_V3 Parse call (the sunset/sunrise-relative
trigger, plus an optional night-reduction quiet-hours window) and one or two ordinary
(hidden) scenes it runs, tied together by a CreatedById embedded in each scene's own
settings JSON. Not the on-device weekly schedules schedule_ws.py manages
(entry.options[CONF_SCHEDULES], CMD_TIME_EVENT_* mesh commands) - that's a separate,
BLE-only mechanism; like manage_scene.py, this one never touches the mesh directly.

getSiteById's own response for existing cloud schedules hasn't been captured/confirmed,
so this only tracks schedules created through this integration itself
(entry.data[CONF_CLOUD_SCHEDULES]) - async_update_schedule can only target one of those,
not a schedule created through the app. Only "astro" mode (the only one captured) is
supported; a fixed-clock-time trigger mode's wire shape is unconfirmed. Removing a
schedule entirely (vs. deactivating it) is also unconfirmed and not implemented - use
the activated flag on async_update_schedule to pause one instead.
"""

from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from dataclasses import asdict

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from . import schedule_ws
from .cloud import PlejdAuthError, PlejdCloudError, async_get_site, async_login
from .cloud import async_create_scene as async_cloud_create_scene
from .cloud import async_remove_scene as async_cloud_remove_scene
from .cloud import async_update_scene as async_cloud_update_scene
from .cloud import async_update_time_event as async_cloud_update_time_event
from .const import (
    CONF_CLOUD_SCHEDULES,
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
    SCHEDULE_ASTRO_EVENTS,
    SCHEDULE_OFFSET_MAX,
    SCHEDULE_OFFSET_MIN,
)

_LOGGER = logging.getLogger(__name__)

_DATA_LOCKS = "plejd_cloud_schedule_locks"


def _async_get_lock(hass: HomeAssistant, entry: ConfigEntry) -> asyncio.Lock:
    """One lock per config entry, so concurrent create/update calls can't race on CONF_CLOUD_SCHEDULES.

    Unlike CONF_DEVICES/CONF_SCENES/etc, always rebuilt wholesale from a fresh getSiteById,
    this list is the only place a cloud schedule's ids live (getSiteById's own response for
    existing schedules isn't confirmed) - a lost update here permanently orphans the schedule
    from this integration's point of view, not just until the next refresh.
    """
    locks: dict[str, asyncio.Lock] = hass.data.setdefault(_DATA_LOCKS, {})
    return locks.setdefault(entry.entry_id, asyncio.Lock())


async def _async_login_and_get_site(hass: HomeAssistant, entry: ConfigEntry):
    http_session = async_get_clientsession(hass)
    try:
        token = await async_login(http_session, entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD])
    except PlejdAuthError as err:
        entry.async_start_reauth(hass)
        raise HomeAssistantError("Plejd cloud credentials rejected; reauthentication started") from err
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error: {err}") from err
    try:
        site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error: {err}") from err
    return http_session, token, site


async def _async_refresh_and_reload(
    hass: HomeAssistant, entry: ConfigEntry, http_session, token, *, cloud_schedules: list[dict]
) -> None:
    try:
        fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        # Even if refreshing the rest of the site fails, don't lose track of a cloud schedule
        # that was already created/updated on the cloud - entry.data[CONF_CLOUD_SCHEDULES] is
        # the only place this integration remembers it (getSiteById's own listing of existing
        # schedules isn't confirmed), so losing this write would orphan it permanently.
        hass.config_entries.async_update_entry(entry, data={**entry.data, CONF_CLOUD_SCHEDULES: cloud_schedules})
        raise HomeAssistantError(f"Plejd cloud error refreshing site: {err}") from err
    hass.data[schedule_ws.DATA_MANUAL_RELOAD] = entry.entry_id
    try:
        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_DEVICES: [asdict(d) for d in fresh_site.devices],
                CONF_INPUTS: [asdict(i) for i in fresh_site.inputs],
                CONF_MOTION: [asdict(m) for m in fresh_site.motion],
                CONF_SCENES: [asdict(s) for s in fresh_site.scenes],
                CONF_ROOMS: [asdict(r) for r in fresh_site.rooms],
                CONF_GATEWAYS: fresh_site.gateways,
                CONF_RESOURCE_SET_ID: fresh_site.resource_set_id,
                CONF_DEVICE_ADDRESSES: fresh_site.device_addresses,
                CONF_CLOUD_SCHEDULES: cloud_schedules,
            },
        )
        await hass.config_entries.async_reload(entry.entry_id)
    finally:
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD, None)
        hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD_SEEN, None)
        if hass.data.get(schedule_ws.DATA_RELOAD_PENDING) == entry.entry_id:
            hass.data.pop(schedule_ws.DATA_RELOAD_PENDING, None)
            await hass.config_entries.async_reload(entry.entry_id)


async def _async_cleanup_orphaned_scenes(http_session, token: str, site_id: str, scene_ids: list[str]) -> None:
    """Best-effort removal of scene(s) already created before a later step in the same call failed.

    Deliberately swallows PlejdCloudError: the caller is already raising the real failure, and an
    orphaned hidden scene (worst case) is a lesser problem than masking that failure with this one.
    """
    for scene_id in scene_ids:
        try:
            ok = await async_cloud_remove_scene(http_session, token, site_id, scene_id)
        except PlejdCloudError:
            # Best-effort: the caller is already raising the real failure, so this must not
            # replace or mask it - but a silently-abandoned hidden scene needs a trail for
            # support to find later, so log it rather than dropping it entirely.
            _LOGGER.warning(
                "Plejd: could not clean up orphaned scene %s after a schedule create/update failure",
                scene_id,
                exc_info=True,
            )
            continue
        if not ok:
            _LOGGER.warning(
                "Plejd: cloud rejected cleanup of orphaned scene %s after a schedule create/update failure",
                scene_id,
            )


def _validate_trigger(event: str, offset: int, label: str) -> None:
    if event not in SCHEDULE_ASTRO_EVENTS:
        raise HomeAssistantError(f"{label}_event must be one of {SCHEDULE_ASTRO_EVENTS}")
    if not SCHEDULE_OFFSET_MIN <= offset <= SCHEDULE_OFFSET_MAX:
        raise HomeAssistantError(
            f"{label}_offset must be between {SCHEDULE_OFFSET_MIN} and {SCHEDULE_OFFSET_MAX} minutes"
        )


def _validate_days(scheduled_days: list[int] | None) -> list[int]:
    """None means "not specified" (defaults to every day); an explicit empty list is rejected outright.

    scheduled_days is falsy-but-meaningful input, so `if scheduled_days` would silently treat an
    explicitly empty list the same as "not specified" and default it to every day - the opposite of
    what a caller passing [] almost certainly intends. Use activated=False to pause a schedule
    instead of trying to express "no days" here.
    """
    if scheduled_days is None:
        return list(range(7))
    days = sorted(set(scheduled_days))
    if not days:
        raise HomeAssistantError("scheduled_days must include at least one day (0-6); use activated=False to pause")
    if not all(isinstance(d, int) and 0 <= d <= 6 for d in days):
        raise HomeAssistantError("scheduled_days must be integers 0-6 (Monday=0)")
    return days


_TIME_HH_MM = re.compile(r"^([01]\d|2[0-3]):[0-5]\d$")


def _validate_time(value: str, label: str) -> None:
    if not _TIME_HH_MM.match(value):
        raise HomeAssistantError(f'night_reduction\'s {label} must be a 24-hour "HH:MM" time, got {value!r}')


def _validate_night_reduction(night_reduction: dict) -> None:
    if not night_reduction.get("scene_steps"):
        raise HomeAssistantError("night_reduction needs at least one scene step")
    if not night_reduction.get("start_time") or not night_reduction.get("end_time"):
        raise HomeAssistantError("night_reduction needs start_time and end_time")
    _validate_time(night_reduction["start_time"], "start_time")
    _validate_time(night_reduction["end_time"], "end_time")
    has_weekend_start = night_reduction.get("weekend_start_time") is not None
    has_weekend_end = night_reduction.get("weekend_end_time") is not None
    if has_weekend_start != has_weekend_end:
        raise HomeAssistantError("night_reduction's weekend_start_time and weekend_end_time must be given together")
    if has_weekend_start:
        _validate_time(night_reduction["weekend_start_time"], "weekend_start_time")
        _validate_time(night_reduction["weekend_end_time"], "weekend_end_time")


def _night_reduction_settings(schedule_id: str) -> str:
    return json.dumps({"SceneType": "NightReductionScene", "CreatedById": schedule_id})


def _night_reduction_result(scene_id: str, night_reduction: dict) -> dict:
    return {
        "scene_id": scene_id,
        "device_ids": sorted({s["device_id"] for s in night_reduction["scene_steps"]}),
        "start_time": night_reduction["start_time"],
        "end_time": night_reduction["end_time"],
        "weekend_start_time": night_reduction.get("weekend_start_time"),
        "weekend_end_time": night_reduction.get("weekend_end_time"),
    }


def _all_device_ids(schedule: dict) -> set[str]:
    """The union of devices a schedule's on-scene and (if any) night-reduction scene target.

    Used for dirtyDevices/dirtyRemovedDevices - a device referenced only by the night-reduction
    scene still needs its local cache marked dirty on the cloud, same as an on-scene device.
    """
    night_reduction = schedule.get("night_reduction") or {}
    return set(schedule.get("device_ids") or []) | set(night_reduction.get("device_ids") or [])


async def async_create_schedule(
    hass: HomeAssistant,
    entry: ConfigEntry,
    *,
    title: str,
    scene_steps: list[dict],
    start_event: str,
    start_offset: int,
    end_event: str,
    end_offset: int,
    scheduled_days: list[int] | None = None,
    fade_time: int = 0,
    night_reduction: dict | None = None,
) -> str:
    """Create a cloud schedule: an on-scene, an optional night-reduction scene, and the trigger linking them.

    Returns the generated schedule_id - the only place a caller can otherwise learn it is by
    reading entry.data[CONF_CLOUD_SCHEDULES] directly, since getSiteById can't be used to
    rediscover it (see the module docstring); the schedule_created service handler fires it
    as an event so it's visible from the Services UI too.
    """
    if not scene_steps:
        raise HomeAssistantError("create_schedule needs at least one scene step")
    _validate_trigger(start_event, start_offset, "start")
    _validate_trigger(end_event, end_offset, "end")
    days = _validate_days(scheduled_days)
    if night_reduction is not None:
        _validate_night_reduction(night_reduction)

    http_session, token, site = await _async_login_and_get_site(hass, entry)
    schedule_id = str(uuid.uuid4())
    device_ids = sorted({s["device_id"] for s in scene_steps})

    # Held for the whole cloud+cache sequence, not just the final write: this integration is
    # the only place a cloud schedule's ids are remembered, so even the cloud-call ordering
    # (not just the local list) must be serialized against a concurrent create/update on the
    # same entry.
    async with _async_get_lock(hass, entry):
        created_scene_ids: list[str] = []
        try:
            on_scene_id = await async_cloud_create_scene(
                http_session,
                token,
                site.site_id,
                title,
                scene_steps,
                hidden_from_scene_list=True,
                settings=json.dumps({"SceneType": "AstroEventScene", "CreatedById": schedule_id}),
            )
            created_scene_ids.append(on_scene_id)
            night_reduction_result: dict | None = None
            if night_reduction is not None:
                night_scene_id = await async_cloud_create_scene(
                    http_session,
                    token,
                    site.site_id,
                    f"{title} Nattläge",
                    night_reduction["scene_steps"],
                    hidden_from_scene_list=True,
                    settings=_night_reduction_settings(schedule_id),
                )
                created_scene_ids.append(night_scene_id)
                night_reduction_result = _night_reduction_result(night_scene_id, night_reduction)
            dirty_devices = sorted(
                set(device_ids) | (set(night_reduction_result["device_ids"]) if night_reduction_result else set())
            )
            result = await async_cloud_update_time_event(
                http_session,
                token,
                site.site_id,
                schedule_id,
                on_scene_id,
                scheduled_days=days,
                fade_time=fade_time,
                activated=True,
                start_event=start_event,
                start_offset=start_offset,
                end_event=end_event,
                end_offset=end_offset,
                dirty_devices=dirty_devices,
                night_reduction=night_reduction_result,
            )
        except PlejdCloudError as err:
            await _async_cleanup_orphaned_scenes(http_session, token, site.site_id, created_scene_ids)
            raise HomeAssistantError(f"Plejd cloud error creating schedule: {err}") from err
        if result is None:
            await _async_cleanup_orphaned_scenes(http_session, token, site.site_id, created_scene_ids)
            raise HomeAssistantError("Plejd cloud rejected the schedule creation")

        schedule = {
            "schedule_id": schedule_id,
            "scene_id": on_scene_id,
            "title": title,
            "device_ids": device_ids,
            "scheduled_days": days,
            "fade_time": fade_time,
            "activated": True,
            "start_event": start_event,
            "start_offset": start_offset,
            "end_event": end_event,
            "end_offset": end_offset,
            "night_reduction": night_reduction_result,
        }
        cloud_schedules = [*entry.data.get(CONF_CLOUD_SCHEDULES, []), schedule]
        # Fire before the refresh, not after: the schedule is already created and persisted
        # at this point, so a later refresh failure must not also swallow the only way the
        # user can learn its id (this integration can't rediscover it from getSiteById).
        hass.bus.async_fire(f"{DOMAIN}_schedule_created", {"schedule_id": schedule_id})
        await _async_refresh_and_reload(hass, entry, http_session, token, cloud_schedules=cloud_schedules)
        return schedule_id


async def async_update_schedule(
    hass: HomeAssistant,
    entry: ConfigEntry,
    *,
    schedule_id: str,
    title: str | None = None,
    scene_steps: list[dict] | None = None,
    start_event: str | None = None,
    start_offset: int | None = None,
    end_event: str | None = None,
    end_offset: int | None = None,
    scheduled_days: list[int] | None = None,
    fade_time: int | None = None,
    activated: bool | None = None,
    night_reduction: dict | None = None,
) -> None:
    """Update a cloud schedule created via async_create_schedule, then refresh + reload.

    updateTimeEvent_V3 is a whole-state call (confirmed via a live capture resending the
    same complete payload on every edit) - fields left unset here are resent unchanged
    from what this integration last knew about the schedule. night_reduction, if given,
    replaces the whole night-reduction block (creating its scene on first use).

    The cache is updated field-by-field as each underlying cloud call actually succeeds
    (not all at once at the end), so a failure partway through - the scene rename lands
    but the trigger update is then rejected, say - doesn't leave entry.data claiming
    nothing happened when part of it did. device_ids specifically is deferred until the
    trigger update itself succeeds (not just the scene edit): it doubles as "what the cloud
    was last told is dirty", and a scene edit alone doesn't tell the cloud anything - only
    the TimeEvent call's dirtyDevices/dirtyRemovedDevices does.

    Held for the whole read-build-send-persist sequence (not just the final cache write):
    two updates to the same schedule racing on the cloud calls could otherwise resend a
    stale whole-state payload and stomp each other, not just corrupt the local cache.
    """
    if (
        title is None
        and scene_steps is None
        and start_event is None
        and start_offset is None
        and end_event is None
        and end_offset is None
        and scheduled_days is None
        and fade_time is None
        and activated is None
        and night_reduction is None
    ):
        # A no-op call would still resend the cached whole state to updateTimeEvent_V3 -
        # harmless if the cache is fresh, but this integration can't tell if the schedule
        # was since edited in the Plejd app, so a no-op "update" would silently overwrite
        # whatever changed there instead of erroring loudly.
        raise HomeAssistantError("update_schedule needs at least one field to change")

    async with _async_get_lock(hass, entry):
        cached = next((s for s in entry.data.get(CONF_CLOUD_SCHEDULES, []) if s["schedule_id"] == schedule_id), None)
        if cached is None:
            raise HomeAssistantError(
                f"Plejd schedule {schedule_id} isn't tracked by this integration "
                "(only schedules created via create_schedule can be updated)"
            )
        effective_start_event = start_event if start_event is not None else cached["start_event"]
        effective_start_offset = start_offset if start_offset is not None else cached["start_offset"]
        effective_end_event = end_event if end_event is not None else cached["end_event"]
        effective_end_offset = end_offset if end_offset is not None else cached["end_offset"]
        _validate_trigger(effective_start_event, effective_start_offset, "start")
        _validate_trigger(effective_end_event, effective_end_offset, "end")
        days = _validate_days(scheduled_days) if scheduled_days is not None else cached["scheduled_days"]
        if scene_steps is not None and not scene_steps:
            raise HomeAssistantError(
                "update_schedule's scene_steps replaces every step - pass at least one, not an empty list"
            )
        if night_reduction is not None:
            _validate_night_reduction(night_reduction)

        http_session, token, site = await _async_login_and_get_site(hass, entry)
        if not any(s.scene_id == cached["scene_id"] for s in site.all_scenes):
            raise HomeAssistantError(f"Plejd scene {cached['scene_id']} not found on this site")
        cached_night_reduction = cached["night_reduction"]
        if cached_night_reduction is not None and not any(
            s.scene_id == cached_night_reduction["scene_id"] for s in site.all_scenes
        ):
            raise HomeAssistantError(f"Plejd scene {cached_night_reduction['scene_id']} not found on this site")

        updated = dict(cached)
        created_scene_ids: list[str] = []
        new_device_ids: list[str] | None = None
        try:
            if title is not None or scene_steps is not None:
                ok = await async_cloud_update_scene(
                    http_session, token, site.site_id, cached["scene_id"], title=title, scene_steps=scene_steps
                )
                if not ok:
                    raise HomeAssistantError("Plejd cloud rejected the schedule's scene update")
                if title is not None:
                    updated["title"] = title
                if scene_steps is not None:
                    new_device_ids = sorted({s["device_id"] for s in scene_steps})

            night_reduction_result = cached_night_reduction
            if night_reduction is not None:
                effective_title = updated["title"]
                if cached_night_reduction is None:
                    night_scene_id = await async_cloud_create_scene(
                        http_session,
                        token,
                        site.site_id,
                        f"{effective_title} Nattläge",
                        night_reduction["scene_steps"],
                        hidden_from_scene_list=True,
                        settings=_night_reduction_settings(schedule_id),
                    )
                    created_scene_ids.append(night_scene_id)
                else:
                    night_scene_id = cached_night_reduction["scene_id"]
                    ok = await async_cloud_update_scene(
                        http_session, token, site.site_id, night_scene_id, scene_steps=night_reduction["scene_steps"]
                    )
                    if not ok:
                        raise HomeAssistantError("Plejd cloud rejected the night-reduction scene update")
                night_reduction_result = _night_reduction_result(night_scene_id, night_reduction)

            before_devices = _all_device_ids(cached)
            after_primary = set(new_device_ids) if new_device_ids is not None else set(cached.get("device_ids") or [])
            after_devices = after_primary | set((night_reduction_result or {}).get("device_ids") or [])

            result = await async_cloud_update_time_event(
                http_session,
                token,
                site.site_id,
                schedule_id,
                cached["scene_id"],
                scheduled_days=days,
                fade_time=fade_time if fade_time is not None else cached["fade_time"],
                activated=activated if activated is not None else cached["activated"],
                start_event=effective_start_event,
                start_offset=effective_start_offset,
                end_event=effective_end_event,
                end_offset=effective_end_offset,
                dirty_devices=sorted(after_devices),
                dirty_removed_devices=sorted(before_devices - after_devices),
                night_reduction=night_reduction_result,
            )
            if result is None:
                raise HomeAssistantError(f"Plejd cloud rejected the schedule update for {schedule_id}")
            if new_device_ids is not None:
                updated["device_ids"] = new_device_ids
            updated["night_reduction"] = night_reduction_result
            updated["scheduled_days"] = days
            updated["fade_time"] = fade_time if fade_time is not None else cached["fade_time"]
            updated["activated"] = activated if activated is not None else cached["activated"]
            updated["start_event"] = effective_start_event
            updated["start_offset"] = effective_start_offset
            updated["end_event"] = effective_end_event
            updated["end_offset"] = effective_end_offset
        except PlejdCloudError as err:
            await _async_cleanup_orphaned_scenes(http_session, token, site.site_id, created_scene_ids)
            raise HomeAssistantError(f"Plejd cloud error updating schedule: {err}") from err
        except HomeAssistantError:
            await _async_cleanup_orphaned_scenes(http_session, token, site.site_id, created_scene_ids)
            raise
        finally:
            cloud_schedules = [
                updated if s["schedule_id"] == schedule_id else s for s in entry.data.get(CONF_CLOUD_SCHEDULES, [])
            ]
            await _async_refresh_and_reload(hass, entry, http_session, token, cloud_schedules=cloud_schedules)
