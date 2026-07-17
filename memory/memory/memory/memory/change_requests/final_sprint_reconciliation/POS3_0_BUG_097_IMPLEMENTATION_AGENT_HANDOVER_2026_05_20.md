# POS3.0 BUG-097 Implementation Agent Handover — 2026-05-20

> **Purpose**: Complete handover document for the next implementation agent, grounded in baseline docs.
> **Bug**: BUG-097 — Delivery Dispatch + Assign Rider
> **Branch**: `20-may`
> **Baseline**: `/app/memory/final/` (8 docs restored from remote)

---

## 1. Mandatory Pre-Read (per IMPLEMENTATION_AGENT_RULES.md)

| # | Doc | Path | Status |
|---|-----|------|--------|
| 1 | Architecture Decisions | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | Available |
| 2 | Module Decisions | `/app/memory/final/MODULE_DECISIONS_FINAL.md` | Available |
| 3 | Change Request Playbook | `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | Available |
| 4 | Open Questions | `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` | Available |
| 5 | Implementation Rules | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | Available |
| 6 | Business Rules Baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` | Available |
| 7 | BUG-097 Sprint Docs | `/app/memory/change_requests/final_sprint_reconciliation/` | 9 docs |

---

## 2. Affected Module Mapping (per MODULE_DECISIONS_FINAL.md)

| Module | Role in BUG-097 | Risk Level |
|--------|----------------|------------|
| **Dashboard / POS Workspace** | Primary — OrderCard + TableCard delivery button states | HIGH (hotspot: DashboardPage.jsx) |
| **Order Entry / Cart / Payment** | CartPanel "Delivered" → "Collect Bill" label | HIGH (hotspot: OrderEntry.jsx) |
| **Realtime Socket** | `delivery-assign-order` handler rewritten to use payload | HIGH (hotspot: socketHandlers.js) |
| **Order Transform** | `riderStatus` computation from `delivery_man_status` | MEDIUM |
| Non-delivery modules | NOT AFFECTED — must remain unchanged | — |

---

## 3. What Has Been Implemented (Buckets 0–4.5)

### Bucket 0 — Runtime/API Verification
- Confirmed preprod APIs respond correctly for delivery flows
- Socket `delivery-assign-order` event verified with live capture

### Bucket 1 — Transform + Foundation
- `orderTransform.js` L289-309: `deliveryManId`, `rider`, `riderPhone`, `riderStatus` mapped from backend fields
- `profileTransform.js` L127: `deliveryAssign: toBoolean(api.delivery_assign)` — restaurant profile field

### Bucket 2 — Dispatch API Wiring
- `deliveryService.js`: `dispatchOrder()` — PUT order-status-update with `order_dispatch_status: "Yes"`
- OrderCard + TableCard: Dispatch button for `delivery_assign = No` tenants

### Bucket 3 — Delivered/Handover Flow
- OrderCard L963 + TableCard L510: fOrderStatus 5 button label ~~`isDelivery ? 'Handover' : 'Bill'`~~ → **REVERTED to 'Bill' for all order types (2026-05-21 owner correction)**
- KOT hidden for delivery at fOrderStatus 5

### Bucket 4 — Assign Rider Modal + API
- `AssignRiderModal.jsx` (233 lines): POST `delivery-employee-list`, POST `delivery-order-assign`
- Radio single-select, name + phone, Cancel/Assign CTA
- Mounted in OrderCard L992 and TableCard L603

### Bucket 4.5 — Corrective Patches (all owner-confirmed)

| Fix | Files | Summary |
|-----|-------|---------|
| Gap 1: Socket payload | `socketEvents.js`, `socketHandlers.js` | `DELIVERY_ASSIGN_ORDER` moved to `EVENTS_WITH_PAYLOAD`; handler uses `payload.orders[0]` directly, GET fallback only if missing |
| Gap 2: Optimistic update | `OrderCard.jsx`, `TableCard.jsx` | `onAssigned` wired — merges `{deliveryManId, rider, riderPhone, riderStatus}` into context immediately after API success |
| Gap 3: Serve fall-through | `OrderCard.jsx`, `TableCard.jsx` | fOrderStatus 2 branching restructured: `isDelivery ? (no rider → Assign/Dispatch, has rider → Waiting) : Serve` |
| Waiting for Rider label | `OrderCard.jsx`, `TableCard.jsx` | hasRiderAssigned → disabled "Waiting for Rider" / "Waiting.." (not Reassign, not Serve) |
| TableCard height | `TableCard.jsx` | Shortened to "Waiting.." to prevent 2-line wrap |
| Endpoint URLs | `constants.js` | v1 → v2 for `delivery-order-assign` and `delivery-order-cancel` |

