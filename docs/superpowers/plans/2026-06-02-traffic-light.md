# Claude Code Traffic Light Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Claude Code plugin whose lifecycle hooks write session status to a file, plus an always-on-top Electron "traffic light" overlay that recolors in real time.

**Architecture:** Hooks invoke a small Node CLI (`update-status.js`) that atomically writes `~/.claude/traffic-light/status.json`. A long-running Electron app watches that file with `fs.watch` and recolors a frameless, transparent, always-on-top window. Shared pure logic (paths, status shape, state→color map, staleness) lives in `lib/` and is unit-tested with Node's built-in test runner; the Electron window itself is verified with a manual checklist driven by a state-driver script.

**Tech Stack:** Node.js 24 (built-in `node:test`, `node:fs`, `node:os`), Electron, Claude Code plugin hooks.

---

## File Structure

- `.claude-plugin/plugin.json` — plugin manifest (name, version, hooks pointer).
- `hooks/hooks.json` — registers 4 lifecycle hook events.
- `hooks/update-status.js` — CLI: reads state arg + hook JSON from stdin, writes status atomically.
- `lib/paths.js` — resolves the status file path under the home dir.
- `lib/status.js` — `buildStatus()` (pure) and `writeStatusAtomic()`.
- `lib/states.js` — canonical state constants + `colorForState()` + `isStale()`.
- `overlay/package.json` — Electron app manifest.
- `overlay/main.js` — Electron main process: window, tray, file watcher.
- `overlay/renderer.html` / `overlay/renderer.css` / `overlay/renderer.js` — the light + drag handling.
- `overlay/config.json` — colors, size, position, staleness timeout (minutes).
- `scripts/drive-states.js` — writes each state in sequence for manual visual testing.
- `test/*.test.js` — unit tests for the `lib/` modules and the CLI.

**Canonical states (used everywhere):** `working`, `waiting-input`, `finished`, `idle`.

---

### Task 0: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git and root package.json**

Run:
```bash
cd "D:/dev/windssea/claudeCodePlugin"
git init
```

Create `package.json`:
```json
{
  "name": "claude-traffic-light",
  "version": "0.1.0",
  "description": "Desktop always-on-top traffic light showing Claude Code session status.",
  "type": "commonjs",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
node_modules/
overlay/node_modules/
*.log
```

- [ ] **Step 3: Verify the test runner works (no tests yet)**

