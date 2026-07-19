# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Remote → light dim bindings (backend).** The integration can store "hold a
  remote to dim a light/room" bindings and attach any remote's HA **device
  triggers** (IKEA, Hue, ZHA, Zigbee2MQTT — any trigger) to a smooth
  brightness-step ramp. Targets **any** Home Assistant light or a whole **area**,
  not only Plejd. A binding on a single **Plejd** light rides Plejd's native ramp
  over the site's chosen transport (gateway or BLE, per the transport option);
  everything else uses the generic ramp. Managed over a WebSocket API; the
  dashboard editor UI comes next (#76).
- **Plejd dashboard (sidebar panel).** A custom Plejd panel in the Home Assistant
  sidebar — its own web code, not a Lovelace view. It currently lists the site's
  Plejd lights; the remote dim-binding editor lands here next. Show or hide it in
  the left navbar via **Settings → Devices & Services → Plejd → Configure → Show or
  hide the dashboard** (#76).
- **Remote hold-to-dim (`plejd.start_dim` / `plejd.stop_dim`).** Bind a dimmer
  remote's "move while held / stop on release" actions (IKEA/Hue style) to these
  services and the light ramps smoothly over the gateway — reliable since the ack
  fix — instead of the chunky `input_number` + `repeat` workaround. Targets any
  Plejd light, or a whole **area** ("a Plejd room") to dim every dimmable light in
  it together in one gesture (#76).
- **Add a device, from Home Assistant.** A new `plejd.add_device` service
  commissions an unprovisioned Plejd device into the mesh directly from HA — cloud
  registration, Diffie-Hellman key exchange, mesh access address, and node index —
  no Plejd app needed. `plejd.scan_new_devices` finds candidates over Bluetooth.
  Both are also wrapped in a guided **Add a device** wizard under the integration's
  **Configure** menu (Settings → Devices & Services → Plejd → Configure), which
  lives on the integration entry itself rather than any specific device, so it
  works the same with or without a gateway.
- **Dimmer start level.** A per-output *Start brightness* number — the level a dimmer jumps to when first switched on (`SetOutputStartLevel`, opcode `0x00CF`; same level encoding as min/max).
- **Device health sensors.** A per-device *Fault* binary_sensor (diagnostic, `problem` class) surfaces the device's `NotifyEvents` flags (overcurrent, overtemperature, overload, …); polled every 10 min, replies on LastChanged. Validated against healthy hardware (clean bitfield → no fault).
- **Dimmer transition time.** A per-output *Transition time* config number (seconds)
  controls how fast a dimmer fades (`SetOutputSpeed`, opcode `0x00CB`). Validated on
  real hardware (an 8-second fade-in was observed). Joins the existing min/max
  brightness, dimming-curve, and phase-edge dimmer settings.
- **Remote gateway transport.** When the site has a Plejd Gateway (GWY-01),
  control runs over Plejd's cloud WebSocket (`wss://ws-ie.api.plejd.cloud`) so it
  works even when Home Assistant is out of Bluetooth range. The coordinator picks
  a transport gateway-first with automatic **fallback to Bluetooth**. State is
  push-based on both paths — the gateway pushes via `mesh.out`, Bluetooth via
  LastChanged broadcasts. Validated end-to-end on real hardware (command relayed
  through the cloud, state pushed back).

### Fixed
- **Reconnect loop could die silently and never recover.** The background
  reconnect task only caught `ConfigEntryNotReady`; any other failure (e.g. a
  cloud auth rejection while trying the gateway) escaped uncaught, killing the
  loop permanently with no retry and no reauth prompt — every light stayed
  `unavailable` until Home Assistant itself was restarted. Auth failures now
  start reauth and stop; every other failure is retried with backoff instead of
  silently ending the loop.
- **Every output past the first on a multi-output device (e.g. `DIM-02-LC2`)
  silently ignored commands.** `async_set_output` sent `0x00C8`
  (`OUTPUT_STATE_AND_LEVEL`) using the per-output cloud address with an
  `output` byte in the payload — but `0x00C8`'s own decode semantics treat
  `output` as a device-level channel selector (`output=cmd.data[0]`), not the
  per-output address. That only happened to work for output 0, where the
  per-output address coincides with the device's base address. Confirmed on a
  live gateway capture that the app always sends `0x0098`
  (`GROUP_STATE_AND_LEVEL`) instead, with no output byte at all — the
  per-output cloud address alone identifies the target, matching this
  opcode's own decode side (`output=cmd.address`). Switched to a new
  `set_group_state_and_level` (`0x0098`) for all on/off + level commands.
- **Hold-to-dim over the gateway was chunky and dropped most commands.** The
  cloud-relay transport published mesh commands fire-and-forget (`ack=false`),
  which the relay mostly dropped under a rapid stream — an A/B against the live
  relay delivered only 1 of 8 dim steps (final state after ~4s), matching the
  chunky hold-to-dim in #70. The Plejd app sets `ack=true` and awaits the
  `published` echo, which delivers reliably (round-trip ~40-140ms, no drops).
  `write()` now does the same: acks each publish and awaits its echo (correlated
  by the echoed content, bounded timeout), pacing the stream to the relay's real
  round-trip. The echo doubles as the state relay for our own change; off-app
  changes still arrive as `published`-without-publisher / `update` pushes.
  Re-verified live: **8 of 8** dim steps delivered.

## [0.5.0] - 2026-05-31

First feature-complete release: local Bluetooth-mesh control of a Plejd site,
set up via a one-time cloud login. Lights, switches, scenes, buttons,
motion/illuminance, and on-device scheduling (clock sync + time→scene events,
confirmed firing on real hardware) are validated against real hardware; covers,
climate, and the device-config entities are decoded from the app but not yet
hardware-validated.

### Added
- **Entity platforms**: lights (on/off + brightness), switches/relays, scenes,
  buttons (HA events on press/release), motion (`binary_sensor`) + illuminance
  (`sensor`) from WMS-01, covers (JAL/MTR), and climate (TRM thermostats).
- **Device settings** as config entities: per-output minimum/maximum brightness
  (`number`), dimming curve and phase-dim edge (`select`, the latter only on
  phase-cut dimmers).
- **On-device scheduling**: clock sync (broadcast local time on connect + daily,
  plus a Sync-clock button) and weekly time→scene schedules managed from the
  integration's Configure dialog, each exposed as a `switch`.
- Bluetooth-discovery config flow + account login; entry setup/teardown with
  options-driven reload.
- Decoded the Plejd protocol from the Android app (.NET MAUI): BLE GATT map,
  AES-128-ECB mesh crypto + SHA-256 login handshake (`crypto.py`), mesh command
  opcodes, and cloud architecture — see `docs/reverse_engineering.md`.
- Project scaffold: HACS metadata, CI (ruff, pytest, hassfest, HACS validation,
  CodeQL), issue/PR templates, the dotclaude tooling layer, and RE tooling
  (`tools/`) with capture documentation.

### Not included
- Firmware OTA updates (would require Plejd's proprietary firmware images) and
  astro (sunrise/sunset) schedules (use Home Assistant's `sun` automations).
