/**
 * Authentication Service — Passwordless one-time code login
 *
 * Flow:
 *   1. User enters email → POST /api/auth/send-code
 *   2. Server generates 6-digit code, stores in memory (10 min expiry), emails it
 *   3. User enters code → POST /api/auth/verify-code
 *   4. Server verifies code, issues JWT for the tasting app session
 *
 * Email is sent via Resend API (just needs RESEND_API_KEY env var).
 * Falls back to nodemailer SMTP if configured, or console logging.
 * JWT is signed with HMAC-SHA256 (no external dependency).
 */

const crypto = require('crypto');
const config = require('../config/env');

// ── In-memory code store ──────────────────────────────────
// Map<email, { code, expiresAt, attempts }>
const codeStore = new Map();

const CODE_LENGTH = 6;
const CODE_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_SECONDS = 60; // Min time between code sends

// Track last send time to prevent spam
const lastSendTime = new Map();

/**
 * Generate a random 6-digit numeric code.
 */
function generateCode() {
    return crypto.randomInt(100000, 999999).toString();
}

/**
 * Store a code for the given email.
 */
function storeCode(email, code) {
    const normalizedEmail = email.toLowerCase().trim();
    codeStore.set(normalizedEmail, {
          code,
          expiresAt: Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000,
          attempts: 0,
    });
    lastSendTime.set(normalizedEmail, Date.now());
}

/**
 * Verify a code for the given email.
 * Returns true if valid, throws on error.
 */
function verifyCode(email, code) {
    const normalizedEmail = email.toLowerCase().trim();
    const entry = codeStore.get(normalizedEmail);

  if (!entry) {
        throw new Error('No code found for this email. Please request a new one.');
  }

  if (Date.now() > entry.expiresAt) {
        codeStore.delete(normalizedEmail);
        throw new Error('Code has expired. Please request a new one.');
  }

  entry.attempts++;
    if (entry.attempts > MAX_ATTEMPTS) {
          codeStore.delete(normalizedEmail);
          throw new Error('Too many attempts. Please request a new code.');
    }

  if (entry.code !== code.trim()) {
        throw new Error(`Invalid code. ${MAX_ATTEMPTS - entry.attempts} attempts remaining.`);
  }

  // Code is valid — clean up
  codeStore.delete(normalizedEmail);
    lastSendTime.delete(normalizedEmail);
    return true;
}

/**
 * Check if we can send a new code (rate limiting).
 */
function canSendCode(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const lastSent = lastSendTime.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < RATE_LIMIT_SECONDS * 1000) {
          const waitSeconds = Math.ceil((RATE_LIMIT_SECONDS * 1000 - (Date.now() - lastSent)) / 1000);
          return { allowed: false, waitSeconds };
    }
    return { allowed: true };
}

// ── Email sending via Resend API ──────────────────────────

/**
 * Send the one-time code via email using Resend REST API.
 * Only requires RESEND_API_KEY env var.
 */
async function sendCodeEmail(email, code) {
    const apiKey = config.RESEND_API_KEY;

  if (!apiKey) {
        // Fallback: log to console (dev mode)
      console.log(`\n🔐 LOGIN CODE for ${email}: ${code}\n`);
        return true;
  }

  const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 28px;">🥃</span>
                            <span style="font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #1a1a1a; margin-left: 6px;">RyeCentral</span>
                                  </div>
                                        <h2 style="text-align: center; font-size: 20px; color: #1a1a1a; margin-bottom: 8px;">Your Login Code</h2>
                                              <p style="text-align: center; color: #666; font-size: 14px; margin-bottom: 24px;">
                                                      Enter this code in the Home Tasting Event app to sign in.
                                                            </p>
                                                                  <div style="text-align: center; padding: 20px; background: #f8f8f8; border-radius: 12px; margin-bottom: 24px;">
                                                                          <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #e8860c;">
                                                                                    ${code}
                                                                                            </span>
                                                                                                  </div>
                                                                                                        <p style="text-align: center; color: #999; font-size: 12px;">
                                                                                                                This code expires in ${CODE_EXPIRY_MINUTES} minutes. If you didn't request this, you can safely ignore it.
                                                                                                                      </p>
                                                                                                                          </div>
                                                                                                                            `;

  const fromEmail = config.MAIL_FROM || 'RyeCentral Tasting <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
        },
        body: JSON.stringify({
                from: fromEmail,
                to: [email],
                subject: `${code} — Your RyeCentral Tasting Login Code`,
                html,
        }),
  });

  if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        console.error('Resend API error:', response.status, errData);
        throw new Error('Failed to send email');
  }

  return true;
}

// ── JWT implementation ────────────────────────────────────

function base64url(str) {
    return Buffer.from(str)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
}

function base64urlDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64').toString();
}

function signJWT(payload, secret, expiresInHours = 24) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);

  const fullPayload = {
        ...payload,
        iat: now,
        exp: now + (expiresInHours * 3600),
  };

  const headerB64 = base64url(JSON.stringify(header));
    const payloadB64 = base64url(JSON.stringify(fullPayload));
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  return `${headerB64}.${payloadB64}.${signature}`;
}

function verifyJWT(token, secret) {
    try {
          const parts = token.split('.');
          if (parts.length !== 3) return null;

      const [headerB64, payloadB64, signature] = parts;

      const expectedSig = crypto
            .createHmac('sha256', secret)
            .update(`${headerB64}.${payloadB64}`)
            .digest('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

      if (signature !== expectedSig) return null;

      const payload = JSON.parse(base64urlDecode(payloadB64));

      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
              return null;
      }

      return payload;
    } catch {
          return null;
    }
}

/**
 * Issue a tasting app JWT from verified email.
 */
function issueAppToken(email, displayName) {
    return signJWT(
      {
              email: email.toLowerCase().trim(),
              firstName: displayName || email.split('@')[0],
              displayName: displayName || email.split('@')[0],
      },
          config.JWT_SECRET,
          24 // hours
        );
}

/**
 * Verify a tasting app JWT token.
 */
function verifyAppToken(token) {
    return verifyJWT(token, config.JWT_SECRET);
}

/**
 * Express middleware: require authentication.
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Authentication required' });
    }

  const token = authHeader.substring(7);
    const payload = verifyAppToken(token);

  if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.customer = payload;
    next();
}

// ── Cleanup stale codes every 5 minutes ───────────────────
setInterval(() => {
    const now = Date.now();
    for (const [email, entry] of codeStore.entries()) {
          if (now > entry.expiresAt) {
                  codeStore.delete(email);
          }
    }
}, 5 * 60 * 1000);

module.exports = {
    generateCode,
    storeCode,
    verifyCode,
    canSendCode,
    sendCodeEmail,
    issueAppToken,
    verifyAppToken,
    requireAuth,
    signJWT,
    verifyJWT,
};
