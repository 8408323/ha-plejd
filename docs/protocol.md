# Plejd protocol reference

Decoded from our own analysis of the Plejd Android app (.NET MAUI; assemblies
`Plejd.dll` / `Plejd.Shared`). This is the feature-complete reference; the
extraction method and crypto details are in
[reverse_engineering.md](reverse_engineering.md).

Two surfaces: a one-time **Parse cloud** login (to get the site crypto key +
devices) and the local **BLE mesh** (everyday control). No protobuf anywhere —
the cloud is JSON, the mesh is the fixed binary command format below.

## 1. Cloud (Parse Server)

Production: `https://cloud.plejd.com/parse/`, app id
`zHtVqXt8k4yFyk2QGmgp48D9xZr2G94xWYnF4dak`. All requests send header
`X-Parse-Application-Id`. Login is plain Parse (the `auth.api.plejd.cloud` OAuth
host is a separate remote-gateway/NATS system, not needed for setup).

1. `POST /parse/login` header `X-Parse-Application-Id`, body
   `{"username": <email lowercased>, "password": <pw>}` → user object with
   `sessionToken` (`"r:…"`). Error `code 101` = bad credentials.
2. Add `X-Parse-Session-Token: <sessionToken>` to all later calls.
3. `POST /parse/functions/getSiteList` (no body) → `{"result": [{siteId, …}]}`.
4. `POST /parse/functions/getSiteById` body `{"siteId": <id>}` →
   `{"result": [site]}`. This one object carries everything below.

### Site JSON (the fields the integration needs)

- `plejdMesh.cryptoKey` — hex 16-byte AES key (the **master secret**).
- `deviceAddress[deviceId]` → int mesh address (one per device).
- `outputAddress[deviceId][outputIndex]` → int mesh address (one per output).
- `plejdDevices[]` — physical units: `deviceId`, `hardwareId` (numeric string →
  `HardwareType`), firmware.
- `devices[]` (`DeviceInfo`) — controllable outputs: `deviceId`, `outputType`
  (`Unknown/Light/Relay/Coverable/Thermostat`), `title`, `roomId`, traits.
- `rooms[]`, `scenes[]` (sceneId → mesh scene index).

Join `devices[]` (logical/output) to `plejdDevices[]` (physical) by `deviceId`.
Multi-output units appear as a master + `isFellowshipFollower` entries.

## 2. Device model

Capability is two layers: the **hardware type** sets the category, the **per-output
traits / `outputType`** refine it (e.g. a CTR-01 is a light only if its output has
the Dimmable trait; a relay can never dim).

`DeviceTrait` (bitmask): `Powerable=0x01 Dimmable=0x02 WhiteTunable=0x04
Groupable=0x08 Coverable=0x10 Climate=0x20 CoverTiltable=0x40`.
`is_dimmable = hardware is a dimmable class AND output has the Dimmable trait`.

| Type (id) | Product | Category | HA platform |
|-----------|---------|----------|-------------|
| 1/2 | DIM-01/02 | dimmer | light (brightness) |
| 3 | CTR-01 | load controller | light if Dimmable else switch |
| 5/36/23/228 | LED-10/75(+v2) | LED driver | light (+CCT if tunable) |
| 167/199/9/41 | DWN-01/02(+LC) | downlight | light (+CCT) |
| 7/39/40/71/105/103/135 | CCL/PLF/SPD/LPN/TRL/OUT-01/02 | dimmable load/outlet | light (or switch for relay outlets) |
| 8/17/18 | SPR-01 / REL-01-2P / REL-02 | relay | switch |
| 16 | JAL-01 | venetian blind | cover (tilt) |
| 196 | MTR-01 | motor | cover |
| 100 | TRM-01 | thermostat | climate (+ illuminance) |
| 70 | WMS-01 | motion sensor | binary_sensor (motion) + sensor (lux) |
| 102 | WIN-01 | window/door | binary_sensor (opening) |
| 6/38/10/42 | WPH-01 / WRT-01 | wall switch / rotary | event (button presses) |
| 4/13/19/164 | GWY/DEV/EXT/FAK | gateway / aux | device only |

Multi-output devices (DIM-02, REL-02, OUT-02) expose one address per output.
Wall switches have inputs only (0 outputs).

## 3. BLE command framing

A vector written to the **Datavector** characteristic (before XOR-encryption):

```
[address] [0x01] [command_type] [opcode_hi] [opcode_lo] [payload…]
```

- `address` = recipient mesh node/output address (`0x00` = broadcast).
- `0x01` = constant protocol-version marker.
- `command_type`: `Write=0 Ack=1 Read=2 DontRespond=0x10 DontSendOnMesh=0x20
  AddressByDeviceId=0x40` (combinable). Outbound control uses **DontRespond**.
- opcode = 2-byte **big-endian**.

State changes arrive on **LastChangedDatavector** with the same framing (responses
have the Ack bit set in `command_type`).

### Key opcodes

| Opcode | Name | Payload | Use |
|--------|------|---------|-----|
| `0x00C8` (200) | output_state_and_level | set `[output, on?1:0, level, level]`; read `[output]` | on/off + brightness; **primary** light/switch control + state |
| `0x0098` (152) | group_state_and_level | `[on?1:0, level, level]` | fast group/all broadcast |
| `0x0021` (33) | scene | `[index]` (DontRespond); `index+0x80` = power-off scene | trigger scene |
| `0x0420` (1056) | output_set | mini-package (Source `03 08`, Channel `0a <out>`, StateNLevel `00 <on> <lvl> <lvl>`); cover/CCT sub-packages | modern firmware control |
| `0x0306` (774) | jal_set_level | `[u16 level]` | JAL blind position |
| `0x045C` (1116) | trm_setpoint | `[u16le °C×10]` | thermostat target |
| `0x045F` (1119) | trm_operating_mode | `[mode]` | HVAC mode |
| `0x0195` (405) | input_state_and_level | `[channel, on?1:0, level, level]` | input/button state notification |
| `0x002B` (43) | notify_events | `[u64 flags]` | device fault bitfield (see §4) |
| `0x001D` (29) | hardfault_reason | struct `code(u32le) line(u16le) message(ascii)` | crash diagnostics |
| `0x0000`/`0x0003`/`0x0004` | device type / MAC / firmware | — | device info |

The app exposes ~130 opcodes total (dim curves, input click/double/edge/rotate
config, time events/astro/DST, tunable-white/colour-temperature, DALI, 0–10V, LED
load type, interlock, fellowship, firmware DFU, gateway/network). Lights, switches,
scenes, covers, climate and sensors only need the rows above.

## 4. Faults & diagnostics

The mesh `get_error` opcode (`0x1F`) is defined but **unused** by the app. Real
device faults come from **`notify_events`** (`0x2B`) — a 64-bit `[Flags]` field:

`hard_fault soft_overcurrent heavy_overcurrent overtemperature
faceplate_detect_fail reset_watchdog reset_cpu_lock reset_pin reset_soft
settings_driver low_power_wdt temperature_throttling factory_reset_mesh_kept
boot_single_faulty_bank overloaded wrong_zcd uart_error dont_dim adv_timeout
product_hw_fault_a product_hw_fault_b group_setting_fault`.

Thermostats report a separate protection bitmask (`0x0485`/1157):
`overtemp relay_weld sensor_disconnect relay_pin_disconnect hv_lv_pair_mismatch
floor_temp_invalid`. `hardfault_reason` (`0x1D`) returns firmware-defined
`code`/`line`/`message` (no fixed table).
