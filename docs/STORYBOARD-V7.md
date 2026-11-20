# Storyboard v7: naskah gambar sangat rinci

Durasi target **±4:40** (batas juknis 3–5 menit). 1920×1080, 30 fps.
Dibangun dari v6, lalu ditambah tiga hal:
- **Reveal kacamata 3D** dari berkas STL asli di repo
- **Alur pengguna** memakai komponen asli `web/src/pages/*`
- **Alur penenun/admin** memakai `public/sumber.html`, `editor.html`, `progres.html`, `admin.html`

## 0. Aturan gaya (berlaku di semua adegan)

**Warna.** Hanya navy `#141c3a`, krem `#f5efe2`, emas `#d4b866`, dan putih. Bayangan selalu berwarna navy transparan, bukan hitam.

**Glassmorphism.** Hanya dipakai untuk bingkai HP dan kartu UI. Nama dan subtitle tidak memakai kotak.

**Gerak.**
- Semua gerak memakai pegas (spring), dengan damping 14–20.
- Tidak ada gerak linear, kecuali garis waktu.
- Setiap elemen masuk dengan offset 6–10 frame dari elemen sebelumnya (stagger).

**Satu bentuk berubah (morph).** Satu objek terus berubah antar-adegan, tidak potong-potong:
- kartu UI → HP → layar
- titik → peta
- benang → logo

**Kamera virtual selalu bergerak.**
- Dolly 2–4% per adegan, parallax tiga lapis (latar, objek, teks).
- Motion blur saat whip.
- Grain film tipis 3%.

**Kursor/jari.**
- Di UI HP, jari (lingkaran putih dengan riak) menekan tombol tepat pada kata yang diucapkan.
- Di laptop yang tampil adalah kursor panah.

**SFX.** Suara asli CC0 dari `sfx2/` dipakai di setiap kejadian. Mix akhir -16 LUFS, puncak di bawah -4 dBFS. Musik turun (duck) saat Andrew bicara.

**Komponen UI.** Kartu, tombol, ikon, dan teks diambil dari CSS/komponen frontend (`web/src/app.css`, `Icon.tsx`) lalu dibangun ulang di Remotion sebagai komponen React. Hasilnya UI asli, bukan tangkapan layar statis, sehingga setiap elemen bisa dianimasikan.

**Kode teknik:**

| Kode | Arti |
|---|---|
| D | teks di belakang Andrew |
| A | figur penenun |
| 3D | adegan 3D |
| U | UI aplikasi asli |
| V | video tenun asli |
| M | peta |
| G | grafik/diagram |
| F | freeze + label |
| S | layar terbagi |
| T | transisi objek |

---

## Babak 1 · Masalah (0:00–0:30)

