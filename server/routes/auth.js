/**
 * Auth Routes — Passwordless one-time code login
 *
 * POST /api/auth/send-code    — Send a 6-digit code to the user's email
 * POST /api/auth/verify-code  — Verify the code and issue a JWT
 * POST /api/auth/validate     — Validate an existing JWT (session check)
 * POST /api/auth/sso-login   — SSO login for logged-in RyeCentral.com users
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  generateCode,
  storeCode,
  verifyCode,
  canSendCode,
  sendCodeEmail,
  issueAppToken,
  verifyAppToken,
} = require('../services/authService');
const { findOrCreateShopifyCustomer } = require('../services/shopifyCustomerService');
const env = require('../config/env');

/**
 * POST /api/auth/send-code
 * Send a one-time login code to the given email.
 * Body: { email }
 * Returns: { success: true, message }
 */
router.post('/send-code', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Rate limiting
  const rateCheck = canSendCode(email);
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Please wait ${rateCheck.waitSeconds} seconds before requesting a new code.`,
    });
  }

  try {
    const code = generateCode();
    storeCode(email, code);
    await sendCodeEmail(email, code);

    res.json({
      success: true,
      message: 'A login code has been sent to your email.',
    });
  } catch (err) {
    console.error('Send code error:', err.message);
    res.status(500).json({ error: 'Failed to send code. Please try again.' });
  }
});

/**
 * POST /api/auth/verify-code
 * Verify the one-time code and issue a JWT.
 * Body: { email, code }
 * Returns: { token, customer }
 */
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }

  try {
    verifyCode(email, code);

    // Code is valid — issue JWT
    const token = issueAppToken(email);

    const customer = {
      email: email.toLowerCase().trim(),
      firstName: email.split('@')[0],
      displayName: email.split('@')[0],
    };

    res.json({ token, customer });

    // Fire-and-forget: create Shopify customer only for genuinely new users.
    // Uses Admin API (if configured) to avoid triggering activation emails.
    findOrCreateShopifyCustomer(email).catch(err =>
      console.error('Shopify customer creation error:', err.message)
    );
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/**
 * POST /api/auth/validate
 * Validate an existing app JWT (session check / token refresh).
 * Body: { token }
 * Returns: { valid: true, customer } or { valid: false }
 */
router.post('/validate', (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.json({ valid: false });
  }

  const payload = verifyAppToken(token);

  if (!payload) {
    return res.json({ valid: false });
  }

  res.json({
    valid: true,
    customer: {
      email: payload.email,
      firstName: payload.firstName,
      displayName: payload.displayName,
    },
  });
});

/**
 * POST /api/auth/admin-grant
  * Admin bypass: issue a JWT for any email without requiring a code.
   * Body: { email, adminKey }
    */
router.post('/admin-grant', (req, res) => {
    const { email, adminKey } = req.body;
    if (!email || !adminKey) {
          return res.status(400).json({ error: 'Email and adminKey are required.' });
    }
    if (adminKey !== process.env.ADMIN_KEY) {
          return res.status(403).json({ error: 'Invalid admin key.' });
    }
    const cleanEmail = email.toLowerCase().trim();
    const token = issueAppToken(cleanEmail);
    // Fire-and-forget Shopify customer creation
    findOrCreateShopifyCustomer(cleanEmail).catch(() => {});
    const customer = {
          email: cleanEmail,
          firstName: cleanEmail.split('@')[0],
          displayName: cleanEmail.split('@')[0],
    };
    res.json({ token, customer });
});


/**
 * POST /api/auth/sso-login
 * SSO login for users already logged into RyeCentral.com.
 * Verifies an HMAC-signed token from the Shopify storefront.
 *
 * Body: { email, ts, sig }
 *   - email: customer email from Shopify Liquid
 *   - ts: Unix timestamp (seconds) when the link was generated
 *   - sig: HMAC-SHA256 of "email|ts" using SSO_SECRET
 *
 * The signature prevents forged SSO links — only the Shopify
 * Liquid template (server-rendered) knows the shared secret.
 * Tokens expire after 5 minutes to prevent replay.
 */
router.post('/sso-login', async (req, res) => {
  try {
    const { email, ts, sig } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const ssoSecret = env.SSO_SECRET;

    // If SSO_SECRET is configured, require and verify signature
    if (ssoSecret) {
      if (!ts || !sig) {
        console.warn('SSO login rejected \u2014 missing ts/sig for:', cleanEmail);
        return res.status(403).json({ error: 'SSO signature required' });
      }

      // Check timestamp freshness (5 minute window)
      const now = Math.floor(Date.now() / 1000);
      const timestamp = parseInt(ts, 10);
      if (isNaN(timestamp) || Math.abs(now - timestamp) > 300) {
        console.warn('SSO login rejected \u2014 expired token for:', cleanEmail, '| age:', now - timestamp, 's');
        return res.status(403).json({ error: 'SSO link has expired. Please return to RyeCentral.com and try again.' });
      }

      // Verify HMAC signature
      const expectedSig = crypto
        .createHmac('sha256', ssoSecret)
        .update(cleanEmail + '|' + ts)
        .digest('hex');

      if (sig !== expectedSig) {
        console.warn('SSO login rejected \u2014 invalid signature for:', cleanEmail);
        return res.status(403).json({ error: 'Invalid SSO signature' });
      }
    } else {
      // No SSO_SECRET configured \u2014 fall back to origin check (dev/staging)
      const origin = req.get('origin') || req.get('referer') || '';
      const allowedDomain = env.SHOPIFY_PUBLIC_DOMAIN || 'www.ryecentral.com';
      const appUrl = env.APP_URL || '';
      const isAllowedOrigin = origin.includes(allowedDomain) || origin.includes('localhost') || (appUrl && origin.includes(appUrl)) || origin.includes('railway.app');

      if (!isAllowedOrigin) {
        console.warn('SSO login rejected \u2014 invalid origin:', origin);
        return res.status(403).json({ error: 'SSO login not allowed from this origin' });
      }
    }

    // Verified \u2014 issue JWT
    console.log('SSO login granted for:', cleanEmail);
    const token = issueAppToken(cleanEmail);

    // SSO users are already Shopify customers (they logged into ryecentral.com).
    // Do NOT call findOrCreateShopifyCustomer here \u2014 it triggers duplicate
    // "Activate your account" emails via the Storefront API customerCreate mutation.

    return res.json({ token, email: cleanEmail });
  } catch (err) {
    console.error('SSO login error:', err);
    return res.status(500).json({ error: 'SSO login failed' });
  }
});

module.exports = router;
