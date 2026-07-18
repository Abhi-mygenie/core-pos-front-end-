# Layer 7 — File Ownership Map

**Status:** POPULATED
**Last Updated:** 2026-06-18 (Session: BUG-137, BUG-138, BUG-130, BUG-139→CR-052, CR-051 amended)

---

## Frozen Files (DO NOT MODIFY without owner approval)

| Path | Reason |
|---|---|
| `/app/memory/final/*` (8 files) | Frozen baseline |
| `/app/memory/crm/crm_1_0/*` | Closed CRM 1.0 baseline |
| `orderTransform.js` outbound payload contracts | Financial/payment truth |
| `DeliveryCard.jsx` | Legacy/unused — owner directive: do not delete or modify |

---

## High-Risk Hotspot Files

| File | Lines | Risk Areas | Last Modified By |
|---|---|---|---|
| `pages/DashboardPage.jsx` | 1975 | Orchestration boundary, cartsByTable, stay-on-order | PROD-HOTFIX-004 agent (2026-05-27) |
| `components/order-entry/OrderEntry.jsx` | 2493 | Transactional workflow, customer modal, CRM intel | CR-037 agent (2026-06-13) — Popular tab removed |
| `components/order-entry/CollectPaymentPanel.jsx` | 3050 | Final settlement, payment status, financial logic | CR-021 agent (2026-06-10) |
| `components/modals/RoomCheckInModal.jsx` | 1362 | Room workflow, advance payment | POS 3.0 era |
| `pages/StatusConfigPage.jsx` | 1561 | Visibility settings, QSR toggles, auto-settle | CR-024 agent (2026-06-10) |
| `api/transforms/orderTransform.js` | 1916 | Financial payload builders, rider fields, discount payload | CR-025 agent (2026-06-10) |
| `api/services/reportService.js` | 744 | Report presentation (reduced from 1257) | Audit Report agent (2026-05-28) |
| `api/socket/socketHandlers.js` | 839 | Realtime event handling, scan-new-order, food_update | BUG-116 agent (2026-06-08) |
| `api/socket/useSocketEvents.js` | 248 | Socket subscriptions | BUG-116 agent (2026-06-08) |
| `pages/LoadingPage.jsx` | 845 | Bootstrap sequencing, retry policy | CR-037/CR-038 agent (2026-06-13) |
| `components/panels/SettlementPanel.jsx` | 487 | Settlement module, KPI formulas | BUG-132 agent (2026-06-13) |
| `components/layout/Sidebar.jsx` | ~350 | Navigation, report labels, sticky bottom | CR-040/CR-042/BUG-131/CR-044 agent (2026-06-13) |

---

## Recently Modified Files

### CR-014 Phase 2 — Bulk Editor (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `components/panels/menu/BulkEditor.jsx` | Production bulk editor (650 lines), 33 editable columns, 4-tier picker, category grouping, batch save | CR-014 P2 agent |
| `components/panels/MenuManagementPanel.jsx` | +Bulk Edit toggle button, BulkEditor import + rendering | CR-014 P2 agent |

### CR-015 — Settlement Module (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `components/panels/SettlementPanel.jsx` | NEW — Settlement slide-over panel (487 lines), 5 KPIs, waiter table, 3 modals | CR-015 agent |
| `api/services/settlementService.js` | NEW — 5 API functions | CR-015 agent |
| `api/transforms/settlementTransform.js` | NEW — fromAPI + toAPI + date helpers | CR-015 agent |
| `pages/DashboardPage.jsx` | +SettlementPanel import, isSettlementOpen state | CR-015 agent |
| `components/layout/Sidebar.jsx` | +Settlement entry, Banknote import | CR-015 agent |
| `App.js` | +settlement/preview route | CR-015 agent |

### BUG-116 — Realtime Menu Socket (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `api/socket/socketEvents.js` | NEW — channel generator + payload-type const | BUG-116 agent |
| `api/socket/socketHandlers.js` | +handleFoodUpdate | BUG-116 agent |
| `contexts/MenuContext.jsx` | +addOrUpdateProduct delta upsert | BUG-116 agent |
| `api/socket/useSocketEvents.js` | +food_update subscription | BUG-116 agent |

### CR-017 / CR-018 / CR-019 / BUG-122 — June 8-10
| File | Change | Agent |
|---|---|---|
| `components/modals/WhatsAppPaymentModal.jsx` | NEW — WhatsApp payment link modal | CR-017 agent |
| `api/services/paymentLinkService.js` | NEW — Razorpay payment link API | CR-017 agent |
| `components/order/OrderCard.jsx` | +WhatsApp button, +POS YTC Cancel (BUG-122 post) | CR-017/BUG-122 agent |
| `components/order-entry/CartPanel.jsx` | +Schedule checkbox, schedule_at fix (BUG-122 post) | CR-018/BUG-122 agent |
| `components/order/TableCard.jsx` | +Snooze web-gate (BUG-122 post) | BUG-122 agent |
| `pages/ScanOrderPopOut.jsx` | +isWebOrder gate | BUG-122 agent |
| `pages/RestaurantSettingsPage.jsx` | NEW — 6-step wizard | CR-019 agent |
| `api/services/restaurantSettingsService.js` | NEW — settings API | CR-019 agent |
| `api/transforms/restaurantSettingsTransform.js` | NEW — settings transform | CR-019 agent |

