# POS Run - Windows Build Instructions

To build this application for Windows, you need to follow these steps on your local Windows machine.

## Prerequisites
1.  **Node.js (v18 or later):** Download from [nodejs.org](https://nodejs.org/).
2.  **Git:** Download from [git-scm.com](https://git-scm.com/).

## Steps to Build

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd your-project-folder
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    SUPABASE_URL=your_supabase_url
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
    ```

4.  **Build the Windows installer:**
    ```bash
    npm run build:windows
    ```

5.  **Find your installer:**
    Once the build finishes, you will find the `.exe` installer in the `dist-electron/` folder.

## Building Windows installers from Linux (Ubuntu + Wine)

NSIS and the portable `.exe` need **Wine** when you run `electron-builder` on Linux (GitHub Actions uses real Windows; your PC can mimic that locally).

1. Install Wine (one-time, requires `sudo`):
   ```bash
   chmod +x scripts/install-wine-ubuntu.sh
   ./scripts/install-wine-ubuntu.sh
   ```
2. First-time Wine prefix (required; use the helper):
   ```bash
   chmod +x scripts/init-wine-prefix.sh
   ./scripts/init-wine-prefix.sh
   ```
   If you see **`wine: could not load kernel32.dll, status c0000135`**, the prefix is usually **corrupt or half‑initialized**. Fix:
   ```bash
   # Close anything using Wine, then:
   rm -rf ~/.wine
   ./scripts/init-wine-prefix.sh
   ```
   If it still fails, install full Wine deps, then retry:
   ```bash
   sudo apt-get update
   sudo apt-get install -y wine wine64 libwine fonts-wine winbind
   rm -rf ~/.wine
   WINEARCH=win64 WINEPREFIX="$HOME/.wine" wine wineboot --init
   ```
   As a last resort on Ubuntu, use [WineHQ’s install steps](https://wiki.winehq.org/Ubuntu) for **winehq-stable** (newer Wine than the default repo).
3. Build:
   ```bash
   npm ci
   npm run build:windows
   ```
   Or: `npm run build:windows:cross` (wrapper that checks for `wine` and sets quieter Wine logs).

Outputs: `dist-electron/POS Run-<version>-Setup.exe` and `POS Run-<version>-portable.exe`.

Test the portable build on the same machine with Wine (smoke test only; real use is on Windows):
```bash
wine ./dist-electron/POS\ Run-*-portable.exe
```
(Expect UI quirks under Wine; use a Windows VM or PC for real QA.)

## Windows install issues (other devices)

- **Place `.env` next to the portable `.exe`** (or use the NSIS install folder) with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- **Port 3001** must be free (the app embeds a local server).
- **SmartScreen / antivirus** may block unsigned apps — “More info” → Run anyway, or allow in Windows Security.
- If the window is blank, ensure nothing else is using port **3001** and try again after a full quit.

## Development Mode (Electron)
To run the app in Electron during development:
```bash
npm run electron:dev
```
