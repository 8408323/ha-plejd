"""Constants for the Plejd integration.

Protocol facts here were reverse-engineered from our own analysis of the Plejd
Android app (.NET MAUI, assembly `Plejd.dll` / `Plejd.Shared`). See
docs/reverse_engineering.md for the full decode.
"""

from __future__ import annotations

DOMAIN = "plejd"

# BLE address of the mesh device discovered during the config flow.
CONF_DISCOVERED_ADDRESS = "discovered_address"

# Config-entry data keys.
CONF_SITE_ID = "site_id"
CONF_CRYPTO_KEY = "crypto_key"  # hex string of the 16-byte site key
CONF_DEVICES = "devices"  # cached device list (so HA works offline after setup)
CONF_SCENES = "scenes"  # cached scene list
CONF_INPUTS = "inputs"  # cached button-input list
CONF_MOTION = "motion"  # cached motion-sensor list
HARDWARE_WMS_01 = 70  # motion sensor
CONF_GATEWAYS = "gateways"  # gateway (GWY-01) device ids; remote control is available when non-empty
CONF_RESOURCE_SET_ID = "resource_set_id"  # Resource-Set-ID for the remote-control WebSocket
CONF_INSTALLATION_ID = "installation_id"  # stable client GUID (Client-ID header)

# ── BLE GATT layout (confirmed from Plejd.Shared PlejdConstants.BleCharacteristics) ──
# All characteristics live under the service base UUID with the 3rd 16-bit group
# (the "0001") swapped for the role suffix below.
PLEJD_SERVICE_UUID = "31ba0001-6085-4726-be45-040c957391b5"


def _char(suffix: str) -> str:
    return PLEJD_SERVICE_UUID.replace("0001", suffix, 1)


PLEJD_CHAR_NODE_INDEX_UUID = _char("0002")  # NodeIndex
PLEJD_CHAR_NODE_INDEX_DATA_UUID = _char("0003")  # NodeIndexData
PLEJD_CHAR_DATA_UUID = _char("0004")  # Datavector — write mesh commands here (encrypted)
PLEJD_CHAR_LAST_DATA_UUID = _char("0005")  # LastChangedDatavector — state notifications (encrypted)
PLEJD_CHAR_ACCESS_ADDRESS_UUID = _char("0006")  # AccessAddress
PLEJD_CHAR_DFU_UUID = _char("0007")  # DeviceFirmwareUpdate
PLEJD_CHAR_CRYPTO_KEY_UUID = _char("0008")  # CryptoKey (Diffie-Hellman exchange)
PLEJD_CHAR_AUTH_UUID = _char("0009")  # AuthKey (challenge/response)
PLEJD_CHAR_PING_UUID = _char("000a")  # PingPong (verify login)
PLEJD_CHAR_SPECIAL_UUID = _char("000b")  # SpecialCommand
PLEJD_CHAR_PRODUCT_UUID = _char("000c")  # ProductSpecific

# Only Datavector (0004) and LastChangedDatavector (0005) carry encrypted payloads;
# the auth/ping/key-exchange characteristics are plaintext.
PLEJD_ENCRYPTED_CHARS = (PLEJD_CHAR_DATA_UUID, PLEJD_CHAR_LAST_DATA_UUID)

# Default crypto key used while a device is on the unconfigured "default mesh".
DEFAULT_MESH_CRYPTO_KEY = bytes.fromhex("00112233445566778899aabbccddeeff")

# Encryption applies only to firmware >= this build stamp; older devices are plaintext.
ENCRYPTION_MIN_FIRMWARE = 20160801163820

# ── Mesh command opcodes (2-byte big-endian, from the app's mesh command schema) ──
# The command sits at offset 3 of the Datavector payload (after a 5-byte header).
CMD_OUTPUT_STATE_AND_LEVEL = 0x00C8  # set/report on-off + dim level (output, state, level[2])
CMD_OUTPUT_MIN_LEVEL = 0x00C9
CMD_OUTPUT_MAX_LEVEL = 0x00CA
CMD_OUTPUT_CURVE_TYPE = 0x00CC  # set/report dimming curve (output, LoadCurve byte)
CMD_OUTPUT_PHASE_DIM_TYPE = 0x00CE  # set/report phase-dim edge (output, PhaseOutputType byte)

# Dimming-curve options (LoadCurve enum subset that applies to dimmable outputs).
CURVE_OPTIONS: dict[str, int] = {"linear": 0, "logarithmic": 1, "antilogarithmic": 3}
# Phase-dim edge (PhaseOutputType enum): trailing edge for resistive/LED, leading for inductive.
PHASE_DIM_OPTIONS: dict[str, int] = {"trailing_edge": 0, "leading_edge": 1}
# Hardware that actually phase-cuts (app's IPhaseable: DIM-01/02 family, SPD-01, FAK-01).
# Constant-current LED drivers, DALI, and downlights dim but aren't phase dimmers.
PHASE_DIM_HARDWARE: frozenset[int] = frozenset({1, 2, 11, 14, 15, 22, 24, 25, 40, 164})
CMD_SCENE = 0x0021  # execute scene
CMD_TIME_EVENT_TIME = 0x0258  # set/remove a time event's schedule
CMD_TIME_EVENT_TYPE = 0x0259  # what a time event does (TimeEventResult)
CMD_TIME_EVENT_SCENE = 0x025A  # the scene a time event runs

