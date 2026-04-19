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
const {
  generateCode,
  storeCode,
  verifyCode,
  canSendCode,
  sendCodeEmail,
  issueAppToken,
  verifyAppToken,
} = require('../services/authService');
const { findOrCreateShopifyCustomer, customerExists } = require('../services/shopifyCustomerService');
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

  // Gate: require an existing RyeCentral customer account.
  try {
    const exists = await customerExists(email.toLowerCase().trim());
    if (!exists) {
      console.warn('send-code rejected — not a RyeCentral customer:', email);
      return res.status(403).json({
        error: 'No RyeCentral account found for that email. Create a free account at https://www.ryecentral.com/account/register first, then come back to start your tasting event.',
        code: 'NO_RYECENTRAL_ACCOUNT',
      });
    }
  } catch (err) {
    console.error('customerExists check failed in send-code:', err.message);
    return res.status(503).json({
      error: 'Unable to verify your RyeCentral account right now. Please try again in a moment.',
    });
  }

  try {
    const code = generateCode();
    storeCode(email, code);
    await sendCodeEmail(email, code);
    res.json({ success: true, message: 'A login code has been sent to your email.' });
  } catch (err) {
    console.error('Send code error:', err.message);
    res.status(500).json({ error: 'Failed to send code. Please try again.' });
  }
});

/**
 * POST /api/auth/verify-code
 */
