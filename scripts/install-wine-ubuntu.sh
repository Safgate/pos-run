#!/usr/bin/env bash
# Install Wine on Ubuntu/Debian so electron-builder can create Windows NSIS/portable
# installers from Linux. Requires sudo once.
#
# Usage:
#   chmod +x scripts/install-wine-ubuntu.sh
#   ./scripts/install-wine-ubuntu.sh

set -euo pipefail

if ! command -v sudo >/dev/null 2>&1; then
  echo "sudo is required to install Wine."
  exit 1
fi

echo "==> Enabling 32-bit arch (needed for some Wine / NSIS bits)"
sudo dpkg --add-architecture i386 2>/dev/null || true

echo "==> apt update"
sudo apt-get update

echo "==> Installing Wine"
sudo apt-get install -y wine wine64

echo "==> Wine version:"
wine --version || true
wine64 --version || true

echo ""
echo "Done. Optional first-time setup (GUI): run: winecfg"
echo "Then from the project root: npm ci && npm run build:windows"
