"""Config flow for the Plejd integration."""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import TYPE_CHECKING, Any

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
from .const import (
    CONF_CRYPTO_KEY,
    CONF_DEVICES,
    CONF_DISCOVERED_ADDRESS,
    CONF_INPUTS,
    CONF_MOTION,
    CONF_SCENES,
    CONF_SCHEDULES,
    CONF_SITE_ID,
    DOMAIN,
    TIME_EVENT_SLOTS,
    WEEKDAYS,
)

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
        """Return the options flow for managing on-device schedules."""
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
            },
        )


class PlejdOptionsFlow(OptionsFlow):
    """Manage on-device weekly schedules (time event -> scene)."""

    def __init__(self, config_entry: ConfigEntry) -> None:
        self._entry = config_entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        schedules: list[dict] = list(self._entry.options.get(CONF_SCHEDULES, []))
        next_id: int = self._entry.options.get("next_schedule_id", 0)
        errors: dict[str, str] = {}
        if user_input is not None:
            to_delete = set(user_input.get("delete", []))
            await self._clear_deleted([s for s in schedules if str(s["slot"]) in to_delete])
            schedules = [s for s in schedules if str(s["slot"]) not in to_delete]
            name = (user_input.get("name") or "").strip()
            if name:
                parsed = _parse_time(user_input.get("time", ""))
                used = {s["slot"] for s in schedules}
                slot = next((i for i in range(TIME_EVENT_SLOTS) if i not in used), None)
                if user_input.get("scene") is None:
                    errors["base"] = "scene_required"
                elif parsed is None:
                    errors["time"] = "invalid_time"
                elif slot is None:
                    errors["base"] = "no_free_slots"
                else:
                    hour, minute, second = parsed
                    schedules.append(
                        {
                            "id": next_id,
                            "slot": slot,
                            "name": name,
                            "days": [WEEKDAYS.index(d) for d in user_input.get("days", [])],
                            "time": f"{hour:02d}:{minute:02d}:{second:02d}",
                            "scene": int(user_input["scene"]),
                            "fade": int(user_input.get("fade", 0)),
                        }
                    )
                    next_id += 1
            if not errors:
                return self.async_create_entry(title="", data={CONF_SCHEDULES: schedules, "next_schedule_id": next_id})

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
        return self.async_show_form(step_id="init", data_schema=vol.Schema(fields), errors=errors)

    async def _clear_deleted(self, removed: list[dict]) -> None:
        """Delete the device-side event for each removed schedule (best-effort)."""
        coordinator = getattr(self._entry, "runtime_data", None)
        for schedule in removed:
            try:
                await coordinator.async_remove_time_event(schedule["slot"])
            except (AttributeError, HomeAssistantError):
                _LOGGER.warning("Could not clear Plejd schedule slot %s from the mesh", schedule["slot"])
