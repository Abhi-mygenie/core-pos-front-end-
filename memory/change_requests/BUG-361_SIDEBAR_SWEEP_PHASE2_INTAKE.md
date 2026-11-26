# BUG-361 — Sidebar State Not Persisted: Phase 2 Sweep (68 remaining pages)

**Date:** 2026-08-26
**Registered by:** INTAKE agent
**Source:** AGENT-DISCOVERED (Phase 1 BUG-358 revealed incomplete scope — DashboardPage fixed, 68 pages remain)
**Sprint:** POS 5.1 backlog
**Related:** BUG-358 (Phase 1 — IMPLEMENTED on DashboardPage only)

---

## Classification

| Field | Value |
|---|---|
| Type | BUG (Phase 2 extension of BUG-358) |
| Severity | P2 |
| Risk | **LOW** |
| Side | Frontend |
| Root cause | CODE_ERROR — same `useState(false)` pattern as BUG-358, not fixed in Phase 1 |
| Duplicate check | **DISTINCT** · Related: BUG-358 (Phase 1, IMPLEMENTED) |
| Code reality | **CODE EXISTS** — 68 files confirmed with `useState(false)` pattern |
| Blast radius | **LARGE** (68 files) — but each edit is mechanical/identical, zero logic change |
| Fast Lane eligible | **NO** — localStorage key change is excluded from Fast Lane per rules |

---

## Description

BUG-358 Phase 1 fixed `DashboardPage.jsx` to persist sidebar expanded/collapsed state via `localStorage`. However, every other page in the app — 68 pages across `/pages/` and `/pages/reports-module/` — still has the broken `useState(false)` pattern:

```js
// All 68 pages — CURRENT (broken):
const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
...
<Sidebar isExpanded={isSidebarExpanded} setIsExpanded={setIsSidebarExpanded} />
```

Result: navigating from Dashboard (fixed) to any report page resets the sidebar to collapsed. The preference only survives on Dashboard; as soon as the user navigates away, it resets.

---

## Fix (identical for all 68 pages)

Same 2-line change as BUG-358 Phase 1:

**Edit 1** — `useState(false)` → localStorage-backed initialiser:
```js
const [isSidebarExpanded, setIsSidebarExpanded] = useState(
  () => localStorage.getItem('mygenie_sidebar_expanded') === 'true' // BUG-361
);
```

**Edit 2** — `setIsExpanded={setIsSidebarExpanded}` → wrapper that writes on toggle:
```jsx
setIsExpanded={(v) => { // BUG-361: persist sidebar state
  setIsSidebarExpanded(v);
  localStorage.setItem('mygenie_sidebar_expanded', String(v));
}}
```

**Same key** `mygenie_sidebar_expanded` used by DashboardPage Phase 1 — all pages share one preference.

---

## Affected Files (68 total)

### pages/ (23 files)
`AllOrdersReportPage.jsx`, `CreditManagementPage.jsx`, `DayClosurePage.jsx`, `DeliveryManagementPage.jsx`, `EmployeeManagementPage.jsx`, `ExpenseEntryPage.jsx`, `ExpenseSetupPage.jsx`, `InventoryCurrentStockPage.jsx`, `InventoryIntelligencePage.jsx`, `InventoryReceivePage.jsx`, `InventorySetupPage.jsx`, `MenuManagementPage.jsx`, `OrderSummaryPage.jsx`, `PurchaseEntryPage.jsx`, `RecipeManagementPage.jsx`, `RoomOrdersReportPage.jsx`, `SettingsPage.jsx`, `SettlementMockup.jsx`, `SettlementPage.jsx`, `SmartPurchasePage.jsx`, `StatusConfigPage.jsx`, `StockAuditPage.jsx`, `SubRecipeStockPage.jsx`

### pages/reports-module/ (45 files)
`AuditLogMockup.jsx`, `CancelDetailMockup.jsx`, `CancellationsMockup.jsx`, `CashierSettlementMockup.jsx`, `ChannelPivotMockup.jsx`, `ConsumptionReportPage.jsx`, `CouponUsageMockup.jsx`, `CustomerIntelligenceBeta.jsx`, `CustomersMixMockup.jsx`, `CustomersRfmMockup.jsx`, `DailySalesMockup.jsx`, `DashboardMockup.jsx`, `DayOfWeekMockup.jsx`, `DeliveryChargeMockup.jsx`, `DiscountReportMockup.jsx`, `EdgeStatesMockup.jsx`, `ExpenseReportPage.jsx`, `FoodCourtBetaPage.jsx`, `FoodCourtMockup.jsx`, `GatewayReconMockup.jsx`, `GuestVsRegisteredBeta.jsx`, `HourlySalesMockup.jsx`, `ItemSalesHybridMockup.jsx`, `ItemSalesLedgerMockup.jsx`, `KotVarianceMockup.jsx`, `OrderLedgerMockup.jsx`, `OrderNotesMockup.jsx`, `OrderReportBetaPage.jsx`, `PLReportPage.jsx`, `PaymentsMockup.jsx`, `PrepServeTimeMockup.jsx`, `PurchaseReportPage.jsx`, `RoomOrdersMockup.jsx`, `RoomTransfersMockup.jsx`, `RoundOffMockup.jsx`, `SalesMockup.jsx`, `SettlementReportMockup.jsx`, `StaffCashiersMockup.jsx`, `StaffServersMockup.jsx`, `TableSalesMockup.jsx`, `TaxCalcMockup.jsx`, `TaxDetailMockup.jsx`, `TaxSlabsMockup.jsx`, `TipReportMockup.jsx`, `VariationAddonMockup.jsx`

---

## Evidence

- `grep -rln "isSidebarExpanded.*useState(false)"` → **68 files** confirmed
- Pattern identical in all files: `useState(false)` init + `setIsExpanded={setIsSidebarExpanded}` prop
- Source: code scan 2026-08-26
- Confidence: **HIGH**

## Owner Decisions Needed

None — same localStorage key, same pattern as owner-approved BUG-358 Phase 1. No business rules involved.

## Next Gate

Gate 2 (Impact Analysis) — straightforward given Phase 1 precedent. Can proceed directly to Gate 3 (Implementation Plan) since the change is pure mechanical repetition of BUG-358.
