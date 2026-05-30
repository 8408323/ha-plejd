"""Tests for the Plejd mesh crypto."""

from __future__ import annotations

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
