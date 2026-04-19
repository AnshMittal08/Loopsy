/**
 * In-memory pattern store.
 * Uses globalThis to share state across Next.js route modules in dev mode.
 * Resets on server restart — intentional for MVP.
 */
if (!globalThis.__patterns) globalThis.__patterns = [];
const patterns = globalThis.__patterns;

/**
 * Return all patterns.
 * @returns {Array}
 */
export function getAllPatterns() {
  return [...patterns];
}

/**
 * Find a pattern by ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getPatternById(id) {
  return patterns.find((p) => p.id === id) ?? null;
}

/**
 * Insert a new pattern and return it.
 * @param {Object} pattern
 * @returns {Object}
 */
export function createPattern(pattern) {
  patterns.push(pattern);
  return pattern;
}
