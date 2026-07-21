# Plejd Gateway (remote / cloud) control protocol

Reverse-engineered from the Plejd Android app's .NET assemblies (`Plejd.Shared`
`MeshWebsocketProvider`, `Host`/`WebsocketHost`, `PersistentBLEWebsocketProvider`,
`MeshStateReport`). This is the **remote** control path used when the phone is not
in BLE range of the mesh — it relays mesh commands to a **Plejd Gateway (GWY-01)**
over the Plejd cloud. It co-exists with local BLE; the app prefers it when
`!IsLoggedInToMesh && site.IsEnabledForRemoteControl()`.

> Status: decoded from the app; core message flow (**live-validated** 2026-05-31,
> see below) and the full pub/sub envelope, `MeshStateRequest`/`MeshStateReply`,
> and raw `mesh.in`/`mesh.out` relay (**live-validated** 2026-07-21 against a real
> GWY-01 + WireGuard-mode capture, see `docs/reverse_engineering.md`) are confirmed.
> `cloud.plejd.com` (Parse `functions/*`, used for setup/auth, not this transport) was
> found certificate-pinned for at least two calls (a scene-save, a Semesterläge
> fetch) — whether this also affects the login/`getSiteById` setup flow on that same
> host is unconfirmed. See `docs/reverse_engineering.md`'s Capture methods section
> before assuming either way.

## Transport at a glance

- A **WebSocket** to `wss://ws-ie.api.plejd.cloud` carrying a NATS-like pub/sub of
  JSON messages. The app talks to **subjects/topics** `mesh.in` / `mesh.out`
  (mesh traffic) and `control.in` / `control.out` (control: subscribe, mesh-state,
  ping). `*.in` = client→cloud, `*.out` = cloud→client.
- **No mesh crypto on this path.** The websocket carries **plaintext** command
  structure; the gateway holds the site crypto key and encrypts onto the mesh.
  (Confirmed by `RepackageLastChangedDatavectorWebsocketPacket`, which rebuilds a
  plaintext `[addr,0x01,type,opHi,opLo,data]` Datavector vector from the wire.)
- Auth re-uses the **Parse session token** (no separate OAuth needed for control —
  `auth.api.plejd.cloud` OAuth is for granting *remote-access permission* to a user,
  not per-connection auth).

## Production hosts (`Host` per environment; Production shown)

| Role | URL |
|------|-----|
| Parse (login + site/crypto-key/devices) | `https://cloud.plejd.com/parse/` |
| **Remote mesh control WebSocket** | `wss://ws-ie.api.plejd.cloud` (health: `https://ws-ie.api.plejd.cloud/status`) |
| Authorization (OAuth remote-access grant) | `https://auth.api.plejd.cloud` (ApiKey `2395e4be0fc2435f8900ceba483f832c`) |
| Remote API | `https://remote.api.plejd.cloud` |
| NATS (gateway *firmware update* only — JWT/NKey creds, separate) | `Host.Nats.URL` |

## Connection handshake

`MeshWebsocketProvider.Connect(sessionToken, installationId, siteId, resourceSetId)`
opens the WebSocket with these request headers:

```
Client-Type:     app
Authorization:   Bearer <Parse sessionToken>
Site-ID:         <siteId GUID>
Resource-Set-ID: <resourceSetId>
Client-ID:       <installationId GUID>
```

- `sessionToken` — the Parse `sessionToken` from `/parse/login` (we already fetch
  it; the config entry stores email+password, so re-login to refresh).
- `siteId` — the site GUID (`CONF_SITE_ID`).
- `resourceSetId` — from the site's `resourceSets[]` (the set whose
  `AllowedRemoteControlUsers` / `remoteAccessUsers` includes the logged-in user).
- `installationId` — a stable client GUID (Parse Installation id); generate + persist.

After connect, the client subscribes and requests an initial mesh state
(`control.in`), then receives a `MeshStateReply` on `control.out`.

## Message envelope

Every WebSocket message is JSON published to a topic. Outgoing publish:

```jsonc
// topic: "mesh.in"  (or "control.in")
{ "op": "publish", "ack": <bool>, "data": "<base64(utf8(<inner JSON>))>" }
```

Incoming messages (`WebSocketTopicMessage`) carry `Topic`, `Operation`, and `Data`
(again `base64(utf8(json))`). The client matches a reply by topic + op + by
comparing inner-`data` fields (e.g. echoes the same `data` for a publish ack on
`mesh.out` with op `"published"`).

## Sending a mesh command — `mesh.in`

`WriteData(payload)` where `payload` is the **plaintext** Datavector vector
`[addr, 0x01, type, opHi, opLo, data...]` (our `protocol.encode_command` output,
*before* XOR encryption):

1. Repackage to a 23-byte websocket packet (see below) → base64 → `raw`.
2. Inner JSON: `{ "raw": "<base64(23-byte packet)>", "index": <addr (payload[0])> }`.
3. Envelope: `{ "op":"publish", "ack":<bool>, "data": base64(utf8(inner)) }` → topic `mesh.in`.
4. If `ack`, await a `mesh.out` message with op `"published"` echoing the same `data`.

