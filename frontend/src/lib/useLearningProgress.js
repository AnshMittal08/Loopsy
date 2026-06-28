import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';

const EMPTY_SET = new Set();

/**
 * Learning Centre progress + bookmarking.
 *
 * For a signed-in user this fetches `GET /api/learning/progress` once and
 * exposes the read/bookmarked slug sets plus optimistic mutators. The mutators
 * apply the desired state locally, POST it, then reconcile from the server's
 * returned `items` (the authoritative full set). On error they revert to the
 * snapshot taken before the optimistic change and surface a toast.
 *
 * Logged-out users get empty sets; the mutators no-op and nudge sign-in.
 *
 * Lives in `src/lib/` (not a component file) so it doesn't trip the
 * react-refresh only-export-components lint rule.
 */
export function useLearningProgress() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Map<slug, { readAt: string|null, bookmarked: boolean }>
  const [items, setItems] = useState(() => new Map());
  const [loading, setLoading] = useState(Boolean(user));

  // Apply a server `items` array to local state.
  const applyServerItems = useCallback((list) => {
    const next = new Map();
    for (const it of list || []) {
      if (!it || !it.guideSlug) continue;
      next.set(it.guideSlug, {
        readAt: it.readAt ?? null,
        bookmarked: Boolean(it.bookmarked),
      });
    }
    setItems(next);
  }, []);

  // Fetch once per signed-in user. Guarded by a cancelled flag; setState is
  // never called synchronously in the effect body — only inside the async
  // resolution (or a deferred microtask for the logged-out reset).
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      // Defer the reset so we don't setState synchronously in the effect body.
      Promise.resolve().then(() => {
        if (cancelled) return;
        setItems(new Map());
        setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/learning/progress');
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        applyServerItems(data.items);
      } catch {
        if (!cancelled) setItems(new Map());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, applyServerItems]);

  const readSlugs = useMemo(() => {
    const s = new Set();
    for (const [slug, v] of items) if (v.readAt) s.add(slug);
    return s;
  }, [items]);

  const bookmarkedSlugs = useMemo(() => {
    const s = new Set();
    for (const [slug, v] of items) if (v.bookmarked) s.add(slug);
    return s;
  }, [items]);

  // Shared optimistic mutate: patch local entry, POST the desired state, then
  // reconcile from the returned full set; revert + toast on failure.
  const mutate = useCallback(
    async (slug, patch, body) => {
      if (!user) {
        showToast('Sign in to track your progress.', 'info');
        return;
      }

      // Snapshot for revert.
      let snapshot;
      setItems((prev) => {
        snapshot = prev;
        const next = new Map(prev);
        const current = next.get(slug) || { readAt: null, bookmarked: false };
        next.set(slug, { ...current, ...patch });
        return next;
      });

      try {
        const res = await fetch('/api/learning/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, ...body }),
        });
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        const data = await res.json();
        applyServerItems(data.items);
      } catch {
        if (snapshot) setItems(snapshot);
        showToast('Could not save your progress.', 'error');
      }
    },
    [user, showToast, applyServerItems],
  );

  const markRead = useCallback(
    (slug, read) =>
      mutate(
        slug,
        { readAt: read ? new Date().toISOString() : null },
        { read: Boolean(read) },
      ),
    [mutate],
  );

  const toggleBookmark = useCallback(
    (slug) => {
      const next = !bookmarkedSlugs.has(slug);
      return mutate(slug, { bookmarked: next }, { bookmarked: next });
    },
    [mutate, bookmarkedSlugs],
  );

  return {
    readSlugs: user ? readSlugs : EMPTY_SET,
    bookmarkedSlugs: user ? bookmarkedSlugs : EMPTY_SET,
    loading,
    markRead,
    toggleBookmark,
  };
}

export default useLearningProgress;
