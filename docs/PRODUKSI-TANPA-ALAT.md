# Produksi Video Tanpa Alat Tenun

Masalah: belum punya alat tenun, jadi tidak bisa merekam POV menenun sendiri.
Batasan dari juknis: produk harus **berfungsi sungguhan**, bukan mockup. Jadi animasi boleh untuk *menjelaskan*, tapi adegan demo tetap harus menunjukkan aplikasi yang benar-benar jalan.

## Strategi: 3 lapis

| Lapis | Dipakai untuk | Cara |
|---|---|---|
| **A. Animasi** | Masalah, cara kerja AI, validasi, perbandingan, bisnis, peta | Motion graphic (Remotion/After Effects/Canva) |
| **B. Demo asli dengan video sumber** | Inti demo: deteksi tahap, kartu, koreksi, tanya jawab | Aplikasi diputar dengan **video POV tenun open source sebagai kamera** (fitur baru, lihat bawah) lalu layar direkam |
| **C. Footage manusia** | Andrew, murid memakai kacamata, tangan di HP | Shot ketat, latar blur, tanpa properti tenun |

## Fitur baru: "Berkas video (uji/demo)"

Di `/kacamata.html`, pilihan **Kamera** sekarang punya opsi **Berkas video (uji/demo)**. Pilih video POV tenun (misalnya dari YouTube CC BY atau Wikimedia Commons), tekan Mulai. Video diputar sebagai kamera kacamata, dan AI benar-benar menganalisis frame-nya: deteksi tahap, kartu, suara tutor, dan tanya jawab semuanya asli.

Ini jujur di mata juri: yang ditampilkan adalah sistem yang bekerja sungguhan, hanya sumber gambarnya video rekaman. Tulis label kecil di pojok: *"Input: video tenun berlisensi CC BY · [pembuat]"*.

Cara merekam:
1. Jalankan server (HTTPS tidak perlu untuk mode berkas video di laptop): `npm run dev`
2. Buka `http://localhost:3000/kacamata.html`, pilih **Berkas video (uji/demo)**, pilih file.
3. Rekam layar (OBS / perekam layar bawaan) dengan audio sistem, supaya suara tutor ikut terekam.
4. Rekam beberapa kali, pilih take yang paling bagus.

Tips memilih video sumber: sudut pandang dari atas atau dari mata penenun, tangan dan benang jelas, cahaya terang, tahapnya terlihat berurutan. Cari "backstrap loom POV", "weaving first person", "tenun gedogan".

## Peta adegan (tanpa alat tenun, tanpa benang, tanpa kain)

Yang dibutuhkan hanya: **Andrew, satu orang sebagai "murid", kacamata, HP, laptop.** Semua gambar tenun berasal dari video open source berlisensi atau animasi.

| Adegan | Isi | Bahan |
|---|---|---|
| 1, 3 | Andrew di Tokopedia, memakai kacamata di adegan 3 | Kamera |
| 2 | Penenun senior & ruang tenun sepi | Animasi ilustrasi, atau cuplikan video open source |
| 4 | Logo + close-up kacamata di meja | Kamera + animasi |
| 5 | Andrew kiri, grid video open source kanan | Kamera + animasi |
| 6 | Video tenun open source + kotak deteksi, label tahap/istilah/kesalahan | Rekam layar aplikasi (mode berkas video) + animasi di atasnya |
| 7 | Validasi | Rekam layar halaman Editor + animasi |
| 8 | Murid memakai kacamata, menekan Start di HP | Kamera: wajah + tangan di HP, latar blur |
| 9 | Tahap 2/5 | Rekam layar aplikasi dengan video POV tenun, dibingkai lensa/HUD |
| 10 | Istilah daerah | Cuplikan video sumber yang memperlihatkan benang pakan + kartu kosakata animasi |
| 11 | Koreksi | Cuplikan video sumber saat pinggir kain tidak rata (atau saat penenun membetulkan) + sorot oranye animasi + suara tutor asli |
| 12–13 | Murid bertanya | Kamera: close-up wajah samping, latar blur. Suara tutor dari aplikasi asli |
| 14 | Pendamping | Rekam layar HP `/pendamping.html` yang menampilkan video sumber; kamera: tangan seseorang memegang HP. Tidak perlu penenun sungguhan, cukup "pendamping" |
| 15, 20, 27 | Andrew | Kamera |
| 16–19 | Catatan, progres, offline, arsip | Rekam layar |
| 21 | Uji coba | Teman/pengguna mencoba **aplikasinya** (mode berkas video) di laptop/HP, bukan menenun. VO: "Kami menguji tutor dengan [N] pengguna dan [M] video tenun." |
| 22 | Akurasi | Rekam layar `npm run evaluate` + grafik animasi. Ini bukti teknis terkuat dan sama sekali tidak butuh alat tenun |
| 23 | Testimoni | Pengguna yang mencoba aplikasi. Jika ada, rekaman video call dengan penenun/guru tenun yang memeriksa modul |
| 24–26, 28 | Bisnis, peta, montase, penutup | Animasi + footage di atas |

Komposisi kira-kira: **45% animasi, 35% rekam layar aplikasi, 20% footage Andrew & murid.**

## Cara membuat POV terasa nyata tanpa alat tenun

- **Bingkai lensa:** rekam layar aplikasi lalu taruh di dalam bentuk lensa kacamata dengan sudut membulat dan vignette tipis, plus HUD di atasnya. Ini cara umum di video produk kacamata.
- **Potong bolak-balik:** 2–3 detik POV (video sumber) → 1 detik wajah murid memakai kacamata, mata melihat ke bawah seperti sedang bekerja → kembali ke POV. Otak penonton menyambungkan keduanya.
- **Suara:** tambahkan bunyi alat tenun (bisa diambil dari audio video sumber) di bawah suara tutor.
- **Jujur:** label pojok kecil *"Input: video tenun [lisensi] · [pembuat]"* setiap kali video sumber dipakai, dan di adegan 21 sebut bahwa uji coba memakai video. Juri menilai keandalan sistem, dan cara ini justru menunjukkan metode pengujian yang rapi.

## Yang tidak bisa diakali (dan cara menyikapinya)

- **Adegan murid benar-benar menenun** tidak ada. Jangan dipalsukan dengan animasi yang terlihat seperti footage asli. Cukup POV video sumber + wajah murid.
- **Uji coba belajar menenun langsung** belum bisa. Di video dan proposal, tulis sebagai rencana tahap berikutnya ("uji coba lapangan dengan sanggar"), dan tampilkan uji yang sudah ada: akurasi deteksi dan uji pengguna aplikasi.

## Gaya animasi agar konsisten

- Latar krem hangat, aksen satu warna dari motif tenun, font serif untuk teks melayang (seperti video referensi).
- Ilustrasi flat untuk penenun dan alat tenun (adegan 2, 6, 25), garis tipis seperti sketsa kacamata di kartu penutup.
- Kartu HUD: putih transparan, sudut membulat, ikon kecil, bilah keyakinan.
- Aset ilustrasi dan musik: buat sendiri atau pakai yang berlisensi jelas, lalu cantumkan di kredit.

## Daftar yang perlu disiapkan (revisi)

- 3–5 video POV tenun open source (CC BY/CC0/domain publik), cari yang memperlihatkan tahap membuka lungsi, memasukkan pakan, merapatkan, dan idealnya ada momen membetulkan kesalahan.
- Kacamata + 2 HP + laptop dengan OBS.
- Andrew + 1 orang sebagai murid + 3–5 teman untuk uji aplikasi.
- Lokasi Tokopedia + sudut tenang dengan latar yang bisa di-blur.
