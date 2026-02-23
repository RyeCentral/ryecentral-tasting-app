/**
 * AuthContext — Manages Shopify customer authentication state.
 *
 * Provides:
 *   - customer: the logged-in customer object (or null)
 *   - token: the app JWT token
 *   - loading: whether auth state is being verified
 *   - login(email, password): authenticate with credentials
 *   - loginWithShopifyToken(shopifyAccessToken): exchange Shopify token for app session
 *   - logout(): clear session
 *   - isAuthenticated: boolean shortcut
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

  const login = useCallback(async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    saveSession(data.token, data.customer);
    return data.customer;
  }, [saveSession]);

  const loginWithShopifyToken = useCallback(async (shopifyAccessToken) => {
    const res = await fetch('/api/auth/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopifyAccessToken }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Token verification failed');
    }

    saveSession(data.token, data.customer);
    return data.customer;
  }, [saveSession]);

  const logout = useCallback(() => {
    setToken(null);
    setCustomer(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = {
    customer,
    token,
    loading,
    login,
    loginWithShopifyToken,
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