| Waktu | Kalimat | Yang terjadi di layar (rinci) | Teknik | SFX |
|---|---|---|---|---|
| 0:00 | (hening 0,5 dtk) | Layar krem. Satu benang emas melintas mendatar dari kiri ke kanan, lalu menarik tirai krem ke atas. Di bawahnya Andrew sudah bicara. | T | whoosh lembut |
| 0:01 | "Selama ratusan tahun," | **RATUSAN TAHUN** muncul huruf demi huruf dari bawah di belakang Andrew. Teksnya besar (40% tinggi layar), krem 80%, dan sedikit parallax saat kamera dolly. Nama "Noe Andrew JM Silalahi · Ketua Tim BelajarTenun" muncul kiri bawah sebagai teks putih dengan garis emas 2 px yang tumbuh dari kiri. Nama hilang di 0:04. | D | whoosh |
| 0:03 | "menenun diajarkan dari tangan ke tangan." | Whip ke kanan menuju layar penuh krem. Isi adegan:<br>1. Penenun tua 3D duduk di alat tenun gedogan dan menenun dengan gerak lengan menyelipkan pakan.<br>2. Ia berhenti, mengangkat kain, dan menyerahkannya ke anak di kanan. Kamera pan ke kanan mengikuti kain.<br>3. Anak itu tumbuh (morph tinggi badan) menjadi dewasa dan menyerahkan kain ke anak berikutnya.<br>Di bawah, garis waktu bergulir 1825 → 1925 → 2025, dengan satu tick per angka. | 3D/A | pop tiap serah-terima, tick tahun |
| 0:07 | "Tapi penenun senior semakin sedikit." | Kamera mundur. Lima penenun 3D berjajar dan menenun serempak. Satu per satu (setiap 0,4 dtk) mereka berhenti, berubah warna menjadi garis krem, lalu larut menjadi debu benang yang jatuh. Tinggal satu penenun di tengah, diterangi cahaya emas tipis. | 3D | tick tiap memudar |
| 0:10 | "Anak muda yang ingin belajar" | Seorang anak muda 3D berjalan masuk dari kanan (animasi jalan Quaternius), berhenti, lalu mengeluarkan HP. | 3D | langkah, pop |
| 0:12 | "sering tidak punya akses ke guru." | Kamera naik dan mundur ke tampilan peta isometrik. Anak muda ada di kota (blok gedung low-poly, kanan), penenun di desa (rumah adat, kiri jauh). Di antara mereka tergambar garis putus-putus panjang. HP anak muda membesar ke depan dan menampilkan kartu "Cari guru tenun…". Spinner berputar, lalu muncul **0 guru ditemukan**. | 3D + U | whoosh mundur, pop, blip |
| 0:15 | "Dan pengetahuannya perlahan-lahan hilang." | Close-up kain bermotif (tekstur dari video Silungkang). Benang lepas satu per satu dari atas ke bawah, motifnya hilang, dan benang jatuh memakai fisika sederhana. Layar tinggal krem kosong. | 3D | snap halus ×5, riser kecil |
| 0:19 | "Bagaimana kalau ilmunya bisa ikut…" | Andrew memegang kacamata. Rack focus dari Andrew ke kacamata. | – | – |
| 0:21 | "…di mata kita?" | Andrew memakai kacamata. Iris melingkar terbuka dari lensa (diameter dari 0 ke penuh dalam 12 frame) ke POV alat tenun. | T | whoosh + riser naik |

## Babak 1b · Produk + KACAMATA 3D (0:24–0:52), adegan baru

| Waktu | Kalimat | Yang terjadi di layar (rinci) | Teknik | SFX |
|---|---|---|---|---|
| 0:24 | "BelajarTenun…" | Riser memuncak. Tiga lungsi krem jatuh dari atas, dua pakan emas menyelip, dan terbentuk **logo resmi**. Logo membesar sedikit, lalu menyusut ke pojok. | T | impact |
| 0:25 | "…adalah tutor AI di kacamata" | **Reveal kacamata 3D.** Modelnya dari STL asli repo:<br>- `hardware/omiglass/frame-front.stl`, `leg-left/right.stl`<br>- casing `hardware/casing/body-v2-speaker.stl`, `lid-v2-speaker.stl`, `camera.stl`<br><br>Urutan reveal:<br>1. Kacamata muncul dari gelap ke cahaya studio krem, berputar pelan 3/4 view, dengan bayangan lembut di lantai.<br>2. Lampu sorot menyapu dari kiri ke kanan (light sweep). | 3D | whoosh pelan, dengung lembut |
| 0:27 | (lanjut) "yang mengajarkan pengetahuan…" | **Exploded view.** Bagian-bagian kacamata memisah perlahan di ruang 3D:<br>- frame depan maju<br>- gagang membuka ke samping<br>- casing di gagang terangkat, tutupnya lepas ke atas<br>- modul kamera keluar ke depan<br><br>Garis label emas tipis tergambar dari tiap bagian ke teks putih, satu per satu: **Kamera**, **Mikrofon**, **Speaker**, **Baterai**, **Bluetooth**. | 3D + G | pop tiap label (5×) |
| 0:31 | "…dan teknologi tradisional menenun," | Kamera 3D zoom ke modul kamera sampai lensanya memenuhi layar. Di dalam lensa terlihat pantulan alat tenun (tekstur POV 7647). Masuk ke lensa: transisi ke POV asli. | 3D → T | whoosh masuk |
| 0:33 | "termasuk istilahnya dalam bahasa daerah," | POV asli. Benang lungsi menyala emas dan diberi label "lungsi". Labelnya berputar seperti slot ke istilah tiga tradisi, lalu berhenti. | F | tick tiap putaran |
| 0:36 | "langsung saat kita mencoba." | Kamera keluar dari POV, mundur ke adegan 3D: kacamata terakit kembali (exploded view dibalik), lalu muncul HP di sebelahnya. Gelombang Bluetooth (tiga busur emas) berdenyut dari gagang ke HP. Di HP tampil kartu tahap "Tahap 1/5". Teks kecil: "Kamera di kacamata · Tutor di HP". | 3D + U | blip berulang, ding |

