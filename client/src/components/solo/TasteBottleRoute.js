import React, { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    soloFromProduct(handle)
      .then(({ event }) => {
        navigate(`/solo/${event.id}`, { replace: true });
      })
      .catch((err) => {
        console.error('TasteBottleRoute error:', err);
        // Bottle can't be resolved — drop the user into a solo tasting at the
        // bottle picker rather than a dead end.
        navigate('/admin', { replace: true, state: { mode: 'solo' } });
      });
  }, [handle, navigate]);

  return (
    <div className="page">
      <div className="loading">
        <div className="spinner" />
        Setting up your tasting…
      </div>
    </div>
  );
}
