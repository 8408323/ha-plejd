"""Config flow for the Plejd integration."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD

from .const import CONF_DISCOVERED_ADDRESS, DOMAIN

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
        self._discovered_name: str | None = None

    async def async_step_bluetooth(self, discovery_info: BluetoothServiceInfoBleak) -> ConfigFlowResult:
        # A Plejd mesh device is in range — remember it, then ask for the account login.
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        self._discovered_address = discovery_info.address
        self._discovered_name = discovery_info.name
        self.context["title_placeholders"] = {"name": discovery_info.name}
        return await self.async_step_user()

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            await self.async_set_unique_id(DOMAIN)
            self._abort_if_unique_id_configured()
            # TODO(jonathan): authenticate against the Plejd cloud and fetch the site
            # crypto key + device list before creating the entry (#2).
            return self.async_create_entry(
                title="Plejd",
                data={
                    CONF_EMAIL: user_input[CONF_EMAIL],
                    CONF_PASSWORD: user_input[CONF_PASSWORD],
                    CONF_DISCOVERED_ADDRESS: self._discovered_address,
                },
            )
        return self.async_show_form(step_id="user", data_schema=STEP_USER_SCHEMA)
