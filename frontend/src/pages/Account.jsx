import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion as Motion, useReducedMotion } from 'motion/react';
import { Lock, BookMarked, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import SideNav from '../components/SideNav';
import { Reveal } from '../components/motion/Reveal';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut, refreshSession } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [usage, setUsage] = useState(null);
  const [resending, setResending] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const nameRef = useRef(null);
  const skillRef = useRef(null);

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
    if (!name) { showToast('Name is required.', 'error'); return; }
    setSavingProfile(true);
    try {
      const res = await fetch('/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, skillLevel }) });
      if (!res.ok) throw new Error('Could not save your profile.');
      await refreshSession?.();
      showToast('Profile updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetch('/api/usage').then((r) => r.json()).then(setUsage).catch(() => {});
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
        await signUp(form);
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

  return (
    <div className="flex min-h-dvh bg-surface">
      <SideNav />

      <main id="main-content" tabIndex={-1} className="flex-1 px-5 py-10 pb-28 sm:px-6 md:px-10 md:pb-10 lg:px-16 outline-none">
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
                    <p className="mt-1 text-lg font-bold text-on-primary-fixed capitalize">{user.subscription?.plan || 'free'}</p>
                    <p className="text-xs text-on-primary-fixed-variant capitalize">{user.subscription?.status || 'active'}</p>
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
                {usage === null ? (
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
                        features={['30 AI generations', 'Unlimited tutor', 'PDF export']}
                        highlight={false}
                      />
                    )}
                    <PlanCard
                      name="Creator"
                      price="$18/mo"
                      features={['Unlimited AI', 'Analytics', 'Featured placement']}
                      highlight={true}
                    />
                  </div>
                </Reveal>
              )}
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
                    <div className="flex justify-end -mt-1">
                      <button
                        type="button"
                        onClick={async () => {
                          const email = form.email.trim().toLowerCase();
                          if (!email) { showToast('Enter your email above first.', 'info'); return; }
                          try {
                            await fetch('/api/auth/forgot-password', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ email }),
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
                    </div>
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

function PlanCard({ name, price, features, highlight }) {
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
      <button disabled className="w-full rounded-full bg-surface-container px-4 py-2.5 text-sm font-semibold text-on-surface-variant opacity-60 cursor-not-allowed">
        Upgrade (coming soon)
      </button>
    </div>
  );
}
