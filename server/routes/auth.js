/**
 * Auth Routes — Passwordless one-time code login
 *
 * POST /api/auth/send-code    — Send a 6-digit code to the user's email
 * POST /api/auth/verify-code  — Verify the code and issue a JWT
 * POST /api/auth/validate     — Validate an existing JWT (session check)
 */

const express = require('express');
const router = express.Router();
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

    // Fire-and-forget: create Shopify customer (don't block login response)
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

module.exports = router;
