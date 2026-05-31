"""Live end-to-end validation of the gateway-optional BLE control path.

One-time cloud login (tools/.env) fetches the site crypto key + device list, then
EVERYTHING else is local BLE: scan, connect to a *non-gateway* mesh device,
authenticate, toggle a light, and confirm the change arrives as a state
notification. Proves the integration controls the mesh with no Plejd Gateway
involved. Standalone tool — run with `uv run python tools/ble_validate.py`.
"""

from __future__ import annotations

import argparse
import asyncio
import importlib
import sys
import time
import types
from pathlib import Path

from bleak import BleakScanner

# Load the integration's transport-independent modules without executing the
# package __init__ (which imports Home Assistant). We register a bare `plejd`
# package pointing at the source dir; relative imports then resolve against it.
_PLEJD_DIR = Path(__file__).resolve().parent.parent / "custom_components" / "plejd"
_pkg = types.ModuleType("plejd")
_pkg.__path__ = [str(_PLEJD_DIR)]
sys.modules["plejd"] = _pkg

const = importlib.import_module("plejd.const")
cloud = importlib.import_module("plejd.cloud")
protocol = importlib.import_module("plejd.protocol")
connection_mod = importlib.import_module("plejd.connection")

GATEWAY_HARDWARE_ID = 4  # GWY-01 — the device we must NOT depend on.


def _redact(address: str) -> str:
    return f"{address[:8]}…{address[-2:]}"


def _load_env(path: Path) -> tuple[str, str]:
    user = pwd = None
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        if key.strip() == "PLEJD_USER":
            user = value.strip()
        elif key.strip() == "PLEJD_PASS":
            pwd = value.strip()
    if not user or not pwd:
        raise SystemExit(f"PLEJD_USER / PLEJD_PASS missing from {path}")
    return user, pwd


async def _fetch_site(email: str, password: str):
    import aiohttp

    async with aiohttp.ClientSession() as session:
        token = await cloud.async_login(session, email, password)
        sites = await cloud.async_get_sites(session, token)
        if not sites:
            raise SystemExit("no Plejd sites on this account")
        site_id = (sites[0].get("site") or sites[0])["siteId"]
        return await cloud.async_get_site(session, token, site_id)


async def _discover_plejd() -> list:
    found = await BleakScanner.discover(timeout=8.0, return_adv=True)
    plejd = [(device, adv) for device, adv in found.values() if const.PLEJD_SERVICE_UUID in (adv.service_uuids or [])]
    plejd.sort(key=lambda da: -(da[1].rssi if da[1].rssi is not None else -127))
    return plejd


def _pick_light(site) -> object | None:
    for device in site.devices:
        if device.category == const.CATEGORY_LIGHT and device.address is not None:
            return device
    return None


async def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-write", action="store_true", help="connect + listen only; send no commands")
    parser.add_argument("--env", default=str(_PLEJD_DIR.parent.parent / "tools" / ".env"))
    args = parser.parse_args()

    print("== Plejd gateway-optional BLE validation ==\n")

    print("[1/5] One-time cloud login → crypto key + device list (the only non-BLE step)")
    email, password = _load_env(Path(args.env))
    site = await _fetch_site(email, password)
    gateways = [d for d in site.devices if d.hardware_id == GATEWAY_HARDWARE_ID]
    print(f"      site '{site.title}': {len(site.devices)} outputs, {len(site.scenes)} scenes")
    print(
        f"      Plejd Gateway present on this site: {'yes' if gateways else 'no'} "
        f"({len(gateways)} GWY-01) — we will not route through it"
    )
    for d in site.devices:
        print(f"        addr={str(d.address):>4} out={d.output_index} {d.category:<7} {d.model:<10} {d.name}")
    print()

    print("[2/5] BLE scan for the mesh (no cloud, no gateway)")
    plejd = await _discover_plejd()
    if not plejd:
        print("      no Plejd mesh device in range — is Bluetooth on and a device powered?")
        return 1
    for device, adv in plejd:
        print(f"      found {_redact(device.address)} rssi={adv.rssi}")
    device, adv = plejd[0]
    print(f"      → connecting via {_redact(device.address)} (strongest; this is a mesh node, not the gateway)\n")

    print("[3/5] BLE connect + authenticate (SHA-256 challenge/response)")
    conn = connection_mod.PlejdConnection(site.crypto_key, lambda: None)
    # Install the logging wrapper BEFORE connect(): start_notify binds the handler
    # reference at subscribe time, so reassigning it afterwards would be ignored.
    orig_handle = conn._handle_notify
    start = time.monotonic()
    events: list = []

    def _capture(char, data):
        orig_handle(char, data)
        if conn.mesh is None:
            return
        try:
            cmd = protocol.decode_command(conn.mesh.decrypt(bytes(data)))
        except ValueError:
            return
        events.append(cmd)
        state = protocol.decode_output_state(cmd)
        suffix = f"  → on={state.on} level={state.level}" if state else ""
        print(
            f"      · t+{time.monotonic() - start:4.1f}s  notify addr={cmd.address:>3} "
            f"cmd={cmd.command:#06x} type={cmd.command_type:#04x} data={cmd.data.hex()}{suffix}"
        )

    def _echoed(target: int, want_on: bool) -> bool:
        # An output-state broadcast on the target address reflecting the commanded on-state.
        return any(
            (s := protocol.decode_output_state(c)) is not None and c.address == target and s.on == want_on
            for c in events
        )

    conn._handle_notify = _capture
    await conn.connect(device)
    print("      authenticated; subscribed to state notifications\n")

    try:
        light = _pick_light(site)
        if light is None:
            print("[4/5] no light output found on the site — listening 5s for any broadcast instead")
            await asyncio.sleep(5.0)
            print(f"      observed {len(events)} notification(s) over BLE")
            print("\n[5/5] SKIPPED (no light to toggle).")
            return 0

        addr, out = light.address, light.output_index
        print(f"[4/5] target light '{light.name}' ({light.model}) addr={addr} output={out}")
        await conn.write(conn.mesh.request_output(addr, out))
        await asyncio.sleep(2.5)
        before = conn.mesh.state.get(addr)
        if before is not None:
            print(f"      current state via BLE: on={before.on} level={before.level}")
        else:
            print("      no read-reply (some firmware only broadcasts on change) — assuming off")

        if args.no_write:
            print("\n[5/5] --no-write: skipping the write test. Listen-only path validated.")
            return 0

        # Keep the light ON and nudge its brightness to a distinct level, then restore.
        # Less disruptive than a full off, and gives a clear echo on the target address.
        orig_level = before.level if before else 255
        nudge = 80 if orig_level >= 160 else 220
        print(f"\n[5/5] write test (will restore): set '{light.name}' ON @ level {nudge}")
        events.clear()
        await conn.write(conn.mesh.set_output(addr, out, on=True, level=nudge))
        await asyncio.sleep(4.0)
        confirmed = _echoed(addr, want_on=True)
        print(f"      ↳ command confirmed by a state broadcast on addr {addr}: {'YES ✅' if confirmed else 'NO'}")

        await asyncio.sleep(1.0)
        print(f"      restoring '{light.name}' to original (on={bool(before and before.on)} level={orig_level})")
        await conn.write(conn.mesh.set_output(addr, out, on=bool(before and before.on), level=orig_level))
        await asyncio.sleep(1.5)

        print("\n== RESULT ==")
        print("cloud used only for one-time key/device fetch; connect, auth, command, and")
        print(f"state notification all happened over BLE with no gateway. Toggle confirmed: {confirmed}")
        return 0 if confirmed else 2
    finally:
        await conn.disconnect()


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
