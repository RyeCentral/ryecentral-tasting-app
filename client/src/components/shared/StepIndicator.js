import React from 'react';

export default function StepIndicator({ steps, currentIndex, onStepClick }) {
  return (
    <div className="steps">
      {steps.map((s, i) => {
        const isDone = i < currentIndex;
        const isActive = i === currentIndex;
        const isClickable = isDone && onStepClick;

        return (
          <div
            key={s.key}
            className={`step ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
            onClick={isClickable ? () => onStepClick(s.key) : undefined}
            style={isClickable ? { cursor: 'pointer' } : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
          >
            {isDone ? '\u2713 ' : ''}{s.label}
          </div>
        );
      })}
    </div>
  );
}
