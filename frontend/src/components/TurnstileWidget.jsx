import React, { useEffect, useRef } from 'react';

// Cloudflare Turnstile widget. Rendered only when the deployment serves a
// site key (via /api/auth/providers), so dev and keyless installs never load
// third-party script. The script is injected once and shared across widgets.

let scriptPromise = null;
function loadTurnstileScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const el = document.createElement('script');
      el.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      el.async = true;
      el.onload = resolve;
      el.onerror = () => { scriptPromise = null; reject(new Error('turnstile load failed')); };
      document.head.appendChild(el);
    });
  }
  return scriptPromise;
}

/**
 * @param {{ siteKey: string, onToken: (token: string|null) => void }} props
 * onToken fires with the fresh token, and with null when it expires.
 */
export default function TurnstileWidget({ siteKey, onToken }) {
  const holderRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);
  useEffect(() => { onTokenRef.current = onToken; });

  useEffect(() => {
    if (!siteKey) return undefined;
    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !holderRef.current || widgetIdRef.current !== null) return;
        widgetIdRef.current = window.turnstile.render(holderRef.current, {
          sitekey: siteKey,
          callback: (token) => onTokenRef.current?.(token),
          'expired-callback': () => onTokenRef.current?.(null),
          'error-callback': () => onTokenRef.current?.(null),
          theme: 'auto',
        });
      })
      .catch(() => { /* widget stays empty; the server rejects without a token */ });
    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* already gone */ }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={holderRef} className="min-h-[65px]" />;
}
