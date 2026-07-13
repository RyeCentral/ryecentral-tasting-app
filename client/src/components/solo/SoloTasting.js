/**
 * SoloTasting — Self-paced single-user tasting experience.
 *
 * Unlike GuestTasting (WebSocket, blind, host-controlled), SoloTasting is:
 *   - REST-based (no WebSocket needed)
 *   - Non-blind (product names + images visible)
 *   - Self-paced (user controls advancing to next bottle)
 *   - No favorite bottle prompt (solo user already knows what they're tasting)
 *
 * Flow:
 *   1. Mount → call soloStart() → get all bottles with full product data + guestId
 *   2. Show one bottle at a time with the full tasting form
 *   3. On submit → soloSubmitResponse() → advance to next bottle
 *   4. After final bottle → soloComplete() → show scores + comparison + review posting
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import TopBar from '../shared/TopBar';
import Leaderboard from '../shared/Leaderboard';
import ReviewPoster from '../shared/ReviewPoster';
import CommunityComparison from '../shared/CommunityComparison';
import NoteIcon from '../shared/NoteIcons';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_FLAVOR_PROFILE = {
  sweetness: 5, ryeSpice: 5, herbalMint: 5, fruit: 5,
  oakVanilla: 5, body: 5, heat: 5, finishLength: 5,
};

const FLAVOR_LABELS = {
  sweetness: 'Sweetness',
  ryeSpice: 'Rye Spice',
  herbalMint: 'Herbal/Mint',
  fruit: 'Fruit',
  oakVanilla: 'Oak/Vanilla',
  body: 'Body',
  heat: 'Heat',
  finishLength: 'Finish Length',
};

export default function SoloTasting({ eventId }) {
  const { customer } = useAuth();

  // Session state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [guestId, setGuestId] = useState(null);
  const [bottles, setBottles] = useState([]);
  const [event, setEvent] = useState(null);

  // Tasting progress
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedResponses, setSavedResponses] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Form state for current bottle
  const [selectedNose, setSelectedNose] = useState([]);
  const [selectedPalate, setSelectedPalate] = useState([]);
  const [flavorProfile, setFlavorProfile] = useState({ ...DEFAULT_FLAVOR_PROFILE });
  const [priceGuess, setPriceGuess] = useState('');
  const [rating, setRating] = useState(4.0);
  const [freeNotes, setFreeNotes] = useState('');

  // Completion state
  const [phase, setPhase] = useState('tasting'); // 'tasting' | 'complete'
  const [leaderboard, setLeaderboard] = useState(null);
  const [allReviewsPosted, setAllReviewsPosted] = useState(false);

  // Edit mode
  const [editingBottle, setEditingBottle] = useState(null); // letter of bottle being re-edited
  const [showResetTips, setShowResetTips] = useState(false);

  // SessionStorage persistence
  const storageKey = `solo_${eventId}`;
  const loadPersisted = (field, fallback) => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[field] !== undefined) return parsed[field];
      }
    } catch {}
    return fallback;
  };

  // Persist state for pull-to-refresh survival
  useEffect(() => {
    if (!guestId) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify({
        guestId,
        currentIndex,
        savedResponses,
        phase,
        leaderboard,
        allReviewsPosted,
      }));
    } catch {}
  }, [guestId, currentIndex, savedResponses, phase, leaderboard, allReviewsPosted, storageKey]);

  // Block iOS Safari pull-to-refresh
  useEffect(() => {
    let lastY = 0;
    const handleTouchStart = (e) => { lastY = e.touches[0].clientY; };
    const handleTouchMove = (e) => {
      const y = e.touches[0].clientY;
      if (window.scrollY === 0 && y > lastY) e.preventDefault();
    };
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  // Initialize solo tasting on mount
  useEffect(() => {
    const init = async () => {
      // Check for persisted session first
      const persisted = (() => {
        try {
          const stored = sessionStorage.getItem(storageKey);
          return stored ? JSON.parse(stored) : null;
        } catch { return null; }
      })();

      try {
        // Always call soloStart — it's idempotent and returns bottles with pills
        const guestName = customer?.displayName || customer?.firstName || 'Solo Taster';
        const result = await api.soloStart(eventId, guestName);

        setGuestId(persisted?.guestId || result.guest.id);
        setBottles(result.bottles);
        setEvent(result.event);

        // Restore persisted progress if resuming
        if (persisted?.guestId) {
          setCurrentIndex(persisted.currentIndex || 0);
          setSavedResponses(persisted.savedResponses || {});
          setPhase(persisted.phase || 'tasting');
          setLeaderboard(persisted.leaderboard || null);
          setAllReviewsPosted(persisted.allReviewsPosted || false);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    init();
  }, [eventId, customer, storageKey]);

  // Reset form for a new bottle
  const resetForm = useCallback(() => {
    setSelectedNose([]);
    setSelectedPalate([]);
    setFlavorProfile({ ...DEFAULT_FLAVOR_PROFILE });
    setPriceGuess('');
    setRating(4.0);
    setFreeNotes('');
  }, []);

  // Toggle a pill note
  const toggleNote = (type, text) => {
    const setter = type === 'nose' ? setSelectedNose : setSelectedPalate;
    setter((prev) =>
      prev.includes(text) ? prev.filter((n) => n !== text) : [...prev, text]
    );
  };

  // Update a flavor slider
  const setFlavor = (key, value) => {
    setFlavorProfile((prev) => ({ ...prev, [key]: value }));
  };

  // Submit response for current bottle
  const handleSubmit = async () => {
    const bottle = editingBottle
      ? bottles.find((b) => b.letter === editingBottle)
      : bottles[currentIndex];
    if (!bottle || !guestId) return;

    setSubmitting(true);
    const response = {
      noseNotes: selectedNose,
      palateNotes: selectedPalate,
      flavorProfile,
      priceGuess: parseFloat(priceGuess) || null,
      bottleGuess: bottle.product?.handle || '',
      rating,
      freeNotes,
    };

    try {
      await api.soloSubmitResponse(eventId, guestId, bottle.letter, response);

      // Save response locally
      const newSaved = {
        ...savedResponses,
        [bottle.letter]: { selectedNose, selectedPalate, flavorProfile, priceGuess, rating, freeNotes },
      };
      setSavedResponses(newSaved);

      if (editingBottle) {
        // Was editing a previous bottle — go back to where we were
        setEditingBottle(null);
        resetForm();
      } else {
        // Advance to next bottle or complete
        const nextIdx = currentIndex + 1;
        if (nextIdx >= bottles.length) {
          // All bottles done — complete the tasting
          const result = await api.soloComplete(eventId);
          setLeaderboard(result.leaderboard);
          setBottles(result.bottles); // Update with revealed data
          setEvent(result.event);
          setPhase('complete');
        } else {
          setCurrentIndex(nextIdx);
          resetForm();
          setShowResetTips(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (err) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  // Load a previous bottle's saved responses into the form for editing
  const loadPreviousBottle = (letter) => {
    const saved = savedResponses[letter];
    if (!saved) return;
    setSelectedNose(saved.selectedNose || []);
    setSelectedPalate(saved.selectedPalate || []);
    setFlavorProfile({ ...DEFAULT_FLAVOR_PROFILE, ...(saved.flavorProfile || {}) });
    setPriceGuess(saved.priceGuess || '');
    setRating(saved.rating || 4.0);
    setFreeNotes(saved.freeNotes || '');
    setEditingBottle(letter);
    setShowResetTips(false);
  };

  // Get the currently active bottle for the form
  const activeBottle = editingBottle
    ? bottles.find((b) => b.letter === editingBottle)
    : bottles[currentIndex];

  // ── Loading / Error ──────────────────────────────────────

  if (loading) {
    return (
      <>
        <TopBar />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>
            <div className="loading">
              <div className="spinner" />
              Starting your solo tasting...
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error && !event) {
    return (
      <>
        <TopBar />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>⚠️</div>
              <h2>Something went wrong</h2>
              <p style={{ color: 'var(--rc-gray-500)' }}>{error}</p>
              <button className="btn btn-primary" onClick={() => window.location.href = '/admin'}>
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Completed — Scores + Comparison + Reviews ──────────────

  if (phase === 'complete') {
    return (
      <>
        <TopBar eventName={event?.name} />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>

            {/* Score Summary */}
            {leaderboard && leaderboard.length > 0 && (
              <div className="card" style={{ textAlign: 'center', marginBottom: 16 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>🎯</div>
                <h2 style={{ marginBottom: 4 }}>Your Score</h2>
                <div style={{ fontSize: 48, fontWeight: 800, color: 'var(--rc-orange)', marginBottom: 4 }}>
                  {Math.round(leaderboard[0].total)}
                </div>
                <p style={{ color: 'var(--rc-gray-500)', fontSize: 14 }}>
                  out of {bottles.length * 100} possible points
                </p>
                {/* Per-bottle breakdown */}
                {leaderboard[0].perBottle && (
                  <div style={{ marginTop: 16, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {Object.entries(leaderboard[0].perBottle).map(([letter, score]) => {
                      const bottle = bottles.find((b) => b.letter === letter);
                      return (
                        <div key={letter} style={{
                          padding: '8px 12px', borderRadius: 10,
                          background: 'var(--rc-orange-light)', textAlign: 'center',
                          minWidth: 70,
                        }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--rc-orange)' }}>
                            {bottle?.product?.title?.replace(/ Review.*$/i, '').split(' ').slice(0, 2).join(' ') || letter}
                          </div>
                          <div style={{ fontSize: 20, fontWeight: 800 }}>{Math.round(score)}</div>
                          <div style={{ fontSize: 11, color: 'var(--rc-gray-500)' }}>/100</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Post Reviews CTA */}
            {!allReviewsPosted && (
              <ReviewPoster
                eventId={eventId}
                guestId={guestId}
                bottles={bottles}
                onAllPosted={() => setAllReviewsPosted(true)}
              />
            )}

            {/* Community Comparison (after posting reviews) */}
            {allReviewsPosted && (
              <CommunityComparison
                bottles={bottles}
                savedResponses={savedResponses}
                leaderboard={leaderboard}
                guestId={guestId}
              />
            )}

            {/* Posted review links */}
            {allReviewsPosted && bottles && (
              <div className="card" style={{ marginTop: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--rc-gray-500)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Your Posted Reviews
                </div>
                {bottles.filter(b => b.revealed && b.product).map((bottle) => (
                  <a
                    key={bottle.letter}
                    href={'https://www.ryecentral.com/products/' + (bottle.product?.handle || '')}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      marginBottom: 8, padding: '10px 14px', borderRadius: 10,
                      border: '1px solid var(--rc-gray-200)', background: '#f9fafb',
                      textDecoration: 'none', color: 'inherit',
                    }}
                  >
                    <span className="bottle-letter" style={{ width: 28, height: 28, fontSize: 12, flexShrink: 0 }}>
                      {bottle.letter}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {bottle.product?.title?.replace(/ Review.*$/i, '') || 'Bottle ' + bottle.letter}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 1 }}>
                        See your review on RyeCentral &rarr;
                      </div>
                    </div>
                    <span style={{ color: 'var(--rc-green)', fontSize: 14, flexShrink: 0 }}>&#10003;</span>
                  </a>
                ))}
                <p style={{ fontSize: 11, color: 'var(--rc-gray-400)', textAlign: 'center', marginTop: 8, marginBottom: 0 }}>
                  It can take up to 10 minutes for reviews to appear on the live pages.
                </p>
              </div>
            )}

            {/* Start New Tasting */}
            <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 32 }}>
              <button
                className="btn btn-secondary"
                onClick={() => window.location.href = '/admin'}
              >
                Start Another Tasting
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Active Tasting — Bottle Card + Form ────────────────────

  return (
    <>
      <TopBar eventName={event?.name} />
      <div className="page">
        <div className="container-narrow" style={{ margin: '0 auto' }}>

          {error && (
            <div className="card" style={{ marginBottom: 16 }}>
              <p className="error-msg">{error}</p>
            </div>
          )}

          {/* Progress indicator */}
          <div style={{
            display: 'flex', gap: 4, marginBottom: 16,
          }}>
            {bottles.map((b, i) => (
              <div
                key={b.letter}
                style={{
                  flex: 1, height: 6, borderRadius: 3,
                  background: i < currentIndex || savedResponses[b.letter]
                    ? 'var(--rc-orange)'
                    : i === currentIndex && !editingBottle
                      ? 'var(--rc-orange-light)'
                      : 'var(--rc-gray-700)',
                  transition: 'background 0.3s',
                }}
              />
            ))}
          </div>

          {/* Bottle Header — shows product info (not blind!) */}
          {activeBottle && (
            <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
              {activeBottle.product?.image?.url && (
                <img
                  src={activeBottle.product.image.url}
                  alt={activeBottle.product.title}
                  style={{
                    width: 80, height: 100, objectFit: 'contain',
                    margin: '0 auto 12px', display: 'block',
                  }}
                />
              )}
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>
                {editingBottle ? 'Editing: ' : ''}
                {activeBottle.product?.title?.replace(/ Review.*$/i, '') || `Bottle ${activeBottle.letter}`}
              </h2>
              {activeBottle.product?.vendor && (
                <p style={{ fontSize: 14, color: 'var(--rc-gray-500)', marginBottom: 4 }}>
                  {activeBottle.product.vendor}
                  {activeBottle.product.details?.proof ? ' · ' + activeBottle.product.details.proof : ''}
                  {activeBottle.product.details?.age ? ' · ' + activeBottle.product.details.age : ''}
                </p>
              )}
              <div style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
                Bottle {currentIndex + 1} of {bottles.length}
              </div>
              {editingBottle && (
                <button
                  onClick={() => { setEditingBottle(null); resetForm(); }}
                  style={{
                    marginTop: 8, padding: '6px 16px', borderRadius: 8, fontSize: 13,
                    fontWeight: 600, border: '1px solid var(--rc-gray-400)', background: 'var(--rc-white)',
                    color: 'var(--rc-gray-700)', cursor: 'pointer',
                  }}
                >
                  &larr; Back to Current Bottle
                </button>
              )}
            </div>
          )}

          {/* Palate Reset Tips — shown between bottles */}
          {showResetTips && !editingBottle && (
            <div className="card" style={{ marginBottom: 12, border: '2px solid var(--rc-orange)', background: 'var(--rc-orange-light)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ fontSize: 15, color: 'var(--rc-orange)', margin: 0 }}>Reset Your Palate</h3>
                <button onClick={() => setShowResetTips(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--rc-gray-500)' }}>&times;</button>
              </div>
              <div style={{ fontSize: 13, color: 'var(--rc-gray-700)', lineHeight: 1.6 }}>
                <div style={{ marginBottom: 6 }}><strong>Sip water</strong> &mdash; still, room temperature (not sparkling)</div>
                <div style={{ marginBottom: 6 }}><strong>Eat a plain cracker</strong> &mdash; unsalted crackers or bread reset taste buds</div>
                <div style={{ marginBottom: 6 }}><strong>Breathe fresh air</strong> &mdash; step away from the glasses briefly to reset your nose</div>
                <div><strong>Wait 1-2 minutes</strong> &mdash; give your palate time to recover before the next pour</div>
              </div>
            </div>
          )}

          {/* Edit Previous Bottles */}
          {Object.keys(savedResponses).length > 0 && !editingBottle && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 15, marginBottom: 8 }}>Edit a Previous Bottle</h3>
              <p style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginBottom: 10 }}>
                Want to change your answer? Tap a bottle to re-edit your response.
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {Object.keys(savedResponses).map((letter) => {
                  const b = bottles.find((bt) => bt.letter === letter);
                  return (
                    <button
                      key={letter}
                      onClick={() => loadPreviousBottle(letter)}
                      style={{
                        padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                        border: '2px solid var(--rc-orange)', background: 'var(--rc-white)',
                        color: 'var(--rc-orange)', cursor: 'pointer',
                      }}
                    >
                      {b?.product?.title?.replace(/ Review.*$/i, '').split(' ').slice(0, 2).join(' ') || `Bottle ${letter}`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nose Notes Pill Box */}
          {activeBottle?.noseNotePills?.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Nose &mdash; What do you smell?</h3>
              <p style={{ fontSize: 12, color: 'var(--rc-orange)', fontWeight: 600, marginBottom: 8 }}>
                {activeBottle.noseRealCount || '?'} of {activeBottle.noseNotePills.length} are real &mdash; select up to {activeBottle.noseRealCount || '?'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeBottle.noseNotePills.map((pill) => (
                  <button
                    key={pill.text}
                    type="button"
                    onClick={() => {
                      const limit = activeBottle.noseRealCount || 99;
                      if (selectedNose.includes(pill.text) || selectedNose.length < limit) {
                        toggleNote('nose', pill.text);
                      }
                    }}
                    title={pill.desc || ''}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: '2px solid',
                      borderColor: selectedNose.includes(pill.text) ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                      background: selectedNose.includes(pill.text) ? 'var(--rc-orange-light)' : 'var(--rc-pure-white)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                    }}
                  >
                    <NoteIcon name={pill.text} size={14} /><span style={{ marginLeft: 4 }}>{pill.text}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>
                TIP: Cup the glass, swirl gently, and take short sniffs. Let the alcohol fade before nosing again.
              </p>
            </div>
          )}

          {/* Palate Notes Pill Box */}
          {activeBottle?.palateNotePills?.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Palate &mdash; What do you taste?</h3>
              <p style={{ fontSize: 12, color: 'var(--rc-orange)', fontWeight: 600, marginBottom: 8 }}>
                {activeBottle.palateRealCount || '?'} of {activeBottle.palateNotePills.length} are real &mdash; select up to {activeBottle.palateRealCount || '?'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeBottle.palateNotePills.map((pill) => (
                  <button
                    key={pill.text}
                    type="button"
                    onClick={() => {
                      const limit = activeBottle.palateRealCount || 99;
                      if (selectedPalate.includes(pill.text) || selectedPalate.length < limit) {
                        toggleNote('palate', pill.text);
                      }
                    }}
                    title={pill.desc || ''}
                    style={{
                      padding: '6px 14px', borderRadius: 20, border: '2px solid',
                      borderColor: selectedPalate.includes(pill.text) ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                      background: selectedPalate.includes(pill.text) ? 'var(--rc-orange-light)' : 'var(--rc-pure-white)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                    }}
                  >
                    <NoteIcon name={pill.text} size={14} /><span style={{ marginLeft: 4 }}>{pill.text}</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>
                TIP: Take a small sip and let it coat your tongue. Wait 20 seconds, then sip again.
              </p>
            </div>
          )}

          {/* Flavor Profile Sliders */}
          {activeBottle?.product?.community?.flavorProfile && (
            <div className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ fontSize: 16, marginBottom: 4 }}>Flavor Profile</h3>
              <p style={{ fontSize: 13, color: 'var(--rc-gray-500)', fontStyle: 'italic', marginBottom: 12 }}>
                Use the sliders to match what you taste
              </p>
              {Object.keys(FLAVOR_LABELS).map((key) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{FLAVOR_LABELS[key]}</span>
                    <span style={{ color: 'var(--rc-orange)', fontWeight: 700 }}>
                      {flavorProfile[key] || 5}/10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={flavorProfile[key] || 5}
                    onChange={(e) => setFlavor(key, parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--rc-orange)' }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Price Guess + Rating */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>
                  Price Guess ($)
                </label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 65"
                  value={priceGuess}
                  onChange={(e) => setPriceGuess(e.target.value)}
                />
              </div>
              <div>
                <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>
                  Community Rating (out of 5)
                </label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="5"
                  step="0.1"
                  placeholder="Guess e.g. 4.2"
                  value={rating}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val <= 5) setRating(val);
                    else if (e.target.value === '') setRating('');
                  }}
                />
              </div>
            </div>
          </div>

          {/* Free Notes */}
          <div className="card" style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>
              Free Notes (optional)
            </label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Any other thoughts on this pour..."
              value={freeNotes}
              onChange={(e) => setFreeNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Submit */}
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ marginBottom: 32 }}
          >
            {submitting ? 'Submitting...' : editingBottle
              ? `Update ${activeBottle?.product?.title?.replace(/ Review.*$/i, '').split(' ').slice(0, 2).join(' ') || 'Bottle'}`
              : currentIndex >= bottles.length - 1
                ? 'Submit & See Results'
                : `Submit & Next Bottle →`
            }
          </button>
        </div>
      </div>
    </>
  );
}