### CR-020 / CR-021 / CR-022 / CR-023 / CR-024 / CR-025 — June 10-11
| File | Change | Agent |
|---|---|---|
| `pages/RestaurantSettingsPage.jsx` | B1-B15 fixes across 4 phases | CR-020 agent |
| `api/transforms/restaurantSettingsTransform.js` | Bug fixes | CR-020 agent |
| `api/transforms/orderTransform.js` | +partial_payments[], discount payload fix | CR-021/CR-025 agent |
| `components/order-entry/CollectPaymentPanel.jsx` | Split amount fix, disabled guard | CR-021 agent |
| `components/panels/menu/ProductList.jsx` | item_type enum filter | CR-022 agent |
| `api/transforms/menuManagementTransform.js` | +Number() coercion | CR-022 agent |
| `components/panels/menu/BulkEditor.jsx` | LocalTextInput + React.memo, CR-036 + FU-01/02/03 | CR-023/CR-036 agent |
| `pages/StatusConfigPage.jsx` | Channel feature-gate | CR-024 agent |
| `pages/DashboardPage.jsx` | Channel visibility (CR-024) | CR-024 agent |
| `api/transforms/profileTransform.js` | +gstStatus from api.gst_status, channel feature gate | CR-020/CR-036-FU-03 agent |

### CR-026 — Report Data & Rounding Sweep (2026-06-11)
| File | Change | Agent |
|---|---|---|
| `api/transforms/reportTransform.js` | 2-decimal rounding across 12 report files | CR-026 agent |
| `api/services/orderLedgerService.js` | orderLogsReportRow fields | CR-026 agent |
| `api/services/creditService.js` | credit totals from API | CR-026 agent |
| `components/panels/CreditManagementPanel.jsx` | drill-down bill summary | CR-026 agent |
| `components/reports/OrderDetailSheet.jsx` | 12 financial fields | CR-026 agent |
| + 11 report files | display rounding | CR-026 agent |

### Insights Batch — CR-029→CR-035, BUG-125→BUG-128 (2026-06-11)
| File | Change | Agent |
|---|---|---|
| `api/services/insightsService.js` | Room classification, cancel scope, round_up fix, double-fetch | Insights agent |
| `api/transforms/reportTransform.js` | +400 lines new transform, payment classifier | Insights agent |
| `api/services/paymentClassifier.js` | NEW — shared classifier | CR-032 agent |
| `pages/reports-module/*` | All 10 Insights report pages (classification, new columns, help links) | Insights agent |
| `pages/AllOrdersReportPage.jsx` | Cancelled filter fix (BUG-115) | BUG-115 agent |

### June 12-13 Implementation Session (CR-037→CR-045, BUG-131→BUG-133)
| File | Change | Agent |
|---|---|---|
| `api/transforms/orderPayloadStripper.js` | NEW — FE field stripper | CR-045 agent |
| `api/services/insightsCache.js` | NEW — module-level cache | CR-044 agent |
| `contexts/InsightsCacheContext.jsx` | NEW — shared date context | CR-044 agent |
| `components/panels/SettlementPanel.jsx` | 13 formula edits + Total Funds KPI | BUG-132 agent |
| `components/layout/Sidebar.jsx` | Rename labels, remove X/Y/Z, Item Ledger, sticky bottom, cache logout | CR-040/042/BUG-131/CR-044 |
| `pages/LoadingPage.jsx` | Remove popular-items, retry counter | CR-037/CR-038 |
| `components/order-entry/OrderEntry.jsx` | Remove Popular tab | CR-037 |
| `components/order-entry/CategoryPanel.jsx` | Remove Popular category | CR-037 |
| `components/panels/CreditManagementPanel.jsx` | Wire Total Credit/Paid KPI tiles | CR-039 |
| `api/services/creditService.js` | Portfolio export optimization | CR-039 |
| `pages/AllOrdersReportPage.jsx` | Rename "Daily Report" header | CR-040 |
| `pages/OrderSummaryPage.jsx` | Rename "Daily Summary" header | CR-040 |
| `pages/RoomOrdersReportPage.jsx` | Rename "Daily Room Report" header | CR-040 |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | Item Ledger rename + cache | CR-042/CR-044 |
| 9x `pages/reports-module/*Mockup.jsx` | Cache wiring + strip wiring | CR-044/CR-045 |
| `api/services/insightsService.js` | Check In filter + strip + cache | BUG-133/CR-045/CR-044 |
| `api/services/orderLedgerService.js` | Strip + cache | CR-045/CR-044 |
| `api/services/roomOrdersService.js` | Strip + cache | CR-045/CR-044 |
| `api/services/foodCourtService.js` | Strip + cache | CR-045/CR-044 |
| `api/services/prepServeService.js` | Strip + cache | CR-045/CR-044 |
| `api/transforms/reportTransform.js` | Check In filter | BUG-133 |
| `api/constants.js` | Remove POPULAR_ITEMS constant | CR-037 |
| `contexts/MenuContext.jsx` | Remove popular items, move isLoaded | CR-037 |
| `hooks/useRefreshAllData.js` | Remove popular refresh | CR-037 |
| `App.js` | InsightsCacheProvider wrap | CR-044 |
| `api/transforms/productTransform.js` | (verified — already had check-in filter) | BUG-133 |

---

## Dependency Map ("If you touch X, verify Y")

