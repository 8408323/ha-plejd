"""Read-only probe of the Plejd firmware wire shapes (for the update entity).

Logs in (Parse), then inspects two things WITHOUT changing anything on a device:
  1. getSiteById  -> the per-device `firmware` sub-object (installed version)
  2. checkForFirmwareUpdate {devices:[...]} -> latest available firmware per device

Prints only structure + version/buildTime/hardwareId; device ids are masked, names
and asset URLs are redacted. Confirms the keys before we bake them into cloud.py.
Run: uv run python tools/firmware_probe.py
"""

from __future__ import annotations

import asyncio
import importlib
import sys
import types
from pathlib import Path

_PLEJD_DIR = Path(__file__).resolve().parent.parent / "custom_components" / "plejd"
_pkg = types.ModuleType("plejd")
_pkg.__path__ = [str(_PLEJD_DIR)]
sys.modules["plejd"] = _pkg
const = importlib.import_module("plejd.const")
cloud = importlib.import_module("plejd.cloud")


def _mask(v: object) -> str:
    s = str(v)
    return s if len(s) <= 8 else f"{s[:4]}…{s[-4:]}"


def _shape(obj: object) -> str:
    """Key->type sketch of a dict, without leaking values."""
    if isinstance(obj, dict):
        return "{" + ", ".join(f"{k}:{type(v).__name__}" for k, v in obj.items()) + "}"
    return type(obj).__name__


def _load_env(path: Path) -> tuple[str, str]:
    user = pwd = None
    for line in path.read_text().splitlines():
        if line.startswith("PLEJD_USER="):
            user = line.split("=", 1)[1].strip()
        elif line.startswith("PLEJD_PASS="):
            pwd = line.split("=", 1)[1].strip()
    if not user or not pwd:
        raise SystemExit("PLEJD_USER / PLEJD_PASS missing")
    return user, pwd


async def main() -> int:
    import aiohttp

    print("== Plejd firmware wire probe (read-only) ==\n")
    email, password = _load_env(_PLEJD_DIR.parent.parent / "tools" / ".env")

    async with aiohttp.ClientSession() as session:
        print("[1/3] Parse login + pick a site")
        token = await cloud.async_login(session, email, password)
        sites = await cloud.async_get_sites(session, token)
        if not sites:
            print("      no sites on this account")
            return 1
        site_id = (sites[0].get("site") or sites[0])["siteId"]
        raw = await cloud._call_function(session, token, const.PLEJD_FN_SITE_BY_ID, {"siteId": site_id})
        raw_site = raw[0] if isinstance(raw, list) else raw

        print("\n[2/3] getSiteById -> per-device `firmware` (installed)")
        phys = raw_site.get("plejdDevices") or []
        device_ids: list[str] = []
        for d in phys:
            device_id = d.get("deviceId")
            if device_id is not None:
                device_ids.append(device_id)
            fw = d.get("firmware")
            fw_desc = _shape(fw)
            ver = bt = None
            if isinstance(fw, dict):
                ver = fw.get("version")
                bt = fw.get("buildTime") or fw.get("notificationId")
            print(
                f"      dev {_mask(device_id)} hw={d.get('hardwareId')} firmware={fw_desc} version={ver} buildTime={bt}"
            )

        hw_face: dict[tuple, int] = {}
        for d in phys:
            key = (str(d.get("hardwareId")), str(d.get("faceplateId")))
            hw_face[key] = hw_face.get(key, 0) + 1

        print("\n[3/3] getFirmwaresByHardwareId per (hardwareId, faceplateId) -> available")
        print("      (empty list = device is on the latest published firmware)")
        for (hw, face), count in hw_face.items():
            try:
                val = await cloud._call_function(
                    session, token, "functions/getFirmwaresByHardwareId", {"hardwareId": hw, "faceplateId": face}
                )
            except cloud.PlejdCloudError as err:
                print(f"      hw={hw} face={_mask(face)} n={count} -> ERROR {err}")
                continue
            items = val if isinstance(val, list) else [val]
            offered = [(it.get("version"), it.get("buildTime")) for it in items if isinstance(it, dict)]
            print(f"      hw={hw} face={_mask(face)} n={count} -> {len(items)} available {offered[:6]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
