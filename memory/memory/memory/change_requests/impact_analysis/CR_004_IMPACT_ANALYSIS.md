# CR-004 Impact Analysis: Room Orders Report — PMS-Style View (Phase 1: Read-Only)

## Status
- impact_approved_for_planning

## Revision Note
- Rev 1 (created): impact_draft → impact_needs_info with 8 clarification questions.
- Rev 2: user answered all 8 questions on 2026-04-28; status moved to impact_ready_for_approval. Two follow-up notes flagged for the Planning Agent (see Q-1 recheck-flag and Q-2 lazy-load tension).
- Rev 3 (current): 2026-04-28 — User explicitly approved ("approve all"). Status promoted from `impact_ready_for_approval` → `impact_approved_for_planning`. Document is handed off to the Change Request Implementation Planning Agent.

## Source CR
- CR ID: CR-004
- CR Title: Room Orders Report — PMS-Style View (Phase 1: Read-Only)
- CR Doc Path: /app/memory/change_requests/CR_004_room_orders_pms_view.md
- CR Status: cr_approved_for_planning (frozen 2026-04-28, "approved / freeze all")

## Impact Analysis Summary
CR-004 is an **additive, frontend-only, read-only** new view in the Reports / Audit / Summary module. It introduces a new route `/reports/rooms`, a new sidebar entry under Order Reports, and a new page that reuses two existing endpoints (`order-logs-report` and `get-single-order-new`). No new backend, no new socket, no new admin/setting, no print/billing/payment changes, no env changes. Phase 1 surfaces the already-delivered `room_info` (rent / advance / balance) and `associated_order_list[]` payloads through a PMS-style room-grouped UI.

The change is **low-to-medium risk** if CR-001 lands first/together (so audit double-count is avoided). The principal *unconfirmed* implementation point is **which transform feeds the row-expand call** (the report-side `singleOrderNew` transform does NOT extract `room_info` / `associated_orders`; the order-side `orderTransform.fromAPI.order` DOES). Several edge cases — SRM-only rooms, rent display for missing-RM-parent groups, room-number sourcing — also need explicit decisions before planning.

## Requirement Understanding
Approved CR (verbatim summary, no semantic change):
- Add a new route `/reports/rooms` and a sidebar entry "Room Orders" under Order Reports.
- The page lists rooms (one row per RM-parent `order_id`; SRM-only rooms grouped by `parent_order_id`) for the selected business day.
- Each collapsed row shows: room number, guest name, check-in time, count of associated orders, total food amount, paid/unpaid badge, and a warning badge when `room_info` is missing on the RM parent.
- Expanding a row lazy-loads detail via `get-single-order-new` and shows rent, advance, balance, plus associated orders (RM-native + SRM-shifted) using a generic "Associated order" label.
- Filters Phase 1: date picker (existing business-day logic) + status filter In-house / All. No Channel / Platform / Payment filters.
- Top-right summary bar: N Rooms, Total Rent, Total Food, Total Outstanding.
- CSV export (flat: one row per associated order, with room-id column) and PDF export (visible room list summary).
- Permissions = same as Audit Report (Owner / Admin / Cashier).
- Out of scope (Phase 1): print folio, add interim payment, checkout & settle, in-house list with no activity, history filter, real-time socket updates, Channel/Platform/Payment filters.

## Confirmed Scope From CR
- New route, new sidebar entry, new page (`RoomOrdersReportPage.jsx`), new components (`RoomRowCard.jsx`, optionally `RoomOrdersTable.jsx` or reuse `OrderTable.jsx`).
- Data strategy "Option L1": reuse `ORDER_LOGS_REPORT` for the day list; reuse `get-single-order-new` for per-room detail.
- RM-parent or SRM-grouping logic for one row per room.
- Lazy-load on row-expand with per-session caching.
- Visible "Room billing not set up" warning when `room_info` missing.
- Read-only Phase 1.
- No new backend endpoint, no new socket subscription, no new admin/setting, no printing/billing/payment changes.

## Out of Scope From CR
- Print folio, add interim payment, checkout & settle.
- List of in-house rooms with no activity in the day.
- History / checked-out filter.
- Real-time socket updates.
- Channel / Platform / Payment filters.
- Hotel-stay-based business-day boundary (deferred to Phase 2 per OQ-R2 answer).