---

## 4. What Remains To Implement

### 4A. "Delivered" → "Collect Bill" (OWNER APPROVED — ready to implement)

**Approval Gate:**
- Request: Owner screenshot showed "Delivered ₹32" in Order Entry panel — should be "Collect Bill"
- Change Type: local UI fix (label only)
- Affected Module: Order Entry / Cart
- Primary File: `CartPanel.jsx` L1266
- Related APIs: None
- State Impact: None
- UI Impact: Delivery order bill button label only
- Regression Risks: LOW — label-only, no logic change
- Open Decisions: None
- Safe Without Clarification: YES

**File-Level Change Plan:**
- File: `src/components/order-entry/CartPanel.jsx`
- Line: 1266
- Current: `{isRoom ? 'Checkout' : orderType === 'delivery' ? 'Delivered' : 'Collect Bill'}`
- Proposed: `{isRoom ? 'Checkout' : 'Collect Bill'}`
- Risk: LOW
- Downstream: None — label only

### 4B. Reassign Button Branching (OWNER APPROVED — ready to implement)

**Approval Gate:**
- Request: After rider assigned, "Waiting.." should stay only for `riderStatus === 'riderAssigned'` (pending accept). For `riderReached` (accepted) or any other status, show clickable "Reassign" button.
- Change Type: local UI fix (button state branching)
- Affected Module: Dashboard / POS Workspace
- Primary Files: `OrderCard.jsx` (~L917-926), `TableCard.jsx` (~L470-482)
- Related APIs: None
- State Impact: None — reads existing `order.riderStatus` / `table.order?.riderStatus`
- UI Impact: Delivery cards at fOrderStatus 2 only
- Regression Risks: LOW — adds sub-branch inside existing delivery-only code path
- Open Decisions: None
- Safe Without Clarification: YES

**File-Level Change Plan:**

File 1: `src/components/cards/OrderCard.jsx`
- Location: L917-926 (hasRiderAssigned branch)
- Current: Always shows disabled "Waiting for Rider"
- Proposed: `riderStatus === 'riderAssigned'` → "Waiting for Rider" (disabled), else → "Reassign" (clickable, opens AssignRiderModal)
- Risk: LOW
- Downstream: None

File 2: `src/components/cards/TableCard.jsx`
- Location: L470-482 (hasRiderAssigned branch)
- Current: Always shows disabled "Waiting.."
- Proposed: `riderStatus === 'riderAssigned'` → "Waiting.." (disabled), else → "Reassign" (clickable, opens AssignRiderModal)
- Risk: LOW
- Downstream: None

---

## 5. Blocked Items (DO NOT implement)

| Item | Blocker | Dependency ID |
|------|---------|---------------|
| Rider accept → status change | Backend must confirm if `f_order_status` changes on accept | BQ-097-2 |
| Rider reject → cashier notification | Backend clears `delivery_man` to null — rejected rider identity lost | BQ-097-5 |
| Rejected rider grey-out in modal | Backend needs `rejected_delivery_man_ids` in socket payload | BQ-097-4 |
| Rider name disappears after time | Parked — needs live console debug to identify overwrite source | — |
| Bucket 5 full socket wiring | Depends on BQ-097-2/3/4/5 | — |

---

## 6. Parked Items (DO NOT implement)

| Item | Reason |
|------|--------|
| `DeliveryCard.jsx` deletion | Owner said do not delete yet — legacy/unused |
| Dispatch flow smoke test (`delivery_assign=No`) | No tenant available for testing |

---

## 7. Business Rules (source of truth)

