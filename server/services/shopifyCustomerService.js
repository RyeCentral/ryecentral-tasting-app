/**
 * Shopify Customer Service — Storefront API
 * Creates/finds customers in Shopify when they log in via the tasting app.
 * Uses the Storefront API customerCreate mutation.
 * 
 * FIX: Now checks if customer exists via customerAccessTokenCreate BEFORE
 * calling customerCreate, preventing duplicate activation emails on every deploy.
 */

const crypto = require('crypto');
const env = require('../config/env');

const STOREFRONT_URL = `https://${env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`;
const STOREFRONT_TOKEN = env.SHOPIFY_STOREFRONT_TOKEN;

/**
 * In-memory set of emails we've already processed.
 * Acts as a fast cache — but we no longer rely on it solely.
 * The customerExists() check below is the durable guard.
 */
const knownEmails = new Set();

/**
 * Check if a customer already exists in Shopify by attempting
 * customerAccessTokenCreate with a dummy password.
 * - If Shopify returns UNIDENTIFIED_CUSTOMER → customer does NOT exist
 * - Any other response (wrong password, etc.) → customer EXISTS
 * This never triggers any emails.
 */
async function customerExists(email) {
  const mutation = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
        }
        customerUserErrors {
          code
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      email: email,
      password: 'check-existence-dummy-password-' + Date.now(),
    },
  };

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const data = await response.json();
    const result = data?.data?.customerAccessTokenCreate;
    const errors = result?.customerUserErrors || [];

    // UNIDENTIFIED_CUSTOMER means the email is not registered
    if (errors.some(e => e.code === 'UNIDENTIFIED_CUSTOMER')) {
      return false; // Customer does NOT exist
    }

    // Any other response (including wrong password) means customer exists
    return true;
  } catch (err) {
    console.error('customerExists check failed:', err.message);
    // On error, assume customer exists to avoid sending activation emails
    return true;
  }
}

/**
 * Create a customer in Shopify via Storefront API.
 * First checks if the customer already exists to avoid triggering
 * duplicate activation emails. Only calls customerCreate for truly new users.
 * Sets acceptsMarketing to true for email subscription.
 */
async function findOrCreateShopifyCustomer(email) {
  const cleanEmail = email.toLowerCase().trim();

  // Fast path: in-memory cache
  if (knownEmails.has(cleanEmail)) {
    console.log(`Shopify customer already known (cache hit): ${cleanEmail}`);
    return { created: false, alreadyKnown: true };
  }

  // Durable check: query Shopify to see if customer exists
  const exists = await customerExists(cleanEmail);
  if (exists) {
    console.log(`Shopify customer already exists (API check): ${cleanEmail}`);
    knownEmails.add(cleanEmail);
    return { created: false, alreadyExists: true };
  }

  // Customer doesn't exist — create them
  console.log(`Creating new Shopify customer: ${cleanEmail}`);
  const firstName = cleanEmail.split('@')[0].slice(0, 40);

  // Generate a random password <= 40 chars (Shopify max)
  // User won't need it — we use passwordless auth
  const randomPassword = crypto.randomBytes(16).toString('hex'); // 32 chars

  const mutation = `
    mutation customerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
          email
          firstName
          acceptsMarketing
        }
        customerUserErrors {
          code
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      email: cleanEmail,
      firstName: firstName,
      password: randomPassword,
      acceptsMarketing: true,
    },
  };

  try {
    const response = await fetch(STOREFRONT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({ query: mutation, variables }),
    });

    const data = await response.json();
    const result = data?.data?.customerCreate;

    if (!result) {
      console.error('Shopify customerCreate: unexpected response', JSON.stringify(data));
      return { created: false, error: 'Unexpected Shopify response' };
    }

    const errors = result.customerUserErrors || [];

    // If customer already exists, that's expected and fine
    if (errors.length > 0 && errors.some(e => e.code === 'TAKEN')) {
      console.log(`Shopify customer already exists: ${cleanEmail}`);
      knownEmails.add(cleanEmail);
      return { created: false, alreadyExists: true };
    }

    // CUSTOMER_DISABLED means customer was created but needs email verification
    // This is a SUCCESS — the customer exists in Shopify with marketing consent
    if (errors.length > 0 && errors.some(e => e.code === 'CUSTOMER_DISABLED')) {
      console.log(`Shopify customer created (pending activation): ${cleanEmail}`);
      knownEmails.add(cleanEmail);
      return { created: true, pendingActivation: true };
    }

    if (errors.length > 0) {
      console.error('Shopify customerCreate errors:', JSON.stringify(errors));
      return { created: false, error: errors[0].message };
    }

    console.log(`Shopify customer created: ${cleanEmail} (marketing: true)`);
    knownEmails.add(cleanEmail);
    return {
      created: true,
      customer: result.customer,
    };
  } catch (err) {
    console.error('Shopify customerCreate fetch error:', err.message);
    return { created: false, error: err.message };
  }
}

module.exports = { findOrCreateShopifyCustomer, customerExists };
