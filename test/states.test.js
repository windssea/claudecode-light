const { test } = require('node:test');
const assert = require('node:assert');
const { STATES, colorForState, isStale } = require('../lib/states');

test('STATES has the four canonical states', () => {
  assert.deepStrictEqual(
    [...STATES].sort(),
    ['finished', 'idle', 'waiting-input', 'working'].sort()
  );
});

test('colorForState maps each state to its color', () => {
  assert.strictEqual(colorForState('working'), '#f5b800');
  assert.strictEqual(colorForState('waiting-input'), '#2d7ff9');
  assert.strictEqual(colorForState('finished'), '#e5484d');
  assert.strictEqual(colorForState('idle'), '#30a46c');
});

test('colorForState falls back to idle color for unknown state', () => {
  assert.strictEqual(colorForState('garbage'), '#30a46c');
});

test('isStale only true for working past the timeout', () => {
  const now = 1_000_000;
  const fiveMinMs = 5 * 60 * 1000;
  assert.strictEqual(isStale('working', now - fiveMinMs - 1, now, 5), true);
  assert.strictEqual(isStale('working', now - 1000, now, 5), false);
  assert.strictEqual(isStale('idle', now - fiveMinMs - 1, now, 5), false);
});
