/**
 * Reminder Service — Sends follow-up emails to guests who haven't
 * posted their tasting reviews after the event ends.
 *
 * Schedule:
 *   - Reminder 1: ~24 hours after event ends
 *   - Reminder 2: ~3 days after event ends
 *
 * Uses Resend API (same as authService).
 */
const config = require('../config/env');

// Track scheduled timers so we can cancel if needed
const scheduledTimers = new Map(); // eventId -> [timer1, timer2]

// ── Email HTML Templates ─────────────────────────────────

function buildReminderEmailHtml({ guestName, eventName, bottleCount, appUrl, isSecondReminder }) {
  const firstName = (guestName || 'Friend').split(' ')[0];
  const urgency = isSecondReminder
    ? 'Your tasting reviews are still waiting — don\'t miss out!'
    : 'We\'d love to hear what you thought!';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 0; background: #ffffff;">
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
        <span style="font-size: 36px;">🥃</span>
        <h1 style="font-family: Georgia, serif; font-size: 24px; color: #ffffff; margin: 8px 0 0;">RyeCentral</h1>
      </div>

      <!-- Body -->
      <div style="padding: 32px 24px;">
        <h2 style="font-size: 20px; color: #1a1a1a; margin: 0 0 8px;">
          Hey ${firstName}, ${urgency}
        </h2>
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
          Thanks for joining <strong>${eventName || 'our rye tasting'}</strong>! You tasted
          ${bottleCount || 'several'} bottles blind — now it's time to share your notes with
          the rye whiskey community.
        </p>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 24px 0;">
          <a href="${appUrl}" style="display: inline-block; padding: 14px 36px; background: #e8860c; color: #ffffff; text-decoration: none; font-size: 17px; font-weight: 800; border-radius: 12px;">
            Post Your Reviews Now
          </a>
        </div>

        <!-- 3 Reasons -->
        <div style="background: #f8f8f8; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="font-size: 15px; color: #1a1a1a; margin: 0 0 16px;">
            Why post your reviews?
          </h3>

          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px;">
            <span style="font-size: 22px; flex-shrink: 0;">🔍</span>
            <div>
              <strong style="color: #1a1a1a; font-size: 14px;">Compare with the community</strong>
              <p style="color: #666; font-size: 13px; margin: 2px 0 0; line-height: 1.4;">
                See how your blind tasting notes stack up against the community's flavor profiles, ratings, and reviews.
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 14px;">
            <span style="font-size: 22px; flex-shrink: 0;">💰</span>
            <div>
              <strong style="color: #1a1a1a; font-size: 14px;">Earn \$10 per review</strong>
              <p style="color: #666; font-size: 13px; margin: 2px 0 0; line-height: 1.4;">
                Get a \$10 Gift Voucher for every review you post — that's up to \$${(bottleCount || 4) * 10} in rewards!
              </p>
            </div>
          </div>

          <div style="display: flex; align-items: flex-start; gap: 12px;">
            <span style="font-size: 22px; flex-shrink: 0;">⭐</span>
            <div>
              <strong style="color: #1a1a1a; font-size: 14px;">Help fellow rye lovers</strong>
              <p style="color: #666; font-size: 13px; margin: 2px 0 0; line-height: 1.4;">
                Your honest blind tasting notes are incredibly valuable — they help others discover their next favorite bottle.
              </p>
            </div>
          </div>
        </div>
        <!-- Discover RyeCentral section -->
        <div style="border-top: 2px solid #f0f0f0; padding-top: 24px; margin-top: 24px;">
          <h3 style="font-size: 15px; color: #1a1a1a; margin: 0 0 16px;">
            🌟 New to RyeCentral? Here are the top 3 ways to use it:
          </h3>

          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 14px; border-left: 3px solid #e8860c; margin-bottom: 10px; background: #fef9f3; border-radius: 0 8px 8px 0;">
                <strong style="color: #1a1a1a; font-size: 14px;">🎯 Match Bottles to Your Palate</strong>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0; line-height: 1.4;">
                  Save your flavor preferences and get matched to rye whiskeys you'll love.
                </p>
              </td>
            </tr>
            <tr><td style="height: 8px;"></td></tr>
            <tr>
              <td style="padding: 10px 14px; border-left: 3px solid #e8860c; background: #fef9f3; border-radius: 0 8px 8px 0;">
                <strong style="color: #1a1a1a; font-size: 14px;">🍸 Cocktail Station</strong>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0; line-height: 1.4;">
                  Learn how to make the perfect Old Fashioned, Manhattan, and more with step-by-step guides.
                </p>
              </td>
            </tr>
            <tr><td style="height: 8px;"></td></tr>
            <tr>
              <td style="padding: 10px 14px; border-left: 3px solid #e8860c; background: #fef9f3; border-radius: 0 8px 8px 0;">
                <strong style="color: #1a1a1a; font-size: 14px;">🛒 Shop Barware & Apparel</strong>
                <p style="color: #666; font-size: 13px; margin: 4px 0 0; line-height: 1.4;">
                  Browse curated barware, glassware, and whiskey apparel for the rye enthusiast.
                </p>
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://www.ryecentral.com" style="color: #e8860c; font-weight: 700; font-size: 14px; text-decoration: none;">
              Explore RyeCentral.com →
            </a>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div style="padding: 20px 24px; background: #f8f8f8; text-align: center; border-radius: 0 0 12px 12px;">
        <p style="color: #999; font-size: 12px; margin: 0;">
          You're receiving this because you attended a RyeCentral Home Tasting Event.
        </p>
      </div>
    </div>
  `;
}

// ── Send Email via Resend ────────────────────────────────

async function sendReminderEmail({ to, guestName, eventName, bottleCount, appUrl, isSecondReminder }) {
  const apiKey = config.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[Reminder] No RESEND_API_KEY — logging instead:');
    console.log('  To:', to, '| Guest:', guestName, '| Reminder:', isSecondReminder ? '2nd' : '1st');
    return { logged: true };
  }

  const html = buildReminderEmailHtml({ guestName, eventName, bottleCount, appUrl, isSecondReminder });
  const fromEmail = config.MAIL_FROM || 'RyeCentral Tasting <onboarding@resend.dev>';
  const subject = isSecondReminder
    ? 'Last chance! Your tasting reviews are waiting 🥃'
    : 'Post your tasting reviews & earn rewards 🥃';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    console.error('[Reminder] Resend API error:', response.status, errData);
    throw new Error('Failed to send reminder email');
  }

  const result = await response.json();
  console.log('[Reminder] Sent', isSecondReminder ? '2nd' : '1st', 'reminder to', to, '| id:', result.id);
  return result;
}

// ── Scheduling Logic ─────────────────────────────────────

const REMINDER_1_DELAY_MS = 24 * 60 * 60 * 1000;  // 24 hours
const REMINDER_2_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/**
 * Schedule reminder emails for an event.
 * Called when admin ends the event.
 *
 * @param {Object} event - TastingEvent instance
 * @param {string} appUrl - Base URL of the tasting app
 */
function scheduleReminders(event, appUrl) {
  // Cancel any existing timers for this event
  cancelReminders(event.id);

  const eventId = event.id;
  const eventName = event.name;
  const bottleCount = event.bottles.length;
  const timers = [];

  // Helper: get guests who haven't submitted all reviews
  const getUnreviewedGuests = () => {
    const guests = [];
    for (const [guestId, guest] of event.guests) {
      const email = event.guestEmails?.get(guestId);
      if (!email) continue; // No email on file — can't send reminder

      // Check how many reviews they've submitted
      const submittedBottles = event.reviewsSubmitted?.get(guestId) || new Set();
      const revealedBottles = event.bottles.filter((b) => b.revealed);
      const unreviewed = revealedBottles.filter((b) => !submittedBottles.has(b.letter));

      if (unreviewed.length > 0) {
        guests.push({
          guestId,
          name: guest.name,
          email,
          unreviewedCount: unreviewed.length,
        });
      }
    }
    return guests;
  };

  // Reminder 1: 24 hours later
  const timer1 = setTimeout(async () => {
    console.log('[Reminder] Sending 1st round for event:', eventName);
    const guests = getUnreviewedGuests();
    for (const guest of guests) {
      try {
        await sendReminderEmail({
          to: guest.email,
          guestName: guest.name,
          eventName,
          bottleCount,
          appUrl: appUrl || 'https://www.ryecentral.com',
          isSecondReminder: false,
        });
        if (!event.remindersSent) event.remindersSent = new Map();
        event.remindersSent.set(guest.guestId + ':1', new Date().toISOString());
      } catch (err) {
        console.error('[Reminder] Failed for', guest.email, err.message);
      }
    }
  }, REMINDER_1_DELAY_MS);
  timers.push(timer1);

  // Reminder 2: 3 days later
  const timer2 = setTimeout(async () => {
    console.log('[Reminder] Sending 2nd round for event:', eventName);
    const guests = getUnreviewedGuests();
    for (const guest of guests) {
      try {
        await sendReminderEmail({
          to: guest.email,
          guestName: guest.name,
          eventName,
          bottleCount,
          appUrl: appUrl || 'https://www.ryecentral.com',
          isSecondReminder: true,
        });
        if (!event.remindersSent) event.remindersSent = new Map();
        event.remindersSent.set(guest.guestId + ':2', new Date().toISOString());
      } catch (err) {
        console.error('[Reminder] Failed for', guest.email, err.message);
      }
    }
  }, REMINDER_2_DELAY_MS);
  timers.push(timer2);

  scheduledTimers.set(eventId, timers);
  console.log('[Reminder] Scheduled 2 reminders for event:', eventName, '(' + eventId + ')');
  return { scheduled: true, reminder1In: '24 hours', reminder2In: '3 days' };
}

/**
 * Cancel scheduled reminders for an event.
 */
function cancelReminders(eventId) {
  const timers = scheduledTimers.get(eventId);
  if (timers) {
    timers.forEach((t) => clearTimeout(t));
    scheduledTimers.delete(eventId);
    console.log('[Reminder] Cancelled reminders for event:', eventId);
  }
}

/**
 * Send reminders immediately (admin manual trigger).
 * Sends to all guests who haven't submitted reviews yet.
 */
async function sendRemindersNow(event, appUrl, isSecondReminder = false) {
  const results = { sent: 0, skipped: 0, failed: 0, details: [] };

  for (const [guestId, guest] of event.guests) {
    const email = event.guestEmails?.get(guestId);
    if (!email) {
      results.skipped++;
      results.details.push({ guestId, name: guest.name, status: 'no_email' });
      continue;
    }

    const submittedBottles = event.reviewsSubmitted?.get(guestId) || new Set();
    const revealedBottles = event.bottles.filter((b) => b.revealed);
    const unreviewed = revealedBottles.filter((b) => !submittedBottles.has(b.letter));

    if (unreviewed.length === 0) {
      results.skipped++;
      results.details.push({ guestId, name: guest.name, status: 'all_reviewed' });
      continue;
    }

    try {
      await sendReminderEmail({
        to: email,
        guestName: guest.name,
        eventName: event.name,
        bottleCount: event.bottles.length,
        appUrl: appUrl || 'https://www.ryecentral.com',
        isSecondReminder,
      });
      results.sent++;
      results.details.push({ guestId, name: guest.name, email, status: 'sent', unreviewedCount: unreviewed.length });
    } catch (err) {
      results.failed++;
      results.details.push({ guestId, name: guest.name, status: 'failed', error: err.message });
    }
  }

  return results;
}

module.exports = {
  sendReminderEmail,
  scheduleReminders,
  cancelReminders,
  sendRemindersNow,
  buildReminderEmailHtml,
};
