import React from 'react';

/**
 * App-level error boundary: one runtime render error must never white-screen
 * the whole SPA. The fallback deliberately avoids react-router (the router
 * itself may be the thing that broke) — plain anchors + a hard reload.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Surface in the console for debugging/monitoring pickup.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="min-h-dvh bg-surface flex items-center justify-center px-6">
        <div className="w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-warm p-8 text-center">
          <p className="font-display text-xl font-bold text-on-surface">Something unravelled.</p>
          <p className="mt-2 text-sm text-on-surface-variant">
            An unexpected error broke this view. Your patterns and progress are safe — reload to pick the stitches back up.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary shadow-warm hover:bg-primary-dim transition-colors"
            >
              Reload
            </button>
            <a
              href="/"
              className="rounded-full border border-outline-variant/30 px-5 py-2.5 text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