| If you touch... | Verify these downstream files... |
|---|---|
| `orderTransform.js` | `CollectPaymentPanel.jsx`, `OrderEntry.jsx`, `CartPanel.jsx`, `reportService.js`, `socketHandlers.js`, `orderService.js`, print payloads |
| `socketHandlers.js` | `useSocketEvents.js`, `DashboardPage.jsx`, `useOrderPollingReconciliation.js`, `ScanOrderPopOut.jsx` |
| `OrderEntry.jsx` | `DashboardPage.jsx` (mounts it), `CollectPaymentPanel.jsx`, `CartPanel.jsx`, `CustomerModal.jsx`, `ItemCustomizationModal.jsx` |
| `CollectPaymentPanel.jsx` | `OrderEntry.jsx`, `SplitBillModal.jsx`, `CollectBillPanelDrawer.jsx`, `orderTransform.js`, `couponService.js`, `loyaltyTransform.js` |
| `DashboardPage.jsx` | `OrderEntry.jsx`, `socketHandlers.js`, all card components, `StatusConfigPage.jsx` (settings) |
| `reportService.js` | `AllOrdersReportPage.jsx`, `RoomOrdersReportPage.jsx`, `OrderSummaryPage.jsx`, `OrderDetailSheet.jsx`, `reportTransform.js`, `orderTransform.js` |
| `reportTransform.js` | `reportService.js`, `AllOrdersReportPage.jsx`, `OrderTable.jsx`, `orderTransform.js` |
| `LoadingPage.jsx` | All contexts (bootstrap data), `AuthContext.jsx` |
| Provider order (`AppProviders.jsx`) | Everything — provider order is architecture-significant |
| Any localStorage key | `StatusConfigPage.jsx`, `DashboardPage.jsx`, `OrderEntry.jsx`, related prefs utilities |
| `insightsCache.js` | All 10 report pages, 5 service files, `InsightsCacheContext.jsx`, `App.js` |
| `orderPayloadStripper.js` | **DELETED (2026-06-17)** — was imported by 7 service files, backend now strips server-side |
| `BulkEditor.jsx` | `MenuManagementPanel.jsx`, `profileTransform.js` (gstStatus), CR-036 test file |

---

## Cross-Sprint Conflict Zones

| File | Touched By | Risk |
|---|---|---|
| `OrderEntry.jsx` | POS 3.1 + CRM 2.0 (2026-05-27) + CR-037 (2026-06-13) | HIGH — Popular tab removed |
| `CartPanel.jsx` | POS 3.1 (2026-05-27) + CR-018 (2026-06-08) + BUG-122 post (2026-06-10) | HIGH — schedule + split |
| `Sidebar.jsx` | CR-015 (2026-06-08) + CR-040/042/BUG-131/CR-044 (2026-06-13) | MEDIUM — 4 CRs same session |
| `DashboardPage.jsx` | PROD-HOTFIX-004/005 (2026-05-27) + CR-024 (2026-06-10) | MEDIUM |
| `reportTransform.js` | Audit Report (2026-05-28) + Insights batch (2026-06-11) + BUG-133 (2026-06-13) | MEDIUM |
| `BulkEditor.jsx` | CR-023 (2026-06-10) + CR-036/FU-01/02/03 (2026-06-12) | HIGH — 5 CRs layered |
| `insightsService.js` | Insights batch (2026-06-11) + BUG-133 + CR-045 + CR-044 (2026-06-13) + CR-045 cleanup (2026-06-17, -481 lines) | MEDIUM |

## BUG-134 (2026-06-15) — Scroll fix (Windows/QSR)
| File | Change |
|------|--------|
| `OrderEntry.jsx` | +min-h-0 (L1455, L1608), +overflow-y-auto (L1608) |
| `CartPanel.jsx` | +min-h-[200px] (L1163) |
| `CategoryPanel.jsx` | +min-h-0 (L20) |
| `App.css` | scrollbar width 6→8px (L33-34) |

### CR-049 / BUG-096 / BUG-092 / CR-048 — 2026-06-15 Implementation Session
| File | Change | Agent |
|------|--------|-------|
| `api/constants.js` | +4 INSIGHTS_* endpoint constants | CR-049 agent |
| `api/services/insightsService.js` | +4 cached fetch functions, +2 transforms, percentage fix | CR-049 agent |
| `pages/reports-module/DashboardMockup.jsx` | Switched to fetchInsightsDashboard | CR-049 agent |
| `pages/reports-module/SalesMockup.jsx` | Switched to fetchInsightsSales | CR-049 agent |
| `pages/reports-module/PaymentsMockup.jsx` | Switched to fetchInsightsSales | CR-049 agent |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | Switched to fetchInsightsItems + audit lazy fetch | CR-049 agent |
| `pages/reports-module/CancellationsMockup.jsx` | Switched to fetchInsightsCancellations | CR-049 agent |
| `api/socket/socketEvents.js` | +DELETE_FOOD constant | BUG-096 agent |
| `api/socket/socketHandlers.js` | +delete-food handler | BUG-096 agent |
| `contexts/MenuContext.jsx` | +removeProduct action | BUG-096 agent |
| `api/socket/useSocketEvents.js` | +removeProduct wiring | BUG-096 agent |
| `components/modals/RoomCheckInModal.jsx` | Phone normalize + CRM lookup/create | BUG-092 agent |
| `api/services/roomService.js` | +customer_id in FormData | BUG-092 agent |
| `scripts/gen_dashboard_sync.js` (NEW) | Registry → dashboard JSON generator | CR-048 agent |
| `scripts/watch_registry.js` (NEW) | Chokidar file watcher | CR-048 agent |