## Babak 2 · ALUR PENGGUNA (0:40–1:15), adegan baru, memakai UI asli

Narasi baru untuk Andrew (perlu rekam tambahan sekitar 30 detik, atau dibaca dengan suara tutor dari ElevenLabs):

> "Cara pakainya sederhana. Masuk, pilih modul, sambungkan kacamata, lalu mulai latihan."

Tanpa rekam ulang pun adegan ini tetap jalan: cukup musik, SFX, dan teks langkah 1–4.

| Waktu | Langkah | Yang terjadi di layar (rinci) | Komponen asli | SFX |
|---|---|---|---|---|
| 0:40 | **Langkah 1 · Buka belajartenun.com** | HP glass di tengah layar, layar penuh krem. Penunjuk langkah "01" emas di kiri, garis tipis menuju HP. Di layar HP, URL `belajartenun.com` diketik huruf demi huruf, lalu halaman **Landing** meluncur naik. Jari menekan **Masuk**. | `Landing.tsx` | ketik (tick cepat), click |
| 0:44 | **Langkah 2 · Masuk Google** | Halaman **Masuk**: logo, teks "Pakai akun Google untuk menyimpan progres latihanmu.", tombol Google. Jari menekan tombolnya, muncul riak, dan avatar bulat terbang masuk ke pojok atas. | `Masuk.tsx`, `GoogleButton.tsx` | click, pop |
| 0:47 | **Langkah 3 · Pilih modul** | Halaman **Belajar**: kartu streak "berturut-turut berlatih" berhitung naik, grafik tujuh hari tumbuh, lalu daftar modul dengan status Tuntas / Sedang dipelajari / Berikutnya. Jari menggulir dan menekan **Mulai**. Kartu modul **memuai (morph)** menjadi halaman **Pengenalan**: video pengenalan diputar (klip Silungkang), lalu daftar tahap 1–5 dan "Yang dibutuhkan" muncul dengan stagger. Jari menekan **Mulai latihan**. | `Belajar.tsx`, `Pengenalan.tsx` | swipe, click, pop beruntun |
| 0:54 | **Langkah 4 · Sambungkan kacamata** | Halaman **Siapkan**. Ada dua kartu perangkat: "Kamera HP" dan "Kacamata BelajarTenun". Jari memilih kacamata.<br><br>Kamera virtual mundur sehingga terlihat HP dan **kacamata 3D** berdampingan. Dialog pemilihan Bluetooth Chrome muncul (dibangun ulang, sleek) dengan daftar "BelajarTenun-Glass" dan sinyal berdenyut. Jari menekan **Pasangkan**.<br><br>Garis putus-putus emas mengalir dari kacamata ke HP. Status berubah menjadi **"Tersambung lewat Bluetooth"** dengan centang. Pratinjau kamera di HP menyala dan menampilkan POV alat tenun asli. | `Siapkan.tsx`, `Icon glasses` | blip ×3, toggle, ding |
| 0:58 | **Alternatif · Pakai HP sebagai kamera** | Layar terbagi singkat (2 dtk). Kiri: laptop dengan **kode QR** (dari `Siapkan.tsx`, mode QR) yang tergambar modul demi modul. Kanan: HP memindai, garis pemindai emas naik-turun, lalu terbuka halaman **Kamera** "Jadikan HP ini kamera" dan kode 6 angka terisi otomatis digit demi digit, diikuti status "Terkirim ke laptop". Teks kecil: "Belum punya kacamata? Pakai HP." | `Kamera.tsx`, `Siapkan.tsx` (QR) | pop QR, blip pindai, tick ×6, ding |
| 1:01 | **Langkah 5 · Latihan** | Kembali ke HP. Halaman **Praktik** dengan kartu tahap, indikator tutor (logo berdenyut), dan teks petunjuk "Tutor memindahkan tahap sendiri. Bilang 'sudah', 'ulangi', atau tanyakan apa saja." Tiga kata kunci **sudah**, **ulangi**, **tanya** keluar sebagai pil kecil. Lalu transisi zoom masuk ke HP, menuju Babak 3 (demo asli). | `Praktik.tsx` | pop ×3, whoosh masuk |

