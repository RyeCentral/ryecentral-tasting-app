/**
 * LoginPage — Shopify customer account login for the tasting app.
 *
 * Supports two flows:
 *   1. Email + password (classic Shopify accounts)
 *   2. Link to Shopify account login (passwordless / Shop app)
 *
 * Styled to match the RyeCentral brand.
 */

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const SHOPIFY_ACCOUNT_URL = 'https://shopify.com/73079357688/account';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'info'

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email.trim(), password.trim());
      // AuthContext handles redirect via isAuthenticated change
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        {/* Logo / Header */}
        <div style={styles.header}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>🥃</span>
            <span style={styles.logoText}>RyeCentral</span>
          </div>
          <h1 style={styles.title}>Home Tasting Event</h1>
          <p style={styles.subtitle}>
            Sign in with your RyeCentral account to host or join a blind tasting.
          </p>
        </div>

        {mode === 'login' && (
          <>
            {/* Login Form */}
            <form onSubmit={handleLogin} style={styles.form}>
              {error && (
                <div style={styles.error}>
                  {error}
                </div>
              )}

              <div style={styles.field}>
                <label style={styles.label} htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={styles.input}
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div style={styles.field}>
                <label style={styles.label} htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your account password"
                  style={styles.input}
                  autoComplete="current-password"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                style={styles.loginBtn}
                disabled={loading}
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div style={styles.divider}>
              <span style={styles.dividerLine} />
              <span style={styles.dividerText}>or</span>
              <span style={styles.dividerLine} />
            </div>

            {/* Shopify Account Login (passwordless) */}
            <a
              href={SHOPIFY_ACCOUNT_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.shopifyBtn}
            >
              Sign in via Shopify Account
            </a>

            {/* Help text */}
            <div style={styles.helpSection}>
              <button
                onClick={() => setMode('info')}
                style={styles.helpLink}
              >
                Don't have a RyeCentral account?
              </button>
            </div>
          </>
        )}

        {mode === 'info' && (
          <div style={styles.infoSection}>
            <h3 style={styles.infoTitle}>Create Your Free Account</h3>
            <p style={styles.infoText}>
              To use the Home Tasting Event app, you need a free RyeCentral customer account.
              Creating one takes just a few seconds.
            </p>

            <ol style={styles.steps}>
              <li style={styles.step}>
                <strong>Visit</strong>{' '}
                <a
                  href={SHOPIFY_ACCOUNT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  RyeCentral Account Page
                </a>
              </li>
              <li style={styles.step}>
                Enter your email address
              </li>
              <li style={styles.step}>
                Check your email for a one-time login code
              </li>
              <li style={styles.step}>
                Once logged in, come back here and sign in
              </li>
            </ol>

            <p style={styles.infoNote}>
              RyeCentral uses Shopify's passwordless login. You'll receive a
              one-time code by email each time you sign in — no password needed
              if you use the Shopify Account option above.
            </p>

            <button
              onClick={() => setMode('login')}
              style={styles.backBtn}
            >
              Back to Sign In
            </button>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <a
            href="https://www.ryecentral.com"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.footerLink}
          >
            ryecentral.com
          </a>
        </div>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--rc-black) 0%, var(--rc-dark) 100%)',
    padding: 'var(--space-md)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: 'var(--rc-white)',
    borderRadius: 'var(--radius-lg)',
    boxShadow: 'var(--shadow-lg)',
    padding: 'var(--space-xl)',
    overflow: 'hidden',
  },
  header: {
    textAlign: 'center',
    marginBottom: 'var(--space-lg)',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 'var(--space-sm)',
  },
  logoIcon: {
    fontSize: 28,
  },
  logoText: {
    fontFamily: 'var(--font-heading)',
    fontSize: 22,
    fontWeight: 'bold',
    color: 'var(--rc-black)',
    letterSpacing: 1,
  },
  title: {
    fontFamily: 'var(--font-heading)',
    fontSize: 18,
    color: 'var(--rc-gray-700)',
    fontWeight: 'normal',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 13,
    color: 'var(--rc-gray-500)',
    marginTop: 8,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--rc-gray-700)',
  },
  input: {
    padding: '10px 12px',
    border: '1.5px solid var(--rc-gray-300)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 15,
    fontFamily: 'var(--font-main)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  loginBtn: {
    padding: '12px',
    background: 'var(--rc-orange)',
    color: 'var(--rc-white)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--font-main)',
    marginTop: 4,
    transition: 'background 0.2s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    margin: '20px 0',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: 'var(--rc-gray-300)',
  },
  dividerText: {
    fontSize: 12,
    color: 'var(--rc-gray-500)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shopifyBtn: {
    display: 'block',
    textAlign: 'center',
    padding: '12px',
    background: 'var(--rc-black)',
    color: 'var(--rc-white)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontWeight: 600,
    textDecoration: 'none',
    fontFamily: 'var(--font-main)',
    transition: 'opacity 0.2s',
  },
  error: {
    padding: '10px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-sm)',
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 1.4,
  },
  helpSection: {
    textAlign: 'center',
    marginTop: 'var(--space-md)',
  },
  helpLink: {
    background: 'none',
    border: 'none',
    color: 'var(--rc-orange-dark)',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'var(--font-main)',
  },
  infoSection: {
    padding: '4px 0',
  },
  infoTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: 18,
    color: 'var(--rc-black)',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'var(--rc-gray-700)',
    lineHeight: 1.6,
    marginBottom: 16,
  },
  steps: {
    listStyle: 'decimal',
    paddingLeft: 20,
    margin: '16px 0',
  },
  step: {
    fontSize: 14,
    color: 'var(--rc-gray-700)',
    lineHeight: 1.8,
  },
  link: {
    color: 'var(--rc-orange-dark)',
    fontWeight: 600,
  },
  infoNote: {
    fontSize: 12,
    color: 'var(--rc-gray-500)',
    lineHeight: 1.5,
    marginTop: 16,
    padding: '10px 12px',
    background: 'var(--rc-gray-100)',
    borderRadius: 'var(--radius-sm)',
  },
  backBtn: {
    display: 'block',
    width: '100%',
    padding: '10px',
    marginTop: 16,
    background: 'var(--rc-gray-100)',
    color: 'var(--rc-gray-700)',
    border: '1px solid var(--rc-gray-300)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: 'var(--font-main)',
  },
  footer: {
    textAlign: 'center',
    marginTop: 'var(--space-lg)',
    paddingTop: 'var(--space-md)',
    borderTop: '1px solid var(--rc-gray-100)',
  },
  footerLink: {
    fontSize: 12,
    color: 'var(--rc-gray-500)',
    textDecoration: 'none',
  },
};