### CR-011 Phase 3 — All Screens (2026-06-16)
| File | Change | Agent |
|---|---|---|
| `pages/reports-module/DailySalesMockup.jsx` | NEW — S11 Daily Sales Summary | CR-011 Phase 3 |
| `pages/reports-module/HourlySalesMockup.jsx` | NEW — S12 Hourly Sales Curve | CR-011 Phase 3 |
| `pages/reports-module/DayOfWeekMockup.jsx` | NEW — S13 Day-of-Week Trend | CR-011 Phase 3 |
| `pages/reports-module/ChannelPivotMockup.jsx` | NEW — S14 Channel & Payment | CR-011 Phase 3 |
| `pages/reports-module/CancelDetailMockup.jsx` | NEW — S28 Item Cancel Detail | CR-011 Phase 3 |
| `pages/reports-module/AuditLogMockup.jsx` | NEW — S34 Order Edit Audit | CR-011 Phase 3 |
| `pages/reports-module/OrderNotesMockup.jsx` | NEW — S35 Order Note Audit | CR-011 Phase 3 |
| `pages/reports-module/DiscountReportMockup.jsx` | NEW — S26 Discount Report | CR-011 Phase 3 |
| `pages/reports-module/CouponUsageMockup.jsx` | NEW — S27 Coupon Usage | CR-011 Phase 3 |
| `pages/reports-module/StaffServersMockup.jsx` | NEW — S32 Server Performance | CR-011 Phase 3 |
| `pages/reports-module/StaffCashiersMockup.jsx` | NEW — S33 Cashier Activity | CR-011 Phase 3 |
| `pages/reports-module/CustomersRfmMockup.jsx` | NEW — S36 Customer RFM | CR-011 Phase 3 |
| `pages/reports-module/CustomersMixMockup.jsx` | NEW — S37 Guest vs Registered | CR-011 Phase 3 |
| `pages/reports-module/TaxDetailMockup.jsx` | NEW — S23 GST/VAT Detail | CR-011 Phase 3 |
| `pages/reports-module/TaxSlabsMockup.jsx` | NEW — S24 Tax Slab Summary | CR-011 Phase 3 |
| `pages/reports-module/TaxCalcMockup.jsx` | NEW — S25 Inclusive/Exclusive | CR-011 Phase 3 |
| `pages/reports-module/TableSalesMockup.jsx` | NEW — S29 Table-wise Sales | CR-011 Phase 3 |
| `pages/reports-module/DeliveryChargeMockup.jsx` | NEW — S30 Delivery Charges | CR-011 Phase 3 |
| `pages/reports-module/RoomTransfersMockup.jsx` | NEW — S31 Room Transfer Trail | CR-011 Phase 3 |
| `pages/reports-module/CashierSettlementMockup.jsx` | NEW — S19 Cashier Settlement | CR-011 Phase 3 |
| `pages/reports-module/GatewayReconMockup.jsx` | NEW — S20 Gateway Recon | CR-011 Phase 3 |
| `pages/reports-module/TipReportMockup.jsx` | NEW — S21 Tip Report | CR-011 Phase 3 |
| `pages/reports-module/RoundOffMockup.jsx` | NEW — S22 Round-Off Report | CR-011 Phase 3 |
| `pages/reports-module/KotVarianceMockup.jsx` | NEW — S38 KOT Variance | CR-011 Phase 3 |
| `pages/reports-module/ItemSalesHybridMockup.jsx` | MODIFIED — +4 tabs (S15-S18) + transformItemRows fix | CR-011 Phase 3 |
| `api/services/insightsService.js` | MODIFIED — +5 fetch functions + transformItemRows fix | CR-011 Phase 3 |
| `api/constants.js` | MODIFIED — +5 endpoint URLs | CR-011 Phase 3 |
| `App.js` | MODIFIED — +24 imports + routes | CR-011 Phase 3 |

### CR-011 Phase 3 — Sidebar Rearrangement (2026-06-16)
| File | Change | Agent |
|---|---|---|
| `components/layout/Sidebar.jsx` | MODIFIED — Insights children restructured: flat 16 items → grouped 60+ items with `isGroup` category headers. comingSoon flags removed. All Phase 3 screens navigable. | CR-011 Phase 3 |

### BUG-136 — Sidebar Scroll Persistence (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `components/layout/Sidebar.jsx` | MODIFIED — +`useSidebarScroll` hook (navRef + saveScroll + useLayoutEffect restore), 4× `saveScroll()` before navigate calls, `ref={navRef}` on `<nav>`. ~15 lines added. | BUG-136 agent |
| `contexts/InsightsCacheContext.jsx` | MODIFIED — +`sidebarScrollTop`/`setSidebarScrollTop` state + provided in context value. 3 lines added. | BUG-136 agent |

### BUG-125-B — Food Type Persistence Fix (retroactive, verified 2026-06-17)
| File | Change | Agent |
|---|---|---|
| `api/transforms/menuManagementTransform.js` | MODIFIED — +`veg:` field at L251 (alongside existing `item_type`). Covers Quick Edit, Full Edit, Add Food. | BUG-125-B (shipped on discount-menu branch, merged to 16-june) |

