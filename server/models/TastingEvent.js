/**
 * TastingEvent Model (in-memory for home use)
 *
 * For a home tasting app, SQLite or a full DB is overkill.
 * We keep events in memory during the session. Could persist to JSON file if needed.
 */

const { v4: uuidv4 } = require('uuid');

// In-memory store
const events = new Map();

class TastingEvent {
  constructor({ adminId, name }) {
    this.id = uuidv4();
    this.adminId = adminId;
    this.name = name || 'Rye Tasting Night';
    this.createdAt = new Date().toISOString();
    this.status = 'setup'; // setup | active | scoring | complete | ended

    // Bottles selected by admin (array of transformed tasting products)
    this.bottles = [];

    // Letter assignment: bottles[0] = 'A', bottles[1] = 'B', etc.
    this.currentBottleIndex = -1; // -1 = not started

    // Prizes
    this.prizes = []; // [{ place: 1, description: "Bottle of Eagle Rare Rye" }]

    // Connected guests
    this.guests = new Map(); // guestId -> { id, name, joinedAt, connected: bool }

    // Guest responses: guestId -> bottleLetter -> { noseNotes, palateNotes, flavorProfile, priceGuess, bottleGuess, rating, freeNotes }
    this.responses = new Map();

    // Final scores: guestId -> { total, perBottle: { A: score, B: score, ... } }
    this.scores = new Map();

    // Invite code (short, easy to share)
    this.inviteCode = this._generateInviteCode();

    // Email tracking for review reminders
    this.guestEmails = new Map();       // guestId -> email
    this.reviewsSubmitted = new Map();  // guestId -> Set of bottle letters
    this.remindersSent = new Map();     // 'guestId:1' or 'guestId:2' -> timestamp
  }

  _generateInviteCode() {
    // 6-character alphanumeric code
    return uuidv4().substring(0, 6).toUpperCase();
  }

  // ── Bottle Management ──────────────────────────────────

  addBottle(product) {
    const letter = String.fromCharCode(65 + this.bottles.length); // A, B, C...
    this.bottles.push({
      letter,
      product,
      revealed: false,
    });
    return letter;
  }

  removeBottle(letter) {
    this.bottles = this.bottles.filter((b) => b.letter !== letter);
    // Re-letter remaining bottles
    this.bottles.forEach((b, i) => {
      b.letter = String.fromCharCode(65 + i);
    });
  }

  getCurrentBottle() {
    if (this.currentBottleIndex < 0 || this.currentBottleIndex >= this.bottles.length) {
      return null;
    }
    return this.bottles[this.currentBottleIndex];
  }

  advanceToNextBottle() {
    if (this.currentBottleIndex < this.bottles.length - 1) {
      this.currentBottleIndex++;
      return this.getCurrentBottle();
    }
    return null; // All bottles done
  }

  startTasting() {
    this.status = 'active';
    this.currentBottleIndex = 0;
    return this.getCurrentBottle();
  }

  // ── Prize Management ──────────────────────────────────

  setPrizes(prizes) {
    // prizes: [{ place: 1, description: "..." }, ...]
    this.prizes = prizes.sort((a, b) => a.place - b.place);
  }

  // ── Guest Management ──────────────────────────────────

  addGuest(name) {
    const id = uuidv4();
    const guest = { id, name, joinedAt: new Date().toISOString(), connected: true };
    this.guests.set(id, guest);
    this.responses.set(id, {});
    return guest;
  }

  removeGuest(guestId) {
    this.guests.delete(guestId);
    this.responses.delete(guestId);
  }

  setGuestConnected(guestId, connected) {
    const guest = this.guests.get(guestId);
    if (guest) guest.connected = connected;
  }

  getGuests() {
    return Array.from(this.guests.values());
  }

  // ── Email & Review Tracking ────────────────────────────

  setGuestEmail(guestId, email) {
    if (email) {
      this.guestEmails.set(guestId, email.toLowerCase().trim());
    }
  }

  markReviewSubmitted(guestId, bottleLetter) {
    if (!this.reviewsSubmitted.has(guestId)) {
      this.reviewsSubmitted.set(guestId, new Set());
    }
    this.reviewsSubmitted.get(guestId).add(bottleLetter);
  }

