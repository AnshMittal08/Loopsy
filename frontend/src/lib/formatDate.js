/** Format an ISO timestamp as "Month YYYY" (e.g. "June 2026"). */
export function formatMonthYear(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

/**
 * Format an ISO timestamp as a short relative time:
 * "just now", "3m ago", "3h ago", "2d ago"; falls back to a localized
 * date for anything older than ~a week (or invalid input).
 */
export function formatRelativeTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 0) return 'just now';
  if (sec < 45) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
