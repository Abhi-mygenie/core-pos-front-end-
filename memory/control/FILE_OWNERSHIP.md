# Layer 7 — File Ownership Map

**Status:** POPULATED
**Last Updated:** 2026-05-29

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
| `components/order-entry/OrderEntry.jsx` | 2493 | Transactional workflow, customer modal, CRM intel | CRM 2.0 agent (2026-05-27) |
| `components/order-entry/CollectPaymentPanel.jsx` | 3050 | Final settlement, payment status, financial logic | POS 3.0 era |
| `components/modals/RoomCheckInModal.jsx` | 1362 | Room workflow, advance payment | POS 3.0 era |
| `pages/StatusConfigPage.jsx` | 1561 | Visibility settings, QSR toggles, auto-settle | BUG-099 agent (2026-05-19) |
| `api/transforms/orderTransform.js` | 1916 | Financial payload builders, rider fields | BUG-097 agent (2026-05-21) |
| `api/services/reportService.js` | 744 | Report presentation (reduced from 1257) | Audit Report agent (2026-05-28) |
| `api/socket/socketHandlers.js` | 839 | Realtime event handling, scan-new-order | POS 3.0 agent (2026-05-19) |
| `api/socket/useSocketEvents.js` | 248 | Socket subscriptions | POS 3.0 era |
| `pages/LoadingPage.jsx` | 845 | Bootstrap sequencing | Phase 3 candidate (unchanged) |

---

## Recently Modified Files

### POS 3.1 (2026-05-27)
| File | Change | Agent |
|---|---|---|
| `components/order-entry/CartPanel.jsx` | QSR validation, prepaid lock, server-driven breakdown | POS 3.1 agent |
| `components/order-entry/OrderEntry.jsx` | +1 `placedOrderData` prop to CartPanel | POS 3.1 agent |

### CRM 2.0 (2026-05-26/27)
| File | Change | Agent |
|---|---|---|
| `utils/relativeTime.js` | NEW — time formatting | CRM 2.0 agent |
| `api/services/customerIntelService.js` | NEW — CRM intel API | CRM 2.0 agent |
| `api/transforms/customerIntelTransform.js` | NEW — response transform | CRM 2.0 agent |
| `hooks/useCustomerIntel.js` | NEW — data hook | CRM 2.0 agent |
| `api/constants.js` | +1 line | CRM 2.0 agent |
| `components/order-entry/OrderEntry.jsx` | Hook + modal prop wires + hotfix | CRM 2.0 agent |
| `components/order-entry/CustomerModal.jsx` | Profile banner, favourites, suggestions | CRM 2.0 agent |
| `components/order-entry/ItemNotesModal.jsx` | Customer intel integration | CRM 2.0 agent |
| `components/order-entry/OrderNotesModal.jsx` | Customer intel integration | CRM 2.0 agent |

### Audit Report CR (2026-05-28)
| File | Change | Agent |
|---|---|---|
| `api/transforms/reportTransform.js` | +400 lines new transform | Audit Report agent |
| `api/services/reportService.js` | -513 lines inline transform removed | Audit Report agent |
| `components/reports/OrderDetailSheet.jsx` | Dual-mode, bill summary, timeline | Audit Report agent |
| `components/reports/FilterBar.jsx` | PayType dropdown, Paid→Settled | Audit Report agent |
| `components/reports/FilterTags.jsx` | PayType tag support | Audit Report agent |
| `pages/AllOrdersReportPage.jsx` | PayType filter, Paid→Settled tab | Audit Report agent |

### Production Hotfixes (2026-05-27 + 2026-05-29)
| File | Change | Agent |
|---|---|---|
| `pages/DashboardPage.jsx` | +2 lines: cart clear on stay-on-order walk-in | PROD-HOTFIX-004 |
| `pages/DashboardPage.jsx` | +5 lines: prepaid screen clear delay fix | PROD-HOTFIX-005 |
| `api/services/orderService.js` | +2 lines: custName/custPhone in KOT payload | PROD-HOTFIX-008 (2026-05-29) |
| `api/transforms/loyaltyTransform.js` | +3 lines: projected earn fields from CRM | PROD-HOTFIX-007 (2026-05-29) |
| `components/order-entry/CollectPaymentPanel.jsx` | +5 lines: "You'll earn X pts" display | PROD-HOTFIX-007 (2026-05-29) |

### Dev Tooling (2026-05-29) — ISOLATED, NO src/ TOUCHED

### CR-014 Phase 2 — Bulk Editor (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `components/panels/menu/BulkEditor.jsx` | NEW — Production bulk editor (650 lines), 33 editable columns, 4-tier picker, category grouping, batch save | CR-014 P2 agent |
| `components/panels/MenuManagementPanel.jsx` | +Bulk Edit toggle button, BulkEditor import + rendering | CR-014 P2 agent |

### CR-015 — Settlement Module (2026-06-08)
| File | Change | Agent |
|---|---|---|
| `components/panels/SettlementPanel.jsx` | NEW — Settlement slide-over panel (487 lines), 5 KPIs, waiter table, 3 modals | CR-015 agent |
| `api/services/settlementService.js` | NEW — 5 API functions (report, waiter-list, opening-balance, settlement, self-settlement) | CR-015 agent |
| `api/transforms/settlementTransform.js` | NEW — fromAPI (report, waiter list) + toAPI (opening, settle) + date helpers | CR-015 agent |
| `pages/DashboardPage.jsx` | +SettlementPanel import, isSettlementOpen state, onOpenSettlement handler | CR-015 agent |
| `components/layout/Sidebar.jsx` | +Settlement entry in sidebarMenuItems, Banknote import, onOpenSettlement prop, VISIBLE_SECTIONS | CR-015 agent |
| `App.js` | +settlement/preview route (mockup) | CR-015 agent |
| `pages/SettlementPage.jsx` | NEW — Standalone page (kept but route removed; superseded by panel) | CR-015 agent |
| `pages/SettlementMockup.jsx` | NEW — UI mockup (preview route kept) | CR-015 agent |

### Dev Tooling (2026-05-29) — ISOLATED, NO src/ TOUCHED
| File | Change | Agent |
|---|---|---|
| `public/__dev/index.html` | NEW — dashboard entry (CDN-loaded React+Tailwind+Babel) | dev-dashboard agent |
| `public/__dev/dashboard.js` | NEW — single-file React dashboard | dev-dashboard agent |
| `public/__dev/styles.css` | NEW — minimal custom CSS | dev-dashboard agent |
| `public/__dev/data/*.json` | NEW — closure_debt / bug_tracker / cr_registry / config snapshots | dev-dashboard agent |
| `public/__dev/README.md` | NEW — usage notes | dev-dashboard agent |
| `/app/scripts/gen_dev_dashboard_config.js` | NEW — standalone env-gate helper (not wired into build) | dev-dashboard agent |

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

---

## Cross-Sprint Conflict Zones

| File | Touched By | Risk |
|---|---|---|
| `OrderEntry.jsx` | POS 3.1 + CRM 2.0 (both 2026-05-27) | HIGH — both modified same file in same week |
| `CartPanel.jsx` | POS 3.1 (2026-05-27) + BUG-099 QSR (2026-05-19) | MEDIUM — QSR billing + QSR validation parity |
| `DashboardPage.jsx` | PROD-HOTFIX-004/005 (2026-05-27) | LOW — isolated fixes |
| `reportService.js` | Audit Report CR (2026-05-28) | LOW — major rewrite, clean state now |
