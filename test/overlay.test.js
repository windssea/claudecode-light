const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { isAlive, readPid } = require('../plugin/lib/overlay');

test('isAlive is true for the current process', () => {
  assert.strictEqual(isAlive(process.pid), true);
});

test('isAlive is false for an unused pid and invalid input', () => {
  assert.strictEqual(isAlive(2147483646), false);
  assert.strictEqual(isAlive(0), false);
  assert.strictEqual(isAlive(-1), false);
  assert.strictEqual(isAlive(NaN), false);
});

test('readPid round-trips a written pid and returns null when missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-pid-'));
  const p = path.join(dir, 'overlay.pid');
  fs.writeFileSync(p, '12345\n');
  assert.strictEqual(readPid(p), 12345);
  assert.strictEqual(readPid(path.join(dir, 'nope.pid')), null);
  fs.rmSync(dir, { recursive: true, force: true });
});
