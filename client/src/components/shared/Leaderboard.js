import React, { useState, useEffect, useRef } from 'react';

/**
 * Animated Leaderboard — reveals entries one by one from bottom to top.
 * Props:
 *   leaderboard: [{ guestId, guestName, total, perBottle }]
 *   prizes: [{ place, description }]
 *   highlightGuestId: optional guestId to highlight as "you"
 *   onRevealComplete: called when all entries are shown
 */
export default function Leaderboard({ leaderboard, prizes = [], highlightGuestId, onRevealComplete, startDelay = 0 }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const animationStartedRef = useRef(false);

  useEffect(() => {
    if (!leaderboard?.length) return;
    // Only start the animation once — don't restart on re-renders
    if (animationStartedRef.current) return;
    animationStartedRef.current = true;

    // Reveal from last place to first, 600ms apart
    // startDelay allows the celebration to play first before revealing
    const total = leaderboard.length;
    const timers = [];

    for (let step = 0; step < total; step++) {
      timers.push(setTimeout(() => {
        setRevealedCount(step + 1);
      }, startDelay + step * 600 + 500));
    }

    return () => timers.forEach(clearTimeout);
  }, [leaderboard, startDelay]);

  if (!leaderboard?.length) return null;

  // Show entries from bottom to top as they're revealed
  const total = leaderboard.length;
  // We reveal starting from last place, so `revealedCount` tells us how many from the END have been shown
  // Actually we reveal index (total-1), then (total-2), etc.
  const visibleFromBottom = revealedCount;

  return (
    <div className="card">
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Final Standings</h2>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {leaderboard.map((entry, i) => {
          // Is this entry visible yet? We reveal from last to first
          const revealOrder = total - 1 - i; // 0 = last place revealed first
          const isRevealed = revealOrder < visibleFromBottom;
          const isMe = highlightGuestId && entry.guestId === highlightGuestId;
          const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
          const prize = prizes.find((p) => p.place === i + 1);

          return (
            <div
              key={entry.guestId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px 20px',
                background: i === 0
                  ? 'linear-gradient(135deg, #ffecd2 0%, #fff 100%)'
                  : isMe
                    ? 'var(--rc-orange-light)'
                    : 'var(--rc-gray-100)',
                borderRadius: 12,
                border: i === 0 ? '2px solid var(--rc-orange)' : isMe ? '2px solid var(--rc-orange)' : '1px solid var(--rc-gray-300)',
                // Animation
                opacity: isRevealed ? 1 : 0,
                transform: isRevealed ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                transition: 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                // Winner gets extra emphasis
                ...(i === 0 && isRevealed ? {
                  boxShadow: '0 4px 20px rgba(245, 166, 35, 0.3)',
                  transform: 'translateY(0) scale(1.02)',
                } : {}),
              }}
            >
              {/* Rank */}
              <div style={{
                width: 48,
                textAlign: 'center',
                fontSize: medal ? 32 : 22,
                fontWeight: 700,
                color: medal ? undefined : 'var(--rc-gray-500)',
              }}>
                {medal || `#${i + 1}`}
              </div>

              {/* Name + Prize */}
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 700,
                  fontSize: i === 0 ? 20 : 16,
                  color: 'var(--rc-black)',
                }}>
                  {entry.guestName}
                  {isMe && <span style={{ fontSize: 12, color: 'var(--rc-orange)', marginLeft: 8 }}>(You)</span>}
                </div>
                {/* Per-bottle breakdown */}
                <div style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 2 }}>
                  {Object.entries(entry.perBottle || {}).map(([letter, score]) => (
                    <span key={letter} style={{ marginRight: 10 }}>
                      {letter}: {score.toFixed(1)}
                    </span>
                  ))}
                </div>
                {/* Prize badge */}
                {prize && (
                  <div style={{
                    marginTop: 4,
                    display: 'inline-block',
                    padding: '2px 10px',
                    background: 'var(--rc-orange)',
                    color: 'var(--rc-black)',
                    borderRadius: 12,
                    fontSize: 12,
                    fontWeight: 600,
                  }}>
                    {prize.description}
                  </div>
                )}
              </div>

              {/* Score */}
              <div style={{
                fontSize: i === 0 ? 28 : 22,
                fontWeight: 700,
                color: 'var(--rc-orange)',
                fontFamily: 'var(--font-heading)',
              }}>
                {entry.total.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
