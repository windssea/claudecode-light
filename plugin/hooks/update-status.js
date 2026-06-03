const { statusFilePath } = require('../lib/paths');
const { buildStatus, writeStatusAtomic } = require('../lib/status');

function readStdinSync() {
  try {
    return require('node:fs').readFileSync(0, 'utf8');
  } catch {
    return '';
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

function readCurrentState(filePath) {
  try {
    return JSON.parse(require('node:fs').readFileSync(filePath, 'utf8')).state || 'idle';
  } catch {
    return 'idle';
  }
}

function main() {
  const state = process.argv[2];
  const filePath = statusFilePath();

  // needs-you is only meaningful when Claude is actively working.
  // If already idle, a Notification (e.g. post-response ping) should not turn the light red.
  if (state === 'needs-you' && readCurrentState(filePath) !== 'working') return;

  const sessionId = sessionIdFromStdin(readStdinSync());
  writeStatusAtomic(filePath, buildStatus(state, sessionId));
}

main();
