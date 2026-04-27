import React, { useState } from 'react';
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

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (fieldErrors[field]) setFieldErrors((e) => ({ ...e, [field]: null }));
  };

  const validate = () => {
    const errors = {};
    if (mode === 'signup' && !form.name.trim()) errors.name = 'Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Enter a valid email address.';
    if (form.password.length < 8) errors.password = 'Password must be at least 8 characters.';
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
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
          <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">Account</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-on-surface">Build your crochet workspace.</h1>
          <p className="mt-4 max-w-2xl text-on-surface-variant">
            Sign in to keep patterns, tracker progress, and future subscriptions tied to your account instead of the current browser session.
          </p>

          {loading ? (
            <div className="mt-10 rounded-[1.75rem] bg-surface-container-lowest p-8 shadow-sm">
              <p className="text-on-surface-variant">Loading account...</p>
            </div>
          ) : user ? (
            <div className="mt-10 rounded-[1.75rem] bg-surface-container-lowest p-8 shadow-sm">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.12em] text-primary">Signed in</p>
                  <h2 className="mt-2 text-3xl font-black text-on-surface">{user.name}</h2>
                  <p className="mt-2 text-on-surface-variant">{user.email}</p>
                </div>
                <div className="rounded-2xl bg-surface-container-low px-5 py-4">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Plan</p>
                  <p className="mt-2 text-2xl font-black text-on-surface">{user.subscription?.plan || 'free'}</p>
                  <p className="mt-1 text-sm text-on-surface-variant">Status: {user.subscription?.status || 'active'}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <Link to="/create" className="rounded-2xl bg-on-surface px-5 py-4 text-center text-sm font-bold text-white">
                  Start a project
                </Link>
                <Link to="/" className="rounded-2xl bg-surface-container-low px-5 py-4 text-center text-sm font-bold text-on-surface">
                  Explore patterns
                </Link>
                <button onClick={handleSignOut} className="rounded-2xl bg-error-container px-5 py-4 text-sm font-bold text-on-error-container">
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
              <section className="rounded-[1.75rem] bg-surface-container-lowest p-8 shadow-sm">
                <div className="flex gap-3">
                  {[
                    { id: 'signin', label: 'Sign in' },
                    { id: 'signup', label: 'Create account' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMode(item.id)}
                      className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                        mode === item.id ? 'bg-primary text-on-primary' : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                  {mode === 'signup' && (
                    <div className="block">
                      <label htmlFor="name" className="mb-2 block text-sm font-bold text-on-surface">Name</label>
                      <input
                        id="name"
                        value={form.name}
                        onChange={handleChange('name')}
                        className={`w-full rounded-2xl bg-surface-container-low px-4 py-3 outline-none ${fieldErrors.name ? 'ring-1 ring-red-400' : ''}`}
                        placeholder="Your display name"
                      />
                      {fieldErrors.name && <p className="mt-1 text-xs text-red-400">{fieldErrors.name}</p>}
                    </div>
                  )}

                  <div className="block">
                    <label htmlFor="email" className="mb-2 block text-sm font-bold text-on-surface">Email</label>
                    <input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange('email')}
                      className={`w-full rounded-2xl bg-surface-container-low px-4 py-3 outline-none ${fieldErrors.email ? 'ring-1 ring-red-400' : ''}`}
                      placeholder="maker@example.com"
                    />
                    {fieldErrors.email && <p className="mt-1 text-xs text-red-400">{fieldErrors.email}</p>}
                  </div>

                  <div className="block">
                    <label htmlFor="password" className="mb-2 block text-sm font-bold text-on-surface">Password</label>
                    <input
                      id="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange('password')}
                      className={`w-full rounded-2xl bg-surface-container-low px-4 py-3 outline-none ${fieldErrors.password ? 'ring-1 ring-red-400' : ''}`}
                      placeholder="At least 8 characters"
                    />
                    {fieldErrors.password && <p className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>}
                  </div>

                  <button
                    disabled={submitting}
                    className="w-full rounded-2xl bg-gradient-to-r from-primary to-primary-dim px-5 py-4 text-sm font-bold text-on-primary disabled:opacity-60"
                  >
                    {submitting ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
                  </button>
                </form>
              </section>

              <section className="rounded-[1.75rem] bg-surface-container-lowest p-8 shadow-sm">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">Why sign in</p>
                <div className="mt-6 space-y-4">
                  {[
                    'Keep tracker progress tied to your account instead of a shared anonymous pool.',
                    'Build a personal library of AI and template-based projects.',
                    'Prepare your workspace for subscriptions, saved items, and AI tutor history.',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl bg-surface-container-low p-4 text-sm leading-relaxed text-on-surface-variant">
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