  getUnreviewedGuests() {
    const result = [];
    for (const [guestId, guest] of this.guests) {
      const email = this.guestEmails.get(guestId);
      if (!email) continue;
      const submitted = this.reviewsSubmitted.get(guestId) || new Set();
      const revealed = this.bottles.filter((b) => b.revealed);
      const unreviewed = revealed.filter((b) => !submitted.has(b.letter));
      if (unreviewed.length > 0) {
        result.push({ guestId, name: guest.name, email, unreviewedCount: unreviewed.length });
      }
    }
    return result;
  }

  // ── Response Management ────────────────────────────────

  saveResponse(guestId, bottleLetter, response) {
    if (!this.responses.has(guestId)) {
      this.responses.set(guestId, {});
    }
    this.responses.get(guestId)[bottleLetter] = {
      ...response,
      submittedAt: new Date().toISOString(),
    };
  }

  getResponse(guestId, bottleLetter) {
    return this.responses.get(guestId)?.[bottleLetter] || null;
  }

  getAllResponsesForBottle(bottleLetter) {
    const result = {};
    for (const [guestId, bottles] of this.responses) {
      if (bottles[bottleLetter]) {
        result[guestId] = bottles[bottleLetter];
      }
    }
    return result;
  }

  hasAllGuestsResponded(bottleLetter) {
    for (const [guestId, guest] of this.guests) {
      if (guest.connected && !this.responses.get(guestId)?.[bottleLetter]) {
        return false;
      }
    }
    return true;
  }

  // ── Scoring ────────────────────────────────────────────

  calculateScores() {
    this.scores.clear();

    for (const [guestId] of this.guests) {
      const guestResponses = this.responses.get(guestId) || {};
      let totalScore = 0;
      const perBottle = {};

      for (const bottle of this.bottles) {
        const response = guestResponses[bottle.letter];
        if (!response) {
          perBottle[bottle.letter] = 0;
          continue;
        }

        const bottleScore = this._scoreBottle(response, bottle.product);
        perBottle[bottle.letter] = bottleScore;
        totalScore += bottleScore;
      }

      this.scores.set(guestId, { total: totalScore, perBottle });
    }

    return this.getLeaderboard();
  }

  _scoreBottle(response, product) {
    let score = 0;
    const community = product.community;

    // 1. Nose notes accuracy (max 20 points)
    score += this._scoreNotes(response.noseNotes || [], community.noseNotes || [], 20);

    // 2. Palate notes accuracy (max 20 points)
    score += this._scoreNotes(response.palateNotes || [], community.palateNotes || [], 20);

    // 3. Flavor profile closeness (max 30 points — 5 per slider)
    score += this._scoreFlavorProfile(response.flavorProfile || {}, community.flavorProfile || {}, 30);

    // 4. Price guess closeness (max 10 points)
    score += this._scorePriceGuess(response.priceGuess, product.details.retailPrice, 10);

    // 5. Correct bottle identification (max 15 points)
    if (response.bottleGuess === product.handle || response.bottleGuess === product.title) {
      score += 15;
    }

    // 6. Rating closeness to community score (max 5 points)
    score += this._scoreRating(response.rating, community.score, 5);

    return Math.round(score * 100) / 100;
  }

  _scoreNotes(userNotes, communityNotes, maxPoints) {
    if (!communityNotes.length) return 0;
    const communitySet = new Set(communityNotes.map((n) => n.toLowerCase()));
    let correct = 0;
    let incorrect = 0;

    userNotes.forEach((note) => {
      if (communitySet.has(note.toLowerCase())) {
        correct++;
      } else {
        incorrect++;
      }
    });

    // Each wrong pick costs 25% of max — selecting all pills is a losing strategy
    const accuracy = communityNotes.length > 0
      ? (correct / communityNotes.length) - (incorrect * 0.25 / communityNotes.length)
      : 0;

    return Math.max(0, accuracy * maxPoints);
  }

