# Firmware Kacamata BelajarTenun

Firmware untuk **Seeed XIAO ESP32S3 Sense**. Kacamata MVP hanya punya **kamera + tombol + LED privasi**; mikrofon dan suara memakai HP (lihat `hardware/README.md`).

## Fitur
- **BLE** kompatibel dengan OpenGlass/omiGlass (UUID & format potongan foto sama), ditambah perintah dan event BelajarTenun.
- **Gerbang izin kamera**: kamera mati sampai aplikasi mengirim `CAMERA_ON`. Bila HP terputus, kamera otomatis mati. **LED privasi** menyala selama kamera aktif, dan urutannya dikunci di firmware (LED nyala sebelum sensor, padam setelah sensor mati).
- **Tombol**: ketuk = lanjut, ketuk ganda = ulangi, tahan = bekukan tampilan (tahan saat tidak tersambung = tidur).
- **Mode Wi-Fi** (opsional, lebih cepat): kacamata tersambung ke hotspot HP; aplikasi menarik foto lewat `http://<ip>/capture`.
- **Baterai** lewat Battery Service BLE standar; **deep sleep** setelah 5 menit tidak dipakai, bangun dengan tombol.
- **Pemulihan otomatis**: kamera diinisialisasi ulang setelah 3 kali gagal mengambil foto.

## Membangun & mengunggah
Butuh [PlatformIO](https://platformio.org/install/cli):
```bash
cd firmware/belajartenun-glasses
```
```bash
pio run -t upload
```
```bash
pio device monitor
```
CI (`.github/workflows/firmware.yml`) mengompilasi firmware di setiap perubahan dan menyimpan `firmware.bin` sebagai artifact.

Tes logika protokol di komputer (tanpa board):
```bash
g++ -std=c++17 -I src test/test_protocol.cpp -o /tmp/t && /tmp/t
```

## Protokol BLE (service `19B10000-E8F2-537E-4F6C-D104768A1214`)
| Karakteristik | UUID | Arah | Isi |
|---|---|---|---|
| Foto | `…10005` | notify | `[id_lo, id_hi, data]`; potongan 0 diawali 1 byte header `(versi<<4)\|orientasi`; `[FF FF]` = akhir foto |
| Kontrol lama | `…10006` | write | int8 OpenGlass: −1 satu foto, 0 berhenti, 1–127 interval detik |
| Perintah | `…10020` | write | `01` kamera on · `02` off · `03 ms_lo ms_hi` interval · `04 n` resolusi (0 QVGA, 1 VGA, 2 SVGA) · `05 q` kualitas · `06` foto sekarang · `10 ssid\0pass\0` · `11` Wi-Fi on · `12` off · `20` status |
| Event | `…10021` | notify | `01 b` tombol (1 ketuk, 2 ganda, 3 tahan) · `02 cam bat wifi ms_lo ms_hi res` status · `03 a b c d` IP Wi-Fi · `04 kode` kesalahan |
| Baterai | `0x180F/0x2A19` | read/notify | persen |

## Status pengujian
- ✅ Logika protokol, perintah, tombol, dan baterai: 121 cek di komputer; perakitan foto lintas bahasa (firmware C++ → aplikasi JS) dites di `npm test`.
- ✅ Dikompilasi oleh CI GitHub Actions (PlatformIO, espressif32 6.9.0).
- ⏳ **Belum diuji di board asli.** Uji urutan: serial monitor → sambung BLE dari aplikasi → LED menyala → foto masuk → tombol → Wi-Fi.
