import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/theme.css';
import AdminSetup from './components/admin/AdminSetup';
import AdminEventLiveRoute from './components/admin/AdminEventLiveRoute';
import GuestJoin from './components/guest/GuestJoin';
import GuestTastingRoute from './components/guest/GuestTastingRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin flow */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminSetup />} />
        <Route path="/admin/event/:eventId" element={<AdminEventLiveRoute />} />

        {/* Guest flow */}
        <Route path="/join" element={<GuestJoin />} />
        <Route path="/join/:inviteCode" element={<GuestJoin />} />
        <Route path="/tasting/:eventId" element={<GuestTastingRoute />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
