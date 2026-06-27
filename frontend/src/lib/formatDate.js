/** Format an ISO timestamp as "Month YYYY" (e.g. "June 2026"). */
export function formatMonthYear(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
