/**
 * Reviews Routes — Public endpoint to fetch Judge.me reviews
 *
 * Provides a CORS-enabled JSON API that Shopify non-product pages
 * can call to display reviews for the "Home Rye Whiskey Tasting Experience"
 * product. Keeps the Judge.me API token server-side.
 */

const express = require('express');
const router = express.Router();
const config = require('../config/env');

const JUDGE_ME_API = 'https://judge.me/api/v1';
const SHOP_DOMAIN = config.SHOPIFY_STORE_DOMAIN; // mrmjjs-tu.myshopify.com
const TASTING_PRODUCT_ID = 9929296216312; // Shopify external ID

// Simple in-memory cache (reviews don't change frequently)
let reviewsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * GET /api/reviews/tasting-experience
 * Returns published reviews for the Home Rye Whiskey Tasting Experience product.
 * Public endpoint — no auth required (read-only, non-sensitive data).
 */
router.get('/tasting-experience', async (req, res) => {
  // Set CORS headers for cross-origin requests from ryecentral.com
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET');

  if (!config.JUDGEME_API_TOKEN) {
    return res.status(503).json({ error: 'Review service not configured' });
  }

  // Return cached data if fresh
  if (reviewsCache && (Date.now() - cacheTime) < CACHE_TTL) {
    return res.json(reviewsCache);
  }

  try {
    // Step 1: Look up Judge.me's internal product ID from the Shopify external ID
    const lookupUrl = `${JUDGE_ME_API}/products/-1?` + new URLSearchParams({
      shop_domain: SHOP_DOMAIN,
      api_token: config.JUDGEME_API_TOKEN,
      external_id: TASTING_PRODUCT_ID,
    });

    console.log('Looking up Judge.me internal product ID...');
    const lookupRes = await fetch(lookupUrl);
    if (!lookupRes.ok) {
      console.error('Judge.me product lookup failed:', lookupRes.status);
      return res.status(502).json({ error: 'Failed to look up product' });
    }
    const lookupData = await lookupRes.json();
    const judgeMeProductId = lookupData.product?.id;
    console.log('Judge.me internal product ID:', judgeMeProductId);

    if (!judgeMeProductId) {
      return res.status(404).json({ error: 'Product not found in Judge.me' });
    }

    // Step 2: Fetch reviews using Judge.me's internal product ID
    const url = `${JUDGE_ME_API}/reviews?` + new URLSearchParams({
      shop_domain: SHOP_DOMAIN,
      api_token: config.JUDGEME_API_TOKEN,
      product_id: judgeMeProductId,
      per_page: 20,
      page: 1,
    });

    console.log('Fetching reviews from Judge.me for tasting experience product...');
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Judge.me API error:', response.status, response.statusText);
      return res.status(502).json({ error: 'Failed to fetch reviews' });
    }

    const data = await response.json();

    // Filter to only published reviews and map to a clean format
    const reviews = (data.reviews || [])
      .filter(r => r.hidden === false || r.published === true || r.curated === 'ok')
      .map(r => ({
        id: r.id,
        title: r.title || '',
        body: r.body || '',
        rating: r.rating,
        reviewer: r.reviewer?.name || r.name || 'Anonymous',
        createdAt: r.created_at,
        verified: r.verified === 'buyer' || r.verified === true,
      }));

    const result = {
      reviews,
      totalCount: reviews.length,
      averageRating: reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : 0,
      productTitle: 'Home Rye Whiskey Tasting Experience',
    };

    // Cache the result
    reviewsCache = result;
    cacheTime = Date.now();

    console.log(`Fetched ${reviews.length} published reviews from Judge.me`);
    res.json(result);
  } catch (err) {
    console.error('Error fetching reviews:', err.message);
    res.status(500).json({ error: 'Internal error fetching reviews' });
  }
});

module.exports = router;
