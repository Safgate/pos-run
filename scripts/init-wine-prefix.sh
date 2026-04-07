#!/usr/bin/env bash
# Create a clean 64-bit Wine prefix (fixes many kernel32.dll / c0000135 issues).
set -euo pipefail

export WINEPREFIX="${WINEPREFIX:-$HOME/.wine}"
export WINEARCH="${WINEARCH:-win64}"

if ! command -v wine >/dev/null 2>&1; then
  echo "Install Wine first: ./scripts/install-wine-ubuntu.sh"
  exit 1
fi

echo "==> WINEPREFIX=$WINEPREFIX WINEARCH=$WINEARCH"
mkdir -p "$WINEPREFIX"

echo "==> Initializing prefix (first run can take 1–2 minutes)..."
wine wineboot --init

echo "==> OK"
wine --version
