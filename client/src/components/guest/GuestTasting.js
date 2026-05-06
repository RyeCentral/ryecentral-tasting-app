import React, { useState, useEffect, useCallback, useRef } from 'react';
import TopBar from '../shared/TopBar';
import Celebration from '../shared/Celebration';
import Leaderboard from '../shared/Leaderboard';
import ReviewPoster from '../shared/ReviewPoster';
import wsService from '../../services/websocket';

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

export default function GuestTasting({ eventId, guestId, guestName }) {
  const [event, setEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const [currentBottle, setCurrentBottle] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [prizes, setPrizes] = useState([]);
  const [submitted, setSubmitted] = useState({}); // { letter: true }
  const [celebrate, setCelebrate] = useState(false);
  const [favoriteBottle, setFavoriteBottle] = useState('');
  const [favoriteSubmitted, setFavoriteSubmitted] = useState(false);
    const favoriteRef = useRef(null);

  // Form state for current bottle
  const [selectedNose, setSelectedNose] = useState([]);
  const [selectedPalate, setSelectedPalate] = useState([]);
  const [flavorProfile, setFlavorProfile] = useState({});
  const [priceGuess, setPriceGuess] = useState('');
  const [bottleGuess, setBottleGuess] = useState('');
  const [rating, setRating] = useState(4.0);
  const [freeNotes, setFreeNotes] = useState('');

  // Store all bottle data for go-back editing
  const [allBottleData, setAllBottleData] = useState({}); // { letter: bottleData }
  const [savedResponses, setSavedResponses] = useState({}); // { letter: { nose, palate, flavor, price, guess, rating, notes } }
  const [viewingPrevBottle, setViewingPrevBottle] = useState(null); // letter of previous bottle being edited
  const [showResetTips, setShowResetTips] = useState(false); // palate reset tips between bottles

  // Connect WebSocket
  useEffect(() => {
    wsService.connect({ eventId, role: 'guest', guestId });

    const unsubs = [
      wsService.on('connected', () => setConnected(true)),
      wsService.on('disconnected', () => setConnected(false)),

      wsService.on('sync:state', (msg) => {
        setEvent(msg.event);
        // Restore currentBottle from sync payload (handles reconnect/refresh)
        if (msg.currentBottle) {
          setCurrentBottle(msg.currentBottle);
        }
        if (msg.leaderboard) {
          setLeaderboard(msg.leaderboard);
          if (msg.event?.status === 'complete') {
            setCelebrate(true);
          }
        }
        if (msg.prizes) {
          setPrizes(msg.prizes);
        }
      }),

      wsService.on('event:started', (msg) => {
        setCurrentBottle(msg.currentBottle);
        setEvent((prev) => prev ? { ...prev, status: 'active' } : prev);
        resetForm();
        setShowResetTips(false);
        setViewingPrevBottle(null);
        // Store bottle data for go-back editing
        if (msg.currentBottle) {
          setAllBottleData((prev) => ({ ...prev, [msg.currentBottle.letter]: msg.currentBottle }));
        }
      }),

      wsService.on('bottle:next', (msg) => {
        setCurrentBottle(msg.currentBottle);
        resetForm();
        setShowResetTips(true); // Show palate reset tips between bottles
        setViewingPrevBottle(null);
        if (msg.currentBottle) {
          setAllBottleData((prev) => ({ ...prev, [msg.currentBottle.letter]: msg.currentBottle }));
        }
      }),

      wsService.on('bottle:reveal', (msg) => {
        setEvent((prev) => {
          if (!prev) return prev;
          const bottles = (prev.bottles || []).map((b) =>
            b.letter === msg.letter ? { ...b, revealed: true, product: msg.product } : b
          );
          return { ...prev, bottles };
        });
      }),

      wsService.on('event:scoring', () => {
        setEvent((prev) => prev ? { ...prev, status: 'scoring' } : prev);
      }),

      wsService.on('event:complete', (msg) => {
        setLeaderboard(msg.leaderboard);
        setPrizes(msg.prizes || []);
        setCelebrate(true); // Fire confetti immediately BEFORE leaderboard reveals
        setEvent((prev) => prev ? {
          ...prev,
          status: 'complete',
          bottles: (prev.bottles || []).map((b) => ({ ...b, revealed: true })),
        } : prev);
      }),
    ];

    // Re-sync state when tab becomes visible (handles missed WS messages
    // e.g. when guest's phone screen was off during score calculation)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        wsService.reconnect();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubs.forEach((unsub) => unsub());
      document.removeEventListener('visibilitychange', handleVisibility);
      wsService.disconnect();
    };
  }, [eventId, guestId]);

  const resetForm = useCallback(() => {
    setSelectedNose([]);
    setSelectedPalate([]);
    setFlavorProfile({});
    setPriceGuess('');
    setBottleGuess('');
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

  // Submit response
  const handleSubmit = () => {
    const bottle = viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle;
    if (!bottle) return;
    wsService.send({
      type: 'guest:response',
      bottleLetter: bottle.letter,
      response: {
        noseNotes: selectedNose,
        palateNotes: selectedPalate,
        flavorProfile,
        priceGuess: parseFloat(priceGuess) || null,
        bottleGuess,
        rating,
        freeNotes,
      },
    });
    setSavedResponses((prev) => ({
      ...prev,
      [bottle.letter]: { selectedNose, selectedPalate, flavorProfile, priceGuess, bottleGuess, rating, freeNotes },
    }));
    setSubmitted((prev) => ({ ...prev, [bottle.letter]: true }));
    if (viewingPrevBottle) {
      setViewingPrevBottle(null);
      resetForm();
    }
  };

  // Submit favorite bottle pick
  const handleFavoriteSubmit = () => {
    if (!favoriteBottle) return;
    wsService.send({
      type: 'guest:favorite',
      favoriteBottle,
    });
    setFavoriteSubmitted(true);
  };

  // Load a previous bottle's saved responses into the form for editing
  const loadPreviousBottle = (letter) => {
    const saved = savedResponses[letter];
    if (!saved) return;
    setSelectedNose(saved.selectedNose || []);
    setSelectedPalate(saved.selectedPalate || []);
    setFlavorProfile(saved.flavorProfile || {});
    setPriceGuess(saved.priceGuess || '');
    setBottleGuess(saved.bottleGuess || '');
    setRating(saved.rating || 4.0);
    setFreeNotes(saved.freeNotes || '');
    setViewingPrevBottle(letter);
    setShowResetTips(false);
  };

  // Check if all bottles have been tasted (for favorite prompt)
  const allBottlesTasted = event?.bottleCount && Object.keys(submitted).length >= event.bottleCount;

    // Auto-scroll to favorite section on mobile when all bottles tasted
    useEffect(() => {
          if (allBottlesTasted && !favoriteSubmitted && favoriteRef.current) {
                  setTimeout(() => {
                            favoriteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 300);
          }
    }, [allBottlesTasted, favoriteSubmitted]);

  // ── Render ────────────────────────────────────────────

  if (!event) {
    return (
      <>
        <TopBar />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>
            <div className="loading">
              <div className="spinner" />
              Connecting...
            </div>
          </div>
        </div>
      </>
    );
  }

  // Waiting for host to start
  if (event.status === 'setup') {
    return (
      <>
        <TopBar eventName={event.name} />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🥃</div>
              <h2 style={{ marginBottom: 8 }}>Waiting for Host</h2>
              <p style={{ color: 'var(--rc-gray-500)', marginBottom: 16 }}>
                Hey {guestName}! The host will start the tasting shortly.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <div className="spinner" style={{ width: 20, height: 20 }} />
                <span style={{ fontSize: 14, color: 'var(--rc-gray-500)' }}>
                  {event.bottleCount} bottle{event.bottleCount !== 1 ? 's' : ''} · {event.guestCount} guest{event.guestCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Scoring in progress
  if (event.status === 'scoring') {
    return (
      <>
        <TopBar eventName={event.name} />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <h2>Calculating Results...</h2>
              <p style={{ color: 'var(--rc-gray-500)' }}>The host is tallying the scores!</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Results / Animated Leaderboard + Celebration
  if (event.status === 'complete' && leaderboard) {
    return (
      <>
        <TopBar eventName={event.name} />
        <Celebration active={celebrate} />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>
            

            {/* Your Favorite Bottle Reveal */}
            {favoriteBottle && event.bottles && (() => {
              const favBottle = event.bottles.find((b) => b.letter === favoriteBottle);
              const productTitle = favBottle?.product?.title?.replace(/ Review.*$/i, '') || null;
              const productImage = favBottle?.product?.image?.url || null;
              return (
                <div className="card" style={{ marginTop: 20, marginBottom: 20, textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>❤️</div>
                  <h3 style={{ fontSize: 18, marginBottom: 4 }}>Your Favorite: Bottle {favoriteBottle}</h3>
                  {productTitle ? (
                    <div style={{ marginTop: 12 }}>
                      {productImage && (
                        <img src={productImage} alt={productTitle}
                          style={{ width: 80, height: 100, objectFit: 'contain', marginBottom: 8 }} />
                      )}
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--rc-orange)' }}>
                        {productTitle}
                      </div>
                      {favBottle?.product?.vendor && (
                        <div style={{ fontSize: 13, color: 'var(--rc-gray-500)', marginTop: 4 }}>
                          {favBottle.product.vendor}
                          {favBottle.product.details?.proof ? ' · ' + favBottle.product.details.proof : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--rc-gray-500)', fontSize: 14 }}>
                      Waiting for bottle reveal...
                    </p>
                  )}
                </div>
              );
            })()}

            <ReviewPoster
              eventId={eventId}
              guestId={guestId}
              bottles={event.bottles}
            />

            <Leaderboard
              leaderboard={leaderboard}
              prizes={prizes}
              highlightGuestId={guestId}
              startDelay={3000}
            />
          </div>
        </div>
      </>
    );
  }

  // ── Active Tasting — Bottle Card + Form ────────────────

  const activeBottle = viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle;
  const alreadySubmitted = !viewingPrevBottle && currentBottle && submitted[currentBottle.letter];

  return (
    <>
      <TopBar eventName={event.name} />
      <div className="page">
        <div className="container-narrow" style={{ margin: '0 auto' }}>

          {/* Bottle Header */}
          {activeBottle && (
            <div className="card" style={{ marginBottom: 16, textAlign: 'center' }}>
              <div className="bottle-letter" style={{ width: 64, height: 64, fontSize: 28, margin: '0 auto 12px' }}>
                {activeBottle.letter}
              </div>
              <h2 style={{ fontSize: 22 }}>
                {viewingPrevBottle ? 'Editing: ' : ''}Bottle {activeBottle.letter}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--rc-gray-500)' }}>
                Taste, rate, and guess what this rye is!
              </p>
              {viewingPrevBottle && (
                <button
                  onClick={() => { setViewingPrevBottle(null); resetForm(); }}
                  style={{
                    marginTop: 8, padding: '6px 16px', borderRadius: 8, fontSize: 13,
                    fontWeight: 600, border: '1px solid var(--rc-gray-400)', background: 'var(--rc-white)',
                    color: 'var(--rc-gray-700)', cursor: 'pointer',
                  }}
                >
                  ← Back to Current Bottle
                </button>
              )}
            </div>
          )}

          {alreadySubmitted ? (
            <div>
              <div className="card" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                <h3>Response Submitted!</h3>
                {allBottlesTasted ? (
                  <p style={{ color: 'var(--rc-gray-500)', fontSize: 14 }}>
                    All bottles tasted! Pick your favorite while the host wraps up.
                  </p>
                ) : (
                  <div style={{
                    marginTop: 16,
                    padding: '16px 20px',
                    background: 'var(--rc-orange-light)',
                    borderRadius: 12,
                    border: '2px solid var(--rc-orange)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <div className="spinner" style={{ width: 20, height: 20 }} />
                      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--rc-orange)' }}>
                        Waiting for the host...
                      </span>
                    </div>
                    <p style={{ color: 'var(--rc-gray-500)', fontSize: 13, marginTop: 8, marginBottom: 0 }}>
                      Sit tight — the next bottle is coming up shortly!
                    </p>
                  </div>
                )}
              </div>

              {/* Favorite Bottle Prompt — shows after all bottles tasted */}
              {allBottlesTasted && !favoriteSubmitted && (
                <div className="card" ref={favoriteRef} style={{ marginTop: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>❤️</div>
                  <h3 style={{ marginBottom: 8 }}>Pick Your Favorite!</h3>
                  <p style={{ color: 'var(--rc-gray-500)', fontSize: 14, marginBottom: 16 }}>
                    Of all the bottles tonight, which was your favorite pour?
                  </p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
                    {(event.bottles || []).map((bottle) => (
                      <button
                        key={bottle.letter}
                        type="button"
                        onClick={() => setFavoriteBottle(bottle.letter)}

              {/* Palate Reset Tips — shown between bottles */}
              {showResetTips && (
                <div className="card" style={{ marginTop: 16, border: '2px solid var(--rc-orange)', background: 'var(--rc-orange-light)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <h3 style={{ fontSize: 15, color: 'var(--rc-orange)', margin: 0 }}>Reset Your Palate</h3>
                    <button onClick={() => setShowResetTips(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--rc-gray-500)' }}>✕</button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--rc-gray-700)', lineHeight: 1.6 }}>
                    <div style={{ marginBottom: 6 }}><strong>Sip water</strong> — still, room temperature (not sparkling)</div>
                    <div style={{ marginBottom: 6 }}><strong>Eat a plain cracker</strong> — unsalted crackers or bread reset taste buds</div>
                    <div style={{ marginBottom: 6 }}><strong>Breathe fresh air</strong> — step away from the glasses briefly to reset your nose</div>
                    <div><strong>Wait 1-2 minutes</strong> — give your palate time to recover before the next pour</div>
                  </div>
                </div>
              )}

              {/* Go Back & Edit Previous Bottles */}
              {Object.keys(savedResponses).length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                  <h3 style={{ fontSize: 15, marginBottom: 8 }}>Edit a Previous Bottle</h3>
                  <p style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginBottom: 10 }}>
                    Want to change your answer? Tap a bottle to re-edit your response.
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Object.keys(savedResponses).map((letter) => (
                      <button
                        key={letter}
                        onClick={() => loadPreviousBottle(letter)}
                        style={{
                          padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                          border: '2px solid var(--rc-orange)', background: 'var(--rc-white)',
                          color: 'var(--rc-orange)', cursor: 'pointer',
                        }}
                      >
                        Bottle {letter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 12,
                          border: '2px solid',
                          borderColor: favoriteBottle === bottle.letter ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                          background: favoriteBottle === bottle.letter ? 'var(--rc-orange)' : 'var(--rc-white)',
                          color: favoriteBottle === bottle.letter ? '#fff' : 'var(--rc-black)',
                          fontSize: 20,
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {bottle.letter}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={handleFavoriteSubmit}
                    disabled={!favoriteBottle}
                  >
                    Lock In Favorite
                  </button>
                </div>
              )}

              {allBottlesTasted && favoriteSubmitted && (
                <div className="card" style={{ marginTop: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 8 }}>🔒</div>
                  <h3>Favorite Locked: Bottle {favoriteBottle}</h3>
                  <p style={{ color: 'var(--rc-gray-500)', fontSize: 14 }}>
                    Great pick! Waiting for the host to reveal the results...
                  </p>
                </div>
              )}
            </div>
          ) : (currentBottle || viewingPrevBottle) ? (
            <div>
              {/* Nose Notes Pill Box */}
              {activeBottle?.noseNotePills?.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 4 }}>Nose — What do you smell?</h3>
                <p style={{ fontSize: 12, color: 'var(--rc-orange)', fontWeight: 600, marginBottom: 8 }}>
                  {(viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.noseRealCount || '?'} of {(viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.noseNotePills?.length || '?'} are real — select up to {(viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.noseRealCount || '?'}
                </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {activeBottle.noseNotePills.map((pill) => (
                      <button
                        key={pill.text}
                        type="button"
                        onClick={() => {
                      const limit = (viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.noseRealCount || 99;
                      if (selectedNose.includes(pill.text) || selectedNose.length < limit) {
                        toggleNote('nose', pill.text);
                      }
                    }}
                        title={pill.desc || ''}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: '2px solid',
                          borderColor: selectedNose.includes(pill.text) ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                          background: selectedNose.includes(pill.text) ? 'var(--rc-orange-light)' : 'var(--rc-white)',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: selectedNose.includes(pill.text) ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        {pill.emoji && <span style={{ marginRight: 4 }}>{pill.emoji}</span>}{pill.text}
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
                  <h3 style={{ fontSize: 16, marginBottom: 4 }}>Palate — What do you taste?</h3>
                <p style={{ fontSize: 12, color: 'var(--rc-orange)', fontWeight: 600, marginBottom: 8 }}>
                  {(viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.palateRealCount || '?'} of {(viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.palateNotePills?.length || '?'} are real — select up to {(viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.palateRealCount || '?'}
                </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {activeBottle.palateNotePills.map((pill) => (
                      <button
                        key={pill.text}
                        type="button"
                        onClick={() => {
                      const limit = (viewingPrevBottle ? allBottleData[viewingPrevBottle] : currentBottle)?.palateRealCount || 99;
                      if (selectedPalate.includes(pill.text) || selectedPalate.length < limit) {
                        toggleNote('palate', pill.text);
                      }
                    }}
                        title={pill.desc || ''}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 20,
                          border: '2px solid',
                          borderColor: selectedPalate.includes(pill.text) ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                          background: selectedPalate.includes(pill.text) ? 'var(--rc-orange-light)' : 'var(--rc-white)',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: selectedPalate.includes(pill.text) ? 600 : 400,
                          transition: 'all 0.15s',
                        }}
                      >
                        {pill.emoji && <span style={{ marginRight: 4 }}>{pill.emoji}</span>}{pill.text}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 10, marginBottom: 0, fontStyle: 'italic' }}>
                    TIP: Take a small sip and let it coat your tongue. Wait 20 seconds, then sip again — you'll pick up different notes.
                  </p>
                </div>
              )}

              {/* Flavor Profile Sliders */}
              {activeBottle?.flavorProfileKeys?.length > 0 && (
                <div className="card" style={{ marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, marginBottom: 12 }}>Flavor Profile</h3>
                  {activeBottle.flavorProfileKeys.map((key) => (
                    <div key={key} style={{ marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                        <span style={{ fontWeight: 600 }}>{FLAVOR_LABELS[key] || key}</span>
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

              {/* Price Guess + Bottle Guess + Rating */}
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
                      Community Rating Guess
                    </label>
                    <input
                      className="form-input"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={rating}
                      onChange={(e) => setRating(parseFloat(e.target.value))}
                    />
                  </div>
                </div>

                {/* Bottle Guess */}
                {activeBottle?.bottleOptions?.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <label style={{ fontWeight: 600, fontSize: 13, display: 'block', marginBottom: 4 }}>
                      Which bottle is this?
                    </label>
                    <select
                      className="form-input"
                      value={bottleGuess}
                      onChange={(e) => setBottleGuess(e.target.value)}
                    >
                      <option value="">— Take your best guess —</option>
                      {activeBottle.bottleOptions.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}
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
              <button className="btn btn-primary btn-lg btn-block" onClick={handleSubmit}>
                Submit Tasting for Bottle {activeBottle?.letter || currentBottle?.letter}
              </button>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }} />
              <p style={{ color: 'var(--rc-gray-500)' }}>Waiting for the next bottle...</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
