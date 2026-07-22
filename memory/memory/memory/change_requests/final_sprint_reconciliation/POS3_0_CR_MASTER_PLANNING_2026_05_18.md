# POS3.0 CR Master Planning — 2026-05-18

## 1. Purpose

This document plans all 9 POS3.0 Change Request items identified by the impact analysis. This is planning-only work — no code was changed, no QA was run, no baseline docs were updated.

**In scope:**
BUG-096, BUG-097, BUG-098, BUG-099, BUG-104, BUG-105, BUG-106, BUG-107, BUG-108

**Out of scope (bug-fix items — handled by separate Bug Fix Sprint agent):**
BUG-087, BUG-088, BUG-089, BUG-090, BUG-091, BUG-092, BUG-093, BUG-094, BUG-095, BUG-100, BUG-101, BUG-102, BUG-103

**Rules applied:**
- No code changed.
- No QA run.
- No `/app/memory/final/` updated.
- No baseline updated.

---

## 2. Repo / Branch / Commit

| Field | Value |
|---|---|
| Repo URL | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | 18-may-pos3.0 |
| Commit Hash | 0e0bf0ad0bb5780d5f8547b21051ba97eef525a0 |
| Setup Mode | A — wipe and fresh clone |
| Working Tree Status | Clean |

---

## 3. Inputs Read

### Final Baseline Docs
1. `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md`
2. `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md`
3. `/app/memory/final/MODULE_DECISIONS_FINAL.md`
4. `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md`
5. `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md`
6. `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md`
7. `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md`

### POS2.0 Closure / QA Docs
8. `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md` (referenced)
9. `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_QA_BUG_STATUS_MATRIX_2026_05_18.md`

### POS3.0 Requirement / Carry-Forward Docs
10. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md`
11. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CARRY_FORWARD_2026_05_18.md`
12. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md`
13. `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ROOM_TRANSFER_V2_MIGRATION.md`

### POS3.0 Impact Analysis Docs
14. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md`
15. `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md`

### Bug Intake Source
16. `/app/memory/BUG_TEMPLATE.md` (referenced for intake lines)