### CR-041 — Sidebar Restructure (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `components/layout/Sidebar.jsx` | MODIFIED — Full rewrite of `sidebarMenuItems[]` (new order, renames, new children), `VISIBLE_SECTIONS`, `SIDEBAR_PERMISSIONS`, `COMING_SOON_ITEMS`. Removed 4 `onOpen*` props + 4 special-case handlers. Added `settings` + `reports` child handlers. | CR-041 agent |
| `pages/DashboardPage.jsx` | MODIFIED — Removed 4 panel imports, 4 state vars, 4 `onOpen*` props, 4 panel mounts (~40 lines removed). | CR-041 agent |
| `App.js` | MODIFIED — Added 4 imports + 4 routes: `/menu`, `/credit`, `/day-closure`, `/settings`. | CR-041 agent |
| `pages/MenuManagementPage.jsx` | NEW — Full-page wrapper for MenuManagementPanel (~20 lines). | CR-041 agent |
| `pages/CreditManagementPage.jsx` | NEW — Full-page wrapper for CreditManagementPanel (~20 lines). | CR-041 agent |
| `pages/DayClosurePage.jsx` | NEW — Full-page wrapper for SettlementPanel renamed "Day Closure" (~20 lines). | CR-041 agent |
| `pages/SettingsPage.jsx` | NEW — Full-page wrapper for SettingsPanel (~20 lines). | CR-041 agent |
| `components/panels/menu/BulkEditor.jsx` | MODIFIED — +`veg:` field at L159 (alongside existing `item_type`). Covers Bulk Editor save. | BUG-125-B |

### CR-011 FE-Only Fixes — F-1, F-2, F-5, F-6, F-10 (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `pages/reports-module/ItemSalesHybridMockup.jsx` | MODIFIED — Line 301: F-1 defensive label remap (`[]`/`"default"`/null → "No Variation"). Lines 1120-1148 removed: F-5 By Station summary block deleted from All Items tab. | CR-011 FE-fixes agent (2026-06-17) |
| `pages/reports-module/HourlySalesMockup.jsx` | MODIFIED — F-2: Added `Sunrise` import, breakfast bucket filter `[06,10)` + `breakfastRev` computation (lines 129-136), KPI grid-cols-5→6 with Breakfast card (line 218-223). | CR-011 FE-fixes agent (2026-06-17) |
| `pages/reports-module/PaymentsMockup.jsx` | MODIFIED — F-6: Removed Daily Payment Trends stacked bar + Cash vs Digital Trend area chart JSX (~55 lines). Kept `daily` array for breakdown table. `trend` stubbed as `[]`. | CR-011 FE-fixes agent (2026-06-17) |
| `components/layout/Sidebar.jsx` | MODIFIED — F-10: Added `featureGate: "room"` to Room Transfers sidebar item (line 147). Added feature-gate render filter at line 495: `if (child.featureGate && !restaurant?.features?.[child.featureGate]) return null`. | CR-011 FE-fixes agent (2026-06-17) |

### CR-045 Phase A+B — FE Stripper Removal + Dead Code Cleanup (2026-06-17)
| File | Change | Agent |
|---|---|---|
| `api/transforms/orderPayloadStripper.js` | **DELETED** — backend now strips server-side. 119 lines removed. | CR-045 cleanup agent (2026-06-17) |
| `pages/reports-module/ItemSalesMockup.jsx` | **DELETED** — dead code, no route pointed to it (superseded by ItemSalesHybridMockup). | CR-045 cleanup agent (2026-06-17) |
| `api/services/insightsService.js` | MODIFIED — removed `stripOrders` import + 4 call sites. Deleted `getDashboardAggregated` function (474 lines). Removed from default export. | CR-045 cleanup agent (2026-06-17) |
| `api/services/foodCourtService.js` | MODIFIED — removed `stripOrders` import + 1 call site. | CR-045 cleanup agent (2026-06-17) |
| `api/services/roomOrdersService.js` | MODIFIED — removed `stripOrders` import + 1 call site. | CR-045 cleanup agent (2026-06-17) |
| `api/services/prepServeService.js` | MODIFIED — removed `stripOrders` import + 1 call site. | CR-045 cleanup agent (2026-06-17) |
| `api/services/orderLedgerService.js` | MODIFIED — removed `stripOrders` import + 2 call sites. | CR-045 cleanup agent (2026-06-17) |
| `pages/reports-module/CancellationsMockup.jsx` | MODIFIED — removed commented-out stripper import. | CR-045 cleanup agent (2026-06-17) |
| `App.js` | MODIFIED — removed dead `ItemSalesMockup` import. | CR-045 cleanup agent (2026-06-17) |

## Session 2026-06-18 Changes

