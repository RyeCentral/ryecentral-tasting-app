import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/theme.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminSetup from './components/admin/AdminSetup';
import AdminEventLiveRoute from './components/admin/AdminEventLiveRoute';
import GuestJoin from './components/guest/GuestJoin';
import GuestTastingRoute from './components/guest/GuestTastingRoute';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Admin flow — requires RyeCentral account */}
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminSetup />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/event/:eventId"
            element={
              <ProtectedRoute>
                <AdminEventLiveRoute />
              </ProtectedRoute>
            }
          />

          {/* Guest flow — also requires RyeCentral account */}
          <Route
            path="/join"
            element={
              <ProtectedRoute>
                <GuestJoin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/join/:inviteCode"
            element={
              <ProtectedRoute>
                <GuestJoin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasting/:eventId"
            element={
              <ProtectedRoute>
                <GuestTastingRoute />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
