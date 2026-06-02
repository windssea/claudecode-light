const { test } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const { statusDir, statusFilePath } = require('../plugin/lib/paths');

test('statusDir is under home dir', () => {
  assert.strictEqual(statusDir(), path.join(os.homedir(), '.claude', 'traffic-light'));
});

test('statusFilePath is status.json inside statusDir', () => {
  assert.strictEqual(statusFilePath(), path.join(statusDir(), 'status.json'));
});
