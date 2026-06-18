/**
 * CommunityComparison — Post-review deep-dive showing how a guest's
 * blind tasting answers compared to the community consensus for each bottle.
 *
 * Sections per bottle:
 *   1. Flavor radar chart (SVG) — guest vs community overlay
 *   2. Nose notes — correct / wrong / missed pills
 *   3. Palate notes — same treatment
 *   4. Price guess vs actual retail
 *   5. Rating vs community score
 *   6. Bottle ID — correct guess?
 */
import React, { useState } from 'react';
import NoteIcon from './NoteIcons';

const FLAVOR_KEYS = [
  'sweetness', 'ryeSpice', 'herbalMint', 'fruit',
  'oakVanilla', 'body', 'heat', 'finishLength',
];
const FLAVOR_LABELS = {
  sweetness: 'Sweet',
  ryeSpice: 'Rye Spice',
  herbalMint: 'Herbal',
  fruit: 'Fruit',
  oakVanilla: 'Oak',
  body: 'Body',
  heat: 'Heat',
  finishLength: 'Finish',
};

// ── Radar chart (SVG) ─────────────────────────────────────

function RadarChart({ guestProfile, communityProfile }) {
  const size = 240;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 90;
  const steps = 5; // grid rings (2, 4, 6, 8, 10)

  const angleStep = (2 * Math.PI) / FLAVOR_KEYS.length;
  const startAngle = -Math.PI / 2; // start at top

  const getPoint = (index, value) => {
    const angle = startAngle + index * angleStep;
    const r = (value / 10) * maxR;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };

  const polygon = (profile, color, fillOpacity) => {
    const points = FLAVOR_KEYS.map((key, i) => {
      const val = profile[key] ?? 5;
      return getPoint(i, val).join(',');
    }).join(' ');
    return (
      <polygon
        points={points}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    );
  };

  // Grid rings
  const rings = [];
  for (let s = 1; s <= steps; s++) {
    const ringPoints = FLAVOR_KEYS.map((_, i) => getPoint(i, (s / steps) * 10).join(',')).join(' ');
    rings.push(
      <polygon
        key={s}
        points={ringPoints}
        fill="none"
        stroke="var(--rc-gray-200)"
        strokeWidth={1}
      />
    );
  }

  // Axis lines
  const axes = FLAVOR_KEYS.map((_, i) => {
    const [x, y] = getPoint(i, 10);
    return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--rc-gray-200)" strokeWidth={1} />;
  });

  // Labels
  const labelRadius = maxR + 22;
  const labels = FLAVOR_KEYS.map((key, i) => {
    const angle = startAngle + i * angleStep;
    const lx = cx + labelRadius * Math.cos(angle);
    const ly = cy + labelRadius * Math.sin(angle);
    return (
      <text
        key={key}
        x={lx}
        y={ly}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={10}
        fontWeight={600}
        fill="var(--rc-gray-600)"
      >
        {FLAVOR_LABELS[key]}
      </text>
    );
  });

  // Dot markers
  const guestDots = FLAVOR_KEYS.map((key, i) => {
    const [x, y] = getPoint(i, guestProfile[key] ?? 5);
    return <circle key={key} cx={x} cy={y} r={3.5} fill="#e8860c" stroke="#fff" strokeWidth={1.5} />;
  });
  const communityDots = FLAVOR_KEYS.map((key, i) => {
    const [x, y] = getPoint(i, communityProfile[key] ?? 5);
    return <circle key={key} cx={x} cy={y} r={3.5} fill="#3b82f6" stroke="#fff" strokeWidth={1.5} />;
  });

  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ maxWidth: '100%' }}>
        {rings}
        {axes}
        {polygon(communityProfile, '#3b82f6', 0.15)}
        {polygon(guestProfile, '#e8860c', 0.2)}
        {communityDots}
        {guestDots}
        {labels}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 6, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#e8860c' }} />
          You
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#3b82f6' }} />
          Community
        </span>
      </div>
    </div>
  );
}

// ── Note comparison pills ──────────────────────────────────

