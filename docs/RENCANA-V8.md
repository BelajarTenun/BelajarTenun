# Rencana Video v8: footage Puta Dino Kayangan + alur baru

Status: **rencana, menunggu persetujuan**. Belum ada yang dirender.

## 0. Yang sudah dikerjakan sebelum rencana ini
- Gambar kacamata 3D di tengah dengan dua HP: landing di kiri, latihan live (POV menenun) di kanan. File: `docs/prototipe/hero-kacamata-hp.png`.
- Folder Drive "Video puta Dino" sudah diunduh dan ditranskripsi:
  - 14 video (dua di antaranya duplikat persis) dan 5 foto.
  - Model transkripsinya `small`. Hasilnya masih kasar, jadi semua klip akan ditranskripsi ulang dengan model `medium` sebelum dipotong.

## 1. Isi footage Drive

| File | Durasi | Isi | Ucapan (transkrip kasar) | Dipakai untuk |
|---|---|---|---|---|
| IMG_7796 | 11,2 dtk | **Owner** duduk di lantai, menunjukkan benang | "…diambil benangnya satu-satu… per biji… per lembar" | Validasi: owner menjelaskan cara benang diambil |
| IMG_7797 | 20,8 dtk | Close-up tangan owner memilin benang | "jadi kiri kanan kita tindir dulu… yang menghindari gumpal… sisanya dibuntin" | Validasi: owner mengoreksi teknik |
| IMG_7798 (+duplikat) | 5,6 dtk | Owner mengoperasikan alat meja | "kayak songket, jadi ngulang… beda banget" | Level 3 (alat empat gun) |
| IMG_7801 | 18,8 dtk | Andrew bertanya, owner menjawab | Andrew: "Ini masih susah banget ya, Bu?" Owner: "kalau ngitungnya salah… gambarnya enggak pas… bikin ayam, ayamnya bentuknya aneh" | **"AI bisa salah", divalidasi penenun** |
| IMG_7802 | 31,6 dtk | Owner bercerita sambil menunjuk | "gara-gara masang polanya salah… peta Indonesia harusnya Sumatranya di kiri… harus gambarnya kebalik… biasanya simetris, Indonesia enggak simetris" | **Validasi**: contoh kesalahan pola yang hanya diketahui penenun |
| IMG_7805 (3 salinan identik) | 7,1 dtk | HP memindai **label QR asli** di kain Puta Dino | "akhirnya kita selidiki… icon fashion" | **Alur pindai kain** |
| IMG_7818A / 7818b | 23 + 17 dtk | POV **bingkai sumpit** dengan sekoci hijau; Andrew bertanya | "kalau ini misalnya putus gitu gimana? disambung ke mana?" / "nah, baru dimasukkan seperti ini" | **Level 1 Dasar**, POV + tutor |
| IMG_7819 | 28,5 dtk | Andrew menenun di alat meja, owner membimbing | "benang pakannya… tempat simpan pakan… ketek belakang, rapatin dulu… sambil dirapatin… dikunci… rumusnya… yang mau menentukan motif" | **Level 3** + validasi owner |
| IMG_7824A / 7824b | 20 + 15 dtk | POV **inkle loom** + sekoci oranye | Andrew: "Oke, hari ini aku udah punya inkle loom, langkah pertama aku harus apa?" … "masukin… harus dirapetin" | **Level 2 Pengembangan**, POV + tutor |
| IMG_7826 | 11,3 dtk | POV **ATBM** | Andrew: "Sekarang aku udah punya ATBM, pertama harus apa?" | **Level 4 Kreasi**, POV + tutor |
| IMG_7828 | 12,8 dtk | Andrew di ATBM, sudut samping | Owner: "…pakai di rumah tenun…" | Level 4 + B-roll |
| Foto 7809–7816 | – | Bingkai sumpit, inkle loom, alat meja 4 gun, ATBM, alat bingkai besar | – | Kartu level di onboarding dan transisi antar-level |

**Aturan potong:**
- Setiap potongan diberi jeda **minimal 0,4 dtk sebelum kata pertama dan 0,6 dtk sesudah kata terakhir** (berdasarkan timestamp per kata), supaya tidak ada ucapan yang terpotong.
- Suara owner dan Andrew dibersihkan dengan rantai yang sama seperti footage lama (RNNoise, afftdn, loudnorm).

## 2. Penyesuaian dengan aplikasi asli (jangan mengarang)

