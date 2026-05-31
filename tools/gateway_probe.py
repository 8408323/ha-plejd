"""Probe the cloud site data for gateway + remote-access info (issue #38).

The integration's parsed device list only holds controllable OUTPUTS, so a GWY-01
(no output) never shows up there. This reads the RAW getSiteList / getSiteById and
reports the gateway(s), remote-control access, and the resourceSetId needed to open
the remote-control WebSocket. IDs are partially masked. Run: uv run python tools/gateway_probe.py
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


def _mask(value: object) -> str:
    s = str(value)
    return s if len(s) <= 8 else f"{s[:4]}…{s[-4:]}"


def _load_env(path: Path) -> tuple[str, str]:
    user = pwd = None
    for line in path.read_text().splitlines():
        line = line.strip()
        if line.startswith("PLEJD_USER="):
            user = line.split("=", 1)[1].strip()
        elif line.startswith("PLEJD_PASS="):
            pwd = line.split("=", 1)[1].strip()
    if not user or not pwd:
        raise SystemExit("PLEJD_USER / PLEJD_PASS missing")
    return user, pwd


async def main() -> int:
    import aiohttp

    email, password = _load_env(_PLEJD_DIR.parent.parent / "tools" / ".env")
    async with aiohttp.ClientSession() as session:
        token = await cloud.async_login(session, email, password)
        sites = await cloud.async_get_sites(session, token)
        print("== getSiteList (partial sites) ==")
        for s in sites:
            site = s.get("site") or s
            gateways = s.get("gateway") or []
            print(
                f"  site {_mask(site.get('siteId'))}: gateway={[_mask(g) for g in gateways]} "
                f"hasRemoteControlAccess={s.get('hasRemoteControlAccess')}"
            )
        site_id = (sites[0].get("site") or sites[0])["siteId"]

        raw = await cloud._call_function(session, token, const.PLEJD_FN_SITE_BY_ID, {"siteId": site_id})
        site = raw[0] if isinstance(raw, list) else raw
        print(f"\n== getSiteById ({_mask(site_id)}) ==")
        print(f"  top-level keys: {sorted(site.keys())}")

        gateways = site.get("gateways") or []
        print(f"\n  gateways[]: {len(gateways)}")
        for gw in gateways:
            print(
                f"    deviceId={_mask(gw.get('deviceId'))} hardwareId={gw.get('hardwareId')} keys={sorted(gw.keys())}"
            )

        gw_devices = [d for d in (site.get("plejdDevices") or []) if str(d.get("hardwareId")) == "4"]
        print(f"\n  plejdDevices[] with hardwareId==4 (GWY-01): {len(gw_devices)}")
        for d in gw_devices:
            print(f"    deviceId={_mask(d.get('deviceId'))}")

        resource_sets = site.get("resourceSets") or []
        print(f"\n  resourceSets[]: {len(resource_sets)}")
        for rs in resource_sets:
            users = rs.get("remoteAccessUsers") or rs.get("AllowedRemoteControlUsers") or []
            rs_id = rs.get("resourceSetId") or rs.get("objectId") or rs.get("id")
            print(
                f"    id={_mask(rs_id)} name={rs.get('name')} remoteAccessUsers={len(users)} keys={sorted(rs.keys())}"
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
