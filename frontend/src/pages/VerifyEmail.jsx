import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ThreadSpinner } from '../components/motion/Thread';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [state, setState] = useState(token ? 'loading' : 'error'); // loading | ok | error

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => { if (!cancelled) setState(res.ok ? 'ok' : 'error'); })
      .catch(() => { if (!cancelled) setState('error'); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6 text-on-surface">
      <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-10 text-center">
        {state === 'loading' && (
          <>
            <ThreadSpinner size={48} />
            <p className="mt-5 text-sm text-on-surface-variant">Verifying your email…</p>
          </>
        )}
        {state === 'ok' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container">
              <CheckCircle2 size={26} className="text-secondary" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Email verified</h1>
            <p className="text-sm text-on-surface-variant mb-7">Thanks — your account is all set.</p>
            <Link to="/" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Start making</Link>
          </>
        )}
        {state === 'error' && (
          <>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-error-container">
              <AlertCircle size={26} className="text-error" />
            </div>
            <h1 className="font-display text-2xl font-bold mb-2">Link invalid or expired</h1>
            <p className="text-sm text-on-surface-variant mb-7">This verification link is no longer valid. Sign in to request a new one.</p>
            <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Go to account</Link>
          </>
        )}
      </div>
    </div>
  );
}
