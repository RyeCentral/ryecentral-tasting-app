/**
 * Event Routes — Create and manage tasting events
 */

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const config = require('../config/env');
const { createEvent, getEvent, getEventByInviteCode, getAllEvents, deleteEvent } = require('../models/TastingEvent');
const { previewReview, submitReview, submitStoreReview } = require('../services/judgeService');

/**
 * POST /api/events
 * Create a new tasting event
 */
router.post('/', (req, res) => {
  const { name, adminId } = req.body;
  const event = createEvent({ name, adminId: adminId || 'admin' });
  res.status(201).json({ event: event.toJSON('admin') });
});

/**
 * GET /api/events
 * List all events (admin)
 */
router.get('/', (req, res) => {
  const events = getAllEvents().map((e) => e.toJSON('admin'));
  res.json({ events });
});

/**
 * GET /api/events/:id
 * Get event details
 */
router.get('/:id', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const role = req.query.role || 'guest';
  res.json({ event: event.toJSON(role) });
});

/**
 * POST /api/events/:id/bottles
 * Add a bottle to the tasting event
 */
router.post('/:id/bottles', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { product } = req.body;
  const letter = event.addBottle(product);
  res.json({ letter, event: event.toJSON('admin') });
});

/**
 * DELETE /api/events/:id/bottles/:letter
 * Remove a bottle from the event
 */
router.delete('/:id/bottles/:letter', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  event.removeBottle(req.params.letter.toUpperCase());
  res.json({ event: event.toJSON('admin') });
});

/**
 * POST /api/events/:id/prizes
 * Set prizes for the event
 */
router.post('/:id/prizes', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  event.setPrizes(req.body.prizes || []);
  res.json({ event: event.toJSON('admin') });
});

/**
 * POST /api/events/:id/start
 * Start the tasting event
 */
router.post('/:id/start', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (event.bottles.length === 0) {
    return res.status(400).json({ error: 'Add at least one bottle before starting' });
  }

  const firstBottle = event.startTasting();
  res.json({ event: event.toJSON('admin'), currentBottle: firstBottle });
});

/**
 * POST /api/events/:id/next-bottle
 * Advance to the next bottle
 */
router.post('/:id/next-bottle', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const nextBottle = event.advanceToNextBottle();
  if (!nextBottle) {
    event.status = 'scoring';
    return res.json({ event: event.toJSON('admin'), allComplete: true });
  }

  res.json({ event: event.toJSON('admin'), currentBottle: nextBottle });
});

/**
 * POST /api/events/:id/join
 * Guest joins the event via invite code
 */
router.post('/:id/join', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { guestName } = req.body;
  if (!guestName) return res.status(400).json({ error: 'Guest name is required' });

  const guest = event.addGuest(guestName);
  res.json({ guest, event: event.toJSON('guest') });
});

/**
 * POST /api/events/join-by-code
 * Join an event using the invite code.
 * If guestId is provided, tries to rejoin as an existing guest first.
 */
router.post('/join-by-code', (req, res) => {
  const { inviteCode, guestName, guestId } = req.body;
  const event = getEventByInviteCode(inviteCode);
  if (!event) return res.status(404).json({ error: 'Invalid invite code' });

  // Try to rejoin as existing guest
  if (guestId) {
    const existingGuest = event.guests.get(guestId);
    if (existingGuest) {
      existingGuest.connected = true;
      return res.json({ guest: existingGuest, event: event.toJSON('guest'), rejoined: true });
    }
  }

  if (!guestName) return res.status(400).json({ error: 'Guest name is required' });

  const guest = event.addGuest(guestName);
  res.json({ guest, event: event.toJSON('guest') });
});

/**
 * GET /api/events/:id/qr
 * Generate QR code for the event invite link
 */
router.get('/:id/qr', async (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  // Auto-detect base URL from request if APP_URL not configured
  const baseUrl = config.APP_URL || `${req.protocol}://${req.get('host')}`;
  const inviteUrl = `${baseUrl}/join/${event.inviteCode}`;
  const qr = await QRCode.toDataURL(inviteUrl, { width: 300, margin: 2 });

  res.json({ qr, inviteUrl, inviteCode: event.inviteCode });
});

/**
 * POST /api/events/:id/responses
 * Save a guest's response for a bottle
 */
router.post('/:id/responses', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { guestId, bottleLetter, response } = req.body;
  event.saveResponse(guestId, bottleLetter, response);

  res.json({
    saved: true,
    allResponded: event.hasAllGuestsResponded(bottleLetter),
  });
});

