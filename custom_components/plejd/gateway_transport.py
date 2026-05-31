"""Plejd gateway (remote / cloud) WebSocket transport.

Connects to the Plejd remote-control WebSocket (``wss://ws-ie.api.plejd.cloud``),
relays plaintext mesh commands, and tracks output state from ``MeshStateReply``
reports. The cloud/gateway holds the site crypto key, so this path is unencrypted —
it reuses ``protocol.encode_command`` and the codec in ``gateway.py``. See
docs/gateway_protocol.md.

An initial snapshot is requested on connect; after that, every state change (our own
commands and physical/off-app changes) arrives as a ``mesh.out`` push and is decoded
like a BLE LastChanged broadcast — no polling.
"""

from __future__ import annotations

import asyncio
import base64
import json
from collections.abc import Awaitable, Callable

import aiohttp

from . import gateway, protocol
from .protocol import OutputState


class PlejdGatewayConnection:
    """WebSocket client to the Plejd remote-control gateway."""

    def __init__(
        self,
        session: aiohttp.ClientSession,
        site_id: str,
        resource_set_id: str,
        installation_id: str,
        get_token: Callable[[], Awaitable[str]],
        on_state: Callable[[], None],
        on_disconnect: Callable[[], None] | None = None,
        ws_url: str = gateway.GATEWAY_WS_URL,
    ) -> None:
        self._session = session
        self._site_id = site_id
        self._resource_set_id = resource_set_id
        self._installation_id = installation_id
        self._get_token = get_token
        self._on_state = on_state
        self._on_disconnect = on_disconnect
        self._ws_url = ws_url
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._state: dict[int, OutputState] = {}
        self._recv_task: asyncio.Task | None = None
        self._closing = False

    @property
    def connected(self) -> bool:
        return self._ws is not None and not self._ws.closed

    @property
    def state(self) -> dict[int, OutputState]:
        return dict(self._state)

    def state_for(self, address: int) -> OutputState | None:
        return self._state.get(address)

    async def connect(self) -> None:
        """Open the WebSocket, authenticate, subscribe, and request initial state."""
        token = await self._get_token()
        headers = {
            "Client-Type": "app",
            "Authorization": f"Bearer {token}",
            "Site-ID": self._site_id,
            "Resource-Set-ID": self._resource_set_id,
            "Client-ID": self._installation_id,
        }
        self._ws = await self._session.ws_connect(self._ws_url, headers=headers, heartbeat=30)
        self._closing = False
        await self._subscribe(gateway.TOPIC_CONTROL_OUT)
        await self._subscribe(gateway.TOPIC_MESH_OUT)
        await self.async_request_state()
        self._recv_task = asyncio.ensure_future(self._receive_loop())

    async def write(self, vector: bytes) -> None:
        """Publish a plaintext mesh command, fire-and-forget.

        Like the BLE DontRespond path: we don't await the publish ack (ack=False);
        the resulting state change arrives as a mesh.out push (see _handle_frame).
        """
        await self._send({**gateway.build_mesh_publish(vector, ack=False), "topic": [gateway.TOPIC_MESH_IN]})

    async def async_request_state(self) -> None:
        """Ask the gateway for a full mesh-state snapshot."""
        data = base64.b64encode(json.dumps({"controlType": "MeshStateRequest"}).encode()).decode()
        await self._send({"op": "publish", "data": data, "topic": [gateway.TOPIC_CONTROL_IN]})

    async def _subscribe(self, topic: str) -> None:
        await self._send({"op": "subscribe", "topic": [topic]})

    async def _send(self, message: dict) -> None:
        if self._ws is None:
            raise RuntimeError("not connected")
        await self._ws.send_str(json.dumps(message))

    def _handle_frame(self, raw: str) -> None:
        try:
            frame = json.loads(raw)
        except ValueError:
            return
        if not isinstance(frame, dict) or not isinstance(frame.get("data"), str):
            return
        try:
            inner = json.loads(base64.b64decode(frame["data"]))
        except (ValueError, TypeError):
            return
        if not isinstance(inner, dict):
            return
        if inner.get("controlType") == gateway.CONTROL_TYPE_MESH_STATE:
            self._state.update(gateway.parse_mesh_state_report(inner))
            self._on_state()
        elif isinstance(inner.get("raw"), str) and inner.get("index") is not None:
            self._handle_push(inner["raw"], inner["index"])

    def _handle_push(self, raw_pkt: str, index: object) -> None:
        # A mesh.out update/push: a LastChanged Datavector relayed as {raw, index}.
        try:
            vector = gateway.repackage_ws_to_command(base64.b64decode(raw_pkt), int(index))
            command = protocol.decode_command(vector)
        except (ValueError, TypeError):
            return
        state = protocol.decode_output_state(command)
        if state is not None:
            self._state[command.address] = state
            self._on_state()

    async def _receive_loop(self) -> None:
        assert self._ws is not None
        async for msg in self._ws:
            if msg.type is aiohttp.WSMsgType.TEXT:
                self._handle_frame(msg.data)
        # The socket closed; if it wasn't us, let the owner reconnect.
        if not self._closing and self._on_disconnect is not None:
            self._on_disconnect()

    async def disconnect(self) -> None:
        self._closing = True
        if self._recv_task is not None:
            self._recv_task.cancel()
            self._recv_task = None
        if self._ws is not None:
            await self._ws.close()
            self._ws = None
