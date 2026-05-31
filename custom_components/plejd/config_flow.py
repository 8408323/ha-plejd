"""Config flow for the Plejd integration."""

from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
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
    CONF_SITE_ID,
    DOMAIN,
)

if TYPE_CHECKING:
    from homeassistant.components.bluetooth import BluetoothServiceInfoBleak

STEP_USER_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_EMAIL): str,
        vol.Required(CONF_PASSWORD): str,
    }
)


class PlejdConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Plejd."""

    VERSION = 1

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
                    return await self._create_entry(self._sites[0]["siteId"])
                else:
                    return await self.async_step_site()
        return self.async_show_form(step_id="user", data_schema=STEP_USER_SCHEMA, errors=errors)

    async def async_step_site(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return await self._create_entry(user_input[CONF_SITE_ID])
        options = [{"value": s["siteId"], "label": s.get("title") or s["siteId"]} for s in self._sites]
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
            },
        )
