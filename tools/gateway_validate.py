"""Live end-to-end validation of the gateway (remote/cloud) control path (#38).

Logs in (Parse), opens the remote-control WebSocket to wss://ws-ie.api.plejd.cloud,
subscribes, requests a mesh-state snapshot, then (optionally) nudges one light's
brightness through the gateway and restores it — proving control with NO local BLE.
Run: uv run python tools/gateway_validate.py   (add --no-write to skip the toggle)
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import importlib
import json
import sys
import types
import uuid
from pathlib import Path

_PLEJD_DIR = Path(__file__).resolve().parent.parent / "custom_components" / "plejd"
_pkg = types.ModuleType("plejd")
_pkg.__path__ = [str(_PLEJD_DIR)]
sys.modules["plejd"] = _pkg
const = importlib.import_module("plejd.const")
cloud = importlib.import_module("plejd.cloud")
protocol = importlib.import_module("plejd.protocol")
gateway = importlib.import_module("plejd.gateway")


def _mask(v: object) -> str:
    s = str(v)
    return s if len(s) <= 8 else f"{s[:4]}…{s[-4:]}"


def _load_env(path: Path) -> tuple[str, str]:
    user = pwd = None
    for line in path.read_text().splitlines():
        if line.startswith("PLEJD_USER="):
            user = line.split("=", 1)[1].strip()
        elif line.startswith("PLEJD_PASS="):
            pwd = line.split("=", 1)[1].strip()
    if not user or not pwd:
        raise SystemExit("PLEJD_USER / PLEJD_PASS missing")
    return user, pwd


def _publish(topic: str, inner: dict, ack: bool = False) -> str:
    data = base64.b64encode(json.dumps(inner).encode()).decode()
    msg = {"op": "publish", "data": data, "topic": [topic]}
    if ack:
        msg["ack"] = True
    return json.dumps(msg)


async def _recv_control_type(ws, want: str, timeout: float = 8.0) -> dict | None:
    """Wait for a control.out/mesh.out message whose inner JSON has controlType == want."""
    loop = asyncio.get_event_loop()
    deadline = loop.time() + timeout
    while loop.time() < deadline:
        try:
            raw = await asyncio.wait_for(ws.receive(), timeout=deadline - loop.time())
        except asyncio.TimeoutError:
            return None
        if raw.type is not __import__("aiohttp").WSMsgType.TEXT:
            continue
        frame = json.loads(raw.data)
        data = frame.get("data")
        inner = json.loads(base64.b64decode(data)) if isinstance(data, str) else None
        ct = inner.get("controlType") if isinstance(inner, dict) else None
        decoded = ""
        if isinstance(inner, dict) and isinstance(inner.get("raw"), str) and inner.get("index") is not None:
            # mesh.out push: {raw: b64(23B pkt), index: nodeIndex} → decode like LastChanged
            try:
                vector = gateway.repackage_ws_to_command(base64.b64decode(inner["raw"]), int(inner["index"]))
                cmd = protocol.decode_command(vector)
                state = protocol.decode_output_state(cmd)
                decoded = f"  PUSH addr={cmd.address} cmd={cmd.command:#06x} -> {state}"
            except (ValueError, TypeError) as err:
                decoded = f"  PUSH decode failed: {err}"
        print(f"      · recv topic={frame.get('topic')} op={frame.get('op')} controlType={ct}{decoded}")
        if isinstance(inner, dict) and ct == want:
            return inner
    return None


async def main() -> int:
    import aiohttp

    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-write", action="store_true", help="connect + read state only")
    args = parser.parse_args()

    print("== Plejd gateway (remote/cloud) validation ==\n")
    email, password = _load_env(_PLEJD_DIR.parent.parent / "tools" / ".env")

    async with aiohttp.ClientSession() as session:
        print("[1/5] Parse login + locate gateway-enabled site")
        token = await cloud.async_login(session, email, password)
        sites = await cloud.async_get_sites(session, token)
        chosen = next((s for s in sites if (s.get("gateway") and s.get("hasRemoteControlAccess"))), None)
        if chosen is None:
            print("      no gateway-enabled site on this account")
            return 1
        site_id = (chosen.get("site") or chosen)["siteId"]
        raw = await cloud._call_function(session, token, const.PLEJD_FN_SITE_BY_ID, {"siteId": site_id})
        raw_site = raw[0] if isinstance(raw, list) else raw
        gateways = raw_site.get("gateways") or []
        resource_sets = raw_site.get("resourceSets") or []
        resource_set_id = gateways[0].get("resourceSetId") or (
            resource_sets[0].get("objectId") if resource_sets else None
        )
        installation_id = str(uuid.uuid4())
        site = cloud.parse_site(raw_site)
        print(
            f"      site={_mask(site_id)} gateway={_mask(gateways[0].get('deviceId'))} "
            f"resourceSet={_mask(resource_set_id)} installid={_mask(installation_id)}\n"
        )

        print(f"[2/5] WebSocket connect → {gateway.GATEWAY_WS_URL}")
        headers = {
            "Client-Type": "app",
            "Authorization": f"Bearer {token}",
            "Site-ID": site_id,
            "Resource-Set-ID": str(resource_set_id),
            "Client-ID": installation_id,
        }
        async with session.ws_connect(gateway.GATEWAY_WS_URL, headers=headers, heartbeat=30) as ws:
            print("      connected\n")

            print("[3/5] subscribe control.out + mesh.out")
            await ws.send_str(json.dumps({"op": "subscribe", "topic": [gateway.TOPIC_CONTROL_OUT]}))
            await ws.send_str(json.dumps({"op": "subscribe", "topic": [gateway.TOPIC_MESH_OUT]}))
            await asyncio.sleep(0.5)

            print("\n[4/5] request mesh state (control.in MeshStateRequest)")
            await ws.send_str(_publish(gateway.TOPIC_CONTROL_IN, {"controlType": "MeshStateRequest"}))
            report = await _recv_control_type(ws, "MeshStateReply")
            if report is None:
                print("      no MeshStateReply received")
                return 2
            print(f"      raw MeshStateReply: {json.dumps(report)[:700]}")
            states = gateway.parse_mesh_state_report(report)
            print(
                f"      mesh state for {len(states)} addresses via gateway: "
                f"{ {a: (s.on, s.level) for a, s in sorted(states.items())} }"
            )

            light = next(
                (d for d in site.devices if d.category == const.CATEGORY_LIGHT and d.address is not None), None
            )
            if args.no_write or light is None:
                print("\n[5/5] read-only path validated over the gateway (no toggle).")
                return 0

            addr, out = light.address, light.output_index
            before = states.get(addr)
            orig_level = before.level if before else 255
            nudge = 80 if orig_level >= 160 else 220
            print(f"\n[5/5] write test via gateway: set '{light.name}' ON @ level {nudge} (will restore)")
            await ws.send_str(
                _publish(
                    gateway.TOPIC_MESH_IN,
                    json.loads(
                        base64.b64decode(
                            gateway.build_mesh_publish(protocol.set_output_state_and_level(addr, out, True, nudge))[
                                "data"
                            ]
                        )
                    ),
                    ack=True,
                )
            )
            await asyncio.sleep(2.0)
            await ws.send_str(_publish(gateway.TOPIC_CONTROL_IN, {"controlType": "MeshStateRequest"}))
            report2 = await _recv_control_type(ws, "MeshStateReply")
            states2 = gateway.parse_mesh_state_report(report2) if report2 else {}
            after = states2.get(addr)
            confirmed = after is not None and after.on
            print(f"      state after command: {after} → confirmed over gateway: {'YES ✅' if confirmed else 'no'}")

            print(f"      restoring '{light.name}' to level {orig_level}")
            await ws.send_str(
                _publish(
                    gateway.TOPIC_MESH_IN,
                    json.loads(
                        base64.b64decode(
                            gateway.build_mesh_publish(
                                protocol.set_output_state_and_level(addr, out, bool(before and before.on), orig_level)
                            )["data"]
                        )
                    ),
                    ack=True,
                )
            )
            await asyncio.sleep(1.5)

            print("\n== RESULT ==")
            print(f"controlled the mesh purely through the Plejd Gateway (cloud), no BLE. Confirmed: {confirmed}")
            return 0 if confirmed else 2


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
