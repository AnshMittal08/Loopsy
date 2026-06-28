import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Trash2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useToast } from './Toast';
import { formatRelativeTime } from '../lib/formatDate';

const MAX_LEN = 2000;

/**
 * Comments thread for a published pattern. Reads/writes
 * /api/patterns/:patternId/comments. `patternOwnerId` lets the pattern's
 * owner delete any comment; authors can always delete their own.
 */
export default function Comments({ patternId, patternOwnerId }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!patternId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/patterns/${patternId}/comments`);
        const data = await res.json();
        if (cancelled) return;
        setComments(Array.isArray(data.comments) ? data.comments : []);
      } catch {
        /* leave empty */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patternId]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patterns/${patternId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.comment) setComments((prev) => [...prev, data.comment]);
      setBody('');
    } catch {
      showToast('Could not post your comment.', 'error');
    } finally {
      setSubmitting(false);
    }
  }, [body, submitting, patternId, showToast]);

  const handleDelete = useCallback(async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      const res = await fetch(`/api/patterns/${patternId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error();
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch {
      showToast('Could not delete this comment.', 'error');
    }
  }, [patternId, showToast]);

  const remaining = MAX_LEN - body.length;
  const trimmedEmpty = body.trim().length === 0;

  return (
    <section className="mt-8 rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={16} className="text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">
          Comments{!loading ? ` · ${comments.length}` : ''}
        </h2>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-6">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
            rows={3}
            maxLength={MAX_LEN}
            placeholder="Share a tip, ask a question…"
            className="w-full resize-y rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-2 flex items-center justify-end gap-3">
            {remaining <= 100 && (
              <span className={`text-[11px] font-medium ${remaining < 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                {remaining}
              </span>
            )}
            <button
              type="submit"
              disabled={trimmedEmpty || submitting}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-outline-variant/20 bg-surface-container-low p-4">
          <p className="text-sm text-on-surface-variant">Sign in to join the conversation.</p>
          <Link
            to="/account"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors"
          >
            Sign in to comment
          </Link>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-16 rounded-xl shimmer" />)}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No comments yet — be the first.</p>
      ) : (
        <ul className="space-y-4">
          {comments.map((c) => {
            const canDelete = user && (c.userId === user.id || patternOwnerId === user.id);
            return (
              <li key={c.id} className="rounded-xl bg-surface-container-low p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
                    {c.authorHandle ? (
                      <Link
                        to={`/u/${c.authorHandle}`}
                        className="text-sm font-semibold text-on-surface hover:text-primary transition-colors"
                      >
                        {c.authorName}
                      </Link>
                    ) : (
                      <span className="text-sm font-semibold text-on-surface">{c.authorName}</span>
                    )}
                    <span className="text-[11px] text-on-surface-variant">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(c.id)}
                      aria-label="Delete comment"
                      className="shrink-0 rounded-lg p-1 text-on-surface-variant/60 hover:bg-error-container hover:text-on-error-container transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm text-on-surface leading-relaxed">
                  {c.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
