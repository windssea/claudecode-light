const light = document.getElementById('light');

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

window.trafficLight.onStatus(({ state, stale, colors }) => {
  const color = colors[state] || colors.idle;
  light.style.setProperty('--lamp-color', color);
  light.style.setProperty('--lamp-glow', hexToRgba(color, 0.52));
  light.classList.toggle('stale', !!stale);
  light.title = 'Claude: ' + state + (stale ? ' (stale)' : '');
});