## Codebase Review Summary
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: CR-28-april (confirmed)
- Pull status: Already up to date (commit `a01625d`)
- Build/compile performed: No
- Source files inspected (read-only):
  - `/app/frontend/src/App.js`
  - `/app/frontend/src/components/layout/Sidebar.jsx`
  - `/app/frontend/src/api/services/reportService.js`
  - `/app/frontend/src/api/services/roomService.js`
  - `/app/frontend/src/api/constants.js`
  - `/app/frontend/src/api/transforms/orderTransform.js`
  - `/app/frontend/src/api/transforms/reportTransform.js`
  - `/app/frontend/src/pages/AllOrdersReportPage.jsx` (header/structure only)
  - `/app/frontend/src/utils/businessDay.js` (presence confirmed)
  - Final docs in `/app/memory/final/` (all 6)
  - Sibling CRs CR-001 / CR-003 (status check only)

## Final Docs Reviewed
- /app/memory/final/CHANGE_REQUEST_PLAYBOOK.md
- /app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md
- /app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md
- /app/memory/final/MODULE_DECISIONS_FINAL.md
- /app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md
- /app/memory/final/IMPLEMENTATION_AGENT_RULES.md

## Affected Modules / Areas
| Area | Impact Level | Notes |
| --- | --- | --- |
| Reports / Audit / Summary Module (#10) | High | Primary module — new routed page added under this module. |
| Rooms / Room Check-In Module (#5) | Low | Indirect — only consumes existing `room_info` / `associated_order_list[]`. No write paths touched. `roomService.js` is referenced only to confirm no `list/report` helper exists; CR adds no helper there. |
| Authentication & Session Module (#1) | Low | `ProtectedRoute` will wrap the new route — pattern reuse only. |
| Visibility Settings / Device Configuration (#11) | None | Confirmed by CR. |
| Realtime Socket Module (#7) | None | No socket subscription added in Phase 1. |
| Printing / Bill / KOT (#14) | None | Phase 1 is read-only; folio print is Phase 3. |
| Order Entry / Cart / Payment (#4) | None | Confirmed by CR. |
| Notifications & Firebase (#8) | None | Not touched. |

## Affected Screens / Components
| Screen / Component | File Path | Impact | Notes |
| --- | --- | --- | --- |
| New page (does not exist) | `/app/frontend/src/pages/RoomOrdersReportPage.jsx` | High | NEW — created by implementation agent. |
| New row component | `/app/frontend/src/components/reports/RoomRowCard.jsx` | High | NEW — collapsed + expanded room row. |
| Reports table for child orders | `/app/frontend/src/components/reports/RoomOrdersTable.jsx` (NEW) or reuse `OrderTable.jsx` | Medium | CR allows either; if `OrderTable.jsx` is reused, verify column shape compatibility. |
| App route shell | `/app/frontend/src/App.js` | Medium | Add `<Route path="/reports/rooms" .../>` inside existing Routes block. Provider order, ErrorBoundary, AppTitleSync untouched (FA-01, FA-02). |
| Sidebar navigation | `/app/frontend/src/components/layout/Sidebar.jsx` | Medium | Add child `{ id: "rooms", label: "Room Orders", path: "/reports/rooms" }` to the `reports` group (line 53–59). **Critical:** also extend `handleChildClick` (line 207–217) so `child.id === 'rooms'` routes to the path instead of falling through to the "coming soon" toast. Permission key inherited (`report`). |
| Reports filter / date picker | `/app/frontend/src/components/reports/DatePicker.jsx`, `FilterBar.jsx`, `FilterTags.jsx`, `ExportButtons.jsx` | Low | Reuse-only — Phase 1 scope is date picker + In-house/All status filter; no FilterBar changes mandatory. |
| `AllOrdersReportPage.jsx` | `/app/frontend/src/pages/AllOrdersReportPage.jsx` | Low (regression-only) | NOT directly modified by CR-004. Today this page already has a `transferred` tab and explicit `if (o.orderIn === 'RM') return false;` exclusion in the `paid` filter. After CR-001 strips RM/SRM here, CR-004 surfaces them in the new view. Cross-check needed during planning to ensure CR-004's expectation of CR-001's behavior matches. |

## Affected APIs
| API / Function | File Path | Impact | Backend Change Needed? | Notes |
| --- | --- | --- | --- | --- |
| `getOrderLogsReport(date, schedules, sortBy)` | `/app/frontend/src/api/services/reportService.js` (line 389–491) | Medium | No | Reused for the day-level list. Already returns `orderIn`, `roomId`, `paymentStatus`, `tableId`, `tableName`, `_raw` (dev-only). No payload/contract change. |
| `getSingleOrderNew(orderId)` | `/app/frontend/src/api/services/reportService.js` (line 248–253) | Medium / **needs decision** | No | Today returns `reportFromAPI.singleOrderNew(response.data)` — a transform that **DOES NOT** extract `room_info` or `associated_order_list[]` (verified in `reportTransform.js:436–621`). CR claims the "existing function" delivers room financials + associated orders, which is true at the **endpoint** level but NOT at the report-side transform level. See Q-1. |
| `POST /api/v2/vendoremployee/order-logs-report` | API | Low | No | Endpoint reused as-is. |
| `POST /api/v2/vendoremployee/get-single-order-new` | API | Low | No | Endpoint reused as-is. Engage-lock and caching semantics inherited from existing audit-report side-sheet usage. |
| `roomService.checkIn()` | `/app/frontend/src/api/services/roomService.js` | None | No | Only present in repo; not invoked by this CR. R-2 confirmed — no change. |
| `paymentService.collectPayment()` | `/app/frontend/src/api/services/paymentService.js` | None | No | Stale per API-03; CR-004 must not introduce any reuse of it. |

## Affected Socket Events
| Socket Event | Current Usage | Impact | Backend Change Needed? | Notes |
| --- | --- | --- | --- | --- |
| `new_order` / `order-engage` / order updates | `useSocketEvents.js`, `socketHandlers.js` | None (Phase 1) | No | CR-004 explicitly defers live updates to Phase 2. The Room Orders page will reflect live state only on date refresh / manual refresh. |

## Affected State / Context / Store Logic
| State Area | File Path | Impact | Notes |
| --- | --- | --- | --- |
| Page-local state | `RoomOrdersReportPage.jsx` (new) | High | All orchestration state lives in the new page (per SM-02). No new global context. |
| `RestaurantContext` (`schedules`) | `/app/frontend/src/contexts/RestaurantContext.*` | Read-only | Page consumes `restaurant.schedules` for `getBusinessDayRange` (same pattern as `AllOrdersReportPage.jsx:73`). |
| `OrderContext` / `TableContext` | `/app/frontend/src/contexts/*` | None | Phase 1 has no live runtime touch. |
| `localStorage` keys | n/a | None | No new key. SM-03 / SM-04 untouched. |
| Per-session expand cache | page-local | New (low risk) | Map keyed by RM-parent `order_id` storing fetched detail. Cleared on date change / page unmount. |

## Data / Payload Impact
| Field / Payload Area | Current Behavior | Required Change / Impact | Notes |
| --- | --- | --- | --- |
| `order_in` (`'RM'` / `'SRM'` / null) | Already populated in `ORDER_LOGS_REPORT` and surfaced by `getOrderLogsReport` (`location.orderIn`). | Page filters orders where `orderIn === 'RM'` (canonical room parent) and groups SRM by `parent_order_id`. | Verified in `reportTransform.js:107–141` and `reportService.js:411–426`. |
| `parent_order_id` | Comment in `reportTransform.js:111` and `reportService.js:411` says "Room ID when `order_in === 'SRM'`". | A-3 in CR claims `parent_order_id` is a room identifier. **The code currently treats it as a room id for display (`→ R{roomId}`).** | Validated. |
| `table_no` on RM order | Returned by `ORDER_LOGS_REPORT` and surfaced as `tableName` in the page transform. | Page must display `tableName` as the room number on RM-parent rows. **Today the report transform sets `locationDisplay = 'Room'` (not the number) for `orderIn === 'RM'` (`reportService.js:415`).** Page must read `tableName` directly (already returned in `location.tableName`) rather than `location.display`. | Implementation detail — flag for planning. Not a data-shape change. |
| `room_info` (`room_price`, `advance_payment`, `balance_payment`) | Extracted into `roomInfo` by `orderTransform.fromAPI.order` (lines 281–285). NOT extracted by `reportFromAPI.singleOrderNew`. | Row-expand must obtain these fields via a transform path that preserves them. See Q-1. | **Critical mismatch with CR's "existing function" claim.** |
| `associated_order_list[]` | Extracted into `associatedOrders[]` by `orderTransform.fromAPI.order` (lines 256–270, with `_raw`). NOT extracted by `reportFromAPI.singleOrderNew`. | Same as above. | Same. |
| `room_info` missing flag | No existing flag — CR-006 introduces a UI-only "Room billing not set up" badge derived from `roomInfo === null`. | Page-local — derived, not stored. | Confirms read-only. |
| Payment status badge | `o.paymentStatus` already on day list. | Used to compute paid/unpaid mix on row. | Verified. |

## Admin / Settings Impact
- Impact: No
- Existing setting involved: None
- New setting likely required: None
- Notes: CR confirms no admin/settings change in Phase 1. SettingsContext, StatusConfigPage, localStorage configuration keys — all untouched.

## Order Type / Channel Impact
| Order Type / Channel | Impact | Notes |
| --- | --- | --- |
| Dine-in | No | Unaffected, except: dine-in orders that have been *shifted* into a room (SRM) appear inside the new view's expanded row as "Associated order". |
| Takeaway | No | Same — only relevant if a TA order is shifted into a room (SRM); appears as Associated order. |
| Delivery | No | Same. |
| Room | Yes | RM (native room-service) and SRM (shifted-to-room) are the *primary* scope. |
| Scan & Order | Not confirmed | CR is silent. If Scan&Order produces SRM via `parent_order_id` it would appear as Associated order; if it produces standalone non-room orders, no impact. **Flag — Q-7.** |
| Other | No | Out of scope per CR-004 § Out of scope. |

## Printing / KOT / Bill Impact
- Impact: No
- Files/flows affected: None in Phase 1.
- Notes: `buildBillPrintPayload` (`orderTransform.js:1025`) already handles `roomInfo` for room-bill print. CR-004 Phase 1 does NOT call print at all. OD-02 (OQ-12) deferral preserved — no room billing/print policy change required for this CR. Folio print is Phase 3.

## Reporting / Analytics Impact
- Impact: Yes (additive; presentation-layer only)
- Files/flows affected: `reportService.js` (read-only reuse), new page logic.
- Notes:
  - The CR is fully aligned with **MC-06** ("Backend APIs own report aggregation; frontend reporting work should remain representation/presentation"). All grouping is purely *presentation* on the same payload backend already returns.
  - CR-004 has an **inter-CR dependency** on CR-001 to remove RM/SRM from the Audit Report; without CR-001, the same orders would appear in BOTH Audit Report and Room Orders Report (double counting visually, not a math change because each tab still computes its own totals).
  - `getDailySalesReport`, `paid-order-list`, `cancel-order-list`, `paid-in-tab-order-list`, `paid-paylater-order-list`, aggregator endpoint — none touched.

## Backward Compatibility Impact
- Existing `/reports/audit`, `/reports/summary`, `/dashboard`, `/visibility/status-config` routes: unchanged.
- Existing audit tabs (`paid`, `cancelled`, `credit`, `hold`, `merged`, `unpaid`, `transferred`, `aggregator`, `audit`): unchanged inside the audit page itself. Their *behavior* depends on CR-001's RM/SRM removal — independent CR.
- Existing `paymentService.collectPayment()` stale path: unchanged (must remain unused by this CR).
- Sidebar: existing entries `audit`, `summary`, `report-x`, `report-y`, `report-z` unchanged; only a new child added.
- Existing restaurants without any room orders for the selected day: page renders an empty state (CS-7 implies status = "In-house" yields empty when no RM/SRM activity exists). No regression.
- LocalStorage keys: untouched (SM-03).
- `roomService.checkIn()`, `RoomCheckInModal.jsx`: untouched (R-2). Dashboard room cards / room-card totals: untouched.

## Existing Reusable Logic
| Existing Logic | File Path | How It May Help |
| --- | --- | --- |
| `getOrderLogsReport` | `/app/frontend/src/api/services/reportService.js:389` | Day-level fetch with business-day filtering already done. |
| `getSingleOrderNew` (endpoint call only) | `/app/frontend/src/api/services/reportService.js:248` | Endpoint reuse. **Transform must be revisited — see Q-1.** |
| `orderTransform.fromAPI.order` | `/app/frontend/src/api/transforms/orderTransform.js:130–290` | Already extracts `roomInfo` and `associatedOrders` from `room_info` / `associated_order_list`. Direct candidate for the row-expand transform. |
| `extractLocation` | `/app/frontend/src/api/transforms/reportTransform.js:107–141` | Existing RM/SRM/parent_order_id logic; reuse for grouping decisions. |
| `getBusinessDayRange`, `isWithinBusinessDay` | `/app/frontend/src/utils/businessDay.js` | Existing business-day logic — directly reused (consistent with OQ-R2 Phase-1 answer). |
| `DatePicker`, `FilterBar`, `FilterTags`, `ExportButtons`, `OrderTable`, `OrderDetailSheet` | `/app/frontend/src/components/reports/*` | Reusable UI primitives matching the audit page convention. |
| Sidebar permission gate `hasPermission('report')` | `/app/frontend/src/components/layout/Sidebar.jsx:21` | Inherited automatically since "Room Orders" is a child of the `reports` group. |
| `ProtectedRoute` | `/app/frontend/src/components/guards` | Standard wrapper; same pattern as other report routes. |

## Likely Files For Future Implementation
*(For the Implementation Planning Agent — not a plan, just files most likely to be touched.)*

| File Path | Reason It May Be Touched | Confidence |
| --- | --- | --- |
| `/app/frontend/src/pages/RoomOrdersReportPage.jsx` | NEW page. | High |
| `/app/frontend/src/components/reports/RoomRowCard.jsx` | NEW component. | High |
| `/app/frontend/src/components/reports/RoomOrdersTable.jsx` | NEW component (or reuse `OrderTable.jsx`). | Medium |
| `/app/frontend/src/App.js` | Add new route. | High |
| `/app/frontend/src/components/layout/Sidebar.jsx` | Add child entry + extend `handleChildClick` whitelist. | High |
| `/app/frontend/src/api/services/reportService.js` | Optional helper `getRoomGroupedOrders(date, schedules)` and/or a new room-aware fetcher that calls `get-single-order-new` and runs it through `orderTransform.fromAPI.order`. **Hotspot file (FA-03)** — keep additions minimal and isolated. | Medium |
| `/app/frontend/src/api/transforms/reportTransform.js` | Possibly extend `singleOrderNew` to pass through `roomInfo` / `associatedOrders` (one of the options for Q-1). | Medium |
| `/app/frontend/src/pages/index.js` (if barrel export exists) | Export new page if pages are barrel-exported. | Low |
| `/app/frontend/src/utils/businessDay.js` | NOT modified in Phase 1 (OQ-R2 Phase-2 deferral). | Low |

## Risks
| Risk | Severity | Notes / Mitigation Needed |
| --- | --- | --- |
| **R-A (Q-1 transform mismatch)** — `reportFromAPI.singleOrderNew` does not surface `room_info` / `associated_orders`. If implementer assumes the existing service call returns them, the row-expand will break. | High | **Resolve before planning.** See Q-1. Recommended path: call the endpoint with `orderTransform.fromAPI.order` as the transform, or extend `reportFromAPI.singleOrderNew`. |
| **R-B** — CR-004 depends on CR-001 to remove RM/SRM from Audit Report (CR's R-3, D-1, A-4). If CR-004 ships first, the same orders appear in both views. | Medium | Plan both CRs in tandem; impact-analyze CR-001 next so planning agent can sequence. |
| **R-C** — `reportService.js` is on the architecture hotspot list (FA-03). Adding too much grouping logic here would expand the hotspot. | Medium | Keep new helpers minimal; favor putting grouping inside the new page. |
| **R-D** — N+1 fetch pattern on row expand (CR R-1). | Low | Acceptable for typical room counts; cache per session; user already accepted in CS-5. |
| **R-E** — RM-orders display name source (`tableName` vs `display`). Today `extractLocation` returns the literal string `'Room'` for RM, not the room number. Page must NOT use `location.display`; must use `location.tableName`. | Low | Implementation note. Not a contract change. |
| **R-F** — CSV / PDF export reuse vs new export utilities. CR specifies CSV "flat list" + PDF "summary"; existing `ExportButtons.jsx` may need extension. | Low-Medium | Implementation planning detail. |
| **R-G** — Inadvertent regression on Audit Report drill-down side-sheet, which uses the same `get-single-order-new` endpoint with `reportFromAPI.singleOrderNew` transform. | Low | If Q-1 chooses to extend `reportFromAPI.singleOrderNew`, must verify side-sheet isn't broken by the new fields (additive should be safe). |
| **R-H** — OQ-R5 generic "Associated order" label might conflict with future Q-12 (room billing/print lifecycle) discussions if Phase 2 surfaces source per child. | Low | Phase 1 only; OQ-R5 is owner-confirmed. |
| **R-I (OD-02 / OQ-12)** — Room billing/print lifecycle ownership is **NOT_ANSWERED** (still deferred). | Low for Phase 1 (read-only), Critical for Phase 3 | CR explicitly confirms no Phase 1 billing/print change. Phase 2/3 cannot proceed without OD-02 resolution. |
| **R-J** — `AllOrdersReportPage.jsx` already references RM/SRM via the `transferred` tab and an inline RM exclusion in the `paid` filter. Any CR-001 change there must be cross-checked against CR-004's grouping assumptions to avoid divergence. | Low-Medium | Sequencing concern; surface in planning. |
| **R-K** — CR-002 (`unify_status_and_tab_logic`) is `cr_draft` and may, when finalized, change tab-status mapping in Reports. | Low | CR-004 has no tab-status logic in its own page (Phase 1 has only In-house/All), so likely independent. Flag for awareness. |

## Dependencies
| Dependency | Owner | Required Before Planning? | Notes |
| --- | --- | --- | --- |
| CR-001 (Audit Report removes RM/SRM) | Frontend / Same agent track | Yes (sequencing) | Must merge before or with CR-004 to avoid double display. CR-001 status: `cr_approved_for_planning`. |
| Q-1 (transform decision for row-expand) | User / Tech | Yes | Blocks implementation plan. |
| Q-2 (collapsed-row "Total Food" source) | User / Product | Yes | Blocks implementation plan. |
| Q-3 (SRM-only group financials) | User / Product | Yes | Blocks implementation plan / edge case. |
| Q-4 (CSV/PDF export utility scope) | User / Product | No (planning-time) | Resolvable in planning, but worth user steer here. |
| Q-5 (sidebar permission key) | User | No | Defaulting to `report` is consistent with CR §CS-10. |
| Q-6 (room number sourcing for RM rows) | User / Tech | No | Implementation detail; default is `location.tableName`. |
| Q-7 (Scan & Order channel inclusion) | Product | No | Default: behaves like SRM if `parent_order_id` is set; else out of scope. |
| OD-02 / OQ-12 (Room billing/print lifecycle) | Product / API / Business | No for Phase 1 | Must be resolved before Phase 2/3. CR confirms Phase 1 read-only. |
| OD-01 / OQ-07 (Reporting ownership wording) | Tech / API / Business | No | CR is presentation-only; aligned with backend-aggregation rule. |
| Final docs reading order | All future agents | Already followed | All 6 final docs read in this analysis. |
| Repo branch `CR-28-april` | Code | Already pulled | Confirmed. |

## Clarification Questions
| Question | Why It Matters | Status | User Answer |
| --- | --- | --- | --- |
| **Q-1: Transform path for row-expand.** The CR says reuse `reportService.getSingleOrderNew(roomParentOrderId)`. However the existing `reportFromAPI.singleOrderNew` transform (`reportTransform.js:436–621`) does **NOT** extract `room_info` or `associated_order_list[]`; only `orderTransform.fromAPI.order` does (`orderTransform.js:256–285`). Which path do you want?<br>(a) Reuse `getSingleOrderNew` and **extend** `reportFromAPI.singleOrderNew` to pass through `roomInfo` + `associatedOrders` (additive, low risk to audit-report side-sheet).<br>(b) Add a NEW service function (e.g. `getSingleOrderRoom(orderId)`) that calls the same endpoint but transforms via `orderTransform.fromAPI.order`.<br>(c) Reuse `getSingleOrderNew` AS-IS and write a small page-side adapter that re-fetches the raw response (would require returning `_raw` from the existing transform). | Without a decision the implementation agent will have to either silently extend a hotspot transform or duplicate fetch logic. This determines which file gets touched and what regression surface to test. | Answered (with re-check flag) | **(a)** — extend `reportFromAPI.singleOrderNew` to additively pass through `roomInfo` + `associatedOrders`. **User flagged this for the next (Planning) agent to RE-VERIFY** before locking the implementation file plan. |
| **Q-2: Collapsed-row "Total food amount" source.** The day-list (`order-logs-report`) returns one row per order; the *collapsed* room row needs a sum of "associated order amounts". Options:<br>(a) Sum `o.amount` across the orders that group into the room (cheap; no extra calls; uses the day-list rows themselves).<br>(b) Eagerly fetch detail for each row to use `associatedOrders[]` totals (defeats lazy-load).<br>(c) Show only the count in the collapsed row, defer total to expanded view. | Determines whether collapsed-row totals can be computed without N+1 calls. CR is ambiguous. | Answered (with lazy-load tension flagged) | **Show three totals in the collapsed row:**<br>1. Total **room amount pending** (i.e., `roomInfo.balancePayment` — room rent balance outstanding).<br>2. Total of **associated orders** (sum of `associated_order_list[]` amounts).<br>3. Total of the **room order** itself (the RM-parent order amount).<br>**FOLLOW-UP NOTE FOR PLANNING AGENT:** values #1 and #2 live on `room_info` / `associated_order_list[]`, which are returned by `get-single-order-new` (per-room detail), NOT by `order-logs-report` (day list). This **conflicts with CR §CS-5** ("Do NOT prefetch per-room detail on page load"). The Planning Agent must reconcile: either (i) eagerly fetch detail for every room on page load (and update CS-5), (ii) initially render rows with placeholders/spinners for #1/#2 and lazy-load on first render, or (iii) ask the user to relax CS-5. |
| **Q-3: SRM-only rooms (no RM parent).** When a room is materialized only via SRM `parent_order_id` grouping (no RM parent order exists), the row needs rent/advance/balance — but `room_info` lives on the RM parent. Options:<br>(a) Show "Room billing not set up" warning badge on every SRM-only group (no rent/advance shown).<br>(b) Attempt `get-single-order-new` on the SRM `parent_order_id` and use whatever `room_info` it returns (may return nothing or a different order).<br>(c) Skip rent/advance display entirely for SRM-only groups; show only "Associated order count + total". | EC-1 / V4 in CR are user-confirmed at the *grouping* level but the *financial-display* behavior for these groups is not specified. | Answered | **(c)** — skip rent/advance entirely for SRM-only groups. Collapsed/expanded rows for SRM-only groups show associated-order count + total only (no rent / advance / balance / "billing not set up" badge). |
| **Q-4: Export coverage.** CR-004 §CS-9 specifies CSV (flat per associated order) and PDF (room-level summary). Does that mean the existing `/app/frontend/src/components/reports/ExportButtons.jsx` should be extended (preferred) or a new export utility created? Either way, do you want the CSV columns explicitly enumerated by the CR before planning, or are sensible defaults (room_id, room_no, guest, check_in, order_no, order_amount, payment_status, time, source) acceptable? | Avoids re-work in planning agent. | Answered | **Yes** — extend existing `ExportButtons.jsx`; sensible default CSV columns acceptable (room_id, room_no, guest, check_in, order_no, order_amount, payment_status, time, source). |
| **Q-5: Permission key for the new sidebar entry.** CR §CS-10 says "same roles as Audit Report" → permission key `'report'` (already inherited if added under the `reports` group). Confirm: no new permission key (`room` or `room_orders`) is required? | Inheriting `'report'` is the simpler default; explicit confirmation avoids backend permission churn. | Answered | **Yes** — inherit `'report'` permission. No new permission key. |
| **Q-6: Room-number sourcing for RM rows.** Today the report transform sets `location.display = 'Room'` (literal string) for `orderIn === 'RM'` and `location.tableName = api.table_no`. The page should display the room number from `location.tableName`. Confirm this is acceptable (i.e., do not change the existing `extractLocation` behavior; just consume the right field on the new page)? | Avoids touching a shared transform used by audit-report drill-down. | Answered | **Yes** — consume `location.tableName` on the new page; do **NOT** modify the shared `extractLocation` behavior. |
| **Q-7: Scan & Order channel.** CR-004's §Affected Order Types/Channels does not list Scan & Order. If a Scan & Order order is shifted to a room (SRM with `parent_order_id`), should it appear as an "Associated order" in the room's expanded view, the same as any other SRM? | Consistency with CS-2/CS-3. Default: yes (SRM is SRM regardless of source). | Answered | **Yes** — Scan & Order SRM is treated identically to any other SRM (generic "Associated order" label per OQ-R5). |
| **Q-8: Sequencing with CR-001.** CR-004 R-3 / A-4 / D-1 require CR-001 to ship first or together. Do you want CR-004's planning to assume CR-001 has already been impact-analyzed and is in-flight, or should we explicitly couple the two impact analyses? | Avoid double-counting in production. | Answered | **Defer to next (Planning) agent** — let the Planning Agent decide sequencing after it has seen all three approved CRs (CR-001, CR-003, CR-004). |

## Assumptions
*(Only assumptions explicitly approved by user / locked in CR-004. Anything not yet approved is in Clarification Questions instead.)*

- A-1 (CR §A-1): `get-single-order-new` returns `room_info` and `associated_order_list[]` on RM-type parent orders — **verified in `orderTransform.js:256–285`**.
- A-2 (CR §A-2): `ORDER_LOGS_REPORT` returns RM orders with `table_no` representing the room number — **verified via `reportTransform.js:107–141` and `reportService.js:411–426`**.
- A-3 (CR §A-3): `parent_order_id` on SRM orders is the room identifier — **stated in `reportTransform.js:111` and `reportService.js:411`; treated as such by current code**.
- A-4 (CR §A-4): CR-001 will be implemented before or alongside CR-004 — **CR-001 status confirmed `cr_approved_for_planning`; sequencing decision deferred to Planning Agent (per Q-8 user answer)**.

### A-5 — A-12 (User-approved 2026-04-28 via Q-1…Q-8 answers)
- **A-5 (Q-1, with re-check flag):** Row-expand transform path = **(a)** extend `reportFromAPI.singleOrderNew` additively to pass through `roomInfo` + `associatedOrders` from the raw `get-single-order-new` response. **Planning Agent must re-verify this choice** before locking the file plan (user explicitly requested a re-check).
- **A-6 (Q-2, with lazy-load tension flag):** Collapsed room row shows three totals: (1) total room amount pending = `roomInfo.balancePayment`; (2) total of associated orders = sum of `associated_order_list[]` amounts; (3) total of the room order itself = RM-parent `order_amount`. **This conflicts with CR §CS-5 lazy-load.** Planning Agent must reconcile: (i) eager-fetch detail per room on page load (and update CS-5), (ii) render placeholders with on-mount lazy fetch, or (iii) ask user to relax CS-5.
- **A-7 (Q-3):** SRM-only groups (no RM parent) **skip rent/advance/balance entirely**. No "Room billing not set up" badge for SRM-only groups. Display = associated-order count + total only.
- **A-8 (Q-4):** Extend existing `/app/frontend/src/components/reports/ExportButtons.jsx`; default CSV columns acceptable: room_id, room_no, guest, check_in, order_no, order_amount, payment_status, time, source.
- **A-9 (Q-5):** New "Room Orders" sidebar entry inherits `'report'` permission. No new permission key.
- **A-10 (Q-6):** Page consumes `location.tableName` for RM-row room-number display. The shared `extractLocation` (`reportTransform.js:107–141`) is **NOT** modified.
- **A-11 (Q-7):** Scan & Order orders shifted to a room (SRM) are treated identically to any other SRM (generic "Associated order" label per OQ-R5).
- **A-12 (Q-8):** Sequencing with CR-001 deferred to the Planning Agent, which will see CR-001, CR-003, and CR-004 together.

## Docs vs Code Mismatches
| Topic | Docs Say | Code Shows | Impact |
| --- | --- | --- | --- |
| Sidebar reading order rule (CF-01 in `FINAL_DOCS_APPROVAL_STATUS.md`) | Approval doc must be read first; some final docs still list a different reading order. | n/a (rule, not code) | Already followed in this analysis. No code action. |
| `reportFromAPI.singleOrderNew` vs CR §A-1 wording | CR §A-1 says `get-single-order-new` "returns" `room_info` + `associated_order_list[]` (true at endpoint). | The default *report-side transform* `reportFromAPI.singleOrderNew` does NOT pass them through; only `orderTransform.fromAPI.order` does. | High — drives Q-1. |
| MC-06 / OD-01 (frontend should not own report aggregation) | Backend owns aggregation; frontend is presentation. | CR-004 does grouping/dedup on the frontend (one row per room from a flat day list). | Low — this is *presentation* grouping, not financial aggregation. Aligned with MC-06 spirit. Flag during planning so wording stays presentation-only. |
| OQ-12 / OD-02 (Room billing/print lifecycle) | NOT_ANSWERED / deferred. | CR Phase 1 explicitly does NOT change billing/print. | None for Phase 1; Phase 2/3 blocked until owner answers. |
| RT-01 (Implemented routes are narrow) | Lists `/`, `/loading`, `/dashboard`, `/reports/audit`, `/reports/summary`, `/visibility/status-config`. | Same in `App.js:32–41`. | CR-004 widens by **+1** route (`/reports/rooms`). Per RT-02 ("Sidebar does not define the route map"), the new route must be a real `<Route>` in `App.js`, not just a sidebar item. CR confirms this. |

## Impact Conclusion
- **Frontend-only**, additive, **read-only** route + view in the Reports module.
- **No backend, no socket, no env, no admin/setting, no print/billing/payment** changes.
- Reuses two existing endpoints (`order-logs-report`, `get-single-order-new`) and existing business-day logic.
- Touches **2 hotspot files** (`reportService.js`, `reportTransform.js`); FA-03 says prefer extraction over inline growth — keep additions minimal and isolated.
- All 8 clarifications **answered** (2026-04-28). Two follow-up notes flagged for Planning Agent:
  - **A-5 re-check:** user requested the next agent re-verify the Q-1 choice (extend `reportFromAPI.singleOrderNew`) before locking the file plan.
  - **A-6 lazy-load tension:** user's three-totals-in-collapsed-row direction conflicts with CR §CS-5 (lazy-load); Planning Agent must reconcile (eager fetch / placeholder + on-mount fetch / relax CS-5).
- **Sequencing with CR-001 deferred** to the Planning Agent (per A-12).
- **Phase 2 / Phase 3 are gated by OD-02 (OQ-12)**; out of scope here.
- Risk profile for Phase 1: **Low to Medium** once Q-1 re-verification and CR-001 sequencing land in planning.

## Ready For Implementation Planning?
- **Yes — pending explicit user approval of this impact analysis.** All 8 blocking and non-blocking clarifications are answered. Status will move to `impact_approved_for_planning` only after the user explicitly approves (e.g., "approved", "approve impact analysis", "freeze impact analysis", "ready for planning"). Casual phrases ("ok", "fine", "looks good", "go ahead") will not be treated as approval.

## Next Agent
- Change Request Implementation Planning Agent (only after this impact analysis is explicitly approved).
