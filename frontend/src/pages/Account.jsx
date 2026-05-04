import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import SideNav from '../components/SideNav';
import { useAuth } from '../components/AuthProvider';
import { useToast } from '../components/Toast';

export default function Account() {
  const navigate = useNavigate();
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const { showToast } = useToast();
  const [mode, setMode] = useState('signin');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [usage, setUsage] = useState(null);

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
    <div className="flex min-h-screen bg-surface">
      <SideNav />

      <main className="flex-1 px-6 py-10 md:px-10 lg:px-16">
        <div className="mx-auto max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary mb-3">Account</p>
          <h1 className="font-display text-[2.4rem] font-bold text-on-surface leading-tight mb-2">
            Your crochet workspace.
          </h1>
          <p className="text-on-surface-variant max-w-xl mb-10">
            Sign in to keep patterns, tracker progress, and subscriptions tied to your account.
          </p>

          {loading ? (
            <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-8 animate-pulse">
              <div className="h-6 w-40 rounded-lg bg-surface-container-high mb-3" />
              <div className="h-4 w-60 rounded-lg bg-surface-container-high" />
            </div>

          ) : user ? (
            <div className="space-y-5">
              {/* Profile card */}
              <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-6 md:p-8">
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary text-xl font-bold shadow-warm-md">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">{user.name}</h2>
                      <p className="text-sm text-on-surface-variant mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-primary-fixed px-5 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-on-primary-container">Plan</p>
                    <p className="mt-1 text-lg font-bold text-on-primary-container capitalize">{user.subscription?.plan || 'free'}</p>
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
              </div>

              {/* Usage */}
              <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-6 md:p-8">
                <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-primary mb-5">Usage this month</h3>
                {usage === null ? (
                  <div className="space-y-3">
                    <div className="h-16 rounded-xl bg-surface-container-low animate-pulse" />
                    <div className="h-16 rounded-xl bg-surface-container-low animate-pulse" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <UsageBar label="AI Generations" used={usage.used.generations} limit={usage.limits.generations} />
                    <UsageBar label="AI Tutor" used={usage.used.tutor} limit={usage.limits.tutor} />
                  </div>
                )}
              </div>

              {/* Upgrade cards */}
              {usage && (usage.plan === 'free' || usage.plan === 'maker_pro') && (
                <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-6 md:p-8">
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
                </div>
              )}
            </div>

          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              {/* Auth form */}
              <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-7">
                <div className="flex gap-2 p-1 rounded-full bg-surface-container-low w-fit mb-7">
                  {[
                    { id: 'signin', label: 'Sign in' },
                    { id: 'signup', label: 'Create account' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMode(item.id)}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                        mode === item.id
                          ? 'bg-primary text-on-primary shadow-warm'
                          : 'text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {item.label}
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

                  <button
                    disabled={submitting}
                    className="w-full rounded-full bg-primary px-5 py-3 text-sm font-semibold text-on-primary hover:bg-primary-dim active:scale-95 transition-all shadow-warm disabled:opacity-60"
                  >
                    {submitting ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
                  </button>
                </form>
              </div>

              {/* Why sign in */}
              <div className="rounded-2xl bg-white border border-outline-variant/20 shadow-warm p-7">
                <h3 className="font-display text-xl font-bold text-on-surface mb-5">Why sign in?</h3>
                <div className="space-y-3">
                  {[
                    { icon: 'lock', text: 'Keep tracker progress tied to your account, not an anonymous session.' },
                    { icon: 'collections_bookmark', text: 'Build a personal library of AI-generated and template-based projects.' },
                    { icon: 'auto_awesome', text: 'Unlock AI tutor, subscriptions, and saved item history.' },
                  ].map((item) => (
                    <div key={item.icon} className="flex items-start gap-3 rounded-xl bg-surface-container-low p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <span className="material-symbols-outlined text-primary text-[16px]">{item.icon}</span>
                      </div>
                      <p className="text-sm text-on-surface-variant leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function UsageBar({ label, used, limit }) {
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
            {used} of {limit} used
          </span>
        )}
      </div>
      {!isUnlimited && (
        <div className="h-2 w-full rounded-full bg-surface-container-high">
          <div
            className={`h-2 rounded-full transition-all ${nearLimit ? 'bg-tertiary' : 'bg-primary'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function PlanCard({ name, price, features, highlight }) {
  return (
    <div className={`rounded-xl px-5 py-5 border ${highlight ? 'border-primary/30 bg-primary-fixed' : 'border-outline-variant/20 bg-surface-container-low'}`}>
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-bold text-on-surface">{name}</p>
        <p className={`text-sm font-bold ${highlight ? 'text-primary' : 'text-on-surface-variant'}`}>{price}</p>
      </div>
      <ul className="space-y-1.5 mb-4">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-secondary">check_circle</span>
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
