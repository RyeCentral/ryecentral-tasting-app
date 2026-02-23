/**
 * Shopify Product Service
 * Pulls rye whiskey review products from RyeCentral's Shopify store.
 *
 * Uses the public Online Store REST endpoints to fetch products from the
 * "Rye Whiskey Reviews" collection. This ensures ALL products published to the
 * Online Store are visible, regardless of custom app channel publishing.
 *
 * Review products contain all tasting data (flavor profile, nose/palate notes,
 * community score, quick facts) embedded in the product body_html/descriptionHtml.
 *
 * This service parses that HTML to extract structured tasting data.
 */

const config = require('../config/env');

const STOREFRONT_API_URL = `https://${config.SHOPIFY_STORE_DOMAIN}/api/2025-01/graphql.json`;
const PUBLIC_STORE_URL = `https://${config.SHOPIFY_PUBLIC_DOMAIN}`;
const COLLECTION_HANDLE = 'rye-whiskey-reviews';

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
 * Fetch all products from a collection via the public Online Store REST endpoint.
 * This works for ANY product published to the Online Store — no custom app
 * channel publishing required. Supports pagination via page param (max 250/page).
 */
async function getCollectionProductsREST(collectionHandle = COLLECTION_HANDLE) {
  const allProducts = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `${PUBLIC_STORE_URL}/collections/${collectionHandle}/products.json?limit=250&page=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('REST API error:', response.status, response.statusText, url);
      throw new Error(`REST API error: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const products = json.products || [];
    allProducts.push(...products);

    // If we got fewer than 250, we've reached the end
    hasMore = products.length === 250;
    page++;
  }

  console.log(`Fetched ${allProducts.length} products from collection "${collectionHandle}" via REST`);
  return allProducts;
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
  // Match both <strong> and <b> tags, with or without colon (inside or outside tag)
  const patterns = [
    new RegExp(`<(?:strong|b)>${label}:?</(?:strong|b)>\\s*(.+?)(?=</li>|$)`, 'is'),
    new RegExp(`<(?:strong|b)>${label}:?\\s*</(?:strong|b)>\\s*(.+?)(?=</li>|$)`, 'is'),
    // V3: colon outside the tag: <b>Label</b>: value
    new RegExp(`<(?:strong|b)>${label}</(?:strong|b)>:?\\s*(.+?)(?=</li>|$)`, 'is'),
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

  // ── V2 format: .rc-flavor-row > .rc-flavor-label + .rc-flavor-val ──
  if (html.includes('rc-flavor-row')) {
    // Match each flavor row: label text and value text
    const rowPattern = /rc-flavor-label[^>]*>([^<]+)<\/div>[\s\S]*?rc-flavor-val[^>]*>(\d+(?:\.\d+)?)<\/div>/gi;
    let match;
    while ((match = rowPattern.exec(html)) !== null) {
      const label = match[1].trim().toLowerCase();
      const value = parseFloat(match[2]);
      if (label.includes('sweetness')) profile.sweetness = value;
      else if (label.includes('rye') || label.includes('spice')) profile.ryeSpice = value;
      else if (label.includes('herbal') || label.includes('mint')) profile.herbalMint = value;
      else if (label.includes('fruit')) profile.fruit = value;
      else if (label.includes('oak') || label.includes('vanilla')) profile.oakVanilla = value;
      else if (label.includes('body')) profile.body = value;
      else if (label.includes('heat')) profile.heat = value;
      else if (label.includes('finish')) profile.finishLength = value;
    }
    if (Object.values(profile).some((v) => v !== null)) return profile;
  }

  // ── V1 format: <ul> with <strong>Label:</strong> N/10 ──
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

  // ── V2 format: .rc-tasting-card > h4 (Nose/Palate/Finish) + p (notes text) ──
  if (html.includes('rc-tasting-card')) {
    const cardPattern = /rc-tasting-card[^>]*>[\s\S]*?<h4[^>]*>([^<]+)<\/h4>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
    let match;
    while ((match = cardPattern.exec(html)) !== null) {
      const label = match[1].trim().toLowerCase();
      const text = stripHtml(match[2]).trim();
      if (label.includes('nose')) notes.nose = text;
      else if (label.includes('palate')) notes.palate = text;
      else if (label.includes('finish')) notes.finish = text;
    }
    if (notes.nose || notes.palate || notes.finish) return notes;
  }

  // ── V3 format: <p><b>Nose:</b></p><ul><li>item</li>...</ul> ──
  // (notes as list items rather than prose)
  const tastesLikeIdx = html.indexOf('Tastes Like');
  if (tastesLikeIdx > -1) {
    const searchSection = html.substring(tastesLikeIdx, tastesLikeIdx + 5000);
    for (const key of ['nose', 'palate', 'finish']) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      // Match: <b>Nose:</b></p> followed by <ul>...<li>items</li>...</ul>
      const listPattern = new RegExp(
        `<(?:b|strong)>${label}:?</(?:b|strong)>[\\s\\S]*?<ul>([\\s\\S]*?)</ul>`,
        'i'
      );
      const listMatch = searchSection.match(listPattern);
      if (listMatch) {
        // Extract all <li> contents and join them
        const liPattern = /<li>([\s\S]*?)<\/li>/gi;
        const items = [];
        let liMatch;
        while ((liMatch = liPattern.exec(listMatch[1])) !== null) {
          const text = stripHtml(liMatch[1]).trim();
          if (text) items.push(text);
        }
        if (items.length > 0) {
          notes[key] = items.join(', ');
        }
      }
    }
    if (notes.nose || notes.palate || notes.finish) return notes;
  }

  // ── V1 format: <strong>Nose:</strong> text ──
  let searchHtml = html;
  if (tastesLikeIdx > -1) {
    searchHtml = html.substring(tastesLikeIdx, tastesLikeIdx + 5000);
  }

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
  // V2 format: <div class="rc-comm-big-score">3.9</div>
  const v2Match = html.match(/rc-comm-big-score[^>]*>(\d+(?:\.\d+)?)\s*<\/div>/i);
  if (v2Match) return parseFloat(v2Match[1]);

  // V1 format: "Community Score: 3.7"
  const v1Match = html.match(/Community Score:\s*(\d+(?:\.\d+)?)/i);
  if (v1Match) return parseFloat(v1Match[1]);

  // V3 format: "<b>Score:</b> 4.5 (based on N ratings)" under Community Score heading
  const commIdx = html.indexOf('Community Score');
  if (commIdx > -1) {
    const section = html.substring(commIdx, commIdx + 500);
    const scoreMatch = section.match(/Score:?\s*<\/(?:b|strong)>\s*(\d+(?:\.\d+)?)/i);
    if (scoreMatch) return parseFloat(scoreMatch[1]);
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

  // ── V2 format: .rc-fact-item > .rc-fact-label + .rc-fact-value ──
  if (html.includes('rc-fact-item')) {
    const factPattern = /rc-fact-label[^>]*>([^<]+)<\/div>[\s\S]*?rc-fact-value[^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    while ((match = factPattern.exec(html)) !== null) {
      const label = match[1].trim().toLowerCase();
      const value = stripHtml(match[2]).trim();
      if (label.includes('proof') || label.includes('abv')) facts.proof = value;
      else if (label === 'age') facts.age = value;
      else if (label.includes('mash')) facts.mashBill = value;
      else if (label.includes('price')) {
        facts.typicalPrice = value;
        const priceMatch = value.match(/\$(\d+(?:\.\d+)?)/);
        if (priceMatch) facts.retailPriceNum = parseFloat(priceMatch[1]);
      }
      else if (label.includes('type') || label.includes('what')) facts.whatItIs = value;
    }
    if (facts.proof || facts.age || facts.mashBill) return facts;
  }

  // ── V1/V3 format: <strong>Label:</strong> or <b>Label</b>: value in <ul>/<li> ──
  // V1 uses "Quick Facts", V3 uses "At-a-glance"
  let factsIdx = html.indexOf('Quick Facts');
  if (factsIdx === -1) factsIdx = html.indexOf('At-a-glance');
  if (factsIdx === -1) return facts;

  const sectionEnd = html.indexOf('</ul>', factsIdx);
  if (sectionEnd === -1) return facts;

  const section = html.substring(factsIdx, sectionEnd + 5);

  facts.whatItIs = extractAfterLabel(section, 'What it is');
  facts.proof = extractAfterLabel(section, 'Proof/ABV') || extractAfterLabel(section, 'Proof');
  facts.age = extractAfterLabel(section, 'Age');
  facts.mashBill = extractAfterLabel(section, 'Mash bill') || extractAfterLabel(section, 'Mashbill');

  const priceText = extractAfterLabel(section, 'Typical price') || extractAfterLabel(section, 'Price');
  if (priceText) {
    facts.typicalPrice = priceText;
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
 * Supports both REST API format (body_html, images array) and
 * GraphQL Storefront API format (descriptionHtml, images.edges).
 */
function transformToTastingProduct(shopifyProduct) {
  if (!shopifyProduct) return null;

  // Handle both REST (body_html) and GraphQL (descriptionHtml) formats
  const html = shopifyProduct.descriptionHtml || shopifyProduct.body_html || '';

  // Handle both REST (images array) and GraphQL (images.edges) formats
  let image = null;
  if (shopifyProduct.images?.edges?.[0]?.node) {
    // GraphQL format
    const node = shopifyProduct.images.edges[0].node;
    image = { url: node.url, alt: node.altText };
  } else if (shopifyProduct.images?.[0]) {
    // REST format
    const img = shopifyProduct.images[0];
    image = { url: img.src, alt: img.alt || shopifyProduct.title };
  }

  // Handle price from REST (variants[0].price) or GraphQL (priceRange)
  const restPrice = shopifyProduct.variants?.[0]?.price
    ? parseFloat(shopifyProduct.variants[0].price)
    : null;
  const graphqlPrice = shopifyProduct.priceRange?.minVariantPrice?.amount
    ? parseFloat(shopifyProduct.priceRange.minVariantPrice.amount)
    : null;

  // Handle tags — REST returns array of strings, GraphQL also returns array
  const tags = shopifyProduct.tags || [];

  // Handle ID — REST returns numeric, GraphQL returns gid://shopify/Product/xxx
  // Normalize to gid format for consistency
  const id = typeof shopifyProduct.id === 'number'
    ? `gid://shopify/Product/${shopifyProduct.id}`
    : shopifyProduct.id;

  // Parse all structured data from HTML
  const flavorProfile = parseFlavorProfile(html);
  const tastingNotes = parseTastingNotes(html);
  const communityScore = parseCommunityScore(html);
  const quickFacts = parseQuickFacts(html);

  // Extract individual note keywords for the pill-box game
  const noseNotes = extractNoteKeywords(tastingNotes.nose);
  const palateNotes = extractNoteKeywords(tastingNotes.palate);

  return {
    id,
    title: shopifyProduct.title,
    handle: shopifyProduct.handle,
    url: `https://ryecentral.com/products/${shopifyProduct.handle}`,
    image,
    vendor: shopifyProduct.vendor || null,
    tags,

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
      retailPrice: quickFacts.retailPriceNum || restPrice || graphqlPrice || null,
      distillery: shopifyProduct.vendor || null,
      whatItIs: quickFacts.whatItIs,
    },
  };
}

// ── Public API ───────────────────────────────────────────

/**
 * Get all review products, transformed for the tasting app.
 * Uses the public REST collection endpoint (works for all Online Store products).
 * Falls back to the Storefront GraphQL API if the REST fetch fails.
 */
async function getAllTastingProducts() {
  try {
    // Primary: fetch from the public collection REST endpoint
    const restProducts = await getCollectionProductsREST();
    return restProducts.map(transformToTastingProduct).filter(Boolean);
  } catch (err) {
    console.warn('REST collection fetch failed, falling back to Storefront GraphQL:', err.message);

    // Fallback: use the Storefront GraphQL API
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
}

module.exports = {
  storefrontQuery,
  getReviewProducts,
  getCollectionProductsREST,
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
