/**
 * Shared Product Cache
 * Centralises the in-memory product cache so both the products route
 * and the solo-from-product endpoint share one cache + TTL.
 */

const shopify = require('./shopifyService');

let productCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Return all tasting products, using cache when fresh enough.
 * @param {boolean} forceFresh  bypass cache
 */
async function getProducts(forceFresh = false) {
  const now = Date.now();
  if (!forceFresh && productCache && now - cacheTimestamp < CACHE_TTL) {
    return { products: productCache, cached: true };
  }

  const products = await shopify.getAllTastingProducts();
  productCache = products;
  cacheTimestamp = now;
  return { products, cached: false };
}

/**
 * Find a single product by its Shopify handle.
 * Checks the cache first; on miss, refreshes the cache once and retries.
 */
async function findProductByHandle(handle) {
  // Try cache first
  if (productCache) {
    const found = productCache.find((p) => p.handle === handle);
    if (found) return found;
  }

  // Cache miss — refresh and retry
  await getProducts(true);
  if (productCache) {
    return productCache.find((p) => p.handle === handle) || null;
  }
  return null;
}

/**
 * Return the raw cache (may be null) — for stale-fallback in routes.
 */
function getStaleFallback() {
  return productCache;
}

module.exports = { getProducts, findProductByHandle, getStaleFallback };