# Time events (on-device weekly schedules). 20 slots per device; weekday bit = 1<<index
# with Monday=0..Sunday=6 (app's Weekday enum); recurring events repeat "forever".
TIME_EVENT_SLOTS = 20
TIME_EVENT_RESULT_SCENE = 0
TIME_EVENT_REP_FOREVER = 0xFFFFFFFF
WEEKDAYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
CONF_SCHEDULES = "schedules"  # entry.options: list of time-event schedule dicts
CMD_INPUT_STATE_AND_LEVEL = 0x0195  # state notification: channel, state, level[2]
CMD_SYSTEM_TIME = 0x001B
CMD_DEVICE_TYPE = 0x0000
CMD_DEVICE_MAC = 0x0003
CMD_DEVICE_FW_VERSION = 0x0004
CMD_GROUP_STATE_AND_LEVEL = 0x0098  # broadcast on/off + level to a group/all
CMD_INPUT_BUTTON = 0x0097  # button press broadcast on an input address: data=[01 pressed/00 released]
CMD_OUTPUT_SET = 0x0420  # modern "mini-package" output protocol (newer firmware)
SUBPKG_SOURCE = 3  # mini-package sub-package type: source flag
SUBPKG_LUX = 6  # mini-package sub-package type: ambient light
SUBPKG_WINDOW = 7  # WindowControl sub-package
SOURCE_APP = 8  # SourceFlags.App
WINDOW_STOP = 0  # WindowControlType.Stop
WINDOW_LEVEL = 1  # WindowControlType.Level
SOURCE_MOTION = 3  # SourceFlags.Motion
CMD_NOTIFY_EVENTS = 0x002B  # device fault flags (NotifyEvents bitfield)
CMD_HARDFAULT_REASON = 0x001D  # struct: code(u32 le), line(u16 le), message(ascii)
CMD_TRM_SETPOINT = 0x045C  # thermostat target temperature: u16le = round(C*10)
CMD_TRM_MODE = 0x045F  # thermostat operating mode (OperatingMode enum)
CMD_TRM_TEMP_READING = 0x045B  # temperature reading [sensor] -> u16le C*10

# Thermostat operating modes (Plejd OperatingMode enum) -> HA presets.
TRM_MODE_VACATION = 2
TRM_MODE_BOOST = 3
TRM_MODE_FROST_PROTECTION = 4
TRM_MODE_NIGHT_REDUCTION = 5
TRM_MODE_DAY_REDUCTION = 6
TRM_MODE_NORMAL = 7
TRM_PRESETS = {
    TRM_MODE_NORMAL: "none",
    TRM_MODE_BOOST: "boost",
    TRM_MODE_FROST_PROTECTION: "frost",
    TRM_MODE_NIGHT_REDUCTION: "night",
    TRM_MODE_DAY_REDUCTION: "day",
    TRM_MODE_VACATION: "vacation",
}

# ── Cloud (Parse Server) — production constants, app-level (not user secrets) ──
PLEJD_PARSE_URL = "https://cloud.plejd.com/parse/"
PLEJD_PARSE_APP_ID = "zHtVqXt8k4yFyk2QGmgp48D9xZr2G94xWYnF4dak"
PLEJD_PARSE_LOGIN = "login"  # POST {username, password} -> {sessionToken}
PLEJD_FN_SITE_LIST = "functions/getSiteList"  # -> [{siteId, ...}]
PLEJD_FN_SITE_BY_ID = "functions/getSiteById"  # {siteId} -> site w/ cryptoKey + devices

# ── Device types (Plejd.Shared HardwareType enum: id -> product name) ──
HARDWARE_TYPES: dict[int, str] = {
    0: "Unknown",
    1: "DIM-01",
    2: "DIM-02",
    3: "CTR-01",
    4: "GWY-01",
    5: "LED-10",
    6: "WPH-01",
    7: "CCL-01",
    8: "SPR-01",
    9: "DWN-01-LC",
    10: "WRT-01",
    11: "DIM-01-2P",
    12: "DAL-01",
    13: "DEV-01",
    14: "DIM-01-LC",
    15: "DIM-02-LC",
    16: "JAL-01",
    17: "REL-01-2P",
    18: "REL-02",
    19: "EXT-01",
    22: "DIM-01-LC2",
    23: "LED-10-V2",
    24: "DIM-02-LC2",
    25: "DIM-01-2P-LC2",
    36: "LED-75",
    38: "WPH-01-LC",
    39: "PLF-02",
    40: "SPD-01",
    41: "DWN-02-LC",
    42: "WRT-01-LC",
    70: "WMS-01",
    71: "LPN-01",
    100: "TRM-01",
    102: "WIN-01",
    103: "OUT-01",
    105: "TRL-01",
    135: "OUT-02",
    164: "FAK-01",
    167: "DWN-01",
    196: "MTR-01",
    199: "DWN-02",
    228: "LED-75-V2",
}