/**
 * POST /api/events/:id/calculate-scores
 * Calculate final scores for all guests
 */
router.post('/:id/calculate-scores', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const leaderboard = event.calculateScores();
  event.status = 'complete';

  res.json({ leaderboard, prizes: event.prizes });
});

/**
 * POST /api/events/:id/review-preview
 * Preview what the Judge.me review will look like for a specific bottle
 */
router.post('/:id/review-preview', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { guestId, bottleLetter } = req.body;
  const response = event.getResponse(guestId, bottleLetter);
  if (!response) return res.status(404).json({ error: 'No response found for this bottle' });

  const bottle = event.bottles.find((b) => b.letter === bottleLetter);
  if (!bottle) return res.status(404).json({ error: 'Bottle not found' });

  const guest = event.guests.get(guestId);
  const preview = previewReview(response, bottle.product, guest?.name || 'Anonymous');

  res.json({
    preview,
    productTitle: bottle.product.title,
    bottleLetter,
  });
});

/**
 * POST /api/events/:id/submit-review
 * Submit a guest's tasting review to Judge.me for a specific bottle
 */
router.post('/:id/submit-review', async (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (!config.JUDGEME_API_TOKEN) {
    return res.status(500).json({ error: 'Judge.me API token not configured' });
  }

  const { guestId, bottleLetter, guestEmail, editedTitle, editedBody } = req.body;
  const response = event.getResponse(guestId, bottleLetter);
  if (!response) return res.status(404).json({ error: 'No response found for this bottle' });

  const bottle = event.bottles.find((b) => b.letter === bottleLetter);
  if (!bottle) return res.status(404).json({ error: 'Bottle not found' });

  const guest = event.guests.get(guestId);

  try {
    // Allow guest to override title/body from the preview
    const modifiedResponse = editedTitle || editedBody
      ? { ...response, _editedTitle: editedTitle, _editedBody: editedBody }
      : response;

    const result = await submitReview({
      apiToken: config.JUDGEME_API_TOKEN,
      response: modifiedResponse,
      product: bottle.product,
      guestName: guest?.name || 'Anonymous Taster',
      guestEmail: guestEmail || `${guestId}@tasting.ryecentral.com`,
      rating: response.rating,
    });

    // If guest provided edited title/body, use those
    if (editedTitle) result.title = editedTitle;
    if (editedBody) result.body = editedBody;

    res.json(result);
  } catch (err) {
    console.error('Judge.me submit error:', err);
    res.status(500).json({ error: 'Failed to submit review', message: err.message });
  }
});

/**
 * POST /api/events/:id/end
 * End/close an event (marks it as ended so it no longer appears in the active list)
 */
router.post('/:id/end', (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  event.status = 'ended';
  res.json({ event: event.toJSON('admin') });
});

/**
 * POST /api/events/:id/feedback
 * Submit host feedback about the tasting app experience
 */
router.post('/:id/feedback', async (req, res) => {
  const event = getEvent(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const { rating, comment, hostName, hostEmail } = req.body;
  console.log(`Host feedback for event "${event.name}" (${req.params.id}): ${rating}/5 stars${comment ? ` — "${comment}"` : ''}`);

  // Store feedback on the event
  event.hostFeedback = { rating, comment, submittedAt: new Date().toISOString() };

  // Also submit as a store-level Judge.me review
  if (config.JUDGEME_API_TOKEN) {
    try {
      const reviewTitle = `Home Tasting Event: ${event.name}`;
      const reviewBody = comment
        ? `Hosted a blind rye whiskey tasting event "${event.name}" using the RyeCentral Home Tasting App.\n\n${comment}`
        : `Hosted a blind rye whiskey tasting event "${event.name}" using the RyeCentral Home Tasting App.`;

      await submitStoreReview({
        apiToken: config.JUDGEME_API_TOKEN,
        name: hostName || 'Tasting Host',
        email: hostEmail || `host-${req.params.id}@tasting.ryecentral.com`,
        rating,
        title: reviewTitle,
        body: reviewBody,
      });
      console.log('Host feedback submitted to Judge.me as store review');
    } catch (err) {
      console.error('Judge.me store review error (non-critical):', err.message);
    }
  }

  res.json({ success: true });
});

/**
 * DELETE /api/events/:id
 * Delete an event
 */
router.delete('/:id', (req, res) => {
  deleteEvent(req.params.id);
  res.json({ deleted: true });
});

module.exports = router;
