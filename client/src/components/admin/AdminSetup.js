import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../shared/TopBar';
import StepIndicator from '../shared/StepIndicator';
import ProductPicker from './ProductPicker';
import BottleReview from './BottleReview';
import PrizeSetup from './PrizeSetup';
import InviteShare from './InviteShare';
import * as api from '../../services/api';

const STEPS = [
  { key: 'name',    label: 'Name' },
  { key: 'bottles', label: 'Bottles' },
  { key: 'review',  label: 'Review' },
  { key: 'prizes',  label: 'Prizes' },
  { key: 'invite',  label: 'Invite' },
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
        const events = data.events || [];
        setExistingEvents(events);
      })
      .catch(() => {})
      .finally(() => setCheckingEvents(false));
  }, []);

  const resumeEvent = (evt) => {
    if (evt.status === 'setup') {
      // Go back to setup flow — load event and jump to appropriate step
      setEvent(evt);
      if (evt.bottles && evt.bottles.length > 0) {
        setStep('invite'); // They already picked bottles, go to invite
      } else {
        setStep('bottles');
      }
      setExistingEvents([]); // Hide the list
    } else {
      // Active, scoring, or complete — go to live dashboard
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
      const result = await api.createEvent(eventName.trim());
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

  // Step 3 → 4: Move to prizes
  const handleReviewDone = () => setStep('prizes');

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

  // Go back a step
  const goBack = (target) => setStep(target);

  // Determine step index for indicator
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <>
      <TopBar eventName={event?.name} />
      <div className="page">
        <div className="container">
          <StepIndicator steps={STEPS} currentIndex={stepIndex} />

          {error && <div className="card" style={{ marginBottom: 16 }}><p className="error-msg">{error}</p></div>}

          {/* Step 1: Name Your Tasting */}
          {step === 'name' && (
            <div className="container-narrow" style={{ margin: '0 auto' }}>
              {/* Show existing events if any */}
              {!checkingEvents && existingEvents.length > 0 && (
                <div className="card" style={{ marginBottom: 16 }}>
                  <h2 style={{ fontSize: 18, marginBottom: 4 }}>Your Events</h2>
                  <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>
                    Resume an existing event or create a new one below.
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
                      <button
                        className="btn btn-primary"
                        style={{ whiteSpace: 'nowrap' }}
                        onClick={() => resumeEvent(evt)}
                      >
                        {evt.status === 'setup' ? 'Continue Setup' : 'Rejoin'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="card">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🥃</div>
                  <h1 className="page-title" style={{ marginBottom: 8 }}>
                    {existingEvents.length > 0 ? 'New Tasting' : 'Host a Tasting'}
                  </h1>
                  <p className="page-subtitle" style={{ marginBottom: 0 }}>
                    Set up a blind rye whiskey tasting for your friends.
                  </p>
                </div>
                <form onSubmit={handleCreateEvent}>
                  <div className="form-group">
                    <label htmlFor="eventName">Event Name</label>
                    <input
                      id="eventName"
                      className="form-input"
                      type="text"
                      placeholder="e.g. Friday Night Rye Tasting"
                      value={eventName}
                      onChange={(e) => setEventName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading || !eventName.trim()}>
                    {loading ? 'Creating...' : 'Create Tasting Event'}
                  </button>
                </form>
              </div>
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
            />
          )}
        </div>
      </div>
    </>
  );
}