### Code Files Inspected
17. `/app/frontend/src/components/order-entry/OrderEntry.jsx` (2246 lines)
18. `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (2514 lines)
19. `/app/frontend/src/components/cards/DeliveryCard.jsx` (224 lines)
20. `/app/frontend/src/api/services/customerService.js` (187 lines)
21. `/app/frontend/src/api/crmAxios.js` (81 lines)
22. `/app/frontend/src/contexts/MenuContext.jsx` (131 lines)
23. `/app/frontend/src/api/socket/socketEvents.js` (155 lines)
24. `/app/frontend/src/api/socket/useSocketEvents.js` (248 lines)
25. `/app/frontend/src/api/socket/socketHandlers.js` (referenced)
26. `/app/frontend/src/components/layout/Sidebar.jsx` (534 lines)
27. `/app/frontend/src/App.js` (54 lines)
28. `/app/frontend/src/api/constants.js` (referenced for endpoint constants)
29. `/app/frontend/src/api/transforms/orderTransform.js` (referenced for payment payload)
30. `/app/frontend/src/api/services/reportService.js` (referenced for credit/settlement)

---

## 4. Final CR Scope

| CR/Bug | Priority | Bucket | Planning Status | Reason |
|---|---|---|---|---|
| BUG-099 | P1 | E — Ready | ready_for_cr_planning | QSR billing is FE-only UX work; existing prepaid flow provides foundation |
| BUG-096 | P1 | F — Awaiting Docs | backend_docs_needed | Socket event names and payload shapes for menu updates not provided by owner |
| BUG-097 | P1 | F — Awaiting Docs | backend_docs_needed | API endpoints, payload shapes for dispatch and assign delivery boy not documented |
| BUG-098 | P1 | F — Awaiting Docs | backend_docs_needed | Backend must confirm profile API exposes CRM key field |
| BUG-106 | P2 | G — CRM Cluster | crm_api_docs_needed | CRM notes API endpoint and response shape unknown |
| BUG-107 | P2 | G — CRM Cluster | crm_api_docs_needed | CRM insights/favorites API endpoints and response shapes unknown |
| BUG-108 | P1 | G — CRM Cluster | crm_api_docs_needed | CRM coupon/loyalty/wallet API endpoints unknown; UI scaffolding exists with local/mock data |
| BUG-104 | P1 | H — XL New Module | xl_module_scope_session_needed | Entire Credit/Tab Management module — no screens, flows, or APIs defined |
| BUG-105 | P1 | H — XL New Module | xl_module_scope_session_needed | Entire Settlement module — no screens, flows, or APIs defined |

---

## 5. Recommended CR Waves

### Wave CR-A — Ready CR (can start now)

| CR/Bug | Title | Size | Dependencies |
|---|---|---|---|
| BUG-099 | QSR / Cafe Quick Billing UX Optimization | Large | None (FE-only, existing prepaid flow) |

**Rationale:** BUG-099 is the only CR with no blocking dependencies. The existing `placeOrderWithPayment` flow at `orderTransform.js:1030` and the prepaid path at `OrderEntry.jsx:1527` provide the foundation. The `CollectPaymentPanel.jsx` compact redesign is pure layout work.

### Wave CR-B — Awaiting Backend/Owner Docs

| CR/Bug | Title | Size | Blocker |
|---|---|---|---|
| BUG-096 | Realtime FE Updates for Menu + Hold/Unpaid Orders | Medium | Socket event names from owner |
| BUG-097 | Delivery Dispatch + Assign Delivery Boy | Medium | API endpoint documentation |
| BUG-098 | Use Restaurant Profile CRM Key Instead of Env | Small | Backend profile API confirmation |

**Rationale:** All three need documentation that does not yet exist. BUG-098 is the smallest — a small `crmAxios.js` refactor once the profile field is confirmed. BUG-096 and BUG-097 need full API/socket contracts before detailed implementation planning.

### Wave CR-C — CRM Integration Cluster

| CR/Bug | Title | Size | Blocker |
|---|---|---|---|
| BUG-106 | CRM Notes Integration | Medium | CRM API docs |
| BUG-107 | CRM Cross-Sell / Upsell Insights | Medium | CRM API docs |
| BUG-108 | CRM Coupon / Loyalty / Wallet Integration | Large | CRM API docs |

**Rationale:** All three share the CRM API layer (`crmAxios.js`, `customerService.js`) and should be planned together once CRM API documentation is available. BUG-108 has existing UI scaffolding (local/mock data) that accelerates implementation once real APIs are defined.

### Wave CR-D — XL New Modules (Separate Sprint)

| CR/Bug | Title | Size | Blocker |
|---|---|---|---|
| BUG-104 | Credit / Tab Management Module | XL | Owner scope session |
| BUG-105 | Settlement Module | XL | Owner scope session |

**Rationale:** Both are entire new modules requiring route registration, new pages/components, new services, new sidebar entries, and potentially new contexts. They need dedicated owner scope sessions before implementation planning can begin. Each could be its own mini-sprint.

---

## 6. Owner Scope Questions

| Question ID | CR/Bug | Question | Options | Recommendation | Blocks |
|---|---|---|---|---|---|
| OQ-CR-01 | BUG-099 | Should quick billing be a restaurant-profile toggle (QSR mode) or automatic for prepaid orders? | A. Profile-level toggle (admin enables "QSR mode" per restaurant) B. Automatic for all prepaid/walk-in orders C. Order-type-based (automatic for walk-in/takeaway, manual for dine-in) | Option A — allows restaurants to control behavior; default off. QSR/cafe owners enable it. | BUG-099 detailed UX design |
| OQ-CR-02 | BUG-099 | Which Collect Payment sections can be collapsed/hidden for QSR quick billing? | A. Hide all except payment method selection B. Show condensed bill summary + payment methods only C. Show full breakdown but with compact spacing | Option B — condensed bill summary (total, tax, grand total) + payment method pills. | BUG-099 compact layout design |
| OQ-CR-03 | BUG-099 | Can the one-step quick billing reuse the existing `placeOrderWithPayment` API, or does it need a new combined endpoint? | A. Reuse existing (FE assembles payload) B. New combined API endpoint | Option A — existing `PLACE_ORDER` endpoint already supports prepaid payload with `payment_status: 'paid'` via `placeOrderWithPayment` transformer. No new backend work needed. | BUG-099 implementation start |
| OQ-CR-04 | BUG-104 | What screens/flows does the Credit/Tab Management module need? | See detailed question packet in §12 | Owner must define — cannot assume. | BUG-104 implementation planning |
| OQ-CR-05 | BUG-104 | Should Credit module integrate with CRM customer_id (BUG-108 overlap) or remain mobile-number-based (current PAY-008 rule)? | A. Keep mobile-number-based (current behavior) B. Migrate to CRM customer_id-based | Depends on CRM integration timeline. If BUG-108 CRM APIs arrive first, Option B is cleaner. | BUG-104 data model |
| OQ-CR-06 | BUG-105 | Is settlement shift-based or end-of-day-based? | A. Shift-based (cashier opens/closes shift) B. End-of-day (auto-close at business-day boundary) C. Both | Owner must define — this determines auth/state model. | BUG-105 implementation planning |
| OQ-CR-07 | BUG-105 | Who can perform settlement (role/permission gate)? | A. Any logged-in cashier B. Manager role only C. Configurable per restaurant | Owner must define. | BUG-105 auth/permission design |
| OQ-CR-08 | BUG-105 | Should settlement lock further orders until next shift opens? | A. Yes — hard lock B. No — informational only C. Warning but allow override | Owner must define. | BUG-105 flow design |

---

## 7. Backend/API Questions

| Question ID | CR/Bug | Backend/API Question | Required Evidence | Blocks |
|---|---|---|---|---|
| BQ-CR-01 | BUG-096 | What are the exact socket event names for menu item add/update? | Socket event catalog or backend code reference | BUG-096 implementation |
| BQ-CR-02 | BUG-096 | What is the payload shape for menu update socket events? | Event payload example or schema | BUG-096 handler implementation |
| BQ-CR-03 | BUG-096 | Are hold/unpaid orders already partially handled by existing order socket events (`update-order`, `new-order`), or is there a separate event? | Socket event mapping | BUG-096 hold/unpaid scope |
| BQ-CR-04 | BUG-097 | What is the exact API endpoint for dispatching a delivery order? | API documentation | BUG-097 dispatch implementation |
| BQ-CR-05 | BUG-097 | What is the exact API endpoint for listing assignable delivery users? | API documentation | BUG-097 assign flow |
| BQ-CR-06 | BUG-097 | What is the exact API endpoint for assigning a delivery boy to an order? | API documentation | BUG-097 assign implementation |
| BQ-CR-07 | BUG-097 | What payload does each delivery API expect? | Payload schema | BUG-097 payload builders |
| BQ-CR-08 | BUG-097 | What response/socket event confirms dispatch or assignment success? | API response shape + socket event | BUG-097 state update logic |
| BQ-CR-09 | BUG-098 | Does the restaurant profile API response already include a CRM key field? | Profile API response sample | BUG-098 implementation |
| BQ-CR-10 | BUG-098 | If not, what field name will backend use for the CRM key in the profile? | API field name | BUG-098 FE consumption |
| BQ-CR-11 | BUG-098 | Should the env-variable CRM mapping be kept as a fallback or removed? | Policy decision | BUG-098 migration strategy |
| BQ-CR-12 | BUG-104 | What backend APIs exist or need to be built for credit/tab management? | API catalog | BUG-104 full planning |
| BQ-CR-13 | BUG-105 | What backend APIs exist or need to be built for settlement? | API catalog | BUG-105 full planning |

---

## 8. CRM API Questions

| Question ID | CR/Bug | CRM API Question | Required Evidence | Blocks |
|---|---|---|---|---|
| CQ-CR-01 | BUG-106 | What is the CRM API endpoint for fetching customer notes (item-level and order-level)? | Endpoint path + response shape | BUG-106 implementation |
| CQ-CR-02 | BUG-106 | Are notes read-only from POS, or should POS be able to add/edit notes? | CRM capability docs | BUG-106 UI design |
| CQ-CR-03 | BUG-107 | What CRM API endpoints provide customer behavior data (top favorites, last order, visit history, frequency)? | Endpoint paths + response shapes | BUG-107 implementation |
| CQ-CR-04 | BUG-107 | Which specific data points are available from CRM today? | Data catalog | BUG-107 scope definition |
| CQ-CR-05 | BUG-108 | What is the CRM API endpoint for validating a coupon code? | Endpoint path + request/response | BUG-108 coupon implementation |
| CQ-CR-06 | BUG-108 | What is the CRM API endpoint for fetching customer loyalty balance? | Endpoint path + response | BUG-108 loyalty implementation |
| CQ-CR-07 | BUG-108 | What is the CRM API endpoint for fetching customer wallet balance? | Endpoint path + response | BUG-108 wallet implementation |
| CQ-CR-08 | BUG-108 | What is the CRM API endpoint for redeeming loyalty points after payment? | Endpoint path + request | BUG-108 loyalty deduction |
| CQ-CR-09 | BUG-108 | What is the CRM API endpoint for debiting wallet after payment? | Endpoint path + request | BUG-108 wallet deduction |
| CQ-CR-10 | BUG-108 | What is the CRM API endpoint for marking a coupon as used? | Endpoint path + request | BUG-108 coupon usage |
| CQ-CR-11 | BUG-108 | Can coupon + loyalty + wallet combine on the same order, or are they mutually exclusive? | Business rule | BUG-108 discount interaction logic |
| CQ-CR-12 | BUG-108 | How does CRM coupon discount interact with existing manual/preset discount logic? | Business rule | BUG-108 discount precedence |
| CQ-CR-13 | BUG-108 | Should redemption happen at place-order time or collect-bill time? | Business rule | BUG-108 flow design |

---

## 9. Missing Source Docs

| CR/Bug | Missing Doc | Why Needed | Blocks |
|---|---|---|---|
| BUG-096 | Backend socket event catalog for menu updates | FE cannot subscribe to events without knowing event names and payload shapes | BUG-096 implementation |
| BUG-097 | Delivery dispatch + assign API documentation | FE cannot build API integration without endpoints, payloads, and response shapes | BUG-097 implementation |
| BUG-098 | Restaurant profile API response schema (with CRM key field) | FE cannot read CRM key from profile without knowing the field name | BUG-098 implementation |
| BUG-104 | Credit/Tab Management module scope document | Entire module is undefined — no screens, flows, APIs, or data model | BUG-104 planning |
| BUG-105 | Settlement module scope document | Entire module is undefined — no screens, flows, APIs, or permissions | BUG-105 planning |
| BUG-106 | CRM Notes API documentation | Endpoint paths, request/response shapes needed | BUG-106 implementation |
| BUG-107 | CRM Customer Insights API documentation | Endpoint paths, data catalog, response shapes needed | BUG-107 implementation |
| BUG-108 | CRM Coupon/Loyalty/Wallet API documentation | 6+ endpoints needed (validate, fetch balance, redeem, debit, mark used) | BUG-108 implementation |

---

## 10. CR-by-CR Planning Details

---

### BUG-099 — QSR / Cafe Quick Billing UX Optimization

#### Source Summary
POS3-REQ-017 in requirement source. Owner addition (2026-05-18). For QSR/cafe outlets, billing is too slow — three-step flow (Place Order → Collect Bill → scroll to pay). Two parts: (1) one-step quick billing from Place Order for prepaid/QSR, (2) compact Collect Payment screen.

#### Current Code / Existing UI
- **OrderEntry.jsx** (2246 lines): `handlePlaceOrder` at L767 handles unpaid placement. Prepaid flow at L1527 uses `placeOrderWithPayment`. CartPanel renders at L1921 with `setShowPaymentPanel` prop.
- **CollectPaymentPanel.jsx** (2514 lines): Full payment panel with bill summary, adjustments (discount, tip, delivery charge, service charge), payment method selection, split bill, cash received input. Currently takes significant vertical space.
- **orderTransform.js**: `placeOrderWithPayment` at L1030 builds a combined place+pay payload that goes to the existing `PLACE_ORDER` endpoint. This already works for prepaid orders.
- The prepaid path is already functional — the optimization is UX speed, not API capability.

#### Expected CR Behavior
**Part 1 — Quick Billing:**
After adding items to cart, for prepaid/QSR use cases, cashier sees a compact inline payment selection (e.g., payment method pills: Cash / Card / UPI) directly in the cart area. Tapping a payment method + Place Order places the order and marks it paid in one action — no separate Collect Bill screen needed. Uses existing `placeOrderWithPayment` API path.

**Part 2 — Compact Collect Payment:**
For the full Collect Payment screen (used by dine-in, room, complex payments), reduce vertical space: tighter fonts, condensed bill summary rows, compact adjustment controls, payment method layout that fits without scrolling. Existing behavior unchanged — only visual compactness.

The existing full Collect Payment flow for dine-in/room/split/tab/partial payments remains completely safe and untouched in functionality.

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Add quick billing inline payment UI; gate behind QSR mode toggle |
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Compact layout redesign — fonts, spacing, section condensation |
| `/app/frontend/src/components/order-entry/CartPanel.jsx` | May need quick billing inline payment area below cart |
| `/app/frontend/src/api/transforms/orderTransform.js` | Already has `placeOrderWithPayment` — no change expected |
| `/app/frontend/src/contexts/RestaurantContext.jsx` | May read QSR mode toggle from profile |

#### API / Socket / Backend / CRM Dependency
**None for Part 2** (compact layout is pure CSS/JSX).
**Part 1:** Existing `PLACE_ORDER` endpoint supports prepaid payload via `placeOrderWithPayment`. No new API needed unless owner decides on a combined endpoint. Backend dependency only if QSR mode toggle needs to come from restaurant profile.

#### Proposed Planning Direction
1. Start with Part 2 (compact Collect Payment) — low risk, immediate value, no dependencies.
2. Prototype Part 1 (quick billing) — reuse existing `placeOrderWithPayment` path, add inline payment method selection in CartPanel, gate behind a QSR mode check.
3. QSR mode toggle: prefer profile-based (backend adds a boolean to restaurant profile) or localStorage-based (Phase 1 device-local, matching existing StatusConfigPage pattern per OQ-03).
4. Preserve full Collect Payment for all non-QSR flows (dine-in, room, split, tab, partial payment).

#### Owner Decisions Needed
1. Quick billing toggle mechanism (profile vs localStorage vs order-type-based)
2. Which Collect Payment sections to collapse for QSR
3. Whether one-step flow reuses existing API (recommended: yes)

#### Backend / API Docs Needed
None for immediate start. Backend needed only if QSR toggle comes from profile.

#### What Not To Touch
- Existing full Collect Payment functionality (dine-in, room, split, tab, partial)
- Financial calculation accuracy (totals, tax, SC, round-off)
- Print payload parity
- Payment status semantics (`'paid'`, `'sucess'`, `'success'`)

#### Size / Risk
**Large** — CollectPaymentPanel.jsx is 2514 lines (architecture hotspot per Rule FA-03). Part 2 (compact layout) is medium risk. Part 1 (quick billing) is higher risk due to payment flow integration. Both need careful regression testing against the full payment flow.

#### QA Checklist Later
- [ ] Full Collect Payment flow works unchanged for dine-in, room, split, tab
- [ ] Quick billing places + pays in one step for prepaid orders
- [ ] Financial totals match between quick billing and full flow
- [ ] Print payload parity between quick billing and full flow
- [ ] Compact layout fits payment methods without scrolling
- [ ] All payment methods work in both modes (cash, card, UPI)
- [ ] Split bill / partial payment correctly routes to full flow (not quick billing)

#### Planning Status
**ready_for_cr_planning**

#### Handoff Notes For Future Agent
- Start with Part 2 (compact layout) for immediate value.
- Part 1 can be implemented incrementally — first the toggle, then the inline payment UI.
- The prepaid flow at OrderEntry.jsx L1527 is the existing foundation for one-step billing.
- `placeOrderWithPayment` at orderTransform.js L1030 handles the full payload — no transform changes expected.
- CollectPaymentPanel is an architecture hotspot (Rule FA-03) — use extraction, not inline growth.
- Owner questions OQ-CR-01/02/03 should be resolved before Part 1 implementation starts.

---

### BUG-096 — Realtime FE Updates for Menu and Hold/Unpaid Orders

#### Source Summary
POS3-REQ-014. Owner addition (2026-05-18). Backend already emits socket events for menu item add/update and hold/unpaid order changes. FE does not consume these events.

#### Current Code / Existing UI
- **MenuContext.jsx** (131 lines): Has `setCategories` and `setProducts` exposed via context. Currently only called during bootstrap (`LoadingPage`). No socket subscription exists.
- **socketEvents.js** (155 lines): No menu-related event names defined.
- **useSocketEvents.js** (248 lines): No menu event handler.
- **socketHandlers.js**: No menu-related handler.
- For hold/unpaid orders: Existing order socket events (`new-order`, `update-order`, `update-order-status`) may already cover hold/unpaid orders partially.

#### Expected CR Behavior
1. When a menu item is added or updated from any source (frontend, backend, admin), the POS menu UI updates in realtime.
2. When a hold/unpaid order is created or updated, the dashboard reflects it in realtime.

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/api/socket/socketEvents.js` | Add new event name constants for menu updates |
| `/app/frontend/src/api/socket/useSocketEvents.js` | Add menu event routing to new handler |
| `/app/frontend/src/api/socket/socketHandlers.js` | New handler: `handleMenuUpdate` |
| `/app/frontend/src/contexts/MenuContext.jsx` | Consume menu update events; update categories/products |
| `/app/frontend/src/contexts/OrderContext.jsx` | Verify hold/unpaid order socket handling |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** Socket event names and payload shapes are unknown. Owner confirmed "will provide later." Cannot implement without this information.

