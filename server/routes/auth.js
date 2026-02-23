/**
 * Auth Routes — Shopify Customer Authentication
 *
 * POST /api/auth/login          — Email + password login (classic accounts)
 * POST /api/auth/verify-token   — Verify a Shopify customer access token
 * POST /api/auth/validate       — Validate our app JWT (session check)
 */

const express = require('express');
const router = express.Router();
const {
  createCustomerAccessToken,
  verifyCustomerToken,
  issueAppToken,
  verifyAppToken,
} = require('../services/authService');

/**
 * POST /api/auth/login
 * Authenticate with email + password (for classic Shopify customer accounts).
 * Body: { email, password }
 * Returns: { token, customer }
 */
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Get Shopify customer access token
    const shopifyToken = await createCustomerAccessToken(email, password);

    if (!shopifyToken) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Fetch customer data to include in our JWT
    const customer = await verifyCustomerToken(shopifyToken.accessToken);

    if (!customer) {
      return res.status(401).json({ error: 'Could not verify customer account' });
    }

    // Issue our app JWT
    const appToken = issueAppToken(customer, shopifyToken.accessToken);

    res.json({
      token: appToken,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        displayName: customer.displayName,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);

    // If the error is about unidentified customer, give a helpful message
    if (err.message.includes('Unidentified') || err.message.includes('credentials')) {
      return res.status(401).json({
        error: 'Invalid email or password. Make sure you have a RyeCentral account.',
      });
    }

    res.status(401).json({ error: err.message || 'Authentication failed' });
  }
});

/**
 * POST /api/auth/verify-token
 * Accept a Shopify customer access token (from client-side Shopify login)
 * and exchange it for our app JWT.
 * Body: { shopifyAccessToken }
 * Returns: { token, customer }
 */
router.post('/verify-token', async (req, res) => {
  const { shopifyAccessToken } = req.body;

  if (!shopifyAccessToken) {
    return res.status(400).json({ error: 'Shopify access token is required' });
  }

  try {
    const customer = await verifyCustomerToken(shopifyAccessToken);

    if (!customer) {
      return res.status(401).json({ error: 'Invalid or expired Shopify token' });
    }

    const appToken = issueAppToken(customer, shopifyAccessToken);

    res.json({
      token: appToken,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        displayName: customer.displayName,
      },
    });
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ error: 'Token verification failed' });
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
      id: payload.customerId,
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      displayName: payload.displayName,
    },
  });
});

module.exports = router;