| Permintaan | Keadaan di repo sekarang | Rencana |
|---|---|---|
| Login dengan Google | Ada (`Landing.tsx`, `Masuk.tsx`, `GoogleButton.tsx`) | Ditangkap dari aplikasi asli |
| **Onboarding pertanyaan untuk menentukan level 1–4** | **Belum ada di repo.** Modul hanya punya "kelas tugas" (Modul Dasar dulu, lalu motif). | **Halaman onboarding dibangun dulu di `web/`**: rute baru, beberapa pertanyaan, hasil level 1–4 dengan deskripsi persis dari kamu. Halaman ini di-commit dan dijalankan, baru kemudian ditangkap untuk video. Jadi video menampilkan halaman yang benar-benar ada. |
| Pindai label kain lalu muncul cerita sejarah dengan scroll | **Sudah ada**: rute `/k/:kode` dan `/cerita/:id` (`Cerita.tsx`) dengan kain yang "dibentangkan" saat digulir. Bab-bab di `data/stories/puta-dino-jodati.json`: arti Puta Dino, Kesultanan Tidore, foto dari Leiden, berdirinya Rumah Tenun (2018), motif Jodati, ke dunia (Hamburg 2026). Di akhir ada tombol **"Belajar menenun motif ini"**. | **Ditambah bab sejarah interaktif** di data cerita dan di `Cerita.tsx`. Isinya fakta yang ada sumbernya, misalnya:<br>- Portugis tiba di Maluku sekitar 1512<br>- Kapal Spanyol *Trinidad* dan *Victoria* tiba di Tidore pada November 1521: kapal berlayar dari kanan ke kiri saat digulir<br><br>Latarnya motif kain. Cukup 1–2 bab animasi baru. Setelah selesai, halamannya ditangkap sebagai video gulir sungguhan. |
| HP di samping POV diganti HP 3D | HP 3D sudah ada (`docs/prototipe/phone.html`) | HP 3D dirender **per frame** dengan rekaman layar asli (Praktik, Siapkan) di dalamnya, lalu diletakkan di samping POV |
| POV kacamata | Footage lama (kanvas kardus) | **Diganti sebanyak mungkin dengan footage Drive**: bingkai sumpit (L1), inkle loom (L2), alat meja (L3), ATBM (L4) |

## 3. Naskah v8 (rombakan, ±4:45)

Kalimat Andrew dari footage lama tetap dipakai bila cocok. ⚑ = butuh rekaman suara baru (lihat bagian 5).

### A. Masalah (0:00–0:30)
Babak 1 v7 dipakai apa adanya, termasuk adegan 3D yang sudah disetujui.

### B. Produk + kacamata 3D (0:30–0:42)
Andrew bergeser, kacamata 3D naik, lalu terurai menjadi bagian-bagiannya dan kamera masuk ke lensa. Sama dengan v7.

### C. Alur pengguna baru (0:42–1:20)
1. **Masuk dengan Google.** HP 3D menampilkan Landing asli: "in partnership with Puta Dino Kayangan", lalu tombol "Masuk dengan Google". ⚑ Andrew: "Masuk pakai akun Google…"
2. **Onboarding level.** HP 3D menampilkan halaman onboarding (dibangun nyata): 3–4 pertanyaan, lalu kartu hasil **Level 1 Dasar** (kardus/sumpit), dengan kartu L2–L4 yang terkunci di bawahnya. Di sampingnya muncul **foto alat asli dari Drive** (sumpit, inkle loom, alat 4 gun, ATBM), membentuk tangga 4 level. ⚑ Andrew: "Beberapa pertanyaan menentukan aku mulai dari level berapa."
3. **Sambungkan kacamata.** Halaman Siapkan asli di HP 3D, kacamata 3D, dan aliran Bluetooth.

### D. Versi lain: pindai kain Puta Dino (1:20–1:50)
1. **IMG_7805**: tangan memindai label QR asli di kain. Layar HP di footage (Google Lens dan iklan) **tidak dipakai**: begitu terpindai, transisi ke HP 3D.
2. **HP 3D** menampilkan rekaman layar `/k/:kode` yang digulir:
   - latar motif Jodati, kain terbentang
   - bab "Puta Dino, kain yang ditenun"
   - bab sejarah 1512/1521, dengan kapal berlayar kanan ke kiri
   - foto dari Leiden
   - berdirinya Rumah Tenun 2018
3. Di akhir cerita jari menekan **"Belajar menenun motif ini"**, lalu lanjut ke latihan.

⚑ Andrew: "Setiap kain Puta Dino punya kode. Pindai, dan ceritanya terbuka."

### E. Latihan per level, POV dari Drive + HP 3D (1:50–2:55)
1. **Level 1, bingkai sumpit (IMG_7818A/7818b).**
   - Andrew: "kalau ini putus gimana? disambung ke mana?" (suara asli)
   - Tutor ⚑ menjawab
   - POV memasukkan sekoci hijau
2. **Level 2, inkle loom (IMG_7824A/b).**
   - Andrew: "Oke, hari ini aku udah punya inkle loom, langkah pertama aku harus apa?" (suara asli)
   - Tutor ⚑ menjawab
   - Freeze dengan label LUNGSI/PAKAN/SEKOCI, lalu "harus dirapetin"
