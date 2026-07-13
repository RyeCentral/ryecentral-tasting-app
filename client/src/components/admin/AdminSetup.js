import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../shared/TopBar';
import StepIndicator from '../shared/StepIndicator';
import ProductPicker from './ProductPicker';
import BottleReview from './BottleReview';
import PrizeSetup from './PrizeSetup';
import InviteShare from './InviteShare';
import * as api from '../../services/api';

const GROUP_STEPS = [
  { key: 'name',    label: 'Name' },
  { key: 'bottles', label: 'Bottles' },
  { key: 'review',  label: 'Review' },
  { key: 'prizes',  label: 'Prizes' },
  { key: 'invite',  label: 'Invite' },
];

const SOLO_STEPS = [
  { key: 'name',    label: 'Name' },
  { key: 'bottles', label: 'Bottles' },
  { key: 'review',  label: 'Review' },
];

const STATUS_LABELS = {
  setup: '🔧 Setting Up',
  active: '🟢 In Progress',
  scoring: '📊 Scoring',
  complete: '✅ Complete',
};

export default function AdminSetup() {
  const navigate = useNavigate();
  const [step, setStep] = useState('name');
  const [mode, setMode] = useState('group'); // 'group' | 'solo'
  const [eventName, setEventName] = useState('');
  const [event, setEvent] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingEvents, setExistingEvents] = useState([]);
  const [checkingEvents, setCheckingEvents] = useState(true);

  // Check for existing events on mount
  useEffect(() => {
    api.getEvents()
      .then((data) => {
        const events = (data.events || []).filter((e) => e.status !== 'ended');
        setExistingEvents(events);
      })
      .catch(() => {})
      .finally(() => setCheckingEvents(false));
  }, []);

  const resumeEvent = (evt) => {
    if (evt.status === 'setup') {
      // Go back to setup flow — load event and jump to appropriate step
      setEvent(evt);
      if (evt.mode === 'solo') setMode('solo');
      if (evt.bottles && evt.bottles.length > 0) {
        if (evt.mode === 'solo') {
          setStep('review'); // Solo: skip to review (no invite)
        } else {
          setStep('invite'); // Group: go to invite
        }
      } else {
        setStep('bottles');
      }
      setExistingEvents([]); // Hide the list
    } else if (evt.mode === 'solo') {
      // Solo active/complete — go to solo tasting
      navigate(`/solo/${evt.id}`);
    } else {
      // Group active, scoring, or complete — go to live dashboard
      navigate(`/admin/event/${evt.id}`);
    }
  };

  // Step 1: Create event
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.createEvent(eventName.trim(), mode);
      setEvent(result.event);
      setStep('bottles');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Step 2: Toggle product selection
  const toggleProduct = useCallback((product) => {
    setSelectedProducts((prev) => {
      const exists = prev.find((p) => p.handle === product.handle);
      if (exists) {
        return prev.filter((p) => p.handle !== product.handle);
      }
      if (prev.length >= 8) return prev; // max 8 bottles
      return [...prev, product];
    });
  }, []);

  // Step 2 → 3: Add bottles to event
  const handleConfirmBottles = async () => {
    if (!selectedProducts.length) return;
    setLoading(true);
    setError('');
    try {
      // Clear any existing bottles first (prevents duplicates when navigating back)
      if (event.bottles?.length > 0) {
        for (const bottle of [...event.bottles].reverse()) {
          await api.removeBottle(event.id, bottle.letter);
        }
      }
      for (const product of selectedProducts) {
        await api.addBottle(event.id, product);
      }
      // Refresh event
      const updated = await api.getEvent(event.id);
      setEvent(updated.event);
      setStep('review');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Step 3 → 4: Move to prizes (group) or start solo tasting
  const handleReviewDone = () => {
    if (mode === 'solo') {
      navigate(`/solo/${event.id}`);
      return;
    }
    setStep('prizes');
  };

  // Step 4 → 5: Save prizes and move to invite
  const handleSavePrizes = async (prizes) => {
    setLoading(true);
    setError('');
    try {
      await api.setPrizes(event.id, prizes);
      const updated = await api.getEvent(event.id);
      setEvent(updated.event);
      setStep('invite');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  // Active steps depend on mode
  const STEPS = mode === 'solo' ? SOLO_STEPS : GROUP_STEPS;

  // Go back a step
  const goBack = (target) => setStep(target);

  // Handle clicking a completed step in the progress bar
  const handleStepClick = (stepKey) => {
    // Only allow navigating to completed steps (before current)
    const targetIndex = STEPS.findIndex((s) => s.key === stepKey);
    if (targetIndex < stepIndex) {
      setStep(stepKey);
    }
  };

  // Handle browser back button — go to previous setup step instead of leaving
  useEffect(() => {
    if (step === 'name') return; // Don't intercept on first step

    const handlePopState = (e) => {
      e.preventDefault();
      const currentIdx = STEPS.findIndex((s) => s.key === step);
      if (currentIdx > 0) {
        setStep(STEPS[currentIdx - 1].key);
      }
    };

    // Push a state entry so the browser back button triggers popstate
    window.history.pushState({ step }, '');
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [step, STEPS]);

  // Determine step index for indicator
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <>
      <TopBar eventName={event?.name} />
      <div className="page">
        <div className="container">
          <StepIndicator steps={STEPS} currentIndex={stepIndex} onStepClick={handleStepClick} />

          {error && <div className="card" style={{ marginBottom: 16 }}><p className="error-msg">{error}</p></div>}

          {/* Step 1: Name Your Tasting */}
          {step === 'name' && (
            <div className="container-narrow" style={{ margin: '0 auto' }}>
              {/* Mode selector + name form */}
              <div className="card">
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🥃</div>
                  <h1 className="page-title" style={{ marginBottom: 4 }}>
                    Start a Tasting
                  </h1>
                  <p className="page-subtitle" style={{ marginBottom: 0 }}>
                    Choose your tasting style, then pick your bottles.
                  </p>
                </div>

                {/* Mode toggle */}
                <div style={{
                  display: 'flex', gap: 10, marginBottom: 20,
                }}>
                  <button
                    type="button"
                    onClick={() => setMode('group')}
                    style={{
                      flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer',
                      border: mode === 'group' ? '2px solid var(--rc-orange)' : '2px solid var(--rc-gray-200)',
                      background: mode === 'group' ? 'rgba(232, 134, 12, 0.06)' : 'var(--rc-white)',
                      textAlign: 'center', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>👥</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: mode === 'group' ? 'var(--rc-orange)' : 'var(--rc-gray-700)' }}>
                      Host a Tasting
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 2 }}>
                      Blind tasting with friends
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('solo')}
                    style={{
                      flex: 1, padding: '14px 10px', borderRadius: 12, cursor: 'pointer',
                      border: mode === 'solo' ? '2px solid var(--rc-orange)' : '2px solid var(--rc-gray-200)',
                      background: mode === 'solo' ? 'rgba(232, 134, 12, 0.06)' : 'var(--rc-white)',
                      textAlign: 'center', transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontSize: 24, marginBottom: 4 }}>🎯</div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: mode === 'solo' ? 'var(--rc-orange)' : 'var(--rc-gray-700)' }}>
                      Solo Tasting
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--rc-gray-500)', marginTop: 2 }}>
                      Train your palate solo
                    </div>
                  </button>
                </div>

                <form onSubmit={handleCreateEvent}>
                  <div className="form-group">
                    <label htmlFor="eventName">Event Name</label>
                    <input
                      id="eventName"
                      className="form-input"
                      type="text"
                      placeholder={mode === 'solo' ? 'e.g. Tuesday Palate Training' : 'e.g. Friday Night Rye Tasting'}
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading || !eventName.trim()}>
                    {loading ? 'Creating...' : mode === 'solo' ? 'Start Solo Tasting' : 'Create Tasting Event'}
                  </button>
                </form>
              </div>

              {/* Previous events — below the create card */}
              {!checkingEvents && existingEvents.length > 0 && (
                <div className="card" style={{ marginTop: 16 }}>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Your Events</h2>
                  <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>
                    Resume or review a previous event.
                  </p>
                  {existingEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: '#f8f8f8',
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 16 }}>{evt.name}</div>
                        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>
                          {STATUS_LABELS[evt.status] || evt.status}
                          {evt.bottles?.length > 0 && ` · ${evt.bottles.length} bottle${evt.bottles.length !== 1 ? 's' : ''}`}
                          {evt.guestCount > 0 && ` · ${evt.guestCount} guest${evt.guestCount !== 1 ? 's' : ''}`}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {(evt.status === 'complete' || (evt.status === 'setup' && (!evt.guestCount || evt.guestCount === 0))) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ color: '#e53e3e', borderColor: '#e53e3e', whiteSpace: 'nowrap' }}
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm(`Delete "${evt.name}"? This cannot be undone.`)) return;
                              try {
                                await api.deleteEvent(evt.id);
                                setExistingEvents((prev) => prev.filter((x) => x.id !== evt.id));
                              } catch (err) { setError(err.message); }
                            }}
                          >
                            Delete
                          </button>
                        )}
                        <button
                          className="btn btn-primary"
                          style={{ whiteSpace: 'nowrap' }}
                          onClick={() => resumeEvent(evt)}
                        >
                          {evt.status === 'setup' ? 'Continue Setup' : evt.status === 'complete' ? 'View Results' : 'Rejoin'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Pick Bottles */}
          {step === 'bottles' && (
            <ProductPicker
              selectedProducts={selectedProducts}
              onToggleProduct={toggleProduct}
              onConfirm={handleConfirmBottles}
              onBack={() => goBack('name')}
              loading={loading}
            />
          )}

          {/* Step 3: Review Bottles */}
          {step === 'review' && event && (
            <BottleReview
              bottles={event.bottles}
              onDone={handleReviewDone}
              onBack={() => goBack('bottles')}
              mode={mode}
            />
          )}

          {/* Step 4: Prizes */}
          {step === 'prizes' && (
            <PrizeSetup
              onSave={handleSavePrizes}
              onBack={() => goBack('review')}
              loading={loading}
            />
          )}

          {/* Step 5: Invite */}
          {step === 'invite' && event && (
            <InviteShare
              event={event}
              onBack={() => goBack('prizes')}
            />
          )}
        </div>
      </div>
    </>
  );
}