function NoteComparison({ label, guestNotes, communityNotes }) {
  const guestSet = new Set((guestNotes || []).map(n => n.toLowerCase()));
  const communitySet = new Set((communityNotes || []).map(n => n.toLowerCase()));

  // Correct: guest picked & community agrees
  const correct = [...guestSet].filter(n => communitySet.has(n));
  // Wrong: guest picked but community doesn't have
  const wrong = [...guestSet].filter(n => !communitySet.has(n));
  // Missed: community has but guest didn't pick
  const missed = [...communitySet].filter(n => !guestSet.has(n));

  if (correct.length === 0 && wrong.length === 0 && missed.length === 0) return null;

  const pillStyle = (type) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 20,
    fontSize: 12,
    fontWeight: 600,
    margin: 2,
    ...(type === 'correct' ? {
      background: 'rgba(34, 197, 94, 0.12)',
      color: '#16a34a',
      border: '1.5px solid rgba(34, 197, 94, 0.3)',
    } : type === 'wrong' ? {
      background: 'rgba(239, 68, 68, 0.08)',
      color: '#dc2626',
      border: '1.5px solid rgba(239, 68, 68, 0.25)',
      textDecoration: 'line-through',
    } : {
      background: 'transparent',
      color: 'var(--rc-gray-400)',
      border: '1.5px dashed var(--rc-gray-300)',
    }),
  });

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rc-gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
        <span style={{ fontWeight: 400, textTransform: 'none', marginLeft: 6, letterSpacing: 0 }}>
          {correct.length}/{communitySet.size} matched
        </span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 0 }}>
        {correct.map(note => (
          <span key={note} style={pillStyle('correct')}>
            <NoteIcon name={note} size={14} />
            {note}
          </span>
        ))}
        {wrong.map(note => (
          <span key={note} style={pillStyle('wrong')}>
            <NoteIcon name={note} size={14} />
            {note}
          </span>
        ))}
        {missed.map(note => (
          <span key={note} style={pillStyle('missed')}>
            <NoteIcon name={note} size={14} />
            {note}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 6, fontSize: 10, color: 'var(--rc-gray-400)' }}>
        {correct.length > 0 && <span>green = matched</span>}
        {wrong.length > 0 && <span>red = your pick, not in community</span>}
        {missed.length > 0 && <span>dashed = community pick you missed</span>}
      </div>
    </div>
  );
}

// ── Stat row helper ────────────────────────────────────────

