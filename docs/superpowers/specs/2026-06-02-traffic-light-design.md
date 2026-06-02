# Claude Code Traffic Light — Design

**Date:** 2026-06-02
**Status:** Approved (pending spec review)

## Summary

A Claude Code plugin that monitors the status of a Claude Code session and
displays a desktop "traffic light" overlay that floats on top of all windows.
The light recolors in real time to reflect what Claude is doing.

Target platform: Windows 11 (cross-platform-friendly via Node/Electron).
Scope: a **single** Claude Code session.

## States and Colors

Four distinct states, driven by Claude Code lifecycle hooks:

| Hook event                      | State         | Color     | Meaning                                                        |
|---------------------------------|---------------|-----------|---------------------------------------------------------------|
| `SessionStart`, `UserPromptSubmit` | working    | 🟡 yellow | Claude is running / thinking                                   |
| `Notification`                  | waiting-input | 🔵 blue   | Blocked mid-task — needs your input or permission/authorization |
| `Stop`                          | finished      | 🔴 red    | Turn finished — waiting for your next prompt                   |
| `SessionEnd`                    | idle          | 🟢 green  | No active session                                             |

Blue (Claude is stuck waiting on *you* during a task) is deliberately separate
from red (Claude is done and waiting for a brand-new prompt).

## Architecture

Two parts shipped together in one plugin package:

### 1. Plugin (hooks)
- `hooks.json` registers the four lifecycle events above.
- Each hook invokes `node update-status.js <state>`.
- Node is used because Claude Code already ships Node, so there is no extra
  runtime dependency and behavior is identical on Windows/Mac/Linux.

### 2. Overlay (Electron app)
- A frameless, transparent, always-on-top window showing the light.
- Watches the shared status file with `fs.watch` and recolors instantly.
- Draggable; tray icon for quit/reposition; optional click-through.

### IPC: file-based
- Shared status file: `~/.claude/traffic-light/status.json`
- Shape: `{ "state": "working", "ts": 1234567890, "sessionId": "..." }`
- Rationale: hooks are short-lived shell commands and cannot hold a socket.
  A file is the simplest reliable channel between the ephemeral hook and the
  long-running Electron app. No ports, no server, survives restarts.

## Components

- `.claude-plugin/plugin.json` — plugin manifest so it installs as a Claude
  Code plugin.
- `hooks/hooks.json` — registers the 4 hook events, each running
  `node update-status.js <state>`.
- `hooks/update-status.js` — takes a state argument and atomically writes
  `status.json` with `{state, ts, sessionId}` (temp file + rename) so the
  watcher never reads a half-written file.
- `overlay/main.js` — frameless transparent always-on-top window + tray +
  file watcher.
- `overlay/renderer.{html,js,css}` — the light element and drag handling.
- `overlay/config.json` — colors, size, position, staleness timeout.
- `overlay/package.json` — Electron app manifest / dependencies.

## Data Flow

Hook fires → `update-status.js` writes `status.json` atomically →
Electron `fs.watch` callback fires → renderer recolors the light.
Sub-100ms, no polling.

## Error Handling

- Atomic writes prevent partial reads; watcher also re-reads on a short debounce.
- If `status.json` is missing or corrupt → default to 🟢 idle.
- Staleness: if state is `working` and no update for a configurable N minutes
  → dim the light (signals a possibly force-killed session) without changing
  the logical state.
- Electron started before any session → empty/no file → 🟢 idle.

## Testing

- `update-status.js`:
  - Unit test that each state writes the correct JSON.
  - Atomic-write test (no partial reads under concurrent writes).
- Overlay:
  - Manual checklist: stays on top, draggable, recolors on file change.
  - A small driver script that writes each state in sequence to watch the
    transitions visually.

## Out of Scope (YAGNI)

- Multiple concurrent sessions / per-session lights.
- Remote/networked status reporting.
- macOS/Linux packaging polish (architecture stays compatible, but Windows 11
  is the only validated target).