  _scoreFlavorProfile(userProfile, communityProfile, maxPoints) {
    // 8 flavor profile attributes matching RyeCentral review pages
    const keys = [
      'sweetness', 'ryeSpice', 'herbalMint', 'fruit',
      'oakVanilla', 'body', 'heat', 'finishLength',
    ];
    const validKeys = keys.filter((k) => communityProfile[k] != null);
    if (!validKeys.length) return 0;

    const pointsPerKey = maxPoints / validKeys.length;
    let total = 0;

    validKeys.forEach((key) => {
      const diff = Math.abs((userProfile[key] || 5) - communityProfile[key]);
      // Max diff is 9 (1 vs 10). Closer = more points.
      const keyScore = Math.max(0, 1 - diff / 9) * pointsPerKey;
      total += keyScore;
    });

    return total;
  }

  _scorePriceGuess(guessedPrice, actualPrice, maxPoints) {
    if (!guessedPrice || !actualPrice) return 0;
    const diff = Math.abs(guessedPrice - actualPrice);
    const percentOff = diff / actualPrice;
    // Within 10% = full points, linear decay after
    return Math.max(0, (1 - percentOff) * maxPoints);
  }

  _scoreRating(userRating, communityRating, maxPoints) {
    if (userRating == null || communityRating == null) return 0;
    const diff = Math.abs(userRating - communityRating);
    // Max diff is 4 (1 vs 5). Closer = more points.
    return Math.max(0, (1 - diff / 4) * maxPoints);
  }

  /**
   * Calculate partial/live scores based on responses submitted so far.
   * Unlike calculateScores(), this only scores bottles up to currentBottleIndex
   * and returns a leaderboard sorted by running total.
   */
  calculatePartialScores() {
    const leaderboard = [];

    for (const [guestId, guest] of this.guests) {
      const guestResponses = this.responses.get(guestId) || {};
      let totalScore = 0;
      const perBottle = {};

      // Only score bottles that have been presented so far
      for (let i = 0; i <= this.currentBottleIndex && i < this.bottles.length; i++) {
        const bottle = this.bottles[i];
        const response = guestResponses[bottle.letter];
        if (!response) {
          perBottle[bottle.letter] = 0;
          continue;
        }
        const bottleScore = this._scoreBottle(response, bottle.product);
        perBottle[bottle.letter] = bottleScore;
        totalScore += bottleScore;
      }

      leaderboard.push({
        guestId,
        guestName: guest?.name || 'Unknown',
        total: totalScore,
        perBottle,
        bottlesScored: Object.keys(guestResponses).length,
      });
    }

    return leaderboard.sort((a, b) => b.total - a.total);
  }

  getLeaderboard() {
    const leaderboard = [];
    for (const [guestId, score] of this.scores) {
      const guest = this.guests.get(guestId);
      leaderboard.push({
        guestId,
        guestName: guest?.name || 'Unknown',
        total: score.total,
        perBottle: score.perBottle,
      });
    }
    return leaderboard.sort((a, b) => b.total - a.total);
  }

  // ── Serialization ──────────────────────────────────────

  toJSON(forRole = 'admin') {
    const base = {
      id: this.id,
      name: this.name,
      status: this.status,
      inviteCode: this.inviteCode,
      currentBottleIndex: this.currentBottleIndex,
      bottleCount: this.bottles.length,
      guestCount: this.guests.size,
      prizes: this.prizes,
      createdAt: this.createdAt,
    };

    if (forRole === 'admin') {
      base.bottles = this.bottles;
      base.guests = this.getGuests();
    } else {
      // Guests only see letter labels and current bottle (no product details until reveal)
      base.bottles = this.bottles.map((b) => ({
        letter: b.letter,
        revealed: b.revealed,
        product: b.revealed ? b.product : null,
      }));
    }

    return base;
  }
}

// ── Store Operations ──────────────────────────────────────

function createEvent(data) {
  const event = new TastingEvent(data);
  events.set(event.id, event);
  return event;
}

function getEvent(eventId) {
  return events.get(eventId) || null;
}

function getEventByInviteCode(code) {
  for (const event of events.values()) {
    if (event.inviteCode === code.toUpperCase()) return event;
  }
  return null;
}

function deleteEvent(eventId) {
  events.delete(eventId);
}

function getAllEvents() {
  return Array.from(events.values());
}

module.exports = {
  TastingEvent,
  createEvent,
  getEvent,
  getEventByInviteCode,
  deleteEvent,
  getAllEvents,
};
