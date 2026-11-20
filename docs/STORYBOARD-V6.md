# Storyboard v6: setiap kalimat divisualisasikan

Prinsip:
- **Setiap kalimat Andrew punya gambar yang menunjukkan isinya**, bukan teks yang muncul.
- **Penenun selalu hadir**: figur penenun animasi (dikoding, gerak luwes) dan video tenun asli.
- **Teknik bervariasi**; teks di belakang Andrew hanya 3 kali, di kalimat yang cocok.
- **Sleek**: tanpa kotak di belakang nama atau subtitle. Lower-third = teks putih + garis emas tipis.
- **Subtitle**: putih, ada spasi normal antar-kata (bug sebelumnya diperbaiki), kata kunci emas.
- Warna: navy, krem, emas, putih. Efek suara asli CC0 per kejadian.

Jenis teknik (agar bervariasi): **[D]** teks di belakang Andrew · **[A]** animasi figur penenun layar penuh · **[V]** video tenun asli + anotasi · **[M]** peta · **[U]** UI aplikasi/HP · **[S]** layar terbagi · **[F]** freeze-frame + label di footage · **[G]** grafik/data · **[T]** transisi objek jadi adegan.

---

## Babak 1 · Masalah & produk

| Kalimat | Visual (yang digambarkan) | Teknik | Efek suara |
|---|---|---|---|
| "Selama ratusan tahun," | Andrew bicara; **"RATUSAN TAHUN"** muncul di belakangnya. Nama Andrew muncul di kiri bawah tanpa kotak | D | whoosh lembut |
| "menenun diajarkan dari tangan ke tangan." | Layar penuh krem: penenun tua menenun, lalu **menyerahkan kain ke tangan anak**; anak itu tumbuh jadi dewasa lalu menyerahkan ke anak berikutnya. Garis waktu tahun bergulir di bawah (1800 → 1900 → 2000) | A | pop tiap serah-terima, tick tahun |
| "Tapi penenun senior semakin sedikit." | Lima penenun menenun berjajar, **satu per satu berhenti dan memudar**, tinggal satu | A | tick tiap memudar |
| "Anak muda yang ingin belajar" | Anak muda **berjalan masuk** dari kanan, membuka HP | A | langkah (tick), pop HP |
| "sering tidak punya akses ke guru." | Kamera mundur: anak muda di **kota** (gedung), penenun di **desa** jauh; garis putus-putus panjang di antara mereka. Di HP: "0 guru ditemukan" | A + U | whoosh mundur, pop |
| "Dan pengetahuannya perlahan-lahan hilang." | Kain bermotif **terurai benang demi benang**, motifnya hilang, benang jatuh | A | snap halus, riser kecil |
| "Bagaimana kalau ilmunya bisa ikut…" | Andrew memegang kacamata | – | – |
| "…di mata kita?" | Andrew memakai kacamata, **iris melingkar dari lensa** membuka ke pandangan POV alat tenun (bukan zoom berlebihan) | T | whoosh + riser berakhir di logo |
| "BelajarTenun adalah tutor AI di kacamata" | Logo resmi ditenun → **diagram kacamata terurai**: titik kamera di gagang disorot (label "kamera"), gelombang Bluetooth ke **HP** (label "tutor di HP") | G + U | impact (logo), pop tiap label |
| "yang mengajarkan pengetahuan dan teknologi tradisional menenun," | **Diagram alat tenun digambar garis demi garis**: tiang, lungsi, pakan, belida diberi label | A | tick tiap garis |
| "termasuk istilahnya dalam bahasa daerah," | Label di diagram **berputar seperti slot**: "pakan" → istilah tradisi A → B → C | A | tick tiap putaran |
| "langsung saat kita mencoba." | POV Andrew menenun, kartu tahap muncul di HP di samping | V + U | click, ding |

## Babak 2 · Dari data terbuka ke pelajaran