function StatRow({ label, guestValue, communityValue, unit, format }) {
  const fmt = format || ((v) => v);
  const gv = fmt(guestValue);
  const cv = fmt(communityValue);
  const diff = typeof guestValue === 'number' && typeof communityValue === 'number'
    ? Math.abs(guestValue - communityValue)
    : null;
  const isClose = diff !== null && diff < (unit === '$' ? 10 : 0.5);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', padding: '10px 0',
      borderBottom: '1px solid var(--rc-gray-200)',
    }}>
      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--rc-gray-600)' }}>{label}</div>
      <div style={{ textAlign: 'right', minWidth: 70 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e8860c' }}>
          {unit === '$' ? '$' : ''}{gv}
        </div>
        <div style={{ fontSize: 10, color: 'var(--rc-gray-400)' }}>You</div>
      </div>
      <div style={{ width: 24, textAlign: 'center', fontSize: 14, color: 'var(--rc-gray-300)' }}>vs</div>
      <div style={{ textAlign: 'left', minWidth: 70 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#3b82f6' }}>
          {unit === '$' ? '$' : ''}{cv}
        </div>
        <div style={{ fontSize: 10, color: 'var(--rc-gray-400)' }}>Community</div>
      </div>
      {diff !== null && (
        <div style={{
          marginLeft: 8, padding: '2px 8px', borderRadius: 8, fontSize: 11, fontWeight: 700,
          background: isClose ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.08)',
          color: isClose ? '#16a34a' : '#dc2626',
        }}>
          {isClose ? 'Close!' : `Off by ${unit === '$' ? '$' : ''}${format ? format(diff) : diff.toFixed(1)}`}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────

export default function CommunityComparison({ bottles, savedResponses, leaderboard, guestId }) {
  const [expandedBottle, setExpandedBottle] = useState(null);

  const revealedBottles = (bottles || []).filter(b => b.revealed && b.product);
  if (!revealedBottles.length) return null;

  // Find guest's per-bottle scores from leaderboard
  const guestEntry = (leaderboard || []).find(e => e.guestId === guestId);
  const perBottleScores = guestEntry?.perBottle || {};

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 28 }}>📊</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>How You Compared to the Community</div>
          <div style={{ fontSize: 13, color: 'var(--rc-gray-500)' }}>
            Deep dive into your blind tasting accuracy for each bottle
          </div>
        </div>
      </div>

      {revealedBottles.map((bottle) => {
        const response = savedResponses[bottle.letter];
        const community = bottle.product?.community || {};
        const details = bottle.product?.details || {};
        const isExpanded = expandedBottle === bottle.letter;
        const score = perBottleScores[bottle.letter];
        const productTitle = bottle.product?.title?.replace(/ Review.*$/i, '') || 'Bottle ' + bottle.letter;

        // Calculate accuracy summary
        const guestNose = new Set((response?.selectedNose || []).map(n => n.toLowerCase()));
        const commNose = new Set((community.noseNotes || []).map(n => n.toLowerCase()));
        const noseCorrect = [...guestNose].filter(n => commNose.has(n)).length;

        const guestPalate = new Set((response?.selectedPalate || []).map(n => n.toLowerCase()));
        const commPalate = new Set((community.palateNotes || []).map(n => n.toLowerCase()));
        const palateCorrect = [...guestPalate].filter(n => commPalate.has(n)).length;

        // Flavor profile distance (average difference across 8 axes)
        const flavorDiffs = FLAVOR_KEYS.map(k =>
          Math.abs((response?.flavorProfile?.[k] ?? 5) - (community.flavorProfile?.[k] ?? 5))
        );
        const avgFlavorDiff = flavorDiffs.reduce((a, b) => a + b, 0) / flavorDiffs.length;
        const flavorAccuracy = Math.round((1 - avgFlavorDiff / 9) * 100);

        return (
          <div
            key={bottle.letter}
            style={{
              marginBottom: 10, borderRadius: 12,
              border: isExpanded ? '2px solid var(--rc-orange)' : '1px solid var(--rc-gray-200)',
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Collapsed header */}
            <button
              type="button"
              onClick={() => setExpandedBottle(isExpanded ? null : bottle.letter)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                background: isExpanded ? 'rgba(232, 134, 12, 0.04)' : 'transparent',
                border: 'none', cursor: 'pointer', padding: '12px 14px', textAlign: 'left',
              }}
            >
              <span className="bottle-letter" style={{ width: 32, height: 32, fontSize: 14, flexShrink: 0 }}>
                {bottle.letter}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {productTitle}
                </div>
                <div style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 2 }}>
                  Nose {noseCorrect}/{commNose.size}
                  {' · '}Palate {palateCorrect}/{commPalate.size}
                  {' · '}Flavor {flavorAccuracy}%
                  {score != null && <> · <span style={{ color: 'var(--rc-orange)', fontWeight: 700 }}>{score.toFixed(0)} pts</span></>}
                </div>
              </div>
              <span style={{
                fontSize: 18, color: 'var(--rc-gray-400)',
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}>
                ▼
              </span>
            </button>

            {/* Expanded detail */}
            {isExpanded && response && (
              <div style={{ padding: '0 14px 16px' }}>
                {/* Flavor Radar Chart */}
                <div style={{
                  marginBottom: 16, padding: '12px 0',
                  borderBottom: '1px solid var(--rc-gray-200)',
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--rc-gray-500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Flavor Profile
                  </div>
                  <RadarChart
                    guestProfile={response.flavorProfile || {}}
                    communityProfile={community.flavorProfile || {}}
                  />
                </div>

                {/* Nose Notes Comparison */}
                <NoteComparison
                  label="Nose Notes"
                  guestNotes={response.selectedNose}
                  communityNotes={community.noseNotes}
                />

                {/* Palate Notes Comparison */}
                <NoteComparison
                  label="Palate Notes"
                  guestNotes={response.selectedPalate}
                  communityNotes={community.palateNotes}
                />

                {/* Stats: Price, Rating, Bottle ID */}
                <div style={{
                  marginTop: 8, padding: '8px 0',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--rc-gray-500)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Your Guesses
                  </div>

                  {/* Price */}
                  {(response.priceGuess || details.retailPrice) && (
                    <StatRow
                      label="Price"
                      guestValue={parseFloat(response.priceGuess) || 0}
                      communityValue={details.retailPrice || 0}
                      unit="$"
                      format={(v) => typeof v === 'number' ? v.toFixed(0) : v}
                    />
                  )}

                  {/* Rating */}
                  {(response.rating != null || community.score != null) && (
                    <StatRow
                      label="Rating (out of 5)"
                      guestValue={response.rating || 0}
                      communityValue={community.score || 0}
                      format={(v) => typeof v === 'number' ? v.toFixed(1) : v}
                    />
                  )}

                  {/* Bottle Guess */}
                  {response.bottleGuess && (
                    <div style={{
                      display: 'flex', alignItems: 'center', padding: '10px 0',
                    }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--rc-gray-600)' }}>
                        Bottle ID
                      </div>
                      <div style={{
                        padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                        background: (response.bottleGuess === bottle.product?.handle || response.bottleGuess === bottle.product?.title)
                          ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                        color: (response.bottleGuess === bottle.product?.handle || response.bottleGuess === bottle.product?.title)
                          ? '#16a34a' : '#dc2626',
                      }}>
                        {(response.bottleGuess === bottle.product?.handle || response.bottleGuess === bottle.product?.title)
                          ? 'Nailed it!' : 'Missed'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Total score for this bottle */}
                {score != null && (
                  <div style={{
                    marginTop: 12, padding: '12px 16px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600 }}>
                      Your Score for this Bottle
                    </span>
                    <span style={{ color: 'var(--rc-orange)', fontSize: 22, fontWeight: 800 }}>
                      {score.toFixed(0)}<span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}> / 100</span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* No response data available */}
            {isExpanded && !response && (
              <div style={{ padding: '12px 14px 16px', color: 'var(--rc-gray-400)', fontSize: 13 }}>
                No response data available for this bottle.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
