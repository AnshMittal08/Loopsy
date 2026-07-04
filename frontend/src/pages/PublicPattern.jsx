import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion as Motion } from 'motion/react';
import { Star, ArrowLeft, Sparkles, Globe, BookOpen, Share2 } from 'lucide-react';
import TopNav from '../components/TopNav';
import Footer from '../components/Footer';
import SaveToCollection from '../components/SaveToCollection';
import Comments from '../components/Comments';
import CopyLinkDialog from '../components/CopyLinkDialog';
import ReportDialog from '../components/ReportDialog';
import TagChips from '../components/TagChips';
import { Reveal } from '../components/motion/Reveal';
import VerifiedBadge from '../components/VerifiedBadge';
import { getPatternTheme } from '../lib/patternThemes';
import { useDocumentHead } from '../lib/useDocumentHead';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';

function usePatternHead(pattern, id) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const head = pattern
    ? (() => {
        const authorName = pattern.authorName || 'a maker';
        const parts = [pattern.difficulty, pattern.category, 'crochet pattern'].filter(Boolean);
        const description = `${parts.join(' ')} by ${authorName}.`.replace(/\s+/g, ' ').trim();
        const steps = (Array.isArray(pattern.steps) ? pattern.steps : [])
          .map((s) => s.instruction || s.text || (typeof s === 'string' ? s : ''))
          .filter(Boolean)
          .slice(0, 30)
          .map((text) => ({ '@type': 'HowToStep', text }));
        const jsonLd = {
          '@context': 'https://schema.org',
          '@type': 'HowTo',
          name: pattern.title,
          description,
          ...(pattern.authorName
            ? {
                author: {
                  '@type': 'Person',
                  name: pattern.authorName,
                  ...(pattern.authorHandle ? { alternateName: `@${pattern.authorHandle}` } : {}),
                },
              }
            : {}),
          ...(steps.length ? { step: steps } : {}),
        };
        return {
          title: pattern.title,
          description,
          canonicalPath: `/p/${id}`,
          image: `${origin}/api/patterns/${id}/og`,
          type: 'article',
          jsonLd,
        };
      })()
    : {};
  useDocumentHead(head);
}

