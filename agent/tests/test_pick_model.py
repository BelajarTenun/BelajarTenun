"""Uji pemilihan model Live: model pensiun dilewati, model pertama yang tersambung dipakai."""
import asyncio
import os
import sys
import types
import contextlib

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
os.environ.setdefault("GOOGLE_API_KEY", "dummy")
import main  # noqa: E402


class FakeLive:
    def __init__(self, ok):
        self.ok, self.calls = ok, []

    def connect(self, model, config):
        self.calls.append(model)

        @contextlib.asynccontextmanager
        async def cm():
            if model not in self.ok:
                raise RuntimeError(f"model {model} not found")
            yield object()

        return cm()


def run(ok, candidates):
    live = FakeLive(ok)
    fake = types.SimpleNamespace(Client=lambda **kw: types.SimpleNamespace(aio=types.SimpleNamespace(live=live)))
    sys.modules["google.genai"].Client = fake.Client
    main._live_pick.update(model=None, at=0.0)
    return asyncio.run(main.pick_live_model(candidates)), live.calls


def test_fallback_ke_cadangan():
    model, calls = run({"cadangan"}, ["pensiun", "cadangan"])
    assert model == "cadangan" and calls == ["pensiun", "cadangan"]


def test_semua_gagal_memberi_galat_jelas():
    try:
        run(set(), ["a", "b"])
    except RuntimeError as e:
        assert "a:" in str(e) and "b:" in str(e)
    else:
        raise AssertionError("harus gagal")


def test_cache_dipakai():
    run({"a"}, ["a"])
    live = FakeLive(set())
    sys.modules["google.genai"].Client = lambda **kw: types.SimpleNamespace(aio=types.SimpleNamespace(live=live))
    assert asyncio.run(main.pick_live_model(["a"])) == "a" and live.calls == []
