const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildStatus, writeStatusAtomic } = require('../plugin/lib/status');

test('buildStatus normalizes unknown state to idle', () => {
  const s = buildStatus('garbage', 'sess-1', 123);
  assert.strictEqual(s.state, 'idle');
  assert.strictEqual(s.sessionId, 'sess-1');
  assert.strictEqual(s.ts, 123);
});

test('buildStatus keeps a valid state', () => {
  const s = buildStatus('working', 'sess-2', 456);
  assert.strictEqual(s.state, 'working');
});

test('writeStatusAtomic writes valid JSON and leaves no temp file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-'));
  const target = path.join(dir, 'status.json');
  const status = buildStatus('finished', 'sess-3', 789);
  writeStatusAtomic(target, status);
  const onDisk = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.deepStrictEqual(onDisk, status);
  assert.strictEqual(fs.existsSync(target + '.tmp'), false);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('writeStatusAtomic creates the target directory if missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-'));
  const target = path.join(dir, 'nested', 'status.json');
  writeStatusAtomic(target, buildStatus('idle', null, 1));
  assert.strictEqual(fs.existsSync(target), true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('writeStatusAtomic overwrites an existing file (second write)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tl-'));
  const target = path.join(dir, 'status.json');
  writeStatusAtomic(target, buildStatus('working', 'a', 1));
  writeStatusAtomic(target, buildStatus('idle', 'b', 2));
  const onDisk = JSON.parse(fs.readFileSync(target, 'utf8'));
  assert.strictEqual(onDisk.state, 'idle');
  assert.strictEqual(onDisk.sessionId, 'b');
  assert.strictEqual(fs.existsSync(target + '.tmp'), false);
  fs.rmSync(dir, { recursive: true, force: true });
});
