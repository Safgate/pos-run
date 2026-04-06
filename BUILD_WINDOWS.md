# Bilbao POS - Windows Build Instructions

To build this application for Windows, you need to follow these steps on your local Windows machine.

## Prerequisites
1.  **Node.js (v18 or later):** Download from [nodejs.org](https://nodejs.org/).
2.  **Git:** Download from [git-scm.com](https://git-scm.com/).

## Steps to Build

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd BILBAO
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

## Development Mode (Electron)
To run the app in Electron during development:
```bash
npm run electron:dev
```
