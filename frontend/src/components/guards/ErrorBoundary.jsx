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
