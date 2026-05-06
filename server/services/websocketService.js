/**
 * WebSocket Service
 * Handles real-time communication between admin and guests during a tasting event.
 *
 * Message types:
 *   Admin → Server → All Guests:
 *     - event:started        → Tasting has begun, here's bottle A
 *     - bottle:next          → Move to the next bottle
 *     - bottle:reveal        → Reveal a bottle's identity
 *     - event:scoring        → All bottles done, calculating scores
 *     - event:complete       → Winners announced, celebration time
 *
 *   Guest → Server → Admin:
 *     - guest:joined         → A new guest connected
 *     - guest:response       → Guest submitted their tasting for a bottle
 *     - guest:favorite       → Guest picked their favorite bottle
 *
 *   Server → Individual:
 *     - sync:state           → Full state sync on (re)connect
 *     - error                → Error message
 */

const WebSocket = require('ws');
const { getEvent } = require('../models/TastingEvent');

// Track connections: eventId -> { admin: ws, guests: Map<guestId, ws> }
const rooms = new Map();

function setupWebSocket(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    // Parse connection params from URL: /ws?eventId=xxx&role=admin|guest&guestId=xxx
    const url = new URL(req.url, `http://${req.headers.host}`);
    const eventId = url.searchParams.get('eventId');
    const role = url.searchParams.get('role');
    const guestId = url.searchParams.get('guestId');

    if (!eventId || !role) {
      ws.send(JSON.stringify({ type: 'error', message: 'Missing eventId or role' }));
      ws.close();
      return;
    }

    const event = getEvent(eventId);
    if (!event) {
      ws.send(JSON.stringify({ type: 'error', message: 'Event not found' }));
      ws.close();
      return;
    }

    // Initialize room if needed
    if (!rooms.has(eventId)) {
      rooms.set(eventId, { admin: null, guests: new Map() });
    }
    const room = rooms.get(eventId);

    if (role === 'admin') {
      room.admin = ws;
      ws.role = 'admin';
      ws.eventId = eventId;

      // Send full state to admin (include leaderboard if event is complete)
      const adminPayload = {
        type: 'sync:state',
        event: event.toJSON('admin'),
      };
      if (event.status === 'complete') {
        adminPayload.leaderboard = event.getLeaderboard();
        adminPayload.prizes = event.prizes;
      }
      sendToClient(ws, adminPayload);
    } else if (role === 'guest' && guestId) {
      room.guests.set(guestId, ws);
      ws.role = 'guest';
      ws.guestId = guestId;
      ws.eventId = eventId;

      event.setGuestConnected(guestId, true);

      // Send state to guest (include leaderboard if event is complete,
      // include currentBottle if event is active so reconnects work)
      const guestPayload = {
        type: 'sync:state',
        event: event.toJSON('guest'),
        guestId,
      };
      if (event.status === 'active') {
        guestPayload.currentBottle = sanitizeBottleForGuest(event.getCurrentBottle(), event);
      }
      if (event.status === 'complete') {
        guestPayload.leaderboard = event.getLeaderboard();
        guestPayload.prizes = event.prizes;
      }
      sendToClient(ws, guestPayload);

      // Notify admin
      const guest = event.guests.get(guestId);
      sendToAdmin(room, {
        type: 'guest:joined',
        guest,
        guestCount: event.guests.size,
      });
    }

    // Handle incoming messages
    ws.on('message', (raw) => {
      try {
        const message = JSON.parse(raw);
        handleMessage(ws, room, event, message);
      } catch (e) {
        sendToClient(ws, { type: 'error', message: 'Invalid message format' });
      }
    });

    // Handle disconnect
    ws.on('close', () => {
      if (ws.role === 'admin') {
        room.admin = null;
      } else if (ws.role === 'guest' && ws.guestId) {
        room.guests.delete(ws.guestId);
        event.setGuestConnected(ws.guestId, false);

        // Notify admin of disconnect
        sendToAdmin(room, {
          type: 'guest:disconnected',
          guestId: ws.guestId,
          guestCount: event.guests.size,
        });
      }

      // Clean up empty rooms
      if (!room.admin && room.guests.size === 0) {
        rooms.delete(eventId);
      }
    });
  });

  return wss;
}