Run: `npm test`
Expected: exits 0 with "tests 0" (no test files found is acceptable; if it errors on zero files, that's fine — continue).

- [ ] **Step 4: Commit**

```bash
git add package.json .gitignore
git commit -m "chore: scaffold traffic-light project"
```

---

### Task 1: Status file path resolver

**Files:**
- Create: `lib/paths.js`
- Test: `test/paths.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// test/paths.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const { statusDir, statusFilePath } = require('../lib/paths');

test('statusDir is under home dir', () => {
  assert.strictEqual(statusDir(), path.join(os.homedir(), '.claude', 'traffic-light'));
});

test('statusFilePath is status.json inside statusDir', () => {
  assert.strictEqual(statusFilePath(), path.join(statusDir(), 'status.json'));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/paths.test.js`
Expected: FAIL with "Cannot find module '../lib/paths'".

- [ ] **Step 3: Write minimal implementation**

```javascript
// lib/paths.js
const os = require('node:os');
const path = require('node:path');

function statusDir() {
  return path.join(os.homedir(), '.claude', 'traffic-light');
}

function statusFilePath() {
  return path.join(statusDir(), 'status.json');
}

module.exports = { statusDir, statusFilePath };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/paths.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/paths.js test/paths.test.js
git commit -m "feat: add status file path resolver"
```

---

### Task 2: Canonical states, color map, staleness

**Files:**
- Create: `lib/states.js`
- Test: `test/states.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// test/states.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const { STATES, colorForState, isStale } = require('../lib/states');

test('STATES has the four canonical states', () => {
  assert.deepStrictEqual(
    [...STATES].sort(),
    ['finished', 'idle', 'waiting-input', 'working'].sort()
  );
});

test('colorForState maps each state to its color', () => {
  assert.strictEqual(colorForState('working'), '#f5b800');
  assert.strictEqual(colorForState('waiting-input'), '#2d7ff9');
  assert.strictEqual(colorForState('finished'), '#e5484d');
  assert.strictEqual(colorForState('idle'), '#30a46c');
});

test('colorForState falls back to idle color for unknown state', () => {
  assert.strictEqual(colorForState('garbage'), '#30a46c');
});

test('isStale only true for working past the timeout', () => {
  const now = 1_000_000;
  const fiveMinMs = 5 * 60 * 1000;
  assert.strictEqual(isStale('working', now - fiveMinMs - 1, now, 5), true);
  assert.strictEqual(isStale('working', now - 1000, now, 5), false);
  // non-working states are never stale
  assert.strictEqual(isStale('idle', now - fiveMinMs - 1, now, 5), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/states.test.js`
Expected: FAIL with "Cannot find module '../lib/states'".

- [ ] **Step 3: Write minimal implementation**

```javascript
// lib/states.js
const STATES = new Set(['working', 'waiting-input', 'finished', 'idle']);

const COLORS = {
  working: '#f5b800',       // yellow
  'waiting-input': '#2d7ff9', // blue
  finished: '#e5484d',      // red
  idle: '#30a46c',          // green
};

function colorForState(state) {
  return COLORS[state] || COLORS.idle;
}

// Only a 'working' state can go stale (e.g. session force-killed without Stop/SessionEnd).
function isStale(state, ts, now, timeoutMinutes) {
  if (state !== 'working') return false;
  return now - ts > timeoutMinutes * 60 * 1000;
}

module.exports = { STATES, COLORS, colorForState, isStale };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/states.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/states.js test/states.test.js
git commit -m "feat: add states, color map, and staleness logic"
```

---

### Task 3: Build status object + atomic write

**Files:**
- Create: `lib/status.js`
- Test: `test/status.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// test/status.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildStatus, writeStatusAtomic } = require('../lib/status');

test('buildStatus normalizes unknown state to idle', () => {
  const s = buildStatus('garbage', 'sess-1', 123);
  assert.strictEqual(s.state, 'idle');
  assert.strictEqual(s.sessionId, 'sess-1');
  assert.strictEqual(s.ts, 123);
});

test('buildStatus keeps a valid state', () => {
  const s = buildStatus('working', 'sess-2', 456);
  assert.strictEqual(s.state, 'working');
});

test('writeStatusAtomic writes valid JSON and leaves no temp file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-'));
  const target = path.join(dir, 'status.json');
  const status = buildStatus('finished', 'sess-3', 789);

  writeStatusAtomic(target, status);

  const onDisk = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.deepStrictEqual(onDisk, status);
  assert.strictEqual(fs.existsSync(target + '.tmp'), false);

  fs.rmSync(dir, { recursive: true, force: true });
});

test('writeStatusAtomic creates the target directory if missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-'));
  const target = path.join(dir, 'nested', 'status.json');

  writeStatusAtomic(target, buildStatus('idle', null, 1));

  assert.strictEqual(fs.existsSync(target), true);
  fs.rmSync(dir, { recursive: true, force: true });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/status.test.js`
Expected: FAIL with "Cannot find module '../lib/status'".

- [ ] **Step 3: Write minimal implementation**

```javascript
// lib/status.js
const fs = require('node:fs');
const path = require('node:path');
const { STATES } = require('./states');

function buildStatus(state, sessionId, ts = Date.now()) {
  return {
    state: STATES.has(state) ? state : 'idle',
    sessionId: sessionId || null,
    ts,
  };
}

function writeStatusAtomic(targetPath, status) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmp = targetPath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(status), 'utf8');
  fs.renameSync(tmp, targetPath); // atomic on same filesystem
}

module.exports = { buildStatus, writeStatusAtomic };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/status.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/status.js test/status.test.js
git commit -m "feat: add buildStatus and atomic status writer"
```

---

### Task 4: update-status.js CLI

**Files:**
- Create: `hooks/update-status.js`
- Test: `test/update-status.test.js`

The CLI reads the target state from `argv[2]`. Claude Code passes hook JSON on
stdin; if present and it contains `session_id`, we record it. Stdin may be empty
(e.g. our own driver), so reading it must not block forever.

- [ ] **Step 1: Write the failing test**

```javascript
// test/update-status.test.js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'hooks', 'update-status.js');

function runCLI(state, stdin, homeDir) {
  execFileSync(process.execPath, [CLI, state], {
    input: stdin || '',
    env: { ...process.env, USERPROFILE: homeDir, HOME: homeDir },
  });
}

test('CLI writes the given state with session id from stdin JSON', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-home-'));
  runCLI('working', JSON.stringify({ session_id: 'abc' }), home);

  const file = path.join(home, '.claude', 'traffic-light', 'status.json');
  const status = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(status.state, 'working');
  assert.strictEqual(status.sessionId, 'abc');
  assert.strictEqual(typeof status.ts, 'number');

  fs.rmSync(home, { recursive: true, force: true });
});

test('CLI works with empty stdin (sessionId null)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-home-'));
  runCLI('idle', '', home);

  const file = path.join(home, '.claude', 'traffic-light', 'status.json');
  const status = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(status.state, 'idle');
  assert.strictEqual(status.sessionId, null);

  fs.rmSync(home, { recursive: true, force: true });
});
```

Note: `lib/paths.js` uses `os.homedir()`, which on Windows honors `USERPROFILE`
and on POSIX honors `HOME` — the test sets both so it works on either platform.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/update-status.test.js`
Expected: FAIL — CLI file does not exist yet (execFileSync throws).

- [ ] **Step 3: Write minimal implementation**

```javascript
// hooks/update-status.js
const { statusFilePath } = require('../lib/paths');
const { buildStatus, writeStatusAtomic } = require('../lib/status');

function readStdinSync() {
  try {
    return require('node:fs').readFileSync(0, 'utf8');
  } catch {
    return ''; // no stdin piped
  }
}

function sessionIdFromStdin(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed.session_id || null;
  } catch {
    return null;
  }
}

