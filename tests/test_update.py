"""Tests for the Plejd firmware update entity."""

from __future__ import annotations

import types

from plejd.cloud import PlejdCloudDevice
from plejd.coordinator import PlejdFirmwareStatus
from plejd.update import UPDATE_WARNING, PlejdFirmwareUpdate, async_setup_entry


def _device(device_id="d1", output_index=0):
    return PlejdCloudDevice(
        device_id=device_id,
        name="Kitchen",
        address=5,
        output_index=output_index,
        outputs=[5],
        hardware_id=1,
        model="DIM-01",
        category="light",
        dimmable=True,
        traits=3,
        room_id="r1",
    )


class _Coordinator:
    def __init__(self, devices, firmware=None):
        self.devices = devices
        self.firmware = firmware or {}
        self.listeners = []

    def async_add_listener(self, cb):
        self.listeners.append(cb)
        return lambda: self.listeners.remove(cb)


async def test_setup_creates_one_entity_per_physical_device():
    coord = _Coordinator([_device("d1", 0), _device("d1", 1), _device("d2", 0)])
    entry = types.SimpleNamespace(runtime_data=coord)
    added = []
    await async_setup_entry(None, entry, lambda entities: added.extend(entities))
    assert len(added) == 2  # d1's two outputs collapse to one firmware entity
    assert {e._attr_unique_id for e in added} == {"firmware_d1", "firmware_d2"}


def test_installed_version_unknown_before_refresh():
    entity = PlejdFirmwareUpdate(_Coordinator([_device()]), _device())
    assert entity.installed_version is None
    assert entity.latest_version is None


def test_versions_when_up_to_date():
    status = PlejdFirmwareStatus("6.43.3", 20260324155701, None, None)
    entity = PlejdFirmwareUpdate(_Coordinator([_device()], {"d1": status}), _device())
    assert entity.installed_version == "6.43.3"
    assert entity.latest_version == "6.43.3"  # equal -> HA shows up to date


def test_versions_when_update_available():
    status = PlejdFirmwareStatus("6.40.0", 20251201000000, "6.43.3", 20260324155701)
    entity = PlejdFirmwareUpdate(_Coordinator([_device()], {"d1": status}), _device())
    assert entity.installed_version == "6.40.0"
    assert entity.latest_version == "6.43.3"


def test_latest_ignores_older_or_equal_build_even_with_version_string():
    # latest_version string would sort oddly, but buildTime is not newer -> stay on installed
    status = PlejdFirmwareStatus("6.43.3", 20260324155701, "6.99.0", 20200101000000)
    entity = PlejdFirmwareUpdate(_Coordinator([_device()], {"d1": status}), _device())
    assert entity.latest_version == "6.43.3"


def test_release_summary_warns_to_use_the_app():
    entity = PlejdFirmwareUpdate(_Coordinator([_device()]), _device())
    assert entity.release_summary is UPDATE_WARNING
    assert "Plejd app" in UPDATE_WARNING


async def test_added_to_hass_subscribes_to_coordinator():
    coord = _Coordinator([_device()])
    entity = PlejdFirmwareUpdate(coord, _device())
    await entity.async_added_to_hass()
    assert len(coord.listeners) == 1
