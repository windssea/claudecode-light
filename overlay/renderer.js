const light = document.getElementById('light');

window.trafficLight.onStatus(({ state, stale, colors }) => {
  light.style.backgroundColor = colors[state] || colors.idle;
  light.classList.toggle('stale', !!stale);
  light.title = 'Claude: ' + state + (stale ? ' (stale)' : '');
});
