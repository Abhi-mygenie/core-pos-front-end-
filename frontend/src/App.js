import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage, LoadingPage, DashboardPage, OrderSummaryPage } from "./pages";
import AllOrdersReportPage from "./pages/AllOrdersReportPage";
import RoomOrdersReportPage from "./pages/RoomOrdersReportPage";
import StatusConfigPage from "./pages/StatusConfigPage";
import DashboardMockup from "./pages/reports-module/DashboardMockup";
import ItemSalesMockup from "./pages/reports-module/ItemSalesMockup";
import ItemSalesHybridMockup from "./pages/reports-module/ItemSalesHybridMockup";
import OrderLedgerMockup from "./pages/reports-module/OrderLedgerMockup";
import SalesMockup from "./pages/reports-module/SalesMockup";
import PaymentsMockup from "./pages/reports-module/PaymentsMockup";
import CancellationsMockup from "./pages/reports-module/CancellationsMockup";
import EdgeStatesMockup from "./pages/reports-module/EdgeStatesMockup";
import PrepServeTimeMockup from "./pages/reports-module/PrepServeTimeMockup";
import RoomOrdersMockup from "./pages/reports-module/RoomOrdersMockup";
import FoodCourtMockup from "./pages/reports-module/FoodCourtMockup";
import SettlementReportMockup from "./pages/reports-module/SettlementReportMockup";
import SettlementMockup from "./pages/SettlementMockup";
import RestaurantSettingsPage from "./pages/RestaurantSettingsPage";
import { Toaster } from "./components/ui/toaster";
import { AppProviders } from "./contexts";
import { useRestaurant } from "./contexts";
import { ProtectedRoute, ErrorBoundary } from "./components/guards";

// Sync browser tab title with restaurant context.
// Falls back to "MyGenie POS" before login / when restaurant has no name.
function AppTitleSync() {
  const { restaurant } = useRestaurant();
  useEffect(() => {
    document.title = restaurant?.name
      ? `${restaurant.name} · MyGenie POS`
      : "MyGenie POS";
  }, [restaurant?.name]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppTitleSync />
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
              {/* CR-004: Room Orders Report (PMS-style view, read-only Phase 1) */}
              <Route path="/reports/rooms" element={<ProtectedRoute><RoomOrdersReportPage /></ProtectedRoute>} />
              {/* CR-011: Reports Module — Insights → Dashboard (S0 mockup
                  rendered inside the real app shell via Sidebar). Bypassing
                  ProtectedRoute for preview while permission key
                  `reports_module` is being scoped (OD-3). */}
              <Route path="/reports-module/dashboard" element={<ProtectedRoute><DashboardMockup /></ProtectedRoute>} />
              <Route path="/reports-module/items" element={<ProtectedRoute><ItemSalesHybridMockup /></ProtectedRoute>} />
              {/* CR-011 S5 — Item Sales Hybrid (Phase 2 hero, Gate ① mockup, seed-only).
                  Scope: CR_011_S5_SCOPE_ADDENDUM_2026_06_02.md */}
              <Route path="/reports-module/items-hybrid" element={<ProtectedRoute><ItemSalesHybridMockup /></ProtectedRoute>} />
              {/* CR-011 S6 — Order Ledger Hybrid (Phase 2 hero, Gate ① mockup).
                  Separate service: orderLedgerService.js (owner directive: no mixing Phase 1) */}
              <Route path="/reports-module/order-ledger" element={<ProtectedRoute><OrderLedgerMockup /></ProtectedRoute>} />
              <Route path="/reports-module/order-ledger/preview" element={<OrderLedgerMockup />} />
              <Route path="/reports-module/sales" element={<ProtectedRoute><SalesMockup /></ProtectedRoute>} />
              <Route path="/reports-module/payments" element={<ProtectedRoute><PaymentsMockup /></ProtectedRoute>} />
              <Route path="/reports-module/cancellations" element={<ProtectedRoute><CancellationsMockup /></ProtectedRoute>} />
              <Route path="/reports-module/edge-states" element={<ProtectedRoute><EdgeStatesMockup /></ProtectedRoute>} />
              {/* CR-011 S10 — Prep & Serve Time (Phase 2 hero, Gate ① mockup, seed-only). */}
              <Route path="/reports-module/kitchen-ops" element={<ProtectedRoute><PrepServeTimeMockup /></ProtectedRoute>} />
              <Route path="/reports-module/kitchen-ops/preview" element={<PrepServeTimeMockup />} />
              {/* CR-011-ROOM S-ROOM — Room Orders (PMS+POS historic, Gate ① mockup, seed-only). */}
              <Route path="/reports-module/room-orders" element={<ProtectedRoute><RoomOrdersMockup /></ProtectedRoute>} />
              <Route path="/reports-module/room-orders/preview" element={<RoomOrdersMockup />} />
              {/* CR-013 — Food Court (station-wise order breakdown). */}
              <Route path="/reports-module/food-court" element={<ProtectedRoute><FoodCourtMockup /></ProtectedRoute>} />
              <Route path="/reports-module/food-court/preview" element={<FoodCourtMockup />} />
              {/* CR-016 — Settlement Report (Insights, date-range history) */}
              <Route path="/reports-module/settlement" element={<ProtectedRoute><SettlementReportMockup /></ProtectedRoute>} />
              <Route path="/reports-module/preview" element={<DashboardMockup />} />
              <Route path="/reports-module/items-hybrid/preview" element={<ItemSalesHybridMockup />} />
              {/* Visibility Settings Routes */}
              <Route path="/visibility/status-config" element={<ProtectedRoute><StatusConfigPage /></ProtectedRoute>} />
              {/* CR-015: Settlement Module (panel on dashboard, preview for mockup) */}
              <Route path="/settlement/preview" element={<SettlementMockup />} />
              {/* CR-019: Restaurant Settings Self-Onboarding Wizard */}
              <Route path="/restaurant-settings" element={<ProtectedRoute><RestaurantSettingsPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </div>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
