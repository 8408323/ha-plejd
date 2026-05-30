"""Constants for the Plejd integration.

Protocol facts here were reverse-engineered from our own analysis of the Plejd
Android app (.NET MAUI, assembly `Plejd.dll` / `Plejd.Shared`). See
docs/reverse_engineering.md for the full decode.
"""

from __future__ import annotations

DOMAIN = "plejd"

# BLE address of the mesh device discovered during the config flow.
CONF_DISCOVERED_ADDRESS = "discovered_address"

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
CMD_SCENE = 0x0021  # execute scene
CMD_INPUT_STATE_AND_LEVEL = 0x0195  # state notification: channel, state, level[2]
CMD_SYSTEM_TIME = 0x001B
CMD_DEVICE_TYPE = 0x0000
CMD_DEVICE_MAC = 0x0003
CMD_DEVICE_FW_VERSION = 0x0004
