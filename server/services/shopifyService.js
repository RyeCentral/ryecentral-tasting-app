/**
 * Shopify Storefront API Service
 * Pulls rye whiskey review products from RyeCentral's Shopify store.
 *
 * Review products use productType "Rye Whiskey Review" and contain all
 * tasting data (flavor profile, nose/palate notes, community score, quick facts)
 * embedded in the product descriptionHtml.
 *
 * This service parses that HTML to extract structured tasting data.
 */

const config = require('../config/env');

const STOREFRONT_API_URL = `https://${config.SHOPIFY_STORE_DOMAIN}/api/2025-01/graphql.json`;

// ── Storefront API Query ─────────────────────────────────

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
    console.error('Shopify API error:', response.status, response.statusText, errBody);
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// ── Product Queries ──────────────────────────────────────

/**
 * Fetch all review products (rye whiskey reviews on RyeCentral)
 */
async function getReviewProducts(first = 50, cursor = null) {
  const query = `
    query GetReviewProducts($first: Int!, $after: String) {
      products(first: $first, after: $after, query: "product_type:'Rye Whiskey Review' OR tag:'Rye Whiskey Reviews'") {
        edges {
          cursor
          node {
            id
            title
            handle
            description
            descriptionHtml
            productType
            tags
            vendor
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  `;

  const data = await storefrontQuery(query, { first, after: cursor });
  return data.products;
}

/**
 * Fetch a single review product by handle (URL slug)
 */
async function getProductByHandle(handle) {
  const query = `
    query GetProduct($handle: String!) {
      productByHandle(handle: $handle) {
        id
        title
        handle
        description
        descriptionHtml
        productType
        tags
        vendor
        images(first: 3) {
          edges {
            node {
              url
              altText
            }
          }
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  `;

  const data = await storefrontQuery(query, { handle });
  return data.productByHandle;
}

// ── HTML Parsing Utilities ───────────────────────────────

/**
 * Strip HTML tags from a string
 */
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract text content after a bold label like "<strong>Label:</strong> value"
 * or "<b>Label:</b> value"
 * Returns just the value part.
 */
function extractAfterLabel(html, label) {
  // Match both <strong> and <b> tags, with or without colon
  const patterns = [
    new RegExp(`<(?:strong|b)>${label}:?</(?:strong|b)>\\s*(.+?)(?=</li>|$)`, 'is'),
    new RegExp(`<(?:strong|b)>${label}:?\\s*</(?:strong|b)>\\s*(.+?)(?=</li>|$)`, 'is'),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return stripHtml(match[1]).trim();
    }
  }
  return null;
}

/**
 * Parse the "Flavor Profile at a Glance" section from descriptionHtml.
 *
 * Expected format (V1 uses <b>, V2 uses <strong>):
 *   <h2>Flavor Profile at a Glance</h2>
 *   <ul>
 *     <li><strong>Sweetness:</strong> 5/10</li>
 *     <li><strong>Rye spice (pepper/baking spice):</strong> 8/10</li>
 *     ...
 *   </ul>
 *
 * Returns an object like: { sweetness: 5, ryeSpice: 8, herbalMint: 7, ... }
 */
