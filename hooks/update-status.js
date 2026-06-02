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

function main() {
  const state = process.argv[2];
  const sessionId = sessionIdFromStdin(readStdinSync());
  writeStatusAtomic(statusFilePath(), buildStatus(state, sessionId));
}

main();
