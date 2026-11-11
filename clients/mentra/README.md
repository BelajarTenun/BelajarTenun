# Miniapp MentraOS – BelajarTenun

Untuk kacamata yang didukung MentraOS (cek `glasses-compatibility.md` di repo MentraOS). Mentra Live = kamera + mic + speaker (tanpa layar) → otomatis mode suara saja.

1. Salin folder ini ke template miniapp resmi (`MentraOS/examples/miniapp`) atau buat proyek dengan `@mentra/miniapp-cli`.
2. Set saat build: `MENTRA_PUBLIC_BT_SERVER=https://server-kamu` dan `MENTRA_PUBLIC_BT_DEVICE_TOKEN=<kode akses dari /masuk.html>`.
3. Build & pasang lewat aplikasi Mentra (mode developer).

Status: **belum diuji di perangkat** (dibuat dari API contoh resmi MentraOS, Nov 2026). Uji dulu `takePhoto`, `blob.bytes`, dan `transcription.on` di halaman SDK Tester miniapp contoh.
