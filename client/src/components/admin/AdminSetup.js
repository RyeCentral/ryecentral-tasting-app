import React, { useState, useCallback } from 'react';
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

export default function AdminSetup() {
  const [step, setStep] = useState('name');
  const [eventName, setEventName] = useState('');
  const [event, setEvent] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
              <div className="card">
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>🥃</div>
                  <h1 className="page-title" style={{ marginBottom: 8 }}>Host a Tasting</h1>
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
