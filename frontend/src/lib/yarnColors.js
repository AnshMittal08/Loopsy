// Yarn palette + a forgiving color resolver shared by the Design Canvas, the
// shared CreaturePreview, and share pages. Canvas designs use palette names
// ('cream', 'violet'); photo-derived designs may use natural names ('yellow').

export const PALETTE = [
  { name: 'coral', hex: '#FF6584' },
  { name: 'marigold', hex: '#FFB02E' },
  { name: 'mint', hex: '#4ECBA0' },
  { name: 'violet', hex: '#8B7CF6' },
  { name: 'rose', hex: '#F472B6' },
  { name: 'cream', hex: '#EFE3C8' },
  { name: 'chocolate', hex: '#8A5A3B' },
  { name: 'charcoal', hex: '#3A3550' },
  { name: 'white', hex: '#F4F4FA' },
];

const COLOR_ALIASES = {
  yellow: '#FFD43B', gold: '#FFB02E', orange: '#FF8A3D', red: '#FF5A5A',
  pink: '#F472B6', purple: '#8B7CF6', blue: '#6CA8FF', green: '#4ECBA0',
  brown: '#8A5A3B', tan: '#D8B98C', beige: '#EFE3C8', grey: '#9AA0AB',
  gray: '#9AA0AB', black: '#2C2840', navy: '#3A3550',
};

const CREAM = '#EFE3C8';

export function hexOf(name) {
  if (!name) return CREAM;
  const key = String(name).toLowerCase().trim();
  const pal = PALETTE.find((p) => p.name === key);
  if (pal) return pal.hex;
  if (COLOR_ALIASES[key]) return COLOR_ALIASES[key];
  for (const [word, hex] of Object.entries(COLOR_ALIASES)) {
    if (key.includes(word)) return hex;
  }
  return CREAM;
}
