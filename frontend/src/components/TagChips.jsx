import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Renders pattern tags as small chips linking to the tag-filtered community
 * feed. `stopPropagation` keeps a click from triggering an enclosing card link.
 * `limit` caps how many chips render (default: all).
 */
export default function TagChips({ tags, limit, className = '' }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const shown = typeof limit === 'number' ? tags.slice(0, limit) : tags;
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {shown.map((tag) => (
        <Link
          key={tag}
          to={`/community?tag=${encodeURIComponent(tag)}`}
          onClick={(e) => e.stopPropagation()}
          className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary hover:bg-primary/20 transition-colors"
        >
          #{tag}
        </Link>
      ))}
    </div>
  );
}
