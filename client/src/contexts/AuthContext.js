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
import { safeLocal } from '../services/safeStorage';
import { fetchWithTimeout } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY = 'rc_tasting_auth';

/** Read a JWT's payload without verifying it (display/expiry only). */
function decodeToken(token) {
  try {
    const part = token.split('.')[1];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded).split('').map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [customer, setCustomer] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, check for existing session
  useEffect(() => {
    let savedToken = null;
    try {
      const stored = safeLocal.getItem(STORAGE_KEY);
      savedToken = stored ? JSON.parse(stored).token : null;
    } catch {
      safeLocal.removeItem(STORAGE_KEY);
    }
    if (!savedToken) {
      setLoading(false);
      return;
    }

    const claims = decodeToken(savedToken);
    if (!claims || (claims.exp && claims.exp * 1000 < Date.now())) {
      safeLocal.removeItem(STORAGE_KEY);
      setLoading(false);
      return;
    }

    fetchWithTimeout('/api/auth/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: savedToken }),
    }, 10000)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setToken(savedToken);
          setCustomer(data.customer);
        } else {
          safeLocal.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {
        // Network hiccup / slow server (common on phones): don't throw the
        // user's session away. The token is unexpired, so let them in on its
        // own claims — the server still verifies it on every API call.
        setToken(savedToken);
        setCustomer({
          email: claims.email,
          firstName: claims.firstName || (claims.email || '').split('@')[0],
          displayName: claims.displayName || (claims.email || '').split('@')[0],
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback((newToken, newCustomer) => {
    setToken(newToken);
    setCustomer(newCustomer);
    safeLocal.setItem(STORAGE_KEY, JSON.stringify({ token: newToken }));
  }, []);

  /**
   * Request a one-time code be sent to the given email.
   */
  const sendCode = useCallback(async (email) => {
    const res = await fetchWithTimeout('/api/auth/send-code', {
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
    const res = await fetchWithTimeout('/api/auth/verify-code', {
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
    const res = await fetchWithTimeout('/api/auth/admin-grant', {
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
    safeLocal.removeItem(STORAGE_KEY);
  }, []);

  // SSO login — auto-authenticate users already logged into RyeCentral.com
  const ssoLogin = async (email, ts, sig) => {
    try {
      setLoading(true);
      const res = await fetchWithTimeout('/api/auth/sso-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, ts, sig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'SSO login failed');
      saveSession(data.token, { email: data.email, firstName: data.email.split('@')[0], displayName: data.email.split('@')[0] });
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
