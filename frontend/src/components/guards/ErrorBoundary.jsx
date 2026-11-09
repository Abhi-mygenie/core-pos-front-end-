// ErrorBoundary — catches render errors and shows recovery UI
// T-07: CRIT-003 fix
// Must be a class component (React doesn't support error boundary hooks)

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // BUG-597 / BUG-661 OD-661-07: ChunkLoadError = a hashed JS chunk 404'd after a new deploy.
    // Session-scoped, time-boxed retry (max once per 60 s) instead of sticky ?retry=1.
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Loading CSS chunk');
    // BUG-661: session-scoped 60s retry guard (no sticky ?retry=1)
    let last = 0;
    try { last = Number(sessionStorage.getItem('mg_chunk_retry_at')) || 0; } catch (e) { /* storage unavailable */ }
    if (isChunkError && Date.now() - last > 60000) {
      try { sessionStorage.setItem('mg_chunk_retry_at', String(Date.now())); } catch (e) { /* storage unavailable */ }
      window.location.reload();
      return { hasError: false, error: null }; // reload in progress — suppress red screen
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    // Future: send to Sentry (T-44)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-testid="error-boundary-fallback"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            backgroundColor: '#fef2f2',
            color: '#991b1b',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            Something went wrong
          </h1>
          <p style={{ marginBottom: '1.5rem', textAlign: 'center', maxWidth: '400px', color: '#7f1d1d' }}>
            An unexpected error occurred. You can try again or refresh the page.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <pre
              style={{
                marginBottom: '1.5rem',
                padding: '1rem',
                backgroundColor: '#fff',
                border: '1px solid #fca5a5',
                borderRadius: '0.5rem',
                fontSize: '0.75rem',
                maxWidth: '600px',
                overflow: 'auto',
              }}
            >
              {this.state.error.toString()}
            </pre>
          )}
          <button
            data-testid="error-boundary-retry"
            onClick={this.handleReset}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: '600',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
