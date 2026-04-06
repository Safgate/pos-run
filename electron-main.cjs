const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

/** Load .env (no dotenv in main). Packaged portable: prefer `.env` next to the .exe. */
function loadEnvFromFile() {
  try {
    const candidates = [];
    if (app.isPackaged) {
      candidates.push(path.join(path.dirname(process.execPath), '.env'));
      if (process.resourcesPath) {
        candidates.push(path.join(process.resourcesPath, '.env'));
      }
    }
    candidates.push(path.join(__dirname, '.env'));

    let envPath;
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        envPath = p;
        break;
      }
    }
    if (!envPath) return;

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  } catch (e) {
    console.warn('Could not load .env:', e.message);
  }
}

if (app.isPackaged) {
  process.env.NODE_ENV = 'production';
}

loadEnvFromFile();

/**
 * Hidden window + webContents.print({ silent: true }) — no system print dialog.
 * Set RECEIPT_PRINTER_NAME in .env to the exact OS printer name (optional; default printer if unset).
 */
function printReceiptHtml(html) {
  return new Promise((resolve) => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        sandbox: true,
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const cleanup = () => {
      try {
        if (!win.isDestroyed()) win.close();
      } catch {
        /* ignore */
      }
    };

    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

    win.webContents.once('did-fail-load', (_e, _code, desc) => {
      cleanup();
      resolve({ success: false, error: desc || 'Failed to load receipt for printing' });
    });

    win.webContents.once('did-finish-load', () => {
      const scale = parseInt(process.env.RECEIPT_PRINT_SCALE || '100', 10);
      const safeScale =
        Number.isFinite(scale) && scale >= 10 && scale <= 200 ? scale : 100;
      const opts = {
        silent: true,
        printBackground: true,
        // 100 = 100% actual size (no “fit to page” shrink)
        scaleFactor: safeScale,
        margins: { marginType: 'none' },
      };
      const name = process.env.RECEIPT_PRINTER_NAME;
      if (name && String(name).trim()) {
        opts.deviceName = String(name).trim();
      }
      win.webContents.print(opts, (success, failureReason) => {
        cleanup();
        if (success) resolve({ success: true });
        else resolve({ success: false, error: failureReason || 'Print failed' });
      });
    });

    win.loadURL(dataUrl);
  });
}

ipcMain.handle('print-receipt-html', async (_event, html) => {
  if (typeof html !== 'string' || !html.length) {
    return { success: false, error: 'Invalid receipt HTML' };
  }
  return printReceiptHtml(html);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'Bilbao POS',
    icon: path.join(__dirname, 'public/favicon.ico'),
  });

  const isDev = process.env.NODE_ENV === 'development';

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Shift reports etc. still use window.open + print dialog
  mainWindow.webContents.setWindowOpenHandler(() => ({
    action: 'allow',
    overrideBrowserWindowOptions: {
      width: 380,
      height: 720,
      show: true,
      autoHideMenuBar: true,
    },
  }));
}

function startServer() {
  const isDev = process.env.NODE_ENV === 'development';
  const appRoot = __dirname;

  if (isDev) {
    serverProcess = spawn('npx', ['tsx', 'server.ts'], {
      env: { ...process.env, NODE_ENV: 'development' },
      shell: true,
      cwd: __dirname,
    });
  } else {
    const serverPath = path.join(appRoot, 'dist', 'server.cjs');
    serverProcess = spawn(process.execPath, [serverPath], {
      env: {
        ...process.env,
        NODE_ENV: 'production',
        ELECTRON_RUN_AS_NODE: '1',
        APP_ROOT: appRoot,
      },
      cwd: appRoot,
      shell: false,
    });
  }

  serverProcess.on('error', (err) => {
    console.error('Failed to spawn API server:', err);
  });
  serverProcess.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`API server exited with code ${code}${signal ? ` signal ${signal}` : ''}`);
    }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });
}

app.on('ready', () => {
  startServer();
  setTimeout(createWindow, 2000);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
