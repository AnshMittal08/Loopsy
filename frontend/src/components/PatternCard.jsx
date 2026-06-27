import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Star, Sparkles } from 'lucide-react';
import VerifiedBadge from './VerifiedBadge';
import { getPatternTheme } from '../lib/patternThemes';

/**
 * Shared community pattern card. Used by the Community feed, creator profiles,
 * and collection grids. The star control is optional via `showStar` so grids
 * that don't need it (or aren't community-scoped) can omit it.
 */
export default function PatternCard({ pattern, starred = false, onStar, authed = false, showStar = true }) {
  const theme = getPatternTheme(pattern.category);
  const Icon = theme.icon;
  const [localStarred, setLocalStarred] = useState(starred);
  const [localCount, setLocalCount] = useState(pattern.starCount ?? 0);
  const [busy, setBusy] = useState(false);
  const prevStarredRef = React.useRef(starred);

  // Sync prop change when parent refreshes starredIds (deferred to avoid
  // the react-hooks/set-state-in-effect lint rule).
  React.useEffect(() => {
    if (prevStarredRef.current !== starred) {
      prevStarredRef.current = starred;
      Promise.resolve().then(() => setLocalStarred(starred));
    }
  }, [starred]);

  const handleStar = async (e) => {
    e.preventDefault();
    if (!authed) { onStar?.(); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/patterns/${pattern.id}/star`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLocalStarred(data.starred);
      setLocalCount(data.starCount);
    } catch {
      /* silent */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Link
      to={`/p/${pattern.id}`}
      className="group relative flex flex-col rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm overflow-hidden hover:shadow-warm-md transition-shadow"
    >
      <div className={`h-40 relative bg-gradient-to-br ${theme.accent} flex items-end p-4`}>
        <div className={`absolute -top-4 -right-4 h-20 w-20 rounded-full blur-2xl opacity-60 ${theme.orb}`} />
        <div className="rounded-full bg-surface-container-lowest/85 p-2 backdrop-blur-sm">
          <Icon size={16} className="text-on-surface" />
        </div>
        {showStar && (
          <button
            onClick={handleStar}
            disabled={busy}
            aria-label={localStarred ? 'Unstar' : 'Star'}
            className="absolute top-3 right-3 rounded-full bg-surface-container-lowest/85 p-1.5 backdrop-blur-sm transition-transform hover:scale-110 disabled:opacity-60"
          >
            <Star
              size={15}
              className={localStarred ? 'text-tertiary fill-tertiary' : 'text-on-surface-variant'}
            />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-on-surface leading-snug line-clamp-2 flex-1">
            {pattern.title}
          </h3>
          <VerifiedBadge pattern={pattern} compact />

        </div>
        {pattern.authorName && (
          pattern.authorHandle ? (
            <p className="text-xs text-on-surface-variant">
              by{' '}
              <Link
                to={`/u/${pattern.authorHandle}`}
                onClick={(e) => e.stopPropagation()}
                className="font-medium text-on-surface-variant hover:text-primary transition-colors"
              >
                {pattern.authorName}
              </Link>
            </p>
          ) : (
            <p className="text-xs text-on-surface-variant">by {pattern.authorName}</p>
          )
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <div className="flex gap-1.5 flex-wrap">
            {pattern.difficulty && (
              <span className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-semibold text-on-surface-variant">
                {pattern.difficulty}
              </span>
            )}
            {pattern.isAIGenerated && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles size={9} />AI
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-on-surface-variant">
            <Star size={11} className={localStarred ? 'text-tertiary fill-tertiary' : ''} />
            {localCount}
          </span>
        </div>
      </div>
    </Link>
  );
}
