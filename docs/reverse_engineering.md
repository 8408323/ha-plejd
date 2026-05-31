# Reverse engineering Plejd

All protocol knowledge here comes from **our own** analysis of the Plejd Android
app and BLE traffic. The app (`com.plejd.plejdapp`, v7.2.1) is a **.NET MAUI**
application — the logic lives in managed assemblies (`Plejd.dll`, `Plejd.Shared`),
not in the Java/dex layer.

Plejd has two surfaces:

1. **Cloud (HTTPS, setup only).** Logging in returns the site's **crypto key** and
   the device list (BLE addresses, output addresses, dimmable flags).
2. **BLE mesh (local, ongoing).** Control and state run over BLE GATT. The phone
   (or Home Assistant) connects to one mesh device and it relays to the rest.
   Datavector payloads are encrypted with the site crypto key, keyed on the
   connected device's BLE address.

## Extracting the app's logic

The managed assemblies are AOT-compiled and bundled in a **.NET assembly store**
inside `lib/arm64-v8a/libassemblies.arm64-v8a.blob.so` (split APK). Layout:

- ELF `.so` with a `payload` section at file offset `0x4000` holding an **XABA**
  store (v2 header: magic, version, entry_count, index_entry_count, index_size).
- Each assembly is an **XALZ** record: `"XALZ"` + uint32 index + uint32
  uncompressed-size + an **LZ4 block**. Decompress (stopping at the uncompressed
  size) to recover the original `.dll`.

`tools/apk/` (gitignored) holds the extractor and the decompiled output. Decompile
with [ILSpy](https://github.com/icsharpcode/ILSpy) (`ilspycmd`). The key classes:
`PlejdConstants.BleCharacteristics`, `BleCrypto`, `CryptableExtension`, `BleCom`.

## BLE GATT layout

Service + characteristics share the base `31BA0001-6085-4726-BE45-040C957391B5`,
with the 3rd 16-bit group varying:

| Suffix | Name (app)             | Role |
|--------|------------------------|------|
| `0001` | Service                | GATT service |
| `0002` | NodeIndex              | node index |
| `0003` | NodeIndexData          | node index data |
| `0004` | **Datavector**         | **write mesh commands here** (encrypted) |
| `0005` | **LastChangedDatavector** | **state-change notifications** (encrypted) |
| `0006` | AccessAddress          | device address used for crypto |
| `0007` | DeviceFirmwareUpdate   | DFU |
| `0008` | CryptoKey              | crypto-key delivery (Diffie-Hellman) |
| `0009` | AuthKey                | login challenge/response |
| `000A` | PingPong               | verify-login ping |
| `000B` | SpecialCommand         | special commands |
| `000C` | ProductSpecific        | product-specific |

Only **Datavector** and **LastChangedDatavector** payloads are encrypted; the
auth/ping/key-exchange characteristics are plaintext.

## Crypto (`BleCrypto`)

**Payload cipher — `EncryptDecryptAes128Ecb(address, data, key)`** (symmetric):

```
seed       = address ++ address ++ address[:4]      # 6 + 6 + 4 = 16 bytes
keystream  = AES-128-ECB(key, seed)                 # one 16-byte block
out[i]     = data[i] XOR keystream[i % 16]
```

- `address` = the device's BLE MAC, **reversed** (6 bytes).
- `key` = the 16-byte site crypto key, or the default-mesh key
  `00 11 22 33 44 55 66 77 88 99 AA BB CC DD EE FF` for an unconfigured device.
- Encryption applies only to firmware `>= 20160801163820`; older devices are plaintext.

Implemented in [`custom_components/plejd/crypto.py`](../custom_components/plejd/crypto.py).

**Login response — `Response(challenge, key)`:**

```
response = fold_32_to_16( SHA256( challenge XOR key ) )
   where fold(x)[i] = x[i] XOR x[i + 16]   # 32-byte digest folded to 16
```

**Crypto-key delivery** uses a custom 64-bit Diffie–Hellman (base 2, modulus
`15734018190158744081`) with an 8-byte-repeating XOR; `GenerateSharedKey` =
`SHA256(secret ++ remotePub ++ localPub ++ reverse(deviceId))[:16]`.

## Login / auth handshake (`CryptableExtension`)

1. Connect; discover the service.
2. Read **AccessAddress** (`0006`) — the address fed to the cipher.
3. Challenge: write empty to **AuthKey** (`0009`), receive the challenge (notify/read),
   compute `Response(challenge, cryptoKey)`, write it back to **AuthKey**.
4. Verify: write a random byte to **PingPong** (`000A`); a correct login echoes
   `byte + 1`.
5. Send commands to **Datavector** (`0004`); subscribe to **LastChangedDatavector**
   (`0005`) for state.

## Mesh command framing

Datavector payloads carry a 5-byte header; the command is a **2-byte big-endian**
opcode at offset 3, followed by command data, all XOR-encrypted as above.

Key opcodes (from the app's mesh command schema, 194 commands total):

| Opcode | Name | Payload |
|--------|------|---------|
| `0x00C8` | Output state and level | `output(1)`, `state(1)`, `level(2)` — on/off + brightness |
| `0x00C9` / `0x00CA` | Output min / max level | `channel(1)`, `level(2)` |
| `0x0021` | Execute scene | `scene(1)` only, **DontRespond** type (the app's `ExecuteScene`; `index+0x80` = power-off variant). The `slewrate`/`level` fields belong to scene *configuration* (`0x0022`), not execution. |
| `0x0195` | Input state and level | `channel(1)`, `state(1)`, `level(2)` — state notification |
| `0x001B` | System time | `type(1)`, … |
| `0x0000` / `0x0003` / `0x0004` | Device type / MAC / firmware | query/response |

## Cloud

- Auth host: **`auth.api.plejd.cloud`** (`installations`, `sites` resources). The
  site object holds `PlejdMesh.CryptoKey` (the master key) and the device list.
- Realtime / gateway comms use **NATS** (subjects for gateway firmware, response
  inboxes, site events). A Plejd gateway lets the cloud reach the mesh remotely.

The exact cloud request/response shapes are best confirmed with a live capture
(see below) — that's issue #2.

## Capture methods

### BLE HCI snoop (the on-air protocol)

1. Phone → Developer options → enable **Bluetooth HCI snoop log**.
2. Drive the Plejd app (toggle lights, set brightness, run a scene).
3. Pull the log: `adb pull /sdcard/btsnoop_hci.log tools/` (path varies — check
   `adb bugreport`). Open in Wireshark, filter on the Datavector ATT writes/notifies.

### APK / assembly analysis (no phone needed once pulled)

`adb shell pm path com.plejd.plejdapp`, pull `base.apk` + `split_config.arm64_v8a.apk`,
then extract + decompile as described above.

### Cloud capture (mitmproxy)

`mitmdump -s tools/capture.py --listen-host 0.0.0.0 --listen-port 8888 --ssl-insecure`
for the login → site → crypto-key calls. The BLE traffic does not cross the proxy.

## Secrets

The crypto key, account credentials, session tokens, BLE addresses, and all
capture/decompile artifacts are secrets. `tools/apk/` and the capture artifacts
(`btsnoop_hci*`, `*.pcap`, `*.cfa`, `*.log`, `capture-*.txt`) are gitignored. The
decompiled app code is Plejd's copyrighted IP — keep it out of git; document facts
(opcodes, UUIDs, algorithms) in our own words instead.
