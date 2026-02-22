import React from 'react';

export default function BottleReview({ bottles, onDone, onBack }) {
  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <h1 className="page-title">Review Your Lineup</h1>
      <p className="page-subtitle">
        These bottles will be presented blind as letters A, B, C, etc. Guests won't see the names until reveal.
      </p>

      <div className="bottle-list">
        {bottles.map((bottle) => (
          <div key={bottle.letter} className="bottle-item">
            <div className="bottle-letter">{bottle.letter}</div>
            <div className="bottle-info">
              <div className="bottle-title">{bottle.product.title}</div>
              <div className="bottle-detail">
                {[
                  bottle.product.vendor,
                  bottle.product.details?.proof,
                  bottle.product.details?.age,
                  bottle.product.community?.score ? `Score: ${bottle.product.community.score}/5` : null,
                ].filter(Boolean).join(' · ')}
              </div>
              {bottle.product.details?.retailPrice && (
                <div className="bottle-detail" style={{ color: '#f5a623', fontWeight: 600 }}>
                  ${bottle.product.details.retailPrice}
                </div>
              )}
            </div>
            {bottle.product.image?.url && (
              <img
                src={bottle.product.image.url}
                alt=""
                style={{ width: 48, height: 64, objectFit: 'contain', flexShrink: 0 }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'flex-end' }}>
        <button className="btn btn-secondary" onClick={onBack}>Change Bottles</button>
        <button className="btn btn-primary btn-lg" onClick={onDone}>
          Looks Good — Set Prizes
        </button>
      </div>
    </div>
  );
}