## Babak 3 · Dari data terbuka ke pelajaran + SISI PENENUN (1:05–1:55)

| Waktu | Kalimat | Yang terjadi di layar (rinci) | Teknik / komponen | SFX |
|---|---|---|---|---|
| 1:05 | "Ilmu tenun sebenarnya sudah ada di mana-mana," | Peta Indonesia pola titik (titik krem). Titik daerah tenun menyala emas dari barat ke timur dengan stagger 3 frame. | M | pop beruntun |
| 1:08 | "ribuan video dan arsip yang dibagikan terbuka di internet," | Titik-titik terbang ke depan dan berubah menjadi thumbnail video. Hasilnya dinding video miring (perspektif 3D) yang bergulir dan makin padat. Isinya video tenun asli. | V | whoosh, pop beruntun |
| 1:11 | "dan banyak tradisi." | Video mengelompok per daerah dengan label Silungkang, NTT, Sumut, Lombok. | V | pop ×4 |
| 1:13 | (adegan admin: sumber) | **UI admin `sumber.html` di laptop glass.**<br>1. Kursor menekan **Tambah video**. Form meluncur dengan isian Tradisi tenun, Daerah, Jenis alat, dan **Status izin**, yang terisi otomatis dengan efek ketik.<br>2. Badge emas **"Izin: terbuka"** menempel.<br>3. Baris video baru masuk ke **Daftar video**. | U (`sumber.html`) | ketik, click, pop |
| 1:17 | "AI memecah setiap gerakan jadi setiap tahap," | Video Lombok layar penuh. Titik sendi tangan dan garis kerangka (dari `lib/kinematics.js`) mengikuti gerak. Garis waktu di bawah terpotong menjadi lima segmen dengan efek seperti gunting. Segmennya berwarna navy dan emas bergantian, diberi label nama tahap. | V + G | tick tiap potongan |
| 1:21 | "istilah, dan kesalahan yang sering terjadi." | Panel **"Istilah lokal (dugaan AI)"** dari `sumber.html` muncul di samping video. Istilah masuk satu per satu, masing-masing dengan tingkat keyakinan berupa batang kecil. Satu momen di video diberi tanda peringatan emas "pakan terlalu kencang". | U + F | pop, glitch halus |
| 1:25 | "Lalu menggabungkan pola dari banyak penenun menjadi satu." | Kursor menekan **Bangun draf kurikulum**. Tiga garis waktu dari tiga video berbeda melayang, menumpuk, lalu menyatu menjadi satu garis "Modul dasar". | U + G | whoosh, impact kecil |
| 1:29 | "Tapi AI bisa saja salah." | Kartu tahap buatan AI. Satu kata bergetar dan berubah menjadi teks coret. | U | glitch |
| 1:31 | "Untuk menjaga kualitas, setiap tahap diperiksa penenun sebelum diajarkan." | **UI `editor.html` (Editor Kurikulum).**<br>1. Penenun tua 3D duduk memegang tablet, lalu kamera masuk ke layar tablet.<br>2. Tampil daftar tahap. Satu tahap dikoreksi: teks salah tercoret dan teks benar diketik.<br>3. Dropdown **Status** berubah dari "Draf" ke "**Tervalidasi**", lalu cap ✓ emas jatuh dengan bounce.<br>4. Kursor menekan **Simpan semua**.<br>5. Panel "**Riwayat perubahan modul**" bertambah satu baris "Divalidasi oleh penenun mitra". | 3D + U (`editor.html`) | ketik, click, impact cap, ding |
| 1:38 | (lanjut, tanpa kalimat baru) | Modul tervalidasi **terbang keluar dari tablet ke HP murid**. HP murid ada di kanan, daftar modul di `Belajar.tsx` bertambah satu kartu. Teks kecil: "Modul muncul di sini setelah diterbitkan oleh penenun mitra" (teks asli aplikasi). | U + T | whoosh, pop |

## Babak 3b · MITRA: Puta Dino Kayangan, Tidore (1:42–1:58), adegan baru

