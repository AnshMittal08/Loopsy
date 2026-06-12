import React from 'react';
import { BadgeCheck } from 'lucide-react';

const TITLE = 'Stitch counts verified by the Loopsy pattern compiler';

/**
 * "Verified math" trust badge — shown only when the pattern compiler has
 * verified a pattern's stitch counts. Experimental or unverified patterns
 * get nothing (no negative badge).
 */
export default function VerifiedBadge({ pattern, compact = false, className = '' }) {
  if (!pattern?.verified || pattern?.isExperimental) return null;

  if (compact) {
    return (
      <span title={TITLE} className={`inline-flex shrink-0 items-center text-secondary ${className}`}>
        <BadgeCheck size={15} aria-hidden="true" />
        <span className="sr-only">Verified math</span>
      </span>
    );
  }

  return (
    <span
      title={TITLE}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-secondary-container px-2.5 py-0.5 text-[11px] font-semibold text-on-secondary-container ${className}`}
    >
      <BadgeCheck size={12} aria-hidden="true" />
      Verified math
    </span>
  );
}
