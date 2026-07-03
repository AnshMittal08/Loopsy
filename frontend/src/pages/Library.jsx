import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'motion/react';
import { Library as LibraryIcon, Plus, Trash2, ArrowLeft, FolderOpen, Inbox, Star } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileHeader from '../components/MobileHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import PatternCard from '../components/PatternCard';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';
import { SPRING } from '../lib/motionTokens';

export default function Library() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [collections, setCollections] = useState(null);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [starred, setStarred] = useState(null); // null = loading

  const loadCollections = useCallback(async () => {
    try {
      const res = await fetch('/api/collections');
      if (!res.ok) throw new Error();
      const list = await res.json();
      setCollections(list);
    } catch {
      setCollections([]);
      showToast('Could not load your collections.', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(loadCollections);
  }, [user, loadCollections]);

  // Starred patterns — the star action's destination.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/patterns/starred');
        const data = await res.json();
        if (!cancelled) setStarred(Array.isArray(data.patterns) ? data.patterns : []);
      } catch {
        if (!cancelled) setStarred([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Load detail when a collection is selected.
  useEffect(() => {
    if (!selected) { Promise.resolve().then(() => setDetail(null)); return undefined; }
    let cancelled = false;
    Promise.resolve().then(() => setDetailLoading(true));
    (async () => {
      try {
        const res = await fetch(`/api/collections/${selected}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) { setDetail(null); showToast('Could not open that collection.', 'error'); }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected, showToast]);

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
    } catch {
      showToast('Could not create that collection.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const handleDelete = async () => {
    const { id } = confirmDelete || {};
    setConfirmDelete(null);
    if (!id) return;
    try {
      const res = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setCollections((prev) => (prev ?? []).filter((c) => c.id !== id));
      if (selected === id) setSelected(null);
      showToast('Collection deleted.', 'info');
    } catch {
      showToast('Could not delete that collection.', 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-dvh bg-surface">
        <MobileHeader />
        <SideNav />
        <main className="flex-1 px-5 pt-20 pb-10 md:pt-10 sm:px-6 md:px-10 lg:px-16">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="h-8 w-48 rounded-lg shimmer" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <LibraryIcon size={24} className="text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-on-surface mb-2">Sign in to build your library</h1>
          <p className="text-sm text-on-surface-variant mb-7">Collections let you save patterns you love into named lists.</p>
          <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
            Go to account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-surface">
      <MobileHeader />
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${confirmDelete.name}"?`}
          body="The collection is removed for good. The patterns inside it are not deleted."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      <SideNav />
      <main id="main-content" tabIndex={-1} className="flex-1 px-5 pt-20 pb-28 md:pt-10 sm:px-6 md:px-10 md:pb-10 lg:px-16 outline-none">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence mode="wait">
            {selected ? (
              /* ── Collection detail ─────────────────────── */
              <Motion.div
                key="detail"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={SPRING.gentle}
              >
                <button
                  onClick={() => setSelected(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface mb-6 transition-colors"
                >
                  <ArrowLeft size={13} />
                  All collections
                </button>

                {detailLoading || !detail ? (
                  <>
                    <div className="h-8 w-56 rounded-lg shimmer mb-6" />
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-2xl shimmer" />)}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-2">Collection</p>
                        <h1 className="font-display display-wonk text-[1.8rem] sm:text-[2.2rem] font-bold text-on-surface leading-tight">
                          {detail.collection.name}
                        </h1>
                        <p className="text-sm text-on-surface-variant mt-1">
                          {detail.patterns.length} {detail.patterns.length === 1 ? 'pattern' : 'patterns'}
                        </p>
                      </div>
                      <button
                        onClick={() => setConfirmDelete({ id: detail.collection.id, name: detail.collection.name })}
                        aria-label="Delete collection"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant shadow-warm transition-colors hover:text-error"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {detail.patterns.length === 0 ? (
                      <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
                          <Inbox size={20} className="text-on-surface-variant" />
                        </div>
                        <p className="text-on-surface-variant mb-5">No patterns saved here yet.</p>
                        <Link to="/community" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">
                          Browse community
                        </Link>
                      </div>
                    ) : (
                      <RevealGroup className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                        {detail.patterns.map((p) => (
                          <RevealItem key={p.id}>
                            <PatternCard pattern={p} authed showStar={false} />
                          </RevealItem>
                        ))}
                      </RevealGroup>
                    )}
                  </>
                )}
              </Motion.div>
            ) : (
              /* ── Collections list ──────────────────────── */
              <Motion.div
                key="list"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={SPRING.gentle}
              >
                <Reveal>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                      <LibraryIcon size={18} className="text-primary" />
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Library</p>
                  </div>
                  <h1 className="font-display display-wonk text-[1.9rem] sm:text-[2.4rem] font-bold text-on-surface leading-tight mb-2">
                    Your collections
                  </h1>
                  <p className="text-on-surface-variant max-w-xl mb-7">
                    Organise the patterns you love into named lists — save to them from any pattern page.
                  </p>

                  <form onSubmit={handleCreate} className="mb-8 flex max-w-md items-center gap-2 rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-1.5 shadow-warm">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="New collection name"
                      className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newName.trim() || creating}
                      className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-50 hover:bg-primary-dim transition-colors"
                    >
                      <Plus size={15} />
                      {creating ? 'Creating…' : 'Create'}
                    </button>
                  </form>
                </Reveal>

                {collections === null ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
                  </div>
                ) : collections.length === 0 ? (
                  <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-low">
                      <FolderOpen size={20} className="text-on-surface-variant" />
                    </div>
                    <p className="text-on-surface-variant">No collections yet. Create one above to start saving patterns.</p>
                  </div>
                ) : (
                  <RevealGroup className="grid gap-4 sm:grid-cols-2">
                    {collections.map((c) => (
                      <RevealItem key={c.id}>
                        <div className="group relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: c.id, name: c.name }); }}
                            aria-label={`Delete ${c.name}`}
                            className="absolute right-2.5 top-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface-container-lowest/90 text-on-surface-variant shadow-warm backdrop-blur opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all hover:text-error"
                          >
                            <Trash2 size={14} />
                          </button>
                          <button
                            onClick={() => setSelected(c.id)}
                            className="flex w-full items-center gap-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5 text-left card-lift"
                          >
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                              <FolderOpen size={19} className="text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-on-surface truncate">{c.name}</p>
                              <p className="text-xs text-on-surface-variant mt-0.5">
                                {c.patternCount ?? 0} {(c.patternCount ?? 0) === 1 ? 'pattern' : 'patterns'}
                              </p>
                            </div>
                          </button>
                        </div>
                      </RevealItem>
                    ))}
                  </RevealGroup>
                )}

                {/* ── Starred patterns ─────────────────────── */}
                <div className="mt-12">
                  <div className="mb-5 flex items-center gap-2">
                    <Star size={16} className="text-tertiary" />
                    <h2 className="font-display text-lg font-bold text-on-surface">Starred patterns</h2>
                  </div>
                  {starred === null ? (
                    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-2xl shimmer" />)}
                    </div>
                  ) : starred.length === 0 ? (
                    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-8 text-center">
                      <p className="text-sm text-on-surface-variant">
                        Nothing starred yet — tap the <Star size={12} className="inline -mt-0.5" /> on any{' '}
                        <Link to="/community" className="font-semibold text-primary hover:underline">community pattern</Link>{' '}
                        and it will land here.
                      </p>
                    </div>
                  ) : (
                    <RevealGroup className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {starred.map((p) => (
                        <RevealItem key={p.id}>
                          <PatternCard pattern={p} starred authed={Boolean(user)} />
                        </RevealItem>
                      ))}
                    </RevealGroup>
                  )}
                </div>
              </Motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
