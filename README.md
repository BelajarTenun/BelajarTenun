# BelajarTenun

**Tutor AI pendamping belajar menenun, dipakai langsung di alat tenun.**
Prototipe v0 dari konsep *AI-powered wearable weaving tutor*: kamera melihat area kerja, AI mengenali tahapan, memberi instruksi suara, mengoreksi kesalahan, dan menjawab pertanyaan berdasarkan pengetahuan yang divalidasi penenun profesional.

> Target produk adalah **smart glasses**. Semua logika tutor ada di server dan dibuka lewat **Glasses API** ([docs/KACAMATA.md](docs/KACAMATA.md)), jadi kacamata cukup mengirim foto/suara dan menerima instruksi. Sebelum hardware tersedia, uji pakai simulator kacamata atau HP.

## Halaman
| Halaman | Untuk | Isi |
|---|---|---|
| `/kacamata.html` | Demo produk | Simulator lensa kacamata memakai Glasses API |
| `/` | Pemula (HP) | Sesi latihan: demo tahap → praktik → deteksi kamera → koreksi → tanya jawab, mode hands-free |
| `/rekam.html` | Partner/tim | Rekam video POV penenun berlabel (benar/salah/belum) + persetujuan → dataset |
| `/editor.html` | Partner penenun | Edit & validasi tahap dan tanya jawab tanpa menyentuh file |
| `/progres.html` | Tim | Metrik belajar: tingkat selesai, tahap yang membingungkan |

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
lib/session.js           Mesin sesi untuk kacamata (Glasses API)
data/recordings/         Dataset rekaman (tidak masuk git: besar & berisi data pribadi)
scripts/evaluate.js      Uji akurasi deteksi kamera memakai dataset rekaman
logs/sessions.jsonl      Log progres (untuk learning validation)
docs/                    Roadmap, panduan anotasi, rencana validasi, referensi
```

## Alur data rekaman → AI
1. Partner merekam penenun di `/rekam.html` (POV, per tahap, label benar/salah/belum, izin wajib dicentang). Video + frame tiap 2 dtk tersimpan di `data/recordings/<id>/`.
2. Rekaman "benar" terbaik bisa dijadikan **video demo** tahap dengan satu klik.
3. `node scripts/evaluate.js` mengukur akurasi deteksi kamera dengan frame berlabel (technical validation).
4. Ketika data cukup, folder yang sama menjadi data latih model CV khusus (roadmap tahap 3).

Saat dipasang publik, set `EDITOR_TOKEN` agar halaman editor & rekam tidak bisa diubah sembarang orang.

## Penting
Isi `data/` saat ini **DRAFT**: teknik ditulis umum dan belum divalidasi. Semua tahap dan jawaban wajib diperiksa penenun Tidore (kolom `validated_by`) sebelum diuji ke pengguna. Lihat [docs/PANDUAN-ANOTASI.md](docs/PANDUAN-ANOTASI.md).

```bash
npm test
```
