# ha-plejd

[![Lint](https://github.com/8408323/ha-plejd/actions/workflows/lint.yml/badge.svg)](https://github.com/8408323/ha-plejd/actions/workflows/lint.yml)
[![Tests](https://github.com/8408323/ha-plejd/actions/workflows/tests.yml/badge.svg)](https://github.com/8408323/ha-plejd/actions/workflows/tests.yml)
[![Validate](https://github.com/8408323/ha-plejd/actions/workflows/validate.yml/badge.svg)](https://github.com/8408323/ha-plejd/actions/workflows/validate.yml)
[![CodeQL](https://github.com/8408323/ha-plejd/actions/workflows/codeql.yml/badge.svg)](https://github.com/8408323/ha-plejd/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Home Assistant custom integration for [Plejd](https://www.plejd.com/) — the Swedish **Bluetooth-mesh** lighting and relay system.

> **Status**: Reverse-engineering in progress — the BLE protocol (GATT, AES-128 crypto, mesh commands) and the cloud login are decoded; entity platforms are being built out. Not yet usable for controlling lights. Track progress in the [issues](https://github.com/8408323/ha-plejd/issues).

## Support

If you find this integration useful, you can buy me a coffee ☕

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=jhara&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/jhara)

## How it works

Plejd devices have no local network (IP) API and aren't controlled through the cloud — they form a local **Bluetooth mesh**. This integration:

1. **Logs in to the Plejd cloud once** to fetch your site's *crypto key* and device list (BLE addresses, output addresses, device types).
2. **Connects locally over Bluetooth** to one mesh device, which relays commands and state to the rest. Payloads are AES-128 encrypted with the site key.

So setup needs your Plejd account; everyday control is entirely local and works without internet. `iot_class` is `local_push`.

## Requirements

- Home Assistant 2024.6 or newer with the **Bluetooth** integration available (a built-in adapter or an [ESPHome Bluetooth proxy](https://esphome.io/components/bluetooth_proxy.html)).
- A Plejd account (email + password) and at least one Plejd device.

## Installation

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=8408323&repository=ha-plejd&category=integration)

Or manually:

1. In HACS, go to **Integrations → ⋮ → Custom repositories**.
2. Add `https://github.com/8408323/ha-plejd` as an **Integration**.
3. Search for **Plejd** and click **Download**.
4. Restart Home Assistant.

### Manual

1. Copy `custom_components/plejd/` to your HA `config/custom_components/` directory.
2. Restart Home Assistant.

## Configuration

> ⚠️ Early but functional: setup signs in, fetches your site, connects over
> Bluetooth, and exposes **lights** (on/off + brightness). More platforms
> (switches, covers, climate, sensors) are in progress — see the
> [issues](https://github.com/8408323/ha-plejd/issues).

1. Go to **Settings → Devices & Services → Add Integration**.
2. Search for *Plejd*.
3. Sign in with your Plejd account; if you have more than one site, pick one. Your
   site's devices and crypto key are fetched once; control then happens locally
   over Bluetooth.

## Features

Tracked in [issues](https://github.com/8408323/ha-plejd/issues):

- **Lights** ✅ — on/off + brightness for dimmers and LED drivers (DIM-01/02, LED-10/75, …)
- **Switches/relays** — CTR-01, REL-01/02, OUT-01/02
- **Scenes** — trigger Plejd scenes
- **Covers** — JAL-01 / WIN-01 blinds and shades
- **Climate** — Plejd thermostats
- **Sensors** — motion (WMS-01), power/energy where reported

## Privacy & security

The Plejd **site crypto key** is the master secret for your mesh. This integration keeps it in the Home Assistant config entry and never logs or transmits it. When filing issues, redact the crypto key, your account email, BLE addresses, and any capture artifacts. See [SECURITY.md](SECURITY.md).

## Development

The integration is pure Python with no Home Assistant import needed to run the test suite:

```bash
uv sync --dev
uv run pytest tests/ -v --cov=custom_components/plejd --cov-fail-under=100
uv run ruff check custom_components/ tests/ tools/
```

How the protocol was reverse-engineered (BLE GATT, crypto, mesh commands, cloud) is documented in [docs/reverse_engineering.md](docs/reverse_engineering.md). Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).

## Disclaimer

Not affiliated with or endorsed by Plejd. "Plejd" is a trademark of its owner. All protocol knowledge was obtained from our own analysis of the Plejd Android app. Use at your own risk. Licensed under [MIT](LICENSE).
