import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function TopBar({ eventName }) {
  const { customer, logout, isAuthenticated } = useAuth();

  return (
    <div className="topbar">
      <div className="topbar-row">
        <a href="/admin" className="topbar-brand">
          RyeCentral <span>Tasting</span>
        </a>
        <div className="topbar-actions">
          <a
            href="https://www.ryecentral.com"
            target="_blank"
            rel="noopener noreferrer"
            className="topbar-link"
          >
            RyeCentral.com
          </a>
          {isAuthenticated && customer && (
            <>
              <span className="topbar-user">
                {customer.firstName || customer.email}
              </span>
              <button onClick={logout} className="topbar-signout">
                Sign Out
              </button>
            </>
          )}
        </div>
      </div>
      {eventName && (
        <div className="topbar-event">{eventName}</div>
      )}
    </div>
  );
}