| Kalimat | Visual | Teknik | Efek suara |
|---|---|---|---|
| "Ilmu tenun sebenarnya sudah ada di mana-mana," | **Peta Indonesia pola titik**, titik-titik daerah tenun menyala dari barat ke timur | M | pop tiap titik |
| "ribuan video dan arsip yang dibagikan terbuka di internet," | Peta berubah jadi **dinding video tenun asli** bergulir miring (perspektif), makin banyak | V | whoosh, pop beruntun |
| "dan banyak tradisi." | Video berkelompok per daerah dengan label (Silungkang, NTT, Sumut, Lombok) | V | pop |
| "AI memecah setiap gerakan jadi setiap tahap," | Video penenun Lombok: **titik sendi tangan & garis kerangka** mengikuti gerak; garis waktu di bawah **terpotong jadi 5 tahap berwarna** | V + G | tick tiap potongan |
| "istilah, dan kesalahan yang sering terjadi." | Label istilah menempel di benda di video; satu momen diberi **tanda peringatan emas** "pakan terlalu kencang" | F | pop, glitch halus |
| "Lalu menggabungkan pola dari banyak penenun menjadi satu." | Beberapa garis waktu dari video berbeda **menumpuk lalu menyatu** jadi satu garis "Modul dasar" | G | whoosh, impact kecil |
| "Tapi AI bisa saja salah." | Kartu langkah buatan AI, satu kata **bergetar/salah** | U | glitch |
| "Untuk menjaga kualitas, setiap tahap diperiksa penenun sebelum diajarkan." | **Penenun tua memegang HP**, menggeser kartu: dicoret & diperbaiki, lalu **cap ✓** masuk ke kotak "Tervalidasi" | A + U | click, ding |

## Babak 3 · Cara belajar (footage + HP)

| Kalimat | Visual | Teknik | Efek suara |
|---|---|---|---|
| Andrew: "Halo BelajarTenun… langkah pertama aku harus apa?" | Wajah samping; **gelombang suara** mengalir dari Andrew ke HP di samping | U | blip |
| Tutor: "…benang yang tegak ini namanya lungsi. Angkat selang-seling…" | POV **berhenti sesaat**, benang tegak menyala emas + label LUNGSI; panah kecil **mengangkat benang selang-seling** | F | tick, pop label |
| Andrew: "Setelah nyampe sini aku harus apa?" | Sudut samping (7649) | – | – |
| Tutor: "…masukkan benang pakan dari kiri ke kanan, lewat celah itu." | Panah emas **bergerak dari kiri ke kanan melewati celah**, label PAKAN | F | whoosh kecil |
| Tutor: "Benang ini namanya pakan… setiap tradisi punya sebutannya sendiri." | Label PAKAN **berputar** ke istilah tiga tradisi | F | tick |
| Tutor: "Pakannya terlalu kencang, pinggirnya menyempit…" | Garis pinggir kain **digambar**: menyempit seperti corong, tanda peringatan | F | glitch halus |
| Andrew: "Oh, salah ya… ke sini." | Speed ramp: melambat lalu normal saat membetulkan | V | – |
| Tutor: "Nah, sudah rapi." | Garis pinggir jadi **sejajar**, centang | F | ding |
| Andrew: "Kenapa harus dirapatkan setiap baris?" | POV dari atas (7650) | – | – |
| Tutor: "Supaya kain padat dan motifnya tidak bergeser." | **Layar terbagi**: kain longgar (motif miring, berlubang) vs kain rapat (motif lurus) | S + A | pop |
| Andrew: "Kalau benangnya putus gimana?" | POV | – | – |
| Tutor: "Itu belum ada di modul… kucatat untuk penenun." | Pertanyaan **terbang dari HP ke penenun tua** yang menerima notifikasi | A + U | whoosh, ding |

HP kaca tetap di samping sepanjang babak dengan transkrip per kata.

## Babak 4–6 · Akses, hasil, beda

