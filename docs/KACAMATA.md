# Integrasi Smart Glasses

BelajarTenun dibuat untuk **kacamata**. HP dan laptop hanya dipakai sementara untuk menguji otaknya. Arsitekturnya:

```
 Smart glasses (kamera + mic + speaker [+ layar lensa])
        │  foto tiap ~2 dtk, teks ucapan, tap
        ▼
 Aplikasi pendamping (HP) / langsung dari kacamata
        │  HTTPS  ── Glasses API ──
        ▼
 Server BelajarTenun: mesin sesi (lib/session.js) + AI vision + tutor + log
        │  { speak, display, step, finished, audio? }
        ▼
 Kacamata mengucapkan "speak" dan menampilkan "display" (≤ 60 karakter)
```

Semua logika (urutan tahap, deteksi, koreksi, tanya jawab) ada di server. Klien kacamata cukup tipis, jadi pindah merek kacamata tidak perlu menulis ulang tutornya.

## Glasses API
Semua `POST` JSON. Tambahkan `"audio": true` untuk menerima suara MP3 (base64) siap putar, jika `GOOGLE_TTS_API_KEY` aktif.

| Endpoint | Body | Kegunaan |
|---|---|---|
| `/api/glasses/start` | `{}` | Mulai sesi → `sessionId` + instruksi tahap 1 |
| `/api/glasses/frame` | `{ sessionId, image }` (JPEG base64) | Kirim foto kamera. Server memanggil AI paling sering tiap 4 dtk; balasan `skipped: true` boleh diabaikan |
| `/api/glasses/say` | `{ sessionId, text }` | Hasil speech-to-text. "sudah/lanjut" → maju, "ulangi/contoh" → ulang, selain itu → pertanyaan ke tutor |
| `/api/glasses/button` | `{ sessionId, action: "next" \| "repeat" }` | Tap/gesture di gagang kacamata |

Balasan:
```json
{ "sessionId": "…", "speak": "Bagus! Tahap 2. …", "display": "2/5 Membuka celah (mulut) lungsi",
  "step": { "index": 1, "total": 5, "title": "…" }, "finished": false, "audio": "<mp3 base64, opsional>" }
```

Coba tanpa hardware: buka **`/kacamata.html`** (simulator lensa yang memakai API yang sama).

## Pilihan perangkat
| Perangkat | Kamera | Layar lensa | Cara sambung | Catatan |
|---|---|---|---|---|
| Brilliant Labs Frame / Halo | ✅ | ✅ | SDK terbuka (Bluetooth ke HP) → HP memanggil Glasses API | Paling cocok untuk v1–v2: open source, ada HUD |
| Kacamata MentraOS (mis. Mentra Live) | ✅ | tergantung model | Buat "app" MentraOS yang meneruskan foto & transkrip ke Glasses API | Satu app bisa jalan di beberapa merek |
| Meta Ray-Ban | ✅ | ❌ (audio saja) | Lewat SDK resmi Meta untuk developer, atau pola VisionClaw/OpenGlass | Populer; tanpa HUD, `display` diabaikan |
| DIY ESP32 kamera (OpenGlass) | ✅ | ❌ | Firmware kirim JPEG ke HP/server | Termurah untuk purwarupa lomba/riset |

> Ketersediaan SDK, akses kamera, dan syarat developer tiap merek berubah cepat. Cek dokumentasi resminya sebelum membeli.

## Contoh klien minimal (pseudo-code untuk SDK kacamata apa pun)
```js
const { sessionId, ...r } = await api('/api/glasses/start', {});
show(r);
every(2000, async () => show(await api('/api/glasses/frame', { sessionId, image: await glasses.camera.jpegBase64() })));
glasses.onTranscript(async (text) => show(await api('/api/glasses/say', { sessionId, text })));
glasses.onTap(async () => show(await api('/api/glasses/button', { sessionId, action: 'next' })));
function show(r) { if (r.skipped) return; if (r.display) glasses.display(r.display); if (r.speak) glasses.speak(r.speak); }
```
Implementasi lengkap yang bisa ditiru: `public/kacamata.html`.

## Catatan desain untuk kacamata
- **Teks di lensa pendek** (≤ 60 karakter); penjelasan panjang lewat suara.
- **Hemat baterai & data:** foto 640px, kualitas 0.7, tiap 2 dtk; server yang membatasi panggilan AI.
- **Kamera POV harus melihat tangan & lungsi.** Arahkan kepala sedikit menunduk; uji sudut kamera tiap merek dengan halaman Rekam Data.
- **Privasi:** tampilkan indikator saat kamera aktif; jangan simpan foto latihan kecuali untuk dataset yang sudah ada persetujuan.
