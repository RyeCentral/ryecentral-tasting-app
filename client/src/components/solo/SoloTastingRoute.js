import React from 'react';
import { useParams } from 'react-router-dom';
import SoloTasting from './SoloTasting';

/**
 * Route wrapper for /solo/:eventId
 * Solo tastings don't need guestId/guestName in URL — the component
 * handles initialization via the soloStart API call.
 */
export default function SoloTastingRoute() {
  const { eventId } = useParams();
  return <SoloTasting eventId={eventId} />;
}