function main() {
  const state = process.argv[2];
  const sessionId = sessionIdFromStdin(readStdinSync());
  writeStatusAtomic(statusFilePath(), buildStatus(state, sessionId));
}

main();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/update-status.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — all tests across paths/states/status/update-status.

- [ ] **Step 6: Commit**

```bash
git add hooks/update-status.js test/update-status.test.js
git commit -m "feat: add update-status CLI invoked by hooks"
```

---

### Task 5: Plugin manifest + hooks registration

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `hooks/hooks.json`

- [ ] **Step 1: Create the plugin manifest**

```json
{
  "name": "claude-traffic-light",
  "version": "0.1.0",
  "description": "Shows Claude Code session status as an always-on-top desktop traffic light."
}
```

- [ ] **Step 2: Create the hooks config**

`${CLAUDE_PLUGIN_ROOT}` is substituted by Claude Code to this plugin's install
directory, so the command resolves regardless of where the plugin lives.

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/update-status.js\" working" }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/update-status.js\" working" }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/update-status.js\" waiting-input" }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/update-status.js\" finished" }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/update-status.js\" idle" }] }
    ]
  }
}
```

- [ ] **Step 3: Validate both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')); JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf8')); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 4: Commit**

```bash
git add .claude-plugin/plugin.json hooks/hooks.json
git commit -m "feat: add plugin manifest and hook registration"
```

---

### Task 6: Overlay config + Electron app manifest

**Files:**
- Create: `overlay/config.json`
- Create: `overlay/package.json`

- [ ] **Step 1: Create `overlay/config.json`**

```json
{
  "size": 64,
  "margin": 24,
  "position": "top-right",
  "stalenessMinutes": 5,
  "colors": {
    "working": "#f5b800",
    "waiting-input": "#2d7ff9",
    "finished": "#e5484d",
    "idle": "#30a46c"
  }
}
```

- [ ] **Step 2: Create `overlay/package.json`**

```json
{
  "name": "claude-traffic-light-overlay",
  "version": "0.1.0",
  "main": "main.js",
  "scripts": {
    "start": "electron ."
  },
  "devDependencies": {
    "electron": "^33.0.0"
  }
}
```

- [ ] **Step 3: Install Electron**

Run:
```bash
cd "D:/dev/windssea/claudeCodePlugin/overlay"
npm install
```
Expected: `node_modules/` created, electron present. (This can take a minute.)

- [ ] **Step 4: Commit**

```bash
cd "D:/dev/windssea/claudeCodePlugin"
git add overlay/config.json overlay/package.json overlay/package-lock.json
git commit -m "chore: add overlay config and Electron manifest"
```

---

### Task 7: Electron main process (window + watcher + tray)

**Files:**
- Create: `overlay/main.js`

This is verified manually in Task 9 (Electron windows aren't unit-testable here).
Keep all pure decisions in `lib/` (already tested); `main.js` only wires them up.

- [ ] **Step 1: Write `overlay/main.js`**

```javascript
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
```

- [ ] **Step 2: Write `overlay/preload.js`**

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('trafficLight', {
  onStatus: (cb) => ipcRenderer.on('status', (_e, data) => cb(data)),
});
```

