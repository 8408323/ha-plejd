"""Tests for the Plejd mesh crypto."""

from __future__ import annotations

import pytest
from plejd.crypto import auth_response, encrypt_decrypt, keystream_block

_KEY = bytes.fromhex("00112233445566778899aabbccddeeff")
_ADDR = bytes.fromhex("0102030405a0")  # reversed device MAC, 6 bytes


def test_keystream_block_is_16_bytes_and_deterministic():
    ks = keystream_block(_ADDR, _KEY)
    assert len(ks) == 16
    assert ks == keystream_block(_ADDR, _KEY)


def test_keystream_depends_on_address():
    other = bytes.fromhex("0102030405a1")
    assert keystream_block(_ADDR, _KEY) != keystream_block(other, _KEY)


def test_encrypt_decrypt_round_trips():
    plain = bytes(range(40))  # longer than one block to exercise i % 16
    cipher = encrypt_decrypt(_ADDR, plain, _KEY)
    assert cipher != plain
    assert encrypt_decrypt(_ADDR, cipher, _KEY) == plain


def test_encrypt_xors_with_repeating_keystream():
    ks = keystream_block(_ADDR, _KEY)
    plain = bytes(20)  # zeros -> output equals the repeating keystream
    cipher = encrypt_decrypt(_ADDR, plain, _KEY)
    assert cipher == bytes(ks[i % 16] for i in range(20))


def test_auth_response_is_16_bytes_and_deterministic():
    challenge = bytes(range(16))
    resp = auth_response(challenge, _KEY)
    assert len(resp) == 16
    assert resp == auth_response(challenge, _KEY)


def test_auth_response_changes_with_challenge():
    a = auth_response(bytes(range(16)), _KEY)
    b = auth_response(bytes(range(1, 17)), _KEY)
    assert a != b


# Known-answer vectors pin the exact reverse-engineered algorithm (AES seed
# construction, ECB mode, XOR keystream, and the 32->16 fold). A change to any of
# those — seed byte order, cipher mode, or fold — breaks these, not just round-trips.
def test_known_answer_vectors():
    assert keystream_block(_ADDR, _KEY).hex() == "4701ed0f35e501386c063bc34fc1db10"
    assert encrypt_decrypt(_ADDR, bytes(range(8)), _KEY).hex() == "4700ef0c31e0073f"
    assert auth_response(bytes(range(16)), _KEY).hex() == "0b31c067a9e97b426979227c7227ce7a"


def test_auth_response_uses_first_16_bytes_of_longer_challenge():
    base = bytes(range(16))
    assert auth_response(base, _KEY) == auth_response(base + b"\xff\xff", _KEY)


@pytest.mark.parametrize("address", [b"", bytes(5), bytes(7)])
def test_keystream_rejects_bad_address_length(address):
    with pytest.raises(ValueError, match="address must be 6 bytes"):
        keystream_block(address, _KEY)


def test_keystream_rejects_bad_key_length():
    with pytest.raises(ValueError, match="key must be 16 bytes"):
        keystream_block(_ADDR, bytes(15))


def test_auth_response_rejects_bad_key_length():
    with pytest.raises(ValueError, match="key must be 16 bytes"):
        auth_response(bytes(16), bytes(8))


def test_auth_response_rejects_short_challenge():
    with pytest.raises(ValueError, match="challenge must be at least 16 bytes"):
        auth_response(bytes(15), _KEY)
