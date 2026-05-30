"""Enumerate GATT services/characteristics of nearby Plejd mesh devices.

Standalone reverse-engineering helper — not imported by the integration.
Confirms the service/characteristic UUIDs the integration should use.

    uv run python tools/gatt_discover.py
"""

from __future__ import annotations

import asyncio

from bleak import BleakClient, BleakScanner

PLEJD_SERVICE_UUID = "31ba0001-6085-4726-be45-040c957391b5"


async def main() -> None:
    devices = await BleakScanner.discover(timeout=10.0, service_uuids=[PLEJD_SERVICE_UUID])
    if not devices:
        print("No Plejd devices found in range.")
        return
    for device in devices:
        print(f"\n{device.address}  {device.name}")
        async with BleakClient(device) as client:
            for service in client.services:
                print(f"  service {service.uuid}")
                for char in service.characteristics:
                    print(f"    char {char.uuid}  {sorted(char.properties)}")


if __name__ == "__main__":
    asyncio.run(main())
