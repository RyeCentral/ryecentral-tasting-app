import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopBar from '../shared/TopBar';
import * as api from '../../services/api';

export default function GuestJoin() {
  const { inviteCode: urlCode } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState(urlCode || '');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.joinByCode(code.trim().toUpperCase(), name.trim());
      // Navigate to the live tasting screen with guest credentials
      const eventId = result.event.id;
      const guestId = result.guest.id;
      const guestName = encodeURIComponent(result.guest.name);
      navigate(`/tasting/${eventId}?guestId=${guestId}&name=${guestName}`);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

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