| Kalimat | Visual | Teknik | Efek suara |
|---|---|---|---|
| "Penenun tidak tergantikan." | **"TIDAK TERGANTIKAN"** di belakang Andrew | D | impact lembut |
| "Dengan BelajarTenun, akses ke mereka terbuka untuk lebih banyak murid, dari mana saja." | Satu penenun di tengah peta, **garis menyebar ke banyak murid** di berbagai kota | M + A | pop beruntun |
| "Setiap sesi meninggalkan catatan:" | HP: catatan sesi terisi | U | pop |
| "apa yang sudah bisa, apa yang membingungkan." | Daftar dengan **✓ (sudah bisa)** dan **? (membingungkan)** | U | tick, pop |
| "Dari situ kami bisa mengukur efektivitasnya" | Grafik batang per tahap tumbuh | G | tick |
| "dan memperbaiki tahap yang paling sulit." | Batang terendah disorot, **diperbaiki lalu naik** | G | ding |
| "Pengetahuan yang sudah divalidasi kami buka sebagai arsip publik," | Kartu-kartu tervalidasi **masuk rak arsip**, tombol unduh | U | pop |
| "supaya terus lestari." | **Kain yang terurai di awal video kini tertenun kembali** (balikan adegan "hilang") | A | riser kecil, ding |
| "Video tutorial tidak bisa melihat kesalahan kita." | Layar terbagi: laptop memutar tutorial, figur murid salah, **tidak ada respons** (✗) | S + A | – |
| "Kelas tatap muka terbatas tempat dan waktunya." | Kelas dengan **jam & pin lokasi**, kursi penuh | S + A | tick jam |
| "BelajarTenun menggabungkan keduanya:" | Dua panel **menyatu** jadi kacamata + HP | T | whoosh, impact |
| "melihat dari mata murid, mengoreksi saat itu juga, dan tetap setia pada ilmu penenunnya." | Tiga ikon muncul berurutan: **mata**, **koreksi**, **penenun** | G | pop ×3 |

## Babak 7–8 · Bukti & potensi

| Kalimat | Visual | Teknik | Efek suara |
|---|---|---|---|
| "Kami menguji deteksi tahapnya dengan berbagai video tenun berlabel dari berbagai tradisi." | Video berlabel **mengalir ke kotak uji**, keluar angka **87%** berhitung + batang (mockup, bertanda ilustrasi) | V + G | tick, impact |
| "Kami mulai dari sanggar dan sekolah." | Ikon **sanggar** dan **sekolah** muncul di samping Andrew | G | pop ×2 |
| "Setiap modul yang divalidasi memberikan penghasilan kepada para penenun," | Modul → **koin mengalir ke penenun tua** | A | pop koin |
| "dan setiap murid baru dapat memperluas ilmu mereka." | Jaringan murid tumbuh dari penenun | A | pop beruntun |
| "Dari satu tradisi ke seluruh tradisi Indonesia," | **Peta Indonesia pola titik**, pin emas menyebar | M | pop tiap pin |
| "dari Indonesia ke dunia." | Kamera mundur ke **peta dunia pola titik** dengan pin | M | whoosh, impact |

## Penutup

| Kalimat | Visual | Teknik | Efek suara |
|---|---|---|---|
| (musik) | Montase cepat footage di ketukan | V | – |
| "BelajarTenun. Belajar menenun, dipandu ilmu Nusantara." | **"NUSANTARA"** di belakang Andrew | D | riser |
| (akhir) | Logo ditenun + belajartenun.com | T | impact |

## Ringkasan teknik
- Teks di belakang Andrew: 3 kali (RATUSAN TAHUN, TIDAK TERGANTIKAN, NUSANTARA).
- Animasi figur penenun: ±12 kali (serah-terima, berkurang, desa–kota, kain terurai/tertenun kembali, validasi, notifikasi, kain longgar vs rapat, kelas, koin, jaringan).
- Video tenun asli dengan anotasi: ±8 kali.
- Peta: 4 kali. UI/HP: sepanjang babak 3 + 5 kali. Grafik: 5 kali.
