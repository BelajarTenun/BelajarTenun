# Produksi Video Tanpa Alat Tenun

Masalah: belum punya alat tenun, jadi tidak bisa merekam POV menenun sendiri.
Batasan dari juknis: produk harus **berfungsi sungguhan**, bukan mockup. Jadi animasi boleh untuk *menjelaskan*, tapi adegan demo tetap harus menunjukkan aplikasi yang benar-benar jalan.

## Strategi: 3 lapis

| Lapis | Dipakai untuk | Cara |
|---|---|---|
| **A. Animasi** | Masalah, cara kerja AI, validasi, perbandingan, bisnis, peta | Motion graphic (Remotion/After Effects/Canva) |
| **B. Demo asli dengan video sumber** | Inti demo: deteksi tahap, kartu, koreksi, tanya jawab | Aplikasi diputar dengan **video POV tenun open source sebagai kamera** (fitur baru, lihat bawah) lalu layar direkam |
| **C. Footage manusia** | Andrew, murid memakai kacamata, tangan memegang benang | Shot tanpa alat tenun besar: close-up, benang, alat tenun mini |

## Fitur baru: "Berkas video (uji/demo)"

Di `/kacamata.html`, pilihan **Kamera** sekarang punya opsi **Berkas video (uji/demo)**. Pilih video POV tenun (misalnya dari YouTube CC BY atau Wikimedia Commons), tekan Mulai. Video diputar sebagai kamera kacamata, dan AI benar-benar menganalisis frame-nya: deteksi tahap, kartu, suara tutor, dan tanya jawab semuanya asli.

Ini jujur di mata juri: yang ditampilkan adalah sistem yang bekerja sungguhan, hanya sumber gambarnya video rekaman. Tulis label kecil di pojok: *"Input: video tenun berlisensi CC BY · [pembuat]"*.

Cara merekam:
1. Jalankan server (HTTPS tidak perlu untuk mode berkas video di laptop): `npm run dev`
2. Buka `http://localhost:3000/kacamata.html`, pilih **Berkas video (uji/demo)**, pilih file.
3. Rekam layar (OBS / perekam layar bawaan) dengan audio sistem, supaya suara tutor ikut terekam.
4. Rekam beberapa kali, pilih take yang paling bagus.

Tips memilih video sumber: sudut pandang dari atas atau dari mata penenun, tangan dan benang jelas, cahaya terang, tahapnya terlihat berurutan. Cari "backstrap loom POV", "weaving first person", "tenun gedogan".

## Peta adegan: apa yang dipakai

| Adegan | Sebelumnya | Sekarang |
|---|---|---|
| 1, 3, 15, 20, 27 | Andrew | **C** tetap, di Tokopedia |
| 2 | Animasi | **A** ilustrasi penenun senior + ruang tenun memudar |
| 4 | Cuplikan produk | **C** close-up kacamata + **A** logo |
| 5 | Grid video | **A** grid cuplikan video open source |
| 6 | Computer vision | **B** rekam layar aplikasi dengan video sumber + **A** kotak deteksi/label di atasnya |
| 7 | Validasi | **B** rekam layar halaman Editor + **A** chip KUALITAS |
| 8 | Murid menekan Start | **C** tangan murid menekan Start di HP (tanpa alat tenun) + **B** layar HP |
| 9–11 | POV menenun | **B** layar kacamata dengan video sumber, dibingkai HUD (**A**). Sisipan **C**: wajah murid memakai kacamata, shot ketat dari bahu ke atas, alat tenun tidak perlu terlihat |
| 10 | Istilah daerah | **C** close-up tangan memegang benang + **A** kartu kosakata |
| 12–13 | Bertanya | **C** close-up wajah samping (background blur, tidak perlu alat tenun) + **B** audio tutor asli |
| 14 | Pendamping | **B** dua layar: HP penenun di `/pendamping.html` menampilkan video sumber, pesan dibacakan. Footage penenun cukup memegang HP |
| 16–19 | Hasil | **B** rekam layar HP/laptop |
| 21–23 | Uji coba | **C** pemula mencoba memakai mode berkas video atau alat tenun mini (lihat bawah) |
| 24–25, 26, 28 | Bisnis, peta, penutup | **A** |

Kira-kira **60% animasi + rekam layar**, 40% footage orang.

## Trik shot tanpa alat tenun

- **Framing ketat**: wajah/tangan memenuhi layar, background di-blur. Penonton tidak perlu melihat alat tenun utuh.
- **Benang sebagai properti**: gulungan benang, kain tenun jadi, sepotong kain di pangkuan. Cukup untuk close-up "tangan memegang benang pakan".
- **Alat tenun mini/kardus**: alat tenun mini (*mini loom*, *cardboard loom*) dijual murah di Tokopedia, atau buat dari kardus + benang. Bagus untuk shot tangan dan uji coba pemula. Jangan diklaim sebagai alat tenun Tidore; sebut "alat latihan".
- **Pinjam sebentar**: sanggar tenun, Dekranasda, atau museum tekstil (misalnya Museum Tekstil Jakarta punya kelas tenun) bisa dikunjungi 1–2 jam untuk 3–4 shot B-roll. Ini akan menambah kredibilitas besar di Akar Budaya.
- **Kacamata di wajah, layar di HP**: untuk POV, rekam layar aplikasi lalu beri bingkai lensa/HUD di editing. Ini cara yang biasa dipakai di video produk kacamata.

## Gaya animasi agar konsisten

- Latar krem hangat, aksen satu warna dari motif tenun, font serif untuk teks melayang (seperti video referensi).
- Ilustrasi flat untuk penenun dan alat tenun (adegan 2, 6, 25), garis tipis seperti sketsa kacamata di kartu penutup.
- Kartu HUD: putih transparan, sudut membulat, ikon kecil, bilah keyakinan.
- Aset ilustrasi dan musik: buat sendiri atau pakai yang berlisensi jelas, lalu cantumkan di kredit.

## Daftar yang perlu disiapkan (revisi)

- 3–5 video POV tenun open source (CC BY/CC0/domain publik) untuk mode berkas video.
- Kacamata (untuk dipakai di wajah) + 2 HP.
- Benang, kain tenun, dan opsional alat tenun mini.
- Lokasi Tokopedia untuk Andrew + sudut tenang untuk close-up murid.
- Laptop untuk rekam layar aplikasi + OBS.
