# Reverse engineering Plejd

All protocol knowledge in this repo comes from **our own** capture of the Plejd
Android app and BLE traffic. There are two surfaces:

1. **Cloud (HTTPS, setup only).** Logging in with a Plejd account returns the
   site's **crypto key** and the device list (BLE addresses, names, dimmable
   flags, output addresses). This happens once, at config time.
2. **BLE mesh (local, ongoing).** Control and state run over BLE GATT. The phone
   (or Home Assistant) connects to one mesh device and it relays to the rest.
   Payloads are encrypted with the site crypto key, keyed on the connected
   device's BLE address.

## Methods

### 1. BLE HCI snoop (primary, for the on-air protocol)

1. Phone → Developer options → enable **Bluetooth HCI snoop log**.
2. Drive the Plejd app (toggle lights, set brightness, run a scene).
3. Pull the log: `adb pull /sdcard/btsnoop_hci.log tools/` (path varies — check
   `adb bugreport` if it isn't there).
4. Open in Wireshark and filter on the ATT writes/notifications to the Plejd
   characteristics.

### 2. ADB logcat

`bash tools/adb_capture.sh` streams the Plejd app's own logs. Useful for
correlating app actions with BLE writes. Works over USB or WiFi ADB.

### 3. GATT enumeration

`uv run python tools/gatt_discover.py` lists the service/characteristic UUIDs a
Plejd device exposes — confirm these against `custom_components/plejd/const.py`.

### 4. Cloud capture (mitmproxy)

For the login → site → crypto-key calls only:

```
mitmdump -s tools/capture.py --listen-host 0.0.0.0 --listen-port 8888 --ssl-insecure
```

Point the phone's proxy at this host and install the cert via `http://mitm.it`.
The BLE traffic does **not** cross the proxy.

## ADB quick reference

- USB or WiFi ADB both work. For WiFi: `adb tcpip 5555` then `adb connect <phone-ip>:5555`.
- If the phone shows "unauthorized", tap **Allow** on its screen.

## Secrets

The crypto key, account credentials, session tokens, and BLE addresses are all
recoverable from these captures. Treat every capture artifact as a live secret:
they are gitignored (`btsnoop_hci*`, `capture-*.txt`, `*.pcap`, `*.cfa`, `*.log`)
and must never be pasted into code, issues, or PRs. Redact first.
