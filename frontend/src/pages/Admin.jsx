import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileHeader from '../components/MobileHeader';
import { useDocumentHead } from '../lib/useDocumentHead';

// Continuous last-N-days series: fill missing days with 0 so the bar chart's
// x-domain never lies about gaps.
function fillDays(rows, days) {
  const byDay = Object.fromEntries((rows || []).map((r) => [r.d, Number(r.c)]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ d, c: byDay[d] || 0 });
  }
  return out;
}

// Single-series daily bar chart: one hue, 2px gaps, rounded tops anchored to
// the baseline, native per-bar tooltips, direct labels on max + last only.
function DayBars({ title, rows }) {
  const days = fillDays(rows, 14);
  const max = Math.max(1, ...days.map((r) => r.c));
  const W = 280, H = 72, gap = 2;
  const bw = (W - gap * (days.length - 1)) / days.length;
  const total = days.reduce((s, r) => s + r.c, 0);
  const maxIdx = days.findIndex((r) => r.c === max);
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
      <div className="flex items-baseline justify-between gap-2 mb-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{title}</h3>
        <span className="text-xs text-on-surface-variant">{total} in 14 days</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" role="img" aria-label={`${title}, last 14 days`}>
        <line x1="0" y1={H + 0.5} x2={W} y2={H + 0.5} stroke="currentColor" strokeOpacity="0.15" />
        {days.map((r, i) => {
          const h = r.c === 0 ? 2 : Math.max(3, (r.c / max) * (H - 8));
          const x = i * (bw + gap);
          const label = i === maxIdx && r.c > 0 ? String(r.c) : i === days.length - 1 && r.c > 0 && i !== maxIdx ? String(r.c) : null;
          return (
            <g key={r.d}>
              <rect x={x} y={H - h} width={bw} height={h} rx="3" className="text-primary" fill="currentColor" fillOpacity={r.c === 0 ? 0.18 : 0.9}>
                <title>{`${r.d}: ${r.c}`}</title>
              </rect>
              {label && (
                <text x={x + bw / 2} y={Math.max(9, H - h - 4)} textAnchor="middle" className="text-on-surface-variant" fill="currentColor" fontSize="9">{label}</text>
              )}
            </g>
          );
        })}
        <text x="0" y={H + 11} fontSize="8" className="text-on-surface-variant" fill="currentColor">{days[0].d.slice(5)}</text>
        <text x={W} y={H + 11} fontSize="8" textAnchor="end" className="text-on-surface-variant" fill="currentColor">today</text>
      </svg>
    </div>
  );
}

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-on-surface tabular-nums">{value}</p>
      {sub && <p className="text-xs text-on-surface-variant">{sub}</p>}
    </div>
  );
}

