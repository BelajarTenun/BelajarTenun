# BelajarTenun

**Smart glasses AI tutor untuk belajar menenun tradisional.**
Kamera kacamata melihat alat tenun dari sudut pandang mata. AI mengenali tahap yang sedang dikerjakan, memandu dengan suara, mengoreksi kesalahan, dan menjawab pertanyaan **hanya** dari pengetahuan yang divalidasi penenun profesional. Penenun senior juga bisa mendampingi dari jauh.

> Modul pertama: **Tenun Tidore – Modul Dasar** (5 tahap, masih DRAFT dan wajib divalidasi partner penenun).

---

## Arsitektur

```
┌──────────────── Perangkat ────────────────┐ WebRTC ┌─ LiveKit lokal ─┐   ┌── agent/main.py ──┐
│ Kacamata rakitan (ESP32-S3, Bluetooth) ·  │◄──────►│ ruang per sesi  │◄─►│ Gemini Live       │
│ Brilliant Frame · MentraOS · HP / webcam  │        └─────────────────┘   │ suara+video, tools│
│  └ filter kualitas frame, sampler suara,  │  (cadangan: browser langsung │ tracer, relay     │
│    earcons, kartu, tracer, model lokal    │   ke Gemini Live)            └─────────┬─────────┘
└──────────────┬────────────────────────────┘                                        │ tool call
               │ HTTPS: Glasses API / Session API / Live tools
┌──────────────▼───────────────────────────── Server Node.js (tanpa dependency) ───────────────┐
│ Mesin sesi (lib/session.js) ── sumber kebenaran tahap; AI tidak bisa melompati kurikulum     │
│   ├ Deteksi tahap v2: multi-frame + contoh few-shot penenun + JSON schema + smoothing        │
│   ├ Policy "kapan bicara" (lib/policy.js): koreksi · petunjuk · tawarkan bantuan             │
│   └ Tools Live (lib/live.js): get_current_step, check_my_work, mark_step_done, show_card…    │
│ Tutor RAG (lib/knowledge.js): embedding + kata kunci, status draft→ditinjau→tervalidasi     │
│ Dataset (lib/data.js): rekaman POV, persetujuan, segmen anotasi, frame berlabel             │
│ Akun & peran (lib/auth.js): pemula · partner · admin, kode akses kacamata                   │
│ Signaling WebRTC pendamping · Tracer · Progres & kuesioner · Pemakaian AI                   │
└──────────────┬───────────────────────────────────────────────────────────────────────────────┘
               ▼
        DATA_DIR (lokal: ./data · produksi: Cloud Storage di-mount ke Cloud Run)
        modules/ · knowledge.json · recordings/ · users.json · logs/ · cache/
```

