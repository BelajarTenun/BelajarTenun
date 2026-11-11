# Privasi, Keamanan, dan Etika (F11)

## Data yang disimpan
| Data | Disimpan? | Catatan |
|---|---|---|
| Foto kamera saat latihan | **Tidak** | Hanya dipakai untuk deteksi lalu dibuang. Klien Mentra juga menghapus foto dari HP. |
| Video/frame rekaman partner | Ya, di `recordings/` | Hanya dengan persetujuan tertulis per cakupan |
| Log sesi (tracer) | Ya, teks saja | Gambar/audio dibuang di klien **dan** server. Dihapus setelah `RETENTION_DAYS`. |
| Pertanyaan pemula | Ya | Untuk melengkapi knowledge base |
| Akun | Ya | Kata sandi di-hash (scrypt), kode akses perangkat di-hash (SHA-256) |

## Persetujuan penenun
- Tiga cakupan terpisah: **pembelajaran** (video demo), **pengembangan AI** (uji & latih model), **publikasi**.
- Rekaman tanpa izin "pembelajaran" tidak bisa dilihat pemula maupun dijadikan demo.
- Rekaman tanpa izin "pengembangan AI" tidak dipakai untuk contoh few-shot, evaluasi, atau pelatihan.
- **Cabut izin** menghapus video dan semua frame. Yang tersisa hanya catatan pencabutan di `logs/consent.jsonl`.

## Pengetahuan budaya
- Makna motif, filosofi, dan pakem hanya diisi oleh penenun/pemangku budaya. Tutor diinstruksikan untuk menolak mengarang.
- Di produksi (`KB_SERVE_DRAFT=0`), tutor hanya memakai entri berstatus **tervalidasi**.
- Setiap entri mencatat sumber dan validator, untuk atribusi kepada komunitas.

## Keamanan
- Halaman partner/admin butuh login dan peran. Akun partner baru harus disetujui admin.
- Cookie sesi bertanda tangan HMAC, `HttpOnly`, `SameSite=Lax`, dan `Secure` di produksi.
- Header keamanan dan `Permissions-Policy` membatasi kamera, mikrofon, dan Bluetooth ke situs sendiri.
- API key Gemini tidak pernah dikirim ke perangkat. Gemini Live memakai token sementara sekali pakai.
- Indikator merah 🔴 di layar latihan menandakan kamera aktif.

## Yang masih perlu
- Formulir persetujuan tertulis (cetak) yang ditinjau pendamping hukum/komunitas.
- Kebijakan privasi publik dan halaman untuk pengguna menghapus akunnya sendiri.
- Rate limiting per IP untuk endpoint login dan AI.
