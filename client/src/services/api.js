/**
 * API Service — talks to the Express backend at /api/*
 * In dev the CRA proxy forwards to localhost:3001.
 */

const BASE = '/api';

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || res.statusText;
    throw new Error(msg);
  }
  return data;
}

// ── Products ─────────────────────────────────────────────

export function getProducts() {
  return request('/products');
}

export function getProductByHandle(handle) {
  return request(`/products/${handle}`);
}

export function refreshProducts() {
  return request('/products/refresh', { method: 'POST' });
}

// ── Events ───────────────────────────────────────────────

export function createEvent(name) {
  return request('/events', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

export function getEvent(eventId, role = 'admin') {
  return request(`/events/${eventId}?role=${role}`);
}

export function getEvents() {
  return request('/events');
}

export function deleteEvent(eventId) {
  return request(`/events/${eventId}`, { method: 'DELETE' });
}

export function endEvent(eventId) {
  return request(`/events/${eventId}/end`, { method: 'POST' });
}

// Bottles
export function addBottle(eventId, product) {
  return request(`/events/${eventId}/bottles`, {
    method: 'POST',
    body: JSON.stringify({ product }),
  });
}

export function removeBottle(eventId, letter) {
  return request(`/events/${eventId}/bottles/${letter}`, { method: 'DELETE' });
}

// Prizes
export function setPrizes(eventId, prizes) {
  return request(`/events/${eventId}/prizes`, {
    method: 'POST',
    body: JSON.stringify({ prizes }),
  });
}

// Event flow
export function startEvent(eventId) {
  return request(`/events/${eventId}/start`, { method: 'POST' });
}

export function nextBottle(eventId) {
  return request(`/events/${eventId}/next-bottle`, { method: 'POST' });
}

export function calculateScores(eventId) {
  return request(`/events/${eventId}/calculate-scores`, { method: 'POST' });
}

// Guest join
export function joinByCode(inviteCode, guestName, guestId = null) {
  return request('/events/join-by-code', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, guestName, guestId }),
  });
}

export function getQrCode(eventId) {
  return `${BASE}/events/${eventId}/qr`;
}

// ── Judge.me Reviews ──────────────────────────────────────────

export function previewReview(eventId, guestId, bottleLetter) {
  return request(`/events/${eventId}/review-preview`, {
    method: 'POST',
    body: JSON.stringify({ guestId, bottleLetter }),
  });
}

export function submitReview(eventId, { guestId, bottleLetter, guestEmail, editedTitle, editedBody }) {
  return request(`/events/${eventId}/submit-review`, {
    method: 'POST',
    body: JSON.stringify({ guestId, bottleLetter, guestEmail, editedTitle, editedBody }),
  });
}

// ── Host Feedback ──────────────────────────────────────────

export function submitFeedback(eventId, { rating, comment }) {
  return request(`/events/${eventId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}
