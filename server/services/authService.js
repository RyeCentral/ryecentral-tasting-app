/**
 * Shopify Customer Authentication Service
 *
 * Uses Shopify's new passwordless customer accounts via the Storefront API.
 * Flow:
 *   1. User enters email → we check if customer exists via Storefront API
 *   2. We redirect/link them to Shopify's customer account login
 *      (passwordless one-time code via email)
 *   3. After auth, we get a customer access token
 *   4. We issue a JWT for the tasting app session
 *
 * Since Shopify new customer accounts use a passwordless flow managed by Shopify,
 * we use the Multipass or Storefront API customer access token approach.
 *
 * For simplicity with the new customer accounts (passwordless), we'll:
 *   - Accept a customer access token from the client
 *   - Verify it via Storefront API (fetch customer data)
 *   - Issue our own JWT for the tasting app session
 */

const config = require('../config/env');

const STOREFRONT_API_URL = `https://${config.SHOPIFY_STORE_DOMAIN}/api/2025-01/graphql.json`;

/**
 * Execute a Storefront API GraphQL query
 */
async function storefrontQuery(query, variables = {}) {
  const response = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': config.SHOPIFY_STOREFRONT_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    console.error('Shopify Auth API error:', response.status, errBody);
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const json = await response.json();
  return json;
}

/**
 * Create a customer access token using email + password.
 * Note: With new customer accounts (passwordless), this won't work
 * for initial login. We'll use it for customers who have set a password,
 * or use the alternative flow.
 */
async function createCustomerAccessToken(email, password) {
  const query = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const data = await storefrontQuery(query, {
    input: { email, password },
  });

  const result = data.data?.customerAccessTokenCreate;
  if (result?.customerUserErrors?.length > 0) {
    const err = result.customerUserErrors[0];
    throw new Error(err.message || 'Authentication failed');
  }

  return result?.customerAccessToken;
}

/**
 * Verify a customer access token by fetching customer data.
 * Returns customer info if valid, null if expired/invalid.
 */
async function verifyCustomerToken(accessToken) {
  const query = `
    query getCustomer($token: String!) {
      customer(customerAccessToken: $token) {
        id
        firstName
        lastName
        email
        displayName
      }
    }
  `;

  const data = await storefrontQuery(query, { token: accessToken });

  if (data.errors) {
    console.error('Customer token verification errors:', data.errors);
    return null;
  }

  return data.data?.customer || null;
}

/**
 * Simple JWT implementation (no external dependency).
 * Uses HMAC-SHA256 for signing.
 */
const crypto = require('crypto');

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

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature !== expectedSig) return null;

    // Parse payload
    const payload = JSON.parse(base64urlDecode(payloadB64));

    // Check expiry
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Issue a tasting app JWT from verified Shopify customer data.
 */
function issueAppToken(customer, shopifyAccessToken) {
  return signJWT(
    {
      customerId: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      displayName: customer.displayName,
      shopifyToken: shopifyAccessToken,
    },
    config.JWT_SECRET,
    24 // hours
  );
}

/**
 * Verify a tasting app JWT token.
 * Returns the decoded payload or null.
 */
function verifyAppToken(token) {
  return verifyJWT(token, config.JWT_SECRET);
}

/**
 * Express middleware: require authentication.
 * Checks for Bearer token in Authorization header.
 * Attaches req.customer if valid.
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

module.exports = {
  createCustomerAccessToken,
  verifyCustomerToken,
  issueAppToken,
  verifyAppToken,
  requireAuth,
  signJWT,
  verifyJWT,
};
