import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as api from '../../services/api';

export default function InviteShare({ event, onBack }) {
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
      <div className="card" style={{ padding: '16px 16px 12px' }}>
        <div className="invite-code-display" style={{ padding: '0' }}>
          <h1 className="page-title" style={{ marginBottom: 4, fontSize: 20 }}>You're All Set! 🎉</h1>
          <p className="page-subtitle" style={{ marginBottom: 12, fontSize: 13 }}>
            Share this code or QR with your guests so they can join.
          </p>

          <div className="invite-code" style={{ fontSize: 28, letterSpacing: 6, padding: '8px 16px', marginBottom: 8 }}>
            {event.inviteCode}
          </div>

          <div className="invite-qr" style={{ margin: '8px 0' }}>
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR code to join tasting" style={{ width: 160, height: 160 }} />
            ) : (
              <p style={{ color: '#888', fontSize: 13 }}>Loading QR code...</p>
            )}
          </div>

          <div className="invite-link" style={{ fontSize: 12, marginBottom: 12 }}>
            <code>{joinUrl}</code>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {onBack && (
              <button className="btn btn-secondary" onClick={onBack}>
                Back
              </button>
            )}
            <button className="btn btn-secondary" onClick={copyLink}>
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button className="btn btn-primary btn-lg" onClick={startTasting}>
              Start Tasting
            </button>
          </div>
        </div>
      </div>

      {/* Event summary — compact */}
      <div className="card" style={{ marginTop: 10, padding: '12px 16px' }}>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, justifyContent: 'center', flexWrap: 'wrap' }}>
          <span><span style={{ color: '#888' }}>Bottles:</span> <strong>{event.bottleCount}</strong></span>
          <span><span style={{ color: '#888' }}>Prizes:</span> <strong>{event.prizes?.length || 0}</strong></span>
          <span><span style={{ color: '#888' }}>Guests:</span> <strong>{event.guestCount || 0}</strong></span>
        </div>
        {event.prizes?.length > 0 && (
          <div style={{ marginTop: 8, borderTop: '1px solid #eee', paddingTop: 8, textAlign: 'center' }}>
            {event.prizes.map((p) => (
              <span key={p.place} style={{ fontSize: 13, marginRight: 12 }}>
                {['🥇', '🥈', '🥉'][p.place - 1]} {p.description}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
