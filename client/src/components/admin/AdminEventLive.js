import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../shared/TopBar';
import Celebration from '../shared/Celebration';
import Leaderboard from '../shared/Leaderboard';
import wsService from '../../services/websocket';
import * as api from '../../services/api';

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

export default function AdminEventLive({ eventId }) {
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [connected, setConnected] = useState(false);
  const [guestResponses, setGuestResponses] = useState({}); // { bottleLetter: { guestId: true } }
  const [allRespondedMap, setAllRespondedMap] = useState({}); // { bottleLetter: bool }
  const [leaderboard, setLeaderboard] = useState(null);
  const [showCommunity, setShowCommunity] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const handleRevealComplete = useCallback(() => setCelebrate(true), []);

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
      }),

      wsService.on('event:complete', (msg) => {
        setLeaderboard(msg.leaderboard);
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

  const endEvent = useCallback(async () => {
    if (!window.confirm('End this event? It will be archived and removed from your active events list.')) return;
    try {
      await api.endEvent(eventId);
      navigate('/admin');
    } catch (err) {
      console.error('Failed to end event:', err);
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
            <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--rc-gray-500)' }}>
              Invite code: <strong style={{ color: 'var(--rc-orange)' }}>{event.inviteCode}</strong>
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

                    {/* Toggle community data */}
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 12 }}
                      onClick={() => setShowCommunity(!showCommunity)}
                    >
                      {showCommunity ? 'Hide' : 'Show'} Community Data
                    </button>

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
                            <strong>Nose:</strong>{' '}
                            {currentBottle.product.community.noseNotes.join(', ')}
                          </div>
                        )}
                        {currentBottle.product.community.palateNotes?.length > 0 && (
                          <div style={{ marginTop: 4 }}>
                            <strong>Palate:</strong>{' '}
                            {currentBottle.product.community.palateNotes.join(', ')}
                          </div>
                        )}
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
                    onRevealComplete={handleRevealComplete}
                  />
                  <div style={{ marginTop: 24, textAlign: 'center' }}>
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
          </div>
        </div>
      </div>
    </>
  );
}
