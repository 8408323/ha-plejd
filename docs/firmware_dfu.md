# Plejd firmware update (DFU) — protocol notes

How the Plejd app updates device firmware ("Update firmware" in the app). This is
**reverse-engineered from our own decompile of the Android app and our GATT
capture** — no third-party source. Nothing here has been exercised against a
device; it documents the wire protocol so an HA `update` entity could be designed.
We do **not** flash devices today (see *Why we don't ship this* below).

## Shape

Plejd devices run a Nordic nRF SoftDevice + a **Legacy-DFU bootloader**. Update is
two phases:

1. **Fetch** the signed firmware image from Plejd's cloud (per device hardware id).
2. **Transfer** it to the device over BLE using the Nordic Legacy DFU control
   protocol, with Plejd's own heatshrink compression on top.

The device is normally in *application* mode. The app first asks it to reboot into
the *bootloader*, which then exposes a separate DFU GATT service.

## Entering the bootloader (buttonless DFU)

In application mode the app writes a 4-byte **EnterDFU** mesh command to the
DeviceFirmwareUpdate characteristic and the device reboots into its bootloader:

- char `0007` → `PLEJD_CHAR_DFU_UUID` (`DeviceFirmwareUpdate`), the same one in
  `const.py`.
- payload: `BleCommands.EnterDFUCommand` (a 4-byte mesh command; exact bytes to be
  confirmed from a live capture — it is a precomputed constant in the app).

After reboot the device advertises the DFU service and the app reconnects to it.

## DFU GATT service (bootloader mode)

| UUID | Role |
|------|------|
| `2BF01530-84FB-49B2-9CB9-5EDE2A16434B` | DFU service |
| `2BF01531-…` | **Control Point** (write + notify) |
| `2BF01532-…` | **Packet** (write-without-response, the data firehose) |
| `2BF01534-…` | **Version** (read — DFU/bootloader version) |

These mirror Nordic's Legacy DFU layout (`00001530-1212-EFDE-1523-…`) under Plejd's
own `2BF015xx` base UUID.

## Control-point opcodes

Sent on the Control Point characteristic (`2BF01531`):

| Op | Name | Bytes written |
|----|------|---------------|
| 1 | Start DFU | `01 <mode>` — mode `02`=compressed, `04`=raw |
| 2 | Receive Init | `02 00` (start receive) … `02 01` (init complete) |
| 3 | Receive Firmware | `03` |
| 4 | Validate | `04` |
| 5 | Activate & Reset | `05` |
| 6 | System Reset | `06` |
| 7 | Request received image size | `07` |
| 8 | Request packet-received notification | `08 <interval-u16>` |
| 16 (0x10) | **Response** (device→app notify) | `10 <reqOp> <status>` |
| 17 (0x11) | **Packet-received notification** (device→app) | `11 <bytesReceived-u32>` |

Response status codes: `1`=Success, `2`=InvalidState, `3`=NotSupported,
`4`=DataSize, `5`=CRCError, `6`=OperationFailed, `7`=NoMemory, `8`=NoMemoryPstore.

## Transfer sequence

Packet size is **20 bytes**; images are chunked into 20-byte writes on the Packet
characteristic (`2BF01532`).

1. **Start DFU** → control point `01 <mode>`.
2. **Image sizes** → packet char, 12 bytes:
   `[compressedLen u32 LE][0 0 0 0][rawLen u32 LE]` (compressed mode);
   raw mode sends `compressedLen = 0`. The middle 4 bytes are a reserved
   (bootloader/SD-image) size, always 0 for Plejd app images.
3. **Receive Init: start** → control point `02 00`.
4. **Init/DAT packet** → packet char, 14 bytes — a Nordic Legacy DFU init packet:
   `FF FF` (device type = any) · `FF FF` (device rev = any) ·
   `FF FF FF FF` (app version = any) · `01 00` (softdevice-id count = 1) ·
   `64 00` (softdevice id `0x0064`) · `<crc16 LE>` (CRC-16 of the **raw** image).
   The `FF` wildcards tell the bootloader to accept the image regardless of the
   recorded type/rev/app-version.
5. **Receive Init: complete** → control point `02 01`.
6. **Receive Firmware** → control point `03`, then stream the (heatshrink-
   compressed) image in 20-byte chunks on the Packet char. The device acks every
   N packets via opcode `17` (packet-received notification); the app paces writes
   against those acks.
7. **Validate** → control point `04`. The device recomputes the image CRC and
   replies via opcode `16`; status `5` = CRC mismatch.
8. **Activate & Reset** → control point `05`. The bootloader swaps in the new
   image and reboots into the application.

## Compression

Images are **heatshrink**-compressed before transfer (`HeatshrinkEncoder` in the
app; LZSS-family, window/lookahead configured by the app). The init packet's CRC
is over the **raw** (decompressed) image; `GetFirmwareLengthPayload` carries both
the compressed length (what's actually sent) and the raw length (what the device
decompresses to and CRC-checks).

## Cloud side — getting the image

The firmware binaries are not in the app; they're downloaded from Plejd's cloud
keyed on the device **hardware id**:

- `FirmwareAssetController.DownloadAndTransferFirmwareAsset` downloads the asset
  blob for a device, then runs the BLE transfer above.
- `FirmwareController.IsCompatible(buildTime, hardwareId, meshCommand)` gates
  whether a given firmware build supports a given mesh command — the same check
  the app uses to decide if a feature (or an update) is available.
- The asset metadata trailer carries the CRC-16 used in the init packet
  (`new PlejdFirmwareImage(rawImage, metaData)` reads the CRC from the last 2
  bytes of `metaData`).

Fetching an asset uses the authenticated cloud session (the same login that
returns the crypto key + device list). The exact cloud-function name still needs
confirming from a capture.

## Over the gateway

The gateway path relays the same DFU control-point / packet writes; the gateway
holds the crypto key and forwards the bootloader traffic. The DFU protocol itself
is identical — only the transport differs (local GATT vs. gateway relay).

## Why we don't ship this

- **No images without a pending update.** Nothing to download/transfer until Plejd
  publishes a newer build for a device; there is nothing to test against today.
- **Bricking risk.** A failed/aborted Legacy-DFU transfer (link drop mid-stream,
  bad CRC, power loss) can leave a device stuck in the bootloader. This is the one
  operation in the integration that can physically break hardware.
- **Signed, opaque blobs.** The images are Plejd's; we only relay them. We add no
  value over the app for the actual flashing, and carry all the risk.

If we ever implement it, it should be an `update` entity that (a) reads the current
firmware version (mesh read `04`), (b) checks the cloud for a newer asset for the
hardware id, and (c) only ever transfers Plejd's signed image — never anything
locally built — with a clear "may brick the device" warning and a hard requirement
for a stable link.
