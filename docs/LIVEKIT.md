# Tutor Real-time: LiveKit Lokal + Gemini Live

Mode real-time memakai **LiveKit yang dijalankan sendiri (self-hosted)** sebagai server media, ditambah **agen Python** yang menjalankan **Gemini Live**. Arsitekturnya mengikuti VisionClaw (LiveKit + `agent/main.py`), tapi semuanya jalan di komputer/server kalian sendiri, tanpa LiveKit Cloud.

```
HP / kacamata (browser)                LiveKit server lokal              Agen Python (agent/main.py)
 mic + kamera ──────── WebRTC ───────►  ruang "bt-<sesi>"  ◄──────────── bergabung otomatis
 suara tutor ◄─────────────────────────                     ────────────► Gemini Live (suara + video)
 HUD/kartu  ◄── data "bt.ui" ───────────                                  │ tools
                                                                          ▼
                                                    Server BelajarTenun: /api/live/tool → mesin sesi
```

Kenapa lewat LiveKit, bukan langsung browser → Gemini?
- **Lebih tahan sinyal jelek**: WebRTC dengan jitter buffer, koreksi paket hilang, dan sambung ulang otomatis.
- **Tools dieksekusi di server**, tidak bolak-balik ke HP.
- **API key Gemini hanya ada di agen**, tidak pernah dikirim ke HP.
- Bisa menambah peserta lain (pendamping) atau merekam sesi untuk dataset (dengan izin).

Kalau `LIVEKIT_URL` kosong, aplikasi kembali ke mode lama (browser langsung ke Gemini Live dengan token sementara).

## 1. Pasang (sekali)
```bash
npm run livekit:setup
```
Perintah itu mengunduh `livekit-server` v1.13.10 (Linux/macOS) ke `./bin`. Untuk Windows, pakai WSL atau unduh manual dari halaman rilis LiveKit.

```bash
python3 -m venv agent/.venv
```
```bash
agent/.venv/bin/pip install -r agent/requirements.txt
```

## 2. Konfigurasi
1. Buka `scripts/livekit/livekit.yaml`, ganti rahasia di bagian `keys` (minimal 32 karakter).
2. Di `.env`, isi bagian LiveKit dengan kunci yang sama:
   ```
   LIVEKIT_URL=ws://localhost:7880
   LIVEKIT_PUBLIC_URL=ws://IP-LAPTOP:7880
   LIVEKIT_API_KEY=belajartenun
   LIVEKIT_API_SECRET=<rahasia yang sama dengan livekit.yaml>
   AGENT_TOKEN=<string acak, mis. dari: openssl rand -hex 24>
   GEMINI_API_KEY=<key Gemini>
   BT_SERVER=http://localhost:3000
   ```
   `LIVEKIT_PUBLIC_URL` adalah alamat yang dibuka **HP**. Kalau HP dan laptop ada di Wi-Fi/hotspot yang sama, pakai IP laptop (cek dengan `ip addr` atau `ipconfig`).

## 3. Jalankan (3 terminal)
```bash
npm run livekit
```
```bash
node --env-file=.env server.js
```
```bash
set -a; . ./.env; set +a; agent/.venv/bin/python agent/main.py dev
```
Lalu buka aplikasi, centang **"Ngobrol langsung dengan tutor"** (atau "Gemini Live" di mode kacamata), dan mulai latihan. Status "Tutor bergabung" menandakan agen sudah masuk ke ruang.

## 4. Catatan jaringan
- Port yang dipakai: **7880** (sinyal, TCP), **7881** (media via TCP), **50000–50100/UDP** (media). Buka port ini di firewall laptop/server.
- Kamera & mikrofon di HP hanya jalan lewat **HTTPS**. Untuk uji di Wi-Fi lokal, buka aplikasi lewat tunnel HTTPS atau pasang sertifikat lokal. Server LiveKit juga perlu `wss://` bila halaman dibuka lewat HTTPS (pakai reverse proxy seperti Caddy/Nginx dengan TLS di depan port 7880).
- Kalau komputer memakai proxy HTTP, kecualikan alamat lokal (`NO_PROXY=localhost,127.0.0.1`), karena agen bisa gagal tersambung ke LiveKit (error 405).
- Di server publik: set `rtc.use_external_ip: true` di `livekit.yaml`, dan untuk jaringan seluler yang ketat aktifkan TURN bawaan LiveKit (lihat dokumentasi LiveKit tentang `turn`).

## 5. Status pengujian
| Bagian | Status |
|---|---|
| Unduh & jalankan LiveKit server lokal | Sudah diuji |
| Browser masuk ruang, menerbitkan mic + kamera | Sudah diuji (kamera/mic palsu Chromium) |
| Agen terdaftar, menerima tugas, mengambil konfigurasi sesi dengan `AGENT_TOKEN`, bergabung, menerbitkan suara | Sudah diuji |
| Percakapan Gemini Live, tools, kartu UI, relay check | Belum, butuh `GEMINI_API_KEY` valid |
