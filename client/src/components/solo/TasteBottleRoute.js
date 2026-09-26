import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { soloFromProduct } from '../../services/api';

/**
 * /taste/:handle — deep-link entry point.
 * Calls POST /api/events/solo-from-product once (StrictMode-safe),
 * then navigates to /solo/:eventId.
 */
export default function TasteBottleRoute() {
  const { handle } = useParams();
  const navigate = useNavigate();
  const called = useRef(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    soloFromProduct(handle)
      .then(({ event }) => {
        navigate(`/solo/${event.id}`, { replace: true });
      })
      .catch((err) => {
        console.error('TasteBottleRoute error:', err);
        setError(err.message || 'Could not start tasting for this bottle.');
      });
  }, [handle, navigate]);

  if (error) {
    return (
      <div className="page">
        <div className="container-narrow" style={{ textAlign: 'center', paddingTop: '80px' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
          <h2 style={{ marginBottom: 12 }}>Bottle not found</h2>
          <p style={{ color: 'var(--rc-gray-300)', marginBottom: 24 }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin')}>
            Choose a bottle instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="loading">
        <div className="spinner" />
        Setting up your tasting…
      </div>
    </div>
  );
}
