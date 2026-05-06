import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../shared/TopBar';
import Celebration from '../shared/Celebration';
import Leaderboard from '../shared/Leaderboard';
import wsService from '../../services/websocket';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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

const NOTE_META = {
  'caramel': { emoji: '🍮', desc: 'Rich, sweet, buttery burnt sugar' },
  'vanilla': { emoji: '🍦', desc: 'Sweet, creamy, warm extract note' },
  'cinnamon': { emoji: '🫚', desc: 'Warm, sweet bark spice' },
  'oak': { emoji: '🪵', desc: 'Woody, tannic, barrel char' },
  'honey': { emoji: '🍯', desc: 'Floral sweetness, golden syrup' },
  'pepper': { emoji: '🌶️', desc: 'Sharp black pepper bite' },
  'cherry': { emoji: '🍒', desc: 'Dark stone fruit, maraschino' },
  'apple': { emoji: '🍎', desc: 'Crisp, tart, baked apple' },
  'citrus': { emoji: '🍊', desc: 'Orange peel, lemon zest brightness' },
  'tobacco': { emoji: '🍂', desc: 'Earthy, dried leaf, pipe tobacco' },
  'leather': { emoji: '👞', desc: 'Rich, tanned hide, old library' },
  'chocolate': { emoji: '🍫', desc: 'Dark cocoa, bittersweet richness' },
  'coffee': { emoji: '☕', desc: 'Roasted espresso, dark mocha' },
  'butterscotch': { emoji: '🧈', desc: 'Buttery, brown sugar, toffee' },
  'toffee': { emoji: '🍬', desc: 'Chewy, caramelized butter candy' },
  'maple': { emoji: '🍁', desc: 'Tree syrup sweetness, pancake morning' },
  'brown sugar': { emoji: '🟫', desc: 'Molasses-tinged, warm baking' },
  'nutmeg': { emoji: '🥜', desc: 'Warm, slightly sweet holiday spice' },
  'clove': { emoji: '🌸', desc: 'Pungent, sharp, holiday ham glaze' },
  'allspice': { emoji: '🫙', desc: 'Complex: cinnamon + nutmeg + clove' },
  'mint': { emoji: '🌿', desc: 'Cool menthol, fresh spearmint' },
  'dill': { emoji: '🌱', desc: 'Pickle brine, herbal anise' },
  'herbal': { emoji: '🍃', desc: 'Green herbs, sage, thyme' },
  'sage': { emoji: '🫒', desc: 'Earthy, savory dried herb' },
  'rye spice': { emoji: '🌾', desc: 'Grain-forward peppery bite' },
  'baking spice': { emoji: '🧁', desc: 'Cinnamon-nutmeg-clove blend' },
  'dark fruit': { emoji: '🫐', desc: 'Plum, fig, blackberry jam' },
  'dried fruit': { emoji: '🍇', desc: 'Raisin, date, prune sweetness' },
  'banana': { emoji: '🍌', desc: 'Ripe banana, tropical ester' },
  'coconut': { emoji: '🥥', desc: 'Tropical, creamy, suntan lotion' },
  'smoke': { emoji: '💨', desc: 'Campfire, charred wood, peat' },
  'char': { emoji: '🔥', desc: 'Burnt barrel interior, toast' },
  'molasses': { emoji: '🏺', desc: 'Thick, dark, bittersweet syrup' },
  'corn': { emoji: '🌽', desc: 'Sweet grain, fresh cornbread' },
  'grain': { emoji: '🌾', desc: 'Cereal, fresh bread dough' },
  'floral': { emoji: '🌺', desc: 'Rose, lavender, perfume notes' },
  'rose': { emoji: '🌹', desc: 'Delicate floral, Turkish delight' },
  'ginger': { emoji: '🫚', desc: 'Spicy root, warming zing' },
  'anise': { emoji: '⭐', desc: 'Black licorice, star anise' },
  'black walnut': { emoji: '🥜', desc: 'Bitter, tannic, earthy nut' },
  'pecan': { emoji: '🥜', desc: 'Buttery, sweet toasted nut' },
  'almond': { emoji: '🥜', desc: 'Marzipan, subtle nutty sweetness' },
  'peanut': { emoji: '🥜', desc: 'Roasted shell nut, salty-sweet' },
  'caramel corn': { emoji: '🍿', desc: 'Sweet kettle corn, carnival treat' },
  'orange peel': { emoji: '🍊', desc: 'Bitter citrus rind, marmalade' },
  'lemon': { emoji: '🍋', desc: 'Bright, tart, zesty citrus' },
  'pine': { emoji: '🌲', desc: 'Resinous, fresh evergreen needle' },
  'eucalyptus': { emoji: '🌿', desc: 'Menthol-forward, medicinal cool' },
  'white pepper': { emoji: '⚪', desc: 'Sharp, less earthy than black' },
  'black pepper': { emoji: '⚫', desc: 'Classic peppercorn heat and aroma' },
};
function getNoteMeta(text) {
  const key = text.toLowerCase();
  return NOTE_META[key] || { emoji: '👃', desc: '' };
}

