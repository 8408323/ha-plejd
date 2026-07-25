# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Automatic cloud sync.** Every 24 hours the integration checks the Plejd cloud
  for site changes (devices/rooms/scenes added or renamed via the Plejd app,
  gateway added) and reloads automatically if anything differs — no manual
  Reconfigure needed, though Reconfigure still works for an immediate sync.

## [0.11.0] - 2026-07-20

### Added
- **Interactive light control on the Plejd dashboard.** The panel's Lights list
  gained the two controls the real Plejd app has: tap a light's name to toggle
  it, or drag a brightness slider (shown only for dimmable lights) to set its
  level — the command ships once, on release, not on every drag tick, so
  dragging can't flood the mesh. Rapid repeated taps/drags are handled
  correctly even faster than the round-trip to the backend.
- **Device-health summary widget on the Plejd dashboard.** A new panel section
  surfaces any faulted device (overtemperature, overcurrent, …) at a glance —
  "All devices healthy", or one row per faulted device naming it and its
  active fault flag(s) — without leaving the panel to dig through Settings.
- **Site-wide all-off (`plejd.all_off`).** A new service — and a matching
  `button.plejd_all_off` ("All lights off") entity usable straight from HA's
  UI — turns off every Plejd light output in the site in one call, mirroring
  the Plejd app's prominent all-off master control.
- **Scenes on the Plejd dashboard.** A new panel section lists every Plejd
  scene with an **Activate** button, calling the standard `scene.turn_on`
  service.
- **Schedule editor on the Plejd dashboard.** The existing on-device weekly
  time→scene schedules (previously only reachable via the integration's
  config-flow "Configure → Schedules" dialog) can now be listed, added, and
  deleted directly from the panel.
- **Motion & illuminance status on the Plejd dashboard.** A read-only panel
  section lists every WMS-01 motion sensor with its current state ("Detected" /
  "Clear") and paired illuminance reading in lux, grouped per physical device.
- **Climate (TRM thermostats) on the Plejd dashboard.** A new panel section
  lists every Plejd thermostat with its current temperature and `+`/`−` step
  buttons for the target temperature, calling `climate.set_temperature`
  directly — step size and min/max come from the entity's own attributes.
- **Covers on the Plejd dashboard.** The panel now lists every Plejd cover
  (JAL/MTR blind) alongside the lights, with **Open / Close / Stop** buttons
  calling the standard `cover.open_cover` / `cover.close_cover` /
  `cover.stop_cover` services. A cover that supports setting an exact position
  also gets a slider that sends `cover.set_cover_position` only on release,
  not on every drag tick, to avoid flooding the mesh.
- **Holiday mode (presence simulation).** The Home Assistant equivalent of the
  Plejd app's "Semesterläge": a **Holiday mode** switch that, while on and within
  a configurable active time-of-day window (default 18:00-23:00, may cross
  midnight), periodically turns a random subset of lights on for a randomized
  duration to make the home look occupied while away. Targets a configurable list
  of lights, or every Plejd light if none are picked — drives plain
  `light.turn_on`/`light.turn_off`, so any Home Assistant light works, not only
  Plejd's. Configure target lights and the active window from **Settings →
  Devices & Services → Plejd → Configure → Holiday mode**.
- **Remote button profiles (backend).** Groups a device's raw HA device triggers
  into friendly, per-button "profiles" for the (upcoming) dashboard button-press
  editor: a fully generic grouping/humanizing fallback works for any remote from
  any manufacturer with any number of buttons (groups by trigger `subtype` when
  present, humanizes raw type/subtype strings); a handful of built-in profiles
  (IKEA TRADFRI on/off switch, STYRBAR, RODRET; Philips Hue dimmer switch and Tap
  dial switch; Aqara/Xiaomi WXKG and Opple switches; SONOFF SNZB-01) give nicer
  named buttons for common remotes on the standard Zigbee2MQTT action convention;
  and a Store-backed custom-override manager lets an admin define/replace a
  device's button profile via WebSocket, effective immediately with no release
  needed. The existing `plejd/device_triggers` WebSocket command now also returns
  a `buttons` key (grouped view, custom override > built-in profile > generic)
  alongside the unchanged `triggers` key. Backend-only; frontend consumption is a
  follow-up.
- **Remote bindings: any trigger → any action.** Beyond hold-to-dim, a binding
  can now map *any* remote trigger (any button, short/long press, hold,
  release, click, …) to an instantaneous action on its target: **toggle**,
  **turn on**, **turn off**, **activate a scene**, or **call any service**
  (an escape hatch that merges the target in). Stored as a `presses` list on the
  binding and validated before saving. The dashboard editor's "Add a binding"
  form gained a **Press actions** section: add any number of trigger → action
  rows (reusing the same remote's device triggers as the dim up/down/release
  pickers), with conditional fields per action type and client-side validation
  before saving. The bindings list also now shows a "N press action(s)"
  summary alongside each binding's up/down/stop.
- **Whole-room lights (responsive, one command).** Each Plejd room is now exposed
  as a group light that switches/dims the entire room in a **single** `0x0098`
  mesh command to the room's group address — the way the Plejd app controls a
  room — instead of Home Assistant fanning an area out to one command per output
  (which lagged, especially over the gateway). Built from the cloud site's
  `roomAddress` + `outputGroups`; room state is aggregated from its member outputs.

## [0.10.0] - 2026-07-19

### Added
- **Remote → light dim bindings (backend).** The integration can store "hold a
  remote to dim a light/room" bindings and attach any remote's HA **device
  triggers** (IKEA, Hue, ZHA, Zigbee2MQTT — any trigger) to a smooth
  brightness-step ramp. Targets **any** Home Assistant light or a whole **area**,
  not only Plejd. A binding on a single **Plejd** light rides Plejd's native ramp
  over the site's chosen transport (gateway or BLE, per the transport option);
  everything else uses the generic ramp. Managed over a WebSocket API and
  configured from the Plejd dashboard editor (see the dashboard entry below) (#76).
- **Plejd dashboard (sidebar panel).** A custom Plejd panel in the Home Assistant
  sidebar — its own web code, not a Lovelace view. It lists the site's Plejd lights
  and hosts the **remote dim-binding editor**: pick a light or a whole room, pick a
  dimmer remote, and map its hold/release **device triggers** (dim up / dim down /
  release) — no YAML. Show or hide the panel in the left navbar via **Settings →
  Devices & Services → Plejd → Configure → Show or hide the dashboard** (#76).
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
