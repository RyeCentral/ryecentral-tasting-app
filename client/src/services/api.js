/**
 * API Service — talks to the Express backend at /api/*
 * In dev the CRA proxy forwards to localhost:3001.
 *
 * All authenticated requests include the JWT token from safeLocal.
 */

import { safeLocal } from './safeStorage';

const BASE = '/api';
const AUTH_STORAGE_KEY = 'rc_tasting_auth';

/**
 * Get the stored auth token (if any).
 */
function getAuthToken() {
  try {
    const stored = safeLocal.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const { token } = JSON.parse(stored);
      return token;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * fetch with a timeout. On a weak phone signal a request can hang with no
 * error at all, which leaves a spinner on screen forever.
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
  if (typeof AbortController === 'undefined') return fetch(url, options);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err && err.name === 'AbortError') {
      throw new Error('The connection timed out. Check your signal and try again.');
    }
    throw new Error('Could not reach the tasting server. Check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function request(path, options = {}) {
  const { retries = 0, timeoutMs, ...fetchOptions } = options;
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await requestOnce(path, fetchOptions, timeoutMs);
    } catch (err) {
      lastErr = err;
      // Only retry network failures / timeouts / 5xx, never 4xx answers
      if (!err.retryable || attempt === retries) break;
      await sleep(800 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function requestOnce(path, options = {}, timeoutMs) {
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

  let res;
  try {
    res = await fetchWithTimeout(url, { ...options, headers }, timeoutMs);
  } catch (err) {
    err.retryable = true;
    throw err;
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(data?.error || res.statusText || `Request failed (${res.status})`);
    err.status = res.status;
    err.retryable = res.status >= 500;
    throw err;
  }
  return data;
}

// ── Products ─────────────────────────────────────────────

export function getProducts(fresh = false) {
  const query = fresh ? '?fresh=true' : '';
  return request(`/products${query}`, { retries: 2 });
}

export function getProductByHandle(handle) {
  return request(`/products/${handle}`);
}

export function refreshProducts() {
  return request('/products/refresh', { method: 'POST' });
}

// ── Events ───────────────────────────────────────────────

export function createEvent(name, mode = 'group') {
  return request('/events', {
    method: 'POST',
    body: JSON.stringify({ name, mode }),
  });
}

export function getEvent(eventId, role = 'admin') {
  return request(`/events/${eventId}?role=${role}`, { retries: 2 });
}

export function getEvents() {
  return request('/events', { retries: 2 });
}

export function deleteEvent(eventId) {
  return request(`/events/${eventId}`, { method: 'DELETE' });
}

export function endEvent(eventId) {
  return request(`/events/${eventId}/end`, { method: 'POST' });
}

// Solo tasting
export function soloStart(eventId, guestName) {
  // Idempotent on the server (returns the existing guest/bottles)
  return request(`/events/${eventId}/solo-start`, {
    method: 'POST',
    body: JSON.stringify({ guestName }),
    retries: 2,
  });
}

export function soloSubmitResponse(eventId, guestId, bottleLetter, response) {
  // Overwrites per guest+bottle on the server, so safe to retry
  return request(`/events/${eventId}/responses`, {
    method: 'POST',
    body: JSON.stringify({ guestId, bottleLetter, response }),
    retries: 2,
  });
}

export function soloComplete(eventId) {
  return request(`/events/${eventId}/solo-complete`, {
    method: 'POST',
    retries: 2,
  });
}

export function soloFromProduct(handle) {
  // Reuses an unfinished solo event for the same bottle, so safe to retry.
  // First call can be slow while the product cache warms up.
  return request('/events/solo-from-product', {
    method: 'POST',
    body: JSON.stringify({ handle }),
    retries: 2,
    timeoutMs: 30000,
  });
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
