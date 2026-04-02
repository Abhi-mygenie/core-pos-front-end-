import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage, LoadingPage, DashboardPage, OrderSummaryPage } from "./pages";
import AllOrdersReportPage from "./pages/AllOrdersReportPage";
import { Toaster } from "./components/ui/toaster";
import { AppProviders } from "./contexts";

function App() {
  return (
    <AppProviders>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            {/* Order Reports Routes */}
            <Route path="/reports" element={<Navigate to="/reports/audit" replace />} />
            <Route path="/reports/audit" element={<AllOrdersReportPage />} />
            <Route path="/reports/all-orders" element={<Navigate to="/reports/audit" replace />} />
            <Route path="/reports/summary" element={<OrderSummaryPage />} />
          </Routes>
        </BrowserRouter>
        <Toaster />
      </div>
    </AppProviders>
  );
}

export default App;