3. **Level 3, alat meja empat gun (IMG_7819, IMG_7798).**
   - Andrew menenun dengan owner di sampingnya
   - Label urutan pengangkatan gun (1-3, 2-4)
   - Tutor ⚑
4. **Level 4, ATBM (IMG_7826, IMG_7828).**
   - Andrew: "Sekarang aku udah punya ATBM, pertama harus apa?" (suara asli)
   - Tutor ⚑
   - Owner: "…pakai di rumah tenun…"
5. Footage kanvas kardus lama dipakai sebagai sisipan pendek saja, atau dibuang bila waktunya tidak cukup.

Di samping setiap POV ada HP 3D berisi layar Praktik asli: tahap, Live, dan transkrip.

### F. Dari data ke pelajaran + validasi Puta Dino Kayangan (2:55–3:45)
1. "Ilmu tenun sudah ada di mana-mana…": peta 3D dan dinding video (lihat bagian 4).
2. "AI memecah setiap gerakan…": visual 3D baru (bagian 4).
3. **"Tapi AI bisa saja salah"**: **IMG_7801**.
   - Andrew: "Ini masih susah banget ya, Bu?"
   - Owner: "kalau ngitungnya salah… gambarnya enggak pas… ayamnya bentuknya aneh"
4. **IMG_7802**: owner menjelaskan pola peta Indonesia yang harus dibalik (Sumatra di kiri) dan pola yang tidak simetris. Ini **bukti nyata**: ada pengetahuan yang hanya diketahui penenun.
5. "Untuk menjaga kualitas, setiap tahap diperiksa penenun…":
   - **IMG_7797**: owner memperagakan teknik, lalu cut ke Editor Kurikulum asli dengan tahap yang ditandai
   - **IMG_7796**: owner menjelaskan cara benang diambil
6. **Mitra Puta Dino Kayangan**: footage owner + logo dan fakta (dari data repo), dengan lower-third nama owner bila diizinkan.

### G. Akses, progres, beda, bukti, potensi, penutup (3:45–4:45)
Kalimat Andrew sama seperti v7. Semua visual generik diganti (bagian 4), plus montase penutup memakai footage Drive.

## 4. Animasi yang dirombak (bukan kotak teks)

Pendekatan: **3D (three.js, render per frame seperti adegan penenun & kacamata)** untuk konsep, ditambah footage asli. Setiap visual menggambarkan isi kalimatnya.

| Kalimat | Visual baru |
|---|---|
| "AI memecah setiap gerakan jadi setiap tahap" | Video penenun ditampilkan sebagai **layar 3D yang miring**. Dari tangan penenun keluar **titik sendi 3D** yang meninggalkan jejak gerak (motion trail emas). Jejak itu "dipotong" menjadi 5 **balok 3D** (tahap) yang jatuh tersusun di rak, masing-masing berlabel nama tahap asli dari modul. |
| "istilah, dan kesalahan yang sering terjadi" | Label istilah **menempel di benda 3D** (pedang/belida, sekoci, lungsi) dengan garis penunjuk. Kesalahan "pinggir menyempit" ditunjukkan dengan **kain 3D yang tepinya menyempit seperti corong**, lalu diperbaiki menjadi lurus. |
| "menggabungkan pola dari banyak penenun menjadi satu" | Tiga **pita benang 3D** dari tiga video mengalir dan **ditenun menjadi satu kain**. Kain itu menjadi kartu "Modul Dasar". |
| Mitra penenun | Footage owner Puta Dino Kayangan (IMG_7802/7796), **peta 3D Maluku** dengan pin Tidore yang terangkat, kain Puta Dino 3D berkibar, dan logo. Bukan dua kotak logo. |
| Validasi materi bersama penenun | **IMG_7801/7797**, lalu cut ke Editor Kurikulum asli. Tahap yang sedang dibahas owner disorot di layar, sinkron dengan ucapannya. |
| Arsip mitra jadi materi belajar | **Foto arsip → buku 3D terbuka**. Halamannya terlipat menjadi **kartu modul 3D** yang masuk ke HP 3D yang menampilkan halaman Modul asli. |
| "akses ke mereka terbuka untuk lebih banyak murid" | **Peta Indonesia 3D** (ekstrusi). Dari Tidore memancar **busur cahaya** ke banyak titik kota. Di tiap titik muncul figur murid 3D kecil yang membuka HP. |
| "Pengetahuan yang sudah divalidasi kami buka sebagai arsip publik" | **Rak/perpustakaan 3D**. Kartu modul bercap penenun **terbang masuk ke rak**, lalu pintu rak terbuka (simbol terbuka) dan kain tertenun kembali ("lestari"). |
| "Video tutorial tidak bisa melihat kesalahan kita" | **Laptop 3D** memutar video tutorial. Figur murid 3D menenun **salah** (tepi menyempit, ditandai merah redup → emas). Video terus berjalan **tanpa reaksi**, dengan ikon mata tertutup. |
| "Kelas tatap muka terbatas tempat dan waktunya" | **Ruang kelas 3D** dengan kursi penuh, jam dinding yang berputar cepat, dan pintu yang tertutup bagi figur yang datang terlambat. |
| "BelajarTenun menggabungkan keduanya" | Laptop dan ruang kelas **meleleh/bergabung** menjadi kacamata 3D + HP 3D. |
| "melihat dari mata murid, mengoreksi saat itu juga, setia pada ilmu penenunnya" | **Andrew tidak lagi freeze.** Tiga momen dari footage Drive:<br>1. POV dari kacamata (**melihat**)<br>2. tutor mengoreksi dengan anotasi di POV inkle loom (**mengoreksi**)<br>3. owner Puta Dino Kayangan mengangguk / IMG_7819 (**setia pada penenun**)<br><br>Ketiganya muncul berurutan di samping Andrew yang tetap bergerak. |

