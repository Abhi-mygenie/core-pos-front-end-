import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage, LoadingPage, DashboardPage, OrderSummaryPage } from "./pages";
import AllOrdersReportPage from "./pages/AllOrdersReportPage";
import RoomOrdersReportPage from "./pages/RoomOrdersReportPage";
import StatusConfigPage from "./pages/StatusConfigPage";
import DashboardMockup from "./pages/reports-module/DashboardMockup";
// CR-045: ItemSalesMockup removed — superseded by ItemSalesHybridMockup (2026-06-17)
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
import DailySalesMockup from "./pages/reports-module/DailySalesMockup"; // CR-011 S11
import HourlySalesMockup from "./pages/reports-module/HourlySalesMockup"; // CR-011 S12
import DayOfWeekMockup from "./pages/reports-module/DayOfWeekMockup"; // CR-011 S13
import ChannelPivotMockup from "./pages/reports-module/ChannelPivotMockup"; // CR-011 S14
import CancelDetailMockup from "./pages/reports-module/CancelDetailMockup"; // CR-011 S28
import AuditLogMockup from "./pages/reports-module/AuditLogMockup"; // CR-011 S34
import OrderNotesMockup from "./pages/reports-module/OrderNotesMockup"; // CR-011 S35
import DiscountReportMockup from "./pages/reports-module/DiscountReportMockup"; // CR-011 S26
import CouponUsageMockup from "./pages/reports-module/CouponUsageMockup"; // CR-011 S27
import StaffServersMockup from "./pages/reports-module/StaffServersMockup"; // CR-011 S32
import StaffCashiersMockup from "./pages/reports-module/StaffCashiersMockup"; // CR-011 S33
import CustomersRfmMockup from "./pages/reports-module/CustomersRfmMockup"; // CR-011 S36
import CustomersMixMockup from "./pages/reports-module/CustomersMixMockup"; // CR-011 S37
import TaxSlabsMockup from "./pages/reports-module/TaxSlabsMockup"; // CR-011 S24
import TaxCalcMockup from "./pages/reports-module/TaxCalcMockup"; // CR-011 S25
import TableSalesMockup from "./pages/reports-module/TableSalesMockup"; // CR-011 S29
import DeliveryChargeMockup from "./pages/reports-module/DeliveryChargeMockup"; // CR-011 S30
import RoomTransfersMockup from "./pages/reports-module/RoomTransfersMockup"; // CR-011 S31
import TaxDetailMockup from "./pages/reports-module/TaxDetailMockup"; // CR-011 S23
import CashierSettlementMockup from "./pages/reports-module/CashierSettlementMockup"; // CR-011 S19
import GatewayReconMockup from "./pages/reports-module/GatewayReconMockup"; // CR-011 S20
import TipReportMockup from "./pages/reports-module/TipReportMockup"; // CR-011 S21
import RoundOffMockup from "./pages/reports-module/RoundOffMockup"; // CR-011 S22
import KotVarianceMockup from "./pages/reports-module/KotVarianceMockup"; // CR-011 S38
import { InsightsCacheProvider } from "./contexts/InsightsCacheContext";
import SettlementMockup from "./pages/SettlementMockup";
import RestaurantSettingsPage from "./pages/RestaurantSettingsPage";
import MenuManagementPage from "./pages/MenuManagementPage";         // CR-041
import CreditManagementPage from "./pages/CreditManagementPage";     // CR-041
import DayClosurePage from "./pages/DayClosurePage";                 // CR-041
import SettingsPage from "./pages/SettingsPage";                     // CR-041
import ExpenseEntryPage from "./pages/ExpenseEntryPage";             // CR-059
import ExpenseSetupPage from "./pages/ExpenseSetupPage";             // CR-059
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
              {/* CR-011 Phase 3 Batch A: S11–S14 Sales deep-dives */}
              <Route path="daily-sales" element={<ProtectedRoute><DailySalesMockup /></ProtectedRoute>} />
              <Route path="hourly-sales" element={<ProtectedRoute><HourlySalesMockup /></ProtectedRoute>} />
              <Route path="day-of-week" element={<ProtectedRoute><DayOfWeekMockup /></ProtectedRoute>} />
              <Route path="channel-pivot" element={<ProtectedRoute><ChannelPivotMockup /></ProtectedRoute>} />
              {/* CR-011 Phase 3 Batch E: S28, S34, S35 */}
              <Route path="cancel-detail" element={<ProtectedRoute><CancelDetailMockup /></ProtectedRoute>} />
              <Route path="audit-log" element={<ProtectedRoute><AuditLogMockup /></ProtectedRoute>} />
              <Route path="order-notes" element={<ProtectedRoute><OrderNotesMockup /></ProtectedRoute>} />
              {/* CR-011 Phase 3 Batch D+F+G */}
              <Route path="discounts" element={<ProtectedRoute><DiscountReportMockup /></ProtectedRoute>} />
              <Route path="coupons" element={<ProtectedRoute><CouponUsageMockup /></ProtectedRoute>} />
              <Route path="staff-servers" element={<ProtectedRoute><StaffServersMockup /></ProtectedRoute>} />
              <Route path="staff-cashiers" element={<ProtectedRoute><StaffCashiersMockup /></ProtectedRoute>} />
              <Route path="customers-rfm" element={<ProtectedRoute><CustomersRfmMockup /></ProtectedRoute>} />
              <Route path="customers-mix" element={<ProtectedRoute><CustomersMixMockup /></ProtectedRoute>} />
              {/* CR-011 Phase 3 Batch C+H */}
              <Route path="tax-detail" element={<ProtectedRoute><TaxDetailMockup /></ProtectedRoute>} />
              <Route path="tax-slabs" element={<ProtectedRoute><TaxSlabsMockup /></ProtectedRoute>} />
              <Route path="tax-calc" element={<ProtectedRoute><TaxCalcMockup /></ProtectedRoute>} />
              <Route path="locations-tables" element={<ProtectedRoute><TableSalesMockup /></ProtectedRoute>} />
              <Route path="locations-delivery" element={<ProtectedRoute><DeliveryChargeMockup /></ProtectedRoute>} />
              <Route path="locations-transfers" element={<ProtectedRoute><RoomTransfersMockup /></ProtectedRoute>} />
              {/* CR-011 Phase 3 Batch I+J */}
              <Route path="cashier-settlement" element={<ProtectedRoute><CashierSettlementMockup /></ProtectedRoute>} />
              <Route path="gateway-recon" element={<ProtectedRoute><GatewayReconMockup /></ProtectedRoute>} />
              <Route path="tips" element={<ProtectedRoute><TipReportMockup /></ProtectedRoute>} />
              <Route path="round-off" element={<ProtectedRoute><RoundOffMockup /></ProtectedRoute>} />
              <Route path="kot-variance" element={<ProtectedRoute><KotVarianceMockup /></ProtectedRoute>} />
              <Route path="preview" element={<DashboardMockup />} />
              <Route path="items-hybrid/preview" element={<ItemSalesHybridMockup />} />
              </Routes></InsightsCacheProvider>} />
              {/* Visibility Settings Routes */}
              <Route path="/visibility/status-config" element={<ProtectedRoute><StatusConfigPage /></ProtectedRoute>} />
              {/* CR-015: Settlement Module (panel on dashboard, preview for mockup) */}
              <Route path="/settlement/preview" element={<SettlementMockup />} />
              {/* CR-019: Restaurant Settings Self-Onboarding Wizard */}
              <Route path="/restaurant-settings" element={<ProtectedRoute><RestaurantSettingsPage /></ProtectedRoute>} />
              {/* CR-041: Panel → Route migrations */}
              <Route path="/menu" element={<ProtectedRoute><MenuManagementPage /></ProtectedRoute>} />
              <Route path="/credit" element={<ProtectedRoute><CreditManagementPage /></ProtectedRoute>} />
              <Route path="/day-closure" element={<ProtectedRoute><DayClosurePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              {/* CR-059: Expense Module */}
              <Route path="/expenses" element={<ProtectedRoute><ExpenseEntryPage /></ProtectedRoute>} />
              <Route path="/expense-setup" element={<ProtectedRoute><ExpenseSetupPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster />
        </div>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