Arsitektur tutornya meniru pola [VisionClaw](https://github.com/sseanliu/VisionClaw): Gemini Live dengan tools, sampling video yang menyesuaikan dengan suara, protokol kartu, tracer, earcons, dan berbagi tampilan POV. Pembacaan kamera kacamata DIY mengikuti protokol Bluetooth [OpenGlass](https://github.com/BasedHardware/OpenGlass). Cara tutor memutuskan kapan bicara dan format anotasinya meniru [Watch-Talk-and-Guide](https://github.com/sled-group/Watch-Talk-and-Guide). Rinciannya ada di [docs/RENCANA-IMPLEMENTASI.md](docs/RENCANA-IMPLEMENTASI.md).

## Fitur

| | Fitur | Halaman / berkas |
|---|---|---|
| 👓 | **Mode kacamata**: HP/webcam atau OpenGlass via Bluetooth, mode suara saja, Gemini Live | `/kacamata.html`, `public/js/sources.js` |
| 🧵 | **Latihan pemula**: demo per tahap, deteksi kamera, koreksi, petunjuk proaktif, hands-free, bekukan tampilan, catatan belajar, kuesioner akhir | `/` |
| 🎧 | **Tutor suara real-time**: **LiveKit lokal + agen Gemini Live** (atau Gemini Live langsung). Bisa disela, ada transkrip, tools ke mesin sesi | `agent/main.py`, `public/js/livekit-tutor.js`, `docs/LIVEKIT.md` |
| 🧑‍🏫 | **Pendamping jarak jauh**: penenun senior melihat POV murid lewat WebRTC dan mengirim arahan yang dibacakan | `/pendamping.html`, `public/js/rtc.js` |
| 🎥 | **Rekam data** dengan persetujuan berjenjang (demo / AI / publikasi) dan bisa dicabut | `/rekam.html` |
| 🏷️ | **Anotasi timeline**: tandai tahap di video panjang, usulan AI, ekspor frame berlabel, jadikan demo | `/anotasi.html` |
| ✏️ | **Editor partner**: multi-modul, validasi tahap & tanya jawab, pertanyaan pemula yang belum terjawab | `/editor.html` |
| 📈 | **Progres & validasi**: tingkat selesai, tahap yang membingungkan, hasil kuesioner | `/progres.html` |
| 🛠️ | **Admin**: persetujuan akun partner, pemakaian AI (p50/p95, token, biaya) | `/admin.html` |
| 👤 | **Akun**: masuk/daftar, kode akses perangkat untuk kacamata | `/masuk.html` |
| 📊 | **Evaluasi akurasi** dari dataset (matriks kebingungan, latensi, ambang CI) | `scripts/evaluate.js` |
| 🧠 | **Model offline**: ekspor dataset → latih MobileNetV3 → TF.js/TFLite, dipakai otomatis di HP | `scripts/train/`, `public/js/local-model.js` |
| 📡 | **Klien kacamata asli**: bridge Brilliant Frame dan miniapp MentraOS | `clients/frame/`, `clients/mentra/` |

## Menjalankan

Butuh Node.js 20 ke atas. Tidak perlu `npm install`.

```bash
cp .env.example .env
```

```bash
node --env-file=.env server.js
```

Buka `http://localhost:3000`, lalu daftar. **Pengguna pertama otomatis menjadi admin.** Untuk mencoba cepat tanpa akun:

```bash
npm run dev
```

Perintah itu menjalankan server dengan `AUTH_DISABLED=1`, jadi semua orang dianggap admin. Jangan dipakai di produksi.

Kamera dan Bluetooth di HP hanya jalan lewat **HTTPS**. Pakai deploy ([docs/DEPLOY.md](docs/DEPLOY.md)) atau tunnel seperti `ngrok http 3000`.

### Mode AI
| Tanpa `GEMINI_API_KEY` | Dengan `GEMINI_API_KEY` |
|---|---|
| Pengguna menekan/mengucap "sudah" untuk lanjut | Deteksi tahap otomatis dari kamera |
| Tanya jawab mencocokkan kata kunci | Tanya jawab berbasis makna (embedding) + jawaban AI yang menyebut sumber |
| Suara dari browser | Gemini Live (suara natural, bisa disela) dan TTS opsional |
| – | Usulan anotasi otomatis dari video |

## Struktur

```
server.js                 Route HTTP: sesi, Glasses API, Live, akun, dataset, signaling, progres
lib/
  config.js               Konfigurasi dari environment
  store.js                Penyimpanan folder DATA_DIR (atomik) + retensi log
  ai.js                   Gemini generate/embeddings/Live token/TTS + statistik pemakaian
  session.js              Mesin sesi: tahap, smoothing, pin, catatan, tools Live
  policy.js               Kebijakan kapan tutor bicara
  live.js                 System instruction + deklarasi tools Gemini Live
  core.js                 Prompt deteksi, interpretasi, validasi modul, ringkasan log, skor evaluasi
  knowledge.js            Knowledge base tervalidasi + pencarian hibrid
  data.js                 Modul, rekaman, persetujuan, segmen, contoh few-shot, tracer, signaling
  auth.js                 Akun, peran, cookie bertanda tangan, kode akses perangkat
public/
  js/                     api, tutor (klien bersama), live, sources (HP/OpenGlass), quality, earcons,
                          cards, tracer, rtc, local-model
  *.html                  Halaman (lihat tabel fitur)  ·  sw.js + manifest (PWA, tetap terbuka saat sinyal lemah)
agent/                    Agen tutor real-time (LiveKit + Gemini Live, Python)
scripts/livekit/          Unduh & jalankan LiveKit server lokal (livekit.yaml)
public/vendor/            livekit-client (disajikan lokal, tanpa CDN)
clients/frame/            Bridge Python Brilliant Labs Frame
clients/mentra/           Miniapp MentraOS
scripts/evaluate.js       Uji akurasi deteksi
scripts/train/            Ekspor dataset + pelatihan model offline
data/modules/             Kurikulum (JSON)  ·  data/knowledge.json  Knowledge base
docs/                     Rencana, kacamata, deploy, privasi, panduan anotasi, validasi, referensi
test/                     Tes unit + integrasi (npm test)
```

## Perintah

| Perintah | Kegunaan |
|---|---|
| `npm start` | Jalankan server |
| `npm run dev` | Server pengembangan (auto-reload, tanpa login) |
| `npm test` | Semua tes |
| `npm run evaluate -- --min-accuracy 0.8` | Uji akurasi deteksi kamera (butuh `GEMINI_API_KEY`) |
| `npm run export-dataset` | Ekspor frame berlabel untuk melatih model offline |
| `npm run livekit:setup` / `npm run livekit` | Unduh lalu jalankan LiveKit server lokal |
| `npm run agent` | Jalankan agen tutor real-time (lihat [docs/LIVEKIT.md](docs/LIVEKIT.md)) |

## Alur data partner → AI
1. **Rekam** penenun dari sudut pandang mata (`/rekam.html`), per tahap atau satu sesi penuh, dengan persetujuan tertulis.
2. **Anotasi** sesi penuh (`/anotasi.html`). AI bisa mengusulkan segmen; partner tinggal mengoreksi.
3. **Ekspor frame berlabel.** Frame "benar" otomatis menjadi contoh *few-shot* untuk deteksi.
4. **Evaluasi** dengan `npm run evaluate`, lalu atur ambang tiap tahap di editor.
5. **Latih model offline** (`scripts/train/`) kalau datanya sudah cukup.

## Status & keterbatasan
- Deteksi kamera, Gemini Live, embedding, dan anotasi otomatis **belum diuji dengan API key sungguhan** (key di lingkungan pengembangan ditolak). Kode mengikuti dokumentasi API Gemini dan pola VisionClaw.
- Klien Frame dan Mentra **belum diuji di perangkat**. Frame SDK Python berlabel *deprecated*.
- Isi kurikulum dan knowledge base masih **DRAFT** dan harus divalidasi penenun Tidore.
- WebRTC pendamping hanya memakai STUN. Di jaringan yang ketat perlu server TURN (LiveKit punya TURN bawaan).
- LiveKit lokal + agen sudah diuji sampai agen bergabung ke ruang; percakapan Gemini Live belum diuji karena butuh API key.

Dokumentasi lain: [Referensi data](docs/REFERENSI-DATA.md) · [LiveKit lokal](docs/LIVEKIT.md) · [Kacamata](docs/KACAMATA.md) · [Deploy](docs/DEPLOY.md) · [Privasi](docs/PRIVASI.md) · [Rencana implementasi](docs/RENCANA-IMPLEMENTASI.md) · [Panduan anotasi](docs/PANDUAN-ANOTASI.md) · [Validasi](docs/VALIDASI.md) · [Referensi](docs/REFERENSI.md)
