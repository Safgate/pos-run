const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn } = require('child_process');

function waitForHttpOk(url, timeoutMs = 90000, intervalMs = 250) {
  return new Promise((resolve, reject) => {
    const started = Date.now();

    function retry() {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Server did not respond at ${url} within ${timeoutMs}ms`));
        return;
      }
      setTimeout(tryOnce, intervalMs);
    }

    function tryOnce() {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(8000, () => {
        req.destroy();
        retry();
      });
    }

    tryOnce();
  });
}

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

/** Default HTTP port (avoid clashing with other apps on 3000). Override with PORT in .env */
const DEFAULT_APP_PORT = 3001;
const APP_PORT = Number(process.env.PORT) || DEFAULT_APP_PORT;
const APP_URL = `http://127.0.0.1:${APP_PORT}/`;

function failedToStartHtml(message) {
  const esc = String(message).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  return `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>POS Run</title></head>
<body style="font-family:system-ui,sans-serif;padding:2rem;max-width:32rem;">
<h1 style="margin-top:0;">Could not start the app server</h1>
<p>The embedded server on port ${APP_PORT} did not become ready in time. Check that nothing else uses port ${APP_PORT}, and that antivirus is not blocking the app.</p>
<p style="color:#666;font-size:13px;">${esc}</p>
</body></html>`)}`;
}

/**
 * ESC/POS full cut (GS V 0) piped to CUPS raw — runs after HTML print when Chromium ignores CutType/lpoptions.
 * Set RECEIPT_POST_CUT_ESC_POS=1 and RECEIPT_PRINTER_NAME to match the thermal queue.
 * Override bytes with RECEIPT_ESC_POS_CUT_HEX=1D5600 if your model uses a different sequence.
 */
function parseEscPosCutBytes() {
  const hex = process.env.RECEIPT_ESC_POS_CUT_HEX;
  const cleaned = hex && String(hex).replace(/\s/g, '');
  if (cleaned && /^[0-9a-fA-F]+$/.test(cleaned) && cleaned.length >= 2 && cleaned.length % 2 === 0) {
    return Buffer.from(cleaned, 'hex');
  }
  return Buffer.from([0x1d, 0x56, 0x00]);
}

function sendEscPosCutViaLp(printerName) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      resolve(false);
      return;
    }
    const bytes = parseEscPosCutBytes();
    const args = ['-o', 'raw', '-'];
    const name = printerName && String(printerName).trim();
    if (name) {
      args.unshift('-d', name);
    }
    const child = spawn('lp', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.stdin.write(bytes);
    child.stdin.end();
    child.on('error', (e) => {
      console.warn('Receipt post-cut (lp raw):', e.message);
      resolve(false);
    });
    child.on('close', (code) => {
      if (code !== 0) {
        console.warn('Receipt post-cut (lp raw) failed:', code, err.trim() || '(no stderr)');
      }
      resolve(code === 0);
    });
  });
}

function wantEscPosPostCut() {
  const v = String(process.env.RECEIPT_POST_CUT_ESC_POS || '')
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/**
 * Hidden window + webContents.print({ silent: true }) — no system print dialog.
 * Set RECEIPT_PRINTER_NAME in .env to the exact OS printer name (optional; default printer if unset).
 */
function printReceiptHtml(html) {
  return new Promise((resolve) => {
    /* Explicit size so layout/paint runs before print (hidden default viewport can yield blank output). */
    const win = new BrowserWindow({
      show: false,
      width: 420,
      height: 1800,
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
      /* Match browser print: 100% scale. Lower RECEIPT_PRINT_SCALE (e.g. 66) only if a driver shrinks. */
      const scale = parseInt(process.env.RECEIPT_PRINT_SCALE || '100', 10);
      const safeScale =
        Number.isFinite(scale) && scale >= 10 && scale <= 200 ? scale : 100;
      const opts = {
        silent: true,
        printBackground: true,
        scaleFactor: safeScale,
        margins: { marginType: 'none' },
      };
      const name = process.env.RECEIPT_PRINTER_NAME;
      const deviceName = name && String(name).trim() ? String(name).trim() : undefined;
      if (deviceName) {
        opts.deviceName = deviceName;
      }
      const cutPrinter = deviceName || '';
      const doPostCut = wantEscPosPostCut();

      const doPrint = () => {
        win.webContents.print(opts, (success, failureReason) => {
          const done = () => {
            cleanup();
            if (success) resolve({ success: true });
            else resolve({ success: false, error: failureReason || 'Print failed' });
          };
          if (success && doPostCut) {
            sendEscPosCutViaLp(cutPrinter).finally(done);
          } else {
            done();
          }
        });
      };

      /* Let layout/paint settle; printing immediately on did-finish-load often captures empty/skewed output. */
      setTimeout(doPrint, 200);
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

function createWindow(loadUrl = APP_URL) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'POS Run',
    icon: path.join(__dirname, 'public/favicon.ico'),
  });

  mainWindow.loadURL(loadUrl);

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
  const appRoot = __dirname;

  // Packaged app: spawn bundled API (dist/server.cjs).
  // Dev (npm run electron:dev): do not spawn — `node --watch dist/server-dev.cjs` in the same script
  // already serves port APP_PORT; spawning here would duplicate or wrongly load server.cjs (not built).
  if (!app.isPackaged) {
    return;
  }

  const serverPath = path.join(appRoot, 'dist', 'server.cjs');
  serverProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      NODE_ENV: 'production',
      ELECTRON_RUN_AS_NODE: '1',
      APP_ROOT: appRoot,
      PORT: String(APP_PORT),
    },
    cwd: appRoot,
    shell: false,
  });

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

app.on('ready', async () => {
  startServer();
  let loadUrl = APP_URL;
  try {
    await waitForHttpOk(APP_URL);
  } catch (e) {
    console.error('Embedded server not ready:', e.message);
    loadUrl = failedToStartHtml(e.message);
  }
  createWindow(loadUrl);
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
    createWindow(APP_URL);
  }
});
