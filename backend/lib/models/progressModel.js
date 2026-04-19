/**
 * In-memory progress store.
 * Uses globalThis to share state across Next.js route modules in dev mode.
 * Resets on server restart — intentional for MVP.
 */
if (!globalThis.__progressRecords) globalThis.__progressRecords = [];
const progressRecords = globalThis.__progressRecords;

/**
 * Find a progress record by its own ID.
 * @param {string} id
 * @returns {Object|null}
 */
export function getProgressById(id) {
  return progressRecords.find((r) => r.id === id) ?? null;
}

/**
 * Find all progress records for a given pattern ID.
 * @param {string} patternId
 * @returns {Array}
 */
export function getProgressByPatternId(patternId) {
  return progressRecords.filter((r) => r.patternId === patternId);
}

/**
 * Create a new progress record and return it.
 * @param {Object} record
 * @returns {Object}
 */
export function createProgress(record) {
  progressRecords.push(record);
  return record;
}

/**
 * Update a progress record in-place and return it.
 * @param {string} id
 * @param {Partial<Object>} updates
 * @returns {Object|null}
 */
export function updateProgress(id, updates) {
  const index = progressRecords.findIndex((r) => r.id === id);
  if (index === -1) return null;
  progressRecords[index] = { ...progressRecords[index], ...updates };
  return progressRecords[index];
}
