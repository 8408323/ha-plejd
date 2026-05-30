"""Plejd BLE mesh crypto.

Reverse-engineered from the Plejd Android app (`Plejd.Shared` `BleCrypto`). The
mesh payload cipher is an AES-128-ECB keystream XOR; login uses a SHA-256
challenge/response. See docs/reverse_engineering.md.
"""

from __future__ import annotations

import hashlib

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

ADDRESS_LEN = 6
KEY_LEN = 16


def keystream_block(address: bytes, key: bytes) -> bytes:
    """AES-128-ECB over (address ++ address ++ address[:4]); the 16-byte keystream."""
    if len(address) != ADDRESS_LEN:
        raise ValueError(f"address must be {ADDRESS_LEN} bytes, got {len(address)}")
    if len(key) != KEY_LEN:
        raise ValueError(f"key must be {KEY_LEN} bytes, got {len(key)}")
    buf = address + address + address[:4]
    encryptor = Cipher(algorithms.AES(key), modes.ECB()).encryptor()
    return encryptor.update(buf) + encryptor.finalize()


def encrypt_decrypt(address: bytes, data: bytes, key: bytes) -> bytes:
    """Encrypt or decrypt a Datavector payload (the operation is symmetric).

    `address` is the device's BLE MAC reversed (6 bytes); `key` is the 16-byte site
    crypto key. out[i] = data[i] XOR keystream[i % 16]. Rejects malformed inputs so
    hostile or corrupt BLE data fails predictably.
    """
    ks = keystream_block(address, key)
    return bytes(b ^ ks[i % 16] for i, b in enumerate(data))


def auth_response(challenge: bytes, key: bytes) -> bytes:
    """Login response written to the AuthKey characteristic: fold(SHA256(challenge XOR key)).

    Matches the device: the first 16 bytes of an (untrusted) challenge are used; a
    shorter challenge is rejected rather than raising deep in the hash.
    """
    if len(key) != KEY_LEN:
        raise ValueError(f"key must be {KEY_LEN} bytes, got {len(key)}")
    if len(challenge) < KEY_LEN:
        raise ValueError(f"challenge must be at least {KEY_LEN} bytes, got {len(challenge)}")
    xored = bytes(challenge[i] ^ key[i] for i in range(KEY_LEN))
    digest = hashlib.sha256(xored).digest()
    return bytes(digest[i] ^ digest[i + KEY_LEN] for i in range(KEY_LEN))
