---
description: Install and launch the Claude traffic-light overlay (run once after installing the plugin)
---

Set up the desktop traffic-light overlay for this plugin.

Run this command and report the outcome to the user:

```bash
node "${CLAUDE_PLUGIN_ROOT}/setup.js"
```

What it does: copies the overlay to a stable location under `~/.claude/traffic-light/app`, installs Electron there (this can take a few minutes on first run), launches the floating light, and ensures it auto-starts whenever Claude Code launches. It is safe to re-run.

If the command fails, show the user the error output and note that Node.js and npm must be available on PATH.
