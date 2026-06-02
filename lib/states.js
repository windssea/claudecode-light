const STATES = new Set(['working', 'waiting-input', 'finished', 'idle']);

const COLORS = {
  working: '#f5b800',
  'waiting-input': '#2d7ff9',
  finished: '#e5484d',
  idle: '#30a46c',
};

function colorForState(state) {
  return COLORS[state] || COLORS.idle;
}

function isStale(state, ts, now, timeoutMinutes) {
  if (state !== 'working') return false;
  // strictly greater-than: exactly at the timeout is NOT yet stale
  return now - ts > timeoutMinutes * 60 * 1000;
}

module.exports = { STATES, COLORS, colorForState, isStale };
