// ESM resolver hook so node:test can import route handlers that use the Next
// `@/*` path alias (jsconfig maps "@/*" -> "./*" from the backend root).
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

function resolveFile(base) {
  const candidates = [base, `${base}.js`, `${base}.mjs`, path.join(base, 'index.js')];
  for (const c of candidates) {
    try { if (fs.statSync(c).isFile()) return c; } catch { /* keep looking */ }
  }
  return `${base}.js`;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const target = resolveFile(path.join(ROOT, specifier.slice(2)));
    return { url: pathToFileURL(target).href, shortCircuit: true };
  }
  // `next/server` can't load outside the Next runtime; route handlers only use
  // NextResponse.json() + cookies, so map it to a local shim.
  if (specifier === 'next/server') {
    const shim = path.join(ROOT, 'test/shims/next-server.mjs');
    return { url: pathToFileURL(shim).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