#### Proposed Planning Direction
1. Once event names are provided: define constants in socketEvents.js, add handler in socketHandlers.js, route in useSocketEvents.js.
2. Menu update handler: parse payload → determine if category update or product update → call `setCategories` or `setProducts` in MenuContext.
3. For hold/unpaid orders: investigate whether existing order socket events already cover this case. If not, add new handler.
4. Handle incremental updates (add/modify single item) vs full refresh (reload all menu data).

#### Owner Decisions Needed
None beyond providing socket event names and payload shapes.

#### Backend / API Docs Needed
Socket event names and payload shapes — BLOCKING.

#### What Not To Touch
- Existing bootstrap menu loading (LoadingPage)
- Existing category/product data structures
- Existing order socket handlers

#### Size / Risk
**Medium** — new socket subscription and context update. Main risk: incremental menu updates corrupting cached data.

#### QA Checklist Later
- [ ] Menu item added via backend appears on POS without refresh
- [ ] Menu item price updated via backend reflects on POS
- [ ] Hold/unpaid order appears on dashboard in realtime
- [ ] Existing bootstrap loading still works correctly
- [ ] No duplicate rendering or data corruption on rapid updates

#### Planning Status
**backend_docs_needed**

#### Handoff Notes For Future Agent
- Wait for owner to provide socket event names.
- MenuContext already exposes `setCategories` and `setProducts` — the plumbing is ready.
- Key design decision: incremental update (merge single item) vs full reload (re-fetch all). Incremental is preferable for performance.

