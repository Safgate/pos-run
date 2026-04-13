# POS Run - Native Desktop App

This project is now configured to be built as a native desktop application for **Windows**, **macOS**, and **Linux** using **Electron**.

## Prerequisites

-   **Node.js 20 or newer** (required for Vite 6 and Tailwind 4).
-   [Git](https://git-scm.com/) to clone the repository.

## How to Run Locally (Development)

1.  **Clone the repository** (or download the source code).
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run in Electron development mode**:
    ```bash
    npm run electron:dev
    ```
    This will start the Express server and the Electron window simultaneously.

## How to Build for All Platforms

1.  **Install dependencies**:
    ```bash
    npm install
    ```
2.  **Build for specific platform**:
    -   **Windows**: `npm run build:windows`
    -   **Linux**: `npm run build:linux`
    -   **macOS**: `npm run build:mac` (requires building on a Mac)
    -   **All**: `npm run build:all`

3.  Output is in **`dist-electron/`**.

### Windows Specifics

-   **`POS Run-<version>-portable.exe`** — self-extracting portable app (default; works when cross-building from Linux without Wine).
-   **`win-unpacked/`** — unpacked app folder (same as after install; useful for testing).

**NSIS setup installer** (`npm run build:windows:nsis`): building the classic installer from **Linux** requires [Wine](https://www.winehq.org/) (electron-builder runs a Windows-only step). On **Windows**, run the same command for a normal `Setup` installer.

### Linux Specifics

-   **AppImage**: A single portable executable that runs on most distributions.
-   **deb**: Standard package for Debian-based systems (Ubuntu, etc.).

### macOS Specifics

-   **dmg**: Standard disk image for installation.
-   **zip**: Compressed application.
-   **Note**: Building for macOS generally requires a macOS environment for code signing and notarization.

## Production Runtime (No Dev Server Needed)

The packaged app starts its own embedded API server automatically. You should **not** run `npm run dev` on customer machines.

Before launching the shipped app, create a `.env` file with production credentials.

- **Portable/Unpacked**: place `.env` in the same folder as the executable.
- **Installed Apps**: place `.env` in the user data directory:
  - **Windows**: `%APPDATA%/pos-run/.env`
  - **macOS**: `~/Library/Application Support/pos-run/.env`
  - **Linux**: `~/.config/pos-run/.env`

You can copy from `.env.example` and set at least:

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Important Notes

-   **Database**: The app uses **Supabase** for data. Configure credentials in your environment (see project `.env` / deployment docs).
-   **Silent Printing**: The "silent" printing feature works best in Electron as it can be configured with `--kiosk-printing` or handled via the main process for even more control.
