/**
 * AuthContext — Manages passwordless authentication state.
 *
 * Provides:
 *  - customer: the logged-in user object (or null)
 *  - token: the app JWT token
 *  - loading: whether auth state is being verified
 *  - sendCode(email): request a one-time login code
 *  - verifyCode(email, code): verify code and sign in
 *  - adminGrant(email, adminKey): admin bypass without code
 * - ssoLogin(email): SSO login for RyeCentral.com users
 *  - logout(): clear session
 *  - isAuthenticated: boolean shortcut
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'rc_tasting_auth';

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for existing session
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { token: savedToken } = JSON.parse(stored);
        if (savedToken) {
          // Validate token with server
          fetch('/api/auth/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: savedToken }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.valid) {
                setToken(savedToken);
                setCustomer(data.customer);
              } else {
                localStorage.removeItem(STORAGE_KEY);
              }
            })
            .catch(() => {
              localStorage.removeItem(STORAGE_KEY);
            })
            .finally(() => setLoading(false));
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const saveSession = useCallback((newToken, newCustomer) => {
    setToken(newToken);
    setCustomer(newCustomer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: newToken }));
  }, []);

  /**
   * Request a one-time code be sent to the given email.
   */
  const sendCode = useCallback(async (email) => {
    const res = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send code');
    }
    return data;
  }, []);

  /**
   * Verify a one-time code and sign in.
   */
  const verifyCode = useCallback(async (email, code) => {
    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed');
    }
    saveSession(data.token, data.customer);
    return data.customer;
  }, [saveSession]);

  /**
   * Admin bypass: issue a JWT without requiring a code.
   */
  const adminGrant = useCallback(async (email, adminKey) => {
    const res = await fetch('/api/auth/admin-grant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, adminKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Admin grant failed');
    }
    saveSession(data.token, data.customer);
    return data.customer;
  }, [saveSession]);

  const logout = useCallback(() => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // SSO login — auto-authenticate users already logged into RyeCentral.com
  const ssoLogin = async (email) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/sso-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SSO login failed');
      localStorage.setItem('tasting_token', data.token);
      localStorage.setItem('tasting_email', data.email);
      setToken(data.token);
      setCustomer({ email: data.email });
      return true;
    } catch (err) {
      console.error('SSO login error:', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };


  const value = {
    customer,
    token,
    loading,
    sendCode,
    verifyCode,
    adminGrant,
    ssoLogin,
    logout,
    isAuthenticated: !!customer,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