| Rule | Value | Source |
|------|-------|--------|
| Dispatch vs Assign decision | `delivery_assign` from restaurant profile | Owner directive 2026-05-20 |
| Do NOT use `source`/`isOwn`/`order_in` for this decision | — | Owner directive 2026-05-20 |
| Active delivery card surfaces | OrderCard + TableCard only | Owner directive |
| DeliveryCard | Legacy/unused — do not switch to, do not delete | Owner directive |
| Non-delivery orders | Must remain completely unchanged | Owner directive |
| KOT hidden | Only for delivery at fOrderStatus 2 and 5 | Owner directive |
| Handover label | ~~fOrderStatus 5 delivery cards only~~ **REVERTED — "Bill" for all order types including delivery** | Owner correction 2026-05-21 |
| "Collect Bill" label | All non-room orders in CartPanel (including delivery) | Owner directive 2026-05-20 |
| "Reached" rider status pill | Should show **"Order Accepted"** not "Reached" after rider accepts | Owner correction 2026-05-21 |
| This app = cashier only | Rider acceptance/tracking is a separate app | Owner clarification 2026-05-21 |

---

## 8. Endpoint Reference

| Constant | URL | Method | Used By |
|----------|-----|--------|---------|
| `DELIVERY_EMPLOYEE_LIST` | `/api/v1/vendoremployee/delivery-employee-list` | POST | AssignRiderModal |
| `DELIVERY_ORDER_ASSIGN` | `/api/v2/vendoremployee/order/delivery-order-assign` | POST | AssignRiderModal |
| `DELIVERY_ORDER_CANCEL` | `/api/v2/vendoremployee/order/delivery-order-cancel` | POST | Not yet wired (Bucket 5) |
| `ORDER_STATUS_UPDATE` | (existing) | PUT | dispatchOrder() |

---

## 9. Socket Reference

| Event | Channel | Handler | Payload? |
|-------|---------|---------|----------|
| `delivery-assign-order` | `new_order_{restaurantId}` | `handleDeliveryAssignOrder` | YES — full `{orders: [...]}` |

Fires on: rider assign, rider cancel/reject. Handler uses payload directly (Gap 1 fix). GET API fallback only if payload missing.

---

## 10. Key File Index

| File | BUG-097 Relevance |
|------|-------------------|
| `src/api/constants.js` L31-33 | Delivery endpoint URLs |
| `src/api/services/deliveryService.js` | dispatch, getDeliveryEmployees, assignDeliveryRider |
| `src/api/transforms/orderTransform.js` L289-309 | Rider field mapping + riderStatus computation |
| `src/api/transforms/profileTransform.js` L127 | `deliveryAssign` boolean |
| `src/api/socket/socketEvents.js` L62, L114 | `DELIVERY_ASSIGN_ORDER` in `EVENTS_WITH_PAYLOAD` |
| `src/api/socket/socketHandlers.js` L588-642 | `handleDeliveryAssignOrder` — payload-first handler |
| `src/components/cards/OrderCard.jsx` L80-82, L889-940, L754-808, L992-1005 | deliveryAssign, button branching, rider section, AssignRiderModal mount |
| `src/components/cards/TableCard.jsx` L70-73, L433-500, L603-610 | Same pattern as OrderCard |
| `src/components/modals/AssignRiderModal.jsx` | Full modal — rider list, assign API, onAssigned callback |
| `src/components/order-entry/CartPanel.jsx` L1266 | "Delivered" / "Collect Bill" label |
| `src/components/cards/DeliveryCard.jsx` | LEGACY — unused, do not touch |

---

## 11. Testing Checklist (per IMPLEMENTATION_AGENT_RULES.md)

After implementing items 4A + 4B:

| # | Test | Expected |
|---|------|----------|
| 1 | `yarn build` | 0 errors |
| 2 | Delivery order, no rider, fOS2, `delivery_assign=Yes` | "Assign Rider" button |
| 3 | Delivery order, rider assigned, `riderStatus='riderAssigned'` | "Waiting for Rider" / "Waiting.." disabled |
| 4 | Delivery order, rider accepted, `riderStatus='riderReached'` | "Reassign" clickable |
| 5 | Delivery order, fOS5 | "Handover" button |
| 6 | CartPanel delivery order | "Collect Bill ₹XX" (not "Delivered") |
| 7 | CartPanel dine-in order | "Collect Bill" unchanged |
| 8 | CartPanel room order | "Checkout" unchanged |
| 9 | Non-delivery cards (dine-in, takeaway, room) | Ready/Serve/Bill unchanged |
| 10 | TableCard grid height | Consistent across delivery cards |