---

### BUG-097 — Delivery Dispatch + Assign Delivery Boy API Integration

#### Source Summary
POS3-REQ-015. Owner addition (2026-05-18). Backend APIs ready for delivery dispatch and delivery boy assignment. FE has placeholder buttons.

#### Current Code / Existing UI
- **DeliveryCard.jsx** (224 lines): L194 has `console.log('Assign Rider' / 'Dispatch')` placeholder button. Uses `source === "own"` to determine which button label to show. L200 has dispatched status rendering.
- Owner partial info from impact analysis clarification: if `delivery_assign` key is present on the order, show "Assign" button; otherwise show "Dispatch" button.
- No API integration exists.

#### Expected CR Behavior
1. Delivery order on dashboard shows "Dispatch" or "Assign Rider" button based on `delivery_assign` presence.
2. Dispatch: Direct API call → order status updates.
3. Assign: API call to list assignable users → cashier picks one → assignment API call → assigned person receives notification to accept/reject.

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/components/cards/DeliveryCard.jsx` | Replace console.log placeholder with real API calls |
| `/app/frontend/src/api/services/orderService.js` | New functions: dispatchOrder, getAssignableUsers, assignDeliveryBoy |
| `/app/frontend/src/api/constants.js` | New endpoint constants |
| New component: `AssignRiderModal.jsx` or similar | Rider selection UI |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** All API endpoints, payloads, and response shapes are unknown.

#### Proposed Planning Direction
1. Once API docs arrive: add endpoint constants, create service functions, build rider selection modal.
2. Dispatch: simple button → API call → success feedback → order state update.
3. Assign: button → modal with rider list (from API) → select rider → confirm → API call → success feedback.
4. State update: via existing order socket events or API response.

#### Owner Decisions Needed
None beyond providing API documentation.

#### Backend / API Docs Needed
All dispatch and assign endpoints, payloads, responses — BLOCKING.

#### What Not To Touch
- Existing delivery order card rendering
- Existing delivery order status flow
- Existing `delivery-assign-order` socket handler (BUG-094 scope)

#### Size / Risk
**Medium** — new API integration + possible rider selection modal. Moderate risk due to delivery workflow impact.

#### QA Checklist Later
- [ ] Dispatch button works for non-own delivery orders
- [ ] Assign button works for own delivery orders
- [ ] Rider selection modal shows assignable users
- [ ] Rider assignment updates order state
- [ ] Error handling for failed dispatch/assign

#### Planning Status
**backend_docs_needed**

#### Handoff Notes For Future Agent
- DeliveryCard.jsx L194 is the placeholder to replace.
- Owner info: `delivery_assign` key determines button type (not `source === "own"`). Verify in code — current logic uses `source === "own"` which may need adjustment.
- The `delivery-assign-order` socket event (BUG-094) is related but separate scope.

---

### BUG-098 — Use Restaurant Profile CRM Key Instead of FE Env Keys

#### Source Summary
POS3-REQ-016. Owner addition (2026-05-18). CRM API keys currently in FE env variables with hardcoded restaurant-key mapping. Should come from restaurant profile after login.

#### Current Code / Existing UI
- **crmAxios.js** (81 lines):
  - L8: `CRM_BASE_URL = process.env.REACT_APP_CRM_BASE_URL`
  - L11-16: `CRM_API_KEYS = JSON.parse(process.env.REACT_APP_CRM_API_KEYS || '{}')`
  - L29-33: `setCrmRestaurantId(restaurantId)` looks up key from static env map
  - L38-41: `getCrmApiKey()` returns key from env map
  - L52-58: Request interceptor attaches `X-API-Key` header
- **RestaurantContext.jsx / profileTransform**: No CRM key field in profile currently. Grep confirms no `profileCrmKey`, `crm_key`, or `crmApiKey` references exist.

#### Expected CR Behavior
1. Backend adds CRM key to restaurant profile API response.
2. After login + profile load, FE reads CRM key from profile.
3. `crmAxios.js` uses profile-provided key instead of env-based map.
4. All CRM API calls use the profile key automatically.

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/api/crmAxios.js` | Refactor to accept profile-provided key; optionally keep env fallback |
| `/app/frontend/src/contexts/RestaurantContext.jsx` | Extract CRM key from profile response |
| `/app/frontend/src/api/transforms/profileTransform.js` | Map profile API CRM key field |
| `/app/frontend/src/pages/LoadingPage.jsx` | Ensure CRM key initialization happens after profile load |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** Backend must add CRM key field to restaurant profile API response. Field name unknown.

