const STATES = new Set(['working', 'needs-you', 'idle']);

const COLORS = {
  working: '#f5b800',     // yellow — Claude is running
  'needs-you': '#e5484d', // red — needs your authorization or input
  idle: '#30a46c',        // green — turn finished / no active session
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
