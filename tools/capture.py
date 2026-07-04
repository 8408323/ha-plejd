"""mitmproxy addon: log Plejd *cloud* HTTPS + gateway WebSocket traffic.

The BLE mesh traffic never crosses the proxy; this captures (a) the cloud side
used at setup to fetch the site crypto key and device list, and (b) the ongoing
gateway control WebSocket (wss://ws-ie.api.plejd.cloud) — the same remote-control
channel this integration's own gateway_transport.py talks to. Comparing the app's
own message cadence/format on that channel against ours is the point: if the app
dims smoothly over the same cloud-relay path, the difference is in how each side
uses it, not a hard limit of the transport itself.

    mitmdump -s tools/capture.py --listen-host 0.0.0.0 --listen-port 8888 --ssl-insecure

Output is appended to tools/capture-plejd.txt (gitignored). It contains the crypto
key and session tokens — treat it as a live secret and redact before sharing.
"""

from __future__ import annotations

import time

from mitmproxy import http, websocket

OUT = "tools/capture-plejd.txt"


def response(flow: http.HTTPFlow) -> None:
    if "plejd" not in flow.request.pretty_host:
        return
    with open(OUT, "a", encoding="utf-8") as fh:
        fh.write(f"{flow.request.method} {flow.request.pretty_url}\n")
        fh.write(f"  req: {flow.request.get_text()}\n")
        fh.write(f"  res: {flow.response.get_text() if flow.response else ''}\n\n")


def websocket_message(flow: websocket.WebSocketFlow) -> None:
    if "plejd" not in flow.request.pretty_host:
        return
    msg = flow.messages[-1]
    direction = "app->cloud" if msg.from_client else "cloud->app"
    ts = time.strftime("%H:%M:%S", time.localtime(msg.timestamp)) + f".{int(msg.timestamp * 1000) % 1000:03d}"
    with open(OUT, "a", encoding="utf-8") as fh:
        fh.write(f"WS {ts} {direction} {flow.request.pretty_url}: {msg.content!r}\n")
