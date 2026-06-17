import { getDesignById } from "@/lib/models/designModel";

// Auto-generated Open Graph image for a shared design (M4 share cards).
// Rendered as SVG (no fonts/WASM needed) — a branded card with a simplified
// creature built from the design's spec. Served from /api/designs/:id/og.

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

function rolesFromSpec(spec) {
  const roles = {};
  for (const part of spec?.parts || []) {
    const n = (part.name || '').toLowerCase();
    let role = 'other';
    if (/head/.test(n)) role = 'head';
    else if (/body|torso/.test(n)) role = 'body';
    else if (/ear/.test(n)) role = 'ears';
    else if (/muzzle|nose|snout/.test(n)) role = 'muzzle';
    else if (/tail/.test(n)) role = 'tail';
    else if (part.shape === 'sphere' && !roles.head) role = 'head';
    else if (part.shape === 'ellipsoid' && !roles.body) role = 'body';
    if (!roles[role]) roles[role] = part;
  }
  return roles;
}

function creatureSvg(spec, cx) {
  const r = rolesFromSpec(spec);
  const col = (role, fb = 'cream') => hexOf(r[role]?.color || fb);
  const headR = 90, bodyRx = 80, bodyRy = 105;
  const headCy = 210, bodyCy = headCy + headR + bodyRy - 18;
  let s = '';
  s += `<ellipse cx="${cx}" cy="${bodyCy + bodyRy + 26}" rx="${bodyRx * 1.1}" ry="22" fill="rgba(0,0,0,0.22)"/>`;
  if (r.tail) s += `<circle cx="${cx + bodyRx - 10}" cy="${bodyCy + bodyRy - 30}" r="26" fill="${col('tail')}"/>`;
  if (r.body) s += `<ellipse cx="${cx}" cy="${bodyCy}" rx="${bodyRx}" ry="${bodyRy}" fill="${col('body')}"/>`;
  if (r.ears) {
    s += `<circle cx="${cx - headR * 0.6}" cy="${headCy - headR * 0.7}" r="30" fill="${col('ears')}"/>`;
    s += `<circle cx="${cx + headR * 0.6}" cy="${headCy - headR * 0.7}" r="30" fill="${col('ears')}"/>`;
  }
  if (r.head) s += `<circle cx="${cx}" cy="${headCy}" r="${headR}" fill="${col('head')}"/>`;
  if (r.head) {
    s += `<circle cx="${cx - headR * 0.35}" cy="${headCy - 6}" r="9" fill="#1A1726"/>`;
    s += `<circle cx="${cx + headR * 0.35}" cy="${headCy - 6}" r="9" fill="#1A1726"/>`;
  }
  if (r.muzzle) s += `<circle cx="${cx}" cy="${headCy + headR * 0.35}" r="32" fill="${col('muzzle', 'white')}"/>`;
  return s;
}

export async function GET(_request, { params }) {
  const design = getDesignById(params.id);
  if (!design) {
    return new Response("Not found", { status: 404 });
  }

  const name = esc(design.name);
  const partCount = design.spec?.parts?.length || 0;
  const swatches = [...new Set((design.spec?.parts || []).map((p) => p.color).filter(Boolean))].slice(0, 6);
  const swatchSvg = swatches
    .map((c, i) => `<circle cx="${720 + i * 46}" cy="430" r="18" fill="${hexOf(c)}" stroke="#0E0D15" stroke-width="3"/>`)
    .join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#15131F"/>
      <stop offset="1" stop-color="#0A0910"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.3" cy="0.4" r="0.6">
      <stop offset="0" stop-color="#8B7CF6" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#8B7CF6" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  ${creatureSvg(design.spec, 340)}
  <text x="700" y="220" font-family="Georgia, 'Times New Roman', serif" font-size="76" font-weight="700" fill="#ECE8F6">${name}</text>
  <text x="702" y="280" font-family="Arial, sans-serif" font-size="30" fill="#A9A2C0">${partCount} parts · amigurumi</text>
  <text x="700" y="392" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#5FD4B2">✓ Verified math</text>
  ${swatchSvg}
  <text x="700" y="560" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#A78BFF">Made with Loopsy</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
