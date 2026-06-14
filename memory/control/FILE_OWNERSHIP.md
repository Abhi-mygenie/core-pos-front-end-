# Layer 7 — File Ownership Map

**Status:** POPULATED
**Last Updated:** 2026-06-13 (CLOSURE agent gap audit backfill — added ~30 files from June 10-13 sessions)

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
| `orderPayloadStripper.js` | 7 service files that import it |
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
| `insightsService.js` | Insights batch (2026-06-11) + BUG-133 + CR-045 + CR-044 (2026-06-13) | MEDIUM |
