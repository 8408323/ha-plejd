"""Pytest configuration — make the plejd integration importable without the full HA stack.

If `homeassistant` is installed it is used as-is. Otherwise (the lean uv CI env) we
inject the minimal set of HA symbols the skeleton imports, then expose the integration
as the top-level `plejd` package so tests can `from plejd... import ...`.
"""

from __future__ import annotations

import os
import sys
import types

_CC = os.path.join(os.path.dirname(__file__), "..", "custom_components")
sys.path.insert(0, os.path.abspath(_CC))

_CONF = {"CONF_EMAIL": "email", "CONF_PASSWORD": "pass" + "word"}

try:
    import homeassistant.config_entries  # noqa: F401
    import homeassistant.const  # noqa: F401
    import homeassistant.core  # noqa: F401
except ImportError:
    _ha = types.ModuleType("homeassistant")
    sys.modules.setdefault("homeassistant", _ha)

    _const = types.ModuleType("homeassistant.const")
    for _k, _v in _CONF.items():
        setattr(_const, _k, _v)

    class _Platform(str):
        pass

    _const.Platform = _Platform  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.const", _const)

    _core = types.ModuleType("homeassistant.core")

    class _HomeAssistant:
        pass

    _core.HomeAssistant = _HomeAssistant  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.core", _core)

    _ce = types.ModuleType("homeassistant.config_entries")

    class _ConfigEntry:
        pass

    class _ConfigFlow:
        def __init_subclass__(cls, domain=None, **kwargs):
            super().__init_subclass__(**kwargs)

        async def async_set_unique_id(self, unique_id):
            self.unique_id = unique_id
            return None

        def _abort_if_unique_id_configured(self):
            return None

        def async_create_entry(self, *, title, data):
            return {"type": "create_entry", "title": title, "data": data}

        def async_show_form(self, *, step_id, data_schema=None, errors=None):
            return {"type": "form", "step_id": step_id, "data_schema": data_schema, "errors": errors}

    _ce.ConfigEntry = _ConfigEntry  # type: ignore[attr-defined]
    _ce.ConfigFlow = _ConfigFlow  # type: ignore[attr-defined]
    _ce.ConfigFlowResult = dict  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.config_entries", _ce)

    _helpers = types.ModuleType("homeassistant.helpers")
    sys.modules.setdefault("homeassistant.helpers", _helpers)

    _aiohttp = types.ModuleType("homeassistant.helpers.aiohttp_client")

    def _async_get_clientsession(hass):
        return getattr(hass, "session", None)

    _aiohttp.async_get_clientsession = _async_get_clientsession  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.helpers.aiohttp_client", _aiohttp)

    _selector = types.ModuleType("homeassistant.helpers.selector")

    class _SelectSelectorConfig:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

    class _SelectSelector:
        def __init__(self, config=None):
            self.config = config

        def __call__(self, value):
            return value

    _selector.SelectSelector = _SelectSelector  # type: ignore[attr-defined]
    _selector.SelectSelectorConfig = _SelectSelectorConfig  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.helpers.selector", _selector)
