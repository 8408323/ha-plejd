#!/usr/bin/env bash
# Capture the Plejd Android app's logcat over ADB (USB or WiFi).
#
# For the on-air BLE protocol, also enable "Bluetooth HCI snoop log" in the
# phone's developer options, drive the app, then pull the snoop log:
#   adb pull /sdcard/btsnoop_hci.log tools/
# (path varies by device; check `adb bugreport` if it isn't there).
#
# Output is gitignored. Redact tokens / the crypto key / BLE addresses before sharing.
set -euo pipefail

OUT="${1:-tools/capture-plejd.txt}"
echo "Logging Plejd app logcat to ${OUT} (Ctrl-C to stop)…"
adb logcat -c
adb logcat | grep -i plejd | tee "${OUT}"
