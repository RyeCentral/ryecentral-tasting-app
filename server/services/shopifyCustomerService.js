/**
 * Shopify Customer Service
 *
 * Creates/finds customers in Shopify when they log in via the tasting app.
 *
 * IMPORTANT: Uses the Admin API (not Storefront API) to create customers
 * with send_email_invite: false — this prevents Shopify from sending
 * "Activate your account" emails on every login.
 *
 * If SHOPIFY_ADMIN_API_TOKEN is not configured, customer creation is
 * skipped entirely to avoid triggering unwanted activation emails.
 */

const env = require('../config/env');

const STORE_DOMAIN = env.SHOPIFY_STORE_DOMAIN;
const ADMIN_API_TOKEN = env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_URL = `https://${STORE_DOMAIN}/admin/api/2024-01`;

/**
 * In-memory set of emails we've already processed this deploy.
 * Prevents redundant API calls within the same server lifetime.
 */
const knownEmails = new Set();

/**
 * Check if a customer exists via Admin API customer search.
 * Returns the customer object if found, null otherwise.
 */
async function findCustomerByEmail(email) {
  if (!ADMIN_API_TOKEN) return null;

  try {
    const response = await fetch(
      `${ADMIN_API_URL}/customers/search.json?query=email:${encodeURIComponent(email)}&fields=id,email,state`,
      {
        headers: {
          'X-Shopify-Access-Token': ADMIN_API_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('Admin API customer search failed:', response.status);
      return null;
    }

    const data = await response.json();
    const customers = data.customers || [];

    // Find exact email match (search can return partial matches)
    return customers.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
  } catch (err) {
    console.error('Admin API customer search error:', err.message);
    return null;
  }
}

/**
 * Create a customer via Admin API with send_email_invite: false.
 * This creates the customer without triggering any activation emails.
 */
async function createCustomerAdmin(email) {
  if (!ADMIN_API_TOKEN) return null;

  const firstName = email.split('@')[0].slice(0, 40);

  try {
    const response = await fetch(`${ADMIN_API_URL}/customers.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': ADMIN_API_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customer: {
          email: email,
          first_name: firstName,
          verified_email: true,
          send_email_invite: false,
          email_marketing_consent: {
            state: 'subscribed',
            consent_updated_at: new Date().toISOString(),
          },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // 422 with "has already been taken" means customer exists — that's fine
      const errors = data.errors;
      if (errors?.email && errors.email.some(e => e.includes('taken'))) {
        console.log(`Admin API: customer already exists: ${email}`);
        return { created: false, alreadyExists: true };
      }
      console.error('Admin API customer create failed:', response.status, JSON.stringify(data));
      return { created: false, error: JSON.stringify(data) };
    }

    console.log(`Admin API: customer created (no activation email): ${email}`);
    return { created: true, customer: data.customer };
  } catch (err) {
    console.error('Admin API customer create error:', err.message);
    return { created: false, error: err.message };
  }
}

/**
 * Find or create a Shopify customer for a tasting app user.
 *
 * Uses the Admin API to avoid triggering activation emails.
 * If no Admin API token is configured, silently skips — the tasting app
 * works fine without Shopify customer records.
 */
async function findOrCreateShopifyCustomer(email) {
  const cleanEmail = email.toLowerCase().trim();

  // Fast path: in-memory cache
  if (knownEmails.has(cleanEmail)) {
    return { created: false, alreadyKnown: true };
  }

  // If Admin API is not configured, skip customer creation entirely.
  // The Storefront API customerCreate always sends activation emails,
  // so we don't use it.
  if (!ADMIN_API_TOKEN) {
    console.log(`Shopify customer sync skipped (no Admin API token): ${cleanEmail}`);
    knownEmails.add(cleanEmail); // Don't log this message repeatedly
    return { created: false, skipped: true };
  }

  // Check if customer already exists via Admin API
  const existing = await findCustomerByEmail(cleanEmail);
  if (existing) {
    console.log(`Shopify customer already exists: ${cleanEmail} (state: ${existing.state})`);
    knownEmails.add(cleanEmail);
    return { created: false, alreadyExists: true };
  }

  // Customer doesn't exist — create via Admin API (no activation email)
  console.log(`Creating new Shopify customer (Admin API): ${cleanEmail}`);
  const result = await createCustomerAdmin(cleanEmail);

  if (result) {
    knownEmails.add(cleanEmail);
  }

  return result || { created: false, error: 'Unknown' };
}

/**
 * Check if a customer exists in Shopify.
 * Uses Admin API for reliable detection.
 */
async function customerExists(email) {
  const cleanEmail = email.toLowerCase().trim();

  if (knownEmails.has(cleanEmail)) return true;

  if (!ADMIN_API_TOKEN) {
    // Without Admin API, assume customer exists to prevent
    // any Storefront API calls that could trigger emails
    return true;
  }

  const existing = await findCustomerByEmail(cleanEmail);
  if (existing) {
    knownEmails.add(cleanEmail);
    return true;
  }

  return false;
}

module.exports = { findOrCreateShopifyCustomer, customerExists };
