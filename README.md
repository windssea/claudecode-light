# Claude Code Traffic Light

An always-on-top desktop "traffic light" that shows what your Claude Code
session is doing.

| Color | State | Meaning |
|-------|-------|---------|
| 🟡 yellow | working | Claude is running/thinking |
| 🔵 blue | waiting-input | Blocked — needs your input or permission |
| 🔴 red | finished | Turn finished — waiting for your next prompt |
| 🟢 green | idle | No active session |

## How it works

Two parts:

- **`plugin/`** — the Claude Code plugin. Lifecycle hooks (`plugin/hooks/hooks.json`)
  run `plugin/hooks/update-status.js`, which atomically writes the current state to
  `~/.claude/traffic-light/status.json`.
- **`overlay/`** — a standalone Electron app (not part of the plugin payload) that
  watches that file and recolors a small floating light in real time.

They communicate only through the fixed status file, so they run independently.

## Install

### 1. Install the plugin (status reporting)

From inside Claude Code:

```text
/plugin marketplace add windssea/claudecode-light
/plugin install claude-traffic-light@windssea-tools
```

`marketplace add` points at this GitHub repo (which holds `.claude-plugin/marketplace.json`);
`install` pulls the `claude-traffic-light` plugin from the `./plugin` subdirectory.
Restart Claude Code if the hooks don't take effect immediately.

### 2. Run the overlay (the light)

```bash
git clone https://github.com/windssea/claudecode-light.git
cd claudecode-light/overlay
npm install   # first time only — installs Electron
npm start
```

The light appears in the top-right corner, floats above other windows, and is
draggable. Quit it from the system-tray menu (small gray circle icon).

### 3. Auto-start the overlay on login (optional, Windows)

Create a shortcut in your Startup folder pointing directly at `electron.exe`
(not the `.cmd` wrapper, so no console window appears). PowerShell one-liner:

```powershell
$exe = "$PWD\overlay\node_modules\electron\dist\electron.exe"
$appDir = "$PWD\overlay"
$lnk = Join-Path ([Environment]::GetFolderPath('Startup')) 'Claude Traffic Light.lnk'
$sc = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
$sc.TargetPath = $exe; $sc.Arguments = "`"$appDir`""; $sc.WorkingDirectory = $appDir
$sc.WindowStyle = 7; $sc.Save()
```

Delete that `.lnk` from the Startup folder to disable auto-start.

If a `working` (yellow) state goes more than `stalenessMinutes` without an update
— e.g. the session was force-killed without a clean `Stop`/`SessionEnd` — the
light dims to 40% opacity to flag that it may be stale.

If a `working` (yellow) state goes more than `stalenessMinutes` without an update
— e.g. the session was force-killed without a clean `Stop`/`SessionEnd` — the
light dims to 40% opacity to flag that it may be stale.

## Configuration

Edit `overlay/config.json`: `size`, `margin`, `position`
(`top-right` | `top-left` | `bottom-right` | `bottom-left`), `stalenessMinutes`,
and per-state `colors`.

## Test it without a session

```bash
node scripts/drive-states.js
```
Cycles the status file through every state every 2 seconds so you can watch the
overlay react.

## Develop

```bash
npm test
```
Runs the unit suite (path resolution, state/color/staleness logic, status
serialization, and the hook CLI) with Node's built-in test runner.
