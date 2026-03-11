/**
 * LoginPage — Passwordless one-time code login.
 *
 * Two-step flow:
 * 1. Enter email → "Send Code" button
 * 2. Enter 6-digit code → "Verify" button → signed in
 *
 * No password needed. Works for new and existing users.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginPage() {
  const { sendCode, verifyCode, adminGrant } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [showAdminBypass, setShowAdminBypass] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const codeRefs = useRef([]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await sendCode(email.trim());
      setCodeSent(true);
      setStep('code');
      setResendTimer(60);
      // Focus first code input
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index, value) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError('');

    // Auto-advance to next input
    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        handleVerifyCode(fullCode);
      }
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...code];
      for (let i = 0; i < 6; i++) {
        newCode[i] = pasted[i] || '';
      }
      setCode(newCode);

      // Focus appropriate input
      const nextEmpty = pasted.length < 6 ? pasted.length : 5;
      codeRefs.current[nextEmpty]?.focus();

      // Auto-submit if full code pasted
      if (pasted.length === 6) {
        handleVerifyCode(pasted);
      }
    }
  };

  const handleVerifyCode = async (codeStr) => {
    const fullCode = codeStr || code.join('');
    if (fullCode.length !== 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await verifyCode(email.trim(), fullCode);
      // AuthContext handles state update → ProtectedRoute lets them through
    } catch (err) {
      setError(err.message);
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    setError('');
    setCode(['', '', '', '', '', '']);
    try {
      await sendCode(email.trim());
      setResendTimer(60);
      codeRefs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode(['', '', '', '', '', '']);
    setError('');
    setCodeSent(false);
    setShowAdminBypass(false);
    setAdminKey('');
  };

  const handleAdminGrant = async () => {
    if (!adminKey.trim()) {
      setError('Please enter the admin key.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await adminGrant(email.trim(), adminKey.trim());
      // AuthContext handles state update → ProtectedRoute lets them through
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
        </div>

        {step === 'email' && (
          <>
            <p style={styles.subtitle}>
              Enter your email to sign in or create an account.
              We'll send you a one-time login code.
            </p>

            <form onSubmit={handleSendCode} style={styles.form}>
              {error && <div style={styles.error}>{error}</div>}

              <div style={styles.field}>
                <label style={styles.label} htmlFor="email">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  placeholder="you@example.com"
                  style={styles.input}
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                style={styles.primaryBtn}
                disabled={loading || !email.trim()}
              >
                {loading ? 'Sending...' : 'Send Login Code'}
              </button>
            </form>

            <p style={styles.hint}>
              No password needed. Works for new and existing accounts.
            </p>
            <p style={styles.consent}>
              By signing in, you agree to receive occasional emails from RyeCentral.
              You can unsubscribe at any time.
            </p>
          </>
        )}

        {step === 'code' && (
          <>
            <p style={styles.subtitle}>
              We sent a 6-digit code to<br />
              <strong style={{ color: 'var(--rc-black)' }}>{email}</strong>
            </p>

            {error && <div style={styles.error}>{error}</div>}

            {!showAdminBypass && (
              <>
                {/* 6-digit code input */}
                <div style={styles.codeContainer} onPaste={handleCodePaste}>
                  {code.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (codeRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      style={{
                        ...styles.codeInput,
                        borderColor: digit ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                      }}
                      disabled={loading}
                      autoFocus={i === 0}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => handleVerifyCode()}
                  style={styles.primaryBtn}
                  disabled={loading || code.join('').length !== 6}
                >
                  {loading ? 'Verifying...' : 'Sign In'}
                </button>

                {/* Resend / change email */}
                <div style={styles.actions}>
                  <button
                    onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    style={{
                      ...styles.textBtn,
                      opacity: resendTimer > 0 ? 0.5 : 1,
                    }}
                  >
                    {resendTimer > 0
                      ? `Resend code (${resendTimer}s)`
                      : 'Resend code'}
                  </button>
                  <span style={styles.dot}>·</span>
                  <button onClick={handleBackToEmail} style={styles.textBtn}>
                    Change email
                  </button>
                </div>

                <p style={styles.hint}>
                  Check your inbox and spam folder. The code expires in 10 minutes.
                </p>
              </>
            )}

            {/* Admin bypass section */}
            {showAdminBypass && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 13, color: 'var(--rc-gray-500)', marginBottom: 12, textAlign: 'center', lineHeight: 1.4 }}>
                  Ask the event host to enter the admin key below to grant access without a code.
                </p>
                <input
                  type="password"
                  value={adminKey}
                  onChange={(e) => { setAdminKey(e.target.value); setError(''); }}
                  placeholder="Admin key"
                  style={{ ...styles.input, marginBottom: 10 }}
                  autoFocus
                  disabled={loading}
                />
                <button
                  onClick={handleAdminGrant}
                  style={{ ...styles.primaryBtn, background: 'var(--rc-gray-700)' }}
                  disabled={loading || !adminKey.trim()}
                >
                  {loading ? 'Granting access...' : 'Grant Access'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button onClick={() => { setShowAdminBypass(false); setAdminKey(''); setError(''); }} style={styles.textBtn}>
                    Back to code entry
                  </button>
                </div>
              </div>
            )}

            <div style={{ textAlign: 'center', marginTop: showAdminBypass ? 0 : 12 }}>
              {!showAdminBypass && (
                <button
                  onClick={() => { setShowAdminBypass(true); setError(''); }}
                  style={{ ...styles.textBtn, fontSize: 12, color: 'var(--rc-gray-400)' }}
                >
                  Can't receive the code?
                </button>
              )}
            </div>
          </>
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
    marginBottom: 8,
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
    fontSize: 14,
    color: 'var(--rc-gray-500)',
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 1.5,
    textAlign: 'center',
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
    padding: '12px 14px',
    border: '1.5px solid var(--rc-gray-300)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 16,
    fontFamily: 'var(--font-main)',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  primaryBtn: {
    padding: '14px',
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
  error: {
    padding: '10px 12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: 'var(--radius-sm)',
    color: '#dc2626',
    fontSize: 13,
    lineHeight: 1.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  codeContainer: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  codeInput: {
    width: 48,
    height: 56,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 700,
    fontFamily: "'Courier New', monospace",
    border: '2px solid var(--rc-gray-300)',
    borderRadius: 10,
    outline: 'none',
    transition: 'border-color 0.2s',
    caretColor: 'var(--rc-orange)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  textBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--rc-orange-dark)',
    fontSize: 13,
    cursor: 'pointer',
    textDecoration: 'underline',
    fontFamily: 'var(--font-main)',
    padding: 0,
  },
  dot: {
    color: 'var(--rc-gray-400)',
    fontSize: 13,
  },
  hint: {
    fontSize: 12,
    color: 'var(--rc-gray-400)',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 1.4,
  },
  consent: {
    fontSize: 11,
    color: 'var(--rc-gray-400)',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 1.4,
    fontStyle: 'italic',
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