export default function AdminEventLive({ eventId }) {
  const navigate = useNavigate();
  const { customer } = useAuth();
  const [event, setEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [guestResponses, setGuestResponses] = useState({}); // { bottleLetter: { guestId: true } }
  const [allRespondedMap, setAllRespondedMap] = useState({}); // { bottleLetter: bool }
  const [leaderboard, setLeaderboard] = useState(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackName, setFeedbackName] = useState(customer?.displayName || customer?.firstName || '');
  const [feedbackEmail, setFeedbackEmail] = useState(customer?.email || '');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [showTastingTips, setShowTastingTips] = useState(false);
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);

  // Connect WebSocket
  useEffect(() => {
    wsService.connect({ eventId, role: 'admin' });

    const unsubs = [
      wsService.on('connected', () => setConnected(true)),
      wsService.on('disconnected', () => setConnected(false)),

      wsService.on('sync:state', (msg) => {
        setEvent(msg.event);
        if (msg.leaderboard) {
          setLeaderboard(msg.leaderboard);
          if (msg.event?.status === 'complete') {
            setCelebrate(true);
          }
        }
      }),

      wsService.on('guest:joined', (msg) => {
        setEvent((prev) => {
          if (!prev) return prev;
          const existing = (prev.guests || []);
          // Deduplicate: if guest already exists update their entry, otherwise append
          const alreadyExists = existing.some((g) => g.id === msg.guest.id);
          const guests = alreadyExists
            ? existing.map((g) => g.id === msg.guest.id ? { ...g, ...msg.guest, connected: true } : g)
            : [...existing, msg.guest];
          return { ...prev, guestCount: msg.guestCount, guests };
        });
      }),

      wsService.on('guest:disconnected', (msg) => {
        setEvent((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            guestCount: msg.guestCount,
            guests: (prev.guests || []).map((g) =>
              g.id === msg.guestId ? { ...g, connected: false } : g
            ),
          };
        });
      }),

      wsService.on('guest:response', (msg) => {
        setGuestResponses((prev) => ({
          ...prev,
          [msg.bottleLetter]: { ...(prev[msg.bottleLetter] || {}), [msg.guestId]: msg.guestName },
        }));
        setAllRespondedMap((prev) => ({
          ...prev,
          [msg.bottleLetter]: msg.allResponded,
        }));
        if (msg.liveLeaderboard) {
          setLiveLeaderboard(msg.liveLeaderboard);
        }
      }),

      wsService.on('event:complete', (msg) => {
        setLeaderboard(msg.leaderboard);
        setCelebrate(true); // Fire confetti immediately BEFORE leaderboard reveals
        setEvent((prev) => prev ? { ...prev, status: 'complete' } : prev);
      }),
    ];

    // Re-sync state when tab becomes visible (handles missed WS messages)
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
  }, [eventId]);

  // Admin actions
  const startTasting = useCallback(() => {
    wsService.send({ type: 'event:start' });
  }, []);

  const nextBottle = useCallback(() => {
    wsService.send({ type: 'bottle:next' });
  }, []);

  const revealBottle = useCallback((letter) => {
    wsService.send({ type: 'bottle:reveal', letter });
  }, []);

  const calculateScores = useCallback(() => {
    wsService.send({ type: 'event:calculate-scores' });
  }, []);

  const copyJoinLink = useCallback(() => {
    if (!event?.inviteCode) return;
    const joinUrl = `${window.location.origin}/join/${event.inviteCode}`;
    navigator.clipboard.writeText(joinUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(() => {
      // Fallback for non-HTTPS contexts
      window.prompt('Copy this link:', joinUrl);
    });
  }, [event?.inviteCode]);

  const handleFeedbackSubmit = useCallback(async () => {
    if (!feedbackRating) return;
    try {
      await api.submitFeedback(eventId, {
        rating: feedbackRating,
        comment: feedbackComment,
        hostName: feedbackName || undefined,
        hostEmail: feedbackEmail || undefined,
      });
    } catch (err) {
      console.error('Feedback submission error (non-critical):', err);
    }
    setFeedbackSubmitted(true);
  }, [eventId, feedbackRating, feedbackComment, feedbackName, feedbackEmail]);

  const endEvent = useCallback(async () => {
    if (!window.confirm('End this event? It will be archived and removed from your active events list.')) return;
    try {
      await api.endEvent(eventId);
      navigate('/admin');
    } catch (err) {
      console.error('Failed to end event:', err);
    }
  }, [eventId, navigate]);

  const deleteEventAndReturn = useCallback(async () => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    try {
      await api.deleteEvent(eventId);
      navigate('/admin');
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  }, [eventId, navigate]);

  if (!event) {
    return (
      <>
        <TopBar />
        <div className="page">
          <div className="container">
            <div className="loading">
              <div className="spinner" />
              Connecting to event...
            </div>
          </div>
        </div>
      </>
    );
  }

  const currentBottle = event.bottles?.[event.currentBottleIndex];
  const isLastBottle = event.currentBottleIndex >= event.bottleCount - 1;
  const currentLetter = currentBottle?.letter;
  const allCurrentResponded = currentLetter ? allRespondedMap[currentLetter] : false;
  const currentResponders = currentLetter ? guestResponses[currentLetter] || {} : {};

  return (
    <>
      <TopBar eventName={event.name} />
      <div className="page">
        <div className="container">

          {/* Connection Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{
              width: 10, height: 10, borderRadius: '50%',
              background: connected ? 'var(--rc-green)' : 'var(--rc-red)',
            }} />
            <span style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
              {connected ? 'Connected' : 'Reconnecting...'}
            </span>
            <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--rc-gray-500)' }}>
              Invite code: <strong style={{ color: 'var(--rc-orange)' }}>{event.inviteCode}</strong>
              <button
                onClick={copyJoinLink}
                style={{
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: '1px solid var(--rc-orange)',
                  borderRadius: 6,
                  background: linkCopied ? 'var(--rc-orange)' : 'transparent',
                  color: linkCopied ? '#fff' : 'var(--rc-orange)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                {linkCopied ? 'Copied!' : 'Copy Join Link'}
              </button>
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

            {/* ── Main Panel ──────────────────────── */}
            <div>

              {/* SETUP state: waiting to start */}
              {event.status === 'setup' && (
                <div className="card" style={{ textAlign: 'center' }}>
                  <h2 style={{ fontSize: 24, marginBottom: 8 }}>Ready to Start</h2>
                  <p style={{ color: 'var(--rc-gray-500)', marginBottom: 24 }}>
                    {event.guestCount || 0} guest{event.guestCount !== 1 ? 's' : ''} connected. Start when everyone's here!
                  </p>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={startTasting}
                    disabled={!event.guestCount}
                  >
                    Start Tasting — Bottle A
                  </button>
                  {/* Delete event option — only before anyone has joined */}
                  {(!event.guestCount || event.guestCount === 0) && (
                    <div style={{ marginTop: 20 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ color: 'var(--rc-red)', borderColor: 'var(--rc-red)' }}
                        onClick={deleteEventAndReturn}
                      >
                        Delete Event
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ACTIVE state: tasting in progress */}
              {event.status === 'active' && currentBottle && (
                <div>
                  {/* Current Bottle Card */}
                  <div className="card" style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div className="bottle-letter" style={{ width: 56, height: 56, fontSize: 24 }}>
                        {currentBottle.letter}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h2 style={{ fontSize: 20, marginBottom: 4 }}>
                          Now Tasting: Bottle {currentBottle.letter}
                        </h2>
                        <p style={{ fontSize: 14, color: 'var(--rc-gray-500)' }}>
                          {event.currentBottleIndex + 1} of {event.bottleCount} bottles
                        </p>
                      </div>
                      {currentBottle.product?.image?.url && (
                        <img
                          src={currentBottle.product.image.url}
                          alt=""
                          style={{ width: 60, height: 80, objectFit: 'contain' }}
                        />
                      )}
                    </div>

                    {/* Admin sees the real product info */}
                    <div style={{ marginTop: 16, padding: 12, background: 'var(--rc-gray-100)', borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                        {currentBottle.product?.title}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
                        {[
                          currentBottle.product?.vendor,
                          currentBottle.product?.details?.proof,
                          currentBottle.product?.details?.age,
                        ].filter(Boolean).join(' · ')}
                      </div>
                      {currentBottle.product?.details?.retailPrice && (
                        <span style={{ color: 'var(--rc-orange)', fontWeight: 600, fontSize: 14 }}>
                          ${currentBottle.product.details.retailPrice}
                        </span>
                      )}
                    </div>

                    {/* Toggle buttons */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowCommunity(!showCommunity)}
                      >
                        {showCommunity ? 'Hide' : 'Show'} Community Data
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowTastingTips(!showTastingTips)}
                        style={{ borderColor: 'var(--rc-orange)', color: showTastingTips ? '#fff' : 'var(--rc-orange)', background: showTastingTips ? 'var(--rc-orange)' : 'transparent' }}
                      >
                        {showTastingTips ? 'Hide' : 'Show'} Host Tips
                      </button>
                    </div>

                    {showCommunity && currentBottle.product?.community && (
                      <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--rc-gray-300)', borderRadius: 8, fontSize: 13 }}>
                        <div style={{ marginBottom: 8 }}>
                          <strong>Community Score:</strong> {currentBottle.product.community.score}/5
                        </div>
                        {currentBottle.product.community.flavorProfile && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                            {Object.entries(currentBottle.product.community.flavorProfile).map(([k, v]) => (
                              v != null && (
                                <div key={k}>
                                  <span style={{ color: 'var(--rc-gray-500)' }}>{FLAVOR_LABELS[k] || k}:</span> {v}/10
                                </div>
                              )
                            ))}
                          </div>
                        )}
                        {currentBottle.product.community.noseNotes?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Nose:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {currentBottle.product.community.noseNotes.map((note) => {
                          const meta = getNoteMeta(note);
                          return (
                            <span key={note} title={meta.desc} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '2px 8px', borderRadius: 12, fontSize: 12,
                              background: 'var(--rc-orange-light)', border: '1px solid var(--rc-orange)',
                              cursor: meta.desc ? 'help' : 'default',
                            }}>
                              {meta.emoji} {note}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                          </div>
                        )}
                        {currentBottle.product.community.palateNotes?.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <strong>Palate:</strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {currentBottle.product.community.palateNotes.map((note) => {
                          const meta = getNoteMeta(note);
                          return (
                            <span key={note} title={meta.desc} style={{
                              display: 'inline-flex', alignItems: 'center', gap: 3,
                              padding: '2px 8px', borderRadius: 12, fontSize: 12,
                              background: 'var(--rc-gray-200)', border: '1px solid var(--rc-gray-400)',
                              cursor: meta.desc ? 'help' : 'default',
                            }}>
                              {meta.emoji} {note}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Host Tasting Tips — expert knowledge for the admin */}
                    {showTastingTips && (
                      <div style={{ marginTop: 12, padding: 16, border: '2px solid var(--rc-orange)', borderRadius: 12, background: 'var(--rc-orange-light)', fontSize: 13 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--rc-orange)' }}>
                          Host Tasting Guide
                        </div>

                        <div style={{ marginBottom: 14, padding: 12, background: 'rgba(232,134,12,0.1)', borderRadius: 8, border: '1px solid var(--rc-orange)' }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>Between Pours — Palate Reset</div>
                          <div style={{ color: 'var(--rc-gray-700)', lineHeight: 1.5 }}>
                            This is key to an accurate tasting. Between each bottle, have guests:
                          </div>
                          <ul style={{ margin: '6px 0 0 16px', padding: 0, color: 'var(--rc-gray-700)', lineHeight: 1.6 }}>
                            <li><strong>Sip water</strong> — still water at room temperature, not sparkling</li>
                            <li><strong>Eat a plain cracker or bread</strong> — unsalted crackers, baguette slices, or lightly salted nuts reset your taste buds</li>
                            <li><strong>Wait 1-2 minutes</strong> — give the palate time to recover before the next pour, especially after higher proof bottles</li>
                            <li><strong>Breathe fresh air</strong> — step away from the glasses briefly to reset the nose</li>
                          </ul>
                          <div style={{ color: 'var(--rc-gray-500)', marginTop: 6, fontSize: 12, fontStyle: 'italic' }}>
                            Avoid bold foods (spicy, garlic, citrus) during the structured tasting — save those for after.
                          </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>How to Nose</div>
                          <div style={{ color: 'var(--rc-gray-700)', lineHeight: 1.5 }}>
                            Cup the glass and swirl gently. Nose from a distance first (2-3 inches), then bring closer. Take short sniffs with your mouth slightly open — this draws out the aromas. Let the alcohol burn fade before going back. The second and third passes reveal the real character.
                          </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>How to Taste</div>
                          <div style={{ color: 'var(--rc-gray-700)', lineHeight: 1.5 }}>
                            Take a small sip and let it coat your entire tongue. Wait 15-20 seconds before the second sip — you'll pick up completely different notes. The finish (aftertaste) is just as important: does it linger? Does it change? Optionally add a few drops of water, then re-nose and re-sip to see how the flavors open up.
                          </div>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>Tasting Prompts to Share</div>
                          <div style={{ color: 'var(--rc-gray-700)', lineHeight: 1.5 }}>
                            Help guests who say "I can't taste notes" by offering options:
                          </div>
                          <ul style={{ margin: '4px 0 0 16px', padding: 0, color: 'var(--rc-gray-700)', lineHeight: 1.6 }}>
                            <li>"Is this dill or mint to you?"</li>
                            <li>"Peppercorn, cinnamon, or clove?"</li>
                            <li>"Citrus: lemon peel or grapefruit pith?"</li>
                            <li>"Does the finish feel dry like tea, or sweet like caramel?"</li>
                          </ul>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8 }}>Flavor Profile Scale Guide</div>
                          <div style={{ color: 'var(--rc-gray-500)', marginBottom: 8, fontSize: 12 }}>
                            Help guests understand what 0 vs 10 means for each slider:
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4, color: 'var(--rc-gray-700)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px', background: 'rgba(0,0,0,0.04)', borderRadius: 6, fontWeight: 600 }}>
                              <span>Category</span><span>0 (Low)</span><span>10 (High)</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px' }}>
                              <strong>Sweetness</strong><span>Bone dry, no sweetness</span><span>Very sweet — maple syrup, honey</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px', background: 'rgba(0,0,0,0.02)' }}>
                              <strong>Rye Spice</strong><span>No spice, smooth</span><span>Intense pepper/cinnamon burn</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px' }}>
                              <strong>Herbal/Mint</strong><span>No herbal notes</span><span>Strong dill, eucalyptus, menthol</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px', background: 'rgba(0,0,0,0.02)' }}>
                              <strong>Fruit</strong><span>No fruit detected</span><span>Bursting cherry, apple, citrus</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px' }}>
                              <strong>Oak/Vanilla</strong><span>No wood influence</span><span>Heavy char, rich vanilla, coconut</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px', background: 'rgba(0,0,0,0.02)' }}>
                              <strong>Body</strong><span>Thin, watery, light</span><span>Thick, chewy, full mouthfeel</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px' }}>
                              <strong>Heat</strong><span>No burn, very smooth</span><span>Fiery, intense alcohol burn</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr', gap: 4, fontSize: 12, padding: '4px 8px', background: 'rgba(0,0,0,0.02)' }}>
                              <strong>Finish</strong><span>Gone instantly, no linger</span><span>Lasts minutes, evolving flavors</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, marginBottom: 4 }}>Price Guessing Tips</div>
                          <div style={{ color: 'var(--rc-gray-700)', lineHeight: 1.5 }}>
                            Higher proof often means higher price. Complex, layered flavors and long finishes typically indicate more expensive bottles. Very smooth, easy-drinking pours can go either way — could be a well-crafted budget bottle or a premium aged release.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Response Progress */}
                  <div className="card" style={{ marginBottom: 16 }}>
                    <h3 style={{ marginBottom: 12 }}>Guest Responses — Bottle {currentLetter}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {(event.guests || []).map((guest) => {
                        const hasResponded = !!currentResponders[guest.id];
                        return (
                          <div
                            key={guest.id}
                            style={{
                              padding: '6px 12px',
                              borderRadius: 20,
                              fontSize: 13,
                              fontWeight: 600,
                              background: hasResponded ? 'var(--rc-green)' : 'var(--rc-gray-300)',
                              color: hasResponded ? '#fff' : 'var(--rc-gray-700)',
                            }}
                          >
                            {hasResponded ? '✓ ' : ''}{guest.name}
                          </div>
                        );
                      })}
                    </div>
                    {allCurrentResponded && (
                      <div style={{ marginTop: 12, color: 'var(--rc-green)', fontWeight: 600, fontSize: 14 }}>
                        All guests have responded!
                      </div>
                    )}
                  </div>

                  {/* Admin Controls */}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-secondary" onClick={() => revealBottle(currentLetter)}>
                      Reveal Bottle {currentLetter}
                    </button>
                    {isLastBottle ? (
                      <button className="btn btn-primary btn-lg" onClick={calculateScores}>
                        Calculate Final Scores
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-lg"
                        onClick={nextBottle}
                      >
                        Next Bottle ({String.fromCharCode(66 + event.currentBottleIndex)})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* SCORING state */}
              {event.status === 'scoring' && (
                <div className="card" style={{ textAlign: 'center' }}>
                  <div className="spinner" style={{ margin: '0 auto 16px' }} />
                  <h2>Calculating Scores...</h2>
                  <p style={{ color: 'var(--rc-gray-500)' }}>Comparing everyone's tasting notes against the community data.</p>
                  <button className="btn btn-primary btn-lg" onClick={calculateScores} style={{ marginTop: 16 }}>
                    Calculate Now
                  </button>
                </div>
              )}

              {/* COMPLETE state — Animated Leaderboard + Celebration */}
              {event.status === 'complete' && leaderboard && (
                <>
                  <Celebration active={celebrate} />
                  <Leaderboard
                    leaderboard={leaderboard}
                    prizes={event.prizes}
                    startDelay={3000}
                  />
                  {/* Host Feedback Card */}
                  <div className="card" style={{ marginTop: 24 }}>
                    {feedbackSubmitted ? (
                      <div style={{ textAlign: 'center', padding: '12px 0' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>Thank you!</div>
                        <p style={{ color: 'var(--rc-gray-500)', fontSize: 14 }}>
                          Your feedback helps us improve the tasting experience.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <h3 style={{ fontSize: 16, marginBottom: 4 }}>How was your event?</h3>
                        <p style={{ color: 'var(--rc-gray-500)', fontSize: 13, marginBottom: 16 }}>
                          Rate RyeCentral's Home Rye Whiskey Tasting App — your review will be posted to our store!
                        </p>
                        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setFeedbackRating(star)}
                              style={{
                                fontSize: 28,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: star <= feedbackRating ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                                transition: 'color 0.15s',
                                padding: 2,
                              }}
                            >
                              {star <= feedbackRating ? '\u2605' : '\u2606'}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <input
                            className="form-input"
                            type="text"
                            placeholder="Your name"
                            value={feedbackName}
                            onChange={(e) => setFeedbackName(e.target.value)}
                          />
                          <input
                            className="form-input"
                            type="email"
                            placeholder="Your email"
                            value={feedbackEmail}
                            onChange={(e) => setFeedbackEmail(e.target.value)}
                          />
                        </div>
                        <textarea
                          className="form-input"
                          rows={2}
                          placeholder="Any feedback or suggestions? (optional)"
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value)}
                          style={{ resize: 'vertical', marginBottom: 12 }}
                        />
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleFeedbackSubmit}
                          disabled={!feedbackRating}
                        >
                          Submit Feedback
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: 16, textAlign: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={endEvent}
                      style={{ color: 'var(--rc-red)' }}
                    >
                      End Event &amp; Archive
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* ── Sidebar: Guest List + Bottle Progress ──── */}
            <div>
              {/* Guest List */}
              <div className="card" style={{ marginBottom: 16 }}>
                <h3 style={{ marginBottom: 12, fontSize: 15 }}>
                  Guests ({event.guests?.length || 0})
                </h3>
                {(event.guests || []).length === 0 ? (
                  <p style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
                    No guests yet. Share invite code: <strong>{event.inviteCode}</strong>
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(event.guests || []).map((guest) => (
                      <div key={guest.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: guest.connected !== false ? 'var(--rc-green)' : 'var(--rc-gray-300)',
                        }} />
                        <span>{guest.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Bottle Progress */}
              <div className="card">
                <h3 style={{ marginBottom: 12, fontSize: 15 }}>Bottles</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(event.bottles || []).map((bottle, i) => {
                    const isCurrent = i === event.currentBottleIndex;
                    const isDone = i < event.currentBottleIndex;
                    return (
                      <div
                        key={bottle.letter}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 8,
                          background: isCurrent ? 'var(--rc-orange-light)' : isDone ? '#f0f9f0' : 'transparent',
                          border: isCurrent ? '2px solid var(--rc-orange)' : '1px solid transparent',
                        }}
                      >
                        <span className="bottle-letter" style={{
                          width: 28, height: 28, fontSize: 13,
                          background: isCurrent ? 'var(--rc-orange)' : isDone ? 'var(--rc-green)' : 'var(--rc-gray-300)',
                          color: isDone ? '#fff' : 'var(--rc-black)',
                        }}>
                          {isDone ? '✓' : bottle.letter}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: isCurrent ? 700 : 400, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {bottle.product?.title?.replace(/ Review.*$/i, '').replace(/\s*Rye Whiskey$/i, '') || `Bottle ${bottle.letter}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Live Leaderboard — visible during active tasting */}
            {event.status === 'active' && liveLeaderboard.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 12, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'var(--rc-green)', animation: 'pulse 2s infinite' }} />
                  Live Standings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {liveLeaderboard.map((entry, rank) => (
                    <div key={entry.guestId} style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 8,
                      background: rank === 0 ? 'var(--rc-orange-light)' : 'transparent',
                      border: rank === 0 ? '1px solid var(--rc-orange)' : '1px solid var(--rc-gray-200)',
                    }}>
                      <span style={{
                        width: 22, height: 22, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700,
                        background: rank < 3 ? 'var(--rc-orange)' : 'var(--rc-gray-300)',
                        color: rank < 3 ? '#fff' : 'var(--rc-gray-700)',
                      }}>
                        {rank + 1}
                      </span>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: rank === 0 ? 700 : 400 }}>
                        {entry.guestName}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rc-orange)' }}>
                        {Math.round(entry.total)} pts
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: 'var(--rc-gray-400)', marginTop: 8, textAlign: 'center' }}>
                  Updates as guests submit ratings
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
