import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { ThreadSpinner } from '../components/motion/Thread';
import { useAuth } from '../components/AuthProvider';

/**
 * Landing page for the emailed passwordless sign-in link
 * (/magic-login?token=…). Consumes the single-use token, refreshes the auth
 * context, and sends the maker home.
 */
export default function MagicLogin() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const { refreshSession } = useAuth();
  const [state, setState] = useState(token ? 'loading' : 'error'); // loading | ok | error

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/magic-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        if (!res.ok) { setState('error'); return; }
        await refreshSession?.();
        setState('ok');
        setTimeout(() => { if (!cancelled) navigate('/'); }, 1200);
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6 text-on-surface">
      <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
        {state === 'loading' && (
          <>
            <ThreadSpinner size={48} />
            <p className="mt-5 text-sm text-on-surface-variant">Signing you in…</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container">
              <CheckCircle2 size={26} className="text-secondary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">You're in</h1>
            <p className="text-sm text-on-surface-variant">Taking you to your workspace…</p>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
              <AlertCircle size={26} className="text-error" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Link invalid or expired</h1>
            <p className="text-sm text-on-surface-variant mb-7">Sign-in links work once and expire after 15 minutes. Request a fresh one from the sign-in page.</p>
            <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Back to sign in</Link>
          </>
        )}
      </div>
    </div>
  );
}
