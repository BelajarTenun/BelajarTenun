# BelajarTenun

**Tutor AI pendamping belajar menenun, dipakai langsung di alat tenun.**
Prototipe v0 dari konsep *AI-powered wearable weaving tutor*: kamera melihat area kerja, AI mengenali tahapan, memberi instruksi suara, mengoreksi kesalahan, dan menjawab pertanyaan berdasarkan pengetahuan yang divalidasi penenun profesional.

> v0 berjalan di **HP atau laptop + webcam**. Software yang sama nanti dipindah ke smart glasses (lihat [docs/ROADMAP.md](docs/ROADMAP.md)).

## Menjalankan

Butuh Node.js 20+. Tidak ada dependency.

```bash
npm start
```

Buka `http://localhost:3000`. Untuk kamera di HP, halaman harus dibuka lewat HTTPS (mis. pakai `ngrok http 3000` atau deploy).

### Mode
| Mode | Syarat | Perilaku |
|---|---|---|
| **Manual** (default) | tanpa key | Pengguna menekan/mengucap "sudah"; suara dari browser; Q&A pencarian kata kunci |
| **AI** | `GEMINI_API_KEY` | Kamera mengambil frame tiap 6 detik → Gemini menilai tahap (selesai / salah / belum / ragu); Q&A dijawab AI hanya dari knowledge base |
| + Suara Google | `GOOGLE_TTS_API_KEY` | Suara bahasa Indonesia yang lebih natural |

Salin `.env.example`, isi key, lalu jalankan: `node --env-file=.env server.js`.

## Struktur
```
data/tidore-dasar.json   Kurikulum modul (tahap, kriteria berhasil, kesalahan umum, validator)
data/knowledge.json      Knowledge base Q&A tervalidasi
lib/core.js              Logika inti: prompt vision, penilaian tahap, pencarian pengetahuan
server.js                API: /api/module, /api/check-step, /api/ask, /api/tts, /api/log
public/                  Web app: HUD sesi belajar ala kacamata
logs/sessions.jsonl      Log progres (untuk learning validation)
docs/                    Roadmap, panduan anotasi, rencana validasi, referensi
```

## Penting
Isi `data/` saat ini **DRAFT**: teknik ditulis umum dan belum divalidasi. Semua tahap dan jawaban wajib diperiksa penenun Tidore (kolom `validated_by`) sebelum diuji ke pengguna. Lihat [docs/PANDUAN-ANOTASI.md](docs/PANDUAN-ANOTASI.md).

```bash
npm test
```
