import React, { useState, useEffect, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { Bookmark, Check, Plus, Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useToast } from './Toast';

/**
 * "Save" control for a public pattern. For signed-in users it opens a small
 * popover of their collections with toggles; unauthed users get a toast.
 * Lightweight — an absolutely-positioned panel with click-outside-to-close.
 */
export default function SaveToCollection({ patternId }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState(null);
  const [membership, setMembership] = useState(new Set());
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const wrapRef = useRef(null);

  // Close on outside click / Escape while open.
  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Load collections when the panel first opens.
  useEffect(() => {
    if (!open || collections !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/collections');
        if (!res.ok) throw new Error();
        const list = await res.json();
        if (cancelled) return;
        // Determine current membership by checking each collection's patterns.
        const members = await Promise.all(
          list.map(async (c) => {
            try {
              const r = await fetch(`/api/collections/${c.id}`);
              if (!r.ok) return null;
              const detail = await r.json();
              return (detail.patterns ?? []).some((p) => p.id === patternId) ? c.id : null;
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;
        setCollections(list);
        setMembership(new Set(members.filter(Boolean)));
      } catch {
        if (!cancelled) setCollections([]);
      }
    })();
    return () => { cancelled = true; };
  }, [open, collections, patternId]);

  const handleClick = () => {
    if (!user) { showToast('Sign in to save patterns.', 'info'); return; }
    setOpen((o) => !o);
  };

  const toggleMembership = async (collectionId) => {
    const present = !membership.has(collectionId);
    setBusyId(collectionId);
    try {
      const res = await fetch(`/api/collections/${collectionId}/patterns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId, present }),
      });
      if (!res.ok) throw new Error();
      setMembership((prev) => {
        const next = new Set(prev);
        if (present) next.add(collectionId); else next.delete(collectionId);
        return next;
      });
      setCollections((prev) =>
        (prev ?? []).map((c) =>
          c.id === collectionId
            ? { ...c, patternCount: Math.max(0, (c.patternCount ?? 0) + (present ? 1 : -1)) }
            : c,
        ),
      );
    } catch {
      showToast('Could not update that collection.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setCollections((prev) => [created, ...(prev ?? [])]);
      setNewName('');
      // Immediately add the pattern to the new collection.
      await toggleMembership(created.id);
    } catch {
      showToast('Could not create that collection.', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Motion.button
        onClick={handleClick}
        whileTap={{ scale: 0.92 }}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex flex-col items-center gap-0.5 rounded-xl bg-surface-container-lowest/85 px-3 py-2.5 backdrop-blur-sm transition-colors hover:bg-surface-container-lowest"
      >
        <Bookmark size={20} className="text-on-surface-variant" />
        <span className="text-[11px] font-bold text-on-surface">Save</span>
      </Motion.button>

      <AnimatePresence>
        {open && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute right-0 top-full z-30 mt-2 w-64 origin-top-right rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-2 shadow-warm-lg"
          >
            <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">
              Save to collection
            </p>

            <div className="max-h-56 overflow-y-auto">
              {collections === null ? (
                <div className="space-y-1.5 px-1 py-1">
                  {[1, 2, 3].map((i) => <div key={i} className="h-9 rounded-lg shimmer" />)}
                </div>
              ) : collections.length === 0 ? (
                <p className="px-2 py-3 text-xs text-on-surface-variant">No collections yet — create one below.</p>
              ) : (
                collections.map((c) => {
                  const checked = membership.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleMembership(c.id)}
                      disabled={busyId === c.id}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-60"
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
                          checked ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant/50'
                        }`}
                      >
                        {busyId === c.id ? (
                          <Loader2 size={12} className="animate-spin text-on-surface-variant" />
                        ) : checked ? (
                          <Check size={13} />
                        ) : null}
                      </span>
                      <span className="flex-1 min-w-0 truncate font-medium">{c.name}</span>
                      <span className="shrink-0 text-[11px] text-on-surface-variant">{c.patternCount ?? 0}</span>
                    </button>
                  );
                })
              )}
            </div>

            <form onSubmit={handleCreate} className="mt-1 flex items-center gap-1.5 border-t border-outline-variant/15 px-1 pt-2">
              <Plus size={14} className="shrink-0 text-on-surface-variant" />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection"
                className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-on-primary disabled:opacity-50 hover:bg-primary-dim transition-colors"
              >
                Add
              </button>
            </form>
          </Motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
