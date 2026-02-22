import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';

export default function InviteShare({ event }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const joinUrl = `${window.location.origin}/join/${event.inviteCode}`;

  useEffect(() => {
    fetch(api.getQrCode(event.id))
      .then(res => res.json())
      .then(data => setQrDataUrl(data.qr))
      .catch(err => console.error('Failed to load QR code:', err));
  }, [event.id]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement('input');
      input.value = joinUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startTasting = () => {
    // Navigate to the live admin event dashboard
    navigate(`/admin/event/${event.id}`);
  };

  return (
    <div className="container-narrow" style={{ margin: '0 auto' }}>
      <div className="card">
        <div className="invite-code-display">
          <div style={{ fontSize: 48, marginBottom: 8 }}>🎉</div>
          <h1 className="page-title" style={{ marginBottom: 8 }}>You're All Set!</h1>
          <p className="page-subtitle">
            Share this code or QR with your guests so they can join.
          </p>

          <div className="invite-code">{event.inviteCode}</div>

          <div className="invite-qr">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code to join tasting" style={{ width: 300, height: 300 }} />
            ) : (
              <p style={{ color: '#888' }}>Loading QR code...</p>
            )}
          </div>

          <div className="invite-link">
            <code>{joinUrl}</code>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary" onClick={copyLink}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button className="btn btn-primary btn-lg" onClick={startTasting}>
              Start Tasting
            </button>
          </div>
        </div>
      </div>

      {/* Event summary */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Event Summary</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 14 }}>
          <div>
            <span style={{ color: '#888' }}>Bottles:</span>{' '}
            <strong>{event.bottleCount}</strong>
          </div>
          <div>
            <span style={{ color: '#888' }}>Prizes:</span>{' '}
            <strong>{event.prizes?.length || 0}</strong>
          </div>
          <div>
            <span style={{ color: '#888' }}>Guests joined:</span>{' '}
            <strong>{event.guestCount || 0}</strong>
          </div>
          <div>
            <span style={{ color: '#888' }}>Status:</span>{' '}
            <strong style={{ textTransform: 'capitalize' }}>{event.status}</strong>
          </div>
        </div>
        {event.prizes?.length > 0 && (
          <div style={{ marginTop: 12, borderTop: '1px solid #eee', paddingTop: 12 }}>
            {event.prizes.map((p) => (
              <div key={p.place} style={{ fontSize: 14, marginBottom: 4 }}>
                {['🥇', '🥈', '🥉'][p.place - 1]} {p.description}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
