"""Plejd gateway (remote / cloud) WebSocket transport.

Connects to the Plejd remote-control WebSocket (``wss://ws-ie.api.plejd.cloud``),
relays plaintext mesh commands, and tracks output state from ``MeshStateReply``
reports. The cloud/gateway holds the site crypto key, so this path is unencrypted —
it reuses ``protocol.encode_command`` and the codec in ``gateway.py``. See
docs/gateway_protocol.md.

State is refreshed on connect and after each command. Physical (off-mesh) changes
are not yet pushed — decoding the ``mesh.out`` update frames is a follow-up that
needs a live capture (#38).
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from collections.abc import Awaitable, Callable

import aiohttp

from . import gateway
from .protocol import OutputState

_LOGGER = logging.getLogger(__name__)


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
        """Publish a plaintext mesh command, then ask for fresh state."""
        await self._send({**gateway.build_mesh_publish(vector), "topic": [gateway.TOPIC_MESH_IN]})
        await self.async_request_state()

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
        if not isinstance(inner, dict) or inner.get("controlType") != gateway.CONTROL_TYPE_MESH_STATE:
            return
        self._state.update(gateway.parse_mesh_state_report(inner))
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
