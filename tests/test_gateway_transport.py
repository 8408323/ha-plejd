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


def _push_frame(address: int, vector: bytes) -> dict:
    inner = {"raw": base64.b64encode(gateway.repackage_command_to_ws(vector)).decode(), "index": address}
    return {"topic": "mesh.out", "op": "update", "data": base64.b64encode(json.dumps(inner).encode()).decode()}


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


def _conn(ws, on_state=None, on_disconnect=None, on_event=None):
    async def _token():
        return "tok"

    return PlejdGatewayConnection(
        _FakeSession(ws),
        "S1",
        "rs1",
        "inst-1",
        _token,
        on_state or (lambda: None),
        on_disconnect,
        on_event=on_event,
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


async def test_write_publishes_command_fire_and_forget():
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
    # only the connect-time snapshot is requested; state changes arrive via mesh.out push
    assert len(_sent_publishes(ws, gateway.TOPIC_CONTROL_IN)) == 1


def test_handle_push_updates_state():
    fired = []
    conn = _conn(_FakeWS(), on_state=lambda: fired.append(1))
    vector = set_output_state_and_level(address=11, output=0, on=True, level=200)
    conn._handle_frame(json.dumps(_push_frame(11, vector)))
    assert conn.state_for(11) is not None and conn.state_for(11).level == 200 and fired == [1]


def test_handle_push_ignores_non_output_command():
    from plejd.protocol import encode_command

    fired = []
    conn = _conn(_FakeWS(), on_state=lambda: fired.append(1))
    # A button (0x0097) push decodes but isn't an output state -> no state, no notify.
    conn._handle_frame(json.dumps(_push_frame(10, encode_command(10, 0x0097, bytes([1])))))
    assert conn.state == {} and fired == []


def test_handle_push_forwards_every_decoded_command_to_on_event():
    from plejd.const import CMD_NOTIFY_EVENTS
    from plejd.protocol import encode_command

    events = []
    conn = _conn(_FakeWS(), on_event=lambda command: events.append(command))
    # NotifyEvents (fault) push - not an output-state command, but on_event still fires
    # with the decoded Command so the coordinator's own dispatch (faults, motion,
    # button) works the same as it does for BLE, not just output-state changes.
    conn._handle_frame(json.dumps(_push_frame(10, encode_command(10, CMD_NOTIFY_EVENTS, bytes([1])))))
    assert len(events) == 1 and events[0].address == 10 and events[0].command == CMD_NOTIFY_EVENTS


def test_handle_push_without_on_event_does_not_crash():
    from plejd.const import CMD_NOTIFY_EVENTS
    from plejd.protocol import encode_command

    conn = _conn(_FakeWS())  # on_event defaults to None
    conn._handle_frame(json.dumps(_push_frame(10, encode_command(10, CMD_NOTIFY_EVENTS, bytes([1])))))


def test_handle_push_ignores_undecodable_packet():
    conn = _conn(_FakeWS())
    inner = {"raw": base64.b64encode(b"too-short").decode(), "index": 11}  # not a 23-byte packet
    frame = {"topic": "mesh.out", "op": "update", "data": base64.b64encode(json.dumps(inner).encode()).decode()}
    conn._handle_frame(json.dumps(frame))  # repackage raises -> ignored, no crash
    assert conn.state == {}


def test_handle_frame_pong_sets_flag():
    conn = _conn(_FakeWS())
    frame = {"data": base64.b64encode(json.dumps({"controlType": "Pong"}).encode()).decode()}
    conn._handle_frame(json.dumps(frame))
    assert conn._pong is True


def _ping_sent(ws) -> bool:
    for s in ws.sent:
        msg = json.loads(s)
        data = msg.get("data")
        if isinstance(data, str) and json.loads(base64.b64decode(data)).get("controlType") == "Ping":
            return True
    return False


async def test_ping_loop_survives_on_pong(monkeypatch):
    from plejd import gateway_transport as gt

    ws = _FakeWS()
    conn = _conn(ws)
    conn._ws = ws

    async def fake_sleep(delay):
        if delay == gt.GATEWAY_PONG_TIMEOUT:
            conn._pong = True  # gateway answered in time
            conn._closing = True  # stop the loop after this cycle

    monkeypatch.setattr(gt.asyncio, "sleep", fake_sleep)
    await conn._ping_loop()
    assert _ping_sent(ws) and not ws.closed


async def test_ping_loop_closes_on_missed_pong(monkeypatch):
    from plejd import gateway_transport as gt

    ws = _FakeWS()
    conn = _conn(ws)
    conn._ws = ws

    async def fake_sleep(_delay):
        pass  # never set _pong → missed pong

    monkeypatch.setattr(gt.asyncio, "sleep", fake_sleep)
    await conn._ping_loop()
    assert _ping_sent(ws) and ws.closed  # missed pong → closed so the owner reconnects


async def test_ping_loop_does_not_close_reconnected_socket(monkeypatch):
    from plejd import gateway_transport as gt

    old, new = _FakeWS(), _FakeWS()
    conn = _conn(old)
    conn._ws = old
    calls = {"n": 0}

    async def fake_sleep(_delay):
        calls["n"] += 1
        if calls["n"] == 2:  # pong wait of round one: socket drops + owner reconnects
            old.closed = True
            conn._ws = new  # fresh socket, not yet ponged
            conn._pong = False
        elif calls["n"] >= 3:  # next round's ping interval: stop the loop
            conn._closing = True

    monkeypatch.setattr(gt.asyncio, "sleep", fake_sleep)
    await conn._ping_loop()
    assert not new.closed  # the stale loop must NOT close the freshly reconnected socket


async def test_ping_loop_stops_when_disconnected(monkeypatch):
    from plejd import gateway_transport as gt

    ws = _FakeWS()
    ws.closed = True  # socket already gone
    conn = _conn(ws)
    conn._ws = ws

    async def fake_sleep(_delay):
        pass

    monkeypatch.setattr(gt.asyncio, "sleep", fake_sleep)
    await conn._ping_loop()
    assert ws.sent == []  # bailed before sending a ping


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


async def test_receive_loop_signals_disconnect_on_unexpected_error():
    class _RaisingWS(_FakeWS):
        async def __anext__(self):
            raise RuntimeError("connection reset")

    dropped = []
    ws = _RaisingWS()
    conn = _conn(ws, on_disconnect=lambda: dropped.append(1))
    conn._ws = ws
    with pytest.raises(RuntimeError):
        await conn._receive_loop()
    assert dropped == [1]  # an unexpected error must still notify the owner, not die silently


async def test_ping_loop_treats_send_failure_as_missed_pong(monkeypatch):
    from plejd import gateway_transport as gt

    ws = _FakeWS()
    conn = _conn(ws)
    conn._ws = ws

    async def _fail_send(_s):
        raise ConnectionResetError("broken pipe")

    ws.send_str = _fail_send

    async def fake_sleep(_delay):
        pass

    monkeypatch.setattr(gt.asyncio, "sleep", fake_sleep)
    await conn._ping_loop()
    # the failed send is caught and treated like a missed pong: close so the owner
    # reconnects, and the loop ends on its own (no second cycle needed).
    assert ws.closed


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        json.dumps(123),  # not a dict
        json.dumps({"op": "subscribed", "topic": ["control.out"]}),  # no data
        json.dumps({"data": "!!!not-base64!!!"}),  # undecodable
        json.dumps({"data": base64.b64encode(b"123").decode()}),  # decodes to a non-dict
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


async def test_connect_cancels_leftover_tasks():
    import asyncio

    conn = _conn(_FakeWS())

    async def _sleeper():
        await asyncio.sleep(100)

    leftover = asyncio.ensure_future(_sleeper())
    conn._ping_task = leftover  # a stale loop from a prior session
    await conn.connect()
    await asyncio.sleep(0)
    assert leftover.cancelled()  # reconnect cancelled it, so it can't close the fresh socket
    await conn.disconnect()
