# CR-003 Impact Analysis: Paid & Hold Order Actions — Collect Bill from Hold, Change Payment Method, Mark as Unpaid

## Status
- impact_approved_for_planning

## Revision Notes
- 2026-04-28 — Initial draft (impact_draft).
- 2026-04-28 — User answered clarification questions Q-A through Q-I. Status flipped to `impact_ready_for_approval`.
- 2026-04-28 — User explicitly approved ("approved"). Status flipped to `impact_approved_for_planning`. Document is handed off to the Change Request Implementation Planning Agent.

## Source CR
- CR ID: CR-003
- CR Title: Paid & Hold Order Actions — Collect Bill from Hold, Change Payment Method, Mark as Unpaid
- CR Doc Path: /app/memory/change_requests/CR_003_paid_hold_order_actions.md
- CR Status: cr_approved_for_planning (verified 2026-04-28)

## Impact Analysis Summary
CR-003 introduces three per-row actions on the Audit Report (`AllOrdersReportPage`):
1. **Hold tab → Collect Bill**: opens existing `CollectPaymentPanel` as a modal on the report page for paylater orders.
2. **Paid tab → Change Payment Method**: inline picker (Cash/Card/UPI) calling `POST /api/v2/vendoremployee/change-order-payment-method`.
3. **Paid tab → Mark as Unpaid**: confirmation dialog calling `POST /api/v2/vendoremployee/make-order-unpaid`, then row leaves Paid tab and re-surfaces as a running order on the dashboard via socket emission on `new_order_${restaurantId}`.

All three actions are gated by frontend role-permission checks (`update_payment`, `order_unpaid`) and constrained to a 2-business-day window (current + previous business day).

The change is concentrated in the **Reports** module, with significant **embedded reuse** of the **Order Entry / Payment** module (`CollectPaymentPanel`) and a **lightweight cross-cutting** dependency on the **Dashboard** module (running-orders refresh via existing socket channel). It is a high-regression-risk feature because it touches financial mutation, two playbook hotspots (`CollectPaymentPanel.jsx`, `DashboardPage.jsx`), and retroactive report totals.

## Requirement Understanding
The CR is fully frozen on intent. The user has confirmed: endpoints, permission keys (`update_payment` / `order_unpaid`), UI placement (per-row inline button + mini picker for method change, per-row button → modal-on-report-page reuse of CollectPaymentPanel for collect-bill, confirmation dialog for mark-unpaid), accepted method values (`cash` / `card` / `upi` lowercase), 2-day mutation window, no admin toggle, no PIN, no print side effects, aggregator and room/SRM out of scope, backend will emit a socket event after Endpoint B, and a fallback refetch path until the backend socket event is shipped.

Open items remaining are response-shape / error-code details (non-blocking — frontend will use generic error toasts) and a few placement / refresh-coordination questions captured below.

