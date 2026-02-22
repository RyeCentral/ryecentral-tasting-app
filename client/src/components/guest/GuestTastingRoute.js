import React from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import GuestTasting from './GuestTasting';

/**
 * Route wrapper for /tasting/:eventId?guestId=xxx&name=xxx
 * The guest ID and name are passed as search params after joining.
 */
export default function GuestTastingRoute() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  const guestId = searchParams.get('guestId');
  const guestName = searchParams.get('name');

  if (!guestId || !guestName) {
    return <Navigate to="/join" replace />;
  }

  return <GuestTasting eventId={eventId} guestId={guestId} guestName={guestName} />;
}
