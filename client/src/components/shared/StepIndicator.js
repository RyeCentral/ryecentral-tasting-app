import React from 'react';

export default function StepIndicator({ steps, currentIndex }) {
  return (
    <div className="steps">
      {steps.map((s, i) => (
        <div
          key={s.key}
          className={`step ${i === currentIndex ? 'active' : ''} ${i < currentIndex ? 'done' : ''}`}
        >
          {i < currentIndex ? '\u2713 ' : ''}{s.label}
        </div>
      ))}
    </div>
  );
}