| File | Change | CR/BUG |
|------|--------|--------|
| `components/order-entry/RePrintButton.jsx` | +1 line: `const { getOrderById } = useOrders()` in RePrintOnlyButton | BUG-137 |
| `api/transforms/orderTransform.js` | `self_discount` + `order_discount` = `(manual+preset)` across 3 payment paths (7 lines) | BUG-138 |
| `api/constants.js` | +`CHANNEL_VISIBILITY` key in `STORAGE_KEYS` | BUG-130 |
| `api/services/authService.js` | +`localStorage.removeItem(STORAGE_KEYS.CHANNEL_VISIBILITY)` in `logout()` | BUG-130 |
| `components/layout/Sidebar.jsx` | +flyout state, click handler, click-outside dismiss, flyout JSX panel (~80 lines). Removed BUG-139 auto-expand. | CR-052 |
| `pages/StatusConfigPage.jsx` | +6 toggle states (CR-051: walkin name/phone, dinein name/phone, takeaway name/phone), hydrate, save, reset, UI section. Sidebar default `false`. | CR-051 + CR-052 |
| `components/order-entry/OrderEntry.jsx` | +6-field validation at 3 sites (handlePlaceOrder, prepaid, QSR). TakeAway Name hardcoded→toggle. | CR-051 |
| 35× `pages/reports-module/*.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |
| `pages/AllOrdersReportPage.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |
| `pages/OrderSummaryPage.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |
| `pages/RoomOrdersReportPage.jsx` | `isSidebarExpanded` default `true`→`false` | CR-052 |

### BUG-167 — App-level socket fix (2026-07-11 session 4)
| File | Change | Agent |
|------|--------|-------|
| `components/AppSocketManager.jsx` | **NEW** — calls `useSocketEvents()`, returns null. Persists across all routes. // BUG-167 fix | BUG FIX agent |
| `App.js` | Import `AppSocketManager` + mount `<AppSocketManager />` inside `<BrowserRouter>` before `<Routes>` | BUG FIX agent |
| `pages/DashboardPage.jsx` | Removed `import { useSocketEvents }` (L20) + removed `const { isConnected: socketConnected } = useSocketEvents()` (L186) | BUG FIX agent |

### BUG-159 + BUG-160 — Category CRUD fixes (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `api/constants.js` | +`CATEGORY: '/api/v2/vendoremployee/expense/category'` constant — BUG-159 + BUG-160 | IMPL agent |
| `api/services/expenseService.js` | +`createEmptyCategory()` (POST /expense/category) — BUG-159 fix | IMPL agent |
| `api/services/expenseService.js` | +`renameExpenseCategory()` (PUT /expense/category/{id}) — BUG-160 fix | IMPL agent |
| `api/services/expenseService.js` | +`deleteExpenseCategory()` (DELETE /expense/category/{id}) — BUG-160 fix | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | `addCategory()`: `createCategoryWithItems(name, [])` → `createEmptyCategory(name)` — BUG-159 | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | `renameCategory()`: removed items filter, `updateCategory` → `renameExpenseCategory` — BUG-160 | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | `deleteCategory()`: removed per-item loop, `deleteExpenseItem` → `deleteExpenseCategory` — BUG-160 | IMPL agent |

### BUG-163 / BUG-VQTY / BUG-ROOM-PAIDROOM — Bug Fix Batch (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `api/services/expenseService.js` | L65: added `{ type: 'all' }` POST body to `exportStockMaster()` — BUG-163 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L703: `variationAmount * (item.qty \|\| 1)` — BUG-VQTY fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1492: `variationAmount * qty` — BUG-VQTY fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1632: `paid_room: table?.isRoom ? 'yes' : ''` — BUG-ROOM-PAIDROOM fix | BUG FIX agent |

### BUG-166 — addon_amount × qty fix (2026-07-12)
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/orderTransform.js` | L704: `addonAmount * (item.qty \|\| 1)` — BUG-166 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1493: `addonAmount * qty` — BUG-166 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L698: `addonQtys.map(q => q * (item.qty \|\| 1))` — BUG-168 fix | BUG FIX agent |
| `api/transforms/orderTransform.js` | L1808-1826: `addonPerUnit` reduce over `item.add_ons[]` + `(price*qty) + (addonPerUnit*qty)` — BUG-168 v2 fix (2026-07-08). Fallback subtotal loop in `buildBillPrintPayload` now includes addons. Replaces prior 2026-07-08 patch that used non-existent `item.total_add_on_price` field. Mirrors `CollectPaymentPanel.getItemLinePrice` L212-224. Curl-verified against live order #002384. | BUG FIX agent |
| `components/order-entry/CartPanel.jsx` | L8-23: getAddonText/hasAddons helpers, L99+L124+L240: addon display × item.qty — BUG-168 display fix | BUG FIX agent |
| `components/order-entry/CollectPaymentPanel.jsx` | L1862+L1877+L2217+L2232: addon display × item.qty — BUG-168 display fix | BUG FIX agent |


### CR-067 — Expense Bulk Editor Redesign (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseBulkEditor.jsx` | Full rewrite ~330 lines — toolbar (Search, + Add Item, Save N Changes, Excel, Import, X close), category-grouped rows, new rows pinned to top with auto-focus, dirty tracking (amber per row), per-row status (saving/✓/✗+tooltip), internal save logic (new=POST, cat-change=DELETE+POST, rename=blocked/OQ-1=B, priced-cat-change=blocked/OQ-2=B), Reset All footer, beforeunload guard // CR-067 | IMPL agent |
| `components/expense/ExpenseSetupPanel.jsx` | Removed handleBulkSave function + bulkSaving state; updated <ExpenseBulkEditor> props to onRefresh+onClose; passes allItems (not filtered) // CR-067 | IMPL agent |

### BUG-175 + BUG-176 — Expense Entry Form fixes (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseEntryPanel.jsx` | BUG-175: removed qty input from Case A; amount = unitPrice directly; removed handleQtyChange. BUG-176: added physical_quantity to EMPTY_LINE; added Case B optional fields block (qty+unit+physical_qty); wired physical_quantity through handleSave + startEdit | IMPL agent |
| `api/services/expenseService.js` | BUG-176: fixed physical_quantity in addExpenseEntry + editExpenseEntry — removed hard-coded 0, now passes user value | IMPL agent |

