// One-click starting points for the Draw studio. Each builds a colour grid at
// the current size; some recommend a construction (flat vs round).

const mk = (cols, rows, fill) => Array.from({ length: rows }, () => Array.from({ length: cols }, () => fill));

function starInside(cx, cy, R, r2, c, r) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? r2 : R;
    pts.push([cx + rad * Math.cos(a), cy + rad * Math.sin(a)]);
  }
  let w = false;
  for (let i = 0, j = 9; i < 10; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (((yi > r) !== (yj > r)) && (c < ((xj - xi) * (r - yi)) / (yj - yi) + xi)) w = !w;
  }
  return w;
}

function shield(cols, rows) {
  const N = Math.min(cols, rows);
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2, maxR = N / 2;
  const g = mk(cols, rows, 'red');
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.hypot(c - cx, r - cy) / maxR;
    let col = 'red';
    if (d <= 0.28) col = 'blue'; else if (d <= 0.5) col = 'red'; else if (d <= 0.72) col = 'white'; else if (d <= 1.0) col = 'red'; else col = 'cream';
    if (d <= 1.0 && starInside(cx, cy, maxR * 0.26, maxR * 0.26 * 0.42, c, r)) col = 'white';
    g[r][c] = col;
  }
  return g;
}

function target(cols, rows) {
  const N = Math.min(cols, rows);
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2, maxR = N / 2;
  const bands = ['coral', 'cream', 'coral', 'cream', 'coral'];
  const g = mk(cols, rows, 'cream');
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.hypot(c - cx, r - cy) / maxR;
    g[r][c] = d <= 1.0 ? bands[Math.min(bands.length - 1, Math.floor(d * bands.length))] : 'cream';
  }
  return g;
}

function heart(cols, rows) {
  const g = mk(cols, rows, 'cream');
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = (c - cx) / (cols * 0.34);
    const y = -(r - cy) / (rows * 0.34) + 0.25;
    const v = (x * x + y * y - 1) ** 3 - x * x * y * y * y;
    if (v <= 0) g[r][c] = 'rose';
  }
  return g;
}

function flower(cols, rows) {
  const g = mk(cols, rows, 'mint');
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2, maxR = Math.min(cols, rows) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const dx = c - cx, dy = r - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const petal = maxR * 0.85 * Math.abs(Math.cos(a * 3));
    if (d <= maxR * 0.22) g[r][c] = 'marigold';
    else if (d <= Math.max(maxR * 0.3, petal)) g[r][c] = 'rose';
  }
  return g;
}

function smiley(cols, rows) {
  const g = mk(cols, rows, 'marigold');
  const cx = (cols - 1) / 2, cy = (rows - 1) / 2, maxR = Math.min(cols, rows) / 2;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const d = Math.hypot(c - cx, r - cy);
    if (d > maxR * 0.96) { g[r][c] = 'cream'; continue; }
    const ex = maxR * 0.32, ey = -maxR * 0.18;
    if (Math.hypot(c - (cx - ex), r - (cy + ey)) < maxR * 0.1 || Math.hypot(c - (cx + ex), r - (cy + ey)) < maxR * 0.1) g[r][c] = 'charcoal';
    const my = cy + maxR * 0.28;
    if (r > cy + maxR * 0.1 && d < maxR * 0.6 && Math.abs(Math.hypot(c - cx, r - my * 0) - 0) >= 0 && r < my && Math.hypot(c - cx, (r - cy) * 0.7) > maxR * 0.32 && Math.hypot(c - cx, (r - cy) * 0.7) < maxR * 0.5 && r > cy) g[r][c] = 'charcoal';
  }
  return g;
}

export const PRESETS = [
  { id: 'shield', label: 'Cap shield', construction: 'round', build: shield },
  { id: 'target', label: 'Target', construction: 'round', build: target },
  { id: 'flower', label: 'Flower', construction: 'round', build: flower },
  { id: 'smiley', label: 'Smiley', construction: 'round', build: smiley },
  { id: 'heart', label: 'Heart', construction: 'flat', build: heart },
];
