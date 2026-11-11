/**
 * BelajarTenun – miniapp MentraOS (background JSContext).
 *
 * Menyambungkan kacamata MentraOS (mis. Mentra Live: kamera + mic + speaker) ke Glasses API BelajarTenun.
 * API SDK mengikuti contoh resmi MentraOS (examples/miniapp, miniapps/captions):
 *   session.camera.takePhoto() → {key}; session.blob.bytes(key) → JPEG
 *   session.transcription.on(cb) → teks ucapan;  session.input.onButtonPress(cb) → tombol
 *   session.speaker.speak(text);  session.display.render([...]) bila kacamata punya layar
 *
 * Belum diuji di perangkat. Sesuaikan dengan versi @mentra/miniapp yang dipakai; BT_SERVER dan BT_DEVICE_TOKEN
 * di-inline saat build (lihat README).
 */
import {registerMiniapp} from "@mentra/miniapp/background"

declare const process: {env: {MENTRA_PUBLIC_BT_SERVER: string; MENTRA_PUBLIC_BT_DEVICE_TOKEN: string}}
const SERVER = process.env.MENTRA_PUBLIC_BT_SERVER || "https://belajartenun.example"
const TOKEN = process.env.MENTRA_PUBLIC_BT_DEVICE_TOKEN || ""
const PHOTO_EVERY_MS = 4000

type Reply = {sessionId: string; speak?: string; display?: string; finished?: boolean; skipped?: boolean}

function toBase64(bytes: Uint8Array): string {
  const abc = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
  let out = ""
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += abc[(n >> 18) & 63] + abc[(n >> 12) & 63] + (i + 1 < bytes.length ? abc[(n >> 6) & 63] : "=") + (i + 2 < bytes.length ? abc[n & 63] : "=")
  }
  return out
}

async function api(path: string, body: object): Promise<Reply> {
  const res = await fetch(SERVER + path, {
    method: "POST",
    headers: {"content-type": "application/json", ...(TOKEN ? {authorization: `Bearer ${TOKEN}`} : {})},
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`BelajarTenun ${res.status}`)
  return res.json()
}

registerMiniapp(async (session: any) => {
  const caps = session.capabilities ?? {}
  const hasDisplay = Boolean(caps.hasDisplay ?? caps.display)
  let reply = await api("/api/glasses/start", {source: "mentra", audioOnly: !hasDisplay})
  const sessionId = reply.sessionId
  let busy = false

  const show = async (r: Reply) => {
    if (r.skipped && !r.speak) return
    reply = r
    if (hasDisplay && r.display) {
      const d = caps.display
      await session.display.render([{type: "text", id: "bt", box: {x: 0, y: 0, w: d?.width ?? 576, h: d?.height ?? 288}, text: r.display}])
    }
    if (r.speak) await session.speaker.speak(r.speak).catch(() => {})
  }
  await show(reply)

  // Ucapan final → perintah ("sudah", "ulangi", "contoh", "catat …") atau pertanyaan ke tutor.
  session.transcription.on(async (t: {text: string; isFinal: boolean}) => {
    if (!t.isFinal || !t.text.trim()) return
    await show(await api("/api/glasses/say", {sessionId, text: t.text.trim()}))
  })
  // Tombol: tekan singkat = lanjut, tekan lama = ulangi.
  session.input.onButtonPress(async (b: {pressType?: string}) => {
    await show(await api("/api/glasses/button", {sessionId, action: b.pressType === "long" ? "repeat" : "next"}))
  })

  const loop = async () => {
    if (reply.finished) return
    if (!busy) {
      busy = true
      try {
        const photo = await session.camera.takePhoto({size: "medium"})
        const bytes: Uint8Array | null = photo?.key ? await session.blob.bytes(photo.key) : null
        if (bytes) {
          await show(await api("/api/glasses/frame", {sessionId, image: toBase64(bytes)}))
          session.blob.delete(photo.key).catch(() => {}) // jangan simpan foto latihan (privasi)
        }
      } catch (e) {
        console.warn("[belajartenun] foto gagal", e)
      } finally {
        busy = false
      }
    }
    setTimeout(loop, PHOTO_EVERY_MS)
  }
  loop()
})
