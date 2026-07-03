"""Config flow for the Plejd integration."""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import TYPE_CHECKING, Any
from uuid import uuid4

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import SelectSelector, SelectSelectorConfig

from .cloud import (
    PlejdAuthError,
    PlejdCloudError,
    async_get_site,
    async_get_sites,
    async_login,
)
from .commission import async_add_device
from .const import (
    CONF_CRYPTO_KEY,
    CONF_DEVICES,
    CONF_DISCOVERED_ADDRESS,
    CONF_GATEWAYS,
    CONF_INPUTS,
    CONF_INSTALLATION_ID,
    CONF_MOTION,
    CONF_RESOURCE_SET_ID,
    CONF_SCENES,
    CONF_SCHEDULES,
    CONF_SITE_ID,
    CONF_TRANSPORT,
    DOMAIN,
    TIME_EVENT_SLOTS,
    TRANSPORT_AUTO,
    TRANSPORT_BLE,
    TRANSPORT_GATEWAY,
    WEEKDAYS,
)
from .discovery import async_scan_unprovisioned

if TYPE_CHECKING:
    from homeassistant.components.bluetooth import BluetoothServiceInfoBleak

_LOGGER = logging.getLogger(__name__)

STEP_USER_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_EMAIL): str,
        vol.Required(CONF_PASSWORD): str,
    }
)


def _parse_time(value: str) -> tuple[int, int, int] | None:
    """Parse 'HH:MM' or 'HH:MM:SS' into (hour, minute, second), or None if invalid."""
    parts = value.split(":")
    if len(parts) not in (2, 3) or not all(p.isdigit() for p in parts):
        return None
    hour, minute = int(parts[0]), int(parts[1])
    second = int(parts[2]) if len(parts) == 3 else 0
    if hour > 23 or minute > 59 or second > 59:
        return None
    return hour, minute, second


def _site_id(item: dict) -> str:
    # getSiteList items nest the id/title under "site" (validated against the API).
    return (item.get("site") or item)["siteId"]


def _site_title(item: dict) -> str:
    site = item.get("site") or item
    return site.get("title") or site["siteId"]


class PlejdConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Plejd."""

    VERSION = 1

    @staticmethod
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        """Return the options flow: manage schedules, or add a new device."""
        return PlejdOptionsFlow(config_entry)

    def __init__(self) -> None:
        self._discovered_address: str | None = None
        self._email: str = ""
        self._password: str = ""
        self._token: str = ""
        self._sites: list[dict] = []

    async def async_step_bluetooth(self, discovery_info: BluetoothServiceInfoBleak) -> ConfigFlowResult:
        # A Plejd mesh device is in range — remember it, then ask for the account login.
        self._discovered_address = discovery_info.address
        self.context["title_placeholders"] = {"name": discovery_info.name}
        return await self.async_step_user()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        if user_input is not None:
            self._email = user_input[CONF_EMAIL]
            self._password = user_input[CONF_PASSWORD]
            session = async_get_clientsession(self.hass)
            try:
                self._token = await async_login(session, self._email, self._password)
                self._sites = await async_get_sites(session, self._token)
            except PlejdAuthError:
                errors["base"] = "invalid_auth"
            except PlejdCloudError:
                errors["base"] = "cannot_connect"
            else:
                if not self._sites:
                    errors["base"] = "no_sites"
                elif len(self._sites) == 1:
                    return await self._create_entry(_site_id(self._sites[0]))
                else:
                    return await self.async_step_site()
        return self.async_show_form(step_id="user", data_schema=STEP_USER_SCHEMA, errors=errors)

    async def async_step_site(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return await self._create_entry(user_input[CONF_SITE_ID])
        options = [{"value": _site_id(s), "label": _site_title(s)} for s in self._sites]
        schema = vol.Schema({vol.Required(CONF_SITE_ID): SelectSelector(SelectSelectorConfig(options=options))})
        return self.async_show_form(step_id="site", data_schema=schema)

    async def async_step_reauth(self, entry_data: dict[str, Any]) -> ConfigFlowResult:
        """Re-authentication started (e.g. the gateway rejected stored credentials)."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Ask for the password again and verify it against the Plejd cloud."""
        entry = self._get_reauth_entry()
        errors: dict[str, str] = {}
        if user_input is not None:
            session = async_get_clientsession(self.hass)
            try:
                await async_login(session, entry.data[CONF_EMAIL], user_input[CONF_PASSWORD])
            except PlejdAuthError:
                errors["base"] = "invalid_auth"
            except PlejdCloudError:
                errors["base"] = "cannot_connect"
            else:
                return self.async_update_reload_and_abort(
                    entry, data_updates={CONF_PASSWORD: user_input[CONF_PASSWORD]}
                )
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=vol.Schema({vol.Required(CONF_PASSWORD): str}),
            errors=errors,
            description_placeholders={"email": entry.data[CONF_EMAIL]},
        )

    async def _create_entry(self, site_id: str) -> ConfigFlowResult:
        session = async_get_clientsession(self.hass)
        try:
            site = await async_get_site(session, self._token, site_id)
        except PlejdCloudError:
            return self.async_show_form(step_id="user", data_schema=STEP_USER_SCHEMA, errors={"base": "cannot_connect"})
        await self.async_set_unique_id(site.site_id)
        self._abort_if_unique_id_configured()
        return self.async_create_entry(
            title=site.title,
            data={
                CONF_EMAIL: self._email,
                CONF_PASSWORD: self._password,
                CONF_SITE_ID: site.site_id,
                CONF_CRYPTO_KEY: site.crypto_key.hex(),
                CONF_DISCOVERED_ADDRESS: self._discovered_address,
                CONF_DEVICES: [asdict(d) for d in site.devices],
                CONF_INPUTS: [asdict(i) for i in site.inputs],
                CONF_MOTION: [asdict(m) for m in site.motion],
                CONF_SCENES: [asdict(s) for s in site.scenes],
                CONF_GATEWAYS: site.gateways,
                CONF_RESOURCE_SET_ID: site.resource_set_id,
                CONF_INSTALLATION_ID: str(uuid4()),
            },
        )


