"""Plejd BLE commissioning — provision an unprovisioned device into the mesh.

Sequence (from app Setup()):
  1. Cloud: createPlejdDevice_V2 — registers the device and returns the node index
  2. SetCryptoKey — DH key exchange; delivers the site key to the new device
  3. VerifyLogin — PingPong sanity check that the device accepted the key
  4. SetAccessAddress — writes the mesh access address (site meshKey)
  5. ReplaceLastMeshCommand × 2 — clears any stale command for this node address
  6. SetNodeIndex — assigns the mesh node index; device joins the mesh

All BLE operations connect directly with bleak — no prior mesh auth is needed
for an unprovisioned device.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict

from aiohttp import ClientSession
from bleak.backends.device import BLEDevice
from bleak_retry_connector import BleakClientWithServiceCache, establish_connection
from homeassistant.components import bluetooth
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_EMAIL, CONF_PASSWORD
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .cloud import (
    NewDeviceAddresses,
    NewDeviceInfo,
    PlejdCloudError,
    PlejdCloudSite,
    async_create_device,
    async_create_room,
    async_get_site,
    async_login,
    async_set_input_setting,
)
from .connection import reversed_mac
from .const import (
    CONF_DEVICES,
    CONF_INPUTS,
    CONF_MOTION,
    CONF_SCENES,
    CONF_SITE_ID,
    PLEJD_CHAR_ACCESS_ADDRESS_UUID,
    PLEJD_CHAR_CRYPTO_KEY_UUID,
    PLEJD_CHAR_DATA_UUID,
    PLEJD_CHAR_NODE_INDEX_UUID,
    PLEJD_CHAR_PING_UUID,
)
from .crypto import dh_encrypt_site_key, dh_generate_keypair, dh_shared_secret
from .discovery import _parse_plejd_mfr_data
from .mesh import PlejdMesh
from .protocol import (
    access_address_bytes,
    node_index_bytes,
    public_key_bytes,
)
from .protocol import (
    replace_last_mesh_command as _build_replace_vector,
)

_LOGGER = logging.getLogger(__name__)

# Delays between commissioning steps (mirrors the app's Task.Delay calls).
_STEP_DELAY = 0.5
# How many times to poll for the device's DH public key before giving up.
_DH_KEY_RETRIES = 5
# Pause between DH key polls (device may need a moment to populate the char).
_DH_KEY_POLL_DELAY = 0.2
# Gap between the two ReplaceLastMeshCommand writes (app uses 100 ms).
_REPLACE_CMD_GAP = 0.1


class PlejdCommissioningSession:
    """GATT session for commissioning a single unprovisioned Plejd device."""

    def __init__(self, site_key: bytes) -> None:
        self._key = site_key
        self._client: BleakClientWithServiceCache | None = None
        self._mesh: PlejdMesh | None = None

    async def connect(self, device: BLEDevice) -> None:
        """Connect to the device — no mesh auth needed for unprovisioned devices."""
        self._client = await establish_connection(BleakClientWithServiceCache, device, device.address)
        self._mesh = PlejdMesh(self._key, reversed_mac(device.address))

    async def set_crypto_key(self) -> bool:
        """Deliver the site key to the device via Diffie-Hellman exchange.

        Returns False if the device does not supply a valid public key within retries.
        """
        client = self._client
        if client is None:
            raise RuntimeError("not connected")

        # The device pre-populates CryptoKeyID with its public key; poll until non-zero.
        device_pk_bytes: bytes | None = None
        for _ in range(_DH_KEY_RETRIES):
            raw = bytes(await client.read_gatt_char(PLEJD_CHAR_CRYPTO_KEY_UUID))
            if len(raw) == 8 and max(raw) != 0:
                device_pk_bytes = raw
                break
            await asyncio.sleep(_DH_KEY_POLL_DELAY)
        if device_pk_bytes is None:
            return False

        private_key, public_key = dh_generate_keypair()
        await client.write_gatt_char(PLEJD_CHAR_CRYPTO_KEY_UUID, public_key_bytes(public_key), response=False)

        remote_pk = int.from_bytes(device_pk_bytes, "little")
        shared_secret = dh_shared_secret(private_key, remote_pk)
        encrypted_key = dh_encrypt_site_key(self._key, shared_secret)
        await client.write_gatt_char(PLEJD_CHAR_CRYPTO_KEY_UUID, encrypted_key, response=False)
        return True

    async def verify_login(self) -> bool:
        """Confirm the device accepted the new key: write N, expect N+1 back."""
        client = self._client
        if client is None:
            raise RuntimeError("not connected")
        ping = 0x01
        await client.write_gatt_char(PLEJD_CHAR_PING_UUID, bytes([ping]), response=False)
        response = bytes(await client.read_gatt_char(PLEJD_CHAR_PING_UUID))
        return len(response) >= 1 and response[0] == (ping + 1) & 0xFF

    async def set_access_address(self, mesh_key: str) -> None:
        """Write the mesh access address from the site meshKey to the device."""
        client = self._client
        if client is None:
            raise RuntimeError("not connected")
        await client.write_gatt_char(PLEJD_CHAR_ACCESS_ADDRESS_UUID, access_address_bytes(mesh_key), response=False)

    async def send_replace_last_mesh_command(self, node_index: int) -> None:
        """Send GetDeviceTypeNumber to the mesh twice (100 ms apart) for this node."""
        client = self._client
        mesh = self._mesh
        if client is None or mesh is None:
            raise RuntimeError("not connected")
        encrypted = mesh.encrypt(_build_replace_vector(node_index))
        await client.write_gatt_char(PLEJD_CHAR_DATA_UUID, encrypted, response=False)
        await asyncio.sleep(_REPLACE_CMD_GAP)
        await client.write_gatt_char(PLEJD_CHAR_DATA_UUID, encrypted, response=False)

    async def set_node_index(self, node_index: int) -> bool:
        """Write the node index and verify it was latched (3 retries)."""
        client = self._client
        if client is None:
            raise RuntimeError("not connected")
        payload = node_index_bytes(node_index)
        for _ in range(3):
            await client.write_gatt_char(PLEJD_CHAR_NODE_INDEX_UUID, payload, response=True)
            response = bytes(await client.read_gatt_char(PLEJD_CHAR_NODE_INDEX_UUID))
            if response and response[0] == node_index & 0xFF:
                return True
        return False

    async def disconnect(self) -> None:
        """Disconnect and clean up."""
        if self._client is not None:
            await self._client.disconnect()
            self._client = None
            self._mesh = None


async def async_commission_device(
    http_session: ClientSession,
    token: str,
    site: PlejdCloudSite,
    ble_device: BLEDevice,
    name: str,
    hardware_id: str = "0",
    firmware_build_time: int = 0,
    room_id: str | None = None,
) -> NewDeviceAddresses:
    """Commission a new unprovisioned device into the Plejd site.

    Registers in the cloud first to obtain the node index, then runs the full
    BLE commissioning sequence. The caller must reload the config entry afterwards
    so HA discovers the new device.
    """
    device_id = ble_device.address.replace(":", "").lower()
    device_infos = [NewDeviceInfo(title=name, output_index=0, room_id=room_id)]

    _LOGGER.debug("commissioning: registering device %s in cloud", device_id)
    addresses = await async_create_device(
        http_session,
        token,
        site.site_id,
        device_id,
        hardware_id,
        firmware_build_time,
        device_infos=device_infos,
        faceplate_id="0",
    )

    node_index = addresses.device_address
    if node_index is None:
        raise RuntimeError("cloud did not return a node address for the new device")
    if not site.mesh_key:
        raise RuntimeError("site has no mesh key (meshKey); cannot set the device's access address")

    _LOGGER.debug("commissioning: node index %d, starting BLE setup", node_index)
    session = PlejdCommissioningSession(site.crypto_key)
    try:
        await session.connect(ble_device)

        if not await session.set_crypto_key():
            raise RuntimeError("could not exchange crypto key with device")
        await asyncio.sleep(_STEP_DELAY)

        if not await session.verify_login():
            raise RuntimeError("device rejected the new crypto key")
        await asyncio.sleep(_STEP_DELAY)

        await session.set_access_address(site.mesh_key)
        await asyncio.sleep(_STEP_DELAY)

        await session.send_replace_last_mesh_command(node_index)
        await asyncio.sleep(_STEP_DELAY)

        if not await session.set_node_index(node_index):
            raise RuntimeError("device did not confirm node index assignment")
        await asyncio.sleep(_STEP_DELAY)
    finally:
        await session.disconnect()

    _LOGGER.debug("commissioning: %s successfully joined mesh at node %d", device_id, node_index)
    return addresses


async def async_add_device(
    hass: HomeAssistant,
    entry: ConfigEntry,
    *,
    address: str,
    name: str,
    hardware_id: str = "0",
    room_id: str | None = None,
    room_title: str | None = None,
    firmware_build_time: int = 0,
    input_settings: list[dict] | None = None,
) -> None:
    """Add a new Plejd device end-to-end: cloud registration, BLE commissioning,
    input-button config, then refresh + reload the config entry.

    Shared by the add_device service and the "Add a device" options-flow wizard.
    """
    # Validate the device is actually in range before touching the cloud, so a
    # typo'd address fails fast instead of creating an orphaned cloud room first.
    ble_device = bluetooth.async_ble_device_from_address(hass, address, connectable=True)
    if ble_device is None:
        raise HomeAssistantError(f"Plejd device {address} not found in Bluetooth range")

    # Auto-fill hardware_id and firmware_build_time from the BLE advertisement when not provided.
    if hardware_id == "0" or firmware_build_time == 0:
        service_infos = bluetooth.async_discovered_service_info(hass, connectable=True)
        adv = next((si for si in service_infos if si.address == address), None)
        if adv:
            parsed_adv = _parse_plejd_mfr_data(adv.manufacturer_data or {})
            if parsed_adv:
                if hardware_id == "0":
                    hardware_id = str(parsed_adv["hardware_id"])
                if firmware_build_time == 0:
                    firmware_build_time = parsed_adv["firmware_build_time"]

    http_session = async_get_clientsession(hass)
    try:
        token = await async_login(http_session, entry.data[CONF_EMAIL], entry.data[CONF_PASSWORD])
        site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
        if room_title and not room_id:
            room_id = await async_create_room(http_session, token, site.site_id, room_title)
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error during device add: {err}") from err

    device_id = address.replace(":", "").lower()
    try:
        await async_commission_device(
            http_session, token, site, ble_device, name, hardware_id, firmware_build_time, room_id
        )
        for cfg in input_settings or []:
            await async_set_input_setting(
                http_session, token, site.site_id, device_id, cfg["input"], cfg["button_type"]
            )
    except Exception as err:
        raise HomeAssistantError(f"Plejd commissioning failed: {err}") from err

    # Refresh device list from cloud so the new device is present on reload.
    try:
        fresh_site = await async_get_site(http_session, token, entry.data[CONF_SITE_ID])
    except PlejdCloudError as err:
        raise HomeAssistantError(f"Plejd cloud error refreshing device list: {err}") from err
    hass.config_entries.async_update_entry(
        entry,
        data={
            **entry.data,
            CONF_DEVICES: [asdict(d) for d in fresh_site.devices],
            CONF_INPUTS: [asdict(i) for i in fresh_site.inputs],
            CONF_MOTION: [asdict(m) for m in fresh_site.motion],
            CONF_SCENES: [asdict(s) for s in fresh_site.scenes],
        },
    )
    await hass.config_entries.async_reload(entry.entry_id)
