#!/usr/bin/env bash
# Install Wine on Ubuntu for electron-builder Windows targets (NSIS/portable).
# Usage: chmod +x scripts/install-wine-ubuntu.sh && ./scripts/install-wine-ubuntu.sh

set -euo pipefail

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required."
  exit 1
fi

echo "==> apt update"
sudo apt-get update

echo "==> Wine + common deps (avoid broken kernel32 / c0000135 from half-installed Wine)"
sudo apt-get install -y \
  wine \
  wine64 \
  libwine \
  fonts-wine \
  winbind

echo "==> 32-bit libs (NSIS / some Wine bits need i386)"
sudo dpkg --add-architecture i386 2>/dev/null || true
sudo apt-get update
set +e
sudo apt-get install -y wine32:i386
set -e

if command -v wine >/dev/null 2>&1; then
  wine --version
else
  echo "error: wine not on PATH after install"
  exit 1
fi

echo ""
echo "==> Reset broken prefix if you had kernel32.dll / c0000135 errors (backup first if needed)"
echo "    To wipe and recreate: rm -rf ~/.wine && ./scripts/init-wine-prefix.sh"
echo ""
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -x "$ROOT/scripts/init-wine-prefix.sh" ]]; then
  "$ROOT/scripts/init-wine-prefix.sh"
else
  echo "Run: chmod +x scripts/init-wine-prefix.sh && ./scripts/init-wine-prefix.sh"
fi
