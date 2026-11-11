# Roadmap BelajarTenun

## Prinsip
Bangun "otak" tutornya dulu di perangkat murah, lalu pindahkan ke kacamata. Nilai produk ada pada kemampuan menghubungkan **apa yang dilakukan pengguna ↔ apa yang seharusnya ↔ bantuan yang dibutuhkan**.

| Tahap | Perangkat | Status |
|---|---|---|
| v0 | HP di head strap / tripod, atau laptop + webcam; simulator kacamata | ✅ prototipe + Glasses API di repo ini |
| v1 | Kacamata kamera (mis. Meta Ray-Ban via SDK, Brilliant Labs Frame/Halo, Mentra) streaming ke HP | berikutnya |
| v2 | Smart glasses dengan display (HUD) | nanti |

## Computer vision: bagaimana deteksi tahap bekerja
Ya, produk ini butuh computer vision. Kita bangun bertahap:

1. **v0 – Vision-language model (sekarang).** Frame kamera dikirim ke Gemini bersama *kriteria berhasil* dan *kesalahan umum* tiap tahap. Model menjawab `done / mistake / not_yet / uncertain` + tingkat keyakinan. Jika yakin < 0.6, sistem **tidak** memutuskan sendiri dan pengguna mengonfirmasi. Belum perlu melatih model sendiri; cukup kurikulum yang dianotasi dengan baik.
2. **v1 – Ukur akurasi.** Rekam 20–50 klip POV per tahap (benar & salah), labeli, lalu ukur akurasi v0. Inilah *technical validation*.
3. **v2 – Model khusus (jika perlu).** Kalau VLM kurang akurat/terlalu lambat atau koneksi desa lemah: latih klasifikasi tahap ringan (mis. fine-tune MobileNet/YOLO-cls, atau hand-tracking MediaPipe + fitur posisi pedang/sekoci) yang bisa jalan **di HP tanpa internet**. Data dari langkah 2 menjadi data latihnya.

## Rencana 6 minggu
| Minggu | Kerja | Validasi |
|---|---|---|
| 1–2 | Rekam video POV penenun 5 tahap dasar; isi kurikulum bersama partner | Knowledge |
| 3–4 | Aktifkan mode AI; uji deteksi dengan rekaman nyata; atur prompt & ambang keyakinan | Technical |
| 5 | Review jawaban Q&A oleh penenun; lengkapi knowledge base (motif, filosofi) | Knowledge |
| 6 | Uji ke 5–10 pemula; analisis `logs/sessions.jsonl` | Learning |

## Sudah dikerjakan
- ✅ Demo per tahap sebelum praktik, mode hands-free (perintah suara terus aktif)
- ✅ Glasses API + simulator kacamata (docs/KACAMATA.md)
- ✅ Alat rekam dataset POV berlabel + persetujuan; jadikan rekaman sebagai demo
- ✅ Skrip evaluasi akurasi deteksi (technical validation)
- ✅ Editor kurikulum & knowledge base untuk partner; halaman progres belajar

## Backlog berikutnya
- Klien kacamata nyata (mulai dari Brilliant Labs Frame atau MentraOS) memakai Glasses API.
- Penyimpanan sesi & dataset di cloud (sekarang di disk server) + login partner.
- Model CV ringan di perangkat (offline) dilatih dari dataset rekaman.
- Dukungan beberapa modul & tradisi tenun.
