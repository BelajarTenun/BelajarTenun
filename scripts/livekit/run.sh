#!/usr/bin/env bash
# Jalankan LiveKit server lokal memakai scripts/livekit/livekit.yaml.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
[ -x "$ROOT/bin/livekit-server" ] || bash "$ROOT/scripts/livekit/setup.sh"
exec "$ROOT/bin/livekit-server" --config "$ROOT/scripts/livekit/livekit.yaml" "$@"
