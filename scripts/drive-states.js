// Cycles the status file through every state so you can watch the overlay react.
const { statusFilePath } = require('../lib/paths');
const { buildStatus, writeStatusAtomic } = require('../lib/status');

const sequence = ['working', 'waiting-input', 'finished', 'idle'];
let i = 0;

console.log('Driving states every 2s. Ctrl+C to stop.');
function tick() {
  const state = sequence[i % sequence.length];
  writeStatusAtomic(statusFilePath(), buildStatus(state, 'driver'));
  console.log('wrote:', state);
  i += 1;
}
tick();
setInterval(tick, 2000);