Referensi teknik dan aset:
- three.js / Remotion: pipeline 3D yang sudah ada.
- Ikon: Lucide (ISC).
- Kapal: model kapal karak low-poly CC0 (mis. Quaternius "Pirate Kit", CC0) bila bisa diunduh; kalau tidak, dibuat prosedural.
- Peta 3D: ekstrusi dari `world-atlas` (sudah terpasang).

Setiap aset dicatat lisensinya di proposal.

## 5. Yang perlu kamu sediakan

### Suara Andrew (rekam HP cukup, tempat tenang)
1. "Masuk pakai akun Google, lalu jawab beberapa pertanyaan. Dari situ BelajarTenun menentukan aku mulai dari level berapa."
2. "Ada empat level: dasar dengan kardus atau sumpit, pengembangan dengan inkle loom, teknik lanjutan dengan alat empat gun, dan kreasi dengan ATBM."
3. "Setiap kain Puta Dino punya kode. Pindai, dan ceritanya terbuka, dari sejarah sampai motifnya."
4. "Kami bekerja sama dengan Puta Dino Kayangan di Tidore. Para penenunnya memeriksa materi kami, dan arsip mereka kami olah jadi pelajaran."

### Suara tutor (ElevenLabs, suara yang sama dengan T1–T7)
- **T8** (balasan "kalau putus disambung ke mana?", bingkai sumpit): "Ikat ujung benang yang putus dengan benang baru di bagian belakang, lalu lanjutkan memasukkan pakan seperti biasa."
- **T9** (inkle loom, langkah pertama): "Pertama, angkat atau turunkan benang lungsi supaya celahnya terbuka, lalu masukkan sekoci dari kiri ke kanan."
- **T10** (inkle loom, rapatkan): "Setelah sekoci lewat, rapatkan pakannya ke arah badanmu supaya barisnya padat."
- **T11** (alat empat gun): "Di alat empat gun, urutan pengangkatan gun menentukan pola. Coba angkat gun satu dan tiga dulu."
- **T12** (ATBM, langkah pertama): "Di ATBM, injak pedal untuk membuka mulut lungsi, lalu lempar teropong, dan tarik sisir untuk merapatkan."

⚠ Isi teknis T8–T12 **harus dicek owner Puta Dino Kayangan** sebelum direkam, supaya tutornya tidak mengajarkan hal yang salah.

### Izin dan data
- Izin menampilkan wajah dan suara owner, nama lengkap beserta jabatan untuk lower-third, dan logo.
- Kode QR di label kain itu mengarah ke mana? Kalau belum ke `belajartenun.com/k/<kode>`, saya pakai satu kode contoh di data cerita.
- Sumber sejarah untuk bab interaktif:
  - Spanyol (Trinidad & Victoria) tiba di Tidore November 1521
  - Portugis di Maluku sekitar 1512

  Owner boleh mengoreksi sebelum masuk aplikasi.

## 6. Urutan kerja
1. Transkripsi ulang (model medium), lalu daftar potongan final dengan timestamp.
2. **Aplikasi**: bangun halaman onboarding level dan tambahkan bab sejarah interaktif + kapal di `Cerita.tsx`. Keduanya di-commit dan dijalankan.
3. Rekam layar asli: onboarding, cerita `/k/:kode`, Praktik, Modul.
4. Prototipe 3 animasi baru dulu (AI memecah gerakan, akses terbuka, tutorial vs kelas) dan kirim untuk dicek.
5. Bangun video v8 babak per babak dengan QC tiap babak (suara tidak terpotong, sinkron caption).
6. Render penuh, perbarui landing page, push.
