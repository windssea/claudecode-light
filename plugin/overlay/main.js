const { app, BrowserWindow, Tray, Menu, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { statusFilePath } = require('../lib/paths');
const { isStale } = require('../lib/states');
const { pidFilePath } = require('../lib/overlay');

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
} catch (e) {
  console.error('Failed to read overlay/config.json:', e.message);
  process.exit(1);
}
const STATUS_FILE = statusFilePath();

let win;
let tray;

function readStatus() {
  try {
    const raw = fs.readFileSync(STATUS_FILE, 'utf8');
    const s = JSON.parse(raw);
    return { state: s.state || 'idle', ts: s.ts || 0 };
  } catch {
    return { state: 'idle', ts: 0 }; // missing/corrupt -> idle
  }
}

function pushStatus() {
  if (!win) return;
  const { state, ts } = readStatus();
  const stale = isStale(state, ts, Date.now(), config.stalenessMinutes);
  win.webContents.send('status', { state, stale, colors: config.colors });
}

function cornerPosition(size, margin) {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  switch (config.position) {
    case 'top-left': return { x: margin, y: margin };
    case 'bottom-left': return { x: margin, y: height - size - margin };
    case 'bottom-right': return { x: width - size - margin, y: height - size - margin };
    case 'top-right':
    default: return { x: width - size - margin, y: margin };
  }
}

function createWindow() {
  const size = config.size;
  const { x, y } = cornerPosition(size, config.margin);
  win = new BrowserWindow({
    width: size, height: size, x, y,
    frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.setAlwaysOnTop(true, 'screen-saver'); // stay above fullscreen apps
  if (process.platform === 'darwin') {
    // On macOS, also float above full-screen Spaces, not just regular windows.
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  }
  win.loadFile(path.join(__dirname, 'renderer.html'));
  win.webContents.on('did-finish-load', pushStatus);
}

function watchStatus() {
  fs.mkdirSync(path.dirname(STATUS_FILE), { recursive: true });
  // Poll instead of fs.watch: on Windows, fs.watch frequently misses events from
  // atomic-rename writes (write .tmp then rename), leaving the light stuck. A short
  // poll on a tiny local file is cheap and reliable.
  let last = null;
  function tick() {
    let cur = null;
    try { cur = fs.readFileSync(STATUS_FILE, 'utf8'); } catch { cur = null; }
    if (cur !== last) {
      last = cur;
      pushStatus();
    }
  }
  tick();
  setInterval(tick, 500);              // detect status changes quickly
  setInterval(pushStatus, 30_000);    // re-eval staleness even when content is unchanged
}

// Build a small visible tray icon (a filled gray circle) so the user can always
// reach the Quit menu. Gray (R=G=B) sidesteps platform RGBA/BGRA byte-order differences.
function trayIcon() {
  const { nativeImage } = require('electron');
  const px = 16;
  const buf = Buffer.alloc(px * px * 4);
  const r = px / 2 - 1;
  const c = (px - 1) / 2;
  for (let y = 0; y < px; y++) {
    for (let x = 0; x < px; x++) {
      const i = (y * px + x) * 4;
      const inside = (x - c) ** 2 + (y - c) ** 2 <= r * r;
      buf[i] = 200; buf[i + 1] = 200; buf[i + 2] = 200;
      buf[i + 3] = inside ? 255 : 0;
    }
  }
  return nativeImage.createFromBitmap(buf, { width: px, height: px });
}

function createTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip('Claude Traffic Light');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Quit', click: () => app.quit() },
  ]));
}

function writePidFile() {
  try {
    fs.mkdirSync(path.dirname(pidFilePath()), { recursive: true });
    fs.writeFileSync(pidFilePath(), String(process.pid));
  } catch { /* non-fatal */ }
}

function clearPidFile() {
  try { fs.unlinkSync(pidFilePath()); } catch { /* already gone */ }
}

// Single-instance lock: if an overlay is already running, this one exits immediately.
// This is the hard guarantee against duplicates, on top of the PID pre-check in ensure-overlay.js.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.whenReady().then(() => {
    // macOS: this is a tray-only overlay, so keep it out of the Dock.
    if (process.platform === 'darwin' && app.dock) app.dock.hide();
    writePidFile();
    createWindow();
    createTray();
    watchStatus();
  });

  app.on('quit', clearPidFile);
  app.on('window-all-closed', () => app.quit());
}
