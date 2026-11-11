"""BelajarTenun – bridge untuk kacamata Brilliant Labs Frame (kamera + layar lensa + mic).

Frame tidak punya speaker, jadi suara tutor diputar di laptop/HP (pakai earbuds Bluetooth).
Alur (sama dengan Glasses API, docs/KACAMATA.md):
  foto dari Frame tiap N detik → filter kualitas → POST /api/glasses/frame
  tap di Frame → "lanjut";  ketik/ucap di laptop → POST /api/glasses/say
  balasan: "display" ke lensa Frame, "speak" diputar sebagai suara

Catatan: paket `frame-sdk` (Python) berlabel deprecated oleh Brilliant Labs; bridge ini memakai API yang
ada di frame-sdk-python (Frame, camera.take_photo, display.show_text, motion.run_on_tap). Untuk produk
akhir, port alur yang sama ke SDK Flutter terbaru (lihat noa-flutter sebagai referensi).

Pemakaian:
  pip install -r requirements.txt
  BT_SERVER=https://belajartenun.example BT_DEVICE_TOKEN=bt_xxx python bridge.py
"""
import asyncio, base64, io, json, os, shutil, subprocess, sys, tempfile, time, urllib.request

import numpy as np
from PIL import Image
from frame_sdk import Frame
from frame_sdk.camera import Quality, AutofocusType

SERVER = os.environ.get("BT_SERVER", "http://localhost:3000").rstrip("/")
TOKEN = os.environ.get("BT_DEVICE_TOKEN", "")          # kode akses perangkat dari /masuk.html
INTERVAL = float(os.environ.get("BT_INTERVAL", "3"))
AUDIO_ONLY = os.environ.get("BT_AUDIO_ONLY") == "1"


def api(path, body):
    req = urllib.request.Request(SERVER + path, data=json.dumps(body).encode(), method="POST",
                                 headers={"content-type": "application/json", **({"authorization": f"Bearer {TOKEN}"} if TOKEN else {})})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def quality_ok(jpeg: bytes, min_sharp=40, min_bright=35, max_bright=235):
    """Filter kualitas yang sama dengan public/js/quality.js (varians Laplacian + kecerahan)."""
    g = np.asarray(Image.open(io.BytesIO(jpeg)).convert("L").resize((160, 120)), dtype=np.float32)
    lap = g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:] - 4 * g[1:-1, 1:-1]
    sharp, bright = float(lap.var()), float(g.mean())
    ok = min_bright <= bright <= max_bright and sharp >= min_sharp
    return ok, {"ok": ok, "sharpness": round(sharp), "brightness": round(bright)}


def play_speech(reply):
    text = reply.get("speak")
    if not text:
        return
    print("🔊", text)
    audio = reply.get("audio")
    player = shutil.which("ffplay") or shutil.which("afplay") or shutil.which("mpg123")
    if audio and player:
        f = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False); f.write(base64.b64decode(audio)); f.close()
        args = [player, "-nodisp", "-autoexit", "-loglevel", "quiet", f.name] if "ffplay" in player else [player, f.name]
        subprocess.Popen(args)
    elif shutil.which("say"):
        subprocess.Popen(["say", text])  # macOS


async def main():
    async with Frame() as f:
        print(f"Frame tersambung · baterai {await f.get_battery_level()}%")
        start = api("/api/glasses/start", {"source": "frame", "audioOnly": AUDIO_ONLY, "audio": True})
        sid = start["sessionId"]
        loop = asyncio.get_running_loop()
        state = {"reply": start}

        async def show(reply):
            if reply.get("skipped") and not reply.get("speak"):
                return
            state["reply"] = reply
            if reply.get("display") and not AUDIO_ONLY:
                await f.display.show_text(reply["display"], max_width=620)
            play_speech(reply)

        await show(start)

        def on_tap():
            loop.create_task(show(api("/api/glasses/button", {"sessionId": sid, "action": "next", "audio": True})))
        await f.motion.run_on_tap(callback=on_tap)

        async def read_keyboard():
            while True:
                text = await loop.run_in_executor(None, sys.stdin.readline)
                if text.strip():
                    await show(api("/api/glasses/say", {"sessionId": sid, "text": text.strip(), "audio": True}))
        loop.create_task(read_keyboard())
        print("Ketik pertanyaan/perintah lalu Enter (mis. 'sudah', 'ulangi', 'kenapa tepi menyempit?'). Tap Frame = lanjut.")

        while not state["reply"].get("finished"):
            t0 = time.time()
            jpeg = await f.camera.take_photo(autofocus_seconds=1, quality=Quality.MEDIUM, autofocus_type=AutofocusType.CENTER_WEIGHTED, resolution=512)
            ok, q = quality_ok(jpeg)
            body = {"sessionId": sid, "quality": q, "audio": True}
            if ok:
                body["image"] = base64.b64encode(jpeg).decode()
                await show(api("/api/glasses/frame", body))
            else:
                await show(api("/api/glasses/tick", body))
            await asyncio.sleep(max(0, INTERVAL - (time.time() - t0)))
        print("Latihan selesai 🎉")


if __name__ == "__main__":
    asyncio.run(main())
