/**
 * ReviewPoster — Post-event component for guests to submit their
 * tasting notes as Judge.me reviews on RyeCentral.
 *
 * Shows each bottle they tasted with a preview of the auto-generated
 * review (title + body + stars). Guests can edit before submitting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { previewReview, submitReview } from '../../services/api';

export default function ReviewPoster({ eventId, guestId, bottles }) {
  const [previews, setPreviews] = useState({});  // { letter: { title, body, rating, productTitle } | null (error) }
  const [editing, setEditing] = useState({});     // { letter: { title, body } }
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState({});  // { letter: true }
  const [loading, setLoading] = useState({});      // { letter: true }
  const [errors, setErrors] = useState({});        // { letter: 'msg' }
  const [expanded, setExpanded] = useState(false);
  const fetchedRef = useRef(new Set());           // Track which bottles we've started fetching

  // Load previews for all revealed bottles
  useEffect(() => {
    if (!expanded || !bottles?.length) return;

    bottles.forEach((bottle) => {
      if (!bottle.revealed || fetchedRef.current.has(bottle.letter)) return;
      fetchedRef.current.add(bottle.letter);

      previewReview(eventId, guestId, bottle.letter)
        .then((data) => {
          setPreviews((prev) => ({
            ...prev,
            [bottle.letter]: data.preview
              ? { ...data.preview, productTitle: data.productTitle }
              : null,
          }));
        })
        .catch(() => {
          setPreviews((prev) => ({ ...prev, [bottle.letter]: null }));
        });
    });
  }, [expanded, bottles, eventId, guestId]);

  const handleEdit = (letter, field, value) => {
    setEditing((prev) => ({
      ...prev,
      [letter]: { ...(prev[letter] || {}), [field]: value },
    }));
  };

  const handleSubmit = async (letter) => {
    if (!email) {
      setErrors((prev) => ({ ...prev, [letter]: 'Email is required for Judge.me reviews' }));
      return;
    }

    setLoading((prev) => ({ ...prev, [letter]: true }));
    setErrors((prev) => ({ ...prev, [letter]: null }));

    try {
      const edits = editing[letter] || {};
      await submitReview(eventId, {
        guestId,
        bottleLetter: letter,
        guestEmail: email,
        editedTitle: edits.title || undefined,
        editedBody: edits.body || undefined,
      });
      setSubmitted((prev) => ({ ...prev, [letter]: true }));
    } catch (err) {
      setErrors((prev) => ({ ...prev, [letter]: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, [letter]: false }));
    }
  };

  const revealedBottles = (bottles || []).filter((b) => b.revealed);
  if (!revealedBottles.length) return null;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 0,
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 28 }}>📝</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Post Your Reviews to RyeCentral</div>
          <div style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
            Share your blind tasting notes on each bottle's product page
          </div>
          <div style={{
            display: 'inline-block',
            marginTop: 6,
            padding: '3px 10px',
            background: 'var(--rc-orange)',
            color: '#fff',
            borderRadius: 12,
            fontSize: 12,
            fontWeight: 700,
          }}>
            Get a $10 Gift Voucher for each review posted!
          </div>
        </div>
        <span style={{ fontSize: 20, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: 20 }}>
          {/* Email input (shared across all reviews) */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>
              Your email (for Judge.me reviewer identity)
            </label>
            <input
              className="form-input"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ maxWidth: 320 }}
            />
            <p style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 4 }}>
              Required by Judge.me. Used only for review attribution.
            </p>
          </div>

          {/* Per-bottle review cards */}
          {revealedBottles.map((bottle) => {
            const preview = previews[bottle.letter];
            const edits = editing[bottle.letter] || {};
            const isSubmitted = submitted[bottle.letter];
            const isLoading = loading[bottle.letter];
            const error = errors[bottle.letter];

            return (
              <div
                key={bottle.letter}
                style={{
                  marginBottom: 16,
                  padding: 16,
                  border: '1px solid var(--rc-gray-300)',
                  borderRadius: 12,
                  background: isSubmitted ? '#f0f9f0' : 'var(--rc-white)',
                }}
              >
                {/* Bottle header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span
                    className="bottle-letter"
                    style={{ width: 32, height: 32, fontSize: 14, flexShrink: 0 }}
                  >
                    {bottle.letter}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {preview?.productTitle || bottle.product?.title || `Bottle ${bottle.letter}`}
                    </div>
                  </div>
                  {isSubmitted && (
                    <span style={{ color: 'var(--rc-green)', fontWeight: 600, fontSize: 13 }}>
                      ✓ Posted
                    </span>
                  )}
                </div>

                {isSubmitted ? (
                  <div>
                    <p style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
                      Review submitted to Judge.me! It may take a moment to appear on the product page.
                    </p>
                    <div style={{
                      marginTop: 8,
                      padding: '8px 12px',
                      background: 'var(--rc-orange-light)',
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--rc-orange)',
                    }}>
                      $10 Gift Voucher earned! Check your email.
                    </div>
                  </div>
                ) : previews[bottle.letter] === null ? (
                  <div style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
                    Could not load review preview. The tasting session may have expired.
                  </div>
                ) : !preview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                    <span style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>Loading preview...</span>
                  </div>
                ) : (
                  <div>
                    {/* Stars */}
                    <div style={{ marginBottom: 8 }}>
                      <span style={{ fontSize: 20, letterSpacing: 2 }}>
                        {'★'.repeat(Math.min(5, Math.max(0, preview.rating || 3)))}{'☆'.repeat(Math.max(0, 5 - (preview.rating || 3)))}
                      </span>
                    </div>

                    {/* Title (editable) */}
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, color: 'var(--rc-gray-500)' }}>
                        Review Title <span style={{ fontSize: 11, fontWeight: 400 }}>— tap to edit</span>
                      </label>
                      <input
                        className="form-input"
                        value={edits.title ?? preview.title}
                        onChange={(e) => handleEdit(bottle.letter, 'title', e.target.value)}
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          padding: '8px 12px',
                          border: '2px solid var(--rc-gray-300)',
                          borderRadius: 8,
                        }}
                      />
                    </div>

                    {/* Body (editable) */}
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontWeight: 600, fontSize: 12, display: 'block', marginBottom: 2, color: 'var(--rc-gray-500)' }}>
                        Review Body
                      </label>
                      <textarea
                        className="form-input"
                        rows={8}
                        value={edits.body ?? preview.body}
                        onChange={(e) => handleEdit(bottle.letter, 'body', e.target.value)}
                        style={{ fontSize: 13, lineHeight: 1.5, resize: 'vertical' }}
                      />
                    </div>

                    {/* Error */}
                    {error && (
                      <div style={{ color: 'var(--rc-red)', fontSize: 13, marginBottom: 8 }}>
                        {error}
                      </div>
                    )}

                    {/* Submit button */}
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleSubmit(bottle.letter)}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Submitting...' : `Post Review for Bottle ${bottle.letter}`}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
