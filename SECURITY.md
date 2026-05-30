# Security Policy

## Reporting a vulnerability

Please report suspected security issues **privately** via GitHub's
[security advisory flow](https://github.com/8408323/ha-plejd/security/advisories/new),
not as a public issue. I'll acknowledge as soon as I can.

## Sensitive data in this project

This integration handles real secrets. When sharing logs, diagnostics, issues, or
PRs, **redact**:

- the Plejd **site crypto key** (the master secret for your whole mesh),
- your Plejd account email and password,
- session tokens,
- BLE device addresses,
- any capture artifacts (`*.pcap`, `*.cfa`, `*.log`, `btsnoop_hci*`,
  `capture-*.txt`) — the crypto-key exchange and auth challenge are in there.

These paths are gitignored. The integration never logs the crypto key or
credentials; if you ever see one in a log, that's a bug — please report it.

## Scope

This is an unofficial, reverse-engineered integration, not affiliated with Plejd.
It controls real lighting and relay hardware; treat it accordingly.
