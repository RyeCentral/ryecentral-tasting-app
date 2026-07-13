/**
 * Pill Box Service — Generate nose/palate note pills with decoys for tastings.
 *
 * Shared by both WebSocket (group tasting) and REST (solo tasting) flows.
 * Pills are cached on the bottle object to prevent refresh-cheating.
 */

// Emoji icons and descriptions for tasting note pills
const NOTE_META = {
  'caramel': { emoji: '🍮', desc: 'Rich, sweet, buttery burnt sugar' },
  'vanilla': { emoji: '🍦', desc: 'Sweet, creamy, warm extract note' },
  'cinnamon': { emoji: '🫚', desc: 'Warm, sweet bark spice' },
  'black pepper': { emoji: '🌶️', desc: 'Sharp, biting heat on the tongue' },
  'clove': { emoji: '🫚', desc: 'Intense warm spice, slightly numbing' },
  'nutmeg': { emoji: '🫚', desc: 'Warm, nutty, slightly sweet spice' },
  'oak': { emoji: '🪵', desc: 'Woody, dry, tannic — from barrel aging' },
  'honey': { emoji: '🍯', desc: 'Sweet, floral, golden nectar' },
  'maple syrup': { emoji: '🍁', desc: 'Rich, earthy sweetness' },
  'brown sugar': { emoji: '🟫', desc: 'Deep molasses-tinged sweetness' },
  'toffee': { emoji: '🍬', desc: 'Buttery, caramelized sugar candy' },
  'butterscotch': { emoji: '🍬', desc: 'Creamy, rich butter-and-sugar' },
  'cherry': { emoji: '🍒', desc: 'Sweet-tart stone fruit' },
  'apple': { emoji: '🍎', desc: 'Crisp, fresh fruit — green or red' },
  'pear': { emoji: '🍐', desc: 'Soft, sweet, juicy fruit' },
  'dried fruit': { emoji: '🍇', desc: 'Concentrated, sweet, raisin-like' },
  'raisin': { emoji: '🍇', desc: 'Sun-dried grape, deep sweetness' },
  'citrus zest': { emoji: '🍋', desc: 'Bright, tangy, aromatic peel oils' },
  'orange peel': { emoji: '🍊', desc: 'Bitter-sweet, aromatic citrus rind' },
  'dark chocolate': { emoji: '🍫', desc: 'Bitter, rich, cocoa-forward' },
  'cocoa': { emoji: '🍫', desc: 'Dry, roasted chocolate powder' },
  'leather': { emoji: '🪶', desc: 'Earthy, musky, aged tannin note' },
  'tobacco': { emoji: '🍂', desc: 'Dried leaf, sweet pipe tobacco aroma' },
  'smoke': { emoji: '💨', desc: 'Campfire, charred wood, ash' },
  'char': { emoji: '🔥', desc: 'Deep charcoal, blackened barrel interior' },
  'mint': { emoji: '🌿', desc: 'Cool, refreshing menthol note' },
  'herbal': { emoji: '🌿', desc: 'Green, leafy, garden-herb character' },
  'dill': { emoji: '🌿', desc: 'Fresh, grassy — classic young rye note' },
  'anise': { emoji: '⭐', desc: 'Sweet licorice, star anise warmth' },
  'licorice': { emoji: '⭐', desc: 'Dark, sweet, root-like flavor' },
  'baking spice': { emoji: '🧁', desc: 'Cinnamon-nutmeg-allspice blend' },
  'allspice': { emoji: '🫚', desc: 'Tastes like clove+cinnamon+nutmeg combined' },
  'ginger': { emoji: '🫚', desc: 'Spicy, zesty, warming root' },
  'floral': { emoji: '🌸', desc: 'Light, perfumy, flower petal notes' },
  'rose': { emoji: '🌹', desc: 'Fragrant, sweet flower petal' },
  'grass': { emoji: '🌾', desc: 'Fresh-cut, green, hay-like' },
  'grain': { emoji: '🌾', desc: 'Cereal, raw grain, bready' },
  'bread': { emoji: '🍞', desc: 'Yeasty, warm, baked dough' },
  'corn': { emoji: '🌽', desc: 'Sweet, starchy, cornbread-like' },
  'rye spice': { emoji: '🌶️', desc: 'Peppery bite unique to rye grain' },
  'white pepper': { emoji: '⚪', desc: 'Sharp but more delicate than black pepper' },
  'molasses': { emoji: '🫗', desc: 'Dark, thick, bittersweet sugar' },
  'walnut': { emoji: '🥜', desc: 'Slightly bitter, earthy nut' },
  'almond': { emoji: '🥜', desc: 'Sweet, marzipan-like nut' },
  'pecan': { emoji: '🥜', desc: 'Buttery, rich, toasted nut' },
  'coconut': { emoji: '🥥', desc: 'Tropical, creamy, sweet' },
  'banana': { emoji: '🍌', desc: 'Sweet, fruity ester note' },
  'tropical fruit': { emoji: '🥭', desc: 'Mango, pineapple, passion fruit' },
  'stone fruit': { emoji: '🍑', desc: 'Peach, apricot, plum family' },
  'peach': { emoji: '🍑', desc: 'Sweet, juicy, fuzzy stone fruit' },
  'apricot': { emoji: '🍑', desc: 'Tangy-sweet, delicate stone fruit' },
  'plum': { emoji: '🫐', desc: 'Rich, dark, sweet-tart fruit' },
  'fig': { emoji: '🫐', desc: 'Dense, jammy, honey-sweet fruit' },
  'date': { emoji: '🫐', desc: 'Very sweet, chewy, caramel-like dried fruit' },
  'sage': { emoji: '🌿', desc: 'Earthy, slightly peppery herb with musky aroma' },
  'eucalyptus': { emoji: '🌿', desc: 'Menthol-forward, medicinal cooling sensation' },
  'cedar': { emoji: '🪵', desc: 'Aromatic wood, pencil shavings, dry' },
  'sandalwood': { emoji: '🪵', desc: 'Soft, creamy, exotic woodiness' },
};

