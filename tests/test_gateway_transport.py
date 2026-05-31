"""Tests for the Plejd gateway WebSocket transport."""

from __future__ import annotations

import base64
import json

import aiohttp
import pytest
from plejd import gateway
from plejd.gateway_transport import PlejdGatewayConnection
from plejd.protocol import set_output_state_and_level


def _text(obj: dict):
    return type("Msg", (), {"type": aiohttp.WSMsgType.TEXT, "data": json.dumps(obj)})()


def _state_reply(**addrs: str) -> dict:
    inner = {"controlType": "MeshStateReply", **addrs}
    return {"topic": "control.out", "op": "update", "data": base64.b64encode(json.dumps(inner).encode()).decode()}


class _FakeWS:
    def __init__(self, incoming=()):
        self.closed = False
        self.sent: list[str] = []
        self._incoming = list(incoming)

    async def send_str(self, s):
        self.sent.append(s)

    async def close(self):
        self.closed = True

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._incoming:
            return self._incoming.pop(0)
        self.closed = True
        raise StopAsyncIteration


class _FakeSession:
    def __init__(self, ws=None, error=None):
        self._ws = ws
        self._error = error
        self.connect_kwargs = None

    async def ws_connect(self, url, **kwargs):
        if self._error is not None:
            raise self._error
        self.connect_kwargs = (url, kwargs)
        return self._ws


def _conn(ws, on_state=None, on_disconnect=None):
    async def _token():
        return "tok"

    return PlejdGatewayConnection(
        _FakeSession(ws), "S1", "rs1", "inst-1", _token, on_state or (lambda: None), on_disconnect
    )


def _sent_publishes(ws, topic):
    out = []
    for raw in ws.sent:
        msg = json.loads(raw)
        if msg.get("topic") == [topic]:
            out.append(msg)
    return out


async def test_connect_handshake_and_headers():
    ws = _FakeWS()
    session = _FakeSession(ws)

    async def _token():
        return "tok"

    conn = PlejdGatewayConnection(session, "S1", "rs1", "inst-1", _token, lambda: None)
    await conn.connect()
    await conn.disconnect()
    _, kwargs = session.connect_kwargs
    headers = kwargs["headers"]
    assert headers["Authorization"] == "Bearer tok"
    assert headers["Site-ID"] == "S1" and headers["Resource-Set-ID"] == "rs1" and headers["Client-ID"] == "inst-1"
    # subscribed to both out topics and requested initial state
    subs = [json.loads(s) for s in ws.sent if json.loads(s).get("op") == "subscribe"]
    assert {tuple(s["topic"]) for s in subs} == {(gateway.TOPIC_CONTROL_OUT,), (gateway.TOPIC_MESH_OUT,)}
    assert _sent_publishes(ws, gateway.TOPIC_CONTROL_IN)  # MeshStateRequest


async def test_write_publishes_command_and_requests_state():
    ws = _FakeWS()
    conn = _conn(ws)
    await conn.connect()
    vector = set_output_state_and_level(address=11, output=0, on=True, level=80)
    await conn.write(vector)
    await conn.disconnect()
    mesh_pubs = _sent_publishes(ws, gateway.TOPIC_MESH_IN)
    assert len(mesh_pubs) == 1
    inner = json.loads(base64.b64decode(mesh_pubs[0]["data"]))
    assert inner["index"] == 11
    assert base64.b64decode(inner["raw"]) == gateway.repackage_command_to_ws(vector)
    # a state refresh is requested after the command
    assert len(_sent_publishes(ws, gateway.TOPIC_CONTROL_IN)) == 2  # initial + post-write


async def test_receive_updates_state_and_signals_disconnect_on_close():
    fired = []
    dropped = []
    ws = _FakeWS([_text(_state_reply(**{"11": "1,65535", "24": "0,0"}))])
    conn = _conn(ws, on_state=lambda: fired.append(1), on_disconnect=lambda: dropped.append(1))
    await conn.connect()
    await conn._recv_task  # drain the (finite) incoming frames, then the socket "closes"
    assert conn.state_for(11).on is True and conn.state_for(11).level == 255
    assert conn.state_for(24).on is False
    assert fired == [1] and dropped == [1]  # state pushed once, disconnect signalled on close


async def test_receive_loop_silent_when_closing():
    dropped = []
    ws = _FakeWS()
    conn = _conn(ws, on_disconnect=lambda: dropped.append(1))
    conn._ws = ws
    conn._closing = True
    await conn._receive_loop()  # exhausts immediately; closing → no disconnect callback
    assert dropped == []


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        json.dumps(123),  # not a dict
        json.dumps({"op": "subscribed", "topic": ["control.out"]}),  # no data
        json.dumps({"data": "!!!not-base64!!!"}),  # undecodable
        json.dumps({"data": base64.b64encode(json.dumps({"controlType": "Pong"}).encode()).decode()}),  # other type
    ],
)
def test_handle_frame_ignores_non_state(raw):
    fired = []
    conn = _conn(_FakeWS(), on_state=lambda: fired.append(1))
    conn._handle_frame(raw)
    assert conn.state == {} and fired == []


async def test_connect_failure_propagates():
    async def _token():
        return "tok"

    conn = PlejdGatewayConnection(_FakeSession(error=OSError("boom")), "S1", "rs1", "i", _token, lambda: None)
    with pytest.raises(OSError, match="boom"):
        await conn.connect()


async def test_send_without_connection_raises():
    conn = _conn(_FakeWS())  # never connected
    with pytest.raises(RuntimeError, match="not connected"):
        await conn.async_request_state()


async def test_disconnect_is_idempotent():
    ws = _FakeWS()
    conn = _conn(ws)
    await conn.connect()
    await conn.disconnect()
    assert ws.closed and not conn.connected
    await conn.disconnect()  # no error second time
