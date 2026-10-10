import common
from pron import pron

ALPHABET = set("abcdefghijklmnopqrstuvwxyz'")


def test_generic_tokens():
    assert pron("'Cause") == ["cause"]
    assert pron("y'all") == ["y'all"]
    assert pron("b-better,") == ["b", "better"]
    assert pron("ooh-oh") == ["ooh", "oh"]


def test_abbreviation_is_spelled_as_sung():
    assert pron("Mr.") == ["mister"]


def test_every_lyric_token_is_alignable():
    lines, _ = common.load_lyrics()
    for l in lines:
        for tok in l["text"].split(" "):
            subs = pron(tok)
            assert subs, tok
            assert set("".join(subs)) <= ALPHABET, tok