---

## 12. Decision Log

| Date | Decision | By |
|------|----------|----|
| 2026-05-20 | `delivery_assign` from profile is source of truth | Owner |
| 2026-05-20 | After assign: no Serve, show Waiting then Reassign | Owner |
| 2026-05-20 | "Delivered" → "Collect Bill" in CartPanel | Owner |
| 2026-05-20 | Reassign for accepted rider (`riderReached`), Waiting only for `riderAssigned` | Owner |
| 2026-05-20 | Rejected rider grey-out blocked on backend `rejected_delivery_man_ids` | Owner |
| 2026-05-20 | Rider name display after rejection blocked on backend keeping `delivery_man` | Owner |
| 2026-05-20 | Rider name disappears — parked, needs console debug | Owner |
| 2026-05-20 | Do not delete DeliveryCard.jsx | Owner |
| 2026-05-20 | Do not implement Bucket 5 until backend provides event contracts | Owner |

---

## 13. BUG-097 Sprint Docs Index

| Doc | Path |
|-----|------|
| Bucket 4.5 Implementation Report | `POS3_0_BUG_097_BUCKET_4_5_IMPLEMENTATION_REPORT_2026_05_20.md` |
| Bucket 5 Planning Notes | `POS3_0_BUG_097_BUCKET_5_PLANNING_NOTES_2026_05_20.md` |
| Gap 1+2+3 Approval Plan | `POS3_0_BUG_097_GAP_123_APPROVAL_PLAN_2026_05_20.md` |
| Owner Smoke QA Checklist v5 | `POS3_0_BUG_097_OWNER_SMOKE_QA_CHECKLIST_2026_05_20.md` |
| Owner Smoke QA Report v5 | `POS3_0_BUG_097_OWNER_SMOKE_QA_REPORT_2026_05_20.md` |
| Waiting for Rider Corrective Plan | `POS3_0_BUG_097_WAITING_FOR_RIDER_CORRECTIVE_PLAN_2026_05_20.md` |
| Waiting for Rider Patch Note | `POS3_0_BUG_097_WAITING_FOR_RIDER_PATCH_2026_05_20.md` |
| Focused Corrective Approval Plan | `POS3_0_BUG_097_FOCUSED_CORRECTIVE_APPROVAL_PLAN_2026_05_20.md` |
| Focused Continuation Status | `POS3_0_BUG_097_FOCUSED_CONTINUATION_STATUS_2026_05_20.md` |

All under: `/app/memory/change_requests/final_sprint_reconciliation/`

---

## 14. Handover Summary (per IMPLEMENTATION_AGENT_RULES.md)

- **Request completed**: BUG-097 Buckets 0–4.5 (Dispatch, Assign Rider, Socket payload, Optimistic update, Serve fix, Waiting label, Height fix, Endpoint v2)
- **Modules touched**: Dashboard (OrderCard, TableCard), Socket (socketHandlers, socketEvents), Order Entry (CartPanel — pending), Transform (orderTransform, profileTransform)
- **Files changed**: `constants.js`, `deliveryService.js`, `socketEvents.js`, `socketHandlers.js`, `OrderCard.jsx`, `TableCard.jsx`, `AssignRiderModal.jsx` (new file)
- **What changed functionally**: Delivery orders now show Assign Rider / Dispatch / Waiting / Reassign / Handover based on `delivery_assign` profile setting and `riderStatus`. Socket uses payload directly. Optimistic update on assign.
- **What was intentionally not changed**: DeliveryCard.jsx, non-delivery behavior, CollectPaymentPanel, room/print/financial logic
- **Known limitations remaining**: Rider name disappears (parked), rejected rider grey-out (backend blocked), "Delivered" label (approved, not yet applied), Reassign branching on riderStatus (approved, not yet applied)
- **Tests executed**: `yarn build` PASS, owner live smoke on preprod
- **Docs updated**: 9 BUG-097 docs created, QA report/checklist at v5, baseline docs restored from remote
