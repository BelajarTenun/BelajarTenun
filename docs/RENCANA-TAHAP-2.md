# Rencana Implementasi Tahap 2: Computer Vision & Kacamata Native

Lanjutan dari [RENCANA-IMPLEMENTASI.md](RENCANA-IMPLEMENTASI.md). Tahap 1 sudah membangun tutor, Glasses API, dataset, dan deteksi berbasis model umum (Gemini). Tahap 2 menutup dua celah besar:

1. **Computer vision yang benar-benar memahami proses menenun**, dari rekaman video ahli menjadi kurikulum dan model, lalu dari foto tunggal menjadi pemahaman gerakan.
2. **Kacamata rakitan sendiri** (berbasis OpenGlass/ESP32-S3) sebagai perangkat utama, plus bagian VisionClaw yang relevan: LiveKit, login Google, cek "hasil sudah diucapkan", dan mesin cadangan.

---

## 0. Gambaran alur data (target)

```
 Video penenun ahli (POV, panjang)
        │
        ▼  CV-1  Generator kurikulum (Gemini video)
 Draf kurikulum: tahap · instruksi · kriteria · kesalahan · cap waktu
        │  ← penenun mengoreksi di editor & anotasi
        ▼
 Segmen tervalidasi ──► CV-2 Klip berlabel (2–4 dtk) ──► CV-3 Fitur tangan (MediaPipe)
        │                         │                                │
        │                         ▼                                ▼
        │                CV-4 Deteksi alat/kain (YOLO)     CV-5 Model urutan tahap (temporal)
        │                         └──────────────┬─────────────────┘
        ▼                                        ▼
 CV-6 Lintasan ahli (referensi)      Penilai tahap berlapis di perangkat & server
        │                                        │
        └──────────► Bandingkan gerakan murid ◄──┘ → koreksi spesifik ("pedang terlalu miring")
```

Prinsip: **setiap lapis model hanya dipakai bila terbukti lebih baik dari lapis sebelumnya** di `npm run evaluate`. Gemini tetap jadi cadangan saat model lokal ragu.

---

## Bagian A: Computer Vision

### CV-1. Generator kurikulum dari video ahli
**Tujuan:** penenun cukup merekam dirinya menenun. Sistem mengusulkan kurikulum lengkap, lalu penenun tinggal mengoreksi.

**Cara kerja**
1. Partner mengunggah video POV sesi penuh di `/rekam.html` (sudah ada).
2. Server mengunggah video ke **Gemini Files API** (untuk video > 18 MB), lalu meminta output JSON terstruktur:
   - daftar tahap berurutan: `title`, `instruction` (gaya bicara ke murid), `success_criteria` (yang terlihat kamera), `tips`, `common_mistakes` (kalau terlihat atau disebut penenun);
   - **cap waktu** awal/akhir tiap tahap → langsung menjadi segmen anotasi;
   - istilah lokal yang diucapkan penenun (dari audio) → kandidat knowledge base.
3. Kalau ada beberapa video, hasilnya digabung: tahap yang sama dicocokkan lewat judul dan embedding, kriteria dipilih yang paling sering muncul.
4. Hasil masuk ke **mode tinjau** di editor: setiap usulan diberi label "usulan AI", dan penenun menerima, mengubah, atau menolak. Tahap baru dipakai pemula setelah `validated_by` diisi.

**Berkas:** `lib/curriculum-gen.js`, endpoint `POST /api/modules/draft-from-video`, mode tinjau di `public/editor.html`, unggah resumable di `lib/ai.js`.
**Kriteria selesai:** dari 3 video ahli, ≥80% tahap usulan diterima penenun dengan sedikit atau tanpa perubahan; cap waktu meleset < 3 detik dari anotasi manual.
**Perkiraan:** 1,5 minggu.

### CV-2. Deteksi berbasis klip pendek (gerakan, bukan foto)
**Masalah:** "memasukkan pakan" dan "merapatkan" adalah gerakan, sehingga satu foto sering ambigu.

**Cara kerja**
- Di perangkat, simpan **buffer cincin 4 detik** (mis. 8 frame @ 2 fps atau video 480p).
- Saat sampler memutuskan untuk menilai, kirim klip (rangkaian frame atau MP4 pendek) ke Gemini sebagai video, dengan prompt "apa yang terjadi selama klip".
- Mesin sesi menyimpan hasil per klip; smoothing tetap berlaku.
- Ekspor dataset juga menghasilkan **klip berlabel** dari segmen anotasi (`seg-<tahap>-<label>-<t>.mp4`), bukan hanya JPEG.