#### Proposed Planning Direction
1. Backend adds `crm_api_key` (or similar) to profile response.
2. `profileTransform` maps the new field.
3. `setCrmRestaurantId` is refactored to accept an optional key parameter from profile.
4. If profile key exists → use it. If not → fall back to env map (transition period).
5. Eventually deprecate env-based CRM key mapping.

#### Owner Decisions Needed
None — straightforward once backend confirms.

#### Backend / API Docs Needed
Profile API field name for CRM key — BLOCKING.

#### What Not To Touch
- `REACT_APP_CRM_BASE_URL` — base URL stays in env (separate concern from API key)
- CRM request/response structure
- Existing CRM service functions

#### Size / Risk
**Small** — primarily `crmAxios.js` refactor + profile transform mapping. Low risk with fallback strategy.

#### QA Checklist Later
- [ ] CRM search works with profile-provided key
- [ ] CRM customer lookup works
- [ ] CRM address lookup works
- [ ] Fallback to env key works when profile key is missing
- [ ] Room check-in CRM flow works
- [ ] Order entry customer search works

#### Planning Status
**backend_docs_needed**

#### Handoff Notes For Future Agent
- `crmAxios.js` is self-contained (81 lines) — easy to refactor.
- Keep env-based map as fallback during transition.
- Profile load happens in `LoadingPage.jsx` — CRM key must be set AFTER profile load completes.
- Bootstrap ordering: Auth → Profile → CRM init (current: Auth → bootstrap → CRM init from env).

---

### BUG-104 — Credit / Tab Management Module

#### Source Summary
New module CR from intake. The complete Credit/Tab Management module is not implemented. Currently, tab/credit exists only as a payment METHOD within Collect Bill (PAY-008: customer name + mobile, no customer_id).

#### Current Code / Existing UI
- **Sidebar.jsx L45:** `{ id: "credit", label: "Credit/Tab", path: "/orders/credit" }` — sidebar placeholder exists.
- **App.js:** No `/orders/credit` route registered — placeholder only.
- **CollectPaymentPanel.jsx L375-376:** `isTabPayment` logic exists within Collect Bill for tab/credit settlement.
- **constants.js L71:** `REPORT_CREDIT_ORDERS: '/api/v2/vendoremployee/paid-in-tab-order-list'` — credit orders list endpoint exists.
- **reportService.js L161-169:** `fetchCreditOrders` function exists for credit orders report.
- **BUSINESS_RULES_BASELINE_FINAL.md PAY-008:** TAB/Credit settlement sends customer name + mobile only; no `customer_id` is sent. Mobile number is the unique key.