- [ ] **Step 3: Commit**

```bash
git add overlay/main.js overlay/preload.js
git commit -m "feat: add Electron main process with file watcher and tray"
```

---

### Task 8: Renderer (the light + drag)

**Files:**
- Create: `overlay/renderer.html`
- Create: `overlay/renderer.css`
- Create: `overlay/renderer.js`

- [ ] **Step 1: Write `overlay/renderer.html`**

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><link rel="stylesheet" href="renderer.css"></head>
<body>
  <div id="light" title="Claude Traffic Light"></div>
  <script src="renderer.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write `overlay/renderer.css`**

`-webkit-app-region: drag` makes the whole light draggable to reposition.

```css
html, body {
  margin: 0; height: 100%; background: transparent; overflow: hidden;
  -webkit-app-region: drag; user-select: none;
}
#light {
  width: 100%; height: 100%; border-radius: 50%;
  box-sizing: border-box; border: 2px solid rgba(0,0,0,0.35);
  background: #30a46c;
  transition: background-color 0.2s ease, opacity 0.2s ease;
}
#light.stale { opacity: 0.4; }
```

- [ ] **Step 3: Write `overlay/renderer.js`**

```javascript
const light = document.getElementById('light');

window.trafficLight.onStatus(({ state, stale, colors }) => {
  light.style.backgroundColor = colors[state] || colors.idle;
  light.classList.toggle('stale', !!stale);
  light.title = 'Claude: ' + state + (stale ? ' (stale)' : '');
});
```

- [ ] **Step 4: Commit**

```bash
git add overlay/renderer.html overlay/renderer.css overlay/renderer.js
git commit -m "feat: add renderer light with drag-to-move"
```

---

### Task 9: State-driver script + manual verification

**Files:**
- Create: `scripts/drive-states.js`

- [ ] **Step 1: Write `scripts/drive-states.js`**

