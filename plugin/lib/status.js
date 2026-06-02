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
  fs.renameSync(tmp, targetPath);
}

module.exports = { buildStatus, writeStatusAtomic };