**Berkas:** `public/js/clip-buffer.js`, perubahan `lib/core.js` (prompt klip), `lib/session.js`, `public/anotasi.html` (ekspor klip), `scripts/evaluate.js --mode clip`.
**Kriteria selesai:** di dataset uji, akurasi tahap gerakan (masukkan pakan, rapatkan) naik ≥10 poin dibanding mode foto.
**Perkiraan:** 1 minggu.

### CV-3. Pelacakan tangan di perangkat (MediaPipe)
**Cara kerja**
- **MediaPipe Hand Landmarker** (`@mediapipe/tasks-vision`, jalan di browser/Android, offline) menghasilkan 21 titik per tangan, ±15–30 fps di HP menengah.
- Dari titik itu dihitung **fitur**: posisi tangan relatif ke tengah gambar, jarak antar tangan, kecepatan, arah gerak, dan gestur menggenggam.
- Fitur dipakai untuk:
  1. **sampler pintar**: kirim ke AI saat tangan bergerak lalu berhenti (akhir sebuah aksi), bukan berdasarkan waktu;
  2. **"tangan tidak terlihat"**: tutor meminta pengguna menunduk sedikit;
  3. input untuk model urutan (CV-5) dan pembanding ahli (CV-6).
- Hanya titik koordinat (angka) yang dikirim/disimpan, bukan gambar, sehingga lebih hemat dan lebih privat.

**Berkas:** `public/js/hands.js`, integrasi di `public/js/tutor.js`, fitur di tracer, ekspor `hands.jsonl` per rekaman.
**Kriteria selesai:** deteksi tangan ≥90% pada frame berlabel; panggilan AI per sesi turun ≥30% tanpa menurunkan akurasi.
**Perkiraan:** 1 minggu.

### CV-4. Deteksi alat & kondisi kain (object detection)
**Yang dideteksi:** `pedang/belida`, `sekoci`, `sisir`, `celah_lungsi_terbuka`, `tepi_kain`, `baris_pakan`.

**Cara kerja**
1. **Pelabelan kotak**: halaman `/label.html` untuk menggambar kotak pada frame hasil ekspor. Pra-label diusulkan Gemini (deteksi objek dengan koordinat), lalu manusia mengoreksi.
2. Latih **YOLO (ukuran nano/small)** dengan `scripts/train/train_detector.py`, lalu ekspor ke ONNX/TFLite/TF.js.
3. Dipakai untuk:
   - kriteria berhasil yang **terukur**, mis. "celah terbuka" = kotak celah ada dan tingginya di atas ambang;
   - kesalahan yang **terukur**, mis. lebar kain antar baris menyempit lebih dari X% → "tepi menyempit";
   - menghitung baris pakan untuk tahap "ulangi 5 baris".

**Data:** ±300–500 kotak per kelas dari rekaman beberapa penenun, alat, dan kondisi cahaya.
**Kriteria selesai:** mAP@0.5 ≥ 0,7 untuk pedang/sekoci/celah; ukuran lebar kain meleset < 10%.
**Perkiraan:** 2 minggu (termasuk pelabelan bersama partner).

### CV-5. Model pengenal tahap dari urutan (temporal)
**Cara kerja**
- Input per waktu: fitur tangan (CV-3) + kelas & posisi objek (CV-4) + embedding frame dari model kecil (MobileNetV3 dari `train.py`).
- Model: **GRU/Temporal-CNN kecil** yang mengeluarkan probabilitas tahap aktif dan status (`sedang`, `selesai`, `salah`) per detik. Polanya mengikuti riset *online action segmentation* untuk video POV.
- Dilatih dari segmen anotasi (CV-1 + anotasi manual). Validasi dibagi **per penenun**, bukan per frame, supaya model tidak sekadar menghafal satu orang.
- Model berjalan di HP. Mesin sesi menerimanya sebagai `localPrediction` (jalurnya sudah ada di tahap 1), dan Gemini hanya dipanggil saat model ragu.

