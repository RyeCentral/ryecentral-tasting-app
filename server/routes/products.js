/**
 * Product Routes — Pull review products from RyeCentral via Shopify API
 */

const express = require('express');
const router = express.Router();
const shopify = require('../services/shopifyService');

// Cache products in memory (refresh every 10 minutes)
let productCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000;

/**
 * GET /api/products
 * Returns all review products available for tasting events.
 * Pass ?fresh=true to bypass cache and get latest from Shopify.
 */
router.get('/', async (req, res) => {
  try {
    const forceFresh = req.query.fresh === 'true';
    const now = Date.now();

    if (!forceFresh && productCache && now - cacheTimestamp < CACHE_TTL) {
      return res.json({ products: productCache, cached: true });
    }

    const products = await shopify.getAllTastingProducts();
    productCache = products;
    cacheTimestamp = now;

    res.json({ products, cached: false });
  } catch (error) {
    console.error('Error fetching products:', error.message);

    // Return cache if available, even if stale
    if (productCache) {
      return res.json({ products: productCache, cached: true, stale: true });
    }

    res.status(500).json({ error: 'Failed to fetch products from RyeCentral' });
  }
});

/**
 * GET /api/products/:handle
 * Returns a single review product by its URL handle
 */
router.get('/:handle', async (req, res) => {
  try {
    const product = await shopify.getProductByHandle(req.params.handle);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const transformed = shopify.transformToTastingProduct(product);
    res.json({ product: transformed });
  } catch (error) {
    console.error('Error fetching product:', error.message);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/products/refresh
 * Force refresh the product cache
 */
router.post('/refresh', async (req, res) => {
  try {
    const products = await shopify.getAllTastingProducts();
    productCache = products;
    cacheTimestamp = Date.now();
    res.json({ products, refreshed: true });
  } catch (error) {
    console.error('Error refreshing products:', error.message);
    res.status(500).json({ error: 'Failed to refresh products' });
  }
});

module.exports = router;