// Label + count rows with proportional bars — identity lives in the row
// label, so a single hue is enough.
function BarList({ title, entries }) {
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary mb-3">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-on-surface-variant">No data yet.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([label, n]) => (
            <div key={label} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-semibold text-on-surface truncate">{label}</span>
              <div className="h-2.5 flex-1 rounded-full bg-surface-container-low overflow-hidden">
                <div className="h-full rounded-full bg-primary/80" style={{ width: `${(n / max) * 100}%` }} />
              </div>
              <span className="w-10 shrink-0 text-right text-xs tabular-nums text-on-surface-variant">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const fmtWhen = (iso) => (iso ? iso.replace('T', ' ').slice(0, 16) : '—');

export default function Admin() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | denied | error | ready

  const load = async () => {
    setStatus('loading');
    try {
      const res = await fetch('/api/admin/overview');
      if (res.status === 401 || res.status === 403 || res.status === 404) { setStatus('denied'); return; }
      if (!res.ok) throw new Error();
      setData(await res.json());
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };
  useEffect(() => { Promise.resolve().then(load); }, []);

  useDocumentHead({ title: 'Ops overview', noindex: true });

  const t = data?.totals;
  return (
    <div className="flex min-h-dvh bg-surface">
      <MobileHeader />
      <SideNav />
      <main id="main-content" tabIndex={-1} className="flex-1 px-5 pt-20 pb-28 md:pt-10 sm:px-6 md:px-10 md:pb-10 lg:px-16 outline-none">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-2">Admin</p>
              <h1 className="font-display display-wonk text-[1.9rem] font-bold text-on-surface leading-tight">Ops overview.</h1>
            </div>
            {status === 'ready' && (
              <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant/30 px-4 py-2 text-xs font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
                <RefreshCw size={13} /> Refresh
              </button>
            )}
          </div>

          {status === 'loading' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}
            </div>
          )}

          {status === 'denied' && (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center">
              <p className="text-on-surface font-semibold mb-1">This page isn't available.</p>
              <p className="text-sm text-on-surface-variant mb-4">You need an admin account to view operations data.</p>
              <Link to="/" className="text-sm font-semibold text-primary hover:underline">Back to home</Link>
            </div>
          )}

          {status === 'error' && (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 p-8 text-center">
              <p className="text-on-surface-variant mb-4">Couldn't load the overview.</p>
              <button onClick={load} className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Try again</button>
            </div>
          )}

          {status === 'ready' && t && (
            <div className="space-y-6">
              {/* Health strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl border border-outline-variant/20 bg-surface-container-lowest px-5 py-3 text-xs text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5 font-semibold text-secondary"><Activity size={13} /> {data.health.env} · {data.health.driver}</span>
                <span>v{data.health.version} · node {data.health.node}</span>
                <span>up {Math.floor(data.health.uptimeSec / 3600)}h {Math.floor((data.health.uptimeSec % 3600) / 60)}m</span>
                <span>rss {data.health.rssMb} MB · heap {data.health.heapMb} MB</span>
                <span className="ml-auto">as of {fmtWhen(data.health.generatedAt)}</span>
              </div>

              {/* Core totals */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Tile label="Users" value={t.users} sub={`${t.verifiedUsers} verified · ${t.activeSessions} active sessions`} />
                <Tile label="Patterns" value={t.patterns} sub={`${t.publishedPatterns} published · ${t.verifiedPatterns} verified ✓`} />
                <Tile label="Designs" value={t.designs} sub={`${t.progressProjects} projects in tracker`} />
                <Tile label="Community" value={t.stars} sub={`stars · ${t.comments} comments · ${t.collections} collections`} />
              </div>

              {/* Trends — small multiples, one measure each */}
              <div className="grid gap-4 md:grid-cols-2">
                <DayBars title="Signups / day" rows={data.daily.signups} />
                <DayBars title="Patterns published / day" rows={data.daily.published} />
              </div>

              {/* Mix */}
              <div className="grid gap-4 md:grid-cols-2">
                <BarList title={`AI usage — ${data.month}`} entries={Object.entries(data.aiMonth).sort((a, b) => b[1] - a[1])} />
                <BarList title="Plan mix" entries={Object.entries(data.plans).sort((a, b) => b[1] - a[1])} />
              </div>

              {/* Moderation */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                <div className="mb-3 flex items-center gap-2">
                  {t.openReports > 0
                    ? <AlertTriangle size={15} className="text-error" />
                    : <ShieldCheck size={15} className="text-secondary" />}
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Open reports ({t.openReports})</h3>
                </div>
                {data.openReports.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">Nothing flagged. All clear.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-on-surface-variant">
                          <th className="pb-2 pr-4 font-semibold">When</th>
                          <th className="pb-2 pr-4 font-semibold">Type</th>
                          <th className="pb-2 pr-4 font-semibold">Reason</th>
                          <th className="pb-2 font-semibold">Detail</th>
                        </tr>
                      </thead>
                      <tbody className="text-on-surface">
                        {data.openReports.map((r) => (
                          <tr key={r.id} className="border-t border-outline-variant/15">
                            <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{fmtWhen(r.createdAt)}</td>
                            <td className="py-2 pr-4">{r.resourceType} · {String(r.resourceId).slice(0, 8)}</td>
                            <td className="py-2 pr-4 font-semibold">{r.reason}</td>
                            <td className="py-2 max-w-[280px] truncate">{r.detail || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Audit trail */}
              <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-5">
                <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.12em] text-primary">Recent audit log</h3>
                {data.recentAudit.length === 0 ? (
                  <p className="text-xs text-on-surface-variant">No audited actions yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="text-on-surface-variant">
                          <th className="pb-2 pr-4 font-semibold">When</th>
                          <th className="pb-2 pr-4 font-semibold">Action</th>
                          <th className="pb-2 pr-4 font-semibold">Resource</th>
                          <th className="pb-2 font-semibold">Actor</th>
                        </tr>
                      </thead>
                      <tbody className="text-on-surface">
                        {data.recentAudit.map((a, i) => (
                          <tr key={i} className="border-t border-outline-variant/15">
                            <td className="py-2 pr-4 whitespace-nowrap tabular-nums">{fmtWhen(a.createdAt)}</td>
                            <td className="py-2 pr-4 font-semibold">{a.action}</td>
                            <td className="py-2 pr-4">{a.resource ? `${a.resource} · ${String(a.resourceId || '').slice(0, 8)}` : '—'}</td>
                            <td className="py-2">{a.actorId ? String(a.actorId).slice(0, 8) : 'system'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
