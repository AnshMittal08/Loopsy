import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        return data.user;
      }
      if (res.status === 401 || res.status === 403) {
        // The server said we're signed out — believe it.
        setUser(null);
        return null;
      }
      // 5xx etc.: keep whatever user state we already have.
      return undefined;
    } catch {
      // Network blip: don't sign the user out over a dropped request.
      return undefined;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => refreshSession());
  }, []);

  const signUp = async (payload) => {
    const data = await fetchJson('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setUser(data.user);
    return data.user;
  };

  const signIn = async (payload) => {
    const data = await fetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setUser(data.user);
    return data.user;
  };

  const signOut = async () => {
    await fetchJson('/api/auth/logout', {
      method: 'POST',
    });
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    loading,
    refreshSession,
    signUp,
    signIn,
    signOut,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
