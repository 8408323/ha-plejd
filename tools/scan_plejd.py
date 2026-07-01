"""Standalone Plejd BLE scanner — runs without HA.

Scans for 10 seconds and prints any Plejd devices found, with their
provisioning state decoded from manufacturer data.

Usage:
    uv run python tools/scan_plejd.py
"""

from __future__ import annotations

import asyncio
import sys

sys.path.insert(0, ".")  # so we can import from custom_components

from bleak import BleakScanner
from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData

PLEJD_SERVICE_UUID = "31ba0001-6085-4726-be45-040c957391b5"

_FLAG_HAS_ACCESS_ADDRESS = 0x01
_FLAG_HAS_NODE_INDEX = 0x02
_FLAG_HAS_CRYPTO_KEY = 0x04
_FLAG_ON_DEFAULT_MESH = 0x08


def _parse(manufacturer_data: dict[int, bytes]) -> dict | None:
    for data in manufacturer_data.values():
        if len(data) >= 4:
            login = data[0]
            hw_id = data[3]
            on_default_mesh = bool(login & _FLAG_ON_DEFAULT_MESH)
            unclaimed = not (login & (_FLAG_HAS_ACCESS_ADDRESS | _FLAG_HAS_NODE_INDEX | _FLAG_HAS_CRYPTO_KEY))
            return {
                "login_byte": f"0x{login:02x}",
                "hardware_id": hw_id,
                "on_default_mesh": on_default_mesh,
                "unclaimed": unclaimed,
                "is_unprovisioned": on_default_mesh or unclaimed,
            }
    return None


async def main() -> None:
    print("Scanning for 10 seconds…")
    found: dict[str, tuple[BLEDevice, AdvertisementData]] = {}

    def callback(device: BLEDevice, adv: AdvertisementData) -> None:
        if PLEJD_SERVICE_UUID in (adv.service_uuids or []):
            found[device.address] = (device, adv)

    async with BleakScanner(detection_callback=callback) as _scanner:
        await asyncio.sleep(10)

    if not found:
        print("No Plejd devices found in range.")
        return

    print(f"\nFound {len(found)} Plejd device(s):\n")
    for addr, (dev, adv) in sorted(found.items()):
        parsed = _parse(adv.manufacturer_data or {})
        print(f"  {addr}  RSSI={adv.rssi}  name={dev.name!r}")
        if parsed:
            status = "UNPROVISIONED" if parsed["is_unprovisioned"] else "provisioned"
            print(
                f"    login_byte={parsed['login_byte']}  hw_id={parsed['hardware_id']}  "
                f"on_default_mesh={parsed['on_default_mesh']}  unclaimed={parsed['unclaimed']}  → {status}"
            )
        else:
            print(f"    manufacturer_data={adv.manufacturer_data!r}  (too short to parse)")
        print()


asyncio.run(main())
