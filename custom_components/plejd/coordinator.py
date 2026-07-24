"""Plejd coordinator — owns the active mesh transport and pushes state to entities.

Control runs over one of two transports, chosen gateway-first: the remote
gateway/cloud WebSocket (gateway_transport.py) when the site has a Plejd Gateway,
otherwise the local BLE mesh (connection.py), falling back to BLE if the gateway is
unreachable. The coordinator connects (with reconnect/backoff), exposes the cloud
device list + live output state to platforms, and routes entity commands — building
plaintext command vectors that the BLE path encrypts and the gateway path relays.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable, Coroutine
from dataclasses import asdict, dataclass
from datetime import timedelta
from typing import Any
from uuid import uuid4

from aiohttp import ClientError
from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady, HomeAssistantError
from homeassistant.helpers import device_registry
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later, async_track_time_interval
from homeassistant.util import dt as dt_util

from . import protocol, schedule_ws
from .cloud import (
    PlejdAuthError,
    PlejdCloudDevice,
    PlejdCloudError,
    PlejdCloudInput,
    PlejdCloudMotion,
    PlejdCloudRoom,
    PlejdCloudScene,
    async_get_available_firmware,
    async_get_site,
    async_login,
    async_set_device_title,
)
from .connection import PlejdConnection
from .const import (
    CATEGORY_LIGHT,
    CATEGORY_SWITCH,
    CMD_GROUP_STATE_AND_LEVEL,
    CMD_INPUT_BUTTON,
    CMD_NOTIFY_EVENTS,
    CMD_OUTPUT_BOOT_STATE,
    CMD_OUTPUT_CURVE_TYPE,
    CMD_OUTPUT_INRUSH_CURRENT,
    CMD_OUTPUT_MAX_LEVEL,
    CMD_OUTPUT_MIN_LEVEL,
    CMD_OUTPUT_PHASE_DIM_TYPE,
    CMD_OUTPUT_RELAY_CONFIG,
    CMD_OUTPUT_RELAY_OFF_TIME,
    CMD_OUTPUT_SET,
    CMD_OUTPUT_SPEED,
    CMD_OUTPUT_STATE_AND_LEVEL,
    CONF_CRYPTO_KEY,
    CONF_DEVICE_ADDRESSES,
    CONF_DEVICES,
    CONF_DISCOVERED_ADDRESS,
    CONF_GATEWAYS,
    CONF_INPUTS,
    CONF_INSTALLATION_ID,
    CONF_MOTION,
    CONF_RESOURCE_SET_ID,
    CONF_ROOMS,
    CONF_SCENES,
    CONF_SITE_ID,
    CONF_TRANSPORT,
    DOMAIN,
    PHASE_DIM_HARDWARE,
    PLEJD_SERVICE_UUID,
    RELAY_CONFIG_HARDWARE,
    RELAY_HARDWARE,
    ROOM_DEVICE_ID_PREFIX,
    TIME_EVENT_REP_FOREVER,
    TIME_EVENT_RESULT_SCENE,
    TRANSPORT_AUTO,
    TRANSPORT_BLE,
    TRANSPORT_GATEWAY,
)
from .dim_ramp import PlejdDimRamp
from .gateway_transport import PlejdGatewayConnection
from .protocol import Command, MotionEvent, OutputSettings, OutputState, decode_motion, decode_notify_events

_LOGGER = logging.getLogger(__name__)

RECONNECT_INITIAL_DELAY = 1.0
RECONNECT_MAX_DELAY = 60.0
NOTIFY_POLL_INTERVAL = timedelta(minutes=10)  # device-health (NotifyEvents) poll cadence
CLOUD_POLL_INTERVAL = timedelta(hours=24)  # how often to check for site changes (added/renamed devices)
FIRMWARE_REFRESH_INTERVAL = timedelta(days=1)


@dataclass
class PlejdFirmwareStatus:
    """A device's installed firmware vs. the latest the Plejd cloud offers for it."""

    installed_version: str | None
    installed_build_time: int | None
    latest_version: str | None
    latest_build_time: int | None

    @property
    def update_available(self) -> bool:
        return (
            self.latest_build_time is not None
            and self.installed_build_time is not None
            and self.latest_build_time > self.installed_build_time
        )


_SETTINGS_CMDS = frozenset(
    {
        CMD_OUTPUT_MIN_LEVEL,
        CMD_OUTPUT_MAX_LEVEL,
        CMD_OUTPUT_SPEED,
        CMD_OUTPUT_CURVE_TYPE,
        CMD_OUTPUT_PHASE_DIM_TYPE,
        CMD_OUTPUT_BOOT_STATE,
        CMD_OUTPUT_RELAY_OFF_TIME,
        CMD_OUTPUT_RELAY_CONFIG,
        CMD_OUTPUT_INRUSH_CURRENT,
    }
)


def _settings_from_cloud(raw: dict) -> OutputSettings | None:
    """Best-effort decode of a cloud outputSettings dict.

    NOTE(8408323): field names are speculative pending a capture that includes outputSettings (#73).
    """
    min_dim = raw.get("minDim")
    max_dim = raw.get("maxDim")
    curve = raw.get("dimCurve")
    s = OutputSettings(
        min_level=round(int(min_dim) / 0xFFFF * 100, 1) if isinstance(min_dim, (int, float)) else None,
        max_level=round(int(max_dim) / 0xFFFF * 100, 1) if isinstance(max_dim, (int, float)) else None,
        curve=int(curve) if isinstance(curve, (int, float)) else None,
    )
    if s.min_level is None and s.max_level is None and s.curve is None:
        return None
    return s


