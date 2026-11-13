# Daftar Shot yang Harus Diambil

Semua bagian lain sudah berupa animasi di `video/` (lihat animatic `preview/FULL-animatic.mp4`). Yang perlu direkam kamera hanya daftar di bawah. Tidak butuh alat tenun.

Format semua shot: **horizontal 16:9, 1080p atau 4K, 30 fps**. Ambil setiap shot 2–3 kali, plus 2 detik diam sebelum dan sesudah bicara.

## Sesi 1 · Andrew (lokasi: Tokopedia)

| # | Adegan | Waktu | Posisi di frame | Yang dilakukan / diucapkan |
|---|---|---|---|---|
| A1 | 1 | 0:00 | Masuk dari kiri, berhenti di **tengah** | “Selama ratusan tahun, menenun diajarkan dari tangan ke tangan.” |
| A2 | 3 | 0:14 | **Tengah** | Memegang kacamata, memakainya saat bilang: “Bagaimana kalau ilmunya bisa ikut… di mata kita?” |
| A3 | 5 | 0:28 | **Tengah** | “Ilmu tenun sebenarnya sudah ada di mana-mana: ribuan video dan arsip yang dibagikan terbuka di internet.” |
| A4 | 15 | 1:58 | **Tengah** | “Penenun tidak tergantikan. Dengan BelajarTenun, akses ke mereka terbuka untuk lebih banyak murid, dari mana saja.” |
| A5 | 20 | 2:36 | **Tengah** | “Video tutorial tidak bisa melihat kesalahan kita. Kelas tatap muka terbatas tempat dan waktunya. BelajarTenun menggabungkan keduanya: melihat dari mata murid, mengoreksi saat itu juga, dan tetap setia pada ilmu penenunnya.” |
| A6 | 27 | 3:59 | Tengah, **bertiga** dengan 2 anggota tim | “BelajarTenun: cara baru belajar budaya. Terbuka untuk siapa saja, menyesuaikan setiap murid, dan dijaga oleh penenunnya sendiri.” |

**Andrew selalu di tengah frame.** Di editing, footage digeser pelan ke kiri atau kanan sambil diperbesar ±130%, lalu animasi muncul di sisi yang kosong (adegan 1, 5, 24 → Andrew bergeser ke kiri; adegan 20 → ke kanan; adegan 3, 15, 27 tetap di tengah).

Supaya efek geser tetap tajam:
- Rekam **4K** kalau bisa (perbesaran 130% dari 4K tetap lebih tajam dari 1080p).
- Bingkai lebih longgar: sisakan ruang di atas kepala dan di kiri-kanan badan, kira-kira **setengah badan sampai pinggang**.
- Andrew jangan banyak bergerak ke samping; gestur tangan boleh.
- Latar agak gelap atau blur (teks animasi berwarna putih), mic klip, kamera setinggi mata.

Efek geser bisa dibuat otomatis di Remotion (taruh footage di `video/public/`, isi prop `footage`) atau manual di CapCut/Premiere: keyframe **Position X ±360 px** dan **Scale 100% → 130%** selama 0,8 detik dengan ease in-out di awal adegan.

## Sesi 2 · Anggota tim bidang ekonomi

| # | Adegan | Waktu | Posisi | Diucapkan |
|---|---|---|---|---|
| E1 | 24 | 3:26 | **Tengah** | “Kami mulai dari sanggar dan sekolah. Setiap modul yang divalidasi memberi penghasilan bagi penenun, dan setiap murid baru memperluas pasar kain tenun.” (sesuaikan dengan proposal) |

## Sesi 3 · Wajah murid memakai kacamata

Satu orang sebagai murid, memakai kacamata BelajarTenun. Latar polos/blur, cahaya dari samping. Kepala sedikit menunduk seolah melihat ke tangan.

| # | Adegan | Shot | Durasi | Yang dilakukan |
|---|---|---|---|---|
| M1 | 12 | Close-up wajah **dari samping**, wajah di kiri frame | 9 dtk | Melihat ke bawah, lalu bertanya: “Kenapa harus dirapatkan setiap baris?” lalu mengangguk |
| M2 | 13 | Sama seperti M1 | 9 dtk | Berhenti sejenak, bertanya: “Kalau benangnya putus gimana?” |
| M3 | 8 | Wajah dari depan, sedikit menunduk | 2 dtk | Bilang “Mulai belajar.” |
| M4 | 9 | Wajah dari depan/samping, menunduk fokus | 1–2 dtk | Sisipan: diam, mata bergerak seperti mengamati |
| M5 | 11 | Wajah, ragu lalu mengangguk | 2 dtk | Sisipan: dahi sedikit berkerut, lalu tersenyum kecil |
| M6 | 16 | Melepas kacamata, tersenyum | 2 dtk | Sisipan sebelum catatan belajar |
| M7 | 4 | Close-up kacamata di meja / di tangan | 2 dtk | Cuplikan produk (pelan, cahaya bagus) |
| M8 | 8 | Tangan menekan tombol Mulai di HP | 2 dtk | Layar HP membuka `/kacamata.html` |

## Sesi 4 · Testimoni & uji coba

| # | Adegan | Shot | Catatan |
|---|---|---|---|
| T1 | 23 | Teman yang mencoba aplikasi, talking head 5 dtk | Satu kalimat dengan kata-kata sendiri tentang mencoba aplikasinya |
| T2 | 23 | Penenun/guru tenun lewat video call, 5 dtk (opsional) | Rekam layar video call, minta izin |
| T3 | 21 | 3–5 teman mencoba aplikasi di laptop/HP | Cuplikan pendek 1–2 dtk masing-masing, untuk diselipkan di adegan 21 |

## Sesi 5 · Rekam layar (di laptop, tanpa kamera)

| # | Adegan | Yang direkam |
|---|---|---|
| L1 | 22 | Terminal `npm run evaluate` → hasil akurasi |
| L2 | 9–11 (opsional) | `/kacamata.html` mode **Berkas video** dengan video POV tenun open source, termasuk suara tutor. Jika direkam, bisa menggantikan latar video di animasi POV |
| L3 | 7, 16, 17, 19 (opsional) | Halaman Editor, catatan belajar, Progres, Arsip, jika ingin memakai tampilan asli selain animasi |

## Bahan non-kamera

- 5–12 klip video tenun open source (CC BY / CC0 / domain publik) → `video/public/`, untuk adegan 5, 6, 9–11, 14.
- Musik latar berlisensi jelas.
- Istilah daerah dari 2–3 tradisi, sudah divalidasi (adegan 10), nama penenun (7, 14), angka uji (21–22), skema bisnis (24).
- Voice over (VO) untuk adegan animasi: bisa suara Andrew direkam terpisah di ruangan tenang, atau suara tutor dari aplikasi.

## Ringkasan

| Sesi | Jumlah shot | Perkiraan waktu |
|---|---|---|
| Andrew | 6 | 1–1,5 jam |
| Tim ekonomi | 1 | 15 menit |
| Wajah murid | 8 | 45 menit |
| Testimoni | 2–3 | 30 menit |
| Rekam layar | 1–3 | 30 menit |
| **Total** | **±20 shot** | **±3–4 jam** |
