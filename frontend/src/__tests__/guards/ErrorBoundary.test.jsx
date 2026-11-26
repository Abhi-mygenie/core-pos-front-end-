// T-07 Test Suite: ErrorBoundary — Crash recovery
// 5 tests

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Import ErrorBoundary (will be created)
import ErrorBoundary from '../../components/guards/ErrorBoundary';

// ---------------------------------------------------------------------------
// Helper: A component that throws on demand
// ---------------------------------------------------------------------------
const ThrowingComponent = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error('Test render error');
  }
  return <div data-testid="child-content">Working fine</div>;
};

// Suppress console.error for expected error boundary logs
beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// =============================================================================
// GROUP D — Error Handling (5 tests)
// =============================================================================
describe('Group D: Error Handling', () => {

  test('D1: Renders children normally when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="happy-child">Hello</div>
      </ErrorBoundary>
    );

    expect(screen.getByTestId('happy-child')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });

  test('D2: Catches render error and shows recovery UI instead of white screen', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Child should NOT be visible
    expect(screen.queryByTestId('child-content')).toBeNull();

    // Recovery UI should be visible
    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();
  });

  test('D3: Recovery UI shows a "Try Again" button', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByTestId('error-boundary-retry');
    expect(retryButton).toBeTruthy();
  });

  test('D4: Clicking "Try Again" resets error and re-renders children', () => {
    // Use a controllable component — throws when flag is true
    let shouldThrow = true;
    const Controllable = () => {
      if (shouldThrow) {
        throw new Error('Controlled error');
      }
      return <div data-testid="recovered-child">Recovered</div>;
    };

    render(
      <ErrorBoundary>
        <Controllable />
      </ErrorBoundary>
    );

    // Should show error UI (component always throws initially)
    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();

    // Now stop throwing and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByTestId('error-boundary-retry'));

    // Should show recovered child
    expect(screen.getByTestId('recovered-child')).toBeTruthy();
    expect(screen.queryByTestId('error-boundary-fallback')).toBeNull();
  });

  test('D5: ErrorBoundary works without any context providers (standalone)', () => {
    // This proves Risk #3 is safe — ErrorBoundary doesn't need contexts
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    // Should catch error and show fallback without crashing itself
    expect(screen.getByTestId('error-boundary-fallback')).toBeTruthy();
  });
});
