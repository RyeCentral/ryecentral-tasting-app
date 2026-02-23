/**
 * Judge.me Integration Service
 *
 * Submits guest tasting reviews to Judge.me for RyeCentral products.
 *
 * Flow:
 *  1. Guest finishes tasting event
 *  2. Guest opts in to post review for each bottle
 *  3. App generates review title + body from tasting data
 *  4. Submits via Judge.me API (POST /api/v1/reviews)
 *
 * NOTE: cf_answers (custom form fields) have a known duplication bug in
 * Judge.me's API, so flavor profile data is formatted into the review body
 * text instead.
 */

const config = require('../config/env');

const JUDGE_ME_API = 'https://judge.me/api/v1';
const SHOP_DOMAIN = config.SHOPIFY_STORE_DOMAIN; // mrmjjs-tu.myshopify.com

const FLAVOR_LABELS = {
  sweetness: 'Sweetness',
  ryeSpice: 'Rye Spice',
  herbalMint: 'Herbal/Mint',
  fruit: 'Fruit',
  oakVanilla: 'Oak/Vanilla',
  body: 'Body',
  heat: 'Heat',
  finishLength: 'Finish Length',
};

// ── Title Generation ────────────────────────────────────────────

/**
 * Generate a catchy review title from the guest's tasting data.
 * Uses dominant flavor attributes + overall impression.
 */
function generateReviewTitle(response, product) {
  const fp = response.flavorProfile || {};
  const rating = response.rating || 3;

  // Find the top 2 dominant flavors (highest rated by the guest)
  const ranked = Object.entries(fp)
    .filter(([, v]) => v != null)
    .sort(([, a], [, b]) => b - a);

  const top1 = ranked[0];
  const top2 = ranked[1];

  // Rating sentiment
  const sentiment =
    rating >= 4.5 ? 'Outstanding' :
    rating >= 4   ? 'Excellent' :
    rating >= 3.5 ? 'Really Good' :
    rating >= 3   ? 'Solid' :
    rating >= 2   ? 'Decent' :
    'Not For Me';

  // Flavor descriptors
  const descriptorMap = {
    sweetness:    ['Sweet', 'Caramel-Forward', 'Honeyed'],
    ryeSpice:     ['Spicy', 'Peppery', 'Rye-Forward'],
    herbalMint:   ['Herbal', 'Minty', 'Fresh'],
    fruit:        ['Fruity', 'Berry-Rich', 'Orchard Fruit'],
    oakVanilla:   ['Oaky', 'Vanilla-Rich', 'Woody'],
    body:         ['Full-Bodied', 'Rich', 'Thick'],
    heat:         ['Hot', 'Warm', 'Fiery'],
    finishLength: ['Long Finish', 'Lingering', 'Lasting'],
  };

  if (top1 && top2) {
    const d1 = descriptorMap[top1[0]]?.[0] || FLAVOR_LABELS[top1[0]];
    const d2 = descriptorMap[top2[0]]?.[0] || FLAVOR_LABELS[top2[0]];
    return `${sentiment} — ${d1} and ${d2}`;
  }

  if (top1) {
    const d1 = descriptorMap[top1[0]]?.[0] || FLAVOR_LABELS[top1[0]];
    return `${sentiment} — ${d1} Pour`;
  }

  // Fallback
  return `${sentiment} Rye — Blind Tasting Notes`;
}

// ── Body Generation ─────────────────────────────────────────────

/**
 * Build the review body from nose/palate pills, flavor profile, and free notes.
 * Formatted for readability as a Judge.me text review.
 */
function generateReviewBody(response, product, guestName) {
  const parts = [];

  // Opening line
  parts.push(`Tasted blind at a RyeCentral home tasting event.`);

  // Nose notes
  if (response.noseNotes?.length) {
    parts.push(`\nNose: ${response.noseNotes.join(', ')}`);
  }

  // Palate notes
  if (response.palateNotes?.length) {
    parts.push(`Palate: ${response.palateNotes.join(', ')}`);
  }

  // Flavor Profile
  const fp = response.flavorProfile || {};
  const fpEntries = Object.entries(fp).filter(([, v]) => v != null);
  if (fpEntries.length > 0) {
    const fpLines = fpEntries.map(([k, v]) => `${FLAVOR_LABELS[k] || k}: ${v}/10`);
    parts.push(`\nFlavor Profile:\n${fpLines.join('\n')}`);
  }

  // Free notes
  if (response.freeNotes?.trim()) {
    parts.push(`\nAdditional Notes: ${response.freeNotes.trim()}`);
  }

  return parts.join('\n');
}

