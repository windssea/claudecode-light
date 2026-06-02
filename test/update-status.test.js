const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const CLI = path.join(__dirname, '..', 'hooks', 'update-status.js');

function runCLI(state, stdin, homeDir) {
  execFileSync(process.execPath, [CLI, state], {
    input: stdin || '',
    env: { ...process.env, USERPROFILE: homeDir, HOME: homeDir },
  });
}

test('CLI writes the given state with session id from stdin JSON', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-home-'));
  runCLI('working', JSON.stringify({ session_id: 'abc' }), home);
  const file = path.join(home, '.claude', 'traffic-light', 'status.json');
  const status = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(status.state, 'working');
  assert.strictEqual(status.sessionId, 'abc');
  assert.strictEqual(typeof status.ts, 'number');
  fs.rmSync(home, { recursive: true, force: true });
});

test('CLI works with empty stdin (sessionId null)', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-home-'));
  runCLI('idle', '', home);
  const file = path.join(home, '.claude', 'traffic-light', 'status.json');
  const status = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(status.state, 'idle');
  assert.strictEqual(status.sessionId, null);
  fs.rmSync(home, { recursive: true, force: true });
});
