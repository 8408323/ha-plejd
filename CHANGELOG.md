# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Project scaffold: HACS metadata, CI (ruff, pytest, hassfest, HACS validation,
  CodeQL), issue/PR templates, and the dotclaude tooling layer.
- Bluetooth-discovery config flow skeleton and integration entry setup/teardown.
- Reverse-engineering tooling (`tools/`) and capture documentation.
- Decoded the Plejd protocol from the Android app (.NET MAUI): authoritative BLE
  GATT characteristic map, AES-128-ECB mesh crypto + SHA-256 login handshake
  (`crypto.py`), mesh command opcodes, and cloud/NATS architecture — written up in
  `docs/reverse_engineering.md` and `const.py`.
