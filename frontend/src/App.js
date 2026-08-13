import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LoginPage, LoadingPage, DashboardPage, OrderSummaryPage } from "./pages";
import AppSocketManager from "./components/AppSocketManager"; // BUG-167 fix
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
import CustomerIntelligenceBeta from "./pages/reports-module/CustomerIntelligenceBeta"; // CR-131
import GuestVsRegisteredBeta from "./pages/reports-module/GuestVsRegisteredBeta"; // CR-131
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
import ExpenseReportPage from "./pages/reports-module/ExpenseReportPage"; // CR-061
import PLReportPage from "./pages/reports-module/PLReportPage"; // CR-094
import ConsumptionReportPage from "./pages/reports-module/ConsumptionReportPage"; // CR-093
import ItemSalesLedgerMockup from "./pages/reports-module/ItemSalesLedgerMockup"; // CR-136
import VariationAddonMockup from "./pages/reports-module/VariationAddonMockup"; // CR-136
import OrderReportBetaPage from "./pages/reports-module/OrderReportBetaPage"; // CR-117
import { InsightsCacheProvider } from "./contexts/InsightsCacheContext";
import SettlementMockup from "./pages/SettlementMockup";
import RestaurantSettingsPage from "./pages/RestaurantSettingsPage";
import SettingsPreviewPage from "./pages/SettingsPreviewPage"; // CR-132 design preview
import Screen1ComparisonPage from "./pages/Screen1ComparisonPage"; // CR-132 Screen 1 comparison
import Screen2ComparisonPage from "./pages/Screen2ComparisonPage"; // CR-132 Screen 2 — Printer Settings
import Screen3ComparisonPage from "./pages/Screen3ComparisonPage"; // CR-132 Screen 3 comparison
import Screen4ComparisonPage from "./pages/Screen4ComparisonPage"; // CR-132 Screen 4 comparison
import Screen5ComparisonPage from "./pages/Screen5ComparisonPage"; // CR-132 Screen 5 comparison
import Screen6ComparisonPage from "./pages/Screen6ComparisonPage"; // CR-132 Screen 6 comparison
import Screen7ComparisonPage from "./pages/Screen7ComparisonPage"; // CR-132 Screen 7 comparison
import Screen8ComparisonPage from "./pages/Screen8ComparisonPage"; // CR-132 Screen 8 comparison
import Screen9ComparisonPage from "./pages/Screen9ComparisonPage"; // CR-132 Screen 9 comparison
import CR132PrintPage from "./pages/CR132PrintPage"; // CR-132 All screens printable PDF
import AggregatorPreviewPage from "./pages/AggregatorPreviewPage"; // CR-135 Aggregator Setup design preview
import AggregatorSetupPage from "./pages/AggregatorSetupPage"; // CR-135 Aggregator Setup
import PrinterConfigPreviewPage from "./pages/PrinterConfigPreviewPage"; // CR-133 Gap Batch preview
import MenuManagementPage from "./pages/MenuManagementPage";         // CR-041
import CreditManagementPage from "./pages/CreditManagementPage";     // CR-041
import DayClosurePage from "./pages/DayClosurePage";                 // CR-041
import SettingsPage from "./pages/SettingsPage";                     // CR-041
import ExpenseEntryPage from "./pages/ExpenseEntryPage";             // CR-059
import ExpenseSetupPage from "./pages/ExpenseSetupPage";             // CR-059
import EmployeeManagementPage from "./pages/EmployeeManagementPage"; // CR-069
import InventoryCurrentStockPage from "./pages/InventoryCurrentStockPage"; // CR-079 (renamed from InventoryDashboardPage)
import StockAuditPage from "./pages/StockAuditPage";                       // CR-079 (renamed from PhysicalCountPage · absorbs CR-075-B)
import SmartPurchasePage from "./pages/SmartPurchasePage";                 // CR-078 (Phase C — replaces PurchaseEntryPage in Phase F)
import SubRecipeStockPage from "./pages/SubRecipeStockPage";               // CR-139
import InventoryIntelligencePage from "./pages/InventoryIntelligencePage"; // CR-079 (Phase D — replaces /inventory in Phase E)
import InventorySetupPage from "./pages/InventorySetupPage";         // CR-072
import PurchaseEntryPage from "./pages/PurchaseEntryPage";           // CR-072
import RecipeManagementPage from "./pages/RecipeManagementPage";     // CR-072
import InventoryReceivePage from "./pages/InventoryReceivePage";     // CR-077
import { Toaster } from "./components/ui/toaster";
import { Toaster as SonnerToaster } from "./components/ui/sonner"; // BUG-254: sonner toast host for aggregator error toasts
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
            <AppSocketManager /> {/* BUG-167: app-level socket — persists across all routes */}
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
              <Route path="item-sales" element={<ProtectedRoute><ItemSalesLedgerMockup /></ProtectedRoute>} /> {/* CR-136 */}
              <Route path="item-sales/preview" element={<ItemSalesLedgerMockup />} /> {/* CR-136 */}
              <Route path="variation-addon-sales" element={<ProtectedRoute><VariationAddonMockup /></ProtectedRoute>} /> {/* CR-136 */}
              <Route path="variation-addon-sales/preview" element={<VariationAddonMockup />} /> {/* CR-136 */}
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
              <Route path="customers-intel-beta" element={<ProtectedRoute><CustomerIntelligenceBeta /></ProtectedRoute>} /> {/* CR-131 */}
              <Route path="customers-gvr-beta" element={<ProtectedRoute><GuestVsRegisteredBeta /></ProtectedRoute>} /> {/* CR-131 */}
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
              {/* CR-061: Expense Report */}
              <Route path="expense-report" element={<ProtectedRoute><ExpenseReportPage /></ProtectedRoute>} />
              {/* CR-094: P&L Report */}
              <Route path="profit-loss" element={<ProtectedRoute><PLReportPage /></ProtectedRoute>} />
              {/* CR-093: Consumption Report */}
              <Route path="consumption-report" element={<ProtectedRoute><ConsumptionReportPage /></ProtectedRoute>} />
              {/* CR-117: Order Report Beta */}
              <Route path="order-report-beta" element={<ProtectedRoute><OrderReportBetaPage /></ProtectedRoute>} />
              <Route path="preview" element={<DashboardMockup />} />
              <Route path="items-hybrid/preview" element={<ItemSalesHybridMockup />} />
              </Routes></InsightsCacheProvider>} />
              {/* Visibility Settings Routes */}
              <Route path="/visibility/status-config" element={<ProtectedRoute><StatusConfigPage /></ProtectedRoute>} />
              {/* CR-015: Settlement Module (panel on dashboard, preview for mockup) */}
              <Route path="/settlement/preview" element={<SettlementMockup />} />
              {/* CR-019: Restaurant Settings Self-Onboarding Wizard */}
              <Route path="/restaurant-settings" element={<ProtectedRoute><RestaurantSettingsPage /></ProtectedRoute>} />
              <Route path="/settings-preview" element={<SettingsPreviewPage />} />
              <Route path="/screen1-compare" element={<Screen1ComparisonPage />} />
              <Route path="/screen2-compare" element={<Screen2ComparisonPage />} />
              <Route path="/screen3-compare" element={<Screen3ComparisonPage />} />
              <Route path="/screen4-compare" element={<Screen4ComparisonPage />} />
              <Route path="/screen5-compare" element={<Screen5ComparisonPage />} />
              <Route path="/screen6-compare" element={<Screen6ComparisonPage />} />
              <Route path="/screen7-compare" element={<Screen7ComparisonPage />} />
              <Route path="/screen8-compare" element={<Screen8ComparisonPage />} />
              <Route path="/screen9-compare" element={<Screen9ComparisonPage />} />
              <Route path="/cr132-print" element={<CR132PrintPage />} />
              <Route path="/aggregator-preview" element={<AggregatorPreviewPage />} />
              <Route path="/aggregator/setup" element={<ProtectedRoute><AggregatorSetupPage /></ProtectedRoute>} />
              <Route path="/printer-config-preview" element={<PrinterConfigPreviewPage />} />
              {/* CR-041: Panel → Route migrations */}
              <Route path="/menu" element={<ProtectedRoute><MenuManagementPage /></ProtectedRoute>} />
              <Route path="/credit" element={<ProtectedRoute><CreditManagementPage /></ProtectedRoute>} />
              <Route path="/day-closure" element={<ProtectedRoute><DayClosurePage /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              {/* CR-059: Expense Module */}
              <Route path="/expenses" element={<ProtectedRoute><ExpenseEntryPage /></ProtectedRoute>} />
              <Route path="/expense-setup" element={<ProtectedRoute><ExpenseSetupPage /></ProtectedRoute>} />
              {/* CR-069: Employee Management */}
              <Route path="/employees" element={<ProtectedRoute><EmployeeManagementPage /></ProtectedRoute>} />
              {/* CR-072: Inventory Management */}
              {/* CR-079 · Phase E — Inventory IA restructure */}
              <Route path="/inventory" element={<ProtectedRoute><Navigate to="/inventory-dashboard" replace /></ProtectedRoute>} />
              <Route path="/inventory-dashboard" element={<ProtectedRoute><InventoryIntelligencePage /></ProtectedRoute>} />
              <Route path="/inventory-current-stock" element={<ProtectedRoute><InventoryCurrentStockPage /></ProtectedRoute>} />
              <Route path="/inventory-smart-purchase" element={<ProtectedRoute><SmartPurchasePage /></ProtectedRoute>} />
              <Route path="/inventory-sub-recipe-stock" element={<ProtectedRoute><SubRecipeStockPage /></ProtectedRoute>} />{/* CR-139 */}
              <Route path="/inventory-audit" element={<ProtectedRoute><StockAuditPage /></ProtectedRoute>} />
              <Route path="/inventory-receive" element={<ProtectedRoute><InventoryReceivePage /></ProtectedRoute>} />
              <Route path="/inventory-setup" element={<ProtectedRoute><InventorySetupPage /></ProtectedRoute>} />
              {/* CR-079 · Legacy 302 redirects — B11 (safe for bookmarks/emails/print QR codes) */}
              <Route path="/inventory-purchase" element={<Navigate to="/inventory-smart-purchase" replace />} />
              <Route path="/inventory-physical" element={<Navigate to="/inventory-audit" replace />} />
              <Route path="/recipes" element={<ProtectedRoute><RecipeManagementPage /></ProtectedRoute>} />
            </Routes>
          </BrowserRouter>
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </div>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