Tujuannya kredibilitas. Kerja samanya dua:
1. Penenun Puta Dino Kayangan **memvalidasi** materi belajar.
2. Mereka **membagikan data arsip** untuk dijadikan bahan belajar.

Narasi (rekaman tambahan Andrew, sekitar 12 detik):

> "Kami bekerja sama dengan Puta Dino Kayangan di Tidore. Para penenunnya memvalidasi setiap tahap, dan arsip mereka kami olah jadi materi belajar."

| Waktu | Kalimat | Yang terjadi di layar (rinci) | Teknik | SFX |
|---|---|---|---|---|
| 1:42 | (transisi) | Modul yang tadi terbang ke HP berbalik arah. Kamera mundur ke peta Indonesia pola titik, lalu terbang cepat ke timur. Pin emas menancap di **Tidore, Maluku Utara**, disertai riak lingkaran. | M | whoosh panjang, impact pin |
| 1:44 | "Kami bekerja sama dengan Puta Dino Kayangan di Tidore." | Pin membuka menjadi kartu kaca, dan **logo mitra** (`web/public/partner-puta-dino-kayangan.png`) ditenun masuk. Di kanan, logo BelajarTenun meluncur masuk. Sebuah benang emas menyambung kedua logo dan terikat di tengah (simpul kecil dengan bounce). Teks: **"Mitra penenun · UKM Puta Dino Kayangan · Soasio, Tidore"**. | T + G | pop, snap simpul, ding |
| 1:47 | (lanjut) | Fakta singkat muncul dengan stagger, tanpa kotak, teks putih/krem dengan angka emas:<br>- "Puta dino: kain tenun warisan Kesultanan Tidore"<br>- "Sempat punah ±**100 tahun**", dengan angka yang berhitung naik<br>- "Ditenun kembali sejak **2018**"<br><br>Sumbernya data `knowledge.json`, dari jurnal Jambura 2024. Kredit sumber cukup di proposal. | G | tick |
| 1:50 | "Para penenunnya memvalidasi setiap tahap," | Close-up UI `editor.html`. Kartu tahap modul **"Tidore dasar"** (`data/modules/tidore-dasar.json`) masuk satu per satu. Di tiap kartu jatuh cap emas **"Divalidasi penenun Puta Dino Kayangan"**, sehingga terdengar 3 cap berurutan. Nama validator di panel "Riwayat perubahan modul" diketik. | U | impact cap ×3, ding |
| 1:54 | "dan arsip mereka kami olah jadi materi belajar." | **Arsip menjadi pelajaran.**<br>1. Tumpukan arsip (foto kain, catatan motif, video) melayang masuk dari kiri.<br>2. Masing-masing berubah (morph) menjadi elemen pelajaran: foto motif menjadi kartu ornamen **jodati, barakati, marasante** dengan artinya (ketulusan hati, diberkati, keberanian); catatan menjadi tahap; video menjadi klip pengenalan modul.<br>3. Semuanya tersusun rapi di HP murid, di halaman `Pengenalan.tsx` modul Tidore. | T + U | whoosh, pop beruntun |
| 1:57 | (penutup adegan) | Tagline kecil: **"Divalidasi penenun. Dari arsip mitra."** Lalu whip ke Babak 4. | – | whoosh |

Catatan:
- **Durasi.** Agar total tetap ≤5 menit, sisipan `admin.html` (2:59) dan alternatif QR (0:58) dipersingkat 2 dtk masing-masing.
- **Foto asli.** Kalau ada foto/video asli bersama penenun Puta Dino Kayangan (sesi validasi, kain, arsip), itu jauh lebih kuat daripada animasi dan bisa langsung menggantikan latar adegan 1:50–1:57. **Pastikan ada izin** mitra untuk menampilkan logo, nama, dan wajah penenun.
- **Babak 4.** Momen "kucatat untuk penenun" di demo kini diarahkan ke penenun Puta Dino Kayangan.

## Babak 4 · Demo nyata (1:42–2:35), footage + HP glass

Sama seperti v6 Babak 3 (footage multicam 7647/7648/7649/7650, tutor T1–T7), ditambah:

- **HP glass di samping memakai UI `Praktik.tsx` asli.** Isinya kartu tahap, nomor tahap yang maju sendiri (1/5 → 2/5 …), dan transkrip per kata.
- **Setiap saat tutor bicara, logo di HP berdenyut** (`Mark speaking`).
- **Freeze-frame dengan anotasi:**
  - LUNGSI menyala, panah mengangkat benang selang-seling
  - panah PAKAN bergerak kiri→kanan melewati celah
  - istilah tiga tradisi berputar seperti slot
  - garis pinggir kain menyempit seperti corong, lalu menjadi sejajar dengan centang
- **Layar terbagi kain longgar vs rapat** memakai kain 3D.
- **"Itu belum ada di modul… kucatat untuk penenun"**:
  1. Pertanyaan berbentuk kartu terbang dari HP.
  2. Kamera mengikuti kartu itu ke `editor.html` bagian **"Pertanyaan pemula yang belum terjawab"**, dan kartu masuk ke daftar.
  3. Penenun tua 3D menoleh dan mengetik jawaban.
  4. Jawabannya masuk ke **"Knowledge base (tanya jawab)"**.

## Babak 5 · Akses, progres, beda (2:35–3:30)

| Waktu | Kalimat | Yang terjadi di layar (rinci) | Teknik / komponen | SFX |
|---|---|---|---|---|
| 2:35 | "Penenun tidak tergantikan." | **TIDAK TERGANTIKAN** di belakang Andrew. | D | impact lembut |
| 2:38 | "…akses ke mereka terbuka untuk lebih banyak murid, dari mana saja." | Satu penenun 3D di tengah peta. Garis emas memancar ke murid-murid kecil di berbagai kota, yang muncul dengan pop beruntun. | M + 3D | pop beruntun |
| 2:44 | "Setiap sesi meninggalkan catatan:" | **UI `Selesai.tsx`.** Angka "Tahap dicapai", "Durasi", dan "Pertanyaan ke tutor" berhitung naik. | U | tick |
| 2:47 | "apa yang sudah bisa, apa yang membingungkan." | Kuesioner "Bagaimana latihanmu?". Jari memilih bintang dan mencentang "Bagian yang membingungkan", lalu muncul pesan "Terima kasih. Masukanmu membantu penenun memperbaiki modul ini." | U | click, pop |
| 2:51 | "Dari situ kami bisa mengukur efektivitasnya" | **UI `progres.html` (dashboard admin) di laptop glass.** Grafik "Per tahap" tumbuh batang demi batang, dan panel "Riwayat sesi" terisi. | U + G | tick |
| 2:55 | "dan memperbaiki tahap yang paling sulit." | Panel "**Tahap tersulit (bahan revisi kurikulum)**" menyorot batang terendah dengan cincin emas. Kursor mengeklik dan pindah ke editor. Tahap diperbaiki, kembali ke grafik, batang naik dengan bounce. | U + G | click, ding |
| 2:59 | (sisipan admin singkat) | **UI `admin.html`.** Kartu "Cek koneksi" (centang hijau → dibuat emas), "Pemakaian AI" (tabel panggilan dan p50/p95), dan "Akun" (daftar murid dan penenun dengan peran). Kamera menyapu panel-panel ini dengan dolly diagonal selama 2 dtk. Teks: "Dashboard tim". | U | whoosh, pop ×3 |
| 3:02 | "Pengetahuan yang sudah divalidasi kami buka sebagai arsip publik," | Kartu modul tervalidasi masuk ke rak arsip. Muncul ikon unduh dan label "Arsip terbuka". | U | pop |
| 3:06 | "supaya terus lestari." | **Kain 3D yang terurai di 0:15 kini tertenun kembali**: benang naik dan motif muncul lagi (adegan "hilang" diputar terbalik). | 3D | riser, ding |
| 3:10 | "Video tutorial tidak bisa melihat kesalahan kita." | Layar terbagi kiri: laptop memutar tutorial, murid 3D salah, ✗ tidak ada respons. | S + 3D | – |
| 3:14 | "Kelas tatap muka terbatas tempat dan waktunya." | Layar terbagi kanan: kelas dengan jam dan pin lokasi, kursi penuh. | S + 3D | tick jam |
| 3:18 | "BelajarTenun menggabungkan keduanya:" | Dua panel menyatu ke tengah, lalu berubah (morph) menjadi **kacamata 3D + HP**. | T + 3D | whoosh, impact |
| 3:21 | "melihat dari mata murid, mengoreksi saat itu juga, dan tetap setia pada ilmu penenunnya." | Tiga ikon muncul berurutan di sekitar kacamata 3D yang berputar: mata (dari lensa kamera), koreksi (centang), penenun (siluet). | G + 3D | pop ×3 |

