import { getDesignById } from "@/lib/models/designModel";

// Auto-generated Open Graph image for a shared design (M4 share cards).
// Rendered as SVG (no fonts/WASM) — a branded card with the design drawn from
// its saved part layout, so it matches whatever the maker actually built.

const CANVAS = { w: 360, h: 460, px: 7 };
const PALETTE = {
  coral: '#FF6584', marigold: '#FFB02E', mint: '#4ECBA0', violet: '#8B7CF6',
  rose: '#F472B6', cream: '#EFE3C8', chocolate: '#8A5A3B', charcoal: '#3A3550',
  white: '#F4F4FA', yellow: '#FFD43B', black: '#2C2840', brown: '#8A5A3B',
  pink: '#F472B6', blue: '#6CA8FF', green: '#4ECBA0', grey: '#9AA0AB', gray: '#9AA0AB',
};
const hexOf = (name) => {
  const k = String(name || 'cream').toLowerCase().trim();
  if (PALETTE[k]) return PALETTE[k];
  for (const [w, h] of Object.entries(PALETTE)) if (k.includes(w)) return h;
  return PALETTE.cream;
};
const esc = (s) => String(s || '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c]));

// One part → SVG string: base color + a sheen overlay for a plush look.
function shapeStr(part, fill) {
  const d = part.dimensions || {};
  const px = CANVAS.px;
  const x = part.layout?.x ?? CANVAS.w / 2;
  const y = part.layout?.y ?? CANVAS.h / 2;
  switch (part.shape) {
    case 'sphere': return `<circle cx="${x}" cy="${y}" r="${(d.diameterCm || 6) / 2 * px}" fill="${fill}"/>`;
    case 'ellipsoid': return `<ellipse cx="${x}" cy="${y}" rx="${(d.diameterCm || 6) / 2 * px}" ry="${(d.heightCm || 8) / 2 * px}" fill="${fill}"/>`;
    case 'hemisphere': { const r = (d.diameterCm || 6) / 2 * px; return `<path d="M ${x - r},${y + r * 0.4} A ${r} ${r} 0 0 1 ${x + r},${y + r * 0.4} Z" fill="${fill}"/>`; }
    case 'tube': { const w = (d.diameterCm || 3) * px, h = (d.heightCm || 6) * px; return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w / 2}" fill="${fill}"/>`; }
    case 'cone': { const w = (d.baseDiameterCm || 4) * px, h = (d.heightCm || 5) * px; return `<polygon points="${x},${y - h / 2} ${x + w / 2},${y + h / 2} ${x - w / 2},${y + h / 2}" fill="${fill}"/>`; }
    case 'flatPanel': { const w = (d.widthCm || 4) * px, h = (d.heightCm || 5) * px; return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${Math.min(w, h) * 0.18}" fill="${fill}"/>`; }
    default: return '';
  }
}
function partSvg(part) {
  return shapeStr(part, hexOf(part.color)) + shapeStr(part, 'url(#ogSheen)');
}

export async function GET(_request, { params }) {
  const design = getDesignById(params.id);
  if (!design) return new Response("Not found", { status: 404 });

  const name = esc(design.name);
  const parts = design.spec?.parts || [];
  const partCount = parts.length;
  const swatches = [...new Set(parts.map((p) => p.color).filter(Boolean))].slice(0, 6);
  const swatchSvg = swatches.map((c, i) => `<circle cx="${720 + i * 46}" cy="430" r="18" fill="${hexOf(c)}" stroke="#0E0D15" stroke-width="3"/>`).join('');

  // Place the canonical 360×460 canvas into the card's left region, scaled.
  const scale = 470 / CANVAS.h;
  const offX = 70, offY = (630 - CANVAS.h * scale) / 2;
  const design2d = `<g transform="translate(${offX} ${offY}) scale(${scale})" filter="url(#ogSoft)">
    <ellipse cx="${CANVAS.w / 2}" cy="${CANVAS.h - 18}" rx="${CANVAS.w * 0.34}" ry="12" fill="rgba(0,0,0,0.22)"/>
    ${parts.map(partSvg).join('')}
  </g>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15131F"/><stop offset="1" stop-color="#0A0910"/></linearGradient>
    <radialGradient id="glow" cx="0.25" cy="0.4" r="0.6"><stop offset="0" stop-color="#8B7CF6" stop-opacity="0.25"/><stop offset="1" stop-color="#8B7CF6" stop-opacity="0"/></radialGradient>
    <radialGradient id="ogSheen" cx="0.34" cy="0.26" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.5"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <filter id="ogSoft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000" flood-opacity="0.3"/></filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  ${design2d}
  <text x="700" y="220" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="#ECE8F6">${name}</text>
  <text x="702" y="280" font-family="Arial, sans-serif" font-size="30" fill="#A9A2C0">${partCount} part${partCount === 1 ? '' : 's'} · amigurumi</text>
  <text x="700" y="392" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#5FD4B2">✓ Verified math</text>
  ${swatchSvg}
  <text x="700" y="560" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#A78BFF">Made with Loopsy</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
