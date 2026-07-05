"""Plejd cloud (Parse Server) client.

Logs in and fetches a site's crypto key + device list, decoded from the app's
`ParseClient` / `ImportSiteAsync`. Login is plain Parse (`/login`); the site comes
from the `getSiteById` cloud function. The JSON shape matches the app's
deserializers; the multi-output address mapping is worth confirming on a live
capture (#2). See docs/protocol.md.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from aiohttp import ClientSession

from .const import (
    CATEGORY_LIGHT,
    CATEGORY_NONE,
    DEFAULT_CATEGORY,
    HARDWARE_TYPES,
    HARDWARE_WMS_01,
    PLEJD_FN_FIRMWARE_BY_HW,
    PLEJD_FN_SITE_BY_ID,
    PLEJD_FN_SITE_LIST,
    PLEJD_FN_UPDATE_DEVICE,
    PLEJD_PARSE_APP_ID,
    PLEJD_PARSE_LOGIN,
    PLEJD_PARSE_URL,
    TRAIT_DIMMABLE,
)

# Cloud outputType values are UPPERCASE (validated against the real API).
_OUTPUT_TYPE_CATEGORY = {
    "LIGHT": "light",
    "RELAY": "switch",
    "COVERABLE": "cover",
    "THERMOSTAT": "climate",
}


class PlejdCloudError(Exception):
    """A Plejd cloud request failed."""


class PlejdAuthError(PlejdCloudError):
    """Login was rejected (bad credentials)."""


@dataclass
class PlejdCloudDevice:
    """One controllable output from the site, mapped toward an HA entity."""

    device_id: str
    name: str
    address: int | None
    output_index: int
    outputs: list[int]
    hardware_id: int
    model: str
    category: str
    dimmable: bool
    traits: int
    room_id: str | None
    object_id: str | None = None  # the output's Parse objectId (deviceParseId), needed to rename it


@dataclass
class PlejdDeviceFirmware:
    """The installed firmware of one physical device, keyed for an update lookup."""

    version: str | None  # e.g. "6.43.3"
    build_time: int | None  # e.g. 20260324155701; monotonic, used to compare builds
    hardware_id: int
    faceplate_id: str | None


@dataclass
class PlejdCloudInput:
    """A button input (fires press/release events)."""

    device_id: str
    name: str
    address: int


@dataclass
class PlejdCloudMotion:
    """A motion sensor (WMS-01): broadcasts motion + ambient light."""

    device_id: str
    name: str
    address: int


@dataclass
class PlejdCloudScene:
    """A Plejd scene: name + its mesh index (triggered as a broadcast)."""

    scene_id: str
    name: str
    index: int


@dataclass
class PlejdCloudSite:
    """A site: its crypto key, devices, scenes, and any gateway."""

    site_id: str
    title: str
    crypto_key: bytes
    devices: list[PlejdCloudDevice]
    inputs: list[PlejdCloudInput]
    motion: list[PlejdCloudMotion]
    scenes: list[PlejdCloudScene]
    gateways: list[str]  # gateway (GWY-01) device ids; empty if none
    resource_set_id: str | None  # for the remote-control WebSocket (Resource-Set-ID)
    # every physical device's installed firmware (outputs, sensors, gateway)
    firmware_by_device: dict[str, PlejdDeviceFirmware] = field(default_factory=dict)
    # every physical device's own mesh address (outputs, sensors, gateway) — distinct from
    # an output's address; this is what NotifyEvents/fault polling must target.
    device_addresses: dict[str, int] = field(default_factory=dict)


def _headers(token: str | None = None) -> dict[str, str]:
    headers = {"X-Parse-Application-Id": PLEJD_PARSE_APP_ID, "Content-Type": "application/json"}
    if token is not None:
        headers["X-Parse-Session-Token"] = token
    return headers


async def async_login(session: ClientSession, email: str, password: str) -> str:
    """Log in to the Plejd cloud and return a Parse session token."""
    async with session.post(
        PLEJD_PARSE_URL + PLEJD_PARSE_LOGIN,
        headers=_headers(),
        json={"username": email.lower(), "password": password},
    ) as resp:
        data = await resp.json()
        token = data.get("sessionToken") if isinstance(data, dict) else None
        if resp.status != 200 or not token:
            raise PlejdAuthError(str(data.get("error", "login failed")) if isinstance(data, dict) else "login failed")
        return token


async def _call_function(session: ClientSession, token: str, function: str, body: dict) -> object:
    async with session.post(PLEJD_PARSE_URL + function, headers=_headers(token), json=body) as resp:
        data = await resp.json()
        if resp.status != 200:
            raise PlejdCloudError(str(data.get("error", f"{function} failed")) if isinstance(data, dict) else function)
        return data.get("result")


async def async_get_sites(session: ClientSession, token: str) -> list[dict]:
    """List the user's sites (each with a `siteId` and `title`)."""
    result = await _call_function(session, token, PLEJD_FN_SITE_LIST, {})
    return result if isinstance(result, list) else []


