import { getPublicPatternById } from "@/lib/models/patternModel";

// Auto-generated Open Graph image for a shared published pattern. Rendered as
// SVG (no fonts/WASM) — a branded card with the pattern's title, author, and
// trust signals. Mirrors the design share card style.

const esc = (s) => String(s || "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]));

// Wrap a title into up to 2 lines of ~18 chars so long names don't overflow.
function wrapTitle(title, max = 18) {
  const words = String(title || "Crochet Pattern").split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max && cur) { lines.push(cur); cur = w; }
    else cur = (cur + " " + w).trim();
    if (lines.length === 2) break;
  }
  if (cur && lines.length < 2) lines.push(cur);
  if (lines.length === 2 && words.join(" ").length > lines.join(" ").length) lines[1] = lines[1].replace(/.{0,3}$/, "…");
  return lines;
}

export async function GET(_request, { params }) {
  const pattern = await getPublicPatternById(params.id);
  if (!pattern) return new Response("Not found", { status: 404 });

  const titleLines = wrapTitle(pattern.title);
  const author = esc(pattern.authorName || "a Loopsy maker");
  const meta = [pattern.difficulty, pattern.category].filter(Boolean).map(esc).join(" · ");
  const stars = Number(pattern.starCount || 0);
  const verified = pattern.verified && !pattern.isExperimental;

  const titleSvg = titleLines
    .map((ln, i) => `<text x="100" y="${248 + i * 86}" font-family="Georgia, 'Times New Roman', serif" font-size="74" font-weight="700" fill="#ECE8F6">${esc(ln)}</text>`)
    .join("");

  const badges = [];
  if (verified) badges.push('<text x="100" y="470" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#5FD4B2">✓ Verified math</text>');
  badges.push(`<text x="${verified ? 360 : 100}" y="470" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#FFB02E">★ ${stars} star${stars === 1 ? "" : "s"}</text>`);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#15131F"/><stop offset="1" stop-color="#0A0910"/></linearGradient>
    <radialGradient id="glow" cx="0.7" cy="0.3" r="0.6"><stop offset="0" stop-color="#8B7CF6" stop-opacity="0.28"/><stop offset="1" stop-color="#8B7CF6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <text x="100" y="130" font-family="Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="3" fill="#A78BFF">LOOPSY · COMMUNITY PATTERN</text>
  ${titleSvg}
  <text x="102" y="${248 + titleLines.length * 86 + 14}" font-family="Arial, sans-serif" font-size="30" fill="#A9A2C0">by ${author}${meta ? `  ·  ${meta}` : ""}</text>
  ${badges.join("")}
  <text x="100" y="560" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#A78BFF">Made with Loopsy</text>
</svg>`;

  return new Response(svg, {
    status: 200,
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
