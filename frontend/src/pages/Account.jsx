import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { Lock, BookMarked, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import SideNav from '../components/SideNav';
import MobileHeader from '../components/MobileHeader';
import { Reveal } from '../components/motion/Reveal';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';
import TurnstileWidget from '../components/TurnstileWidget';
import { useAuthProviders } from '../lib/useAuthProviders';

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut, refreshSession } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState('signin');
  const providers = useAuthProviders();
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [sendingMagic, setSendingMagic] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Surface OAuth redirect outcomes (?oauth=…) once, then clean the URL.
  useEffect(() => {
    const outcome = searchParams.get('oauth');
    if (!outcome) return;
    const messages = {
      failed: ['Google sign-in didn\u2019t complete. Please try again.', 'error'],
      unavailable: ['Google sign-in isn\u2019t set up on this server yet.', 'info'],
      email_conflict: ['That Google account\u2019s email already has a Loopsy account. Sign in with your password or a sign-in link instead.', 'info'],
    };
    const [msg, kind] = messages[outcome] || messages.failed;
    Promise.resolve().then(() => showToast(msg, kind));
    const next = new URLSearchParams(searchParams);
    next.delete('oauth');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageError, setUsageError] = useState(false);
  const [resending, setResending] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [upgradingPlan, setUpgradingPlan] = useState(null);
  const [openingPortal, setOpeningPortal] = useState(false);
  const nameRef = useRef(null);
  const skillRef = useRef(null);
  const bioRef = useRef(null);

  const handleManageBilling = async () => {
    setOpeningPortal(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503 || res.status === 409) {
        showToast(data.error || 'Billing management is not available yet.', 'info');
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not open billing.');
      window.location.assign(data.url);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setOpeningPortal(false);
    }
  };

  const handleUpgrade = async (plan) => {
    setUpgradingPlan(plan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 503) {
        showToast('Upgrades are not available just yet — check back soon.', 'info');
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.assign(data.url);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', { method: 'POST' });
      if (!res.ok) throw new Error('Could not send the email. Please try again.');
      showToast('Verification email sent — check your inbox.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setResending(false);
    }
  };

  const handleSaveProfile = async () => {
    const name = nameRef.current?.value.trim();
    const skillLevel = skillRef.current?.value;
    const bio = bioRef.current?.value.trim().slice(0, 280);
    if (!name) { showToast('Name is required.', 'error'); return; }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, skillLevel, bio }) });
      if (!res.ok) throw new Error('Could not save your profile.');
      await refreshSession?.();
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const loadUsage = async () => {
    setUsageError(false);
    try {
      const res = await fetch('/api/usage');
      if (!res.ok) throw new Error('usage fetch failed');
      setUsage(await res.json());
    } catch {
      setUsageError(true);
    }
  };

  useEffect(() => {
    if (!user) return;
    Promise.resolve().then(() => loadUsage());
  }, [user]);

  const handleChange = (field) => (e) => {
    setForm((c) => ({ ...c, [field]: e.target.value }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const errors = {};
    if (mode === 'signup' && !form.name.trim()) errors.name = 'Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
    if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) { setFieldErrors(errors); return; }
    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp({ ...form, turnstileToken });
        showToast('Account created. You can start saving projects now.', 'success');
      } else {
        await signIn(form);
        showToast('Signed in successfully.', 'success');
      }
      navigate('/');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      showToast('Signed out.', 'info');
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const handleAccountDeleted = async () => {
    await refreshSession?.();
    navigate('/');
    showToast('Your account and data have been permanently deleted.', 'info');
  };

  return (
    <div className="flex min-h-dvh bg-surface">
      <MobileHeader />
      <SideNav />

      <main id="main-content" tabIndex={-1} className="flex-1 px-5 pt-20 pb-28 md:pt-10 sm:px-6 md:px-10 md:pb-10 lg:px-16 outline-none">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">Account</p>
          <h1 className="font-display display-wonk text-[1.9rem] sm:text-[2.4rem] font-bold text-on-surface leading-tight mb-2">
            Your crochet workspace.
          </h1>
          <p className="text-on-surface-variant max-w-xl mb-10">
            Sign in to keep patterns, tracker progress, and subscriptions tied to your account.
          </p>

          {loading ? (
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-8">
              <div className="h-6 w-40 rounded-lg shimmer mb-3" />
              <div className="h-4 w-60 rounded-lg shimmer" />
            </div>

          ) : user ? (
            <div className="space-y-5">
              {/* Email verification banner */}
              {!user.emailVerified && (
                <Reveal className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-tertiary/30 bg-tertiary-container/40 p-4 sm:p-5">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle size={18} className="shrink-0 text-tertiary" />
                    <p className="text-sm text-on-surface">Verify your email to secure your account and unlock everything.</p>
                  </div>
                  <button onClick={handleResend} disabled={resending} className="rounded-full bg-tertiary px-4 py-2 text-sm font-semibold text-on-tertiary transition-opacity hover:opacity-90 disabled:opacity-60">
                    {resending ? 'Sending…' : 'Resend email'}
                  </button>
                </Reveal>
              )}

              {/* Profile card */}
              <Reveal className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-4">
                    <Motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-xl font-bold shadow-warm-md"
                    >
                      {user.name.slice(0, 1).toUpperCase()}
                    </Motion.div>
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">{user.name}</h2>
                      <p className="text-sm text-on-surface-variant mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary-fixed px-5 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-on-primary-fixed">Plan</p>
                    <p className="mt-1 text-lg font-bold text-on-primary-fixed capitalize">{(user.subscription?.plan || 'free').replace('_', ' ')}</p>
                    <p className="text-xs text-on-primary-fixed-variant capitalize">{user.subscription?.status || 'active'}</p>
                    {user.subscription?.plan && user.subscription.plan !== 'free' && (
                      <button onClick={handleManageBilling} disabled={openingPortal} className="mt-2 text-xs font-semibold text-on-primary-fixed underline underline-offset-2 hover:opacity-80 disabled:opacity-60">
                        {openingPortal ? 'Opening…' : 'Manage billing'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link to="/create" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm">
                    Start a project
                  </Link>
                  <Link to="/" className="rounded-full border border-outline-variant/30 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
                    Explore patterns
                  </Link>
                  <button onClick={handleSignOut} className="rounded-full border border-error/30 px-5 py-2.5 text-sm font-semibold text-error hover:bg-error-container transition-colors">
                    Sign out
                  </button>
                </div>
              </Reveal>

              {/* Profile editor */}
              <Reveal delay={0.04} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6 md:p-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-primary mb-5">Profile</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="profile-name" className="block text-sm font-semibold mb-1.5">Name</label>
                    <input id="profile-name" ref={nameRef} defaultValue={user.name} className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="profile-bio" className="block text-sm font-semibold mb-1.5">Bio <span className="font-normal text-on-surface-variant">(shows on your public profile)</span></label>
                    <textarea id="profile-bio" ref={bioRef} defaultValue={user.bio || ''} maxLength={280} rows={2} placeholder="Tell other makers what you love to crochet…" className="w-full resize-y rounded-xl bg-surface-container-low px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25" />
                  </div>
                  <div>
                    <label htmlFor="profile-skill" className="block text-sm font-semibold mb-1.5">Skill level</label>
                    <select id="profile-skill" ref={skillRef} defaultValue={user.skillLevel || 'beginner'} className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/25">
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                </div>
                <button onClick={handleSaveProfile} disabled={savingProfile} className="mt-5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-60">
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </button>
              </Reveal>

              {/* Usage */}
              <Reveal delay={0.08} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6 md:p-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-primary mb-5">Usage this month</h3>
                {usage === null && usageError ? (
                  <div className="flex flex-col items-start gap-3 rounded-xl bg-surface-container-low p-4">
                    <p className="text-sm text-on-surface-variant">Couldn’t load your usage right now.</p>
                    <button
                      onClick={loadUsage}
                      className="rounded-full border border-outline-variant/30 px-4 py-1.5 text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
                    >
                      Try again
                    </button>
                  </div>
                ) : usage === null ? (
                  <div className="space-y-3">
                    <div className="h-16 rounded-xl shimmer" />
                    <div className="h-16 rounded-xl shimmer" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <UsageBar label="AI Generations" used={usage.used.generations} limit={usage.limits.generations} />
                    <UsageBar label="AI Tutor" used={usage.used.tutor} limit={usage.limits.tutor} />
                    {usage.vision?.mode === 'trial' ? (
                      <UsageBar label="Vision Studio (photo → pattern)" used={usage.vision.trialUsed} limit={usage.vision.trialLimit} unit="free trial" />
                    ) : (
                      <div className="rounded-xl bg-surface-container-low p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-on-surface">Vision Studio (photo → pattern)</span>
                          <span className="text-xs font-semibold text-secondary">
                            {usage.vision?.mode === 'unlimited' ? 'Unlimited' : 'Uses a generation'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Reveal>

              {/* Upgrade cards */}
              {usage && (usage.plan === 'free' || usage.plan === 'maker_pro') && (
                <Reveal delay={0.14} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-6 md:p-8">
                  <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-primary mb-5">Upgrade your plan</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    {usage.plan === 'free' && (
                      <PlanCard
                        name="Maker Pro"
                        price="$9/mo"
                        features={['30 AI generations', 'Unlimited tutor', 'Vision Studio photo \u2192 pattern']}
                        highlight={false}
                        plan="maker_pro"
                        onUpgrade={handleUpgrade}
                        busy={upgradingPlan === 'maker_pro'}
                      />
                    )}
                    <PlanCard
                      name="Creator"
                      price="$18/mo"
                      features={['Unlimited AI', 'Analytics', 'Featured placement']}
                      highlight={true}
                      plan="creator"
                      onUpgrade={handleUpgrade}
                      busy={upgradingPlan === 'creator'}
                    />
                  </div>
                </Reveal>
              )}

              {/* Danger zone: export + delete */}
              <DangerZone onDeleted={handleAccountDeleted} showToast={showToast} />
            </div>

          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              {/* Auth form */}
              <Reveal className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-7">
                <div className="flex gap-2 p-1 rounded-full bg-surface-container-low w-fit mb-7">
                  {[
                    { id: 'signin', label: 'Sign in' },
                    { id: 'signup', label: 'Create account' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMode(item.id)}
                      className={`relative rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
                        mode === item.id ? 'text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {mode === item.id && (
                        <Motion.span
                          layoutId="account-mode-pill"
                          className="absolute inset-0 rounded-full bg-primary shadow-warm"
                          transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                        />
                      )}
                      <span className="relative">{item.label}</span>
                    </button>
                  ))}
                </div>

                {providers.google && (
                  <div className="mb-5">
                    <button
                      type="button"
                      onClick={() => window.location.assign('/api/auth/google')}
                      className="flex w-full items-center justify-center gap-2.5 rounded-full border border-outline-variant/30 bg-surface px-5 py-3 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
                    >
                      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                      </svg>
                      Continue with Google
                    </button>
                    <div className="mt-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">
                      <span className="h-px flex-1 bg-outline-variant/30" />
                      or
                      <span className="h-px flex-1 bg-outline-variant/30" />
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {mode === 'signup' && (
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-on-surface mb-1.5">Name</label>
                      <input
                        id="name"
                        value={form.name}
                        onChange={handleChange('name')}
                        className={`w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 transition-all ${fieldErrors.name ? 'ring-1 ring-error' : ''}`}
                        placeholder="Your display name"
                      />
                      {fieldErrors.name && <p className="mt-1 text-xs text-error">{fieldErrors.name}</p>}
                    </div>
                  )}

                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-on-surface mb-1.5">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      className={`w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 transition-all ${fieldErrors.email ? 'ring-1 ring-error' : ''}`}
                      placeholder="maker@example.com"
                    />
                    {fieldErrors.email && <p className="mt-1 text-xs text-error">{fieldErrors.email}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-on-surface mb-1.5">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange('password')}
                      className={`w-full rounded-xl bg-surface-container-low px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/25 transition-all ${fieldErrors.password ? 'ring-1 ring-error' : ''}`}
                      placeholder="At least 8 characters"
                    />
                    {fieldErrors.password && <p className="mt-1 text-xs text-error">{fieldErrors.password}</p>}
                  </div>

                  {mode === 'signin' && (
                    <div className="flex items-center justify-between gap-3 -mt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          const email = form.email.trim().toLowerCase();
                          if (!email) { showToast('Enter your email above first.', 'info'); return; }
                          try {
                            await fetch('/api/auth/forgot-password', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email, turnstileToken }),
                            });
                            showToast('If that email has an account, a reset link is on its way.', 'success');
                          } catch {
                            showToast('Could not send a reset email. Please try again.', 'error');
                          }
                        }}
                        className="text-xs font-semibold text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                      <button
                        type="button"
                        disabled={sendingMagic}
                        onClick={async () => {
                          const email = form.email.trim().toLowerCase();
                          if (!email) { showToast('Enter your email above first.', 'info'); return; }
                          setSendingMagic(true);
                          try {
                            const res = await fetch('/api/auth/magic-link', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email, turnstileToken }),
                            });
                            const data = await res.json().catch(() => ({}));
                            if (!res.ok) throw new Error(data.error || 'Could not send the link.');
                            showToast('If that email has an account, a sign-in link is on its way.', 'success');
                          } catch (err) {
                            showToast(err.message, 'error');
                          } finally {
                            setSendingMagic(false);
                          }
                        }}
                        className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
                      >
                        {sendingMagic ? 'Sending\u2026' : 'Email me a sign-in link'}
                      </button>
                    </div>
                  )}

                  {providers.turnstileSiteKey && (
                    <TurnstileWidget siteKey={providers.turnstileSiteKey} onToken={setTurnstileToken} />
                  )}

                  <Motion.button
                    disabled={submitting}
                    whileTap={{ scale: 0.97 }}
                    className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim transition-colors shadow-warm disabled:opacity-60"
                  >
                    {submitting ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                  </Motion.button>
                </form>
              </Reveal>

              {/* Why sign in */}
              <Reveal delay={0.1} className="rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-7">
                <h3 className="font-display text-xl font-bold text-on-surface mb-5">Why sign in?</h3>
                <div className="space-y-3">
                  {[
                    { Icon: Lock, text: 'Keep tracker progress tied to your account, not an anonymous session.' },
                    { Icon: BookMarked, text: 'Build a personal library of AI-generated and template-based projects.' },
                    { Icon: Sparkles, text: 'Unlock AI tutor, subscriptions, and saved item history.' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <item.Icon size={15} className="text-primary" />
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function UsageBar({ label, used, limit, unit = 'used' }) {
  const reduceMotion = useReducedMotion();
  const isUnlimited = limit === null;
  const pct = isUnlimited ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const nearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="rounded-xl bg-surface-container-low px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-on-surface">{label}</span>
        {isUnlimited ? (
          <span className="rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">Unlimited</span>
        ) : (
          <span className={`text-xs font-medium ${nearLimit ? 'text-tertiary font-semibold' : 'text-on-surface-variant'}`}>
            {used} of {limit} {unit}
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="h-2 w-full rounded-full bg-surface-container-high overflow-hidden">
          <Motion.div
            className={`h-2 rounded-full ${nearLimit ? 'bg-tertiary' : 'bg-primary'}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 60, damping: 16, delay: 0.2 }}
          />
        </div>
      )}
    </div>
  );
}

function DangerZone({ onDeleted, showToast }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    try {
      const res = await fetch('/api/account/export');
      if (!res.ok) throw new Error('Could not export your data.');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loopsy-data.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('Your data is downloading.', 'success');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (confirm !== 'DELETE') { showToast('Type DELETE to confirm.', 'error'); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not delete your account.');
      await onDeleted();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Reveal delay={0.18} className="rounded-2xl border border-error/25 bg-error-container/20 p-6 md:p-8">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-error mb-2">Danger zone</h3>
      <p className="text-sm text-on-surface-variant mb-5">Download everything we hold about you, or permanently delete your account. Deletion removes your projects, designs, collections and progress, and takes your published patterns down. This can't be undone.</p>
      <div className="flex flex-wrap gap-3">
        <button onClick={handleExport} className="rounded-full border border-outline-variant/40 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
          Download my data
        </button>
        {!open ? (
          <button onClick={() => setOpen(true)} className="rounded-full border border-error/40 px-5 py-2.5 text-sm font-semibold text-error hover:bg-error-container/50 transition-colors">
            Delete my account
          </button>
        ) : null}
      </div>
      {open && (
        <div className="mt-5 space-y-3 rounded-xl border border-error/30 bg-surface-container-lowest p-4">
          <p className="text-sm font-semibold text-on-surface">Confirm permanent deletion</p>
          <div>
            <label htmlFor="dz-pw" className="block text-xs font-semibold mb-1">Your password</label>
            <input id="dz-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password"
              className="w-full max-w-xs rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-error/30" />
          </div>
          <div>
            <label htmlFor="dz-confirm" className="block text-xs font-semibold mb-1">Type <span className="font-mono text-error">DELETE</span> to confirm</label>
            <input id="dz-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE"
              className="w-full max-w-xs rounded-lg bg-surface-container-low px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-error/30" />
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={handleDelete} disabled={busy || confirm !== 'DELETE' || !password}
              className="rounded-full bg-error px-5 py-2 text-sm font-semibold text-on-error hover:opacity-90 transition-opacity disabled:opacity-50">
              {busy ? 'Deleting…' : 'Permanently delete'}
            </button>
            <button onClick={() => { setOpen(false); setPassword(''); setConfirm(''); }} className="rounded-full border border-outline-variant/30 px-5 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </Reveal>
  );
}

function PlanCard({ name, price, features, highlight, plan, onUpgrade, busy }) {
  return (
    <div className={`rounded-xl px-5 py-5 border glow-lift ${highlight ? 'border-primary/30 bg-primary-fixed' : 'border-outline-variant/20 bg-surface-container-low'}`}>
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-bold text-on-surface">{name}</p>
        <p className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-on-surface-variant'}`}>{price}</p>
      </div>
      <ul className="space-y-1.5 mb-4">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
            <CheckCircle2 size={14} className="text-secondary shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onUpgrade?.(plan)}
        disabled={busy}
        className={`w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
          highlight ? 'bg-primary text-on-primary hover:bg-primary-dim shadow-warm' : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
        }`}
      >
        {busy ? 'Starting checkout…' : `Upgrade to ${name}`}
      </button>
    </div>
  );
}