function getNoteMeta(text) {
  const key = text.toLowerCase();
  return NOTE_META[key] || { emoji: '👃', desc: '' };
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Mix real community notes with random decoy notes.
 * Returns { pills: [...], realCount: N }
 * Pills contain { text, emoji, desc } — isDecoy is NOT included!
 */
function buildPillBoxNotes(realNotes) {
  const allPossibleNotes = [
    'caramel', 'vanilla', 'cinnamon', 'black pepper', 'clove', 'nutmeg',
    'oak', 'honey', 'maple syrup', 'brown sugar', 'toffee', 'butterscotch',
    'cherry', 'apple', 'pear', 'dried fruit', 'raisin', 'citrus zest',
    'orange peel', 'dark chocolate', 'cocoa', 'leather', 'tobacco', 'smoke',
    'char', 'mint', 'herbal', 'dill', 'anise', 'licorice',
    'baking spice', 'allspice', 'ginger', 'floral', 'rose', 'grass',
    'grain', 'bread', 'corn', 'rye spice', 'white pepper', 'molasses',
    'walnut', 'almond', 'pecan', 'coconut', 'banana', 'tropical fruit',
    'stone fruit', 'peach', 'apricot', 'plum', 'fig', 'date',
  ];

  const realSet = new Set(realNotes.map((n) => n.toLowerCase()));
  const available = allPossibleNotes.filter((n) => !realSet.has(n));

  const TARGET_TOTAL = 9;
  const realCount = realNotes.length;

  let decoyCount;
  if (realCount >= 10) {
    decoyCount = 0;
  } else if (realCount >= 8) {
    decoyCount = Math.min(10 - realCount, available.length);
  } else {
    decoyCount = Math.min(TARGET_TOTAL - realCount, available.length);
  }

  const decoys = shuffleArray(available).slice(0, decoyCount);

  const allNotes = [
    ...realNotes.map((text) => ({ text: text.toLowerCase(), emoji: getNoteMeta(text).emoji, desc: getNoteMeta(text).desc })),
    ...decoys.map((text) => ({ text: text.toLowerCase(), emoji: getNoteMeta(text).emoji, desc: getNoteMeta(text).desc })),
  ];

  return { pills: shuffleArray(allNotes), realCount: realNotes.length };
}

/**
 * Ensure a bottle has cached pills (nose + palate). Used by both
 * WebSocket (group) and REST (solo) flows. Idempotent — only generates once.
 */
function ensureBottlePills(bottle) {
  if (bottle._cachedPills) return;

  const community = bottle.product?.community || {};
  const nosePillData = buildPillBoxNotes(community.noseNotes || []);
  const palatePillData = buildPillBoxNotes(community.palateNotes || []);

  bottle._cachedPills = {
    noseNotePills: nosePillData.pills,
    noseRealCount: nosePillData.realCount,
    palateNotePills: palatePillData.pills,
    palateRealCount: palatePillData.realCount,
  };
}

module.exports = {
  buildPillBoxNotes,
  ensureBottlePills,
  getNoteMeta,
  shuffleArray,
  NOTE_META,
};
