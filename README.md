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

Claude Code lifecycle hooks (`hooks/hooks.json`) run `hooks/update-status.js`,
which atomically writes the current state to `~/.claude/traffic-light/status.json`.
The Electron overlay watches that file and recolors a small floating light in
real time.

## Install

1. Install this directory as a Claude Code plugin (it ships
   `.claude-plugin/plugin.json` and `hooks/hooks.json`).
2. Build/run the overlay:
   ```bash
   cd overlay
   npm install
   npm start
   ```

The light appears in the top-right corner, floats above other windows, and is
draggable. Quit it from the system-tray menu.

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
