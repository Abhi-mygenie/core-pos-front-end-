// T-07 Test Suite: Full App Routing Integration
// 4 tests

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mock auth
// ---------------------------------------------------------------------------
let mockAuthValue = { isAuthenticated: false };

jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockAuthValue,
}));

import ProtectedRoute from '../../components/guards/ProtectedRoute';
import ErrorBoundary from '../../components/guards/ErrorBoundary';

// Dummy pages
const LoginPage = () => {
  // Real LoginPage redirects to /loading if authenticated
  if (mockAuthValue.isAuthenticated) {
    return <Navigate to="/loading" replace />;
  }
  return <div data-testid="login-page">Login Page</div>;
};
const LoadingPage = () => <div data-testid="loading-page">Loading Page</div>;
const DashboardPage = () => <div data-testid="dashboard-page">Dashboard Page</div>;
const ReportsPage = () => <div data-testid="reports-page">Reports Page</div>;

// Full app routes matching the real App.js structure (after T-07 changes)
const AppRoutes = ({ initialRoute }) => (
  <ErrorBoundary>
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/loading" element={
          <ProtectedRoute><LoadingPage /></ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute><DashboardPage /></ProtectedRoute>
        } />
        <Route path="/reports/audit" element={
          <ProtectedRoute><ReportsPage /></ProtectedRoute>
        } />
        <Route path="/reports/summary" element={
          <ProtectedRoute><ReportsPage /></ProtectedRoute>
        } />
      </Routes>
    </MemoryRouter>
  </ErrorBoundary>
);

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockAuthValue = { isAuthenticated: false };
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// =============================================================================
// GROUP E — Full Integration: Real Router Flow (4 tests)
// =============================================================================
describe('Group E: Full App Routing Integration', () => {

  test('E1: Unauthenticated → /dashboard → ends up at /', () => {
    mockAuthValue = { isAuthenticated: false };

    render(<AppRoutes initialRoute="/dashboard" />);

    expect(screen.getByTestId('login-page')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-page')).toBeNull();
  });

  test('E2: Authenticated → /dashboard → DashboardPage renders', () => {
    mockAuthValue = { isAuthenticated: true };

    render(<AppRoutes initialRoute="/dashboard" />);

    expect(screen.getByTestId('dashboard-page')).toBeTruthy();
  });

  test('E3: Unauthenticated → /reports/audit → ends up at /', () => {
    mockAuthValue = { isAuthenticated: false };

    render(<AppRoutes initialRoute="/reports/audit" />);

    expect(screen.getByTestId('login-page')).toBeTruthy();
    expect(screen.queryByTestId('reports-page')).toBeNull();
  });

  test('E4: No redirect loop — authenticated user at / goes to /loading (not back to /)', () => {
    mockAuthValue = { isAuthenticated: true };

    render(<AppRoutes initialRoute="/" />);

    // LoginPage detects auth and redirects to /loading
    // ProtectedRoute on /loading allows (auth=true)
    // LoadingPage renders — no loop
    expect(screen.getByTestId('loading-page')).toBeTruthy();
    expect(screen.queryByTestId('login-page')).toBeNull();
  });
});
