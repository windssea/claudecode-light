const { app, BrowserWindow, Tray, Menu, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { statusFilePath } = require('../lib/paths');
const { isStale } = require('../lib/states');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
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
  win.loadFile(path.join(__dirname, 'renderer.html'));
  win.webContents.on('did-finish-load', pushStatus);
}

function watchStatus() {
  const dir = path.dirname(STATUS_FILE);
  fs.mkdirSync(dir, { recursive: true });
  let timer = null;
  fs.watch(dir, (_event, filename) => {
    if (filename && !filename.startsWith('status.json')) return;
    clearTimeout(timer);
    timer = setTimeout(pushStatus, 50); // debounce rapid writes
  });
  setInterval(pushStatus, 30_000); // catch staleness even with no file events
}

function createTray() {
  const { nativeImage } = require('electron');
  tray = new Tray(nativeImage.createEmpty());
  tray.setToolTip('Claude Traffic Light');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Quit', click: () => app.quit() },
  ]));
}

app.whenReady().then(() => {
  createWindow();
  createTray();
  watchStatus();
});

app.on('window-all-closed', () => app.quit());
