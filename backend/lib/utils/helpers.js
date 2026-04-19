import { v4 as uuidv4 } from "uuid";

/**
 * Generate a unique ID.
 * @returns {string} UUID v4
 */
export function generateId() {
  return uuidv4();
}

/**
 * Calculate progress percentage rounded to one decimal place.
 * @param {number} completed - number of completed steps
 * @param {number} total - total number of steps
 * @returns {number} percentage (0–100)
 */
export function calcPercentage(completed, total) {
  if (total === 0) return 0;
  return Math.round((completed / total) * 1000) / 10;
}

/**
 * Scale stitch-count numbers inside a step string by a given factor.
 * Skips the leading ordinal like "Row 1:" or "Round 3:" to avoid scaling row numbers.
 *
 * @param {string} text - a single pattern step string
 * @param {number} factor - multiplier (e.g. 0.75 for small, 1.25 for large)
 * @returns {string} step with scaled numbers
 */
export function scaleStitchCount(text, factor) {
  if (factor === 1.0) return text;

  // Match "Row N:" or "Round N:" at the start and preserve it
  const prefixMatch = text.match(/^(Row\s+\d+|Round\s+\d+)\s*:/i);
  if (prefixMatch) {
    const prefix = prefixMatch[0];
    const rest = text.slice(prefix.length);
    return prefix + scaleNumbers(rest, factor);
  }

  return scaleNumbers(text, factor);
}

/**
 * Replace all standalone integers in a string, scaling by factor.
 * Rounds to nearest integer and keeps a minimum of 1.
 */
function scaleNumbers(text, factor) {
  return text.replace(/\b(\d+)\b/g, (match, num) => {
    const scaled = Math.max(1, Math.round(parseInt(num, 10) * factor));
    return String(scaled);
  });
}