**Berkas:** `scripts/train/train_temporal.py`, `public/js/local-model.js` (versi urutan), `lib/session.js` (ambang lokal per tahap).
**Kriteria selesai:** akurasi per detik ≥ akurasi Gemini di dataset uji; ≥60% keputusan "selesai" diambil di perangkat.
**Perkiraan:** 2 minggu, dimulai setelah ada ≥20 sesi penuh beranotasi dari ≥3 penenun.

### CV-6. Pembanding gerakan dengan penenun ahli
**Cara kerja**
- Dari rekaman ahli, buat **lintasan referensi** per tahap: urutan fitur tangan dan objek (CV-3/4).
- Saat murid mengerjakan tahap, bandingkan lintasannya dengan referensi memakai **DTW (dynamic time warping)**.
- Selisih terbesar diterjemahkan menjadi koreksi spesifik lewat aturan yang ditulis bersama penenun. Contoh: "pedang belum tegak", "tarik sekoci terlalu cepat", "tangan kiri belum menahan lungsi".
- Skor kemiripan ditampilkan di progres sebagai **"semakin mirip ahli"** dari sesi ke sesi.

**Berkas:** `lib/compare.js` (DTW + aturan), editor aturan koreksi per tahap, kartu skor di `/progres.html`.
**Kriteria selesai:** penenun menilai ≥70% koreksi otomatis "tepat" pada 30 klip murid.
**Perkiraan:** 1,5 minggu.

### CV-7. Evaluasi berlapis & pengumpulan data berkelanjutan
- `npm run evaluate -- --compare foto,klip,lokal,gabungan` menghasilkan tabel perbandingan tiap lapis (akurasi, latensi, biaya).
- **Active learning**: frame/klip saat model ragu atau dikoreksi pengguna masuk antrean "perlu label" di halaman anotasi. Hanya untuk pengguna yang memberi izin, dan dimatikan secara default.
- Laporan per tahap otomatis: tahap mana yang paling sering salah deteksi → prioritas rekaman berikutnya.

---

## Bagian B: Kacamata DIY & sisa VisionClaw

### VC-1. Kacamata BelajarTenun rakitan sendiri (DIY)
**Kenapa:** kacamata dibuat sendiri, jadi kamera, tombol, dan mikrofon dirancang khusus untuk menenun. Ini lebih murah, bisa diperbaiki sendiri, dan tidak terikat SDK merek lain. Pola VisionClaw tetap dipakai: kacamata hanya menangkap kamera dan suara, HP yang menjalankan aplikasi, dan AI berjalan di server.

**Hardware (purwarupa v1)**
| Komponen | Pilihan | Catatan |
|---|---|---|
| Otak + kamera + mic | **Seeed XIAO ESP32-S3 Sense** (kamera OV2640/OV3660, mic PDM, PSRAM) | Sama dengan OpenGlass; ±$15 |
| Baterai | LiPo 3,7 V 250–500 mAh | Target ≥ 2 jam latihan |
| Tombol | 1–2 tombol taktil di gagang | Tap = lanjut, tahan = ulangi/tanya |
| LED privasi | LED merah kecil menghadap depan | Wajib menyala saat kamera aktif |
| Suara | Earbuds Bluetooth / bone-conduction yang tersambung ke HP | ESP32-S3 tidak punya Bluetooth Classic untuk audio |
| (opsional v2) Layar | OLED transparan kecil / modul prisma | Untuk teks tahap di lensa; tunda sampai v2 |
| Casing | Cetak 3D, dipasang di gagang kacamata biasa | **Kamera dimiringkan ±20–30° ke bawah** agar tangan & lungsi terlihat saat menenun |

**Firmware (`firmware/belajartenun-glasses/`, berbasis firmware OpenGlass, MIT)**
- Tetap kompatibel dengan protokol BLE OpenGlass (adaptor tahap 1 langsung jalan), ditambah:
  - **karakteristik tombol** (notify: tap / tahan) → `/api/glasses/button`;
  - **audio mic** lewat BLE (karakteristik audio OpenGlass, codec µ-law/PCM 8–16 kHz) → speech-to-text di HP atau langsung ke Gemini Live;
  - **status baterai** (Battery Service standar) dan **LED privasi** yang menyala otomatis saat kamera aktif;
  - **mode foto cepat**: interval < 5 detik dan resolusi diatur dari HP (firmware OpenGlass hanya mendukung kelipatan 5 detik).