function handleMessage(ws, room, event, message) {
  switch (message.type) {
    // ── Admin Actions ──────────────────────────────────
    case 'event:start':
      if (ws.role !== 'admin') return;
      event.startTasting();
      broadcastToGuests(room, {
        type: 'event:started',
        currentBottle: sanitizeBottleForGuest(event.getCurrentBottle(), event),
      });
      sendToAdmin(room, {
        type: 'sync:state',
        event: event.toJSON('admin'),
      });
      break;

    case 'bottle:next':
      if (ws.role !== 'admin') return;
      const next = event.advanceToNextBottle();
      if (next) {
        broadcastToGuests(room, {
          type: 'bottle:next',
          currentBottle: sanitizeBottleForGuest(next, event),
          bottleIndex: event.currentBottleIndex,
        });
        sendToAdmin(room, {
          type: 'sync:state',
          event: event.toJSON('admin'),
        });
      } else {
        event.status = 'scoring';
        broadcastToAll(room, { type: 'event:scoring' });
      }
      break;

    case 'bottle:reveal':
      if (ws.role !== 'admin') return;
      const { letter } = message;
      const bottle = event.bottles.find((b) => b.letter === letter);
      if (bottle) {
        bottle.revealed = true;
        broadcastToGuests(room, {
          type: 'bottle:reveal',
          letter,
          product: bottle.product,
        });
      }
      break;

    case 'event:calculate-scores':
      if (ws.role !== 'admin') return;
      const leaderboard = event.calculateScores();
      event.status = 'complete';
      // Auto-reveal all bottles now that tasting is over
      event.bottles.forEach((b) => { b.revealed = true; });
      // Send revealed bottles (with product details) to all guests
      const revealedBottles = event.bottles.map((b) => ({
        letter: b.letter,
        revealed: true,
        product: b.product,
      }));
      broadcastToAll(room, {
        type: 'event:complete',
        leaderboard,
        prizes: event.prizes,
        bottles: revealedBottles,
      });
      break;

    // ── Guest Actions ──────────────────────────────────
    case 'guest:response':
      if (ws.role !== 'guest') return;
      event.saveResponse(ws.guestId, message.bottleLetter, message.response);
      // Calculate live scores for all guests who have responded so far
      const liveLeaderboard = event.calculatePartialScores();
      // Notify admin with response info AND live leaderboard
      sendToAdmin(room, {
        type: 'guest:response',
        guestId: ws.guestId,
        guestName: event.guests.get(ws.guestId)?.name,
        bottleLetter: message.bottleLetter,
        allResponded: event.hasAllGuestsResponded(message.bottleLetter),
        liveLeaderboard,
      });
      break;

    case 'guest:favorite':
      if (ws.role !== 'guest') return;
      sendToAdmin(room, {
        type: 'guest:favorite',
        guestId: ws.guestId,
        guestName: event.guests.get(ws.guestId)?.name,
        favoriteLetter: message.favoriteLetter,
        reason: message.reason,
      });
      break;

    default:
      sendToClient(ws, { type: 'error', message: `Unknown message type: ${message.type}` });
  }
}

/**
 * Strip product details from bottle data for guests (blind tasting!)
 */
function sanitizeBottleForGuest(bottle, event) {
  if (!bottle) return null;

  const community = bottle.product?.community || {};

  // Build pill-box notes: real notes + 50% random decoys
  const noseNotes = buildPillBoxNotes(community.noseNotes || []);
  const palateNotes = buildPillBoxNotes(community.palateNotes || []);

  // List of all bottle names for the "guess which bottle" dropdown
  const bottleOptions = event.bottles.map((b) => b.product.title);

  return {
    letter: bottle.letter,
    noseNotePills: noseNotes,
    palateNotePills: palateNotes,
    bottleOptions, // All bottle names for guessing
    flavorProfileKeys: ['sweetness', 'ryeSpice', 'herbalMint', 'fruit', 'oakVanilla', 'body', 'heat', 'finishLength'],
  };
}

/**
 * Mix real community notes with random decoy notes.
 * Returns shuffled array of { text, isDecoy } — but isDecoy is NOT sent to client!
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

function buildPillBoxNotes(realNotes) {
  // Common rye whiskey tasting note vocabulary for decoys
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

  // Get decoys (not in real notes)
  const available = allPossibleNotes.filter((n) => !realSet.has(n));

  // Fixed total of 8-10 pills: all real notes + decoys to fill the rest
  const TARGET_TOTAL = 9; // sweet spot between 8 and 10
  const realCount = realNotes.length;

  let decoyCount;
  if (realCount >= 10) {
    // If product has 10+ real notes, include them all, no decoys needed
    decoyCount = 0;
  } else if (realCount >= 8) {
    // Already in the 8-10 range, add 0-1 decoys to reach ~10
    decoyCount = Math.min(10 - realCount, available.length);
  } else {
    // Pad with decoys to reach target total (9)
    decoyCount = Math.min(TARGET_TOTAL - realCount, available.length);
  }

  const decoys = shuffleArray(available).slice(0, decoyCount);

  // Combine and shuffle — only send the text, NOT whether it's a decoy
  const allNotes = [
    ...realNotes.map((text) => ({ text, emoji: getNoteMeta(text).emoji, desc: getNoteMeta(text).desc })),
    ...decoys.map((text) => ({ text, emoji: getNoteMeta(text).emoji, desc: getNoteMeta(text).desc })),
  ];

  return shuffleArray(allNotes);
}

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ── Send Helpers ──────────────────────────────────────────

function sendToClient(ws, data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendToAdmin(room, data) {
  sendToClient(room.admin, data);
}

function broadcastToGuests(room, data) {
  for (const [, ws] of room.guests) {
    sendToClient(ws, data);
  }
}

function broadcastToAll(room, data) {
  sendToAdmin(room, data);
  broadcastToGuests(room, data);
}

module.exports = { setupWebSocket };