function parseFlavorProfile(html) {
  const profile = {
    sweetness: null,
    ryeSpice: null,
    herbalMint: null,
    fruit: null,
    oakVanilla: null,
    body: null,
    heat: null,
    finishLength: null,
  };

  // Find the Flavor Profile section
  const flavorIdx = html.indexOf('Flavor Profile');
  if (flavorIdx === -1) return profile;

  // Get the <ul> block after the heading
  const sectionEnd = html.indexOf('</ul>', flavorIdx);
  if (sectionEnd === -1) return profile;

  const section = html.substring(flavorIdx, sectionEnd + 5);

  // Extract each score — match pattern "Label: N/10" with various label formats
  const scorePatterns = [
    { key: 'sweetness', pattern: /Sweetness[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    { key: 'ryeSpice', pattern: /(?:Rye\s*[Ss]pice|Spice)[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    { key: 'herbalMint', pattern: /Herbal[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    { key: 'fruit', pattern: /Fruit[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    { key: 'oakVanilla', pattern: /Oak[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    { key: 'body', pattern: /Body[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    { key: 'heat', pattern: /Heat[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    { key: 'finishLength', pattern: /Finish[^:]*:\s*<\/(?:strong|b)>\s*(\d+(?:\.\d+)?)\s*\/\s*10/i },
  ];

  for (const { key, pattern } of scorePatterns) {
    const match = section.match(pattern);
    if (match) {
      profile[key] = parseFloat(match[1]);
    }
  }

  // Fallback: try matching without the closing tag (plain text format)
  if (Object.values(profile).every((v) => v === null)) {
    const plainPatterns = [
      { key: 'sweetness', pattern: /Sweetness[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
      { key: 'ryeSpice', pattern: /(?:Rye\s*)?[Ss]pice[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
      { key: 'herbalMint', pattern: /Herbal[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
      { key: 'fruit', pattern: /Fruit[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
      { key: 'oakVanilla', pattern: /Oak[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
      { key: 'body', pattern: /Body[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
      { key: 'heat', pattern: /Heat[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
      { key: 'finishLength', pattern: /Finish[^0-9]*(\d+(?:\.\d+)?)\s*\/\s*10/i },
    ];

    for (const { key, pattern } of plainPatterns) {
      const match = section.match(pattern);
      if (match) {
        profile[key] = parseFloat(match[1]);
      }
    }
  }

  return profile;
}

/**
 * Parse nose, palate, and finish tasting notes from descriptionHtml.
 *
 * V1 format (short):
 *   <b>Nose:</b> Honey, vanilla, clover, earthiness.
 *
 * V2 format (paragraph):
 *   <strong>Nose:</strong> Intensely aromatic with layers of grassy rye...
 *
 * Returns { nose: "...", palate: "...", finish: "..." }
 */
function parseTastingNotes(html) {
  const notes = {
    nose: null,
    palate: null,
    finish: null,
  };

  // Find the "Tastes Like" section (preferred) or look globally
  let searchHtml = html;
  const tastesIdx = html.indexOf('Tastes Like');
  if (tastesIdx > -1) {
    // Get a generous chunk after "Tastes Like"
    searchHtml = html.substring(tastesIdx, tastesIdx + 5000);
  }

  // Extract each section
  for (const key of ['nose', 'palate', 'finish']) {
    const label = key.charAt(0).toUpperCase() + key.slice(1);
    const value = extractAfterLabel(searchHtml, label);
    if (value) {
      notes[key] = value;
    }
  }

  return notes;
}

/**
 * Extract individual tasting note keywords from prose tasting notes.
 * Parses phrases like "honey, vanilla, clover" or detects note words
 * in longer paragraphs.
 *
 * Returns an array of note strings.
 */
function extractNoteKeywords(noteText) {
  if (!noteText) return [];

  // Common rye whiskey tasting note vocabulary
  const knownNotes = [
    'caramel', 'vanilla', 'cinnamon', 'black pepper', 'clove', 'nutmeg',
    'oak', 'honey', 'maple', 'brown sugar', 'toffee', 'butterscotch',
    'cherry', 'apple', 'pear', 'dried fruit', 'raisin', 'citrus',
    'orange peel', 'dark chocolate', 'chocolate', 'cocoa', 'leather', 'tobacco',
    'smoke', 'char', 'mint', 'herbal', 'dill', 'anise', 'licorice',
    'baking spice', 'allspice', 'ginger', 'floral', 'rose', 'grass',
    'grain', 'bread', 'corn', 'rye spice', 'white pepper', 'molasses',
    'walnut', 'almond', 'pecan', 'coconut', 'banana', 'tropical fruit',
    'stone fruit', 'peach', 'apricot', 'plum', 'fig', 'date',
    'pepper', 'spice', 'earthy', 'earthiness', 'clover', 'toasted oak',
    'barrel char', 'charred oak', 'grassy', 'pine', 'sassafras',
    'gentian', 'menthol', 'cream', 'creamy', 'butter', 'nuts', 'spiced nuts',
    'dark cherries', 'cherries', 'cocoa powder', 'vanilla extract',
  ];

  const lowerText = noteText.toLowerCase();
  const found = [];

  // Sort by length descending so longer phrases match first (e.g., "dark chocolate" before "chocolate")
  const sortedNotes = [...knownNotes].sort((a, b) => b.length - a.length);

  for (const note of sortedNotes) {
    // Use word boundary matching to avoid partial matches (e.g., "clove" in "clover")
    const regex = new RegExp(`\\b${note.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lowerText)) {
      // Avoid duplicates from overlapping terms
      if (!found.some((f) => f.includes(note) || note.includes(f))) {
        found.push(note);
      }
    }
  }

  return found;
}

/**
 * Parse the Community Score from descriptionHtml.
 *
 * Expected format:
 *   <h3>Community Score: 3.7 (based on aggregated reviewer ratings)</h3>
 *   or
 *   <h3><strong>Community Score: 4.3 based on 150 ratings</strong></h3>
 *
 * Returns a number (e.g., 3.7) or null.
 */
function parseCommunityScore(html) {
  const patterns = [
    /Community Score:\s*(\d+(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return null;
}

/**
 * Parse Quick Facts (proof, age, mash bill, price) from descriptionHtml.
 *
 * Expected format:
 *   <h2>Quick Facts</h2>
 *   <ul>
 *     <li><strong>Proof/ABV:</strong> 100 Proof (50% ABV)</li>
 *     <li><strong>Age:</strong> 10 Years</li>
 *     <li><strong>Mash bill:</strong> 100% Rye</li>
 *     <li><strong>Typical price:</strong> $79.99 SRP</li>
 *   </ul>
 */
function parseQuickFacts(html) {
  const facts = {
    proof: null,
    age: null,
    mashBill: null,
    typicalPrice: null,
    whatItIs: null,
  };

  // Find the Quick Facts section
  const factsIdx = html.indexOf('Quick Facts');
  if (factsIdx === -1) return facts;

  const sectionEnd = html.indexOf('</ul>', factsIdx);
  if (sectionEnd === -1) return facts;

  const section = html.substring(factsIdx, sectionEnd + 5);

  // Extract each fact
  facts.whatItIs = extractAfterLabel(section, 'What it is');
  facts.proof = extractAfterLabel(section, 'Proof/ABV') || extractAfterLabel(section, 'Proof');
  facts.age = extractAfterLabel(section, 'Age');
  facts.mashBill = extractAfterLabel(section, 'Mash bill') || extractAfterLabel(section, 'Mashbill');

  // Price — try "Typical price" first, then just "price"
  const priceText = extractAfterLabel(section, 'Typical price') || extractAfterLabel(section, 'Price');
  if (priceText) {
    facts.typicalPrice = priceText;
    // Also extract numeric price value
    const priceMatch = priceText.match(/\$(\d+(?:\.\d+)?)/);
    if (priceMatch) {
      facts.retailPriceNum = parseFloat(priceMatch[1]);
    }
  }

  return facts;
}

// ── Transform Product ────────────────────────────────────

/**
 * Transform raw Shopify product into our tasting app format.
 * Parses all tasting data from the descriptionHtml.
 */
function transformToTastingProduct(shopifyProduct) {
  if (!shopifyProduct) return null;

  const html = shopifyProduct.descriptionHtml || '';
  const image = shopifyProduct.images?.edges?.[0]?.node;

  // Parse all structured data from HTML
  const flavorProfile = parseFlavorProfile(html);
  const tastingNotes = parseTastingNotes(html);
  const communityScore = parseCommunityScore(html);
  const quickFacts = parseQuickFacts(html);

  // Extract individual note keywords for the pill-box game
  const noseNotes = extractNoteKeywords(tastingNotes.nose);
  const palateNotes = extractNoteKeywords(tastingNotes.palate);

  return {
    id: shopifyProduct.id,
    title: shopifyProduct.title,
    handle: shopifyProduct.handle,
    url: `https://ryecentral.com/products/${shopifyProduct.handle}`,
    image: image ? { url: image.url, alt: image.altText } : null,
    vendor: shopifyProduct.vendor || null,
    tags: shopifyProduct.tags || [],

    // Community review data (what the admin sees, used for scoring)
    community: {
      score: communityScore,
      noseNotes,       // Array of keyword strings for pill-box game
      palateNotes,     // Array of keyword strings for pill-box game
      noseProse: tastingNotes.nose,     // Full prose description
      palateProse: tastingNotes.palate, // Full prose description
      finishProse: tastingNotes.finish, // Full prose description
      flavorProfile,
    },

    // Product details
    details: {
      proof: quickFacts.proof,
      age: quickFacts.age,
      mashBill: quickFacts.mashBill,
      typicalPrice: quickFacts.typicalPrice,
      retailPrice: quickFacts.retailPriceNum ||
        parseFloat(shopifyProduct.priceRange?.minVariantPrice?.amount) || null,
      distillery: shopifyProduct.vendor || null,
      whatItIs: quickFacts.whatItIs,
    },
  };
}

// ── Public API ───────────────────────────────────────────

/**
 * Get all review products, transformed for the tasting app
 */
async function getAllTastingProducts() {
  let allProducts = [];
  let cursor = null;
  let hasMore = true;

  while (hasMore) {
    const result = await getReviewProducts(50, cursor);
    const products = result.edges.map((edge) => transformToTastingProduct(edge.node));
    allProducts = allProducts.concat(products.filter(Boolean));

    hasMore = result.pageInfo.hasNextPage;
    cursor = result.pageInfo.endCursor;
  }

  return allProducts;
}

module.exports = {
  storefrontQuery,
  getReviewProducts,
  getProductByHandle,
  transformToTastingProduct,
  getAllTastingProducts,
  // Export parsers for testing
  parseFlavorProfile,
  parseTastingNotes,
  parseCommunityScore,
  parseQuickFacts,
  extractNoteKeywords,
};
