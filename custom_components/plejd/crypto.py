"""Plejd BLE mesh crypto.

Reverse-engineered from the Plejd Android app (`Plejd.Shared` `BleCrypto`). The
mesh payload cipher is an AES-128-ECB keystream XOR; login uses a SHA-256
challenge/response. See docs/reverse_engineering.md.
"""

from __future__ import annotations

import hashlib

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes


def keystream_block(address: bytes, key: bytes) -> bytes:
    """AES-128-ECB over (address ++ address ++ address[:4]); the 16-byte keystream."""
    buf = address + address + address[:4]
    encryptor = Cipher(algorithms.AES(key), modes.ECB()).encryptor()  # noqa: S305 - matches the device
    return encryptor.update(buf) + encryptor.finalize()


def encrypt_decrypt(address: bytes, data: bytes, key: bytes) -> bytes:
    """Encrypt or decrypt a Datavector payload (the operation is symmetric).

    `address` is the device's BLE MAC reversed (6 bytes); `key` is the 16-byte site
    crypto key. out[i] = data[i] XOR keystream[i % 16].
    """
    ks = keystream_block(address, key)
    return bytes(b ^ ks[i % 16] for i, b in enumerate(data))


def auth_response(challenge: bytes, key: bytes) -> bytes:
    """Login response written to the AuthKey characteristic: fold(SHA256(challenge XOR key))."""
    xored = bytes(challenge[i] ^ key[i] for i in range(len(key)))
    digest = hashlib.sha256(xored).digest()
    return bytes(digest[i] ^ digest[i + 16] for i in range(16))