- **Mode Wi-Fi (opsional)** untuk klip/gerakan (CV-2): BLE hanya cukup untuk ±1 foto tiap 1–3 detik. Untuk 2–5 fps, kacamata tersambung ke **hotspot HP** dan mengirim MJPEG lewat Wi-Fi, sedangkan BLE tetap untuk tombol dan kontrol. Mode ini lebih boros baterai, jadi hanya dipakai saat dibutuhkan.
- Pembaruan firmware lewat OTA dari aplikasi.

**Aplikasi pendamping di HP**
- **v1: web app yang sudah ada (PWA + Web Bluetooth)**, jalan di Chrome Android tanpa instal. Mode kacamata (`/kacamata.html`) diperluas dengan tombol, audio mic, baterai, dan mode Wi-Fi.
- **v2: aplikasi Android native** (Kotlin) bila butuh: koneksi BLE di latar belakang saat layar mati, audio mic lebih stabil, dan dukungan iPhone (Web Bluetooth tidak tersedia di iOS → aplikasi iOS native diperlukan untuk pengguna iPhone).
- Mode HP (kamera belakang) tetap tersedia untuk uji tanpa kacamata, seperti VisionClaw.

**Pengujian khusus menenun**
- Sudut kamera: rekam 5 penenun dengan sudut 15°/25°/35° → pilih yang paling sering menangkap tangan + celah lungsi.
- Cahaya: uji di sentra tenun (sering teduh) → atur eksposur otomatis di firmware.
- Kenyamanan: berat total < 40 g di satu sisi; uji pemakaian 1 jam.

**Berkas:** `firmware/belajartenun-glasses/` (Arduino/PlatformIO), `hardware/` (STL casing, daftar komponen, skema kabel), perluasan `public/js/sources.js` (tombol, audio, baterai, Wi-Fi), `apps/android/` (v2).
**Butuh:** 2–3 set komponen untuk iterasi, printer 3D/jasa cetak, solder kecil, HP Android untuk uji.
**Kriteria selesai:** satu modul selesai dikerjakan memakai kacamata rakitan; foto diterima ≥1 per 2 detik lewat BLE (≥3 fps lewat Wi-Fi); tombol & suara berfungsi; baterai ≥ 2 jam.
**Perkiraan:** 2 minggu (firmware + web), +1 minggu (casing & uji sudut), +3 minggu bila aplikasi Android native diperlukan.

### VC-2. LiveKit (server media + agen tutor di server) — ✅ sudah diimplementasikan (lokal/self-hosted, lihat [LIVEKIT.md](LIVEKIT.md))
**Kenapa:** koneksi langsung browser → Gemini rapuh di sinyal jelek. VisionClaw memakai LiveKit (SFU) + `agent/main.py` (livekit-agents).

**Cara kerja**
- HP/kacamata hanya menerbitkan audio + video ke **ruang LiveKit**. **Agen Python** di server bergabung, menjalankan Gemini Live, dan mengeksekusi tools langsung ke mesin sesi (tanpa bolak-balik HP).
- Bonus: rekaman sesi untuk dataset (dengan izin), pendamping bisa bergabung ke ruang yang sama, dan transkrip tersimpan lengkap.
- Mode lama (langsung ke Gemini) tetap ada sebagai cadangan.

**Berkas:** `agent/` (Python: livekit-agents, plugin Google), endpoint `POST /api/livekit/token`, klien web memakai `livekit-client`.
**Butuh:** LiveKit Cloud (ada paket gratis) atau self-host, kredensial LiveKit di server.
**Kriteria selesai:** sesi bertahan saat jaringan putus-sambung singkat; jeda suara p95 < 1,5 detik.
**Perkiraan:** 1,5–2 minggu.

### VC-3. Login dengan Google
Pola dari `gateway/src/auth.ts` VisionClaw: OAuth Google → akun dibuat/diperbarui → token sesi. Aplikasi native memakai alur nonce + polling (sama seperti VisionClaw). Pendaftaran email tetap ada untuk partner tanpa akun Google.
**Butuh:** OAuth client ID Google Cloud.
**Perkiraan:** 3–4 hari.

### VC-4. Cek "hasil sudah diucapkan" — ✅ sudah ada di agen LiveKit
Pola `_relay_keywords` VisionClaw: setelah tool penting (jawaban knowledge, koreksi), periksa transkrip ucapan tutor. Kalau kata kunci hasil tidak terucap, kirim ulang hasilnya sebagai konteks agar tutor menyampaikannya.
**Berkas:** `lib/relay.js`, integrasi di agen LiveKit / `public/js/live.js`.
**Perkiraan:** 2–3 hari.