## Confirmed Scope From CR
- CS-A1: Add endpoint constants (`CHANGE_ORDER_PAYMENT_METHOD`, `MAKE_ORDER_UNPAID`) and frontend service wrappers for Endpoints A and B.
- CS-A2: No reason / audit-trail collection in UI (endpoints don't accept it).
- CS-A3: Endpoint A success → optimistic in-place row update + background refetch (no full page reload).
- CS-A4: Endpoint B success → row leaves Paid tab, dashboard running-orders re-surfaces order. Socket-driven refresh is primary; explicit refetch is fallback.
- CS-A5: Reuse existing `Bearer` interceptor + global error-toast handling.
- CS-A6: Frontend role-gating via `hasPermission('update_payment')` and `hasPermission('order_unpaid')`. Controls hidden (not just disabled) when permission missing.
- CS-A7: "Collect Bill" per-row button on Hold tab → opens existing `CollectPaymentPanel` as a modal overlay on the report page.
- CS-A8: "Change Payment Method" per-row inline button on Paid tab → mini picker (Cash/Card/UPI) → call Endpoint A → in-place update.
- CS-A9: 2-day window — controls disabled (visible, greyed) for orders older than current + previous business day.
- CS-A10: Mark-Unpaid confirmation dialog before calling Endpoint B.
- CS-A11: Subscribe to existing `new_order_${restaurantId}` socket channel for the post-make-unpaid update; explicit refetch fallback.
- CS-A12: Aggregator (Zomato/Swiggy) and Room/SRM/`payment_method === 'ROOM'` orders excluded; no KOT/print side effects; no admin toggle; no PIN.

## Out of Scope From CR
- CR-001 work (status/filter classification fix) — separate CR, **dependency**.
- CR-002 (classifier unification refactor) — separate CR.
- CR-004 (Room Orders PMS view) — separate CR. Room/SRM/ROOM paid-order mutations belong there.
- Aggregator paid-order mutations.
- Split-payment special handling (architecturally one order per split).
- Reprint / print-invalidation behavior.
- Reason / audit-trail capture in the UI.
- Admin-level setting toggle.
- PIN / second-factor for the actions.
- Non-blocking: Endpoint A/B response-shape and error-code documentation.

## Codebase Review Summary
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: CR-28-april (HEAD `a01625d`)
- Pull status: Fresh clone into `/app` on 2026-04-28
- Build/compile performed: No
- Source files inspected (read-only):
  - /app/frontend/src/pages/AllOrdersReportPage.jsx
  - /app/frontend/src/components/reports/OrderTable.jsx
  - /app/frontend/src/components/reports/OrderDetailSheet.jsx (top section)
  - /app/frontend/src/components/order-entry/CollectPaymentPanel.jsx (props/contract section)
  - /app/frontend/src/components/order-entry/OrderEntry.jsx (CollectPaymentPanel mount points by grep)
  - /app/frontend/src/api/services/paymentService.js
  - /app/frontend/src/api/services/reportService.js (presence + counts only)
  - /app/frontend/src/api/constants.js
  - /app/frontend/src/contexts/AuthContext.jsx
  - /app/frontend/src/api/socket/socketEvents.js (relevant lines)
  - /app/frontend/src/api/socket/useSocketEvents.js (subscription wiring)
  - /app/frontend/src/api/socket/socketHandlers.js (presence)
  - /app/frontend/src/utils/businessDay.js
  - Permission usage patterns across `pages/` and `components/`

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
| Reports / Audit / Summary (Module 10) | High | Primary surface for all three actions. New row-level controls, new error toasts, socket refresh on report screen. |
| Order Entry / Cart / Payment (Module 4) | High | `CollectPaymentPanel` reused as modal on report page. Hotspot per playbook. Reuse path is new. |
| Dashboard / POS Workspace (Module 3) | Medium | Mark-Unpaid causes order re-surfacing as running. Hotspot per playbook. Refresh coordination required. |
| Realtime Socket (Module 7) | Medium | Subscribe to `new_order_${restaurantId}` event emitted after Endpoint B. New handler branch likely. |
| Authentication & Session (Module 1) | Low | Pure consumer of `hasPermission`; no auth code change. |
| Tables & Orders Runtime State (Module 13) | Low–Medium | Re-surfaced order must reach `OrderContext` running list (today via existing socket flow). |
| Visibility Settings / Device Configuration (Module 11) | Not impacted | No setting added. |
| Printing / Bill / KOT (Module 14) | Not impacted | Explicitly out of scope (OQ-Print closed: no print side-effect). |
| Notifications & Firebase (Module 8) | Not impacted | No new notification surface. |
| Customer / CRM (Module 6) | Not impacted | No customer mutation in CR-003 actions. |
| Station / Kitchen (Module 9) | Not impacted | No station change. |

## Affected Screens / Components
| Screen / Component | File Path | Impact | Notes |
| --- | --- | --- | --- |
| All Orders Report page | `/app/frontend/src/pages/AllOrdersReportPage.jsx` | High | Hosts all three actions. Holds modal for Collect-Bill-from-Hold. Owns refetch on mutation success. Owns socket subscription side-effect (or delegates). Tab filter logic depends on CR-001 being merged. |
| Order Table | `/app/frontend/src/components/reports/OrderTable.jsx` | High | Needs an "Actions" column (or per-tab action cell): Hold tab → Collect Bill button; Paid tab → Change Method button + Mark Unpaid button; Cancelled / Credit / Merged / Unpaid / Transferred / Aggregator / Audit / All → no actions. Row-click navigation must not be blocked by inline action clicks (`stopPropagation`). Disabled-vs-hidden semantics per CS-A6/CS-A9. |
| Order Detail Sheet | `/app/frontend/src/components/reports/OrderDetailSheet.jsx` | Low–Medium | Not strictly required by CR (controls are per-row), but if user opens Detail and then triggers a mutation on the underlying row from elsewhere, the open sheet should refresh or close gracefully. **Open Q-A**: should the side-sheet also expose these actions? CR mentions "per-row action (exact placement TBD)" but recommendation locks placement to row-level; sheet duplication is not mandated. |
| CollectPaymentPanel | `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Medium | Reused as-is from report page modal. Hotspot — must not be modified. Current contract requires extensive props normally supplied by `OrderEntry`. Reuse from the report page must build the same prop set from a single-order fetch (see Risks). |
| Dashboard Page | `/app/frontend/src/pages/DashboardPage.jsx` | Medium | When Mark-Unpaid is invoked from the report page, the dashboard's running-orders list (via OrderContext + socket) must catch the re-surfaced order. Existing socket flow already handles `new_order_${restaurantId}`. No code change expected if backend emits the agreed event; fallback is an explicit running-orders refetch when Mark-Unpaid succeeds. |
| OrderEntry | `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Low | Existing mount of `CollectPaymentPanel`. Not modified. Used as the contract reference for the modal-from-report path. |
| AuthContext | `/app/frontend/src/contexts/AuthContext.jsx` | None | Consumer only. `hasPermission()` already exists. |
| New file: `paymentMutationService.js` | `/app/frontend/src/api/services/paymentMutationService.js` | High (logic) | New wrappers for Endpoints A and B. Confirmed by user (Q-B answered as B2). |
| New file (likely): permission helpers (small) | TBD (likely inline in report page or `/utils/permissions.js`) | Low | Just two boolean checks; can be inline. |
| New file (likely): collect-bill modal wrapper for report | `/app/frontend/src/components/reports/CollectBillModal.jsx` (new) | Medium | Wraps `CollectPaymentPanel` plus the prerequisite single-order fetch + prop-builder. |

## Affected APIs
| API / Function | File Path | Impact | Backend Change Needed? | Notes |
| --- | --- | --- | --- | --- |
| `POST /api/v2/vendoremployee/change-order-payment-method` (NEW – Endpoint A) | New constant + new service wrapper | High | No (endpoint exists per CR) | Body `{ order_id, payment_method }`. Lowercase values. Response shape unspecified. |
| `POST /api/v2/vendoremployee/make-order-unpaid` (NEW – Endpoint B) | New constant + new service wrapper | High | **Yes — backend must emit socket event on `new_order_${restaurantId}` after this call** (per CR Dep-Socket). | Body `{ order_id }`. Frontend has fallback refetch until socket event ships. |
| Existing collect-bill endpoint reused for Hold → Collect Bill (`API_ENDPOINTS.BILL_PAYMENT` path used by `CollectPaymentPanel` flow) | `/app/frontend/src/api/services/paymentService.js`, `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`, transforms | Low (no API change) | No | OQ-C-endpoint answered: reuse existing flow. **Pre-existing code-vs-doc mismatch**: `paymentService.js:13` references `API_ENDPOINTS.CLEAR_BILL` but constants only define `BILL_PAYMENT`. See Docs vs Code Mismatches below. |
| `getOrderLogsReport` | `/app/frontend/src/api/services/reportService.js` | Low | No | Will be re-invoked on mutation success to refresh the report. |
| `getRunningOrders` | `/app/frontend/src/api/services/orderService.js` | Low | No | Used by both report (for running-vs-missing detection) and dashboard. Fallback refetch path on Mark-Unpaid. |
| `getSingleOrderNew` | `/app/frontend/src/api/services/reportService.js` | Medium | No | Likely needed by the report-side Collect-Bill modal to build `CollectPaymentPanel` props (cart items, totals, customer, isRoom flag, associatedOrders, financials) from the held order id. |

## Affected Socket Events
| Socket Event | Current Usage | Impact | Backend Change Needed? | Notes |
| --- | --- | --- | --- | --- |
| `new_order_${restaurantId}` channel | Subscribed in `useSocketEvents.js`; routed through `socketHandlers.js` to `OrderContext`/`TableContext` | Medium | **Yes** (a new event after Endpoint B; reuses existing channel). | Backend emits an event when a paid order flips to unpaid so other terminals + the report page reflect re-surfacing. Frontend may need a new event-type branch in `socketHandlers.js` (depending on whether the existing "new_order" path already handles a paid→unpaid transition). |
| `update-table` channel | Removed per `socketHandlers.js:6` comment | None | No | Out of scope. |

## Affected State / Context / Store Logic
| State Area | File Path | Impact | Notes |
| --- | --- | --- | --- |
| Report page local state (`allOrders`, `tabCounts`, `summary`) | `/app/frontend/src/pages/AllOrdersReportPage.jsx` | High | Optimistic update on Endpoint A success + explicit refetch on Endpoint B success. Tab counts must recompute. |
| Report page modal state (open/close + selected hold order) | `/app/frontend/src/pages/AllOrdersReportPage.jsx` (new) | Medium | New state for the Collect-Bill-from-Hold modal — distinct from `OrderDetailSheet`. |
| OrderContext | `/app/frontend/src/contexts/OrderContext.jsx` | Low–Medium | If Mark-Unpaid socket event is delivered, existing handlers should add the order to running list. Verify the path works for paid→unpaid transition (might be modeled today only as new-order create or status-update). |
| AuthContext permissions | `/app/frontend/src/contexts/AuthContext.jsx` | None | Read-only consumer. |
| TableContext | `/app/frontend/src/contexts/TableContext.jsx` | Low | Re-surfaced order may toggle a table back to occupied. Existing `f_order_status`-driven derivation should handle this. |
| localStorage | various | None | No new keys. |

## Data / Payload Impact
| Field / Payload Area | Current Behavior | Required Change / Impact | Notes |
| --- | --- | --- | --- |
| Endpoint A request body | N/A (new) | New: `{ order_id: <int>, payment_method: 'cash'\|'card'\|'upi' }` | Lowercase values per OQ-B1. |
| Endpoint A response | Unspecified | Frontend treats success as 2xx; reads minimal payload (echoed `payment_method` if present). | Open – non-blocking. |
| Endpoint B request body | N/A (new) | New: `{ order_id: <int> }` | No reason field. |
| Endpoint B response | Unspecified | Frontend treats success as 2xx. | Open – non-blocking. |
| Report row `paymentMethod` field | Mixed casing returned by `getOrderLogsReport` (e.g., `Cash`, `Cancel`, `paylater`, `ROOM`) | After Endpoint A success, the in-place update must keep the row's casing consistent with what the rest of the page expects. **Open Q-C**: should the in-place update set `paymentMethod` to `'Cash'` / `'Card'` / `'UPI'` (display casing) or `'cash'` / `'card'` / `'upi'` (API casing)? `OrderTable` style helpers are case-insensitive but the badge text renders raw value. Recommended: preserve current display casing. |
| Order id field used in API calls | `orderId` (string) and `id` (numeric) coexist on report rows | Backend likely expects the numeric DB id, not the display order id. **Open Q-D**: confirm which field maps to the endpoint's `order_id` parameter. | Based on similar existing endpoints (e.g., `cancel-food-item`, `order-status-update`) this should be the numeric primary id, but must be verified against report-row shape. |

## Admin / Settings Impact
- Impact: No
- Existing setting involved: None
- New setting likely required: None (OQ-Setting closed)
- Notes: Permission alone gates access. No restaurant-level toggle.

## Order Type / Channel Impact
| Order Type / Channel | Impact | Notes |
| --- | --- | --- |
| Dine-in | Yes | Primary scope. |
| Takeaway | Yes (likely) | Not explicitly excluded; treated like any other in-house paid order. **Confirmation requested — Open Q-E**. |
| Delivery | Yes (likely) | Same as takeaway. **Confirmation requested — Open Q-E**. |
| Room (RM) | No | Excluded by tab filters and CR scope (CR-004 territory). |
| Scan & Order | Yes (likely) | Not explicitly excluded. **Confirmation requested — Open Q-E**. |
| Aggregator (Zomato/Swiggy) | No | Explicitly out (OQ-6 closed). |
| SRM (room-transferred) | No | Excluded by CR (CR-004). |
| ROOM payment-method orders | No | Excluded. |

## Printing / KOT / Bill Impact
- Impact: No
- Files/flows affected: None
- Notes: OQ-Print closed — method change and mark-unpaid have no print side effects. CR explicitly says no reprint, no invalidation, no append.

## Reporting / Analytics Impact
- Impact: Yes (high — financial side effects)
- Files/flows affected:
  - `/app/frontend/src/pages/AllOrdersReportPage.jsx` (totals, payment-method breakdown, tab counts)
  - `/app/frontend/src/components/reports/SummaryBar.jsx` (read via `calculateSummary`)
  - Backend daily-sales / collected-summary aggregation (owned by backend per OQ-07; frontend is presentation only)
- Notes: Endpoint A (method change) shifts revenue between Cash/Card/UPI buckets retroactively within the 2-day window. Endpoint B (mark unpaid) removes revenue retroactively for the day. Both invalidate previously displayed totals on any open report screen on any terminal. Frontend must refresh on success; backend aggregation must reflect the change in subsequent loads.

## Backward Compatibility Impact
- Existing restaurants without these permissions: cashier user without `update_payment` / `order_unpaid` simply does not see the controls — exactly the previous behavior. ✅
- Existing paid/hold rows: rendering unchanged for users without permissions or for orders outside the 2-day window (controls hidden / disabled respectively). ✅
- Aggregator/Room rows: unchanged — controls never shown. ✅
- Pre-CR-001 classifications: if CR-001 is not merged first, the Hold and Paid tabs may misclassify (paylater leaking into Unpaid, ROOM leaking into Paid). Depending on order leaks, controls could appear on wrong rows. **Hard dependency D-1.**
- Existing socket subscribers on other terminals: continue working; the new make-unpaid emission is a new event type on an existing channel — old terminals will simply ignore unknown event types (verify existing handler tolerance).

## Existing Reusable Logic
| Existing Logic | File Path | How It May Help |
| --- | --- | --- |
| `useAuth().hasPermission(key)` | `/app/frontend/src/contexts/AuthContext.jsx` | Direct gate for `update_payment` and `order_unpaid`. |
| `getBusinessDayRange`, `isWithinBusinessDay` | `/app/frontend/src/utils/businessDay.js` | Reuse for the 2-day window guard. A small helper `isWithinTwoBusinessDays(orderCreatedAt, schedules, today)` may be added next to it. |
| `CollectPaymentPanel` | `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Reused as the entire collect-bill UI for Hold → Collect Bill. |
| `getSingleOrderNew` | `/app/frontend/src/api/services/reportService.js` | Already used by `OrderDetailSheet`. Can hydrate a held order before mounting `CollectPaymentPanel`. |
| `getOrderLogsReport` + `calculateSummary` | `/app/frontend/src/api/services/reportService.js`, `/app/frontend/src/api/transforms/reportTransform.js` | Refresh-on-success path. |
| Socket subscription wiring | `/app/frontend/src/api/socket/useSocketEvents.js` + `socketHandlers.js` | Hook into existing `new_order_${restaurantId}` listener for the post-mark-unpaid event. |
| Toast / `readableMessage` error contract | Axios interceptors + UI toaster | Generic error path for Endpoints A/B until response shapes are documented (Rule EH-01). |
| Confirmation dialog primitives | `/app/frontend/src/components/ui/` (shadcn dialog/alert-dialog) | Standard confirm dialog for Mark-Unpaid. |

## Likely Files For Future Implementation
| File Path | Reason It May Be Touched | Confidence |
| --- | --- | --- |
| `/app/frontend/src/api/constants.js` | Add `CHANGE_ORDER_PAYMENT_METHOD`, `MAKE_ORDER_UNPAID` constants. | High |
| `/app/frontend/src/api/services/paymentMutationService.js` (NEW) | Add `changeOrderPaymentMethod()` and `makeOrderUnpaid()` wrappers. Placement confirmed by user (Q-B → B2). Implementation Planning Agent should re-confirm before locking. | High |
| `/app/frontend/src/components/reports/OrderTable.jsx` | Add per-tab Actions column / cells; click-handler isolation; disabled-vs-hidden states. | High |
| `/app/frontend/src/pages/AllOrdersReportPage.jsx` | Hosts modal state; orchestrates mutation handlers; permission/window gating; refetch & socket-driven refresh; passes new props to `OrderTable`. | High |
| `/app/frontend/src/components/reports/CollectBillModal.jsx` (NEW) | Lightweight modal wrapper that loads single order via `getSingleOrderNew`, builds `CollectPaymentPanel` props, and handles success → close + refresh. | High |
| `/app/frontend/src/components/reports/PaymentMethodPicker.jsx` (NEW) | Mini popover/picker UI for Cash/Card/UPI inline change. | High |
| `/app/frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` (NEW) or use shadcn AlertDialog inline | Confirmation dialog for Mark-Unpaid. | High |
| `/app/frontend/src/utils/businessDay.js` | Possibly add a 2-business-day helper. | Medium |
| `/app/frontend/src/api/socket/socketHandlers.js` | Add/extend a branch for the post-mark-unpaid event so paid→unpaid re-surfacing routes correctly into `OrderContext`. | Medium |
| `/app/frontend/src/contexts/OrderContext.jsx` | Possibly add a small `markOrderUnpaid()` mutator if optimistic updates are needed in `OrderContext` ahead of socket sync. | Medium |
| `/app/frontend/src/components/reports/OrderDetailSheet.jsx` | Optional: refresh/close-on-mutation handling if open at mutation time. | Low–Medium |

## Risks
| Risk | Severity | Notes / Mitigation Needed |
| --- | --- | --- |
| Hotspot file reuse — `CollectPaymentPanel.jsx` from the report page | High | Mounting `CollectPaymentPanel` outside its native parent (`OrderEntry`) requires building a substantial prop set (cart items, total, customer, `isRoom`, `associatedOrders`, `roomInfo`, `orderFinancials`, `hasPlacedItems`, `orderType`, `orderNumber`). Mitigation: the new `CollectBillModal` builds props from `getSingleOrderNew` + `OrderContext`/`TableContext` look-ups in a single place; the panel itself must NOT be modified (Rule FA-03). Add a tight unit test on the prop-builder. |
| Hotspot file — `DashboardPage.jsx` impact via re-surfaced running order | High | After Mark-Unpaid, the dashboard running-orders panel must reflect the re-surfaced order. Mitigation: rely on existing `new_order_${restaurantId}` channel handlers; avoid editing `DashboardPage.jsx` directly. Add a fallback `getRunningOrders()` refetch in `OrderContext` (or page handler) for the case where the socket event has not been deployed yet by backend. |
| Pre-existing code bug — `paymentService.collectPayment` references `API_ENDPOINTS.CLEAR_BILL` which is not defined | High (latent) | Likely already broken in production code path that uses this wrapper, OR the wrapper is unused (real path is via transforms in `OrderEntry`). Mitigation: not in CR-003's scope to fix, but flag to user. CR-003 should NOT use this wrapper for Hold → Collect Bill; it should mount `CollectPaymentPanel` and let it follow its own path. |
| Retroactive financial mutation | High | Method change and mark-unpaid alter day totals retroactively within the 2-day window. Mitigation: confirmation dialog (CS-A10), permission gating (CS-A6), 2-day window cap (CS-A9), explicit refresh of report after success. |
| Optimistic UI rollback | Medium | If Endpoint A returns error after the badge has been updated, the row must revert. Mitigation: keep previous value in local state; rollback in catch; surface toast. |
| Concurrent edits on two terminals | Medium | Last-write-wins on backend; UI must refetch on error. Mitigation: refetch report on error; trust backend response. |
| Socket event semantics for paid→unpaid | Medium | Existing `socketHandlers.js` may not currently handle a "previously paid order now reappearing as running" message. Mitigation: inspect handler during implementation; add explicit branch if needed. Fallback already documented (CS-A11 explicit refetch). |
| Permission key mismatch between frontend and backend | Medium | If backend permission keys are not literally `update_payment` / `order_unpaid`, the frontend gate fails closed (controls never shown). Mitigation: verify keys early in implementation against `/api/v2/vendoremployee/vendor-profile/profile` payload. |
| Disabled-vs-hidden semantics for "outside 2-day window" vs "no permission" | Medium | CR says: no permission → hidden; outside 2-day window → disabled with tooltip. The two states must not be conflated. Mitigation: clearly named conditional branches in the table cell. |
| Tab counts drift after mutation | Medium | Tab counts in `AllOrdersReportPage` are computed from `allOrders`. Optimistic update to one row's `paymentMethod` does not change tab membership for Endpoint A; for Endpoint B, the order leaves the Paid filter and joins the Unpaid filter. Mitigation: recompute counts in the same effect chain; explicit refetch covers any drift. |
| OrderDetailSheet open during mutation | Low–Medium | If the side sheet is showing the mutated order, it may show stale data. Mitigation: close the sheet on mutation success or refetch single-order. |
| Browser back / route navigation while modal open | Low | Standard modal-state hygiene. Mitigation: close on route change. |
| Casing of `paymentMethod` after mutation | Low | See Open Q-C. |
| Aggregator misclassification leak (CR-001 not merged) | Medium | If CR-001 isn't merged, paylater can leak into Unpaid and Paid filters can include `ROOM` etc., causing controls to render on wrong rows. Mitigation: implementation order — ensure CR-001 is merged first (D-1). |

## Dependencies
| Dependency | Owner | Required Before Planning? | Notes |
| --- | --- | --- | --- |
| CR-001 merged (status derivation correct) | Frontend / Product | Yes (per CR Dep D-1) | Hold and Paid tab filters must classify correctly before this CR is implemented. CR-002 may also follow but is not a hard blocker for CR-003. |
| Backend emits socket event on `new_order_${restaurantId}` after Endpoint B | Backend | No (frontend has fallback) | But required to fully meet CS-A4 / CS-A11 for cross-terminal sync. |
| Endpoint A & B response-shape spec | Backend / API | No (non-blocking; generic toasts work) | Refine error-message UX during implementation. |
| Backend confirms permission keys exactly match `update_payment` and `order_unpaid` | Backend / API | Yes | Otherwise gate fails closed. |
| Backend confirms which `order_id` field the endpoints expect (numeric DB id vs display order number) | Backend / API | Yes | See Open Q-D. |
| Confirmation that other order types (takeaway / delivery / scan-&-order) are in scope | Product | Yes | See Open Q-E. |

## Clarification Questions
| Question | Why It Matters | Status | User Answer |
| --- | --- | --- | --- |
| Q-A: Should `OrderDetailSheet` (side sheet) also expose the three actions, or row-level button only? | Affects component scope and whether the side sheet needs a permissions/window-aware action region. | Answered | **Row-level only.** Side sheet does NOT duplicate actions. |
| Q-B: Should the new service wrappers live in `paymentService.js` (per CR text) or in a new file (since arch rule API-03 calls existing `collectPayment` "stale")? | Architectural placement; affects which file the planning agent targets. | Answered (with confirmation flag for next agent) | **New file `frontend/src/api/services/paymentMutationService.js`** (Option B2). User noted "also check with next agent once" — Implementation Planning Agent should re-confirm placement before locking the file-level plan. |
| Q-C: After Endpoint A success, what casing should the row's `paymentMethod` field show? | Visual consistency of the Payment column badge. | Answered | **Display-cased: `Cash` / `Card` / `UPI`.** Request body remains lowercase per endpoint spec. |
| Q-D: Confirm the order-id field used in the Endpoint A/B request body. Numeric DB `id` or display `orderId` string? | Endpoint contract correctness. | Answered | **Numeric database `order_id`** (DB primary id, not the display string). |
| Q-E: Are takeaway, delivery, scan-&-order paid orders in scope for Change Method and Mark Unpaid? | Coverage of the gating logic. | Answered | **Yes, in scope. No additional gate.** Only Aggregator and Room/SRM/ROOM remain excluded. |
| Q-F: 2-day window — anchored on the report page's `selectedDate` or the device's "today"? | Matches user expectation; defines exactly which orders are mutable. | Answered | **F1 — Anchor on the device's "today" business day.** Today's and yesterday's business-day orders are mutable; older orders show controls disabled regardless of the report's selected date. |
| Q-G: On Mark-Unpaid success while NOT on dashboard, do we proactively refetch running-orders into `OrderContext`, or rely on the socket event next time dashboard mounts? | Determines whether `OrderContext` needs a programmatic refresh trigger from the report page. | Answered | **Backend takes care.** Frontend does NOT proactively refetch running-orders from the report page. Frontend subscribes to the existing `new_order_${restaurantId}` channel and trusts the backend-emitted event. |
| Q-H: For the side-sheet behavior on a mutated row — close automatically on success, or stay open and refresh? | UX detail; affects post-success orchestration. | Deferred | **Deferred to Implementation Planning Agent.** User: "not sure, once UI comes will discuss with next agent." |
| Q-I: Permission-key resolution — existing `permissions` array from `AuthContext`, or a different feature-flag source? | Implementation correctness; determines integration point. | Answered | **Same `AuthContext.permissions` array.** Use `hasPermission('update_payment')` and `hasPermission('order_unpaid')`. |

## Assumptions
The following items are now confirmed by the user (2026-04-28) and are no longer open clarifications:
- A-1 (Q-D, confirmed): Endpoint A and B accept the **numeric database `order_id`** (not the display string).
- A-2 (Q-B, confirmed with re-confirmation flag): New wrappers go in a **new file `frontend/src/api/services/paymentMutationService.js`**. Implementation Planning Agent must re-confirm placement before locking the file-level plan.
- A-3 (Q-E, confirmed): Takeaway, delivery, and scan-&-order are in scope. No additional gate. Only Aggregator and Room/SRM/ROOM remain excluded.
- A-4 (Q-A, confirmed): Actions are **row-level only**. `OrderDetailSheet` does not duplicate any of the three controls.
- A-5 (Q-G, confirmed): On Mark-Unpaid success, frontend does **not** proactively refetch running-orders. Backend handles re-surfacing via socket emission on the existing `new_order_${restaurantId}` channel; frontend simply subscribes.
- A-6 (Q-C, confirmed): After Endpoint A success, the row's `paymentMethod` is rendered **display-cased** (`Cash` / `Card` / `UPI`). The API request body remains lowercase per endpoint spec.
- A-7 (Q-F, confirmed): The 2-business-day window is **anchored on the device's "today" business day**. Today + yesterday's business-day orders are mutable, regardless of the date currently selected on the report page.
- A-8 (Q-I, confirmed): Permission gating reads from the existing `AuthContext.permissions` array via `hasPermission('update_payment')` and `hasPermission('order_unpaid')`.

Deferred (intentionally carried forward to next agent):
- A-9 (Q-H, deferred): Behavior of an open `OrderDetailSheet` on a mutated row (close vs refresh) is to be decided with the Implementation Planning Agent once the UI is in place.

## Docs vs Code Mismatches
| Topic | Docs Say | Code Shows | Impact |
| --- | --- | --- | --- |
| Bill payment endpoint constant name | `paymentService.js` imports `API_ENDPOINTS.CLEAR_BILL` (existing code) | `constants.js` defines `BILL_PAYMENT` (no `CLEAR_BILL`) | Pre-existing latent bug. Out of CR-003's scope to fix, but CR-003 should NOT use `paymentService.collectPayment` for the Hold → Collect Bill flow. Reuse `CollectPaymentPanel` directly. Flag to user for separate cleanup. |
| Architecture Rule API-03 | "`paymentService.collectPayment()` is stale from a code perspective and must not be treated as canonical for new work." | CR-003 text: "New service functions to add in `frontend/src/api/services/paymentService.js`". | Mild mismatch. Either extend the file as the CR says, or add a new service file. Captured as Open Q-B. |
| OD-02 Room billing/print deferral | Final docs defer room billing/print until next room-billing change. | CR-003 already excludes room/SRM/ROOM (CR-004). | Aligned. No conflict. |
| OQ-07 Reporting ownership | "Backend APIs own report aggregation; frontend is representation/presentation." | CR-003 mutates one order at a time and refreshes the report from backend. Frontend does not aggregate. | Aligned. No conflict. |
| Hotspot rules (FA-03, IMPLEMENTATION_AGENT_RULES) | `CollectPaymentPanel` and `DashboardPage` must not be expanded casually. | CR-003 reuses both without expanding internal logic. | Aligned, but enforcement requires the implementer to keep changes outside these files. |

## Impact Conclusion
- CR-003 is a **high-impact, financial-mutation feature** centered on the Reports module with deliberate reuse of the existing collect-payment UI and the existing socket channel.
- All clarification questions Q-A through Q-I have been resolved by the user (Q-H deferred to Implementation Planning Agent by user request).
- The frozen scope is cleanly bounded; risk is concentrated in (a) hotspot reuse of `CollectPaymentPanel` outside `OrderEntry`, (b) retroactive financial effects, and (c) cross-terminal sync after Mark-Unpaid (now confirmed as backend-owned via socket).
- One **hard dependency** on CR-001 must be merged first.
- One **soft dependency** on backend's socket emission after Endpoint B; frontend already has a documented fallback (and per Q-G, the frontend will rely on the backend event without proactively refetching running-orders).
- One item to re-confirm with the Implementation Planning Agent: service-file placement (`paymentMutationService.js` per Q-B answer, but user requested re-confirmation).
- One item deferred to the Implementation Planning Agent: behavior of an open `OrderDetailSheet` at mutation time (Q-H).

## Ready For Implementation Planning?
- Yes (status `impact_ready_for_approval`) — pending explicit user approval phrase.

## Next Agent
- Change Request Implementation Planning Agent
