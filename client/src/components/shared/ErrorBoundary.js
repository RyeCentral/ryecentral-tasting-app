import React from 'react';

/**
 * ErrorBoundary — last line of defence so a render error on one screen shows
 * a recoverable message instead of a blank page (the usual "it won't load on
 * my phone" report).
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: 'var(--app-height, 100vh)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'var(--rc-black, #1a1a1a)',
      }}>
        <div className="card" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🥃</div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ color: 'var(--rc-gray-500)', fontSize: 15, marginBottom: 20 }}>
            Your tasting progress is saved. Reload to pick up where you left off.
          </p>
          <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
            Reload
          </button>
          <a href="/admin" style={{ display: 'inline-block', marginTop: 14, color: 'var(--rc-gray-500)', fontSize: 14 }}>
            Back to start
          </a>
        </div>
      </div>
    );
  }
}
