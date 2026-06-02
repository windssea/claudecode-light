// Launch the overlay if it isn't already running. Called on SessionStart.
// Must be fast and never block or fail session start, so everything is wrapped
// and it stays silent when the overlay hasn't been provisioned yet (run /setup).
const path = require('node:path');
const { spawn } = require('node:child_process');
const { isOverlayRunning, appOverlayDir } = require('../lib/overlay');

// require() of the electron package (from plain node) returns the path to its executable.
function electronBinary(overlayDir) {
  try {
    return require(path.join(overlayDir, 'node_modules', 'electron'));
  } catch {
    return null;
  }
}

function main() {
  try {
    if (isOverlayRunning()) return; // already up -> nothing to do
    const dir = appOverlayDir();
    const electron = electronBinary(dir);
    if (!electron) return; // not provisioned yet -> run /claude-traffic-light:setup
    const child = spawn(electron, [dir], { detached: true, stdio: 'ignore', windowsHide: true });
    child.unref();
  } catch {
    // never block or fail session start
  }
}

main();
