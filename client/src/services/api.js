/**
 * API Service — talks to the Express backend at /api/*
 * In dev the CRA proxy forwards to localhost:3001.
 *
 * All authenticated requests include the JWT token from localStorage.
 */

const BASE = '/api';
const AUTH_STORAGE_KEY = 'rc_tasting_auth';

/**
 * Get the stored auth token (if any).
 */
function getAuthToken() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const { token } = JSON.parse(stored);
      return token;
    }
  } catch {
    // ignore
  }
  return null;
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;

  // Build headers — include auth token if available
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers, });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || res.statusText;
    throw new Error(msg);
  }
  return data;
}

// ── Products ─────────────────────────────────────────────

export function getProducts(fresh = false) {
  const query = fresh ? '?fresh=true' : '';
  return request(`/products${query}`);
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
  return request(`/events/${eventId}/bottles/${letter}`, {
    method: 'DELETE',
  });
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

export function submitFeedback(eventId, { rating, comment, hostName, hostEmail }) {
  return request(`/events/${eventId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment, hostName, hostEmail }),
  });
}


// ── Review Reminders ─────────────────────────────────────
export function sendReminders(eventId, isSecondReminder = false) {
  return request(`/events/${eventId}/send-reminders`, {
    method: 'POST',
    body: JSON.stringify({ isSecondReminder }),
  });
}
