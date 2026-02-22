import React, { useState } from 'react';

const MEDALS = [
  { place: 1, emoji: '🥇', cls: 'gold', label: '1st Place' },
  { place: 2, emoji: '🥈', cls: 'silver', label: '2nd Place' },
  { place: 3, emoji: '🥉', cls: 'bronze', label: '3rd Place' },
];

export default function PrizeSetup({ onSave, onBack, loading }) {
  const [prizeCount, setPrizeCount] = useState(1);
  const [descriptions, setDescriptions] = useState(['', '', '']);

  const updatePrize = (index, value) => {
    const next = [...descriptions];
    next[index] = value;
    setDescriptions(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const prizes = MEDALS
      .slice(0, prizeCount)
      .map((m, i) => ({
        place: m.place,
        description: descriptions[i].trim() || `${m.label} Prize`,
      }));
    onSave(prizes);
  };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <h1 className="page-title">Set Up Prizes</h1>
      <p className="page-subtitle">
        Reward the best tasters! Add descriptions for 1–3 prize places.
      </p>

      <div className="card">
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontWeight: 600, marginBottom: 8, display: 'block' }}>How many prizes?</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                className={`btn ${prizeCount === n ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setPrizeCount(n)}
              >
                {n} prize{n > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {MEDALS.slice(0, prizeCount).map((medal, i) => (
            <div key={medal.place} className="prize-row">
              <div className={`prize-medal ${medal.cls}`}>{medal.emoji}</div>
              <div style={{ flex: 1 }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder={`${medal.label} prize (e.g. "Bottle of Eagle Rare")`}
                  value={descriptions[i]}
                  onChange={(e) => updatePrize(i, e.target.value)}
                />
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" type="button" onClick={onBack}>Back</button>
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save & Generate Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
