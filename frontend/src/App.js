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
import ReportDefinitionsMockup from "./pages/reports-module/ReportDefinitionsMockup";
import OrderLedgerMockup from "./pages/reports-module/OrderLedgerMockup";
import SalesMockup from "./pages/reports-module/SalesMockup";
import PaymentsMockup from "./pages/reports-module/PaymentsMockup";
import CancellationsMockup from "./pages/reports-module/CancellationsMockup";
import EdgeStatesMockup from "./pages/reports-module/EdgeStatesMockup";
import PrepServeTimeMockup from "./pages/reports-module/PrepServeTimeMockup";
import RoomOrdersMockup from "./pages/reports-module/RoomOrdersMockup";
import FoodCourtMockup from "./pages/reports-module/FoodCourtMockup";
import SettlementReportMockup from "./pages/reports-module/SettlementReportMockup";
import { InsightsCacheProvider } from "./contexts/InsightsCacheContext";
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
              {/* CR-044: InsightsCacheProvider wraps all /reports-module/* routes for shared date + response cache */}
              <Route path="/reports-module/*" element={<InsightsCacheProvider><Routes>
              <Route path="dashboard" element={<ProtectedRoute><DashboardMockup /></ProtectedRoute>} />
              <Route path="items" element={<ProtectedRoute><ItemSalesHybridMockup /></ProtectedRoute>} />
              <Route path="items-hybrid" element={<ProtectedRoute><ItemSalesHybridMockup /></ProtectedRoute>} />
              <Route path="definitions" element={<ProtectedRoute><ReportDefinitionsMockup /></ProtectedRoute>} />
              <Route path="order-ledger" element={<ProtectedRoute><OrderLedgerMockup /></ProtectedRoute>} />
              <Route path="order-ledger/preview" element={<OrderLedgerMockup />} />
              <Route path="sales" element={<ProtectedRoute><SalesMockup /></ProtectedRoute>} />
              <Route path="payments" element={<ProtectedRoute><PaymentsMockup /></ProtectedRoute>} />
              <Route path="cancellations" element={<ProtectedRoute><CancellationsMockup /></ProtectedRoute>} />
              <Route path="edge-states" element={<ProtectedRoute><EdgeStatesMockup /></ProtectedRoute>} />
              <Route path="kitchen-ops" element={<ProtectedRoute><PrepServeTimeMockup /></ProtectedRoute>} />
              <Route path="kitchen-ops/preview" element={<PrepServeTimeMockup />} />
              <Route path="room-orders" element={<ProtectedRoute><RoomOrdersMockup /></ProtectedRoute>} />
              <Route path="room-orders/preview" element={<RoomOrdersMockup />} />
              <Route path="food-court" element={<ProtectedRoute><FoodCourtMockup /></ProtectedRoute>} />
              <Route path="food-court/preview" element={<FoodCourtMockup />} />
              <Route path="settlement" element={<ProtectedRoute><SettlementReportMockup /></ProtectedRoute>} />
              <Route path="preview" element={<DashboardMockup />} />
              <Route path="items-hybrid/preview" element={<ItemSalesHybridMockup />} />
              </Routes></InsightsCacheProvider>} />
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
