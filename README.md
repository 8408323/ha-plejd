# ha-plejd

[![Lint](https://github.com/8408323/ha-plejd/actions/workflows/lint.yml/badge.svg)](https://github.com/8408323/ha-plejd/actions/workflows/lint.yml)
[![Tests](https://github.com/8408323/ha-plejd/actions/workflows/tests.yml/badge.svg)](https://github.com/8408323/ha-plejd/actions/workflows/tests.yml)
[![Validate](https://github.com/8408323/ha-plejd/actions/workflows/validate.yml/badge.svg)](https://github.com/8408323/ha-plejd/actions/workflows/validate.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Unofficial [Home Assistant](https://www.home-assistant.io/) integration for
[Plejd](https://www.plejd.com/) — the Swedish BLE-mesh lighting and relay system.

> ⚠️ **Early scaffold.** This repo currently contains the project skeleton and a
> Bluetooth-discovery config flow. Device control is being reverse-engineered and
> built out — see the [issues](https://github.com/8408323/ha-plejd/issues) for the
> roadmap. It is not yet usable for controlling lights.

## How it works

Plejd has no cloud control API — devices form a local **Bluetooth mesh**. This
integration:

1. **Logs in to the Plejd cloud once** to fetch your site's *crypto key* and the
   list of devices (BLE addresses, names, output addresses).
2. **Connects locally over BLE** to one mesh device, which relays commands and
   state notifications to the rest. Payloads are AES-encrypted with the site key.

So setup needs your Plejd account; everyday control is entirely local and works
without internet. `iot_class` is `local_push`.

## Requirements

- Home Assistant 2024.6 or newer with the **Bluetooth** integration available
  (a built-in adapter or an [ESPHome Bluetooth proxy](https://esphome.io/components/bluetooth_proxy.html)).
- A Plejd account (email + password) and at least one Plejd device.

## Installation (HACS)

1. HACS → ⋮ → **Custom repositories** → add `https://github.com/8408323/ha-plejd`
   as an **Integration**.
2. Install **Plejd**, restart Home Assistant.
3. **Settings → Devices & Services → Add Integration → Plejd**, then sign in with
   your Plejd account.

Or copy `custom_components/plejd/` into your HA `config/custom_components/`.

## Status & roadmap

This is a work in progress reverse-engineered from the Plejd Android app. Planned
work — lights, switches/relays, scenes, and sensors — is tracked in
[issues](https://github.com/8408323/ha-plejd/issues). Contributions and captures
welcome; see [CONTRIBUTING.md](CONTRIBUTING.md).

## Privacy & security

The Plejd **site crypto key** is the master secret for your mesh. This integration
keeps it in the Home Assistant config entry and never logs or transmits it. When
filing issues, redact the crypto key, your account email, BLE addresses, and any
capture artifacts. See [SECURITY.md](SECURITY.md).

## Disclaimer

Not affiliated with or endorsed by Plejd. "Plejd" is a trademark of its owner.
Use at your own risk. Licensed under [MIT](LICENSE).