#### Expected CR Behavior
A complete Credit/Tab Management module. Potential scope (owner must define):
- View all open credit/tab balances per customer
- Settle individual or multiple tabs
- Customer credit history
- Credit limits management
- Credit aging / overdue tracking
- Integration with CRM customer records

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/App.js` | New route: `/orders/credit` or `/credit-management` |
| `/app/frontend/src/components/layout/Sidebar.jsx` L45 | Sidebar entry already exists — wire to real route |
| New: `pages/CreditManagementPage.jsx` | Main credit module page |
| New: `components/credit/*` | Credit-specific components |
| New: `api/services/creditService.js` | Credit module API functions |
| `/app/frontend/src/api/constants.js` | New endpoint constants (beyond existing REPORT_CREDIT_ORDERS) |
| `/app/frontend/src/api/services/reportService.js` | Existing `fetchCreditOrders` may be reused or enhanced |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** Full API documentation needed. Existing `paid-in-tab-order-list` endpoint is view-only. New APIs needed for management actions (settle, history, limits).

#### Proposed Planning Direction
Cannot produce detailed plan without owner scope session. Key scope questions:
1. What screens/flows are needed?
2. What backend APIs exist vs need building?
3. CRM integration with customer_id (BUG-108 overlap)?
4. Credit limits — per-customer or per-restaurant?
5. Settlement — individual or bulk?
6. Reporting — separate or extend existing?

#### Owner Decisions Needed
Full module scope definition — BLOCKING. See OQ-CR-04 and OQ-CR-05.

#### Backend / API Docs Needed
Full API catalog for credit management — BLOCKING.

#### What Not To Touch
- Existing tab/credit payment method in Collect Bill (PAY-008)
- Existing credit orders report (REPORT_CREDIT_ORDERS)
- Payment payload shape for tab orders

#### Size / Risk
**XL (New Module)** — entire new module with route, page, components, services. High risk due to financial data and payment integration. Recommend dedicated scope session + separate sprint.

#### QA Checklist Later
(Cannot define without scope — will be created after owner session)

#### Planning Status
**xl_module_scope_session_needed**

#### Handoff Notes For Future Agent
- Sidebar entry exists at Sidebar.jsx L45 — already wired to `/orders/credit`.
- Existing `fetchCreditOrders` (reportService.js) can serve as the initial data source.
- PAY-008 baseline rule (mobile as unique key) must be respected unless explicitly changed.
- This module should be scoped as a mini-sprint, not added to the regular CR wave.

---

### BUG-105 — Settlement Module

#### Source Summary
New module CR from intake. Complete Settlement module is not implemented. No screens, flows, or APIs defined.

#### Current Code / Existing UI
- **No route or page exists** for settlement in App.js.
- **No sidebar entry** for settlement (unlike credit, which has a placeholder).
- **reportService.js L387:** "DAILY SALES REPORT (For Order Summary & TAB Settlement Stats)" — partial settlement data exists in daily sales report.
- **FilterBar.jsx L302:** "TAB Settlement - Removed as per user request" — some settlement UI was previously removed.

#### Expected CR Behavior
A complete Settlement module. Potential scope (owner must define):
- End-of-day or shift-based cash reconciliation
- Payment method breakdown (cash, card, UPI, tab, etc.)
- Expected vs actual cash count
- Shift open/close workflow
- Settlement report generation
- Discrepancy tracking

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/App.js` | New route: `/settlement` |
| `/app/frontend/src/components/layout/Sidebar.jsx` | New sidebar entry |
| New: `pages/SettlementPage.jsx` | Main settlement page |
| New: `components/settlement/*` | Settlement-specific components |
| New: `api/services/settlementService.js` | Settlement API functions |
| `/app/frontend/src/api/constants.js` | New endpoint constants |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** Full API documentation needed. No settlement-specific APIs identified in current code.

#### Proposed Planning Direction
Cannot produce detailed plan without owner scope session. Key scope questions:
1. Shift-based vs end-of-day?
2. Permission/role gate?
3. Order locking during settlement?
4. Expected vs actual cash count flow?
5. Discrepancy handling?
6. Report generation?

#### Owner Decisions Needed
Full module scope definition — BLOCKING. See OQ-CR-06, OQ-CR-07, OQ-CR-08.

#### Backend / API Docs Needed
Full API catalog for settlement — BLOCKING.

#### What Not To Touch
- Existing daily sales report (partial settlement stats must not break)
- Auth/session management (shift logic must integrate, not replace)

#### Size / Risk
**XL (New Module)** — entire new module. May require new Context for shift state. High risk due to financial reconciliation and potential auth/permission impact. Recommend dedicated scope session + separate sprint.

#### QA Checklist Later
(Cannot define without scope — will be created after owner session)

#### Planning Status
**xl_module_scope_session_needed**

#### Handoff Notes For Future Agent
- No sidebar placeholder exists (unlike BUG-104 credit).
- FilterBar.jsx L302 reference: "TAB Settlement - Removed as per user request" — ask owner about this history.
- Daily Sales Report has some settlement data — may serve as foundation.
- This module should be scoped as a mini-sprint, not added to the regular CR wave.
- Settlement may overlap with BUG-104 (Credit module) — plan together.

---

### BUG-106 — CRM Notes Integration

#### Source Summary
New CRM feature CR from intake. CRM has item-level and order-level notes per customer, but POS does not pull or display them.

#### Current Code / Existing UI
- **customerService.js** (187 lines): Has search, lookup, create, update, address functions. No notes-related function.
- **No CRM notes endpoint** defined in constants.js.
- **OrderEntry.jsx:** Customer selection flow exists; no notes display.
- **RoomCheckInModal.jsx:** Customer search flow exists; no notes display.

#### Expected CR Behavior
When a customer is selected from CRM (order entry or room check-in), item-level notes (e.g., "no onion") and order-level notes (e.g., "VIP — comp dessert") are fetched and displayed to the cashier.

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/api/services/customerService.js` | New function: `fetchCustomerNotes(customerId)` |
| `/app/frontend/src/api/constants.js` | New CRM endpoint for notes (if separate from customer detail) |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Display notes after customer selection |
| `/app/frontend/src/components/modals/RoomCheckInModal.jsx` | Display notes after customer selection |
| New component: `CustomerNotesPanel.jsx` | Reusable notes display widget |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** CRM notes API endpoint and response shape unknown.

#### Proposed Planning Direction
1. New `fetchCustomerNotes` in customerService.js.
2. Shared `CustomerNotesPanel` component for reuse in OrderEntry and RoomCheckInModal.
3. Fetch notes after customer selection (lazy load — don't block customer search).
4. Display: item-level notes prominently (affects food preparation), order-level notes as secondary info.

#### Owner Decisions Needed
Where in the UI should notes appear (sidebar, popup, inline section).

#### Backend / API Docs Needed
CRM notes endpoint — BLOCKING.

#### What Not To Touch
- Customer search/selection flow
- CRM timeout/error handling (BUG-078 pattern)

#### Size / Risk
**Medium** — new API call + new UI component. Low-moderate risk.

#### QA Checklist Later
- [ ] Notes display after customer selection in order entry
- [ ] Notes display after customer selection in room check-in
- [ ] Empty state when customer has no notes
- [ ] CRM API failure doesn't break customer selection flow

#### Planning Status
**crm_api_docs_needed**

#### Handoff Notes For Future Agent
- Plan with BUG-107 and BUG-108 as a CRM cluster — they share the `customerService.js` and `crmAxios.js` layer.
- Follow existing CRM error handling pattern (CRM_TIMEOUT from BUG-078).

---

### BUG-107 — CRM Cross-Sell / Upsell Insights

#### Source Summary
New CRM feature CR from intake. POS should display customer behavior data from CRM: top 5 favorites, last order, visit history, frequency.

#### Current Code / Existing UI
- **customerService.js:** No insights/favorites/history functions.
- **No CRM insights endpoint** defined in constants.js.
- No UI component for customer insights exists.

#### Expected CR Behavior
When a customer is selected from CRM, POS displays:
- Top 5 favorite items
- Last order details
- Last visit date
- Visit frequency
- Optional: one-tap add favorite items to cart

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/api/services/customerService.js` | New functions: `fetchCustomerInsights(customerId)` |
| `/app/frontend/src/api/constants.js` | New CRM endpoints for insights |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | Display insights panel |
| New component: `CustomerInsightsPanel.jsx` | Insights display widget |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** CRM insights API endpoints and available data points unknown.

#### Proposed Planning Direction
1. New `fetchCustomerInsights` in customerService.js.
2. New `CustomerInsightsPanel` component displaying favorites + history.
3. One-tap favorite item → add to cart (requires mapping CRM item references to menu catalog items).
4. Lazy load after customer selection.

#### Owner Decisions Needed
Which data points are available from CRM, and one-tap add-to-cart behavior.

#### Backend / API Docs Needed
CRM insights endpoints — BLOCKING.

#### What Not To Touch
- Customer selection flow
- Menu catalog data structure
- Cart item creation flow (unless one-tap add requires it)

#### Size / Risk
**Medium** — new API call + new UI component + optional cart integration. Medium risk if one-tap add-to-cart is required (maps CRM items to menu catalog).

#### QA Checklist Later
- [ ] Insights panel appears after customer selection
- [ ] Favorite items displayed correctly
- [ ] Visit history/frequency accurate
- [ ] One-tap add-to-cart works (if implemented)
- [ ] CRM API failure doesn't break customer selection

#### Planning Status
**crm_api_docs_needed**

#### Handoff Notes For Future Agent
- Plan with BUG-106 and BUG-108 as a CRM cluster.
- One-tap add-to-cart is the riskiest sub-feature — CRM item references must map to local menu catalog products by ID or name.
- If CRM doesn't provide product IDs matching the menu catalog, one-tap add may not be feasible.

---

### BUG-108 — CRM Coupon / Loyalty / Wallet Integration

#### Source Summary
New CRM payment integration CR from intake. POS does not integrate with CRM for coupon codes, loyalty points, or wallet balance. UI scaffolding exists with local/mock data.

#### Current Code / Existing UI
**Existing UI scaffolding in CollectPaymentPanel.jsx:**
- L249-250: `useLoyalty`, `useWallet` state toggles
- L251: `walletAmount` state initialized from `customer?.walletBalance`
- L253-254: `couponCode`, `couponError` state
- L502-506: `loyaltyDiscount` calculated from `customer.loyaltyPoints` (local data)
- L513-516: `walletDiscount` calculated from `customer.walletBalance` (local data)
- L641-662: Coupon validation against `customer.coupons` and hardcoded `generalCoupons` array
- L717-723: `couponDiscount`, `couponTitle`, `couponType`, `loyaltyPoints`, `walletBalance` flow into payment payload
- L765-766: `discount_amount` groups non-loyalty/non-wallet discounts
- L1017-1064: Loyalty/wallet toggle UI with balance display

**None of these call real CRM APIs.** They rely on whatever the `customer` object contains from the initial customer search — which does not include loyalty, wallet, or coupon data.

**customerService.js:** No coupon/loyalty/wallet API functions.

#### Expected CR Behavior
1. Customer selected → fetch real loyalty balance from CRM API
2. Customer selected → fetch real wallet balance from CRM API
3. Coupon entered → validate against CRM API (not local array)
4. After payment → deduct loyalty points via CRM API
5. After payment → debit wallet via CRM API
6. After payment → mark coupon as used via CRM API
7. Error handling for insufficient balance, invalid coupon, API failure

#### Files To Inspect / Modify Later

| File | Planned Role |
|---|---|
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` L249-254, L502-662, L717-784, L1017-1064 | Replace local/mock logic with CRM API calls |
| `/app/frontend/src/api/services/customerService.js` | New functions: fetchLoyaltyBalance, fetchWalletBalance, validateCoupon, redeemLoyalty, debitWallet, markCouponUsed |
| `/app/frontend/src/api/constants.js` | New CRM endpoint constants (6+ endpoints) |
| `/app/frontend/src/api/crmAxios.js` | Already set up — no change expected |
| `/app/frontend/src/api/transforms/orderTransform.js` | L717-723 payment payload — may need adjustment for CRM response format |

#### API / Socket / Backend / CRM Dependency
**BLOCKING:** 6+ CRM API endpoints unknown. Full documentation needed for coupon validation, loyalty balance, wallet balance, redemption, debit, and coupon usage.

#### Proposed Planning Direction
1. Once CRM APIs are documented: replace local data sources with API calls.
2. Fetch loyalty + wallet balances after customer selection (parallel async calls).
3. Coupon validation: replace local `generalCoupons` array and `customer.coupons` check with CRM API call.
4. Post-payment: add CRM deduction/usage API calls after successful payment (non-blocking — fire-and-forget or background confirmation).
5. The existing UI scaffolding significantly reduces implementation effort — the components, state, and payload wiring already exist.

#### Owner Decisions Needed
Coupon + loyalty + wallet combination rules (CQ-CR-11, CQ-CR-12, CQ-CR-13).

#### Backend / API Docs Needed
All 6+ CRM endpoints — BLOCKING.

#### What Not To Touch
- Existing discount calculation logic for manual/preset discounts
- Payment payload structure (already includes the right fields)
- Split bill interaction with discounts
- Collect Bill flow for non-coupon/loyalty/wallet orders

#### Size / Risk
**Large** — touches CollectPaymentPanel.jsx (architecture hotspot, 2514 lines). HIGH regression risk on bill calculations, payment payload, and discount interactions. Existing UI scaffolding reduces UI work but increases API integration complexity.

#### QA Checklist Later
- [ ] Loyalty balance fetched from CRM API
- [ ] Wallet balance fetched from CRM API
- [ ] Coupon validation works against CRM API
- [ ] Loyalty deduction happens after payment
- [ ] Wallet debit happens after payment
- [ ] Coupon marked as used after payment
- [ ] Insufficient loyalty balance handled gracefully
- [ ] Insufficient wallet balance handled gracefully
- [ ] Invalid coupon code shows error
- [ ] Existing manual/preset discounts unaffected
- [ ] Split bill with coupon/loyalty/wallet works correctly
- [ ] Payment payload includes correct values

#### Planning Status
**crm_api_docs_needed**

#### Handoff Notes For Future Agent
- The UI scaffolding at CollectPaymentPanel.jsx L249-1064 is a massive head start — most of the component structure, state management, and payload wiring already exists.
- The main work is replacing local data sources with CRM API calls and adding post-payment CRM operations.
- BUG-015 previously gated these UI elements behind feature flags — verify current flag state.
- Plan with BUG-106 and BUG-107 as a CRM cluster — they share the CRM API layer.
- CollectPaymentPanel is an architecture hotspot — changes require careful regression testing.

---

## 11. Shared File / Regression Map

| File | CRs Touching It | Regression Risk |
|---|---|---|
| `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` | BUG-099 (compact layout), BUG-108 (coupon/loyalty/wallet) | **HIGH** — 2514-line hotspot. Both CRs modify this file. Must coordinate. |
| `/app/frontend/src/components/order-entry/OrderEntry.jsx` | BUG-099 (quick billing), BUG-106 (notes display), BUG-107 (insights display) | **HIGH** — 2246-line hotspot. Multiple CRs add features. |
| `/app/frontend/src/api/services/customerService.js` | BUG-106 (notes), BUG-107 (insights), BUG-108 (coupon/loyalty/wallet) | **Medium** — 187 lines. Multiple new functions added. |
| `/app/frontend/src/api/crmAxios.js` | BUG-098 (profile key), BUG-106/107/108 (CRM cluster) | **Medium** — 81 lines. Key sourcing change affects all CRM calls. BUG-098 should land before CRM cluster. |
| `/app/frontend/src/api/constants.js` | BUG-096, BUG-097, BUG-106, BUG-107, BUG-108 | **Low** — additive changes only (new endpoint constants). |
| `/app/frontend/src/api/socket/socketEvents.js` | BUG-096 | **Low** — additive (new event constants). |
| `/app/frontend/src/api/socket/useSocketEvents.js` | BUG-096 | **Low** — additive (new event routing). |
| `/app/frontend/src/api/socket/socketHandlers.js` | BUG-096 | **Low** — additive (new handler). |
| `/app/frontend/src/contexts/MenuContext.jsx` | BUG-096 | **Low** — 131 lines. Socket subscription added. |
| `/app/frontend/src/App.js` | BUG-104, BUG-105 | **Low** — additive (new routes). |
| `/app/frontend/src/components/layout/Sidebar.jsx` | BUG-104 (exists), BUG-105 (new) | **Low** — additive. |
| `/app/frontend/src/components/cards/DeliveryCard.jsx` | BUG-097 | **Low** — 224 lines. Placeholder replacement. |

**Critical coordination point:** BUG-098 (profile CRM key) should land BEFORE BUG-106/107/108 (CRM cluster) since the CRM cluster relies on the CRM API layer that BUG-098 modifies.

---

## 12. Suggested Question Packets

### Owner Scope Packet

**For: Owner / Product**
**CRs: BUG-099, BUG-104, BUG-105**

> **BUG-099 — QSR Quick Billing:**
> 1. Should quick billing be a restaurant-profile toggle (QSR mode), automatic for prepaid orders, or order-type-based? (Recommend: profile toggle)
> 2. Which Collect Payment sections can be collapsed/hidden for QSR? (Recommend: condensed bill summary + payment pills only)
> 3. Can one-step quick billing reuse the existing `placeOrderWithPayment` API? (Recommend: yes — it already supports prepaid payload)
>
> **BUG-104 — Credit / Tab Management Module:**
> 4. What screens and flows are needed? (View balances, settle tabs, history, limits, aging?)
> 5. Should credit integrate with CRM customer_id or stay mobile-number-based (current PAY-008)?
> 6. Credit limits — per-customer or per-restaurant?
> 7. Settlement — individual or bulk?
>
> **BUG-105 — Settlement Module:**
> 8. Shift-based or end-of-day-based?
> 9. Who can perform settlement (role/permission)?
> 10. Should settlement lock further orders until next shift opens?
> 11. What was the context for removing TAB Settlement from FilterBar (L302)?

### Backend/API Packet

**For: Backend / API team**
**CRs: BUG-096, BUG-097, BUG-098, BUG-104, BUG-105**

> **BUG-096 — Menu Socket:**
> 1. What are the socket event names for menu item add/update?
> 2. What is the payload shape for menu update events?
> 3. Are hold/unpaid order changes covered by existing order socket events?
>
> **BUG-097 — Delivery Dispatch + Assign:**
> 4. What is the dispatch API endpoint and payload?
> 5. What is the "list assignable users" API endpoint?
> 6. What is the "assign delivery boy" API endpoint and payload?
> 7. What response/socket event confirms success?
>
> **BUG-098 — Profile CRM Key:**
> 8. Does the profile API response already include a CRM key field?
> 9. If not, what field name will be used?
> 10. Should env-based CRM key mapping be kept as fallback?
>
> **BUG-104 + BUG-105:**
> 11. What backend APIs exist or need to be built for credit management?
> 12. What backend APIs exist or need to be built for settlement?

### CRM API Packet

**For: CRM team / Backend CRM**
**CRs: BUG-106, BUG-107, BUG-108**

> **BUG-106 — CRM Notes:**
> 1. What is the API endpoint for fetching customer notes (item-level + order-level)?
> 2. What is the response shape?
> 3. Read-only from POS, or editable?
>
> **BUG-107 — CRM Insights:**
> 4. What API endpoints provide customer behavior data (favorites, history, frequency)?
> 5. What specific data points are available today?
>
> **BUG-108 — CRM Coupon / Loyalty / Wallet:**
> 6. Coupon validation endpoint + request/response?
> 7. Loyalty balance fetch endpoint + response?
> 8. Wallet balance fetch endpoint + response?
> 9. Loyalty redemption endpoint + request?
> 10. Wallet debit endpoint + request?
> 11. Coupon usage marking endpoint + request?
> 12. Can coupon + loyalty + wallet combine on the same order?
> 13. How does CRM coupon discount interact with manual/preset discounts?

---

## 13. CR Implementation Handoff Strategy

### Ready-Now CRs
- **BUG-099** can start immediately with Part 2 (compact Collect Payment layout). Part 1 (quick billing) can start after owner answers OQ-CR-01/02/03.

### Blocked CRs — Sequence After Docs Arrive
1. **BUG-098** (Small) — should be implemented first in Wave CR-B because it changes the CRM key sourcing that BUG-106/107/108 depend on.
2. **BUG-096** (Medium) — can start as soon as socket event names arrive.
3. **BUG-097** (Medium) — can start as soon as API docs arrive.

### CRM Cluster — Plan Together
- **BUG-106, BUG-107, BUG-108** should be planned as a coordinated cluster once CRM API docs arrive.
- Recommended internal sequence: BUG-106 (notes, simplest) → BUG-107 (insights) → BUG-108 (coupon/loyalty/wallet, most complex).
- All three share `customerService.js` and `crmAxios.js`.

### XL Module CRs — Separate Sprints
- **BUG-104** and **BUG-105** each need dedicated owner scope sessions before implementation planning.
- Recommend scoping BUG-104 and BUG-105 together in one session (they may overlap — credit settlement vs general settlement).
- Each module should be its own sprint or half-sprint.

### Recommended Overall Sequence
1. **Wave CR-A:** BUG-099 (start now — Part 2 compact layout)
2. **Wave CR-B:** BUG-098 → BUG-096 → BUG-097 (as docs arrive)
3. **Wave CR-C:** BUG-106 → BUG-107 → BUG-108 (after CRM API docs + after BUG-098 lands)
4. **Wave CR-D:** BUG-104 → BUG-105 (after owner scope sessions, as separate sprints)

### Required Docs Before Implementation
- Socket event catalog (BUG-096)
- Delivery API docs (BUG-097)
- Profile API CRM key field confirmation (BUG-098)
- CRM Notes/Insights/Coupon/Loyalty/Wallet API docs (BUG-106/107/108)
- Credit module scope definition (BUG-104)
- Settlement module scope definition (BUG-105)

### Approval Gates Required
- BUG-099: Owner approval of QSR mode toggle mechanism before Part 1 implementation
- BUG-104: Owner scope session approval before any implementation
- BUG-105: Owner scope session approval before any implementation
- BUG-108: Owner approval of discount combination rules before implementation

### No-Baseline-Update Rule
This planning document does not update `/app/memory/final/`. Final baseline docs should only be updated after CRs are implemented, verified, and approved.

---

## 14. Final Status

**pos3_cr_master_plan_created_with_owner_questions**

| Metric | Value |
|---|---|
| Total CRs planned | 9 |
| Ready for implementation now | 1 (BUG-099) |
| Awaiting backend/API docs | 3 (BUG-096, BUG-097, BUG-098) |
| Awaiting CRM API docs | 3 (BUG-106, BUG-107, BUG-108) |
| XL modules needing owner scope session | 2 (BUG-104, BUG-105) |
| Owner scope questions | 8 (OQ-CR-01 through OQ-CR-08) |
| Backend/API questions | 13 (BQ-CR-01 through BQ-CR-13) |
| CRM API questions | 13 (CQ-CR-01 through CQ-CR-13) |
| Missing source docs | 8 (one per blocked CR) |
| CR waves recommended | 4 (CR-A through CR-D) |
| Shared file conflicts identified | 2 critical (CollectPaymentPanel, OrderEntry) |
| Code changed | NO |
| `/app/memory/final/` updated | NO |
| Baseline docs updated | NO |
| QA run | NO |

---

*— POS3.0 CR Master Planning — 2026-05-18 —*
