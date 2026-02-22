import React from 'react';
import { useParams } from 'react-router-dom';
import AdminEventLive from './AdminEventLive';

export default function AdminEventLiveRoute() {
  const { eventId } = useParams();
  return <AdminEventLive eventId={eventId} />;
}
