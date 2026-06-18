// Give any colour — a palette name OR an arbitrary hex — a readable yarn-colour
// name for the written pattern (materials list, colourwork run-lengths). This
// is what lets the design tools offer unlimited colours while patterns still
// read "3 burnt orange, 2 teal" instead of "3 #c4622d, 2 #1fa39a".

const NAMED = [
  ['white', '#FFFFFF'], ['cream', '#EFE3C8'], ['ivory', '#F4EFE0'], ['black', '#1A1726'],
  ['charcoal', '#3A3550'], ['grey', '#9AA0AB'], ['silver', '#C9CDD6'],
  ['red', '#E23B3B'], ['crimson', '#B11D3A'], ['coral', '#FF6584'], ['rose', '#F472B6'], ['pink', '#FF8FC7'],
  ['salmon', '#FF9E80'], ['orange', '#FF8A3D'], ['rust', '#C4622D'], ['marigold', '#FFB02E'],
  ['yellow', '#FFD43B'], ['gold', '#E0A22B'], ['mustard', '#D6A526'], ['olive', '#7E7A2E'],
  ['mint', '#4ECBA0'], ['green', '#3FA34D'], ['forest', '#256A3A'], ['teal', '#1FA39A'],
  ['sky', '#6CC5FF'], ['blue', '#3B6FE2'], ['navy', '#2A3A8C'], ['denim', '#4B6A9B'],
  ['violet', '#8B7CF6'], ['purple', '#7A3CC0'], ['lavender', '#C3B6FF'], ['plum', '#6B3A6B'],
  ['brown', '#8A5A3B'], ['chocolate', '#5A3A28'], ['tan', '#D8B98C'], ['beige', '#E6D6BC'],
];

function hexToRgb(h) {
  let s = String(h).replace('#', '').trim();
  if (s.length === 3) s = s.split('').map((x) => x + x).join('');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function colorName(c) {
  if (typeof c !== 'string' || !c) return 'yarn';
  if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(c.trim())) return c; // already a name
  const [r, g, b] = hexToRgb(c);
  let best = NAMED[0], bd = Infinity;
  for (const [name, hex] of NAMED) {
    const [R, G, B] = hexToRgb(hex);
    const d = (r - R) ** 2 + (g - G) ** 2 + (b - B) ** 2;
    if (d < bd) { bd = d; best = [name, hex]; }
  }
  return best[0];
}

module.exports = { colorName };
