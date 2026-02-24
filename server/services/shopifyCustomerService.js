/**
 * Shopify Customer Service — Storefront API
 * Creates/finds customers in Shopify when they log in via the tasting app.
 * Uses the Storefront API customerCreate mutation.
 */

const crypto = require('crypto');
const env = require('../config/env');

const STOREFRONT_URL = `https://${env.SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`;
const STOREFRONT_TOKEN = env.SHOPIFY_STOREFRONT_TOKEN;

/**
 * Create a customer in Shopify via Storefront API.
 * If the customer already exists (email taken), that's fine — we just log it.
 * Sets acceptsMarketing to true for email subscription.
 */
async function findOrCreateShopifyCustomer(email) {
  const cleanEmail = email.toLowerCase().trim();
  const firstName = cleanEmail.split('@')[0].slice(0, 40);

  // Generate a random password ≤ 40 chars (Shopify max)
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
      return { created: false, alreadyExists: true };
    }

    // CUSTOMER_DISABLED means customer was created but needs email verification
    // This is a SUCCESS — the customer exists in Shopify with marketing consent
    if (errors.length > 0 && errors.some(e => e.code === 'CUSTOMER_DISABLED')) {
      console.log(`Shopify customer created (pending activation): ${cleanEmail}`);
      return { created: true, pendingActivation: true };
    }

    if (errors.length > 0) {
      console.error('Shopify customerCreate errors:', JSON.stringify(errors));
      return { created: false, error: errors[0].message };
    }

    console.log(`Shopify customer created: ${cleanEmail} (marketing: true)`);
    return {
      created: true,
      customer: result.customer,
    };
  } catch (err) {
    console.error('Shopify customerCreate fetch error:', err.message);
    return { created: false, error: err.message };
  }
}

module.exports = { findOrCreateShopifyCustomer };