def _as_build_time(value: object) -> int | None:
    """A firmware buildTime (e.g. 20260324155701) as int, or None if absent/garbage."""
    if isinstance(value, bool) or value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


async def async_get_available_firmware(
    session: ClientSession, token: str, hardware_id: int, faceplate_id: str | None
) -> tuple[str, int] | None:
    """Latest published firmware (version, buildTime) for a hardware/faceplate, or None when up to date."""
    body: dict[str, str] = {"hardwareId": str(hardware_id)}
    if faceplate_id is not None:
        body["faceplateId"] = faceplate_id
    result = await _call_function(session, token, PLEJD_FN_FIRMWARE_BY_HW, body)
    best: tuple[str, int] | None = None
    for item in result if isinstance(result, list) else []:
        if not isinstance(item, dict):
            continue
        version = item.get("version")
        build_time = _as_build_time(item.get("buildTime"))
        if not isinstance(version, str) or build_time is None:
            continue
        if best is None or build_time > best[1]:
            best = (version, build_time)
    return best


async def async_set_device_title(
    session: ClientSession, token: str, site_id: str, device_id: str, device_parse_id: str, title: str
) -> bool:
    """Rename a device in the Plejd cloud (mirrors to the Plejd app). Returns the cloud's ok flag."""
    body = {"siteId": site_id, "deviceId": device_id, "deviceParseId": device_parse_id, "title": title}
    result = await _call_function(session, token, PLEJD_FN_UPDATE_DEVICE, body)
    return result is True


async def async_get_site(session: ClientSession, token: str, site_id: str) -> PlejdCloudSite:
    """Fetch one site (crypto key + devices) by id."""
    result = await _call_function(session, token, PLEJD_FN_SITE_BY_ID, {"siteId": site_id})
    if isinstance(result, list):
        if not result:
            raise PlejdCloudError("site not found")
        result = result[0]
    if not isinstance(result, dict):
        raise PlejdCloudError("malformed site response")
    return parse_site(result)


