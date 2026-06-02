const os = require('node:os');
const path = require('node:path');

function statusDir() {
  return path.join(os.homedir(), '.claude', 'traffic-light');
}

function statusFilePath() {
  return path.join(statusDir(), 'status.json');
}

module.exports = { statusDir, statusFilePath };