router.post('/verify-code', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required.' });
  }
  try {
    verifyCode(email, code);
    const token = issueAppToken(email);
    const customer = {
      email: email.toLowerCase().trim(),
      firstName: email.split('@')[0],
      displayName: email.split('@')[0],
    };
    res.json({ token, customer });
    findOrCreateShopifyCustomer(email).catch(err =>
      console.error('Shopify customer creation error:', err.message)
    );
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

/**
 * POST /api/auth/validate
 */
router.post('/validate', (req, res) => {
  const { token } = req.body;
  if (!token) return res.json({ valid: false });
  const payload = verifyAppToken(token);
  if (!payload) return res.json({ valid: false });
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
 */
router.post('/admin-grant', (req, res) => {
  const { email, adminKey } = req.body;
  if (!email || !adminKey) return res.status(400).json({ error: 'Email and adminKey are required.' });
  if (adminKey !== process.env.ADMIN_KEY) return res.status(403).json({ error: 'Invalid admin key.' });
  const cleanEmail = email.toLowerCase().trim();
  const token = issueAppToken(cleanEmail);
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
 */
router.post('/sso-login', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    const cleanEmail = email.toLowerCase().trim();
    const origin = req.get('origin') || req.get('referer') || '';
    const allowedDomain = env.SHOPIFY_PUBLIC_DOMAIN || 'www.ryecentral.com';
    const appUrl = env.APP_URL || '';
    const isAllowedOrigin = origin.includes(allowedDomain) || origin.includes('localhost') || (appUrl && origin.includes(appUrl)) || origin.includes('railway.app');
    if (!isAllowedOrigin) {
      console.warn('SSO login rejected — invalid origin:', origin);
      return res.status(403).json({ error: 'SSO login not allowed from this origin' });
    }
    try {
      const exists = await customerExists(cleanEmail);
      if (!exists) {
        console.warn('SSO login rejected — not a RyeCentral customer:', cleanEmail);
        return res.status(403).json({
          error: 'SSO requires an existing RyeCentral account. Please create one at https://www.ryecentral.com/account/register.',
          code: 'NO_RYECENTRAL_ACCOUNT',
        });
      }
    } catch (err) {
      console.error('customerExists check failed in sso-login:', err.message);
      return res.status(503).json({ error: 'Unable to verify your RyeCentral account right now. Please try again in a moment.' });
    }
    console.log('SSO login granted for:', cleanEmail);
    const token = issueAppToken(cleanEmail);
    findOrCreateShopifyCustomer(cleanEmail).catch(err =>
      console.error('SSO findOrCreate error:', err.message)
    );
    return res.json({ token, email: cleanEmail });
  } catch (err) {
    console.error('SSO login error:', err);
    return res.status(500).json({ error: 'SSO login failed' });
  }
});

module.exports = router;
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
const {
  generateCode,
  storeCode,
  verifyCode,
  canSendCode,
  sendCodeEmail,
  issueAppToken,
  verifyAppToken,
} = require('../services/authService');
const { findOrCreateShopifyCustomer, customerExists } = require('../services/shopifyCustomerService');
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

  // Gate: require an existing RyeCentral customer account.
  // This prevents strangers who only have the tasting-app URL from signing up
  // without first creating a RyeCentral account on the main store.
  try {
    const exists = await customerExists(email.toLowerCase().trim());
    if (!exists) {
      console.warn('send-code rejected — not a RyeCentral customer:', email);
      return res.status(403).json({
        error: 'No RyeCentral account found for that email. Create a free account at https://www.ryecentral.com/account/register first, then come back to start your tasting event.',
        code: 'NO_RYECENTRAL_ACCOUNT',
      });
    }
  } catch (err) {
    console.error('customerExists check failed in send-code:', err.message);
    // On check failure, fail-closed to protect the app: user should retry or contact support
    return res.status(503).json({
      error: 'Unable to verify your RyeCentral account right now. Please try again in a moment.',
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
 * SSO-style login for users already logged into RyeCentral.com.
 * Receives the customer email from the Shopify storefront,
 * validates the request origin, and issues a JWT
 * without requiring an access code.
 */
router.post('/sso-login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Validate origin — accept from our Shopify storefront OR same-origin (the tasting app itself)
    const origin = req.get('origin') || req.get('referer') || '';
    const allowedDomain = env.SHOPIFY_PUBLIC_DOMAIN || 'www.ryecentral.com';
    const appUrl = env.APP_URL || '';
    const isAllowedOrigin = origin.includes(allowedDomain) || origin.includes('localhost') || (appUrl && origin.includes(appUrl)) || origin.includes('railway.app');

    if (!isAllowedOrigin) {
      console.warn('SSO login rejected — invalid origin:', origin);
      return res.status(403).json({ error: 'SSO login not allowed from this origin' });
    }

    // Verify the email is a real RyeCentral customer before granting SSO access.
    // Prevents anyone who forges ?sso_email= (even with a valid origin) from bypassing
    // RyeCentral account signup on the main store.
    try {
      const exists = await customerExists(cleanEmail);
      if (!exists) {
        console.warn('SSO login rejected — not a RyeCentral customer:', cleanEmail);
        return res.status(403).json({
          error: 'SSO requires an existing RyeCentral account. Please create one at https://www.ryecentral.com/account/register.',
          code: 'NO_RYECENTRAL_ACCOUNT',
        });
      }
    } catch (err) {
      console.error('customerExists check failed in sso-login:', err.message);
      return res.status(503).json({
        error: 'Unable to verify your RyeCentral account right now. Please try again in a moment.',
      });
    }

    // Customer verified — issue JWT (same as verify-code flow)
    console.log('SSO login granted for:', cleanEmail);
    const token = issueAppToken(cleanEmail);

    // Fire-and-forget: ensure customer record is synced
    findOrCreateShopifyCustomer(cleanEmail).catch(err =>
      console.error('SSO findOrCreate error:', err.message)
    );

    return res.json({ token, email: cleanEmail });
  } catch (err) {
    console.error('SSO login error:', err);
    return res.status(500).json({ error: 'SSO login failed' });
  }
});

module.exports = router;
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
 * SSO-style login for users already logged into RyeCentral.com.
 * Receives the customer email from the Shopify storefront,
 * validates the request origin, and issues a JWT
 * without requiring an access code.
 */
router.post('/sso-login', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Validate origin — accept from our Shopify storefront OR same-origin (the tasting app itself)
    const origin = req.get('origin') || req.get('referer') || '';
    const allowedDomain = env.SHOPIFY_PUBLIC_DOMAIN || 'www.ryecentral.com';
    const appUrl = env.APP_URL || '';
    const isAllowedOrigin = origin.includes(allowedDomain) || origin.includes('localhost') || (appUrl && origin.includes(appUrl)) || origin.includes('railway.app');

    if (!isAllowedOrigin) {
      console.warn('SSO login rejected — invalid origin:', origin);
      return res.status(403).json({ error: 'SSO login not allowed from this origin' });
    }

    // Customer verified — issue JWT (same as verify-code flow)
    console.log('SSO login granted for:', cleanEmail);
    const token = issueAppToken(cleanEmail);

    // Fire-and-forget: ensure customer record is synced
    findOrCreateShopifyCustomer(cleanEmail).catch(err =>
      console.error('SSO findOrCreate error:', err.message)
    );

    return res.json({ token, email: cleanEmail });
  } catch (err) {
    console.error('SSO login error:', err);
    return res.status(500).json({ error: 'SSO login failed' });
  }
});

module.exports = router;
