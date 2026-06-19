import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not reset your password.');
      setDone(true);
      setTimeout(() => navigate('/account'), 1600);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const card = 'w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-8 sm:p-10';

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-6 text-on-surface">
      {!token ? (
        <div className={`${card} text-center`}>
          <h1 className="font-display text-2xl font-bold mb-2">Reset link missing</h1>
          <p className="text-sm text-on-surface-variant mb-7">Open the link from your password-reset email to continue.</p>
          <Link to="/account" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors">Go to account</Link>
        </div>
      ) : done ? (
        <div className={`${card} text-center`}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary-container">
            <CheckCircle2 size={26} className="text-secondary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2">Password updated</h1>
          <p className="text-sm text-on-surface-variant">Taking you to sign in…</p>
        </div>
      ) : (
        <div className={card}>
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Lock size={24} className="text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold mb-2 text-center">Choose a new password</h1>
          <p className="text-sm text-on-surface-variant mb-7 text-center">Enter a new password for your Loopsy account.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="new-password" className="block text-sm font-semibold mb-1.5">New password</label>
              <input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold mb-1.5">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 transition-all"
              />
            </div>
            {error && <p className="text-xs text-error">{error}</p>}
            <button
              disabled={busy}
              className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-60"
            >
              {busy ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