### CR-059 — Expense Module Phase 1 (2026-07-06)
| File | Change | Agent |
|---|---|---|
| `api/constants.js` | +EXPENSE_ENDPOINTS block (~30 lines) | CR-059 agent |
| `api/services/expenseService.js` | NEW — 20 API wrapper functions (~234 lines) | CR-059 agent |
| `api/transforms/expenseTransform.js` | NEW — fromAPI + toAPI + date helpers. BUG-CR059-A fix: mapped non-standard API keys ('Date & Time', 'EXPENSE', 'Amount', 'Payment Method', 'Category') | CR-059 agent |
| `components/expense/ExpenseEntryPanel.jsx` | NEW — daily expense logging UI. BUG-CR059-B fix: edit row uses ItemCombobox (replaces free-text input that caused 500 errors) | CR-059 agent |
| `components/expense/ExpenseSetupPanel.jsx` | MODIFIED 2026-07-08 — BUG-DND-CR059: handleDragEnd rewritten (DELETE+POST workflow); BUG-P2: GripVertical drag handles removed | CR-059 agent |
| `components/expense/ExpenseBulkEditor.jsx` | NEW — spreadsheet bulk editor for expense items | CR-059 agent |
| `pages/ExpenseEntryPage.jsx` | NEW — route wrapper for /expenses | CR-059 agent |
| `pages/ExpenseSetupPage.jsx` | NEW — route wrapper for /expense-setup | CR-059 agent |
| `components/layout/Sidebar.jsx` | +Expenses menu entry + route | CR-059 agent |
| `App.js` | +/expenses and /expense-setup routes | CR-059 agent |
| `pages/index.js` | +ExpenseEntryPage + ExpenseSetupPage exports | CR-059 agent |

### CR-060 — Table/Room Management CRUD (Gate 3 ready, 2026-07-06)
| File | Change | Agent |
|---|---|---|
| `components/panels/settings/TableManagementView.jsx` | REWRITE — replace mocked CRUD with real API calls. Add Dialog (TB/RM toggle, Number, Area, Waiter). Add bulk edit toggle. Add room support. Real error handling. (~400 lines) | CR-060 agent |
| `components/panels/settings/TableBulkEditor.jsx` | NEW — spreadsheet bulk editor (BulkEditor.jsx pattern simplified, 4 columns). (~350 lines) | CR-060 agent |
| `api/services/tableService.js` | +CRUD functions: getTableConfig, storeTable, deleteTable, getAreaOptions, getWaiterList, exportSample, exportList, importTables (+80 lines additive) | CR-060 agent |
| `api/transforms/tableTransform.js` | +configFromAPI (tableConfigItem, areaOptions, waiterList) + toAPI.storeTable (+60 lines additive) | CR-060 agent |
| `api/constants.js` | +TABLE_CONFIG_ENDPOINTS block (~15 lines additive) | CR-060 agent |
| `components/layout/Sidebar.jsx` | Remove `comingSoon: true` from table-management entry (1 line) | CR-060 agent |

