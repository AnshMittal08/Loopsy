import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shapes, Plus, Trash2, Share2, Pencil } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileHeader from '../components/MobileHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import CopyLinkDialog from '../components/CopyLinkDialog';
import { Reveal, RevealGroup, RevealItem } from '../components/motion/Reveal';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';
import { useDocumentHead } from '../lib/useDocumentHead';
import { formatRelativeTime } from '../lib/formatDate';

/** The maker's saved canvas designs — open to keep editing, share, or delete. */
export default function MyDesigns() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [designs, setDesigns] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // { id, name }
  const [shareUrl, setShareUrl] = useState(null);

  useDocumentHead({ title: 'My Designs', description: 'Your saved canvas designs — reopen and keep editing.' });

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/designs');
        const data = await res.json();
        if (!cancelled) setDesigns(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setDesigns([]);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleDelete = async () => {
    const { id } = confirmDelete || {};
    setConfirmDelete(null);
    if (!id) return;
    try {
      const res = await fetch(`/api/designs/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setDesigns((prev) => (prev ?? []).filter((d) => d.id !== id));
      showToast('Design deleted.', 'info');
    } catch {
      showToast('Could not delete that design.', 'error');
    }
  };

  const handleShare = async (id) => {
    const url = `${window.location.origin}/d/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Share link copied.', 'success');
    } catch {
      setShareUrl(url);
    }
  };

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="flex min-h-dvh bg-surface">
        <MobileHeader />
        <SideNav />
        <main className="flex-1 px-5 pt-20 pb-10 md:pt-10 sm:px-6 md:px-10 lg:px-16">
          <div className="mx-auto max-w-md py-16 text-center">
            <h1 className="font-display text-2xl font-bold text-on-surface mb-2">Sign in to see your designs</h1>
            <p className="text-sm text-on-surface-variant mb-7">Saved canvas designs live with your account.</p>
            <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Go to account</Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-surface">
      <MobileHeader />
      {confirmDelete && (
        <ConfirmDialog
          title={`Delete "${confirmDelete.name}"?`}
          body="The design is removed from your library. Patterns already generated from it are kept."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
      {shareUrl && <CopyLinkDialog url={shareUrl} title="Share this design" onClose={() => setShareUrl(null)} />}
      <SideNav />
      <main id="main-content" tabIndex={-1} className="flex-1 px-5 pt-20 pb-28 md:pt-10 sm:px-6 md:px-10 md:pb-10 lg:px-16 outline-none">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Shapes size={18} className="text-primary" />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Design Canvas</p>
            </div>
            <h1 className="font-display display-wonk text-[1.9rem] sm:text-[2.4rem] font-bold text-on-surface leading-tight mb-2">My Designs</h1>
            <p className="text-on-surface-variant max-w-xl mb-8">
              Every design you save lands here — open one to keep editing, share it, or start something new.
            </p>
            <Link to="/design" className="mb-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors">
              <Plus size={15} />
              New design
            </Link>
          </Reveal>

          {designs === null ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-28 rounded-2xl shimmer" />)}
            </div>
          ) : designs.length === 0 ? (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
              <p className="text-on-surface-variant">No saved designs yet. Build something on the canvas and hit Save.</p>
            </div>
          ) : (
            <RevealGroup className="grid gap-4 sm:grid-cols-2">
              {designs.map((d) => {
                const partCount = Array.isArray(d.spec?.parts) ? d.spec.parts.length : 0;
                return (
                  <RevealItem key={d.id}>
                    <div className="group relative rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5 card-lift">
                      <button
                        onClick={() => navigate(`/design/${d.id}`)}
                        className="block w-full text-left"
                      >
                        <p className="font-semibold text-on-surface truncate pr-16">{d.name}</p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {partCount} {partCount === 1 ? 'part' : 'parts'} · edited {formatRelativeTime(d.updatedAt)}
                        </p>
                      </button>
                      <div className="mt-4 flex items-center gap-2">
                        <Link to={`/design/${d.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors">
                          <Pencil size={12} />
                          Open
                        </Link>
                        <button onClick={() => handleShare(d.id)} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-3 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
                          <Share2 size={12} />
                          Share
                        </button>
                        <button
                          onClick={() => setConfirmDelete({ id: d.id, name: d.name })}
                          aria-label={`Delete ${d.name}`}
                          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error-container/40 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </RevealItem>
                );
              })}
            </RevealGroup>
          )}
        </div>
      </main>
    </div>
  );
}
