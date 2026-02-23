import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function TopBar({ eventName }) {
  const { customer, logout, isAuthenticated } = useAuth();

  return (
    <div className="topbar">
      <a href="/admin" className="topbar-brand">
        RyeCentral <span>Tasting</span>
      </a>
      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {eventName && (
          <span style={{ color: '#aaa', fontSize: 14 }}>{eventName}</span>
        )}
        {isAuthenticated && customer && (
          <>
            <span style={{ color: '#888', fontSize: 12 }}>
              {customer.firstName || customer.email}
            </span>
            <button
              onClick={logout}
              style={{
                background: 'none',
                border: '1px solid #555',
                color: '#aaa',
                fontSize: 11,
                padding: '3px 8px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'var(--font-main)',
              }}
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}