// ── Judge.me Product ID Lookup ──────────────────────────────────

/**
 * Convert a Shopify product ID to a Judge.me internal product ID.
 * The Shopify ID is the numeric part of the gid://shopify/Product/XXXXX string.
 */
async function getJudgeMeProductId(shopifyProductId, apiToken) {
  // Extract numeric ID if it's a GID
  const numericId = shopifyProductId.toString().replace(/^gid:\/\/shopify\/Product\//, '');

  const url = `${JUDGE_ME_API}/products/-1?shop_domain=${SHOP_DOMAIN}&api_token=${apiToken}&external_id=${numericId}`;
  console.log('Judge.me product lookup:', { numericId, url: url.replace(apiToken, '[REDACTED]') });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Judge.me product lookup failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('Judge.me product lookup result:', { productId: data.product?.id, externalId: data.product?.external_id });
  return data.product?.id || null;
}

// ── Submit Review ───────────────────────────────────────────────

/**
 * Submit a tasting review to Judge.me.
 *
 * @param {Object} params
 * @param {string} params.apiToken       - Judge.me private API token
 * @param {Object} params.response       - Guest's tasting response (noseNotes, palateNotes, flavorProfile, etc.)
 * @param {Object} params.product        - Product data (id, title, handle, etc.)
 * @param {string} params.guestName      - Guest's display name
 * @param {string} params.guestEmail     - Guest's email (for Judge.me reviewer)
 * @param {number} [params.rating]       - Star rating (1-5), defaults to response.rating
 *
 * @returns {Object} { success: bool, title, body, rating }
 */
async function submitReview({ apiToken, response, product, guestName, guestEmail, rating }) {
  // Generate title and body (allow overrides from guest edits)
  const title = response._editedTitle || generateReviewTitle(response, product);
  const body = response._editedBody || generateReviewBody(response, product, guestName);
  const starRating = Math.round(rating || response.rating || 3);

  // Get Judge.me internal product ID
  let judgeMeProductId;
  try {
    judgeMeProductId = await getJudgeMeProductId(product.id, apiToken);
  } catch (err) {
    console.error('Judge.me product lookup error:', err.message);
    // Fall back: try submitting with external_id
    judgeMeProductId = null;
  }

  // Extract numeric Shopify ID (strip gid:// prefix if present)
  const numericId = product.id.toString().replace(/^gid:\/\/shopify\/Product\//, '');

  // Build flat payload — Judge.me POST /reviews uses flat structure.
  // Key: use "product_external_id" (not "external_id") for Shopify product ID.
  const payload = {
    shop_domain: SHOP_DOMAIN,
    api_token: apiToken,
    platform: 'shopify',
    name: guestName,
    email: guestEmail,
    rating: starRating,
    title,
    body,
    product_external_id: numericId,
    // NOTE: Omitting cf_answers due to known Judge.me duplication bug.
  };

  // Also set internal Judge.me product ID if we found one
  if (judgeMeProductId) {
    payload.id = judgeMeProductId;
  }

  // Include product_url for additional product matching reliability
  if (product.handle) {
    payload.product_url = `https://${SHOP_DOMAIN}/products/${product.handle}`;
  }

  console.log('Judge.me submit payload:', JSON.stringify({
    ...payload,
    api_token: '[REDACTED]',
    body: body.substring(0, 100) + '...',
  }));

  // Submit to Judge.me
  const url = `${JUDGE_ME_API}/reviews`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  // Judge.me always returns 200 even on errors — reviews are processed async
  const result = await res.json().catch(() => ({}));

  return {
    success: true,
    title,
    body,
    rating: starRating,
    judgeMeProductId,
    result,
  };
}

// ── Preview (for showing guest before submission) ───────────────

function previewReview(response, product, guestName) {
  return {
    title: generateReviewTitle(response, product),
    body: generateReviewBody(response, product, guestName),
    rating: Math.round(response.rating || 3),
  };
}

module.exports = {
  generateReviewTitle,
  generateReviewBody,
  submitReview,
  previewReview,
  getJudgeMeProductId,
};
