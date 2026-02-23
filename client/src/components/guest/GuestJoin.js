import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../shared/TopBar';
import * as api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const SESSION_KEY = 'rc_tasting_session';

function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch { return null; }
}

function saveSession(data) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export default function GuestJoin() {
  const { inviteCode: urlCode } = useParams();
  const navigate = useNavigate();
  const { customer } = useAuth();
  const [code, setCode] = useState(urlCode || '');
  const [name, setName] = useState(customer?.displayName || customer?.firstName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(!!urlCode); // Check for saved session if we have a code

  // On mount, try to restore a saved session for this invite code
  useEffect(() => {
    if (!urlCode) { setChecking(false); return; }

    const saved = getSavedSession();
    if (saved && saved.inviteCode === urlCode.toUpperCase() && saved.guestId && saved.eventId) {
      // Try to rejoin with saved credentials
      api.joinByCode(urlCode.toUpperCase(), saved.guestName, saved.guestId)
        .then((result) => {
          const eventId = result.event.id;
          const guestId = result.guest.id;
          const guestName = encodeURIComponent(result.guest.name);
          // Update saved session in case anything changed
          saveSession({
            inviteCode: urlCode.toUpperCase(),
            eventId,
            guestId,
            guestName: result.guest.name,
          });
          navigate(`/tasting/${eventId}?guestId=${guestId}&name=${guestName}`, { replace: true });
        })
        .catch(() => {
          // Session expired or event gone — let them join fresh
          setChecking(false);
        });
    } else {
      setChecking(false);
    }
  }, [urlCode, navigate]);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.joinByCode(code.trim().toUpperCase(), name.trim());
      const eventId = result.event.id;
      const guestId = result.guest.id;
      const guestName = encodeURIComponent(result.guest.name);

      // Save session for future reconnections
      saveSession({
        inviteCode: code.trim().toUpperCase(),
        eventId,
        guestId,
        guestName: result.guest.name,
      });

      navigate(`/tasting/${eventId}?guestId=${guestId}&name=${guestName}`);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <>
        <TopBar />
        <div className="page">
          <div className="container-narrow" style={{ margin: '0 auto' }}>
            <div className="loading">
              <div className="spinner" />
              Reconnecting...
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar />
      <div className="page">
        <div className="container-narrow" style={{ margin: '0 auto' }}>
          <div className="card">
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 48, marginBottom: 8 }}>🥃</div>
              <h1 className="page-title" style={{ marginBottom: 8 }}>Join a Tasting</h1>
              <p className="page-subtitle" style={{ marginBottom: 0 }}>
                Enter the code from your host to join the blind tasting.
              </p>
            </div>
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label htmlFor="code">Invite Code</label>
                <input
                  id="code"
                  className="form-input"
                  type="text"
                  placeholder="e.g. ABC123"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  style={{ textAlign: 'center', fontSize: 24, letterSpacing: 4, fontFamily: 'monospace' }}
                  autoFocus={!urlCode}
                />
              </div>
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  id="name"
                  className="form-input"
                  type="text"
                  placeholder="What should we call you?"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus={!!urlCode}
                />
              </div>
              {error && <p className="error-msg">{error}</p>}
              <button
                className="btn btn-primary btn-lg btn-block"
                type="submit"
                disabled={loading || !code.trim() || !name.trim()}
              >
                {loading ? 'Joining...' : 'Join Tasting'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
