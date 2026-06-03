# Claude Code Traffic Light

> English | [简体中文](./README.zh-CN.md)

An always-on-top desktop "traffic light" that shows what your Claude Code
session is doing.

| Color | State | Meaning |
|-------|-------|---------|
| 🟡 yellow | working | Claude is running |
| 🔴 red | needs-you | Needs your authorization or input |
| 🟢 green | idle | Turn finished, or no active session |

## How it works

One plugin, two cooperating pieces:

- **Hooks** (`plugin/hooks/`) — Claude Code lifecycle hooks write the current state to
  `~/.claude/traffic-light/status.json`, and on session start launch the overlay if it
  isn't already running.
- **Overlay** (`plugin/overlay/`) — a small Electron app that watches that file and
  recolors a floating light. `/setup` copies it to `~/.claude/traffic-light/app/` and
  installs Electron there.

They communicate only through the fixed status file, so they stay decoupled.

## Install — two commands, no terminal

From inside Claude Code:

```text
/plugin marketplace add windssea/claudecode-light
/plugin install claude-traffic-light@windssea-tools
/claude-traffic-light:setup
```

1. `marketplace add` registers this GitHub repo (which holds `.claude-plugin/marketplace.json`).
2. `install` pulls the `claude-traffic-light` plugin from the `./plugin` subdirectory.
3. `/setup` (run once) installs Electron into `~/.claude/traffic-light/app`, launches the
   light, and from then on the light **auto-starts whenever you launch Claude Code** —
   and won't start a second copy if one is already running (PID check + single-instance lock).

Restart Claude Code after install if the hooks don't take effect immediately.

The light appears in the top-right corner, floats above other windows, and is draggable.
Quit it from the system-tray menu (small gray circle icon); it will come back on your next
Claude Code session.

### Reinstall / Update

`/setup` is safe to re-run at any time. If the overlay is currently running, its
process holds a lock on the app directory and the copy step will fail with `EPERM`.
Kill it first:

**Windows**
```bash
powershell -NoProfile -Command "Stop-Process -Name electron -Force -ErrorAction SilentlyContinue"
```

**macOS**
```bash
pkill -f "traffic-light/app"
```

Then re-run setup:

```text
/claude-traffic-light:setup
```

This re-copies the plugin files (including any CSS/JS changes), reinstalls Electron
if needed, and relaunches the overlay.

> **Note:** `/setup` copies from the plugin cache
> (`~/.claude/plugins/cache/windssea-tools/claude-traffic-light/`), not from your
> dev clone. If you edit `plugin/overlay/renderer.css` locally, also apply the same
> change to the live file at
> `~/.claude/traffic-light/app/overlay/renderer.css` and restart the overlay — or
> update the plugin cache and re-run `/setup`.

### Developing from a clone

```bash
git clone https://github.com/windssea/claudecode-light.git
cd claudecode-light/plugin/overlay && npm install && npm start   # run the overlay directly
```

`npm test` (at the repo root) runs the unit suite.

If a `working` (yellow) state goes more than `stalenessMinutes` without an update
— e.g. the session was force-killed without a clean `Stop`/`SessionEnd` — the
light dims to 40% opacity to flag that it may be stale.

## Configuration

After `/setup`, edit the live config at
`~/.claude/traffic-light/app/overlay/config.json` and restart the light (tray → Quit,
then start a Claude session or re-run `/setup`). Keys: `size`, `margin`, `position`
(`top-right` | `top-left` | `bottom-right` | `bottom-left`), `stalenessMinutes`,
and per-state `colors`. (The source copy lives at `plugin/overlay/config.json`.)

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
Runs the unit suite (paths, state/color/staleness logic, status serialization, the
hook CLI, and PID/liveness helpers) with Node's built-in test runner.

## Cross-platform

Pure Node + Electron, all paths resolved via `os.homedir()` — runs on **Windows and
macOS**. Windows is fully tested; macOS has dedicated tweaks (Dock icon hidden, floats
above full-screen Spaces) but should be verified once on a Mac.

## License

[MIT](./LICENSE)
