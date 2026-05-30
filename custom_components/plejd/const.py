"""Constants for the Plejd integration."""

from __future__ import annotations

DOMAIN = "plejd"

# BLE address of the mesh device discovered during the config flow.
CONF_DISCOVERED_ADDRESS = "discovered_address"

# BLE GATT layout — starting values to confirm against our own capture.
# NOTE: confirm these UUIDs from a btsnoop capture before relying on them (#3).
PLEJD_SERVICE_UUID = "31ba0001-6085-4726-be45-040c957391b5"
PLEJD_CHAR_DATA_UUID = "31ba0004-6085-4726-be45-040c957391b5"
PLEJD_CHAR_LAST_DATA_UUID = "31ba0005-6085-4726-be45-040c957391b5"
PLEJD_CHAR_AUTH_UUID = "31ba0009-6085-4726-be45-040c957391b5"
PLEJD_CHAR_PING_UUID = "31ba000a-6085-4726-be45-040c957391b5"
PLEJD_CHAR_LIGHT_LEVEL_UUID = "31ba0003-6085-4726-be45-040c957391b5"
