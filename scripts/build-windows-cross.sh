#!/usr/bin/env bash
# Build Windows NSIS + portable from Linux (after Wine is installed).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v wine >/dev/null 2>&1 && ! command -v wine64 >/dev/null 2>&1; then
  echo "Wine not found. Install it first:"
  echo "  ./scripts/install-wine-ubuntu.sh"
  exit 1
fi

# Quieter Wine logs during build
export WINEDEBUG="${WINEDEBUG:--all}"

echo "==> Building Vite + server + Windows targets (NSIS + portable)..."
npm run build:windows

echo ""
echo "==> Outputs (if successful):"
ls -la dist-electron/*.exe 2>/dev/null || ls -la dist-electron/