export default function PublicPattern() {
  const { id } = useParams();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [pattern, setPattern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);
  const [starring, setStarring] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/patterns/${id}/public`);
        if (!res.ok) { if (!cancelled) setPattern(null); return; }
        const [data, feed] = await Promise.all([
          res.json(),
          user ? fetch(`/api/community?limit=1&offset=0`).then((r) => r.json()).catch(() => ({})) : Promise.resolve({}),
        ]);
        if (cancelled) return;
        setPattern(data);
        setStarCount(data.starCount ?? 0);
        if (user && (feed.starredIds ?? []).includes(data.id)) {
          Promise.resolve().then(() => setStarred(true));
        }
      } catch {
        if (!cancelled) setPattern(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, user]);

  const handleStar = async () => {
    if (!user) { showToast('Sign in to star patterns.', 'info'); return; }
    setStarring(true);
    try {
      const res = await fetch(`/api/patterns/${id}/star`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setStarred(data.starred);
      setStarCount(data.starCount);
    } catch {
      showToast('Could not star this pattern.', 'error');
    } finally {
      setStarring(false);
    }
  };

  const [shareUrl, setShareUrl] = useState(null);
  const [reporting, setReporting] = useState(false);
  const handleShare = async () => {
    const url = `${window.location.origin}/p/${id}`;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast('Link copied', 'success');
        return;
      }
      throw new Error('no clipboard');
    } catch {
      setShareUrl(url); // clipboard unavailable → in-app copy dialog
    }
  };

  const navigate = useNavigate();
  const [importing, setImporting] = useState(false);
  // Copy this published pattern into the caller's own projects, then open it.
  const handleTrackThis = async () => {
    if (!user) { showToast('Sign in to save this pattern to your projects.', 'info'); navigate('/account'); return; }
    setImporting(true);
    try {
      const res = await fetch(`/api/patterns/${id}/import`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save this pattern.');
      showToast('Added to your projects — happy making!', 'success');
      navigate(`/tracker/${data.pattern.id}`);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setImporting(false);
    }
  };

  usePatternHead(pattern, id);

  const theme = pattern ? getPatternTheme(pattern.category) : getPatternTheme(null);
  const Icon = theme.icon;

  if (loading) {
    return (
      <div className="min-h-dvh bg-surface">
        <TopNav />
        <main className="mx-auto max-w-3xl px-5 py-10 md:px-10">
          <div className="h-8 w-48 rounded-lg shimmer mb-6" />
          <div className="h-64 rounded-2xl shimmer mb-6" />
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}
          </div>
        </main>
      </div>
    );
  }

  if (!pattern) {
    return (
      <div className="min-h-dvh bg-surface">
        <TopNav />
        <main className="mx-auto max-w-3xl px-5 py-20 text-center md:px-10">
          <p className="text-on-surface-variant mb-4">This pattern doesn't exist or hasn't been published.</p>
          <Link to="/community" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm">
            Browse community
          </Link>
        </main>
      </div>
    );
  }

  const steps = Array.isArray(pattern.steps) ? pattern.steps : [];

  return (
    <div className="min-h-dvh bg-surface">
      <TopNav />
      {shareUrl && <CopyLinkDialog url={shareUrl} title="Share this pattern" onClose={() => setShareUrl(null)} />}
      {reporting && <ReportDialog resourceType="pattern" resourceId={id} onClose={() => setReporting(false)} />}

      <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-5 py-10 pb-20 md:px-10 outline-none">
        <Reveal>
          <Link to="/community" className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface mb-6 transition-colors">
            <ArrowLeft size={13} />
            Community
          </Link>

          {/* Header */}
          <div className={`rounded-2xl bg-gradient-to-br ${theme.accent} p-6 mb-6 relative overflow-hidden`}>
            <div className={`absolute -top-8 -right-8 h-32 w-32 rounded-full blur-3xl opacity-50 ${theme.orb}`} />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-container-lowest/85 px-2.5 py-1 text-[11px] font-semibold text-on-surface backdrop-blur-sm">
                    <Icon size={11} />
                    {pattern.category || 'Custom'}
                  </span>
                  {pattern.difficulty && (
                    <span className="rounded-full bg-surface-container-lowest/85 px-2.5 py-1 text-[11px] font-semibold text-on-surface backdrop-blur-sm">
                      {pattern.difficulty}
                    </span>
                  )}
                  {pattern.isAIGenerated && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary backdrop-blur-sm">
                      <Sparkles size={10} />AI
                    </span>
                  )}
                  <VerifiedBadge pattern={pattern} compact />
                </div>
                <h1 className="text-2xl font-bold text-on-surface leading-tight mb-1">{pattern.title}</h1>
                {pattern.authorHandle ? (
                  <p className="text-sm text-on-surface-variant">
                    by{' '}
                    <Link
                      to={`/u/${pattern.authorHandle}`}
                      className="font-medium text-on-surface hover:text-primary transition-colors"
                    >
                      {pattern.authorName}
                    </Link>
                  </p>
                ) : (
                  <p className="text-sm text-on-surface-variant">by {pattern.authorName}</p>
                )}
                <TagChips tags={pattern.tags} className="mt-3" />
              </div>
              <div className="flex shrink-0 items-start gap-2">
                <Motion.button
                  onClick={handleStar}
                  disabled={starring}
                  whileTap={{ scale: 0.88 }}
                  className="flex flex-col items-center gap-0.5 rounded-xl bg-surface-container-lowest/85 px-3 py-2.5 backdrop-blur-sm transition-colors hover:bg-surface-container-lowest disabled:opacity-60"
                >
                  <Star size={20} className={starred ? 'text-tertiary fill-tertiary' : 'text-on-surface-variant'} />
                  <span className="text-[11px] font-bold text-on-surface">{starCount}</span>
                </Motion.button>
                <Motion.button
                  onClick={handleShare}
                  whileTap={{ scale: 0.88 }}
                  aria-label="Copy share link"
                  className="flex flex-col items-center gap-0.5 rounded-xl bg-surface-container-lowest/85 px-3 py-2.5 backdrop-blur-sm transition-colors hover:bg-surface-container-lowest"
                >
                  <Share2 size={20} className="text-on-surface-variant" />
                  <span className="text-[11px] font-bold text-on-surface">Share</span>
                </Motion.button>
                <SaveToCollection patternId={pattern.id} />
              </div>
            </div>
          </div>

          {/* Meta */}
          {(pattern.hookSize || pattern.yarnWeight || pattern.timeEstimate || pattern.finishedSize) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                ['Hook', pattern.hookSize],
                ['Yarn', pattern.yarnWeight],
                ['Time', pattern.timeEstimate],
                ['Size', pattern.finishedSize],
              ].filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-3 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-on-surface">{value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Steps */}
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6">
            <div className="flex items-center gap-2 mb-5">
              <BookOpen size={16} className="text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Pattern steps</h2>
            </div>
            {steps.length === 0 ? (
              <p className="text-sm text-on-surface-variant">No steps available.</p>
            ) : (
              <ol className="space-y-3">
                {steps.map((step, i) => {
                  const text = step.instruction || step.text || step;
                  const row = step.row ?? i + 1;
                  return (
                    <li key={i} className="flex gap-3 rounded-xl bg-surface-container-low p-3.5">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {row}
                      </span>
                      <p className="text-sm text-on-surface leading-relaxed">{text}</p>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* CTA */}
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={handleTrackThis}
              disabled={importing}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors disabled:opacity-60"
            >
              {importing ? 'Adding to your projects…' : 'Track this in My Projects'}
            </button>
            <Link to="/community" className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
              <Globe size={14} />
              More from community
            </Link>
            <button
              onClick={() => (user ? setReporting(true) : showToast('Sign in to report content.', 'info'))}
              className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2.5 text-xs font-semibold text-on-surface-variant hover:text-error transition-colors"
              title="Report this pattern"
            >
              Report
            </button>
          </div>
        </Reveal>

        <Comments patternId={pattern.id} patternOwnerId={pattern.userId} />
      </main>
      <Footer />
    </div>
  );
}