```javascript
// Cycles the status file through every state so you can watch the overlay react.
const { statusFilePath } = require('../lib/paths');
const { buildStatus, writeStatusAtomic } = require('../lib/status');

const sequence = ['working', 'waiting-input', 'finished', 'idle'];
let i = 0;

console.log('Driving states every 2s. Ctrl+C to stop.');
function tick() {
  const state = sequence[i % sequence.length];
  writeStatusAtomic(statusFilePath(), buildStatus(state, 'driver'));
  console.log('wrote:', state);
  i += 1;
}
tick();
setInterval(tick, 2000);
```

- [ ] **Step 2: Start the overlay**

Run (in one terminal):
```bash
cd "D:/dev/windssea/claudeCodePlugin/overlay"
npm start
```
Expected: a small circular light appears in the top-right corner, green (idle), floating above other windows.

- [ ] **Step 3: Drive the states**

Run (in a second terminal):
```bash
cd "D:/dev/windssea/claudeCodePlugin"
node scripts/drive-states.js
```

- [ ] **Step 4: Manual verification checklist**

Confirm each:
- [ ] Light cycles yellow → blue → red → green every 2s, matching the console log.
- [ ] Light stays on top of other windows (click another app — it remains visible).
- [ ] Dragging the light moves it; it stays where dropped.
- [ ] Tray menu → Quit closes the overlay.
- [ ] Stop the driver, manually delete `~/.claude/traffic-light/status.json`, and confirm the light shows green (idle) on the next 30s tick rather than crashing.

- [ ] **Step 5: Commit**

```bash
git add scripts/drive-states.js
git commit -m "feat: add state-driver script for manual overlay testing"
```

---

### Task 10: End-to-end test with a real session + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write `README.md`**

````markdown
# Claude Code Traffic Light

An always-on-top desktop "traffic light" that shows what your Claude Code
session is doing.

| Color | State | Meaning |
|-------|-------|---------|
| 🟡 yellow | working | Claude is running/thinking |
| 🔵 blue | waiting-input | Blocked — needs your input or permission |
| 🔴 red | finished | Turn finished — waiting for your next prompt |
| 🟢 green | idle | No active session |

## Install

1. Install this directory as a Claude Code plugin (it ships `.claude-plugin/plugin.json` and `hooks/hooks.json`).
2. Build/run the overlay:
   ```bash
   cd overlay
   npm install
   npm start
   ```

The hooks write status to `~/.claude/traffic-light/status.json`; the overlay
watches that file and recolors in real time.

## Test it without a session

```bash
node scripts/drive-states.js
```
````

- [ ] **Step 2: Real end-to-end check**

With the overlay running (`cd overlay && npm start`) and the plugin installed,
start a Claude Code session in any project and confirm:
- [ ] On session start / when you submit a prompt → light turns 🟡 yellow.
- [ ] When Claude asks for a permission/approval → light turns 🔵 blue.
- [ ] When Claude finishes its response → light turns 🔴 red.
- [ ] When you end the session → light turns 🟢 green.

- [ ] **Step 3: Run the full unit suite once more**

Run: `npm test`
Expected: PASS — all tests.

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README and usage instructions"
```

---

## Self-Review Notes

- **Spec coverage:** 4 states/colors (Task 2, 6, 8), file-based IPC (Task 3, 4, 7), hooks→state mapping (Task 5), atomic writes (Task 3), missing/corrupt→idle (Task 7), staleness dimming (Task 2 logic + Task 7 wiring + Task 8 `.stale`), tray/quit + drag/always-on-top (Task 7, 8), unit + manual testing (Tasks 1-4, 9, 10). All spec sections map to tasks.
- **Type consistency:** `buildStatus`, `writeStatusAtomic`, `statusFilePath`, `statusDir`, `colorForState`, `isStale`, `STATES`, `COLORS` are used with identical signatures across hooks, overlay, tests, and driver. Status object shape `{state, sessionId, ts}` is consistent everywhere; the overlay reads `{state, ts}` (sessionId unused there, which is fine).
- **No placeholders:** every code/command step contains real content.
