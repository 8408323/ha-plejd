# tools/ — reverse-engineering helpers

Standalone scripts for observing Plejd behaviour. None of these are imported by
the integration. Full method notes: [../docs/reverse_engineering.md](../docs/reverse_engineering.md).

| Tool | Surface | What it does |
|------|---------|--------------|
| `gatt_discover.py` | BLE | Enumerate GATT services/characteristics of nearby Plejd devices (`uv run python tools/gatt_discover.py`). |
| `adb_capture.sh` | Phone | Stream the Plejd app's logcat over ADB; pointers for pulling the BLE HCI snoop log. |
| `capture.py` | Cloud | mitmproxy addon logging the cloud login → site → crypto-key HTTPS calls. |

## Secrets

Everything these produce — `btsnoop_hci*`, `capture-plejd.txt`, `*.pcap`, `*.cfa`,
the site crypto key — is a **live secret** and is gitignored. Never paste raw
capture contents into code, commits, issues, or PRs. Credentials live in
`tools/.env` (copy from `.env.example`), never hardcoded.
