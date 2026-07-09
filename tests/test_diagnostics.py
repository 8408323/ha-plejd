"""Tests for the Plejd diagnostics."""

from __future__ import annotations

import types

from plejd.cloud import PlejdCloudDevice
from plejd.diagnostics import async_get_config_entry_diagnostics


def _device(model="DIM-01"):
    return PlejdCloudDevice(
        device_id="d1",
        name="Vardagsrum",
        address=11,
        output_index=0,
        outputs=[11],
        hardware_id=1,
        model=model,
        category="light",
        dimmable=True,
        traits=3,
        room_id="r1",
    )


class _Coordinator:
    def __init__(self):
        self.devices = [_device("DIM-01"), _device("CTR-01")]
        self.scenes = [object()]
        self.inputs = []
        self.motion = []
        self.active_transport = "gateway"
        self.available = True


def _entry():
    return types.SimpleNamespace(
        data={
            "email": "user@example.com",
            "password": "secret",
            "crypto_key": "00112233445566778899aabbccddeeff",
            "site_id": "site-guid",
            "resource_set_id": "rs1",
            "installation_id": "inst-1",
            "discovered_address": "AA:BB:CC:DD:EE:FF",
            "gateways": ["E6C9AABBCCDD"],
            "device_addresses": {"d1": 11, "w1": 33},
            "devices": [
                {"device_id": "d1", "object_id": "7MK7dlrcfz", "address": 11, "name": "Vardagsrum", "model": "DIM-01"}
            ],
        },
        options={
            "transport": "gateway",
            "schedules": [{"slot": 0, "name": "Wake", "days": [0, 1], "time": "07:00", "scene": 1, "fade": 0}],
        },
        runtime_data=_Coordinator(),
    )


async def test_diagnostics_redacts_secrets_and_pii():
    diag = await async_get_config_entry_diagnostics(None, _entry())
    data = diag["entry_data"]
    # secrets + PII redacted
    for key in (
        "email",
        "password",
        "crypto_key",
        "site_id",
        "resource_set_id",
        "installation_id",
        "discovered_address",
        "gateways",
        "device_addresses",  # mesh addresses keyed by device_id -- BLE/PII-adjacent
    ):
        assert data[key] == "**REDACTED**"
    dev = data["devices"][0]
    assert dev["device_id"] == "**REDACTED**" and dev["address"] == "**REDACTED**" and dev["name"] == "**REDACTED**"
    assert dev["object_id"] == "**REDACTED**"  # cloud Parse id must not leak in diagnostics
    # model is not sensitive and is kept
    assert dev["model"] == "DIM-01"
    # schedules (occupancy/routine) are redacted wholesale, transport pref kept
    assert diag["options"]["schedules"] == "**REDACTED**" and diag["options"]["transport"] == "gateway"


async def test_diagnostics_reports_transport_and_counts():
    diag = await async_get_config_entry_diagnostics(None, _entry())
    assert diag["active_transport"] == "gateway" and diag["available"] is True
    assert diag["counts"] == {"devices": 2, "scenes": 1, "inputs": 0, "motion": 0, "gateways": 1, "schedules": 1}
    assert diag["models"] == ["CTR-01", "DIM-01"]


async def test_diagnostics_transport_disconnected_label():
    entry = _entry()
    entry.runtime_data.active_transport = None
    diag = await async_get_config_entry_diagnostics(None, entry)
    assert diag["active_transport"] == "disconnected"
