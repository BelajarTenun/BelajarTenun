"""BelajarTenun – agen tutor real-time: ruang LiveKit (lokal) <-> Gemini Live, tools ke mesin sesi.

Pola dari VisionClaw agent/main.py, disesuaikan untuk tutor tenun:
- HP/kacamata menerbitkan mic + kamera ke ruang LiveKit; agen ini bergabung sebagai peserta.
- Gemini Live (audio native + video) mendengar, melihat, dan menjawab dengan suara; bisa disela.
- Video ke model disampling menurut aktivitas suara: 1 fps saat murid bicara, 0,3 fps saat diam
  (VoiceActivityVideoSampler) + log jeda antar frame (StalenessSampler).
- Instruksi & daftar tools diambil dari server (/api/agent/session-config), jadi kurikulum tetap satu sumber.
- Setiap tool dieksekusi di mesin sesi server (/api/live/tool). Frame terbaru ikut dikirim agar check_my_work
  menilai apa yang benar-benar dilihat murid (attach_view).
- Hasil UI tool (HUD, kartu, demo) dikirim ke klien lewat topik data "bt.ui" (seperti "vc.ui" VisionClaw).
- Tracer teks-saja (tanpa gambar) dikirim berkelompok ke /api/trace; gagal kirim → diantrekan ulang.
- Relay check: jawaban dari knowledge base harus benar-benar terucap; bila tidak, diingatkan sekali.

Menjalankan (lihat docs/LIVEKIT.md):
    pip install -r agent/requirements.txt
    python agent/main.py dev
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import os
import re
import time
from datetime import datetime, timezone

import aiohttp
from PIL import Image
from livekit import rtc
from livekit.agents import Agent, AgentServer, AgentSession, JobContext, RoomInputOptions, RunContext, cli, function_tool
from livekit.agents.voice.agent_session import VoiceActivityVideoSampler
from livekit.plugins import google
from google.genai import types as genai_types

logger = logging.getLogger("belajartenun-agent")

SERVER = os.environ.get("BT_SERVER", "http://localhost:3000").rstrip("/")
AGENT_TOKEN = os.environ.get("AGENT_TOKEN", "")
# Satu file .env untuk server & agen: plugin Google membaca GOOGLE_API_KEY.
if os.environ.get("GEMINI_API_KEY") and not os.environ.get("GOOGLE_API_KEY"):
    os.environ["GOOGLE_API_KEY"] = os.environ["GEMINI_API_KEY"]
# Vertex AI: kredensial dari GOOGLE_APPLICATION_CREDENTIALS (service account) atau metadata server.
USE_VERTEX = os.environ.get("AI_PROVIDER") == "vertex" or (
    bool(os.environ.get("GOOGLE_CLOUD_PROJECT")) and not os.environ.get("GEMINI_API_KEY")
)
VERTEX_OPTS = (
    {
        "vertexai": True,
        "project": os.environ.get("GOOGLE_CLOUD_PROJECT"),
        "location": os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1"),
    }
    if USE_VERTEX
    else {}
)
UI_TOPIC = "bt.ui"
LIVE_COMPRESS_TRIGGER = int(os.environ.get("LIVE_COMPRESS_TRIGGER", "100000"))  # ~80% dari 128k
LIVE_COMPRESS_TARGET = int(os.environ.get("LIVE_COMPRESS_TARGET", "50000"))
LIVE_PROACTIVE = os.environ.get("LIVE_PROACTIVE") == "1"  # hanya untuk model yang mendukung proactive audio

# ---------------- Pemilihan model Live ----------------
# Model Live preview/GA pensiun cepat. Agen mencoba daftar model (dari server: cfg["models"]) dan memakai
# model pertama yang bisa membuka sesi; hasilnya di-cache per proses dan diuji ulang tiap 6 jam.
_live_pick: dict = {"model": None, "at": 0.0}


async def pick_live_model(candidates: list[str]) -> str:
    if _live_pick["model"] in candidates and time.time() - _live_pick["at"] < 6 * 3600:
        return _live_pick["model"]
    from google import genai

    client = genai.Client(**({"vertexai": True, "project": VERTEX_OPTS["project"], "location": VERTEX_OPTS["location"]} if USE_VERTEX else {}))
    errors = []
    for m in candidates:
        try:
            async with asyncio.timeout(10):
                async with client.aio.live.connect(model=m, config={"response_modalities": ["AUDIO"]}):
                    pass
            _live_pick.update(model=m, at=time.time())
            if m != candidates[0]:
                logger.warning("model Live %s tidak tersedia, memakai %s (%s)", candidates[0], m, "; ".join(errors))
            return m
        except Exception as e:  # model pensiun, tidak ada di region, atau kuota
            errors.append(f"{m}: {type(e).__name__}: {str(e)[:120]}")
    raise RuntimeError("Tidak ada model Live yang bisa dipakai: " + " | ".join(errors))


def _headers() -> dict[str, str]:
    return {"content-type": "application/json", "x-agent-token": AGENT_TOKEN}


async def api(method: str, path: str, body: dict | None = None) -> dict:
    async with aiohttp.ClientSession() as http:
        async with http.request(method, SERVER + path, headers=_headers(), json=body, timeout=aiohttp.ClientTimeout(total=30)) as r:
            data = await r.json(content_type=None)
            if r.status >= 400:
                raise RuntimeError(f"{path}: {r.status} {data}")
            return data


# ---------------- Kamera: frame terakhir (untuk attach_view) ----------------
class FrameHolder:
    def __init__(self) -> None:
        self.frame: rtc.VideoFrame | None = None
        self.arrived_at = 0.0

    def jpeg_b64(self, max_side: int = 640) -> str | None:
        if self.frame is None:
            return None
        rgba = self.frame.convert(rtc.VideoBufferType.RGBA)
        img = Image.frombuffer("RGBA", (rgba.width, rgba.height), bytes(rgba.data)).convert("RGB")
        img.thumbnail((max_side, max_side))
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=75)
        return base64.b64encode(buf.getvalue()).decode()


class StalenessSampler:
    """Membungkus sampler bawaan tanpa mengubah keputusannya; mencatat jeda antar frame ke model."""

    def __init__(self, tracer: "Tracer") -> None:
        self._inner = VoiceActivityVideoSampler(speaking_fps=1.0, silent_fps=0.3)
        self._tracer = tracer
        self.last_admit = 0.0

    def __call__(self, frame: rtc.VideoFrame, session: AgentSession) -> bool:
        ok = self._inner(frame, session)
        if ok:
            now = time.time()
            if self.last_admit:
                self._tracer.emit("view_gap", ms=round((now - self.last_admit) * 1000), speaking=session.user_state == "speaking")
            self.last_admit = now
        return ok


# ---------------- Tracer (teks saja) ----------------
class Tracer:
    FLUSH_AFTER, FLUSH_SECONDS, MAX_FIELD = 20, 5.0, 2000

    def __init__(self, base: dict) -> None:
        self.base = base
        self._events: list[dict] = []
        self._lock = asyncio.Lock()

    def emit(self, type_: str, **fields) -> None:
        ev = {**self.base, "type": type_, "ts": datetime.now(timezone.utc).isoformat(timespec="milliseconds")}
        for k, v in fields.items():
            ev[k] = v[: self.MAX_FIELD] + "…" if isinstance(v, str) and len(v) > self.MAX_FIELD else v
        self._events.append(ev)
        if len(self._events) >= self.FLUSH_AFTER:
            asyncio.create_task(self.flush())

    async def flush(self) -> None:
        async with self._lock:
            if not self._events:
                return
            batch, self._events = self._events, []
            try:
                await api("POST", "/api/trace", {"events": batch})
            except Exception:
                self._events = (batch + self._events)[-500:]  # lebih baik terlambat daripada hilang
                logger.exception("trace gagal, diantrekan ulang")

    async def pump(self) -> None:
        while True:
            await asyncio.sleep(self.FLUSH_SECONDS)
            await self.flush()


# ---------------- Relay check ----------------
_STOP = {"benang", "dengan", "untuk", "supaya", "adalah", "tersebut"}


def relay_keywords(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]{6,}", text.lower()) if w not in _STOP}


def relay_ok(spoken: list[str], keywords: set[str]) -> bool:
    if not keywords:
        return True
    said = " ".join(spoken[-6:]).lower()
    need = min(len(keywords), max(1, len(keywords) // 5))
    return sum(1 for w in keywords if w in said) >= need


# ---------------- Entrypoint ----------------
server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext) -> None:
    # Kegagalan apa pun (model Live tidak tersedia, kredensial, konfigurasi sesi) dikirim ke layar murid,
    # supaya murid tidak melihat status "Live" padahal tutor tidak pernah bicara.
    try:
        await run_session(ctx)
    except Exception as e:  # noqa: BLE001
        logger.exception("sesi tutor gagal")
        try:
            msg = json.dumps({"type": "tutor_error", "message": f"{type(e).__name__}: {str(e)[:300]}"})
            await ctx.room.local_participant.publish_data(msg, topic=UI_TOPIC, reliable=True)
        except Exception:  # noqa: BLE001
            pass
        raise


async def run_session(ctx: JobContext) -> None:
    await ctx.connect()
    participant = await ctx.wait_for_participant()
    meta = json.loads(participant.metadata or "{}")
    session_id = meta.get("sessionId")
    if not session_id:
        logger.warning("peserta tanpa sessionId, agen keluar")
        return

    cfg = await api("GET", f"/api/agent/session-config?sessionId={session_id}")
    tracer = Tracer({"sessionId": session_id, "source": meta.get("source", "livekit"), "via": "livekit"})
    frames = FrameHolder()
    spoken: list[str] = []
    pending_relay: list[tuple[set[str], str]] = []

    async def publish_ui(ui: dict) -> None:
        await ctx.room.local_participant.publish_data(json.dumps(ui), topic=UI_TOPIC, reliable=True)

    def make_tool(spec: dict):
        name = spec["name"]

        async def handler(raw_arguments: dict[str, object]) -> str:
            tracer.emit("tool_call", name=name)
            body = {"sessionId": session_id, "name": name, "args": raw_arguments}
            if name == "check_my_work":
                img = frames.jpeg_b64()
                if img:  # attach_view: nilai frame yang sedang dilihat murid
                    await api("POST", "/api/session/frame", {"sessionId": session_id, "image": img})
            out = await api("POST", "/api/live/tool", body)
            if out.get("ui"):
                await publish_ui(out["ui"])
            resp = out.get("response", {})
            if name == "search_knowledge" and resp.get("jawaban"):
                pending_relay.append((relay_keywords(resp["jawaban"]), resp["jawaban"]))
            return json.dumps(resp, ensure_ascii=False)

        return function_tool(handler, raw_schema={"name": name, "description": spec["description"], "parameters": spec["parameters"]})

    model = await pick_live_model(cfg.get("models") or [cfg["model"]])
    tracer.emit("live_model", model=model)
    agent = Agent(instructions=cfg["instructions"], tools=[make_tool(t) for t in cfg["tools"]])
    session = AgentSession(
        llm=google.beta.realtime.RealtimeModel(
            model=model,
            # Sesi menenun lebih lama dari batas koneksi Live (~10 menit) dan jendela konteks 128k:
            # resumption menyambung ulang otomatis dengan handle dari server; kompresi menggeser jendela konteks.
            session_resumption=genai_types.SessionResumptionConfig(),
            context_window_compression=genai_types.ContextWindowCompressionConfig(
                trigger_tokens=LIVE_COMPRESS_TRIGGER, sliding_window=genai_types.SlidingWindow(target_tokens=LIVE_COMPRESS_TARGET),
            ),
            **({"proactivity": True, "enable_affective_dialog": True} if LIVE_PROACTIVE else {}),
            voice=cfg["voice"],
            **VERTEX_OPTS,
            input_audio_transcription=genai_types.AudioTranscriptionConfig(),
            # Deteksi bicara murid dibuat kurang peka: bunyi alat tenun, gema speaker HP, dan suara latar
            # tidak lagi dianggap murid menyela, sehingga ucapan tutor tidak terpotong.
            realtime_input_config=live_input_config(),
            output_audio_transcription=genai_types.AudioTranscriptionConfig(),
        ),
        video_sampler=StalenessSampler(tracer),
    )

    @session.on("conversation_item_added")
    def _on_item(ev) -> None:
        role = getattr(ev.item, "role", None)
        text = re.sub(r"<ctrl\d+>", "", getattr(ev.item, "text_content", None) or "").strip()  # token kontrol bocor
        if not text or role not in ("user", "assistant"):
            return
        if role == "assistant":
            spoken.append(text)
        tracer.emit("user_said" if role == "user" else "tutor_said", text=text)

    # Salin frame kamera murid untuk attach_view.
    async def read_video(track: rtc.Track) -> None:
        async for ev in rtc.VideoStream(track):
            frames.frame, frames.arrived_at = ev.frame, time.time()

    @ctx.room.on("track_subscribed")
    def _on_track(track: rtc.Track, pub: rtc.TrackPublication, p: rtc.RemoteParticipant) -> None:
        if track.kind == rtc.TrackKind.KIND_VIDEO:
            tracer.emit("capture_source", observed=pub.name or "kamera", declared=meta.get("source", ""))
            asyncio.create_task(read_video(track))

    async def relay_watch() -> None:
        while True:
            await asyncio.sleep(4)
            while pending_relay:
                kw, answer = pending_relay.pop(0)
                if not relay_ok(spoken, kw):
                    tracer.emit("relay_retry")
                    session.generate_reply(instructions=f"Sampaikan jawaban tervalidasi ini ke murid dengan singkat: {answer}")

    asyncio.create_task(tracer.pump())
    asyncio.create_task(relay_watch())
    ctx.add_shutdown_callback(tracer.flush)

    await session.start(room=ctx.room, agent=agent, room_input_options=RoomInputOptions(video_enabled=True))
    await publish_ui({"type": "tutor_ready", "model": model})
    tracer.emit("live_start", engine="livekit+gemini")
    # Sapa SETELAH gambar kamera benar-benar sampai; tanpa gambar, tutor wajib bilang belum bisa melihat.
    seen = await wait_first_frame(frames)
    tracer.emit("greeting", camera=seen)
    await session.generate_reply(instructions=GREETING_SEEN if seen else GREETING_BLIND)


def live_input_config() -> genai_types.RealtimeInputConfig:
    low = os.environ.get("LIVE_VAD", "low") == "low"
    return genai_types.RealtimeInputConfig(
        automatic_activity_detection=genai_types.AutomaticActivityDetection(
            start_of_speech_sensitivity=genai_types.StartSensitivity.START_SENSITIVITY_LOW if low else genai_types.StartSensitivity.START_SENSITIVITY_HIGH,
            end_of_speech_sensitivity=genai_types.EndSensitivity.END_SENSITIVITY_LOW,
            prefix_padding_ms=int(os.environ.get("LIVE_PREFIX_MS", "300")),
            silence_duration_ms=int(os.environ.get("LIVE_SILENCE_MS", "900")),
        ),
    )


GREETING_SEEN = ("Sapa murid dengan singkat. Lalu sebutkan dalam satu kalimat apa yang BENAR-BENAR terlihat di gambar kamera saat ini. "
    "Jangan menebak dan jangan berasumsi ada alat tenun. Jika alat tenun tidak terlihat jelas, katakan terus terang "
    "bahwa kamu belum melihat alat tenun dan minta murid mengarahkan kamera ke benang lungsi dan tangannya. "
    "Setelah itu panggil get_current_step dan jelaskan tahap pertama dengan singkat.")
GREETING_BLIND = ("Sapa murid dengan singkat. Katakan terus terang bahwa gambar kamera belum sampai kepadamu, jadi kamu belum bisa melihat apa pun, "
    "dan minta murid memeriksa kamera. Jangan mendeskripsikan apa pun yang seolah terlihat. Lalu panggil get_current_step dan jelaskan tahap pertama dengan singkat.")


async def wait_first_frame(frames: "FrameHolder", timeout_s: float = 8.0) -> bool:
    """Tunggu frame kamera pertama, lalu beri jeda agar beberapa frame sempat terkirim ke model sebelum menyapa."""
    end = time.time() + timeout_s
    while time.time() < end:
        if frames.frame is not None:
            await asyncio.sleep(float(os.environ.get("LIVE_GREET_DELAY_S", "2.0")))
            return True
        await asyncio.sleep(0.2)
    return False


async def heartbeat_loop(interval_s: int = 6 * 3600) -> None:
    """Uji model Live sungguhan secara berkala dan laporkan ke server (dibaca diagnostik admin & tes asap)."""
    while True:
        report: dict = {"at": datetime.now(timezone.utc).isoformat()}
        try:
            models = (await api("GET", "/api/agent/live-models")).get("models") or []
            _live_pick.update(model=None, at=0.0)  # selalu uji ulang, jangan pakai cache
            report.update(ok=True, model=await pick_live_model(models), candidates=models)
        except Exception as e:
            report.update(ok=False, error=str(e)[:500])
        try:
            await api("POST", "/api/agent/heartbeat", report)
        except Exception as e:
            logger.error("heartbeat gagal dikirim: %s", e)
        logger.info("heartbeat model Live: %s", report)
        await asyncio.sleep(interval_s)


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "heartbeat":
        asyncio.run(heartbeat_loop())
    else:
        cli.run_app(server)