## Babak 6 · Bukti & potensi (3:30–4:15)

| Waktu | Kalimat | Yang terjadi | Teknik | SFX |
|---|---|---|---|---|
| 3:30 | "Kami menguji deteksi tahapnya…" | Video berlabel mengalir ke kotak uji. Keluar angka **87%** yang berhitung naik, plus batang per tahap dan tabel kecil. Diberi tanda "Angka ilustrasi (mockup)" sampai ada data nyata dari `data/eval`. | V + G | tick, impact |
| 3:40 | "Kami mulai dari sanggar dan sekolah." | Ikon sanggar dan sekolah muncul di samping Andrew, ditambah logo mitra `partner-puta-dino-kayangan.png` dari repo. | G | pop ×2 |
| 3:45 | "Setiap modul… penghasilan kepada para penenun," | Modul berubah menjadi koin emas yang mengalir ke penenun tua 3D. Penenun tersenyum dan mengangguk. | 3D | pop koin |
| 3:50 | "…memperluas ilmu mereka." | Jaringan murid tumbuh dari penenun. | 3D | pop beruntun |
| 3:55 | "Dari satu tradisi ke seluruh tradisi Indonesia," | Peta Indonesia pola titik, pin emas menyebar. | M | pop tiap pin |
| 4:00 | "dari Indonesia ke dunia." | Kamera mundur ke bola dunia 3D pola titik yang berputar, dengan pin dan busur emas. | M + 3D | whoosh, impact |

## Penutup (4:15–4:40)

| Waktu | Yang terjadi | SFX |
|---|---|---|
| 4:15 | Montase cepat di ketukan (117 BPM, 2 ketukan per potong): kacamata 3D berputar → jari menekan "Mulai latihan" → POV → editor ✓ → grafik naik → penenun tua → Andrew tersenyum | whoosh pendek per potong |
| 4:24 | "BelajarTenun. Belajar menenun, dipandu ilmu Nusantara." **NUSANTARA** di belakang Andrew | riser |
| 4:31 | Logo ditenun dengan lungsi jatuh, pakan menyelip, dan cap. Kacamata 3D kecil berputar di bawahnya, plus **belajartenun.com**. Tanpa kredit. Kalimat terakhir tidak terpotong (beri 1 dtk jeda). | impact, gema |

---

## Kebutuhan teknis

1. **Kacamata 3D.** Muat STL repo dengan `three/examples/jsm/loaders/STLLoader` di `@remotion/three`.
   - Material krem/navy matte, lensa kaca transparan.
   - Pencahayaan studio: key, rim emas, fill.
   - Exploded view = animasi posisi per bagian.
2. **Figur penenun 3D.** Karakter CC0 Quaternius (perlu diunduh). Gerak menenun dibuat lewat kode (bone lengan). Kalau situs unduhan diblokir, kamu taruh zip di Drive.
3. **UI aplikasi.** Bangun ulang komponen `web/src/pages/*` dan halaman admin `public/*.html` sebagai komponen Remotion. Tampilannya sama dengan aplikasi tetapi bisa dianimasikan per elemen. Warna aplikasi yang di luar palet (mis. hijau) diganti emas/navy.
4. **Narasi tambahan.** Langkah alur pengguna (sekitar 30 detik) butuh suara. Pilihannya:
   - Andrew rekam 4 kalimat pendek, atau
   - cukup musik + SFX + teks langkah.
5. **Render.** 3D dirender di CPU (lebih lambat), jadi tetap dipotong per babak.

## Urutan kerja
1. Prototipe kacamata 3D (reveal + exploded view, 6 dtk). Kirim untuk dicek.
2. Prototipe alur pengguna (langkah 1–5, sekitar 20 dtk). Kirim.
3. Bila dua gaya itu disetujui, bangun babak demi babak dengan QC tiap babak.