### `RepackageAntennaPacketToWebsocketPacket` (23-byte mesh packet)

From antenna packet `a = [addr, 0x01, type, opHi, opLo, d0, d1, ...]`:

```
out = bytearray(23)
out[0] = a[2]                 # command type
out[1] = a[4]                 # opcode LOW  (opcode is little-endian on the wire here)
out[2] = a[3]                 # opcode HIGH
n      = len(a) - 5           # data length
out[3] = n
out[4:4+n] = a[5:5+n]         # data bytes
# (out[0..2] are written from a[2..4] then bytes 1 and 2 are swapped → the above)
```

i.e. **drop** the address (`a[0]`) and marker (`a[1]=0x01`), keep command type,
store the opcode **little-endian**, then a length byte and the data. The address
travels separately as `index`.

### Reverse (incoming state) — `RepackageLastChangedDatavectorWebsocketPacket`

Given a 23-byte ws packet `w` and the originating `nodeIndex` (address), rebuild the
plaintext Datavector vector that our existing `protocol.decode_command` understands:

```
n = w[3]
out = [nodeIndex, 0x01, w[0], w[2], w[1]] + w[4:4+n]
#       addr       marker  type  opHi  opLo  data
```

## Incoming state push — `mesh.out`

State changes (our own commands **and** physical/off-app changes) arrive unsolicited on
`mesh.out`, op `"update"` (and `"published"` without a `publisher` flag — the gateway's
own relay). The inner JSON is the **same shape as an outgoing command**:

```jsonc
{ "raw": "<base64(23-byte packet)>", "index": <nodeIndex> }
```

Decode it with the reverse repackage above (`repackage_ws_to_command(raw, index)`) →
`protocol.decode_command` → `protocol.decode_output_state`, keyed by the vector's
address — exactly like a BLE LastChanged broadcast. **Live-validated** 2026-05-31: after
a command the gateway pushes the `0x00C8` echo and the keyed `0x0098` state broadcast.
So the integration needs no polling beyond the connect-time snapshot.

## Mesh state — `control.in` → `control.out`

To request a snapshot, publish to `control.in` (op `publish`) and await a
`control.out` message whose inner JSON has `controlType: "MeshStateReply"`.
`RequestNewMeshState()` triggers a fresh report.

`MeshStateReport` parses that dict: it must contain `controlType: "MeshStateReply"`;
every other key is a **mesh address** (int) whose value is the **string**
`"<state>,<level>"` (e.g. `"11": "0,65534"`) — `state` is `"0"`/`"1"` and `level` is a
uint16. → `OutputState(on, level)`. (Same on/off + 16-bit level model as the BLE
`0x0098` broadcast; HA brightness is the level high byte.) **Live-validated** against
a real gateway 2026-05-31: the reply arrives on `control.out` op `update`.

Keep-alive: `control.in` `{controlType:"Ping"}` → `control.out` `{controlType:"Pong"}`.

A 2026-07-21 capture observed unsolicited `Pong` pushes from the cloud roughly every
~70s, with no outgoing `Ping` visible in that capture window — the app's real cadence
and whether the cloud ever pings proactively on its own timer are unconfirmed from
this alone (the window may simply have missed an outgoing `Ping`). This integration's
`GATEWAY_PING_INTERVAL` (60s) + `GATEWAY_PONG_TIMEOUT` (10s) in `gateway_transport.py`
is a deliberate, independent connection-health design choice — an app-level keep-alive
to detect a hung socket the WS heartbeat alone wouldn't catch — not an attempt to
mirror the app's own cadence bit-for-bit, so no code change follows from this
observation alone. Worth re-confirming with a longer capture if the exact interval
ever matters (e.g. to reduce false-positive reconnects).

## Detecting gateway availability (from the cloud site data we already fetch)

- `getSiteList` partial site: `gateway: ["<deviceId>", …]` and
  `hasRemoteControlAccess: <bool>`.
- `getSiteById`: `gateways: [<PlejdGatewayDevice>]`, and `resourceSets[]` with
  `remoteAccessUsers` / `AllowedRemoteControlUsers` → the `resourceSetId` to use.
- `Site.IsEnabledForRemoteControl()` gates the app's use of this path.

## Mapping to this integration

- The app abstracts both paths behind `IMeshDeliveryProvider` (BLE =
  `…BleProvider`, remote = `MeshWebsocketProvider` via `PersistentBLEWebsocketProvider`).
  Mirror that with a transport seam; **gateway-first when present, else BLE**.
- Reuse `protocol.encode_command` (plaintext) for the gateway — **no `crypto`** on this
  path. `gateway` codec only repackages + envelopes + parses state reports.
- Need to persist at setup: a client `installationId` (GUID) and the `resourceSetId`;
  refresh the Parse `sessionToken` via the stored email/password.