# Per-output capability bitmask (Plejd.Shared DeviceTrait [Flags]).
TRAIT_POWERABLE = 0x01
TRAIT_DIMMABLE = 0x02
TRAIT_WHITE_TUNABLE = 0x04
TRAIT_GROUPABLE = 0x08
TRAIT_COVERABLE = 0x10
TRAIT_CLIMATE = 0x20
TRAIT_COVER_TILTABLE = 0x40

# Cloud per-output classification (DeviceInfo.OutputType) — the best HA-platform hint.
OUTPUT_TYPE_UNKNOWN = 0
OUTPUT_TYPE_LIGHT = 1
OUTPUT_TYPE_RELAY = 2
OUTPUT_TYPE_COVERABLE = 3
OUTPUT_TYPE_THERMOSTAT = 4

# Internal device categories (NOT HA platform names) → HA platform mapping:
#   light/switch/cover/climate map 1:1; motion/contact → binary_sensor;
#   button → event; none → device-only (no entity).
# This is the default by hardware type when cloud OutputType/traits are absent;
# refine with the per-output OutputType + Dimmable trait (see model/docs).
CATEGORY_LIGHT = "light"
CATEGORY_SWITCH = "switch"
CATEGORY_COVER = "cover"
CATEGORY_CLIMATE = "climate"
CATEGORY_MOTION = "motion"  # → binary_sensor (motion)
CATEGORY_CONTACT = "contact"  # → binary_sensor (opening)
CATEGORY_BUTTON = "button"  # → event
CATEGORY_NONE = "none"  # gateway/aux — no entity

DEFAULT_CATEGORY: dict[int, str] = {
    1: CATEGORY_LIGHT,
    2: CATEGORY_LIGHT,
    3: CATEGORY_LIGHT,
    5: CATEGORY_LIGHT,
    7: CATEGORY_LIGHT,
    9: CATEGORY_LIGHT,
    11: CATEGORY_LIGHT,
    12: CATEGORY_LIGHT,
    14: CATEGORY_LIGHT,
    15: CATEGORY_LIGHT,
    22: CATEGORY_LIGHT,
    23: CATEGORY_LIGHT,
    24: CATEGORY_LIGHT,
    25: CATEGORY_LIGHT,
    36: CATEGORY_LIGHT,
    39: CATEGORY_LIGHT,
    40: CATEGORY_LIGHT,
    41: CATEGORY_LIGHT,
    71: CATEGORY_LIGHT,
    103: CATEGORY_LIGHT,
    105: CATEGORY_LIGHT,
    135: CATEGORY_LIGHT,
    167: CATEGORY_LIGHT,
    199: CATEGORY_LIGHT,
    228: CATEGORY_LIGHT,
    8: CATEGORY_SWITCH,
    17: CATEGORY_SWITCH,
    18: CATEGORY_SWITCH,
    16: CATEGORY_COVER,
    196: CATEGORY_COVER,
    100: CATEGORY_CLIMATE,
    70: CATEGORY_MOTION,
    102: CATEGORY_CONTACT,
    6: CATEGORY_BUTTON,
    38: CATEGORY_BUTTON,
    10: CATEGORY_BUTTON,
    42: CATEGORY_BUTTON,
    4: CATEGORY_NONE,
    13: CATEGORY_NONE,
    19: CATEGORY_NONE,
    164: CATEGORY_NONE,
}

# Device fault flags reported by CMD_NOTIFY_EVENTS (NotifyEvents [Flags] u64).
NOTIFY_EVENT_FLAGS: dict[int, str] = {
    0x1: "hard_fault",
    0x2: "soft_overcurrent",
    0x4: "heavy_overcurrent",
    0x8: "overtemperature",
    0x10: "faceplate_detect_fail",
    0x20: "reset_watchdog",
    0x40: "reset_cpu_lock",
    0x80: "reset_pin",
    0x100: "reset_soft",
    0x200: "settings_driver",
    0x400: "low_power_wdt",
    0x800: "temperature_throttling",
    0x1000: "factory_reset_mesh_kept",
    0x2000: "boot_single_faulty_bank",
    0x4000: "overloaded",
    0x8000: "wrong_zcd",
    0x10000: "uart_error",
    0x20000: "dont_dim",
    0x40000: "adv_timeout",
    0x80000: "product_hw_fault_a",
    0x100000: "product_hw_fault_b",
    0x200000: "group_setting_fault",
}
