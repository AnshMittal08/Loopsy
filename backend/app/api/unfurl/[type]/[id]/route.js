// Crawler-facing unfurl pages. The SPA can't serve per-page Open Graph tags
// to bots that don't run JS (Slack, WhatsApp, X, Discord…), so vercel.json
// rewrites social-crawler user agents for /p/:id, /d/:id and /u/:handle to
// these endpoints. Humans who somehow land here are meta-refreshed to the SPA.

import { getPublicPatternById } from "../../../../../lib/models/patternModel";
import { getDesignById } from "../../../../../lib/models/designModel";
import { getUserByHandle } from "../../../../../lib/models/userModel";

export const dynamic = "force-dynamic";

const esc = (s) =>
  String(s || "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]));

function page({ title, description, path, image }) {
  const base = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  const url = `${base}${path}`;
  const img = image ? `${base}${image}` : null;
  const t = esc(title);
  const d = esc(description);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Loopsy">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
${img ? `<meta property="og:image" content="${img}">` : ""}
<meta name="twitter:card" content="${img ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta http-equiv="refresh" content="0;url=${url}">
</head>
<body><p>Redirecting to <a href="${url}">${t}</a>…</p></body>
</html>`;
}

async function resolve(type, id) {
  if (type === "p") {
    const p = await getPublicPatternById(id);
    if (!p) return null;
    const by = p.authorName ? ` by ${p.authorName}` : "";
    const badge = p.verified ? "Verified-math crochet pattern" : "Crochet pattern";
    return {
      title: `${p.title} — Loopsy`,
      description: `${badge}${by}. ${[p.difficulty, p.category, p.yarnWeight].filter(Boolean).join(" · ")}. Every stitch count computed, never guessed.`,
      path: `/p/${id}`,
    };
  }
  if (type === "d") {
    const d = await getDesignById(id);
    if (!d || d.deletedAt) return null;
    const parts = Array.isArray(d.spec?.parts) ? d.spec.parts.length : 0;
    return {
      title: `${d.name || "Custom design"} — Loopsy Design Canvas`,
      description: `A crochet design made on the Loopsy canvas${parts ? ` from ${parts} part${parts === 1 ? "" : "s"}` : ""} — open it to see the shapes and generate the verified pattern.`,
      path: `/d/${id}`,
      image: `/api/designs/${id}/og`,
    };
  }
  if (type === "u") {
    const u = await getUserByHandle(id);
    if (!u) return null;
    return {
      title: `${u.name} (@${u.handle}) — Loopsy`,
      description: u.bio || `${u.name} makes and publishes crochet patterns on Loopsy.`,
      path: `/u/${u.handle}`,
    };
  }
  return null;
}

export async function GET(_request, { params }) {
  const meta = await resolve(params.type, params.id);
  if (!meta) return new Response("Not found", { status: 404 });
  return new Response(page(meta), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}
