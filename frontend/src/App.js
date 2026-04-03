import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage, LoadingPage, DashboardPage, OrderSummaryPage } from "./pages";
import AllOrdersReportPage from "./pages/AllOrdersReportPage";
import { Toaster } from "./components/ui/toaster";
import { AppProviders } from "./contexts";
import { ProtectedRoute, ErrorBoundary } from "./components/guards";

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <div className="App">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route path="/loading" element={<ProtectedRoute><LoadingPage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              {/* Order Reports Routes */}
              <Route path="/reports" element={<Navigate to="/reports/audit" replace />} />
              <Route path="/reports/audit" element={<ProtectedRoute><AllOrdersReportPage /></ProtectedRoute>} />
              <Route path="/reports/all-orders" element={<Navigate to="/reports/audit" replace />} />
              <Route path="/reports/summary" element={<ProtectedRoute><OrderSummaryPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </div>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
