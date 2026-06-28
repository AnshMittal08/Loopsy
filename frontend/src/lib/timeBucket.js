// Time-estimate parsing + bucketing for the catalog browser.
//
// Template `timeEstimate` strings come in many shapes:
//   "30 min", "45 min–1.5 hrs", "1–2 hrs", "2–4 hrs", "6–8 hrs",
//   "15–25 hrs", "1–2 hrs total"
// Ranges use an en-dash (–) or a plain hyphen (-). We classify by the
// *lower* bound of the range, normalized to hours, into three buckets.

export const TIME_BUCKETS = [
  { id: 'quick', label: 'Quick', hint: '≤1 hr' },
  { id: 'afternoon', label: 'An afternoon', hint: '1–4 hrs' },
  { id: 'bigger', label: 'A bigger make', hint: '4 hrs+' },
];

const TIME_BUCKET_LABELS = Object.fromEntries(
  TIME_BUCKETS.map((b) => [b.id, b.label])
);

/**
 * Parse the *first* numeric quantity + unit out of a time string and return
 * it normalized to hours. Returns null when nothing parseable is found.
 *
 * Handles: "30 min" → 0.5, "1.5 hrs" → 1.5, "2–4 hrs" → 2 (lower bound),
 * "45 min–1.5 hrs" → 0.75, "an hour" → null (no leading number).
 */
export function parseTimeToHours(timeEstimate) {
  if (typeof timeEstimate !== 'string') return null;
  const str = timeEstimate.toLowerCase();

  // First number (supports decimals) anywhere in the string.
  const numMatch = str.match(/(\d+(?:\.\d+)?)/);
  if (!numMatch) return null;
  const value = parseFloat(numMatch[1]);
  if (!Number.isFinite(value)) return null;

  // Unit that follows the first number, scanning to the end of the string.
  // Default to hours when no recognizable unit is present.
  const rest = str.slice(numMatch.index + numMatch[1].length);
  const unitMatch = rest.match(/(hour|hr|hrs|h|min|minute|m)\b/);
  const unit = unitMatch ? unitMatch[1] : 'hr';

  if (unit.startsWith('m')) {
    // minutes
    return value / 60;
  }
  // hours
  return value;
}

/**
 * Bucket a time string into one of the TIME_BUCKETS ids.
 * Falls back to 'afternoon' (the sensible middle) when unparseable so a
 * template never silently drops out of every time facet.
 */
export function bucketTime(timeEstimate) {
  const hours = parseTimeToHours(timeEstimate);
  if (hours == null) return 'afternoon';
  if (hours < 1) return 'quick';
  if (hours <= 4) return 'afternoon';
  return 'bigger';
}

export function timeBucketLabel(id) {
  return TIME_BUCKET_LABELS[id] || id;
}
