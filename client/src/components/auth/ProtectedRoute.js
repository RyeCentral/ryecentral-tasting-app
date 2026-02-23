/**
 * ProtectedRoute — Wraps routes that require Shopify customer auth.
 * Shows LoginPage if not authenticated, loading spinner while checking.
 */

import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import LoginPage from './LoginPage';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loader}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Checking your session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return children;
}

const styles = {
  loader: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--rc-black) 0%, var(--rc-dark) 100%)',
    gap: 16,
  },
  spinner: {
    width: 36,
    height: 36,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: 'var(--rc-orange)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: 'var(--rc-gray-300)',
    fontSize: 14,
    fontFamily: 'var(--font-main)',
  },
};
