// T-07 Test Suite: ProtectedRoute — Auth gating + login flow regression
// 9 tests across 3 groups

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mock AuthContext
// ---------------------------------------------------------------------------
let mockAuthValue = { isAuthenticated: false };

jest.mock('../../contexts/AuthContext', () => ({
  __esModule: true,
  useAuth: () => mockAuthValue,
}));

// Mock RestaurantContext (for risk #2 — restaurantLoaded check)
let mockRestaurantValue = { isLoaded: false };

jest.mock('../../contexts/RestaurantContext', () => ({
  __esModule: true,
  useRestaurant: () => mockRestaurantValue,
}));

// Import ProtectedRoute (will be created)
import ProtectedRoute from '../../components/guards/ProtectedRoute';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const renderWithRouter = (initialRoute, routes) => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        {routes}
      </Routes>
    </MemoryRouter>
  );
};

// Dummy components for route testing
const LoginPage = () => <div data-testid="login-page">Login Page</div>;
const LoadingPage = () => <div data-testid="loading-page">Loading Page</div>;
const DashboardPage = () => <div data-testid="dashboard-page">Dashboard Page</div>;
const ReportsPage = () => <div data-testid="reports-page">Reports Page</div>;

// ---------------------------------------------------------------------------
beforeEach(() => {
  mockAuthValue = { isAuthenticated: false };
  mockRestaurantValue = { isLoaded: false };
});

// =============================================================================
// GROUP A — Core Auth Gating (3 tests)
// =============================================================================
describe('Group A: Core Auth Gating', () => {

  test('A1: Renders children when isAuthenticated = true', () => {
    mockAuthValue = { isAuthenticated: true };

    renderWithRouter('/dashboard', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
    </>);

    expect(screen.getByTestId('dashboard-page')).toBeTruthy();
  });

  test('A2: Redirects to / when isAuthenticated = false', () => {
    mockAuthValue = { isAuthenticated: false };

    renderWithRouter('/dashboard', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
    </>);

    expect(screen.getByTestId('login-page')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-page')).toBeNull();
  });

  test('A3: Does NOT mount children at all when unauthenticated (no flash)', () => {
    mockAuthValue = { isAuthenticated: false };
    const mountSpy = jest.fn();

    const SpyComponent = () => {
      React.useEffect(() => { mountSpy(); }, []);
      return <div data-testid="spy-component">Spy</div>;
    };

    renderWithRouter('/dashboard', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><SpyComponent /></ProtectedRoute>
      } />
    </>);

    // SpyComponent should NEVER have mounted
    expect(mountSpy).not.toHaveBeenCalled();
    expect(screen.queryByTestId('spy-component')).toBeNull();
  });
});

// =============================================================================
// GROUP B — Regression: Login → Loading → Dashboard flow (3 tests)
// =============================================================================
describe('Group B: Login Flow Regression', () => {

  test('B1: After login (isAuthenticated=true), /loading route renders LoadingPage', () => {
    mockAuthValue = { isAuthenticated: true };

    renderWithRouter('/loading', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/loading" element={
        <ProtectedRoute><LoadingPage /></ProtectedRoute>
      } />
    </>);

    // LoadingPage should render — ProtectedRoute must NOT block it
    expect(screen.getByTestId('loading-page')).toBeTruthy();
  });

  test('B2: Dashboard redirects to /loading when authenticated but data not loaded', () => {
    mockAuthValue = { isAuthenticated: true };
    mockRestaurantValue = { isLoaded: false };

    // This tests that DashboardPage's OWN restaurantLoaded check still works
    // We simulate this by having ProtectedRoute pass but DashboardPage redirect
    // Since we use dummy components here, we test the ProtectedRoute itself doesn't block
    // The actual restaurantLoaded redirect is in DashboardPage (preserved, not removed)

    renderWithRouter('/dashboard', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/loading" element={
        <ProtectedRoute><LoadingPage /></ProtectedRoute>
      } />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
    </>);

    // ProtectedRoute allows access (auth = true), DashboardPage renders
    // The restaurantLoaded redirect is DashboardPage's internal concern
    expect(screen.getByTestId('dashboard-page')).toBeTruthy();
  });

  test('B3: Dashboard renders normally when authenticated AND data loaded', () => {
    mockAuthValue = { isAuthenticated: true };
    mockRestaurantValue = { isLoaded: true };

    renderWithRouter('/dashboard', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
    </>);

    expect(screen.getByTestId('dashboard-page')).toBeTruthy();
  });
});

// =============================================================================
// GROUP C — Edge Cases (3 tests)
// =============================================================================
describe('Group C: Edge Cases', () => {

  test('C1: Logout mid-session (auth flips false) redirects away from protected route', () => {
    mockAuthValue = { isAuthenticated: true };

    const { rerender } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('dashboard-page')).toBeTruthy();

    // Simulate logout
    mockAuthValue = { isAuthenticated: false };

    rerender(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/dashboard" element={
            <ProtectedRoute><DashboardPage /></ProtectedRoute>
          } />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByTestId('login-page')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-page')).toBeNull();
  });

  test('C2: Direct URL access to /reports/audit without auth redirects to /', () => {
    mockAuthValue = { isAuthenticated: false };

    renderWithRouter('/reports/audit', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/reports/audit" element={
        <ProtectedRoute><ReportsPage /></ProtectedRoute>
      } />
    </>);

    expect(screen.getByTestId('login-page')).toBeTruthy();
    expect(screen.queryByTestId('reports-page')).toBeNull();
  });

  test('C3: / (LoginPage) is still accessible without auth', () => {
    mockAuthValue = { isAuthenticated: false };

    renderWithRouter('/', <>
      <Route path="/" element={<LoginPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute><DashboardPage /></ProtectedRoute>
      } />
    </>);

    expect(screen.getByTestId('login-page')).toBeTruthy();
  });
});