### CR-061 — Expense Report FE (Gate 3 ready, 2026-07-06)
| File | Change | Agent |
|---|---|---|
| `pages/reports-module/ExpenseReportPage.jsx` | NEW — full Insights expense report page. KPIs, recharts (daily bar + category pie + payment split), filterable/sortable table, Excel/PDF export. (~500 lines) | CR-061 agent |
| `api/services/expenseReportService.js` | NEW — fetchExpenseReport, aggregateExpenses (client-side), fetchExpenseCategories, fetchPaymentMethods, exportExpenseReport. (~120 lines) | CR-061 agent |
| `components/layout/Sidebar.jsx` | +Expenses group under Insights section | CR-061 agent |
| `App.js` | +/reports-module/expense-report route + import | CR-061 agent |
| `pages/OrderSummaryPage.jsx` | +Expense Summary Card (Surface B — today's total + payment breakdown + link to report) | CR-061 agent |


### BUG-144 — Token Number Display + Print (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `api/transforms/profileTransform.js` | L364: +`useToken: toBoolean(apiSettings.settings?.use_token)` — gate for token display/print | BUG-144 IMPL agent |
| `api/transforms/orderTransform.js` | L197: +`dailyToken: api.daily_token \|\| null` in `fromAPI.order()` — extract token from all order sources | BUG-144 IMPL agent |
| `api/transforms/orderTransform.js` | L2038: +`daily_token: order.dailyToken \|\| ''` in `buildBillPrintPayload()` — bill print passthrough | BUG-144 IMPL agent |
| `api/services/orderService.js` | L159: +`daily_token: orderData?.dailyToken \|\| ''` in KOT inline payload — KOT print passthrough | BUG-144 IMPL agent |
| `components/cards/OrderCard.jsx` | L97-98: +`dailyToken` + `useToken` extraction. L434: token display inline with orderNumber (`#{orderNumber} · T{dailyToken}`). L437-445: standalone token chip for dineIn/room orders. All gated by `useToken` | BUG-144 IMPL agent |
### BUG-194 + BUG-186 + BUG-195 + BUG-188 — FE Fix Batch (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `pages/reports-module/PaymentsMockup.jsx` | L213+L219+L255: `.data?.` prefix on salesData access — BUG-194 (CR-049 regression) | IMPL agent |
| `components/panels/SettlementPanel.jsx` | L145-149: effectiveExpected for negative balance, L386: removed red border guard, L388: removed over-expected error, L396: Full button uses effectiveExpected, L410: removed over-expected disabled guard — BUG-186 | IMPL agent |
| `components/order-entry/CartPanel.jsx` | L805-819: isNameRequired+isPhoneRequired read localStorage CR-051 toggles — BUG-195. L526: +overflow-hidden, L566: +flex-shrink-0 whitespace-nowrap — BUG-188 | IMPL agent |

### BUG-135-C + BUG-147 — Bulk Editor Error Visibility (2026-07-11)
| File | Change | Agent |
|------|--------|-------|
| `components/panels/menu/BulkEditor.jsx` | L520: hybrid ≤3 inline toast / >3 drawer — BUG-135-C. L508: prefixed item name on _saveError — BUG-147 | IMPL agent |
| `components/order-entry/AddCustomItemModal.jsx` | L78: prefixed item name on inline error — BUG-147 | IMPL agent |
| `components/panels/menu/ProductForm.jsx` | L531: prefixed item name on toast error — BUG-147 | IMPL agent |


### CR-074-B — Expense Setup Design Refresh + CR-064 + BUG-162 + BUG-202 (2026-07-17)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseSetupPanel.jsx` | CR-074-B Phases 1-4: BUG-162 optimistic updates, CR-064 unit-price quick-add (two-call), BUG-202 inline edit via PUT, DnD rewrite (single PUT), bulk-select delete+move+banner. Smoke-fixes SF-1/2/3. ~1100 lines. | IMPL agent |
| `components/expense/ExpenseBulkEditor.jsx` | CR-074-B Phase 5: full redesign — OQ-1/OQ-2 removed, catChanged→PUT, checkbox column, selection banner, bulk delete+move, pre-flight dup check, malformed-404 handler. 454→875 lines. | IMPL agent |
| `api/services/expenseService.js` | +`updateExpenseItem(id, {stock_title, category_id})` wrapper for PUT /expenses/{id}. BUG-202-fwd-compat. | IMPL agent |
| `api/constants.js` | +`STOCK_ITEM_UPDATE` endpoint constant for PUT /expenses. BUG-202-fwd-compat. | IMPL agent |
| `api/transforms/expenseTransform.js` | +`fromAPI.updatedItem(res)` transform for PUT response. BUG-202-fwd-compat. | IMPL agent |
| `pages/ExpenseSetupPage.jsx` | SF-4: removed redundant `marginLeft: 280` (layout fix). 2 lines. | IMPL agent |
| `pages/ExpenseEntryPage.jsx` | SF-4: removed redundant `marginLeft: 280` (layout fix). 2 lines. | IMPL agent |
### BUG-203 + BUG-204 — Inline Edit Price + Expense Entry Qty×Price (2026-07-17)
| File | Change | Agent |
|------|--------|-------|
| `components/expense/ExpenseSetupPanel.jsx` | BUG-203: editItemPrice state, startEditItem/cancelEditItem price init, eager pricedItems load, saveEditItem 2-call price logic, price validation, inline edit price input UI | IMPL agent |
| `components/expense/ExpenseBulkEditor.jsx` | BUG-203: _originalPrice tracking in buildRow, PRICE column header, per-row price input, 2-call save for price changes | IMPL agent |
| `components/expense/ExpenseEntryPanel.jsx` | BUG-204: handleItemSelect clears qty/amount, handlePricedQtyChange live auto-calc, Case A rendering (qty input + breakdown text), amount placeholder, startEdit cross-reference unitPrice | IMPL agent |

## BUG-205 (2026-07-17) — Qty/Unit columns in expense tables
| `components/expense/ExpenseEntryPanel.jsx` | BUG-205: added Qty + Unit `<th>` headers + `<td>` cells (view + edit), updated tfoot colSpan |
| `pages/reports-module/ExpenseReportPage.jsx` | BUG-205: added Qty + Unit to columns config, `<th>` headers, `<td>` cells, updated colSpans |

## BUG-203 Sub-B/C/D (2026-07-17) — Unit price in Bulk Editor + edit row auto-calc
| `components/expense/ExpenseBulkEditor.jsx` | BUG-203 Sub-B: removed _isNew guard on price input, chain addUnitPrice after createCategoryWithItems. Sub-C: accept pricedItems prop, use for edit-vs-add decision in save handler |
| `components/expense/ExpenseSetupPanel.jsx` | BUG-203 Sub-C: pass pricedItems prop to ExpenseBulkEditor |
| `components/expense/ExpenseEntryPanel.jsx` | BUG-203 Sub-D: edit row shows qty input + auto-calc for priced items |

## BUG-198 (2026-07-17) — Employee CRUD fixes + role type wiring
| `api/services/employeeService.js` | BUG-198: POST→PUT for updateEmployee, removed resetEmployeePassword |
| `api/transforms/employeeTransform.js` | BUG-198: status:1 on create, optional password on update, email omit-if-empty |
| `components/panels/employee/EmployeeListView.jsx` | BUG-198: removed ResetPasswordDialog, inline password + Eye/EyeOff toggle |
| `api/services/roleService.js` | BUG-198: POST→PUT for updateRole |
| `api/axios.js` | BUG-198 + BUG-197: X-localization: en header |
| `components/panels/employee/RoleFormView.jsx` | BUG-198: role_type dropdown wired (onChange + value) |
| `components/panels/employee/ResetPasswordDialog.jsx` | BUG-198: DELETED — no longer needed |

## BUG-197 Addendum A2-A7 (2026-07-17) — Recipe transform field renames
| `api/transforms/recipeTransform.js` | BUG-197-A2/A3: recipe_qty/recipe_unit for standard recipe store/update. BUG-197-A4/A5: sub_recipe_name, subunit, prepration_time, thershold_qty/unit for sub-recipe. BUG-197-A6/A7: recipe_qty/recipe_unit + preparation_time/serves_people/serve_time for addon recipe. |

## Employee Edit UX Fixes (2026-07-17)
| `components/panels/employee/EmployeeListView.jsx` | Fix 1: backend error parsing (L117-126), Fix 2: password hint placeholders (L237,L301), Fix 3a/3b: role dropdown uses all roles (L250,L255,L317,L322), Fix 5: Email (User ID) header (L205) |
| `api/transforms/employeeTransform.js` | Fix 4: always send email field on create+update (L39,L51) |
