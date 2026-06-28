import { appOrigin } from "@/lib/auth/request";
import { getAllTemplates } from "@/lib/models/templateModel";
import { getAllPublishedPatternIds, getPublishedCreatorHandles } from "@/lib/models/patternModel";

// This route queries the DB, so it must never be statically generated at build
// time (that would hit the DB during `next build` and hang). Force it dynamic.
export const dynamic = "force-dynamic";

// Dynamic XML sitemap of the public, crawlable surface. Served at /sitemap.xml
// via a Vercel rewrite (frontend/vercel.json) so it sits at the site root.
//
// Learn-guide slugs live in the frontend content module; mirror them here
// (keep in sync with frontend/src/lib/learnContent.js GUIDES).
const LEARN_SLUGS = [
  "how-to-read-a-loopsy-pattern",
  "magic-ring",
  "working-in-the-round",
  "increasing-and-decreasing",
  "invisible-decrease",
  "changing-colors-and-stripes",
  "stuffing-and-assembly",
];

const STATIC_ROUTES = [
  { path: "/", priority: "1.0", freq: "daily" },
  { path: "/community", priority: "0.9", freq: "daily" },
  { path: "/learn", priority: "0.8", freq: "weekly" },
];

const xmlEscape = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]));

function urlEntry(origin, path, { lastmod, priority, freq } = {}) {
  const parts = [`<loc>${xmlEscape(origin + path)}</loc>`];
  if (lastmod) parts.push(`<lastmod>${xmlEscape(String(lastmod).slice(0, 10))}</lastmod>`);
  if (freq) parts.push(`<changefreq>${freq}</changefreq>`);
  if (priority) parts.push(`<priority>${priority}</priority>`);
  return `<url>${parts.join("")}</url>`;
}

export async function GET() {
  try {
    const origin = appOrigin();
    const [templates, patterns, handles] = await Promise.all([
      getAllTemplates(),
      getAllPublishedPatternIds(),
      getPublishedCreatorHandles(),
    ]);

    const urls = [
      ...STATIC_ROUTES.map((r) => urlEntry(origin, r.path, { priority: r.priority, freq: r.freq })),
      ...LEARN_SLUGS.map((s) => urlEntry(origin, `/learn/${s}`, { priority: "0.6", freq: "monthly" })),
      ...templates.map((t) => urlEntry(origin, `/templates/${t.id}`, { priority: "0.7", freq: "monthly" })),
      ...patterns.map((p) => urlEntry(origin, `/p/${p.id}`, { lastmod: p.publishedAt, priority: "0.6", freq: "weekly" })),
      ...handles.map((h) => urlEntry(origin, `/u/${encodeURIComponent(h)}`, { priority: "0.5", freq: "weekly" })),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;
    return new Response(xml, {
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    return new Response(`Sitemap error: ${error.message}`, { status: 500 });
  }
}