def parse_site(site: dict) -> PlejdCloudSite:
    """Parse a getSiteById result into a PlejdCloudSite."""
    mesh = site.get("plejdMesh") or {}
    key_hex = mesh.get("cryptoKey")
    if not key_hex:
        raise PlejdCloudError("site has no cryptoKey")
    # cryptoKey is dash-separated hex ("XX-XX-..", 16 bytes) — validated against the API.
    crypto_key = bytes.fromhex(key_hex.replace("-", ""))

    device_address = site.get("deviceAddress") or {}
    output_address = site.get("outputAddress") or {}
    hardware_by_id = {d.get("deviceId"): d for d in site.get("plejdDevices") or []}

    devices: list[PlejdCloudDevice] = []
    seen_outputs: dict[str, int] = {}  # deviceId -> next output index (devices[] is one entry per output)
    for info in site.get("devices") or []:
        device_id = info.get("deviceId")
        if device_id is None:
            continue
        output_index = seen_outputs.get(device_id, 0)
        seen_outputs[device_id] = output_index + 1
        hardware = hardware_by_id.get(device_id, {})
        hardware_id = int(hardware.get("hardwareId") or 0)
        model = HARDWARE_TYPES.get(hardware_id, "Unknown")
        output_type = (info.get("outputType") or "UNKNOWN").upper()
        category = _OUTPUT_TYPE_CATEGORY.get(output_type) or DEFAULT_CATEGORY.get(hardware_id, CATEGORY_NONE)
        out_map = output_address.get(device_id) or {}
        outputs = [int(a) for a in out_map.values()]
        # Control targets the output's own mesh address; fall back to the device address.
        address = out_map.get(str(output_index), device_address.get(device_id))
        # Prefer the per-output Dimmable trait; fall back to category when the cloud
        # omits traits (a light-category output can still be on/off only).
        traits = int(info.get("traits") or 0)
        dimmable = bool(traits & TRAIT_DIMMABLE) if "traits" in info else category == CATEGORY_LIGHT
        devices.append(
            PlejdCloudDevice(
                device_id=device_id,
                name=info.get("title") or model,
                address=int(address) if address is not None else None,
                output_index=output_index,
                outputs=outputs,
                hardware_id=hardware_id,
                model=model,
                category=category,
                dimmable=dimmable,
                traits=traits,
                room_id=info.get("roomId"),
                object_id=info.get("objectId"),
            )
        )

    input_address = site.get("inputAddress") or {}
    name_by_device = {info.get("deviceId"): info.get("title") for info in site.get("devices") or []}
    inputs: list[PlejdCloudInput] = []
    seen_addr: set[int] = set()
    for device_id, idx_map in input_address.items():
        for addr in (idx_map or {}).values():
            address = int(addr)
            if address in seen_addr:
                continue
            seen_addr.add(address)
            inputs.append(
                PlejdCloudInput(device_id=device_id, name=name_by_device.get(device_id) or "Button", address=address)
            )

    motion: list[PlejdCloudMotion] = []
    for phys in site.get("plejdDevices") or []:
        if int(phys.get("hardwareId") or 0) == HARDWARE_WMS_01:
            device_id = phys.get("deviceId")
            addr = device_address.get(device_id)
            if addr is not None:
                motion.append(PlejdCloudMotion(device_id=device_id, name="Motion sensor", address=int(addr)))

    # Installed firmware for every physical device (outputs, sensors, gateway alike),
    # so the update platform can cover them all — not just controllable outputs.
    # Gateways live in gateways[], not plejdDevices, and carry the firmware dict under
    # `firmwareObject` (their `firmware` is a bare buildTime int), so prefer that.
    firmware_by_device: dict[str, PlejdDeviceFirmware] = {}
    for phys in (site.get("plejdDevices") or []) + (site.get("gateways") or []):
        device_id = phys.get("deviceId")
        if device_id is None:
            continue
        firmware = next((v for v in (phys.get("firmwareObject"), phys.get("firmware")) if isinstance(v, dict)), {})
        faceplate = phys.get("faceplateId")
        firmware_by_device[device_id] = PlejdDeviceFirmware(
            version=firmware.get("version") if isinstance(firmware.get("version"), str) else None,
            build_time=_as_build_time(firmware.get("buildTime")),
            hardware_id=int(phys.get("hardwareId") or 0),
            faceplate_id=str(faceplate) if faceplate is not None else None,
        )

    scene_index = site.get("sceneIndex") or {}
    scenes = [
        PlejdCloudScene(scene_id=sc["sceneId"], name=sc.get("title") or sc["sceneId"], index=int(idx))
        for sc in site.get("scenes") or []
        if (idx := scene_index.get(sc.get("sceneId"))) is not None
    ]

    # A gateway (GWY-01) has no controllable output, so it is absent from devices[];
    # it lives only in gateways[]. Its resourceSetId authorises the remote WebSocket.
    gateway_objs = site.get("gateways") or []
    gateways = [g["deviceId"] for g in gateway_objs if g.get("deviceId")]
    # The gateway's own resourceSetId is authoritative. Only fall back to a site
    # resourceSet when there's exactly one (otherwise we can't tell which grants access).
    resource_sets = site.get("resourceSets") or []
    resource_set_id = next((g.get("resourceSetId") for g in gateway_objs if g.get("resourceSetId")), None)
    if resource_set_id is None and len(resource_sets) == 1:
        resource_set_id = resource_sets[0].get("objectId")

    meta = site.get("site") or site  # id/title are nested under "site" in the real payload
    device_addresses: dict[str, int] = {}
    for device_id, addr in device_address.items():
        try:
            device_addresses[device_id] = int(addr)
        except (TypeError, ValueError):
            continue

    return PlejdCloudSite(
        site_id=meta.get("siteId") or "",
        title=meta.get("title") or "Plejd",
        crypto_key=crypto_key,
        devices=devices,
        inputs=inputs,
        motion=motion,
        scenes=scenes,
        gateways=gateways,
        resource_set_id=resource_set_id,
        firmware_by_device=firmware_by_device,
        device_addresses=device_addresses,
    )
