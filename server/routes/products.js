/**
 * Product Routes — Pull review products from RyeCentral via Shopify API
 */

const express = require('express');
const router = express.Router();
const { getProducts, getStaleFallback } = require('../services/productCache');
const shopify = require('../services/shopifyService');

/**
 * GET /api/products
 * Returns all review products available for tasting events.
 * Pass ?fresh=true to bypass cache and get latest from Shopify.
 */
router.get('/', async (req, res) => {
  try {
    const forceFresh = req.query.fresh === 'true';
    const { products, cached } = await getProducts(forceFresh);
    res.json({ products, cached });
  } catch (error) {
    console.error('Error fetching products:', error.message);

    // Return cache if available, even if stale
    const stale = getStaleFallback();
    if (stale) {
      return res.json({ products: stale, cached: true, stale: true });
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
    const { products } = await getProducts(true);
    res.json({ products, refreshed: true });
  } catch (error) {
    console.error('Error refreshing products:', error.message);
    res.status(500).json({ error: 'Failed to refresh products' });
  }
});

module.exports = router;
