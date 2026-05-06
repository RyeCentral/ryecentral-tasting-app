/**
 * RyeCentral content-feedback endpoint
 *
 * POST /api/feedback/vote
 *   body: { handle: "<article-handle>", type: "yes"|"no", comment?: string }
 *   headers: x-shared-secret: <SHARED_SECRET>
 *   returns: { yes: <int>, no: <int> }
 *
 * GET /api/feedback/counts/:handle
 *   returns: { yes: <int>, no: <int> }
 *
 * Storage: Shopify article metafields (rc.helpful_yes, rc.helpful_no).
 * Negative votes with comments fire a Slack webhook (if FEEDBACK_SLACK_WEBHOOK env var set).
 *
 * Anti-abuse:
 *  - Per-IP rate limit: 1 vote per article per 24h (in-memory, resets on dyno restart;
 *    fine for our scale, replace with Redis if traffic grows)
 *  - Validates handle format
 *  - Caps comment length at 500 chars, sanitises HTML
 *  - Front-end also sets a localStorage flag so users can't easily double-vote
 */

const express = require('express');
const https = require('https');

const router = express.Router();

const BLOG_ID = 105207431416; // cocktail-station blog
const METAFIELD_NS = 'ryec';
const KEY_YES = 'helpful_yes';
const KEY_NO = 'helpful_no';

// In-memory rate limiter — { "<ip>:<handle>": <expiresAtMs> }
const voteSeen = new Map();
const VOTE_TTL_MS = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [k, t] of voteSeen) if (t < now) voteSeen.delete(k);
}, 60 * 60 * 1000); // sweep hourly

// ── Helpers ────────────────────────────────────────────

