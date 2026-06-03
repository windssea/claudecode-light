const light    = document.getElementById('light');
const gifLight = document.getElementById('gif-light');

const GIF_MAP = {
  'working':   'assets/working.gif',
  'needs-you': 'assets/waiting.gif',
  'idle':      'assets/idle.gif',
};

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Resize handle ────────────────────────────────────────────
const handle = document.getElementById('resize-handle');
let dragStart = null;

handle.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  handle.setPointerCapture(e.pointerId);
  dragStart = { x: e.screenX, y: e.screenY, size: window.outerWidth };
});

handle.addEventListener('pointermove', (e) => {
  if (!dragStart) return;
  const dx = e.screenX - dragStart.x;
  const dy = e.screenY - dragStart.y;
  const newSize = Math.max(32, Math.min(400, Math.round(dragStart.size + (dx + dy) * 0.5)));
  window.trafficLight.resize(newSize);
});

handle.addEventListener('pointerup',     () => { dragStart = null; });
handle.addEventListener('pointercancel', () => { dragStart = null; });

// ── Status / style ───────────────────────────────────────────
window.trafficLight.onStatus(({ state, stale, colors, style }) => {
  const isGif = style === 2;
  document.body.classList.toggle('style-gif', isGif);

  const label = 'Claude: ' + state + (stale ? ' (stale)' : '');

  if (isGif) {
    const src = GIF_MAP[state] || GIF_MAP.idle;
    if (gifLight.src !== src) gifLight.src = src;
    gifLight.classList.toggle('stale', !!stale);
    gifLight.title = label;
  } else {
    const color = colors[state] || colors.idle;
    light.style.setProperty('--lamp-color', color);
    light.style.setProperty('--lamp-glow', hexToRgba(color, 0.52));
    light.classList.toggle('stale', !!stale);
    light.title = label;
  }
});
