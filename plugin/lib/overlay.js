const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

// Stable location the overlay is provisioned to (survives plugin updates, unlike the plugin cache).
function appRoot() {
  return path.join(os.homedir(), '.claude', 'traffic-light');
}

// Where the runnable overlay lives after /setup copies it.
function appOverlayDir() {
  return path.join(appRoot(), 'app', 'overlay');
}

function pidFilePath() {
  return path.join(appRoot(), 'overlay.pid');
}

// Signal 0 doesn't kill — it only probes existence. EPERM means the process exists
// but we lack permission, which still counts as alive.
function isAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e.code === 'EPERM';
  }
}

function readPid(pidPath = pidFilePath()) {
  try {
    const pid = parseInt(String(fs.readFileSync(pidPath, 'utf8')).trim(), 10);
    return Number.isInteger(pid) ? pid : null;
  } catch {
    return null;
  }
}

function isOverlayRunning() {
  const pid = readPid();
  return pid !== null && isAlive(pid);
}

module.exports = { appRoot, appOverlayDir, pidFilePath, isAlive, readPid, isOverlayRunning };