class PlejdCoordinator:
    """Holds the BLE connection and the site's devices; notifies HA entities."""

    def __init__(self, hass: HomeAssistant, entry: ConfigEntry) -> None:
        self.hass = hass
        self._entry = entry  # for runtime reauth (e.g. a rename hitting expired credentials)
        # Remote hold-to-dim ramps (light.start_dim/stop_dim entity services drive this).
        self.dim_ramp = PlejdDimRamp(hass, self)
        # Tolerate entries stored before a field existed (e.g. output_index).
        self.devices = [PlejdCloudDevice(**{"output_index": 0, **device}) for device in entry.data[CONF_DEVICES]]
        self.scenes = [PlejdCloudScene(**scene) for scene in entry.data.get(CONF_SCENES, [])]
        self.rooms = [PlejdCloudRoom(**room) for room in entry.data.get(CONF_ROOMS, [])]
        # CONF_ROOMS is absent (not just empty) on entries added before room-groups existed;
        # only those need a backfill fetch (see _async_poll_faults) - a site with genuinely
        # no rooms stores an explicit [] and must not be re-fetched every poll interval.
        self._rooms_from_legacy_entry = CONF_ROOMS not in entry.data
        self.inputs = [PlejdCloudInput(**i) for i in entry.data.get(CONF_INPUTS, [])]
        self.motion = [PlejdCloudMotion(**m) for m in entry.data.get(CONF_MOTION, [])]
        self._motion_addresses = {m.address for m in self.motion}
        # device_id -> physical mesh address, for fault polling; absent on entries added
        # before this field existed (resolved via a one-time cloud fetch, see _async_poll_faults).
        self._device_addresses: dict[str, int] = dict(entry.data.get(CONF_DEVICE_ADDRESSES) or {})
        self.site_id = entry.data.get(CONF_SITE_ID, entry.entry_id)
        self._preferred = entry.data.get(CONF_DISCOVERED_ADDRESS)
        self._transport_pref = (getattr(entry, "options", None) or {}).get(CONF_TRANSPORT, TRANSPORT_AUTO)
        # Cloud credentials are used for the gateway token, the firmware-update check, and the cloud poll.
        self._email = entry.data.get(CONF_EMAIL, "")
        self._password = entry.data.get(CONF_PASSWORD, "")
        self._site_id = entry.data.get(CONF_SITE_ID, "")
        self._entry_id = entry.entry_id
        self._connection = PlejdConnection(
            bytes.fromhex(entry.data[CONF_CRYPTO_KEY]), self._on_event, self._handle_disconnect
        )
        # Gateway (remote/cloud) transport, when the site has one - preferred over BLE.
        self._gateway: PlejdGatewayConnection | None = None
        self.gateways = entry.data.get(CONF_GATEWAYS) or []  # GWY-01 device ids (no controllable output)
        gateways = self.gateways
        resource_set_id = entry.data.get(CONF_RESOURCE_SET_ID)
        if gateways and resource_set_id:
            self._gateway = PlejdGatewayConnection(
                async_get_clientsession(hass),
                entry.data[CONF_SITE_ID],
                resource_set_id,
                entry.data[CONF_INSTALLATION_ID],
                self._async_get_token,
                self._notify_outputs,
                self._handle_disconnect,
                on_event=self._on_event,
            )
        self._listeners: list[Callable[[], None]] = []
        self._button_listeners: list[Callable[[int, bool], None]] = []
        self._motion_listeners: list[Callable[[MotionEvent], None]] = []
        self._fault_listeners: list[Callable[[int, frozenset[str]], None]] = []
        self._faults: dict[int, frozenset[str]] = {}
        self.firmware: dict[str, PlejdFirmwareStatus] = {}  # device_id -> firmware status
        self._clock_unsub: Callable[[], None] | None = None
        self._faults_unsub: Callable[[], None] | None = None
        self._cloud_poll_unsub: Callable[[], None] | None = None
        self._firmware_unsub: Callable[[], None] | None = None
        self._firmware_now_unsub: Callable[[], None] | None = None
        self._available = False
        self._active: str | None = None  # "gateway" | "ble"
        self._closed = False
        self._reconnecting = False
        self._reconnect_task: asyncio.Task | None = None
        self._output_settings: dict[int, OutputSettings] = {}
        # Pre-populate from cloud so entities have a value before BLE reads return.
        for _device in self.devices:
            if _device.address is not None and _device.output_settings:
                _cloud_s = _settings_from_cloud(_device.output_settings)
                if _cloud_s is not None:
                    self._output_settings[_device.address] = _cloud_s

    def _active_transport(self) -> PlejdConnection | PlejdGatewayConnection | None:
        if self._active == "gateway":
            return self._gateway
        if self._active == "ble":
            return self._connection
        return None

    @property
    def available(self) -> bool:
        """Whether the active transport (gateway or BLE) is currently connected."""
        transport = self._active_transport()
        return self._available and transport is not None and transport.connected

    @property
    def active_transport(self) -> str | None:
        """The connected transport ('gateway' or 'ble'), or None when not connected."""
        return self._active if self.available else None

    @callback
    def _notify_outputs(self) -> None:
        for update in list(self._listeners):
            update()

    @callback
    def async_add_listener(self, update: Callable[[], None]) -> Callable[[], None]:
        """Register an output-state update callback; returns an unsubscribe function."""
        self._listeners.append(update)

        def _remove() -> None:
            self._listeners.remove(update)

        return _remove

    @callback
    def async_add_button_listener(self, cb: Callable[[int, bool], None]) -> Callable[[], None]:
        """Register a button callback cb(address, pressed); returns an unsubscribe."""
        self._button_listeners.append(cb)

        def _remove() -> None:
            self._button_listeners.remove(cb)

        return _remove

    @callback
    def async_add_motion_listener(self, cb: Callable[[MotionEvent], None]) -> Callable[[], None]:
        """Register a motion callback cb(MotionEvent); returns an unsubscribe."""
        self._motion_listeners.append(cb)

        def _remove() -> None:
            self._motion_listeners.remove(cb)

        return _remove

    @callback
    def async_add_fault_listener(self, cb: Callable[[int, frozenset[str]], None]) -> Callable[[], None]:
        """Register a device-health callback cb(address, fault_names); returns an unsubscribe."""
        self._fault_listeners.append(cb)

        def _remove() -> None:
            self._fault_listeners.remove(cb)

        return _remove

    def faults_for(self, address: int) -> frozenset[str]:
        """Active fault-flag names last reported by a device (empty if none/unknown)."""
        return self._faults.get(address, frozenset())

    def device_address_for(self, device_id: str) -> int | None:
        """A physical device's own mesh address (for fault entities), or None if unresolved."""
        return self._device_addresses.get(device_id)

    @callback
    def _on_event(self, command: Command) -> None:
        if command.command in (CMD_GROUP_STATE_AND_LEVEL, CMD_OUTPUT_STATE_AND_LEVEL):
            if command.command == CMD_GROUP_STATE_AND_LEVEL:
                self._fan_group_state_to_members(command)
            for update in list(self._listeners):
                update()
        elif command.command == CMD_INPUT_BUTTON:
            pressed = bool(command.data and command.data[0])
            for cb in list(self._button_listeners):
                cb(command.address, pressed)
        elif command.command == CMD_OUTPUT_SET and command.address in self._motion_addresses:
            event = decode_motion(command)
            if event is not None:
                for motion_cb in list(self._motion_listeners):
                    motion_cb(event)
        elif command.command in _SETTINGS_CMDS and command.command_type & protocol.TYPE_ACK:
            # Replies carry the Ack bit set (command_type = TYPE_READ|TYPE_ACK = 0x03, per
            # docs/protocol.md). Our own writes use TYPE_WRITE/TYPE_DONT_RESPOND (Ack unset)
            # and echo back on the same feed with a different payload shape ([output,
            # value...] vs. the reply's value-only bytes) — only a genuine reply is cacheable.
            self._update_output_settings(command)
        elif command.command == CMD_NOTIFY_EVENTS:
            faults = decode_notify_events(command)
            if faults is not None:
                self._faults[command.address] = faults
                for fault_cb in list(self._fault_listeners):
                    fault_cb(command.address, faults)

    def _update_output_settings(self, command: Command) -> None:
        """Store a settings read-reply and notify listeners."""
        cmd = command.command
        addr = command.address
        s = self._output_settings.get(addr) or OutputSettings()
        if cmd == CMD_OUTPUT_MIN_LEVEL:
            val = protocol.decode_output_level_reply(command)
            if val is None:
                return
            s.min_level = val
        elif cmd == CMD_OUTPUT_MAX_LEVEL:
            val = protocol.decode_output_level_reply(command)
            if val is None:
                return
            s.max_level = val
        elif cmd == CMD_OUTPUT_SPEED:
            val = protocol.decode_output_speed_reply(command)
            if val is None:
                return
            s.speed = val
        elif cmd == CMD_OUTPUT_CURVE_TYPE:
            val = protocol.decode_output_curve_reply(command)
            if val is None:
                return
            s.curve = val
        elif cmd == CMD_OUTPUT_PHASE_DIM_TYPE:
            val = protocol.decode_output_phase_dim_reply(command)
            if val is None:
                return
            s.phase_dim = val
        elif cmd == CMD_OUTPUT_BOOT_STATE:
            val = protocol.decode_output_boot_state_reply(command)
            if val is None:
                return
            s.boot_state = val
        elif cmd == CMD_OUTPUT_RELAY_OFF_TIME:
            val = protocol.decode_output_relay_off_time_reply(command)
            if val is None:
                return
            s.relay_off_time = val
        elif cmd == CMD_OUTPUT_RELAY_CONFIG:
            val = protocol.decode_output_relay_config_reply(command)
            if val is None:
                return
            s.relay_pole_config = val
        else:  # CMD_OUTPUT_INRUSH_CURRENT
            val = protocol.decode_output_inrush_current_reply(command)
            if val is None:
                return
            s.inrush_current_ms = val
        self._output_settings[addr] = s
        self._notify_outputs()

    def settings_for(self, address: int) -> OutputSettings | None:
        """Last-known per-output settings for a mesh address, if read."""
        return self._output_settings.get(address)

    def _cache_output_setting(self, address: int, **fields: object) -> None:
        """Optimistically update the settings cache after a local write.

        Without this, a BLE notification for an unrelated field arriving right after
        a local write would re-read the old cached value and overwrite the entity's
        new state until the next full settings read.
        """
        s = self._output_settings.get(address) or OutputSettings()
        for name, value in fields.items():
            setattr(s, name, value)
        self._output_settings[address] = s
        self._notify_outputs()

    def state_for(self, address: int) -> OutputState | None:
        """Last-known output state for a mesh address, if seen."""
        if self._active == "gateway" and self._gateway is not None:
            return self._gateway.state_for(address)
        if self._connection.mesh is None:
            return None
        return self._connection.mesh.state.get(address)

    def _pick_device(self) -> bluetooth.BluetoothServiceInfoBleak | None:
        candidates = [
            info
            for info in bluetooth.async_discovered_service_info(self.hass, connectable=True)
            if PLEJD_SERVICE_UUID in info.service_uuids
        ]
        if not candidates:
            return None
        # Prefer the device the config flow discovered, else the strongest signal.
        # rssi can be None for adverts without a reported signal — treat as weakest.
        candidates.sort(key=lambda info: (info.address != self._preferred, -(info.rssi or -127)))
        return candidates[0]

    async def async_start(self) -> None:
        """Connect to the mesh — gateway-first when one exists, else BLE."""
        try:
            await self._async_select_and_connect()
        except ConfigEntryNotReady:
            # A stale gateway/crypto-key/etc is exactly what the cloud poll below exists to
            # repair, but its recurring timer never gets registered when connect fails here,
            # and a setup retry would otherwise keep reusing the same stale entry data
            # forever - make one best-effort attempt to refresh it before giving up this
            # attempt, so the next retry (which re-reads entry.data fresh) has a shot at it.
            # An unexpected failure from that attempt (e.g. a malformed cloud response) must
            # not replace this ConfigEntryNotReady - HA's setup-retry path is keyed on this
            # exact exception type, and the cached site may still work once BLE is back in
            # range even if the repair attempt itself failed.
            try:
                await self._async_poll_cloud(None)
            except Exception:  # noqa: BLE001 - best-effort; the original ConfigEntryNotReady below still applies
                _LOGGER.warning("Plejd: cloud self-heal attempt during setup failed", exc_info=True)
            raise
        self._cloud_poll_unsub = async_track_time_interval(self.hass, self._async_poll_cloud, CLOUD_POLL_INTERVAL)
        self._schedule_firmware_checks()

    async def _async_poll_cloud(self, _now: object) -> None:
        """Detect site changes and reload the integration if anything differs."""
        entry = self.hass.config_entries.async_get_entry(self._entry_id)
        if entry is None:
            return
        session = async_get_clientsession(self.hass)
        try:
            token = await async_login(session, self._email, self._password)
            site = await async_get_site(session, token, self._site_id)
        except PlejdAuthError:
            # No gateway connect path exists in BLE-only setups, so prompt reauth here -
            # otherwise a rejected password leaves the daily poll silently broken forever
            # (Reconfigure alone can't fix it: it reuses the stored, now-invalid password).
            if self._closed:
                return
            _LOGGER.warning("Plejd cloud poll: credentials rejected — starting reauth")
            self._entry.async_start_reauth(self.hass)
            return
        except (PlejdCloudError, ClientError, OSError):
            # Transport/cloud-API failure (DNS/socket/TLS/timeout/non-JSON 5xx) is a missed
            # poll, not a bug; retry at the next interval. An unexpected parse/programming
            # error is NOT caught here and propagates, per error-handling.md.
            _LOGGER.debug("Plejd cloud poll: cloud unreachable, will retry at next interval", exc_info=True)
            return
        if self._closed:
            # Shutdown began while the two cloud calls above were in flight; the interval
            # timer is already unregistered, but this already-running call must not act on
            # a possibly-removed entry (start reauth, persist a stale snapshot) after that.
            return
        # NOTE(8408323): if a move_device_to_room move is still pending (cloud not yet
        # converged), this snapshot's device room_id/room membership can overwrite that
        # move's local correction before it converges - the same class of "we can only
        # protect what we ourselves touch" tradeoff manage_device_room.py's own module
        # docstring already documents and accepts for every other feature's refresh cycle,
        # now also triggered by this poll. Not solved here for the same reason: doing so
        # would need pending-move awareness plumbed through this poll too.
        new_data = {
            CONF_CRYPTO_KEY: site.crypto_key.hex(),
            CONF_DEVICES: [asdict(d) for d in site.devices],
            CONF_INPUTS: [asdict(i) for i in site.inputs],
            CONF_MOTION: [asdict(m) for m in site.motion],
            CONF_SCENES: [asdict(s) for s in site.scenes],
            CONF_ROOMS: [asdict(r) for r in site.rooms],
            CONF_GATEWAYS: site.gateways,
            CONF_RESOURCE_SET_ID: site.resource_set_id,
            CONF_DEVICE_ADDRESSES: site.device_addresses,
        }
        # A gateway newly appearing on an entry that predates CONF_INSTALLATION_ID (or
        # never had one) must seed it now - the gateway transport requires it and the
        # reload below would otherwise crash with a KeyError instead of applying this.
        if site.gateways and not entry.data.get(CONF_INSTALLATION_ID):
            new_data[CONF_INSTALLATION_ID] = str(uuid4())
        changed = [k for k, v in new_data.items() if entry.data.get(k) != v]
        if not changed:
            return
        _LOGGER.info("Plejd site changed (%s) — reloading to apply updates", ", ".join(changed))
        # Reload explicitly (rather than relying on the entry's update listener alone) so a
        # rejected reload (e.g. a platform refused to unload) is actually noticed - otherwise
        # entry.data already matches the fresh site and the running coordinator never
        # reflects it. Guarded the same way schedule_ws's own persist is, so the listener
        # doesn't also fire a second, racing reload for this same change.
        old_data = dict(entry.data)
        self.hass.data[schedule_ws.DATA_MANUAL_RELOAD] = entry.entry_id
        try:
            self.hass.config_entries.async_update_entry(entry, data={**entry.data, **new_data})
            reload_ok = await self.hass.config_entries.async_reload(entry.entry_id)
        finally:
            self.hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD, None)
            self.hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD_SEEN, None)
            if self.hass.data.get(schedule_ws.DATA_RELOAD_PENDING) == entry.entry_id:
                self.hass.data.pop(schedule_ws.DATA_RELOAD_PENDING, None)
                await self.hass.config_entries.async_reload(entry.entry_id)
        if not reload_ok:
            # Revert the cached snapshot rather than just logging: leaving entry.data
            # already matching the fresh site would make every later poll's comparison
            # find no difference and never retry, stranding the running coordinator (which
            # never actually got the new data live) stale until an unrelated cloud change
            # or an HA restart. Reverting means the next poll's diff naturally retries this.
            _LOGGER.warning(
                "Plejd cloud poll: reload after a site change failed; reverting the cached "
                "snapshot so the next poll retries it"
            )
            self.hass.data[schedule_ws.DATA_MANUAL_RELOAD] = entry.entry_id
            try:
                self.hass.config_entries.async_update_entry(entry, data=old_data)
            finally:
                self.hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD, None)
                self.hass.data.pop(schedule_ws.DATA_MANUAL_RELOAD_SEEN, None)
                self.hass.data.pop(schedule_ws.DATA_RELOAD_PENDING, None)

    def _schedule_firmware_checks(self) -> None:
        """Check firmware shortly after start, then daily; both are best-effort."""
        if self._firmware_unsub is not None:
            return  # already scheduled (e.g. a second async_start)
        self._firmware_now_unsub = async_call_later(self.hass, 0, self._async_firmware_check)
        self._firmware_unsub = async_track_time_interval(
            self.hass, self._async_firmware_check, FIRMWARE_REFRESH_INTERVAL
        )

    async def _async_firmware_check(self, _now: object) -> None:
        self._firmware_now_unsub = None  # the one-shot has fired
        try:
            await self.async_refresh_firmware()
        except Exception:  # noqa: BLE001 - auxiliary + cloud-dependent; warn (e.g. lapsed credentials) but never disrupt
            _LOGGER.warning("Plejd firmware check failed", exc_info=True)

    async def async_refresh_firmware(self) -> None:
        """Refresh installed vs. latest firmware for every physical device from the cloud."""
        if not self._email or not self._password:
            return
        session = async_get_clientsession(self.hass)
        token = await async_login(session, self._email, self._password)
        site = await async_get_site(session, token, self.site_id)
        latest_by_hw: dict[tuple[int, str | None], tuple[str, int] | None] = {}
        status: dict[str, PlejdFirmwareStatus] = {}
        for device_id, firmware in site.firmware_by_device.items():
            key = (firmware.hardware_id, firmware.faceplate_id)
            if key not in latest_by_hw:
                try:
                    latest_by_hw[key] = await async_get_available_firmware(
                        session, token, firmware.hardware_id, firmware.faceplate_id
                    )
                except Exception:  # noqa: BLE001 - one flaky lookup must not discard the whole refresh
                    _LOGGER.debug("Plejd firmware lookup failed for hardware %s", firmware.hardware_id, exc_info=True)
                    latest_by_hw[key] = None
            latest = latest_by_hw[key]
            status[device_id] = PlejdFirmwareStatus(
                installed_version=firmware.version,
                installed_build_time=firmware.build_time,
                latest_version=latest[0] if latest else None,
                latest_build_time=latest[1] if latest else None,
            )
        self.firmware = status
        self._notify_outputs()

    @staticmethod
    def _output_parse_id(devices: list[PlejdCloudDevice], device_id: str) -> str | None:
        # The title lives on the output; rename targets the primary output's Parse id.
        # Primary = lowest output_index (consistent with the unique_id base convention).
        matching = sorted(
            (d for d in devices if d.device_id == device_id and d.object_id),
            key=lambda d: d.output_index,
        )
        return matching[0].object_id if matching else None

    async def async_rename_device(self, device_id: str, title: str) -> None:
        """Mirror an HA device rename to the Plejd cloud (so the Plejd app shows it too)."""
        if not self._email or not self._password:
            return
        session = async_get_clientsession(self.hass)
        token = await async_login(session, self._email, self._password)
        parse_id = self._output_parse_id(self.devices, device_id)
        if parse_id is None:
            # Entries cached before object_id existed lack it — resolve from a fresh site fetch.
            site = await async_get_site(session, token, self.site_id)
            parse_id = self._output_parse_id(site.devices, device_id)
        if parse_id is None:
            _LOGGER.debug("Plejd rename skipped: no Parse id for device %s", device_id)
            return
        if not await async_set_device_title(session, token, self.site_id, device_id, parse_id, title):
            raise HomeAssistantError(f"Plejd rejected the rename of device {device_id}")

    async def async_handle_device_registry_update(self, event: object) -> None:
        """When the user renames one of our devices in HA, push the new name to Plejd."""
        data = getattr(event, "data", {}) or {}
        if data.get("action") != "update" or "name_by_user" not in (data.get("changes") or {}):
            return
        device_id = data.get("device_id")
        if not device_id:
            return
        registry = device_registry.async_get(self.hass)
        if registry is None:
            return
        device = registry.async_get(device_id)
        if device is None:
            return
        plejd_id = next((ident for (domain, ident) in device.identifiers if domain == DOMAIN), None)
        name = device.name_by_user
        if plejd_id is None or not name:
            return
        if plejd_id.startswith(ROOM_DEVICE_ID_PREFIX):
            return  # a room pseudo-device has no Parse cloud object to rename
        try:
            await self.async_rename_device(plejd_id, name)
        except PlejdAuthError:
            # No gateway connect path exists in BLE-only setups, so prompt reauth here.
            self._entry.async_start_reauth(self.hass)
        except Exception:  # noqa: BLE001 - mirroring a rename is auxiliary and must never disrupt HA
            _LOGGER.warning("Plejd: could not mirror the device rename to the Plejd app", exc_info=True)

    async def _async_select_and_connect(self) -> None:
        """Connect over the chosen transport.

        Honour the user's forced preference; otherwise prefer the gateway and fall
        back to BLE when it's absent or unreachable.
        """
        if self._transport_pref == TRANSPORT_BLE:
            await self._async_connect_ble()
            return
        if self._transport_pref == TRANSPORT_GATEWAY:
            if self._gateway is None:
                raise ConfigEntryNotReady("Gateway transport selected, but this site has no gateway")
            await self._async_connect_gateway()
            return
        if self._gateway is not None:
            try:
                await self._async_connect_gateway()
                return
            except ConfigEntryNotReady as err:
                _LOGGER.warning("Plejd gateway connect failed, falling back to BLE: %s", err)
        await self._async_connect_ble()

    async def _async_connect_gateway(self) -> None:
        try:
            await self._gateway.connect()
        except PlejdAuthError as err:
            # Bad/expired cloud credentials: trigger reauth, don't mask as a transient outage.
            raise ConfigEntryAuthFailed("Plejd cloud credentials rejected") from err
        except Exception as err:  # noqa: BLE001 - transient gateway failure: fall back / retry
            raise ConfigEntryNotReady(f"gateway connect failed: {err}") from err
        self._active = "gateway"
        self._available = True
        self._notify_outputs()
        await self._start_fault_polling()

    async def _async_connect_ble(self) -> None:
        info = self._pick_device()
        if info is None:
            raise ConfigEntryNotReady("no Plejd device in range")
        device = bluetooth.async_ble_device_from_address(self.hass, info.address, connectable=True)
        if device is None:
            raise ConfigEntryNotReady(f"could not resolve {info.address}")
        _LOGGER.debug("connecting to Plejd mesh via %s", info.address)
        try:
            await self._connection.connect(device)
        except Exception as err:  # noqa: BLE001 - surface any BLE failure as a setup retry
            raise ConfigEntryNotReady(f"failed to connect: {err}") from err
        await self._async_read_all_states()
        await self._async_read_all_settings()
        self._active = "ble"
        self._available = True
        self._notify_outputs()
        await self._start_fault_polling()
        try:
            await self.async_sync_clock()
        except Exception:  # noqa: BLE001 - clock sync is auxiliary, never fail setup over it
            _LOGGER.warning("Plejd clock sync after connect failed", exc_info=True)
        # Keep device RTCs aligned (they drive on-device time/astro events) across drift + DST.
        if self._clock_unsub is not None:
            self._clock_unsub()
        self._clock_unsub = async_track_time_interval(self.hass, self._async_periodic_clock_sync, timedelta(days=1))

    async def _async_periodic_clock_sync(self, _now: object) -> None:
        try:
            await self.async_sync_clock()
        except Exception:  # noqa: BLE001 - best-effort; a missed daily sync is not fatal
            _LOGGER.warning("Plejd periodic clock sync failed", exc_info=True)

    async def _start_fault_polling(self) -> None:
        """Poll device health (NotifyEvents) periodically; replies arrive push-side."""
        if self._faults_unsub is not None:
            self._faults_unsub()
        self._faults_unsub = async_track_time_interval(self.hass, self._async_poll_faults, NOTIFY_POLL_INTERVAL)
        await self._async_poll_faults(None)

    async def _async_poll_faults(self, _now: object) -> None:
        # NotifyEvents belongs to the physical device, not any one output — poll the
        # device's own mesh address (may differ from an output's outputAddress).
        need_device_addresses = not self._device_addresses
        need_rooms = self._rooms_from_legacy_entry
        if (need_device_addresses or need_rooms) and self._email and self._password:
            try:
                session = async_get_clientsession(self.hass)
                token = await async_login(session, self._email, self._password)
                site = await async_get_site(session, token, self.site_id)
                if need_device_addresses:
                    self._device_addresses = dict(site.device_addresses)
                if need_rooms:
                    self.rooms = site.rooms
                    self._rooms_from_legacy_entry = False
                    # Persist to entry.data, not just the in-memory coordinator: the light
                    # platform only builds PlejdRoomLight entities from CONF_ROOMS at setup,
                    # so an unpersisted backfill would lose room entities on the next
                    # restart/reload if the cloud is unreachable then (#86 review).
                    self.hass.config_entries.async_update_entry(
                        self._entry,
                        data={**self._entry.data, CONF_ROOMS: [asdict(r) for r in site.rooms]},
                    )
            except Exception:  # noqa: BLE001 - fault polling is best-effort; retry next interval
                _LOGGER.debug("Plejd fault poll: could not resolve device addresses", exc_info=True)
        for address in set(self._device_addresses.values()):
            try:
                await self._write_vector(protocol.request_notify_events(address))
            except Exception:  # noqa: BLE001 - best-effort per device; one failure shouldn't skip the rest
                _LOGGER.debug("Plejd fault poll failed for device %s", address, exc_info=True)
                continue

    async def _async_get_token(self) -> str:
        """Fetch a fresh Parse session token for the gateway WebSocket (login each time)."""
        return await async_login(async_get_clientsession(self.hass), self._email, self._password)

    async def _async_read_all_states(self) -> None:
        """Ask each output for its current state so entities populate on connect."""
        mesh = self._connection.mesh
        if mesh is None:
            return
        seen: set[int] = set()
        for device in self.devices:
            if device.address is None or device.address in seen:
                continue
            seen.add(device.address)
            await self._connection.write(mesh.request_output(device.address, device.output_index))

    async def _async_read_all_settings(self) -> None:
        """Read per-output settings from each addressable device after BLE connect."""
        mesh = self._connection.mesh
        if mesh is None:
            return
        seen: set[int] = set()
        for device in self.devices:
            if device.address is None or device.address in seen:
                continue
            seen.add(device.address)
            addr, out = device.address, device.output_index
            if device.dimmable:
                await self._connection.write(mesh.encrypt(protocol.request_output_min_level(addr, out)))
                await self._connection.write(mesh.encrypt(protocol.request_output_max_level(addr, out)))
                await self._connection.write(mesh.encrypt(protocol.request_output_speed(addr, out)))
                await self._connection.write(mesh.encrypt(protocol.request_output_curve(addr, out)))
                await self._connection.write(mesh.encrypt(protocol.request_output_phase_dim(addr, out)))
                if device.hardware_id in PHASE_DIM_HARDWARE:
                    await self._connection.write(mesh.encrypt(protocol.request_output_inrush_current(addr, out)))
            if device.category in (CATEGORY_LIGHT, CATEGORY_SWITCH):
                await self._connection.write(mesh.encrypt(protocol.request_output_boot_state(addr, out)))
            if device.hardware_id in RELAY_HARDWARE:
                await self._connection.write(mesh.encrypt(protocol.request_output_relay_off_time(addr, out)))
            if device.hardware_id in RELAY_CONFIG_HARDWARE:
                await self._connection.write(mesh.encrypt(protocol.request_output_relay_config(addr, out)))

    @callback
    def _handle_disconnect(self) -> None:
        # The link dropped: entities go unavailable until a reconnect succeeds.
        self._available = False
        self._notify_outputs()
        if not self._closed:
            self._reconnect_task = self._spawn(self._async_reconnect())

    def _spawn(self, coro: Coroutine[Any, Any, None]) -> asyncio.Task:
        # Prefer HA's owned background task; fall back to a bare task outside HA (tests).
        create = getattr(self.hass, "async_create_background_task", None)
        if create is not None:
            return create(coro, name="plejd-reconnect")
        return asyncio.ensure_future(coro)

    async def _async_reconnect(self) -> None:
        """Reconnect (gateway or BLE) with exponential backoff until it succeeds or we close.

        Any failure to (re)connect must keep this loop alive: a single uncaught
        exception here silently kills the background task and the transport
        never reconnects again on its own, even if the underlying issue clears.
        """
        if self._reconnecting:
            return
        self._reconnecting = True
        delay = RECONNECT_INITIAL_DELAY
        try:
            while not self._closed and not self.available:
                await asyncio.sleep(delay)
                if self._closed:
                    return
                try:
                    await self._async_select_and_connect()
                    _LOGGER.debug("reconnected to Plejd over %s", self._active)
                    return
                except ConfigEntryAuthFailed:
                    # Retrying with the same rejected credentials can't succeed; prompt
                    # reauth and stop until the entry reloads with fresh ones.
                    self._entry.async_start_reauth(self.hass)
                    _LOGGER.warning("Plejd reconnect stopped: cloud credentials rejected, reauth requested")
                    return
                except ConfigEntryNotReady as err:
                    # Expected transient condition (device out of range, gateway
                    # unreachable, ...) — quiet, keeps retrying.
                    delay = min(delay * 2, RECONNECT_MAX_DELAY)
                    _LOGGER.debug("Plejd reconnect failed (retry in %ss): %s", delay, err)
                except Exception:  # noqa: BLE001 - unexpected bug: keep retrying, but make it visible
                    delay = min(delay * 2, RECONNECT_MAX_DELAY)
                    _LOGGER.warning("Plejd reconnect hit an unexpected error (retry in %ss)", delay, exc_info=True)
        finally:
            self._reconnecting = False

    async def _write_vector(self, vector: bytes) -> None:
        """Send a plaintext command vector over the active transport.

        The gateway relays plaintext (it holds the crypto key); BLE encrypts first.
        """
        if self._active == "gateway" and self._gateway is not None and self._gateway.connected:
            await self._gateway.write(vector)
            return
        mesh = self._connection.mesh
        if mesh is None:
            raise HomeAssistantError("Plejd mesh is not connected")
        await self._connection.write(mesh.encrypt(vector))

    async def async_sync_clock(self) -> None:
        """Broadcast the current local wall-clock to every mesh device (0x001B)."""
        now = dt_util.now()
        epoch = int(now.timestamp() + now.utcoffset().total_seconds())
        await self._write_vector(protocol.set_timestamp(epoch))

    async def async_program_time_event(
        self, slot: int, mask: int, hour: int, minute: int, second: int, scene: int, fade: int
    ) -> None:
        """Program an on-device weekly time event that runs a scene (3-step config)."""
        await self._write_vector(protocol.set_time_event_time(slot, mask, hour, minute, second, TIME_EVENT_REP_FOREVER))
        await self._write_vector(protocol.set_time_event_type(slot, TIME_EVENT_RESULT_SCENE))
        await self._write_vector(protocol.set_time_event_scene(slot, scene, fade))

    async def async_remove_time_event(self, slot: int) -> None:
        """Delete an on-device time event."""
        await self._write_vector(protocol.remove_time_event(slot))

    async def async_set_output(self, address: int, on: bool, level: int, *, notify: bool = True) -> None:
        """Send an on/off + level command for an output.

        Uses 0x0098 (`set_group_state_and_level`): the per-output cloud address alone
        identifies the target output, with no separate output byte — 0x00C8 with the
        per-output address broke every output past the first on a multi-output
        device (#71).

        `notify=False` lets a caller that still has more state to record (e.g.
        async_set_group_output's member states) defer the listener notification
        until everything is consistent, instead of notifying mid-update.
        """
        # Captured before the write, not after: over the gateway transport, a normal
        # published ack is decoded into state_for() before _write_vector()'s own await
        # returns, so reading "prior" afterward would already see this command's own
        # echo (off, level 0) instead of the real previous level.
        prior = self.state_for(address)
        await self._write_vector(protocol.set_group_state_and_level(address, on, level))
        current = self.state_for(address)
        # What our OWN command's echo literally looks like on the wire - level=0 for an
        # off command regardless of the remembered brightness (the enriched value below
        # is our own bookkeeping, not something the protocol's echo itself carries).
        raw_echo = OutputState(output=address, on=on, level=level)
        if current is not None and current != prior and current != raw_echo:
            # Something else (a physical switch, the Plejd app, another output on this
            # device) changed this output to a value we didn't command while our own
            # write was in flight. Its own push already notified listeners with the
            # real state (_on_event) - don't stomp that with our stale optimistic guess.
            return
        # Reflect the change immediately rather than waiting for the mesh's own echo:
        # BLE writes are never acked, and even the gateway's ack isn't guaranteed to
        # land before this returns. Without this, a command sent right after another
        # (e.g. a fast on-then-off) reads stale state and computes the wrong direction.
        # Turning off doesn't erase the remembered brightness - a real device keeps
        # reporting its last dim position while off, so the off case preserves the
        # prior level instead of the protocol's own off payload (always 0).
        record_level = level if on else (prior.level if prior is not None else level)
        self._record_output_state(address, OutputState(output=address, on=on, level=record_level))
        if notify:
            self._notify_outputs()

    async def async_all_off(self) -> None:
        """Turn off every light output in the site (mirrors the Plejd app's "all off")."""
        seen: set[int] = set()
        attempted = 0
        succeeded = 0
        for device in self.devices:
            if device.category != CATEGORY_LIGHT or device.address is None or device.address in seen:
                continue
            seen.add(device.address)
            attempted += 1
            try:
                await self.async_set_output(device.address, False, 0)
            except Exception:  # noqa: BLE001 - one output failing must not abort turning off the rest
                _LOGGER.warning("Plejd all_off: failed to turn off output %s", device.address, exc_info=True)
                continue
            succeeded += 1
        if attempted and not succeeded:
            raise HomeAssistantError("Plejd all_off: failed to turn off any output")

    async def async_set_group_output(self, address: int, on: bool, level: int, member_addresses: list[int]) -> None:
        """Send a group command (a Plejd room), then reflect it in each member's own state.

        A group command's own ack/echo is keyed by the group address, not by any
        member's address, so member outputs would otherwise show stale state until
        each one separately reports its own change over the mesh/gateway.
        """
        await self.async_set_output(address, on, level, notify=False)
        self._record_group_member_states(on, level, member_addresses)
        self._notify_outputs()

    def _fan_group_state_to_members(self, command: Command) -> None:
        """Reflect an externally-initiated room broadcast (e.g. the Plejd app) in each member.

        Like our own group commands (see async_set_group_output), a group broadcast is
        keyed by the room's own group address, not by any member's address, so
        PlejdRoomLight (which reads member state) would otherwise stay stale until each
        member separately reports its own change.
        """
        room = next((r for r in self.rooms if r.address == command.address), None)
        if room is None:
            return
        state = protocol.decode_output_state(command)
        if state is None:
            return
        self._record_group_member_states(state.on, state.level, room.member_addresses)

    def _record_group_member_states(self, on: bool, level: int, member_addresses: list[int]) -> None:
        for member in member_addresses:
            if on:
                member_level = level
            else:
                # Turning off doesn't erase a member's remembered brightness (the level
                # param here is just the protocol's off payload) - a real device keeps
                # reporting its own last dim position while off, and the room's restore
                # should too.
                prior = self.state_for(member)
                member_level = prior.level if prior is not None else level
            self._record_output_state(member, OutputState(output=member, on=on, level=member_level))

    def _record_output_state(self, address: int, state: OutputState) -> None:
        if self._active == "gateway" and self._gateway is not None:
            self._gateway.set_state(address, state)
        elif self._connection.mesh is not None:
            self._connection.mesh.set_state(address, state)

    async def async_set_output_min_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's minimum dim level (0-1 fraction)."""
        await self._write_vector(protocol.set_output_min_level(address, output, fraction))
        self._cache_output_setting(address, min_level=fraction * 100)

    async def async_set_output_max_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's maximum dim level (0-1 fraction)."""
        await self._write_vector(protocol.set_output_max_level(address, output, fraction))
        self._cache_output_setting(address, max_level=fraction * 100)

    async def async_set_output_start_level(self, address: int, output: int, fraction: float) -> None:
        """Set an output's start level (0-1 fraction)."""
        await self._write_vector(protocol.set_output_start_level(address, output, fraction))

    async def async_set_output_speed(self, address: int, output: int, seconds: float) -> None:
        """Set an output's dim transition time (seconds; 0 = instant)."""
        await self._write_vector(protocol.set_output_speed(address, output, seconds))
        self._cache_output_setting(address, speed=seconds)

    async def async_set_output_curve(self, address: int, output: int, curve: int) -> None:
        """Set an output's dimming curve (LoadCurve byte)."""
        await self._write_vector(protocol.set_output_curve(address, output, curve))
        self._cache_output_setting(address, curve=curve)

    async def async_set_output_phase_dim(self, address: int, output: int, phase: int) -> None:
        """Set an output's phase-dim edge (PhaseOutputType byte)."""
        await self._write_vector(protocol.set_output_phase_dim(address, output, phase))
        self._cache_output_setting(address, phase_dim=phase)

    async def async_set_output_boot_state(self, address: int, output: int, use_last: bool) -> None:
        """Set an output's after-power-outage boot state (True=restore, False=off)."""
        await self._write_vector(protocol.set_output_boot_state(address, output, use_last))
        self._cache_output_setting(address, boot_state=use_last)

    async def async_set_output_relay_off_time(self, address: int, output: int, seconds: float) -> None:
        """Set minimum relay off time in seconds (relay devices only)."""
        await self._write_vector(protocol.set_output_relay_off_time(address, output, seconds))
        self._cache_output_setting(address, relay_off_time=seconds)

    async def async_set_output_relay_config(self, address: int, output: int, config: int) -> None:
        """Set relay pole configuration (0=TwoPole, 1=OnePole)."""
        await self._write_vector(protocol.set_output_relay_config(address, output, config))
        self._cache_output_setting(address, relay_pole_config=config)

    async def async_set_output_inrush_current(self, address: int, output: int, time_ms: int) -> None:
        """Set inrush current protection time in milliseconds (0=disabled)."""
        await self._write_vector(protocol.set_output_inrush_current(address, output, time_ms))
        self._cache_output_setting(address, inrush_current_ms=time_ms)

    async def async_execute_scene(self, index: int) -> None:
        """Trigger a Plejd scene (broadcast to address 0)."""
        await self._write_vector(protocol.execute_scene(0, index))

    async def async_leave_mesh_group(self, address: int, room_address: int) -> None:
        """Remove a device from a room's mesh group, as part of moving it to another room."""
        await self._write_vector(protocol.leave_mesh_group(address, room_address))

    async def async_join_mesh_group(self, address: int, room_address: int) -> None:
        """Add a device to a room's mesh group, as part of moving it to another room."""
        await self._write_vector(protocol.join_mesh_group(address, room_address))

    async def async_set_climate_setpoint(self, address: int, celsius: float) -> None:
        """Set a thermostat target temperature."""
        await self._write_vector(protocol.set_climate_setpoint(address, celsius))

    async def async_set_climate_mode(self, address: int, mode: int) -> None:
        """Set a thermostat operating mode."""
        await self._write_vector(protocol.set_climate_mode(address, mode))

    async def async_set_cover_position(self, address: int, position: int) -> None:
        """Move a cover to a position (0-100)."""
        await self._write_vector(protocol.set_cover_position(address, position))

    async def async_cover_stop(self, address: int) -> None:
        """Halt a cover."""
        await self._write_vector(protocol.cover_stop(address))

    async def async_shutdown(self) -> None:
        self._closed = True
        if self._cloud_poll_unsub is not None:
            self._cloud_poll_unsub()
            self._cloud_poll_unsub = None
        self.dim_ramp.shutdown()
        if self._clock_unsub is not None:
            self._clock_unsub()
            self._clock_unsub = None
        if self._faults_unsub is not None:
            self._faults_unsub()
            self._faults_unsub = None
        if self._firmware_unsub is not None:
            self._firmware_unsub()
            self._firmware_unsub = None
        if self._firmware_now_unsub is not None:
            self._firmware_now_unsub()
            self._firmware_now_unsub = None
        if self._reconnect_task is not None:
            self._reconnect_task.cancel()
            self._reconnect_task = None
        if self._gateway is not None:
            await self._gateway.disconnect()
        await self._connection.disconnect()