function shopifyAdmin(method, path, body) {
  const shop = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_SHOP;
  const token = process.env.SHOPIFY_ADMIN_TOKEN || process.env.SHOPIFY_TOKEN;
  if (!shop || !token) return Promise.reject(new Error('Missing SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_TOKEN'));
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: shop,
      path: `/admin/api/2026-04${path}`,
      method,
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let buf = '';
      res.on('data', c => buf += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(buf ? JSON.parse(buf) : {}); } catch { resolve({}); }
        } else {
          reject(new Error(`Shopify ${method} ${path} → ${res.statusCode}: ${buf.slice(0,300)}`));
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function findArticleId(handle) {
  const res = await shopifyAdmin('GET', `/blogs/${BLOG_ID}/articles.json?handle=${encodeURIComponent(handle)}&fields=id`);
  const arts = res.articles || [];
  return arts.length ? arts[0].id : null;
}

async function readCounts(articleId) {
  const res = await shopifyAdmin('GET', `/articles/${articleId}/metafields.json?namespace=${METAFIELD_NS}`);
  let yes = 0, no = 0;
  for (const m of (res.metafields || [])) {
    if (m.key === KEY_YES) yes = parseInt(m.value, 10) || 0;
    if (m.key === KEY_NO)  no  = parseInt(m.value, 10) || 0;
  }
  return { yes, no };
}

async function writeMetafield(articleId, key, value) {
  // Try GET first to find existing id, then PUT — falls back to POST if absent
  const res = await shopifyAdmin('GET', `/articles/${articleId}/metafields.json?namespace=${METAFIELD_NS}&key=${key}`);
  const existing = (res.metafields || []).find(m => m.key === key);
  if (existing) {
    await shopifyAdmin('PUT', `/metafields/${existing.id}.json`, {
      metafield: { id: existing.id, value: String(value), type: 'number_integer' }
    });
  } else {
    await shopifyAdmin('POST', `/articles/${articleId}/metafields.json`, {
      metafield: { namespace: METAFIELD_NS, key, value: String(value), type: 'number_integer' }
    });
  }
}

function notifySlack(handle, comment, totals) {
  const url = process.env.FEEDBACK_SLACK_WEBHOOK;
  if (!url) return;
  const text = [
    `:thumbsdown: *Negative feedback* on \`/${handle}\``,
    comment ? `> ${comment.replace(/[\r\n]+/g,' ').slice(0,300)}` : '_(no comment)_',
    `Counts: 👍 ${totals.yes} · 👎 ${totals.no}`,
    `Page: https://www.ryecentral.com/blogs/cocktail-station/${handle}`,
  ].join('\n');
  const u = new URL(url);
  const data = JSON.stringify({ text });
  const req = https.request({
    hostname: u.hostname, path: u.pathname + u.search, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
  });
  req.on('error', () => {}); // best-effort
  req.write(data); req.end();
}

function notifyEmail(handle, comment, totals) {
  // Only fires when there's an actual comment to read — we don't want noise
  // from anonymous "no" clicks with no context.
  if (!comment) return;
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FEEDBACK_NOTIFY_EMAIL;
  if (!apiKey || !to) return;
  const from = process.env.FEEDBACK_NOTIFY_FROM || 'RyeCentral Feedback <feedback@ryecentral.com>';
  const pageUrl = `https://www.ryecentral.com/blogs/cocktail-station/${handle}`;
  const safeComment = String(comment).replace(/[<>]/g, '');
  const subject = `RyeCentral feedback: /${handle} — "${safeComment.slice(0, 60)}${safeComment.length > 60 ? '…' : ''}"`;
  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:560px;margin:0 auto;color:#222;">
      <h2 style="margin:0 0 12px;font-size:18px;">👎 Negative feedback on /${handle}</h2>
      <blockquote style="margin:0 0 16px;padding:12px 16px;background:#fafaf7;border-left:3px solid #D4A24C;font-size:15px;line-height:1.5;white-space:pre-wrap;">${safeComment}</blockquote>
      <p style="margin:0 0 8px;font-size:13px;color:#666;">Counts: 👍 ${totals.yes} · 👎 ${totals.no}</p>
      <p style="margin:0;font-size:13px;"><a href="${pageUrl}">${pageUrl}</a></p>
    </div>`.trim();
  const textBody = `Negative feedback on /${handle}\n\n"${safeComment}"\n\nCounts: 👍 ${totals.yes} · 👎 ${totals.no}\n${pageUrl}`;
  const data = JSON.stringify({ from, to: [to], subject, html, text: textBody });
  const req = https.request({
    hostname: 'api.resend.com', path: '/emails', method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data),
    },
  }, res => {
    let buf = '';
    res.on('data', c => buf += c);
    res.on('end', () => {
      if (res.statusCode >= 300) console.error('[feedback/email]', res.statusCode, buf.slice(0, 200));
    });
  });
  req.on('error', e => console.error('[feedback/email] req err', e.message));
  req.write(data); req.end();
}

function sanitiseComment(c) {
  if (!c) return '';
  return String(c).replace(/<[^>]*>/g, '').trim().slice(0, 500);
}

function clientIp(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'unknown';
}

// ── Routes ──────────────────────────────────────────────

router.get('/counts/:handle', async (req, res) => {
  const handle = req.params.handle;
  if (!/^[a-z0-9\-]+$/.test(handle || '')) return res.status(400).json({ error: 'bad handle' });
  try {
    const id = await findArticleId(handle);
    if (!id) return res.status(404).json({ error: 'not found' });
    const counts = await readCounts(id);
    res.set('Cache-Control', 'public, max-age=60');
    return res.json(counts);
  } catch (e) {
    console.error('[feedback/counts]', e.message);
    return res.status(500).json({ error: 'internal error' });
  }
});

router.post('/vote', async (req, res) => {
  // Optional shared-secret check (lightweight bot deterrent, not real auth)
  const secret = process.env.SHARED_SECRET;
  if (secret && req.get('x-shared-secret') !== secret) {
    return res.status(401).json({ error: 'unauthorised' });
  }

  const { handle, type, comment } = req.body || {};
  if (!/^[a-z0-9\-]+$/.test(handle || '')) return res.status(400).json({ error: 'bad handle' });
  if (type !== 'yes' && type !== 'no')     return res.status(400).json({ error: 'bad type' });

  const ip = clientIp(req);
  const rateKey = `${ip}:${handle}`;
  if (voteSeen.has(rateKey)) {
    return res.status(429).json({ error: 'already voted recently' });
  }

  try {
    const id = await findArticleId(handle);
    if (!id) return res.status(404).json({ error: 'not found' });

    const counts = await readCounts(id);
    const next = { ...counts, [type]: counts[type] + 1 };
    const key = type === 'yes' ? KEY_YES : KEY_NO;
    await writeMetafield(id, key, next[type]);

    voteSeen.set(rateKey, Date.now() + VOTE_TTL_MS);

    if (type === 'no') {
      const safe = sanitiseComment(comment);
      notifySlack(handle, safe, next);
      notifyEmail(handle, safe, next);
    }

    return res.json(next);
  } catch (e) {
    console.error('[feedback/vote]', e.message);
    return res.status(500).json({ error: 'internal error' });
  }
});

module.exports = router;
