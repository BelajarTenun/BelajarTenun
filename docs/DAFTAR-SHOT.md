# Daftar Shot yang Harus Diambil (v3)

Tidak ada shot menenun dan tidak butuh alat tenun. Yang direkam hanya **Andrew memakai kacamata dan bicara**, **HP**, dan **rekam layar**. Semua gambar tenun berasal dari video open source + animasi di `video/`.

Format semua shot kamera: **horizontal 16:9, 4K kalau bisa (minimal 1080p), 30 fps**. Ambil setiap shot 2–3 kali, plus 2 detik diam sebelum dan sesudah bicara.

## Sesi 1 · Andrew bicara (lokasi: Tokopedia) · ±1,5 jam

**Andrew selalu di tengah frame**, memakai kacamata BelajarTenun (kecuali awal adegan 3). Di editing, frame digeser ke kiri/kanan sambil diperbesar ±130%, lalu animasi muncul di sisi kosong.

| # | Adegan | Shot | Diucapkan |
|---|---|---|---|
| A1 | 01 | Masuk dari kiri, berhenti di tengah | "Selama ratusan tahun, menenun diajarkan dari tangan ke tangan." |
| A2 | 03 | Tengah, memegang kacamata lalu memakainya saat "di mata kita" | "Bagaimana kalau ilmunya bisa ikut… di mata kita?" |
| A3 | 05 | Tengah | "Ilmu tenun sebenarnya sudah ada di mana-mana: ribuan video dan arsip yang dibagikan terbuka di internet, dari banyak tradisi." |
| A4 | 15 | Tengah | "Penenun tidak tergantikan. Dengan BelajarTenun, akses ke mereka terbuka untuk lebih banyak murid, dari mana saja." |
| A5 | 19 | Tengah | "Video tutorial tidak bisa melihat kesalahan kita. Kelas tatap muka terbatas tempat dan waktunya. BelajarTenun menggabungkan keduanya: melihat dari mata murid, mengoreksi saat itu juga, dan tetap setia pada ilmu penenunnya." |
| A6 | 22 | Tengah | "Kami mulai dari sanggar dan sekolah. Setiap modul yang divalidasi memberi penghasilan bagi penenun, dan setiap murid baru memperluas pasar kain tenun." (sesuaikan proposal) |
| A7 | 25 | Tengah, melepas kacamata, menatap kamera | "BelajarTenun. Belajar menenun, dipandu ilmu Nusantara." |
| A8 | 12 | **Close-up wajah dari samping**, memakai kacamata, sedikit menunduk, HP di tangan | "Kenapa harus dirapatkan setiap baris?" lalu mengangguk |
| A9 | 13 | Sama seperti A8, berhenti sejenak | "Kalau benangnya putus gimana?" |

Tips: bingkai setengah badan sampai pinggang dengan ruang longgar di kiri-kanan (untuk efek geser), latar agak gelap atau blur, mic klip, Andrew tidak bergeser ke samping.

## Sesi 2 · HP & kacamata · ±45 menit

| # | Adegan | Shot | Catatan |
|---|---|---|---|
| H1 | 08 | **Dari atas bahu Andrew** ke layar HP: tekan *Hubungkan kacamata* → *Kacamata tersambung* → *Mulai sesi* | Andrew memakai kacamata; layar HP terbaca jelas, kecerahan HP maksimal |
| H2 | 08 | Andrew bilang "Mulai belajar." sambil melihat HP | 2 dtk, wajah + HP di frame |
| H3 | 04 | Close-up kacamata di meja / di tangan, pelan, cahaya bagus | 2–3 dtk cuplikan produk |
| H4 | 04 | Close-up kacamata dipakai + HP menyala di tangan | 2 dtk |

## Sesi 3 · Rekam layar (tanpa kamera) · ±45 menit

| # | Adegan | Yang direkam | Cara |
|---|---|---|---|
| L1 | 08 | Layar HP: menghubungkan kacamata dan *Mulai sesi* | Perekam layar bawaan HP, **dengan suara** |
| L2 | 09–11 | Layar HP: web app dalam mode **Berkas video** memutar video tenun open source; kartu tahap, transkrip, dan suara tutor | Satu sesi penuh 1–2 menit, pilih bagian terbaik |
| L3 | 12–13 | Layar HP saat Andrew bertanya (transkrip + jawaban) | Bisa sekaligus dengan L2 |
| L4 | 21 | Terminal laptop `npm run evaluate` → hasil akurasi | OBS / perekam layar |
| L5 | 07, 16–18 (opsional) | Halaman Editor, catatan belajar, Progres, Arsip | Jika ingin tampilan asli selain animasi |

## Bahan non-kamera

- 5–12 klip video tenun open source (CC BY / CC0 / domain publik) → `video/public/` dan untuk mode Berkas video. Catat pembuat & lisensi.
- Musik latar berlisensi jelas (untuk cut mengikuti ketukan).
- Rekaman suara Andrew untuk VO adegan animasi (02, 04, 06, 07, 16–18, 20–21, 23), di ruangan tenang.
- Data asli: istilah daerah 2–3 tradisi (10), nama penenun (07, 14), angka uji (20–21), skema bisnis (22).

## Ringkasan

| Sesi | Shot | Waktu |
|---|---|---|
| Andrew bicara | 9 | ±1,5 jam |
| HP & kacamata | 4 | ±45 menit |
| Rekam layar | 3–5 | ±45 menit |
| Rekam VO | 1 | ±30 menit |
| **Total** | **±18** | **±3,5 jam** |

## Efek geser (jika diedit manual)

CapCut/Premiere: di awal adegan 01, 05, 22 (Andrew ke kiri) dan 19 (Andrew ke kanan), keyframe **Position X ±360 px** dan **Scale 100% → 130%** selama 0,8 detik, ease in-out. Atau otomatis di Remotion: taruh footage di `video/public/`, isi prop `footage`.
