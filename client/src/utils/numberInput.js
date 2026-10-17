/**
 * Phone-friendly number entry.
 *
 * <input type="number"> misbehaves on phones: iOS in comma-decimal regions
 * types "4,2" which the browser reports as an empty value, and a controlled
 * number input can swallow the "." while you type "4.". So rating and price
 * use type="text" + inputMode="decimal" and are cleaned up here instead.
 */

function keepOneDot(s) {
  const i = s.indexOf('.');
  return i === -1 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '');
}

/** Clean what the user typed into the rating box (0–5, one decimal). */
export function cleanRatingInput(raw) {
  let s = keepOneDot(String(raw).replace(/,/g, '.').replace(/[^0-9.]/g, ''));
  const [whole, frac] = s.split('.');
  if (frac !== undefined) s = `${whole}.${frac.slice(0, 1)}`;
  const n = parseFloat(s);
  if (!isNaN(n) && n > 5) return '5';
  return s;
}

/** Rating value to send to the server (number 1–5, or null if blank). */
export function ratingToNumber(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(',', '.'));
  if (isNaN(n)) return null;
  return Math.min(5, Math.max(1, Math.round(n * 10) / 10));
}

/** Clean what the user typed into the price box (dollars, optional cents). */
export function cleanPriceInput(raw) {
  return keepOneDot(String(raw).replace(/,/g, '.').replace(/[^0-9.]/g, '')).slice(0, 8);
}
