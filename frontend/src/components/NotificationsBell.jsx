import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Star, MessageCircle } from 'lucide-react';

const ICONS = { star: Star, comment: MessageCircle };

function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** Bell menu: unread badge, latest 20, opening marks everything read. */
export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch('/api/notifications');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) { setItems(data.notifications || []); setUnread(data.unread || 0); }
      } catch { /* silent — the bell is never critical */ }
    };
    load();
    const t = setInterval(load, 90000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      fetch('/api/notifications', { method: 'POST' }).catch(() => {});
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-on-primary">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-warm-xl">
          <p className="border-b border-outline-variant/15 px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-on-surface-variant">Nothing yet — publish a pattern and the stars will find you.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                const to = n.resourceType === 'pattern' && n.resourceId ? `/p/${n.resourceId}` : '/community';
                return (
                  <li key={n.id}>
                    <Link to={to} onClick={() => setOpen(false)} className={`flex items-start gap-2.5 px-4 py-3 text-xs hover:bg-surface-container-low transition-colors ${!n.readAt ? 'bg-primary/5' : ''}`}>
                      <Icon size={14} className="mt-0.5 shrink-0 text-primary" />
                      <span className="flex-1 text-on-surface leading-relaxed">{n.message}
                        <span className="block text-[10px] text-on-surface-variant">{timeAgo(n.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