class PlejdOptionsFlow(OptionsFlow):
    """Configure Plejd: manage on-device schedules, or add a new device to the mesh."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        self._entry = config_entry
        self._new_device_address: str | None = None

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Entry point: a menu, not tied to any particular device (works with or without a gateway)."""
        return self.async_show_menu(step_id="init", menu_options=["schedules", "add_device"])

    async def async_step_schedules(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        schedules: list[dict] = list(self._entry.options.get(CONF_SCHEDULES, []))
        next_id: int = self._entry.options.get("next_schedule_id", 0)
        transport: str = self._entry.options.get(CONF_TRANSPORT, TRANSPORT_AUTO)
        # A usable gateway needs both a device and a resource set (matches the coordinator).
        has_gateway = bool(self._entry.data.get(CONF_GATEWAYS) and self._entry.data.get(CONF_RESOURCE_SET_ID))
        errors: dict[str, str] = {}
        if user_input is not None:
            to_delete = set(user_input.get("delete", []))
            kept = [s for s in schedules if str(s["slot"]) not in to_delete]
            removed = [s for s in schedules if str(s["slot"]) in to_delete]
            new_schedule: dict | None = None
            name = (user_input.get("name") or "").strip()
            if name:
                parsed = _parse_time(user_input.get("time", ""))
                used = {s["slot"] for s in kept}
                slot = next((i for i in range(TIME_EVENT_SLOTS) if i not in used), None)
                if user_input.get("scene") is None:
                    errors["base"] = "scene_required"
                elif not user_input.get("days"):
                    errors["base"] = "days_required"
                elif parsed is None:
                    errors["time"] = "invalid_time"
                elif slot is None:
                    errors["base"] = "no_free_slots"
                else:
                    hour, minute, second = parsed
                    new_schedule = {
                        "id": next_id,
                        "slot": slot,
                        "name": name,
                        "days": [WEEKDAYS.index(d) for d in user_input.get("days", [])],
                        "time": f"{hour:02d}:{minute:02d}:{second:02d}",
                        "scene": int(user_input["scene"]),
                        "fade": int(user_input.get("fade", 0)),
                    }
            if not errors:
                # Only once the save is certain: clear deleted device events, then persist.
                await self._clear_deleted(removed)
                if new_schedule is not None:
                    kept.append(new_schedule)
                    next_id += 1
                return self.async_create_entry(
                    title="",
                    data={
                        CONF_SCHEDULES: kept,
                        "next_schedule_id": next_id,
                        # Reset a stale gateway-only preference to auto when there's no usable gateway.
                        CONF_TRANSPORT: user_input.get("transport", transport) if has_gateway else TRANSPORT_AUTO,
                    },
                )

        scene_options = [{"value": str(s["index"]), "label": s["name"]} for s in self._entry.data.get(CONF_SCENES, [])]
        day_options = [{"value": d, "label": d} for d in WEEKDAYS]
        fields: dict[Any, Any] = {}
        if schedules:
            existing = [{"value": str(s["slot"]), "label": s["name"]} for s in schedules]
            fields[vol.Optional("delete", default=[])] = SelectSelector(
                SelectSelectorConfig(options=existing, multiple=True)
            )
        fields[vol.Optional("name", default="")] = str
        fields[vol.Optional("days", default=[])] = SelectSelector(
            SelectSelectorConfig(options=day_options, multiple=True)
        )
        fields[vol.Optional("time", default="07:00")] = str
        fields[vol.Optional("scene")] = SelectSelector(SelectSelectorConfig(options=scene_options))
        fields[vol.Optional("fade", default=0)] = int
        if has_gateway:
            # Force a comms interface (only meaningful when the site has a gateway).
            transport_options = [
                {"value": TRANSPORT_AUTO, "label": "Automatic (gateway first, Bluetooth fallback)"},
                {"value": TRANSPORT_GATEWAY, "label": "Gateway only (remote/cloud)"},
                {"value": TRANSPORT_BLE, "label": "Bluetooth only (local)"},
            ]
            fields[vol.Optional("transport", default=transport)] = SelectSelector(
                SelectSelectorConfig(options=transport_options)
            )
        return self.async_show_form(step_id="schedules", data_schema=vol.Schema(fields), errors=errors)

    async def _clear_deleted(self, removed: list[dict]) -> None:
        """Delete the device-side event for each removed schedule (best-effort)."""
        coordinator = getattr(self._entry, "runtime_data", None)
        for schedule in removed:
            try:
                await coordinator.async_remove_time_event(schedule["slot"])
            except Exception:  # noqa: BLE001 - best-effort; persist the deletion whatever the mesh does
                _LOGGER.warning("Could not clear Plejd schedule slot %s from the mesh", schedule["slot"])

    async def async_step_add_device(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Pick an unprovisioned device from what's currently visible over Bluetooth."""
        devices = async_scan_unprovisioned(self.hass)
        if not devices:
            return self.async_show_form(
                step_id="add_device", data_schema=vol.Schema({}), errors={"base": "no_devices_found"}
            )
        if user_input is not None and (address := user_input.get("device_address")):
            self._new_device_address = address
            return await self.async_step_add_device_details()
        options = [
            {"value": d["address"], "label": f"{d['address']} — {d['model']} (RSSI {d['rssi']})"} for d in devices
        ]
        schema = vol.Schema({vol.Required("device_address"): SelectSelector(SelectSelectorConfig(options=options))})
        return self.async_show_form(step_id="add_device", data_schema=schema)

    async def async_step_add_device_details(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Name the device (and optionally its room), then commission it."""
        errors: dict[str, str] = {}
        description_placeholders = {"address": self._new_device_address or ""}
        if user_input is not None:
            name = (user_input.get("name") or "").strip()
            room_title = (user_input.get("room_title") or "").strip() or None
            if not name:
                errors["name"] = "name_required"
            else:
                try:
                    await async_add_device(
                        self.hass, self._entry, address=self._new_device_address, name=name, room_title=room_title
                    )
                except HomeAssistantError as err:
                    errors["base"] = "add_device_failed"
                    description_placeholders["error"] = str(err)
                else:
                    return self.async_create_entry(title="", data=dict(self._entry.options))
        schema = vol.Schema({vol.Required("name"): str, vol.Optional("room_title", default=""): str})
        return self.async_show_form(
            step_id="add_device_details",
            data_schema=schema,
            errors=errors,
            description_placeholders=description_placeholders,
        )
