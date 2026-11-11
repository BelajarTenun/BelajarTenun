#!/usr/bin/env bash
# Unduh LiveKit server (self-hosted, lokal) ke ./bin. Versi dipatok agar hasilnya sama di semua komputer.
# Pemakaian: bash scripts/livekit/setup.sh        (Linux / macOS; Windows: pakai WSL atau unduh manual)
set -euo pipefail
VERSION="${LIVEKIT_VERSION:-1.13.10}"
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
case "$(uname -m)" in x86_64|amd64) ARCH=amd64 ;; arm64|aarch64) ARCH=arm64 ;; armv7l) ARCH=armv7 ;; *) echo "Arsitektur tidak dikenal: $(uname -m)"; exit 1 ;; esac
case "$OS" in linux|darwin) ;; *) echo "OS $OS: unduh manual dari https://github.com/livekit/livekit/releases/tag/v$VERSION"; exit 1 ;; esac
DIR="$(cd "$(dirname "$0")/../.." && pwd)/bin"
mkdir -p "$DIR"
URL="https://github.com/livekit/livekit/releases/download/v${VERSION}/livekit_${VERSION}_${OS}_${ARCH}.tar.gz"
echo "Mengunduh $URL"
curl -fsSL "$URL" | tar xz -C "$DIR" livekit-server
chmod +x "$DIR/livekit-server"
"$DIR/livekit-server" --version
echo "Selesai. Jalankan: npm run livekit"
