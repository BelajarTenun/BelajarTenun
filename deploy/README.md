# Deploy BelajarTenun

Satu VPS (mis. 2 vCPU / 4 GB, Ubuntu) dengan Docker Compose:

| Container | Isi |
|---|---|
| `app` | Web pemula (React) + halaman tim + API Node |
| `livekit` | Server WebRTC untuk audio/video realtime |
| `agent` | Tutor suara: Gemini Live lewat Vertex AI |
| `caddy` | HTTPS otomatis (wajib untuk kamera & Bluetooth) |

## 1. DNS

Arahkan dua record A ke IP VPS: `DOMAIN` dan `livekit.DOMAIN`.
Buka port 80, 443, 7881/tcp, dan 50000-50100/udp di firewall.

## 2. Vertex AI

1. Aktifkan Vertex AI API di project Google Cloud.
2. Buat service account dengan peran **Vertex AI User**
   (tambah **Storage Object Admin** bila memakai `VERTEX_GCS_BUCKET` untuk analisis video).
3. Unduh kuncinya ke `deploy/secrets/vertex-sa.json` (folder ini tidak masuk git).

## 3. Konfigurasi

```bash
cp .env.example .env
```

Isi minimal: `DOMAIN`, `AI_PROVIDER=vertex`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`,
`AUTH_SECRET`, `AGENT_TOKEN`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `KB_SERVE_DRAFT=0`.

## 4. Jalankan

```bash
cd deploy && docker compose up -d --build
```

Cek: `https://DOMAIN/api/health`. Akun pertama yang mendaftar menjadi admin.

## Alur Gemini Live dengan Vertex AI

Vertex AI tidak menerbitkan token sementara untuk browser, jadi kredensial tidak pernah keluar dari server:

```
HP / kacamata ──WebRTC──▶ LiveKit ◀──▶ agen Python ──▶ Vertex AI (Gemini Live)
       │                                   │
       └──────── HTTPS ──▶ app (API) ◀─────┘  tool: cek tahap, tandai selesai, jawab
```

Panggilan non-realtime (cek tahap dari foto, tanya jawab, embeddings, analisis video) dilakukan app langsung ke Vertex AI.

## Pengembangan lokal

```bash
npm run dev            # API di :3000
cd web && npm run dev  # web React di :5173 (proxy /api ke :3000)
```