### VC-5. Mesin suara cadangan
VisionClaw bisa memakai OpenAI Realtime bila Gemini tidak tersedia. Untuk kita: abstraksi `engine` di agen (VC-2) supaya bisa berpindah ke mesin lain. Ini **opsional**, hanya bila ketersediaan Gemini menjadi masalah.
**Perkiraan:** 3–4 hari (setelah VC-2).

---

## Urutan & jadwal

| Fase | Isi | Hasil yang bisa didemokan | Perkiraan |
|---|---|---|---|
| **A** | CV-1 generator kurikulum · CV-2 klip | Rekam ahli → kurikulum jadi dalam 1 hari; deteksi gerakan lebih akurat | 2,5 minggu |
| **B** | CV-3 MediaPipe · VC-2 LiveKit · VC-4 relay | Tutor lebih hemat & stabil di sinyal jelek | 3 minggu |
| **C** | VC-1 kacamata rakitan (firmware, casing, Web Bluetooth + Wi-Fi) · VC-3 login Google | Belajar menenun pakai kacamata BelajarTenun sendiri | 3 minggu |
| **D** | CV-4 deteksi alat/kain · CV-6 pembanding ahli | Koreksi spesifik & skor "mirip ahli" | 3,5 minggu |
| **E** | CV-5 model temporal · CV-7 active learning · aplikasi Android/iOS native (bila perlu) | Sebagian besar keputusan di perangkat, akurasi terus naik | 3–4 minggu |

Fase A dan B bisa berjalan paralel jika ada 2 developer. CV-4/5/6 bergantung pada **jumlah data** (lihat di bawah), bukan hanya waktu.

## Kebutuhan data dari partner

| Untuk | Minimal | Ideal |
|---|---|---|
| CV-1 kurikulum | 3 video sesi penuh dari 2 penenun | 10 video, 4 penenun |
| CV-2 / evaluasi | 20 klip per tahap (benar + salah) | 100 klip per tahap |
| CV-4 deteksi objek | 300 kotak per kelas | 1.000 kotak per kelas, berbagai cahaya & alat |
| CV-5 model temporal | 20 sesi beranotasi, 3 penenun | 60 sesi, 6+ penenun, termasuk pemula |
| CV-6 pembanding | 5 sesi ahli per tahap | 15 sesi ahli |

Semua dengan persetujuan berjenjang (sudah ada). Rekaman **pemula** (dengan izin) penting untuk contoh kesalahan yang alami.

## Kebutuhan lain

| Kebutuhan | Untuk |
|---|---|
| Gemini API key + billing (Files API untuk video panjang) | CV-1, CV-2, Live |
| GPU untuk pelatihan (Colab Pro / Vertex AI / GPU lokal) | CV-4, CV-5 |
| Komponen kacamata (XIAO ESP32-S3 Sense, LiPo, tombol, LED) ×2–3 set, cetak 3D, HP Android | VC-1 |
| LiveKit Cloud (atau server sendiri) | VC-2 |
| OAuth client ID Google | VC-3 |
| Waktu penenun: rekaman, koreksi kurikulum, pelabelan, aturan koreksi | Semua CV |

## Risiko & mitigasi
- **Data sedikit** → mulai dari Gemini (tanpa pelatihan); model lokal hanya dipakai bila lolos evaluasi.
- **Variasi alat & cahaya antar sentra** → data dari beberapa penenun; validasi per penenun; augmentasi.
- **Gerakan halus jari sulit dilihat dari POV** → fokus ke kondisi hasil (celah, baris, tepi) yang terlihat, bukan gerakan jari.
- **Bandwidth BLE terbatas** → foto tiap 1–3 detik cukup untuk mode foto; mode Wi-Fi via hotspot HP untuk klip.
- **Web Bluetooth tidak ada di iPhone** → v1 khusus Android/Chrome; aplikasi native bila perlu iPhone.
- **Firmware OpenGlass tidak dirawat lagi** → kita fork dan rawat sendiri (lisensi MIT).
- **Panas & baterai ESP32 saat kamera terus aktif** → foto berselang, mode tidur saat diam, uji 1 jam pemakaian.
- **Beban penenun** → pra-label AI di setiap langkah (kurikulum, segmen, kotak) agar penenun cukup mengoreksi.
