import React from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import GuestTasting from './GuestTasting';

const SESSION_KEY = 'rc_tasting_session';

function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch { return null; }
}

/**
 * Route wrapper for /tasting/:eventId?guestId=xxx&name=xxx
 *
 * First checks URL search params (normal flow after joining).
 * Falls back to localStorage session data if params are missing
 * (e.g. browser refresh or back button loses the query string).
 */
export default function GuestTastingRoute() {
  const { eventId } = useParams();
  const [searchParams] = useSearchParams();
  let guestId = searchParams.get('guestId');
  let guestName = searchParams.get('name');

  // Fallback: check localStorage if URL params are missing
  if (!guestId || !guestName) {
    const saved = getSavedSession();
    if (saved && saved.eventId === eventId && saved.guestId && saved.guestName) {
      guestId = saved.guestId;
      guestName = saved.guestName;
    }
  }

  if (!guestId || !guestName) {
    return <Navigate to="/join" replace />;
  }

  return <GuestTasting eventId={eventId} guestId={guestId} guestName={guestName} />;
}
