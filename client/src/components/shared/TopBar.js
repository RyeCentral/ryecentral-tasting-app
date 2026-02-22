import React from 'react';

export default function TopBar({ eventName }) {
  return (
    <div className="topbar">
      <a href="/admin" className="topbar-brand">
        RyeCentral <span>Tasting</span>
      </a>
      {eventName && (
        <div className="topbar-actions">
          <span style={{ color: '#aaa', fontSize: 14 }}>{eventName}</span>
        </div>
      )}
    </div>
  );
}
