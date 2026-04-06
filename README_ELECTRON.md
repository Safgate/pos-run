# POS Run - Native Desktop App

This project is now configured to be built as a native desktop application for **Windows** and **Linux** using **Electron**.

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

## How to Build for Windows

1.  **Install dependencies** and build:
    ```bash
    npm install
    npm run build:windows
    ```
2.  Output is in **`dist-electron/`**:
    -   **`POS Run-<version>-portable.exe`** — self-extracting portable app (default; works when cross-building from Linux without Wine).
    -   **`win-unpacked/`** — unpacked app folder (same as after install; useful for testing).

**NSIS setup installer** (`npm run build:windows:nsis`): building the classic installer from **Linux** requires [Wine](https://www.winehq.org/) (electron-builder runs a Windows-only step). On **Windows**, run the same command for a normal `Setup` installer.

**Linux desktop build**: use `npm run electron:build` (default targets depend on your platform).

## Important Notes

-   **Database**: The app uses **Supabase** for data. Configure credentials in your environment (see project `.env` / deployment docs).
-   **Silent Printing**: The "silent" printing feature works best in Electron as it can be configured with `--kiosk-printing` or handled via the main process for even more control.
