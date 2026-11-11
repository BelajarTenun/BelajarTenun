# Bridge Brilliant Labs Frame – BelajarTenun

Frame punya kamera, layar lensa, dan mic, tapi **tanpa speaker** → suara diputar di laptop/HP (pakai earbuds).

```bash
pip install -r requirements.txt
BT_SERVER=http://localhost:3000 BT_DEVICE_TOKEN=bt_xxx python bridge.py
```

| Variabel | Arti |
|---|---|
| `BT_SERVER` | Alamat server BelajarTenun |
| `BT_DEVICE_TOKEN` | Kode akses perangkat (buat di `/masuk.html`) agar progres tercatat atas namamu |
| `BT_INTERVAL` | Jeda foto (detik, default 3) |
| `BT_AUDIO_ONLY=1` | Jangan tampilkan teks di lensa |

Tap Frame = lanjut ke tahap berikutnya. Ketik pertanyaan di terminal (atau sambungkan ke speech-to-text).

Status: **belum diuji di perangkat**. `frame-sdk` Python berlabel *deprecated*; untuk produk akhir port ke SDK Flutter Brilliant Labs (referensi: `noa-flutter`).
