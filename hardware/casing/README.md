# Casing Kacamata BelajarTenun

Desainnya mengikuti cara OpenGlass. **Modul kamera dipisah dari board** dan ditempel di ujung bingkai (dekat engsel) menghadap ke depan, tersambung ke XIAO lewat kabel pita (FPC). Kotak casing di gagang hanya berisi XIAO dan baterai.

<p align="center">
  <img src="../../docs/assets/kacamata-render.png" alt="Kacamata dengan casing BelajarTenun" width="720">
</p>

| Casing dan isinya | Casing tampak depan | Dudukan kamera |
|---|---|---|
| ![Tampilan terurai](../../docs/assets/casing-terurai.png) | ![Casing depan](../../docs/assets/casing-depan.png) | ![Dudukan kamera](../../docs/assets/dudukan-kamera.png) |

## Bagian yang dicetak

| Berkas | Bagian | Keterangan |
|---|---|---|
| `body.stl` | Badan casing | XIAO berdiri di depan, baterai di belakang. Dinding depan: celah kabel kamera, LED privasi, lubang mikrofon. Atas: tombol. Bawah: USB-C. |
| `lid.stl` | Tutup + penjepit | Tutup samping dengan bibir pas-tekan. Penjepit gagang dengan bibir pengunci, bisa dilepas tanpa lem. |
| `camera.stl` | Dudukan kamera | Kantong papan modul kamera (masuk dari belakang), lubang lensa, jalur kabel ke bawah, dan sirip untuk ditempel ke ujung bingkai. Kamera menunduk **25°** supaya tangan dan lungsi terlihat. |
| `*-v2-speaker.stl` | Varian v2 | Ruang tambahan untuk amplifier MAX98357A dan speaker 15 mm (lihat di bawah). |
| `belajartenun_casing.scad` | Sumber | Model parametrik OpenSCAD. Semua ukuran bisa diubah di bagian atas file. |

Ukuran luar badan casing ±23 × 22 × 37 mm, dudukan kamera ±13 × 8 × 13 mm.

## Sebelum mencetak: ukur komponenmu

Ukuran default diambil dari spesifikasi umum. Ukur dulu, lalu ubah parameter di `belajartenun_casing.scad`:

| Parameter | Yang diukur |
|---|---|
| `stack_d` | Tebal XIAO + board Sense setelah modul kamera dilepas |
| `usb_y` | Jarak tengah port USB-C dari dinding depan |
| `cam_module`, `cam_module_t` | Lebar dan tebal papan modul kamera |
| `lens_d` | Diameter laras lensa |
| `temple_t`, `temple_h` | Tebal dan tinggi gagang kacamata di dekat engsel |
| `camera_tilt` | Seberapa menunduk kamera (default 25°) |

Buat ulang STL setelah mengubah parameter:

```bash
openscad -D 'part="body"' -o body.stl belajartenun_casing.scad
```

```bash
openscad -D 'part="lid"' -o lid.stl belajartenun_casing.scad
```

```bash
openscad -D 'part="camera"' -o camera.stl belajartenun_casing.scad
```

## Pengaturan cetak

| Pengaturan | Saran |
|---|---|
| Bahan | PETG (lebih tahan panas, penjepit lebih lentur) atau PLA |
| Tinggi layer | 0,2 mm (0,12 mm untuk dudukan kamera) |
| Dinding / infill | 3 garis, 30–40% |
| Orientasi | Badan berdiri dengan sisi terbuka ke samping; tutup rebah; dudukan kamera dengan sirip di bawah |
| Support | Tidak perlu untuk badan dan dudukan; penjepit mungkin butuh support kecil |

Cetak satu kali percobaan, lalu sesuaikan `tol` (kelonggaran, default 0,4 mm) dan ukuran gagang.

## Merakit

1. Lepas modul kamera dari board Sense. Masukkan papan modul ke kantong dudukan kamera dari belakang, kabel pita keluar lewat jalur di bawah.
2. Tempel sirip dudukan kamera di sisi luar ujung bingkai dekat engsel (lem atau selotip dua sisi tipis), lensa menghadap ke depan.
3. Masukkan XIAO berdiri di bagian depan casing dengan USB-C menghadap lubang bawah. Lewatkan kabel pita kamera melalui celah di dinding depan, lalu sambungkan kembali ke konektor board Sense.
4. Solder baterai ke pad BAT+/BAT− XIAO, tombol, LED privasi, dan pembagi tegangan (skema di [`../README.md`](../README.md)). Letakkan baterai di belakang sekat, beri isolasi Kapton di antara baterai dan board.
5. Tekan tutup sampai bibirnya masuk, lalu jepitkan casing ke gagang tepat di belakang engsel.

Hati-hati dengan LiPo: jangan tertusuk, tertekuk, atau terjepit, dan jangan diisi daya tanpa diawasi saat pertama kali diuji.

## Varian v2: mikrofon + speaker di kacamata

Atur `with_speaker = true` untuk menambah ruang amplifier MAX98357A dan speaker mikro 15 mm, dengan kisi speaker di dinding belakang (mengarah ke telinga). Casing menjadi ±23 × 27 × 43 mm. Untuk MVP varian ini tidak disarankan (alasannya di [`../README.md`](../README.md)), dan firmware audio di kacamata belum dibuat.
