"""Plejd cloud (Parse Server) client.

Logs in and fetches a site's crypto key + device list, decoded from the app's
`ParseClient` / `ImportSiteAsync`. Login is plain Parse (`/login`); the site comes
from the `getSiteById` cloud function. The JSON shape matches the app's
deserializers; the multi-output address mapping is worth confirming on a live
capture (#2). See docs/protocol.md.
"""

from __future__ import annotations

from dataclasses import dataclass

from aiohttp import ClientSession

from .const import (
    CATEGORY_LIGHT,
    CATEGORY_NONE,
    DEFAULT_CATEGORY,
    HARDWARE_TYPES,
    PLEJD_FN_SITE_BY_ID,
    PLEJD_FN_SITE_LIST,
    PLEJD_PARSE_APP_ID,
    PLEJD_PARSE_LOGIN,
    PLEJD_PARSE_URL,
    TRAIT_DIMMABLE,
)

_OUTPUT_TYPE_CATEGORY = {
    "Light": "light",
    "Relay": "switch",
    "Coverable": "cover",
    "Thermostat": "climate",
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
    outputs: list[int]
    hardware_id: int
    model: str
    category: str
    dimmable: bool
    traits: int
    room_id: str | None


@dataclass
class PlejdCloudSite:
    """A site: its crypto key and devices."""

    site_id: str
    title: str
    crypto_key: bytes
    devices: list[PlejdCloudDevice]


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
    crypto_key = bytes.fromhex(key_hex)

    device_address = site.get("deviceAddress") or {}
    output_address = site.get("outputAddress") or {}
    hardware_by_id = {d.get("deviceId"): d for d in site.get("plejdDevices") or []}

    devices: list[PlejdCloudDevice] = []
    for info in site.get("devices") or []:
        device_id = info.get("deviceId")
        if device_id is None:
            continue
        hardware = hardware_by_id.get(device_id, {})
        hardware_id = int(hardware.get("hardwareId") or 0)
        model = HARDWARE_TYPES.get(hardware_id, "Unknown")
        output_type = info.get("outputType") or "Unknown"
        category = _OUTPUT_TYPE_CATEGORY.get(output_type) or DEFAULT_CATEGORY.get(hardware_id, CATEGORY_NONE)
        outputs = [int(a) for a in (output_address.get(device_id) or {}).values()]
        address = device_address.get(device_id)
        # Prefer the per-output Dimmable trait; fall back to category when the cloud
        # omits traits (a light-category output can still be on/off only).
        traits = int(info.get("traits") or 0)
        dimmable = bool(traits & TRAIT_DIMMABLE) if "traits" in info else category == CATEGORY_LIGHT
        devices.append(
            PlejdCloudDevice(
                device_id=device_id,
                name=info.get("title") or model,
                address=int(address) if address is not None else None,
                outputs=outputs,
                hardware_id=hardware_id,
                model=model,
                category=category,
                dimmable=dimmable,
                traits=traits,
                room_id=info.get("roomId"),
            )
        )

    return PlejdCloudSite(
        site_id=site.get("siteId") or "",
        title=site.get("title") or "Plejd",
        crypto_key=crypto_key,
        devices=devices,
    )
