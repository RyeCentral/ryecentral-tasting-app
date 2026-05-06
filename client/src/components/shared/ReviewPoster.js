/**
 * ReviewPoster — Post-event component for guests to submit their
 * tasting notes as Judge.me reviews on RyeCentral.
 *
 * Shows all bottles in a scrollable preview list with one big
 * "Post All Reviews" button. Guests can edit any review before
 * submitting the whole batch.
 */
import React, { useState, useEffect, useRef } from 'react';
import { previewReview, submitReview } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ReviewPoster({ eventId, guestId, bottles }) {
  const { customer } = useAuth();
  const [previews, setPreviews] = useState({});
  const [editing, setEditing] = useState({});
  const [editingLetter, setEditingLetter] = useState(null);
  const [email, setEmail] = useState(customer?.email || '');
  const [submitted, setSubmitted] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});
  const [expanded, setExpanded] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ done: 0, total: 0 });
  const [bulkError, setBulkError] = useState(null);
  const fetchedRef = useRef(new Set());

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

  const handleSubmitAll = async () => {
    if (!email) {
      setBulkError('Please enter your email address to post reviews.');
      return;
    }
    const unsubmitted = revealedBottles.filter(
      (b) => !submitted[b.letter] && previews[b.letter]
    );
    if (!unsubmitted.length) return;

    setBulkSubmitting(true);
    setBulkError(null);
    setBulkProgress({ done: 0, total: unsubmitted.length });
    setEditingLetter(null);

    let failCount = 0;
    for (let i = 0; i < unsubmitted.length; i++) {
      const bottle = unsubmitted[i];
      const letter = bottle.letter;
      setLoading((prev) => ({ ...prev, [letter]: true }));
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
        failCount++;
      } finally {
        setLoading((prev) => ({ ...prev, [letter]: false }));
        setBulkProgress({ done: i + 1, total: unsubmitted.length });
      }
    }

    setBulkSubmitting(false);
    if (failCount > 0) {
      setBulkError(failCount + ' review(s) failed to post. You can retry those individually.');
    }
  };

  const revealedBottles = (bottles || []).filter((b) => b.revealed);
  if (!revealedBottles.length) return null;

  const allPosted = revealedBottles.length > 0 && revealedBottles.every((b) => submitted[b.letter]);
  const readyCount = revealedBottles.filter((b) => previews[b.letter] && !submitted[b.letter]).length;
  const postedCount = revealedBottles.filter((b) => submitted[b.letter]).length;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      {/* Collapsed header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12, width: '100%',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 28 }}>📝</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Post Your Reviews to RyeCentral</div>
          <div style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
            Share your blind tasting notes on each bottle's product page
          </div>
          <div style={{
            display: 'inline-block', marginTop: 6, padding: '3px 10px',
            background: 'var(--rc-orange)', color: '#fff', borderRadius: 12,
            fontSize: 12, fontWeight: 700,
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
          {/* Big CTA section */}
          {!allPosted && (
            <div style={{
              textAlign: 'center', padding: '20px 16px', marginBottom: 20,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              borderRadius: 16, border: '2px solid var(--rc-orange)',
            }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🥃</div>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>
                Can we post your tasting results on RyeCentral?
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 16px', lineHeight: 1.5 }}>
                Your blind tasting notes help the rye whiskey community! Plus, earn a
                <span style={{ color: 'var(--rc-orange)', fontWeight: 700 }}> $10 Gift Voucher </span>
                for every review posted.
              </p>

              {/* Email input */}
              <div style={{ maxWidth: 320, margin: '0 auto 16px' }}>
                <input
                  className="form-input"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ textAlign: 'center', fontSize: 15, padding: '10px 14px' }}
                />
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>
                  Used for Judge.me reviewer identity only
                </p>
              </div>

              {bulkError && (
                <div style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>
                  {bulkError}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleSubmitAll}
                disabled={bulkSubmitting || readyCount === 0}
                style={{
                  fontSize: 17, fontWeight: 800, padding: '14px 32px',
                  borderRadius: 12, minWidth: 280,
                  opacity: (bulkSubmitting || readyCount === 0) ? 0.6 : 1,
                }}
              >
                {bulkSubmitting
                  ? `Posting... ${bulkProgress.done}/${bulkProgress.total}`
                  : postedCount > 0
                    ? `Post Remaining ${readyCount} Review${readyCount !== 1 ? 's' : ''} to RyeCentral`
                    : `Post All ${readyCount} Review${readyCount !== 1 ? 's' : ''} to RyeCentral`}
              </button>

              {bulkSubmitting && (
                <div style={{ marginTop: 12, height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', background: 'var(--rc-orange)', borderRadius: 2,
                    width: (bulkProgress.total ? (bulkProgress.done / bulkProgress.total) * 100 : 0) + '%',
                    transition: 'width 0.3s ease',
                  }} />
                </div>
              )}
            </div>
          )}

          {/* All posted success message */}
          {allPosted && (
            <div style={{
              textAlign: 'center', padding: '24px 16px', marginBottom: 20,
              background: 'linear-gradient(135deg, #0d4f2b 0%, #1a6b3c 100%)',
              borderRadius: 16, border: '2px solid var(--rc-green)',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
              <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
                All Reviews Posted — Thank You!
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '0 0 4px', lineHeight: 1.5 }}>
                You earned <span style={{ color: 'var(--rc-orange)', fontWeight: 700 }}>
                {postedCount * 10} in Gift Vouchers</span> — check your email!
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 }}>
                Your tasting notes are now live on each product page below.
              </p>
            </div>
          )}

          {/* Review preview cards */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rc-gray-500)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
            {allPosted ? 'Your Posted Reviews' : 'Review Preview — tap Edit to change any before posting'}
          </div>

          {revealedBottles.map((bottle) => {
            const preview = previews[bottle.letter];
            const edits = editing[bottle.letter] || {};
            const isSubmitted = submitted[bottle.letter];
            const isLoading = loading[bottle.letter];
            const error = errors[bottle.letter];
            const isEditing = editingLetter === bottle.letter;

            return (
              <div
                key={bottle.letter}
                style={{
                  marginBottom: 12, padding: 14, borderRadius: 12,
                  border: isSubmitted ? '2px solid var(--rc-green)' : '1px solid var(--rc-gray-300)',
                  background: isSubmitted ? '#f0f9f0' : 'var(--rc-white)',
                }}
              >
                {/* Bottle header row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="bottle-letter" style={{ width: 30, height: 30, fontSize: 13, flexShrink: 0 }}>
                    {bottle.letter}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {preview?.productTitle || bottle.product?.title || 'Bottle ' + bottle.letter}
                    </div>
                    {preview && !isSubmitted && (
                      <div style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 2 }}>
                        {'★'.repeat(Math.min(5, Math.max(0, preview.rating || 3)))}{'☆'.repeat(Math.max(0, 5 - (preview.rating || 3)))}
                        {' · '}{(edits.title ?? preview.title)?.substring(0, 40)}{(edits.title ?? preview.title)?.length > 40 ? '…' : ''}
                      </div>
                    )}
                  </div>
                  {isSubmitted ? (
                    <span style={{ color: 'var(--rc-green)', fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>✓ Posted</span>
                  ) : isLoading ? (
                    <div className="spinner" style={{ width: 18, height: 18 }} />
                  ) : preview ? (
                    <button
                      className="btn btn-sm"
                      onClick={() => setEditingLetter(isEditing ? null : bottle.letter)}
                      style={{
                        fontSize: 12, padding: '4px 12px', borderRadius: 8,
                        background: isEditing ? 'var(--rc-gray-200)' : 'transparent',
                        border: '1px solid var(--rc-gray-300)', color: 'var(--rc-gray-600)',
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {isEditing ? 'Done' : 'Edit ✏️'}
                    </button>
                  ) : previews[bottle.letter] === null ? (
                    <span style={{ fontSize: 11, color: 'var(--rc-gray-400)' }}>Unavailable</span>
                  ) : (
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                  )}
                </div>

                {/* Expanded edit panel */}
                {isEditing && preview && !isSubmitted && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rc-gray-200)' }}>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--rc-gray-500)', marginBottom: 4, display: 'block' }}>
                        Review Title
                      </label>
                      <input
                        className="form-input"
                        value={edits.title ?? preview.title}
                        onChange={(e) => handleEdit(bottle.letter, 'title', e.target.value)}
                        style={{ fontSize: 14, fontWeight: 700, padding: '8px 12px' }}
                      />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--rc-gray-500)', marginBottom: 4, display: 'block' }}>
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
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--rc-gray-500)', marginBottom: 4, display: 'block' }}>
                        Stars
                      </label>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleEdit(bottle.letter, 'rating', star)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: 24, padding: 0,
                              color: star <= (edits.rating ?? preview.rating ?? 3) ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                            }}
                          >
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Error for individual bottle */}
                {error && (
                  <div style={{ marginTop: 8, color: 'var(--rc-red)', fontSize: 12 }}>
                    ⚠ {error}{' '}
                    <button
                      onClick={() => {
                        setErrors((prev) => ({ ...prev, [bottle.letter]: null }));
                        setLoading((prev) => ({ ...prev, [bottle.letter]: true }));
                        const ed = editing[bottle.letter] || {};
                        submitReview(eventId, {
                          guestId, bottleLetter: bottle.letter, guestEmail: email,
                          editedTitle: ed.title || undefined, editedBody: ed.body || undefined,
                        })
                          .then(() => setSubmitted((prev) => ({ ...prev, [bottle.letter]: true })))
                          .catch((err) => setErrors((prev) => ({ ...prev, [bottle.letter]: err.message })))
                          .finally(() => setLoading((prev) => ({ ...prev, [bottle.letter]: false })));
                      }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--rc-orange)',
                        fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', fontSize: 12,
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Product page link after submission */}
                {isSubmitted && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--rc-gray-100)', borderRadius: 8 }}>
                    <a
                      href={'https://www.ryecentral.com/products/' + (bottle.product?.handle || '')}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--rc-orange)', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
                    >
                      🔍 View on RyeCentral →
                    </a>
                    <span style={{ fontSize: 11, color: 'var(--rc-gray-500)', marginLeft: 8 }}>
                      Compare your notes with the community!
                    </span>
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
