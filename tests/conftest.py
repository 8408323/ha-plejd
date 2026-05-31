"""Pytest configuration — make the plejd integration importable without the full HA stack.

If `homeassistant` is installed it is used as-is. Otherwise (the lean uv CI env) we
inject the minimal set of HA symbols the skeleton imports, then expose the integration
as the top-level `plejd` package so tests can `from plejd... import ...`.
"""

from __future__ import annotations

import enum
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

    _const.ATTR_TEMPERATURE = "temperature"  # type: ignore[attr-defined]

    class _UnitOfTemperature:
        CELSIUS = "\u00b0C"

    _const.UnitOfTemperature = _UnitOfTemperature  # type: ignore[attr-defined]

    class _Platform(str, enum.Enum):
        LIGHT = "light"
        SWITCH = "switch"
        COVER = "cover"
        CLIMATE = "climate"
        BINARY_SENSOR = "binary_sensor"
        SENSOR = "sensor"
        EVENT = "event"
        SCENE = "scene"

    _const.Platform = _Platform  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.const", _const)

    _core = types.ModuleType("homeassistant.core")

    class _HomeAssistant:
        pass

    def _callback(func):
        return func

    _core.HomeAssistant = _HomeAssistant  # type: ignore[attr-defined]
    _core.callback = _callback  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.core", _core)

    _exc = types.ModuleType("homeassistant.exceptions")

    class _HomeAssistantError(Exception):
        pass

    class _ConfigEntryNotReady(_HomeAssistantError):
        pass

    _exc.HomeAssistantError = _HomeAssistantError  # type: ignore[attr-defined]
    _exc.ConfigEntryNotReady = _ConfigEntryNotReady  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.exceptions", _exc)

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

    _components = types.ModuleType("homeassistant.components")
    sys.modules.setdefault("homeassistant.components", _components)

    _bt = types.ModuleType("homeassistant.components.bluetooth")

    class _BluetoothServiceInfoBleak:
        pass

    def _async_discovered_service_info(hass, connectable=True):
        return getattr(hass, "service_infos", [])

    def _async_ble_device_from_address(hass, address, connectable=True):
        return getattr(hass, "ble_devices", {}).get(address)

    _bt.BluetoothServiceInfoBleak = _BluetoothServiceInfoBleak  # type: ignore[attr-defined]
    _bt.async_discovered_service_info = _async_discovered_service_info  # type: ignore[attr-defined]
    _bt.async_ble_device_from_address = _async_ble_device_from_address  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.components.bluetooth", _bt)

    _light = types.ModuleType("homeassistant.components.light")
    _light.ATTR_BRIGHTNESS = "brightness"  # type: ignore[attr-defined]

    class _ColorMode(str, enum.Enum):
        ONOFF = "onoff"
        BRIGHTNESS = "brightness"

    class _LightEntity:
        def async_on_remove(self, func):
            self._unsub = func

        def async_write_ha_state(self):
            return None

    _light.ColorMode = _ColorMode  # type: ignore[attr-defined]
    _light.LightEntity = _LightEntity  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.components.light", _light)

    _switch = types.ModuleType("homeassistant.components.switch")

    class _SwitchEntity:
        def async_on_remove(self, func):
            self._unsub = func

        def async_write_ha_state(self):
            return None

    _switch.SwitchEntity = _SwitchEntity  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.components.switch", _switch)

    _scene = types.ModuleType("homeassistant.components.scene")

    class _Scene:
        pass

    _scene.Scene = _Scene  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.components.scene", _scene)

    _climate = types.ModuleType("homeassistant.components.climate")

    class _HVACMode(str, enum.Enum):
        OFF = "off"
        HEAT = "heat"

    class _ClimateEntityFeature(enum.IntFlag):
        TARGET_TEMPERATURE = 1
        PRESET_MODE = 16

    class _ClimateEntity:
        def async_on_remove(self, func):
            self._unsub = func

        def async_write_ha_state(self):
            return None

    _climate.HVACMode = _HVACMode  # type: ignore[attr-defined]
    _climate.ClimateEntityFeature = _ClimateEntityFeature  # type: ignore[attr-defined]
    _climate.ClimateEntity = _ClimateEntity  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.components.climate", _climate)

    _event = types.ModuleType("homeassistant.components.event")

    class _EventEntity:
        def _trigger_event(self, event_type, *args):
            self._last_event = event_type

        def async_on_remove(self, func):
            self._unsub = func

        def async_write_ha_state(self):
            return None

    _event.EventEntity = _EventEntity  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.components.event", _event)

    _dr = types.ModuleType("homeassistant.helpers.device_registry")

    class _DeviceInfo(dict):
        def __init__(self, **kwargs):
            super().__init__(**kwargs)

    _dr.DeviceInfo = _DeviceInfo  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.helpers.device_registry", _dr)

    _ep = types.ModuleType("homeassistant.helpers.entity_platform")
    _ep.AddEntitiesCallback = object  # type: ignore[attr-defined]
    sys.modules.setdefault("homeassistant.helpers.entity_platform", _ep)
