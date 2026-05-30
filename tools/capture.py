"""mitmproxy addon: log Plejd *cloud* HTTPS traffic (login -> site -> crypto key).

The BLE mesh traffic never crosses the proxy; this only captures the cloud side
used at setup to fetch the site crypto key and device list.

    mitmdump -s tools/capture.py --listen-host 0.0.0.0 --listen-port 8888 --ssl-insecure

Output is appended to tools/capture-plejd.txt (gitignored). It contains the crypto
key and session tokens — treat it as a live secret and redact before sharing.
"""

from __future__ import annotations

from mitmproxy import http

OUT = "tools/capture-plejd.txt"


def response(flow: http.HTTPFlow) -> None:
    if "plejd" not in flow.request.pretty_host:
        return
    with open(OUT, "a", encoding="utf-8") as fh:
        fh.write(f"{flow.request.method} {flow.request.pretty_url}\n")
        fh.write(f"  req: {flow.request.get_text()}\n")
        fh.write(f"  res: {flow.response.get_text() if flow.response else ''}\n\n")
