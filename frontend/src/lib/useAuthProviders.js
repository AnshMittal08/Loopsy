import { useEffect, useState } from 'react';

// Which optional auth features this deployment supports (Google button,
// Turnstile site key). Defaults keep the UI useful while loading and when
// the endpoint is unreachable: password + magic link always exist.
const DEFAULTS = { google: false, magicLink: true, turnstileSiteKey: null };

export function useAuthProviders() {
  const [providers, setProviders] = useState(DEFAULTS);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/providers')
      .then((r) => (r.ok ? r.json() : DEFAULTS))
      .then((data) => { if (!cancelled) setProviders({ ...DEFAULTS, ...data }); })
      .catch(() => { /* keep defaults */ });
    return () => { cancelled = true; };
  }, []);
  return providers;
}
