# POS3.0 Bug-Fix Master Implementation Plan — 2026-05-18

## 1. Purpose

This is the **single consolidated implementation plan** for the POS3.0 Bug-Fix Sprint, covering all 13 bug-fix items (BUG-087 → BUG-095 and BUG-100 → BUG-103).

This plan consolidates outputs from the POS3.0 Requirement Source, POS3.0 Carry-Forward, Room Transfer v2 migration doc, Socket Elimination doc, and the POS3.0 Bug Impact Analysis (main + addendum) into one handoff artifact for the implementation agent.

### Scope Constraints
- No implementation was done.
- No code was changed.
- No final baseline (`/app/memory/final/`) was updated.
- No pending freeze doc was updated.
- No QA was executed.
- This document is the handoff artifact for the implementation agent.
- **Out of scope for this plan:** BUG-096, BUG-097, BUG-098, BUG-099, BUG-104, BUG-105, BUG-106, BUG-107, BUG-108 (these are Change Requests, planned under a separate POS3.0 CR sprint plan).

> **Classification correction note (2026-05-18 owner review pass):**
> After the Owner Review Gate, BUG-101 was confirmed missing from the print template by the owner (validated against a live print response showing no `delivery_charge_gst_amount` slot). BUG-101 remains in **Wave 3 / Bucket C** as a notify-when-shipped item. **No FE work** until backend ships the template slot. The authoritative evidence trail for all 9 review-gate decisions, the full Q&A capture, and the final backend question packet (2 open + 1 FYI) live in:
> `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_PLANNING_OWNER_BACKEND_QUESTION_CAPTURE_2026_05_18.md`

### Sprint Identity
| Field | Value |
|---|---|
| Sprint | pos3.0 |
| Normalized Sprint Name | POS3_0 |
| Repo | https://github.com/Abhi-mygenie/core-pos-front-end-.git |
| Branch | 18-may-pos3.0 |
| Commit (planning baseline) | `0e0bf0a` |
| Local `/app` handling | Wiped and fresh pulled (Setup Mode 3A) |
| Total bugs planned | 13 |

---

## 2. Inputs Read

| Input | Path |
|---|---|
| POS3.0 Carry-Forward | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_CARRY_FORWARD_2026_05_18.md` |
| POS3.0 Requirement Source For Intake | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_REQUIREMENT_SOURCE_FOR_INTAKE_2026_05_18.md` |
| Eliminate get-single-order-new from Socket Handlers | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ELIMINATE_GET_SINGLE_ORDER_FROM_SOCKET_HANDLERS.md` |
| Room Transfer v2 Migration | `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_ROOM_TRANSFER_V2_MIGRATION.md` |
| POS3.0 Bug Impact Analysis (BUG-087 → BUG-102) | `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS.md` |
| POS3.0 Bug Impact Analysis Addendum (BUG-103 → BUG-108) | `/app/memory/bugs/POS3_0_BUG_IMPACT_ANALYSIS_ADDENDUM.md` |
| POS2.0 Final Implementation Summary | `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_FINAL_IMPLEMENTATION_SUMMARY_2026_05_18.md` |
| POS2.0 QA Bug Status Matrix | `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_QA_BUG_STATUS_MATRIX_2026_05_18.md` |
| Business rules baseline | `/app/memory/final/BUSINESS_RULES_BASELINE_FINAL.md` |
| Architecture decisions | `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` |
| Module decisions | `/app/memory/final/MODULE_DECISIONS_FINAL.md` |
| Implementation agent rules | `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` |
| Open questions final resolution | `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` |
| Final docs approval status | `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` |
| Bug template (sprint pos3.0 batch) | `/app/memory/BUG_TEMPLATE.md` (lines 6396–7385 + 7394–7758) |

Reference templates (planning style mirrored from these):
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_MASTER_IMPLEMENTATION_PLAN_2026_05_17.md`
- `/app/memory/change_requests/final_sprint_reconciliation/POS2_0_MASTER_PLAN_AUDIT_AND_CORRECTION_2026_05_17.md`

---

## 3. Full Sprint Bug Inventory (13 bugs)

| # | Bug | Priority | Owner | Bucket | Status | Summary |
|---|---|---|---|---|---|---|
| 1 | BUG-087 | P0 | Joint | B | blocked_backend | PayLater "PAID" badge — backend `payment_type`/`payment_method` contract |
| 2 | BUG-088 | P1 | Joint | B | blocked_backend | Room Transfer v1→v2 endpoint + v2 socket event with full payload |
| 3 | BUG-089 | P1 | Frontend | A | ready_for_implementation | Stop redundant API call on `update-food-status` |
| 4 | BUG-090 | P2 | Backend | C | blocked_backend | Store CRM `customer_id` on room orders during check-in |
| 5 | BUG-091 | P2 | Backend | C | ready_for_implementation_backend_side | CRM search API duplicate dedup |
| 6 | BUG-092 | P2 | Backend | C | blocked_backend | Phone format contract for room check-in (`+91` vs raw) |
| 7 | BUG-093 | P3 | Backend | C | ready_for_implementation_backend_side | Add `room_info.checkin_date` to `get-single-order-new` |
| 8 | BUG-094 | P3 | Joint | C | blocked_backend | `delivery-assign-order` socket must carry full order payload |
| 9 | BUG-095 | P2 | Frontend | D | ready_for_implementation_after_088_089 | Delete `handleUpdateFoodStatus` + `fetchSingleOrderForSocket` cleanup |
| 10 | BUG-100 | P1 | Frontend | A | ready_for_implementation | Remove duplicate local toast notifications when socket/FCM covers event |
| 11 | BUG-101 | P3 | Backend | C | backend_blocked (confirmed missing) | Print template GST display slot for `delivery_charge_gst_amount` — confirmed absent from print payload (owner-verified 2026-05-18); backend must add the slot. No FE work. |
| 12 | BUG-102 | P0 | Frontend | A | ready_for_implementation | Mark Ready/Served 8s hardcoded timeout → socket-driven reset (~2s fallback) |
| 13 | BUG-103 | P2 | Frontend | A | ready_for_implementation | Hide native number-input spinner arrows across POS |

---

## 4. Sprint Counts

| Category | Count | Bugs |
|---|---|---|
| FE-only, implementable NOW (Bucket A) | **4** | BUG-089, BUG-100, BUG-102, BUG-103 |
| Backend-blocked, critical (Bucket B) | **2** | BUG-087, BUG-088 |
| Backend-blocked / backend-owned (Bucket C) | **6** | BUG-090, BUG-091, BUG-092, BUG-093, BUG-094, BUG-101 |
| Sequential cleanup, depends on B-088 + A-089 (Bucket D) | **1** | BUG-095 |
| **Total** | **13** | |

| Owner split | Count |
|---|---|
| Frontend-only | 5 (BUG-089, 095, 100, 102, 103) |
| Backend-only or backend-first | 6 (BUG-090, 091, 092, 093, 094, 101) |
| Joint (backend contract + FE fix) | 2 (BUG-087, BUG-088) |

| Priority distribution | Count |
|---|---|
| P0 | 2 (BUG-087, BUG-102) |
| P1 | 3 (BUG-088, BUG-089, BUG-100) |
| P2 | 5 (BUG-090, BUG-091, BUG-092, BUG-095, BUG-103) |
| P3 | 3 (BUG-093, BUG-094, BUG-101) |

---

## 5. Implementation Buckets

### Bucket A — Frontend Quick Wins (4 bugs)

**Priority:** P0 → P2 — ship immediately, no backend dependency
**Estimated effort:** 2–3 days
**Risk:** LOW → MEDIUM (BUG-102 touches a hot button path; the others are isolated)

| Bug | Fix Summary | Primary File(s) | Change Size |
|---|---|---|---|
| BUG-102 | Replace hardcoded 8s `setTimeout` in `handleMarkReadyClick` / `handleMarkServedClick` with socket-response-driven reset (listen for order update event for this `orderId`); keep ~2s fallback safety net; preserve `isActionInProgress` double-click guard | `OrderCard.jsx` L56-57, L87, L90-99, L102-111, L114-123, L754-825; `DashboardPage.jsx` L1417-1451; ref pattern from `socketHandlers.js` L607-634 (`handleOrderEngage`) | Refactor of 3 click handlers + new socket-driven hook OR effect |
| BUG-089 | Convert `handleUpdateFoodStatus` to a safe no-op for item-status events (keep room-transfer path live until BUG-088 ships); preferred: gate so the API call is skipped when `update-item-status` would also fire | `socketHandlers.js` L344-401; `socketEvents.js` L59, L118-119; `useSocketEvents.js` L137-138; `orderService.js` L34-47 | 1 handler guard + log |
| BUG-100 | Build notification source map (audit every `toast()` call vs FCM / socket coverage); remove or suppress local toasts that duplicate FCM/socket events; document missing socket coverage for backend follow-up | `NotificationContext.jsx`; `OrderEntry.jsx` action toasts; `CollectPaymentPanel.jsx` toasts; cross-cutting | Audit + remove ~N toasts + document |
| BUG-103 | Add global CSS rule in `index.css` (or `App.css`) to hide native spinner on all `input[type=number]`; verifies 6 existing inconsistent inputs in `CollectPaymentPanel.jsx` (L943, L1056, L1409, L1490, L2080, L2249-2260) | `/app/frontend/src/index.css` (preferred) OR per-input Tailwind classes on the 6 spots | 1 global CSS rule (preferred) |

**Recommended internal sequence:**
1. **BUG-102 first** — P0, user-visible peak-hour pain; smallest blast radius is `OrderCard.jsx`.
2. **BUG-089** — pure socket optimization, decoupled.
3. **BUG-103** — CSS-only, 1 minute fix; bundle with any release.
4. **BUG-100** — needs an audit pass (will require its own QA matrix of "action → toast → socket coverage").

**Bucket A QA:**
- BUG-102: Click "Mark Ready" on dine-in/walk-in/delivery orders → button re-enables within socket-response time (typically <1s); fallback timeout never fires for healthy network; socket disconnect → fallback fires at ~2s; double-click prevented; other action buttons (Print KOT, Settle, Accept/Reject) not cross-disabled longer than necessary.
- BUG-089: Kitchen marks item ready/served → only `update-item-status` processed; `get-single-order-new` API call is NOT made; order state still updates correctly; room transfer (still on legacy event until BUG-088) still works.
- BUG-100: Per the notification map, each event triggers exactly one user-visible notification; toasts that lack socket coverage remain (and are documented).
- BUG-103: All `type="number"` inputs in `CollectPaymentPanel.jsx` (Cash Received, Discount, Wallet, Tip, Delivery, Compact discount, Compact wallet, Split payment) render with no ▲▼ spinner in Chrome/Firefox/Safari; numeric keyboard input still works.

**File overlap:** None within Bucket A. `socketHandlers.js` is touched by BUG-089 only inside Bucket A; same file is touched again in Bucket D (BUG-095) but only after BUG-089 lands.

---

### Bucket B — Backend-Blocked Critical (2 bugs)

**Priority:** P0 (BUG-087), P1 (BUG-088) — highest business impact; cannot ship until backend confirms contract
**Estimated effort:** 1 day FE work after backend unblocks (plus E2E QA)
**Risk:** HIGH — both touch payment/order-lifecycle correctness

| Bug | Fix Summary | Primary File(s) | Phase Source / Reference |
|---|---|---|---|
| BUG-087 | After backend confirms PayLater `payment_type`/`payment_method` contract: trace `paymentMethod` through socket → `orderFromAPI.order` → OrderContext → DashboardPage table entries → OrderCard/TableCard; ensure exclusion check `order.paymentMethod?.toLowerCase() !== 'paylater'` actually receives data. If backend confirms PayLater uses `payment_type: 'postpaid'`, adjust badge check to `paymentType === 'prepaid'` only (drop PayLater-method exclusion fallback). | `orderTransform.js` L221-222 (`fromAPI.order`); `socketHandlers.js` L229-325 (`handleOrderDataEvent`); `DashboardPage.jsx` L553-554, L598-599, L630-631, L749-750, L771-772, L898-899, L1437; `OrderCard.jsx` L391-393, L832; `TableCard.jsx` L283-284, L450 | POS2.0 BUG-058 carry-forward + Wave 7 closure |
| BUG-088 | After backend confirms v2 endpoint + payload + socket event: (1) update `ORDER_SHIFTED_ROOM` constant from `/api/v1/...` to `/api/v2/vendoremployee/order/order-shifted-room`; (2) adjust `toAPI.transferToRoom` payload builder if v2 differs; (3) confirm `handleOrderDataEvent` handles the new v2 socket event with terminal status correctly; (4) remove optimistic clearing block in `OrderEntry.jsx` L1469-1483 once v2 socket is confirmed live in QA; (5) leave `handleUpdateFoodStatus` in place — its deletion is BUG-095. | `api/constants.js` L50; `orderTransform.js` L1344-1377; `OrderEntry.jsx` L1463-1498; `socketHandlers.js` L229-325 (already covers v2) | POS3.0 Room Transfer V2 Migration doc + POS2.0 BUG-060 Wave 7 closure |

**Recommended internal sequence:**
1. Send backend questions (see §8 — Owner / Backend Clarifications) **immediately**, before any other work.
2. When backend responds for BUG-087 → ship FE trace + final exclusion logic.
3. When backend responds for BUG-088 → ship endpoint + payload changes; QA v2 socket; THEN remove optimistic clearing in a follow-up commit.
4. Only after BUG-088 is QA-verified does BUG-095 (Bucket D) become eligible.

**Bucket B QA:**
- BUG-087: PayLater order placed via prepaid path → dashboard card shows **no** "PAID" badge; truly prepaid order → "PAID" badge shows; hold/unpaid order → no badge; audit report still correctly displays paid orders.
- BUG-088: Transfer dine-in order to a room → source table freed authoritatively by socket (not optimistic); destination room order appears; no wasted API call from legacy `update-food-status`; multi-cashier — other clients see the transfer via socket.

**Business rules to preserve:** PAY-001/002/004/007/008 (payment payload contracts), DASH-001/002/003 (hold orders on Hold tab only), ROOM-001 (room report totals).

---

### Bucket C — Backend-Owned / Backend-First (6 bugs)

**Priority:** P2 → P3 — primarily backend work; FE consumes after backend ships
**Estimated effort:** FE-side, 0.5 day per item after backend ships (mostly contract consumption)
**Risk:** MEDIUM — depends on backend delivery quality

| Bug | Fix Summary | FE Touch Points (After Backend Ships) | Owner |
|---|---|---|---|
| BUG-090 | Backend adds `customer_id` acceptance to `POST /api/v1/vendoremployee/pos/user-group-check-in`; FE includes `customer_id` in check-in payload when a CRM customer is selected | `RoomCheckInModal.jsx` L272, L357-383, L433, L449-456 (replace `isCustomerSelected` workaround with real `customer_id` field) | Backend then Frontend |
| BUG-091 | CRM backend deduplicates `GET /pos/customers?search=<phone>` results | Optionally add client-side dedup in `customerService.js` as defense-in-depth | Backend (FE optional) |
| BUG-092 | Backend clarifies phone format contract (`+91` E.164 vs raw 10 digits) for room check-in + CRM search | `RoomCheckInModal.jsx` L370-372, L433: adjust formatting/sending if contract differs from current behavior | Backend then Frontend |
| BUG-093 | Backend adds `room_info.checkin_date` to `POST /api/v2/vendoremployee/get-single-order-new` response | Room report / `RoomRowCard`: prefer `room_info.checkin_date` over `createdAt` fallback; keep fallback for safety | Backend then Frontend |
| BUG-094 | Backend adds full order payload to `delivery-assign-order` socket event | `socketHandlers.js` L535-553: switch `handleDeliveryAssignOrder` to the `handleOrderDataEvent` pattern; remove API fetch; remove `DELIVERY_ASSIGN_ORDER` from `EVENTS_REQUIRING_ORDER_API` (`socketEvents.js` L62, L122) | Backend then Frontend |
| BUG-101 | **Confirmed missing (owner-verified 2026-05-18).** Backend / print-template owner must add `delivery_charge_gst_amount` slot to the print payload echo (top-level + `raw_payload`) AND the bill print template rendering. Notify-when-shipped. | None (FE already sends the field via POS2.0 BUG-083) | Backend only |

**Recommended internal sequence:**
1. Backend ships its work in any order (no inter-dependencies within Bucket C).
2. FE picks up each item the same day backend confirms — these are mechanical.
3. BUG-091 is mostly backend; FE adds client-side dedup only if backend cannot ship in time.

**Bucket C QA:**
- BUG-090: Customer selected from CRM during room check-in → backend stores `customer_id` on the room order; FE workaround removed.
- BUG-091: Same phone in CRM search → dropdown shows each customer exactly once.
- BUG-092: Phone stored and searched in a single format consistently across check-in and CRM search.
- BUG-093: Room report check-in time column shows actual check-in date (not `createdAt`).
- BUG-094: Rider assignment → no `get-single-order-new` API call; order updates from socket payload.
- BUG-101: Print bill for a delivery order with delivery GST → printed bill shows `delivery_charge_gst_amount` line.

---

### Bucket D — Sequential Cleanup (1 bug)

**Priority:** P2 — purely cleanup; no user-visible change
**Estimated effort:** 0.5 day after BUG-088 + BUG-089 are confirmed green in QA
**Risk:** LOW (verification-heavy, code change is small)

| Bug | Fix Summary | Primary File(s) |
|---|---|---|
| BUG-095 | (1) Delete `handleUpdateFoodStatus` from `socketHandlers.js` L344-401; (2) remove `UPDATE_FOOD_STATUS` from `EVENTS` and `EVENTS_REQUIRING_ORDER_API` in `socketEvents.js` L59, L118-119; (3) remove import + case from `useSocketEvents.js` L24, L137-138; (4) delete `fetchSingleOrderForSocket` from `orderService.js` L34-47 only after verifying no other consumer (5 known report/audit references need confirmation that they call a different path); (5) update comment in `useStationSocketRefresh.js` L13 | `socketHandlers.js`; `socketEvents.js`; `useSocketEvents.js`; `orderService.js`; `useStationSocketRefresh.js` |

**Pre-conditions (must all be true before starting):**
- BUG-088 (room transfer v2) is implemented AND QA-verified live with the v2 socket event.
- BUG-089 (eliminate redundant API on `update-food-status`) is implemented AND QA-verified.
- Grep confirms `fetchSingleOrderForSocket` has no live consumer outside the socket handler chain.

**Bucket D QA:**
- Build passes; no unused-import lint errors.
- Item status events still update order state authoritatively via `update-item-status`.
- Room transfer still works end-to-end (now on v2 path).
- No socket event reaches an undefined handler.
- Smoke regression on dashboard, order entry, room flows.

---

## 6. File Touch Map (Cross-Bucket)

| File | Buckets | Bugs | Risk |
|---|---|---|---|
| `OrderCard.jsx` | A | BUG-102, BUG-087 (also B) | **HIGH** — hot card; loading state + badge surface |
| `socketHandlers.js` | A, B, C, D | BUG-089, BUG-088, BUG-094, BUG-095 | **HIGH** — central socket router; sequence matters |
| `socketEvents.js` | A, C, D | BUG-089, BUG-094, BUG-095 | MEDIUM |
| `useSocketEvents.js` | A, D | BUG-089, BUG-095 | MEDIUM |
| `orderService.js` | A, D | BUG-089, BUG-095 | MEDIUM (deletion in D) |
| `orderTransform.js` | B | BUG-087, BUG-088 | MEDIUM — `fromAPI.order` mapping + `toAPI.transferToRoom` |
| `OrderEntry.jsx` | A, B | BUG-100, BUG-088 | MEDIUM — toast cleanup + optimistic-clearing removal |
| `DashboardPage.jsx` | A, B | BUG-102, BUG-087 | MEDIUM — handler wiring + table entries |
| `TableCard.jsx` | B | BUG-087 | LOW |
| `api/constants.js` | B | BUG-088 | LOW |
| `RoomCheckInModal.jsx` | C | BUG-090, BUG-092 | LOW |
| `customerService.js` | C | BUG-091 (optional FE dedup) | LOW |
| `index.css` (or `App.css`) | A | BUG-103 | LOW |
| `NotificationContext.jsx` | A | BUG-100 | LOW |
| `CollectPaymentPanel.jsx` | A | BUG-103, BUG-100 | LOW |
| `useStationSocketRefresh.js` | D | BUG-095 (comment) | LOW |

---

## 7. Dependency Chain

```
No dependency (independent):
  Bucket A: BUG-102, BUG-089, BUG-100, BUG-103 (any order)
  Bucket C: BUG-090, BUG-091, BUG-092, BUG-093, BUG-094, BUG-101 (any order, backend-first)

Backend gate:
  Bucket B: BUG-087, BUG-088 → unblock only after backend contract response

Sequential:
  BUG-088 (B) AND BUG-089 (A) → must both ship + QA green → BUG-095 (D) cleanup
  BUG-088 (B) → optimistic clearing removal in OrderEntry.jsx L1469-1483 happens AFTER v2 socket QA-verified

Parallel tracks:
  Track 1 (FE): Bucket A immediately
  Track 2 (Backend): Bucket B questions + Bucket C work in parallel
  Track 3 (Cleanup): Bucket D after Track 1 (BUG-089) + Track 2 (BUG-088) converge
```

**Recommended parallel execution:**

| Day | Track 1 (FE Quick Wins) | Track 2 (Backend) | Track 3 (Cleanup) |
|---|---|---|---|
| Day 1 | BUG-102 (P0) | Send all backend questions (§8); start B-090/091/092/093/094/101 work | — |
| Day 2 | BUG-089, BUG-103 | Backend continues; BUG-087/088 answers expected | — |
| Day 3 | BUG-100 (audit + cleanup) | Backend ships BUG-087/088 contract | — |
| Day 4 | QA Bucket A | FE implements BUG-087, BUG-088 against confirmed contract | — |
| Day 5 | — | QA BUG-087 + BUG-088 (live socket); FE consumes Bucket C as it ships | — |
| Day 6 | — | Full regression of B + C | BUG-095 (after 088 + 089 green) |
| Day 7 | Full sprint regression | Full sprint regression | Final sprint regression |

---

## 8. Owner / Backend Clarification Questions

These questions must be sent **before** Bucket B / Bucket C work can be finalized.

### Backend-blocking questions (must answer to unblock Bucket B)

| Q-ID | Bug | Question | Blocks |
|---|---|---|---|
| Q-087-1 | BUG-087 | What is the canonical `payment_type` value sent by backend for PayLater orders — `'prepaid'` or `'postpaid'`? | BUG-087 FE fix |
| Q-087-2 | BUG-087 | Does the socket order payload (`new-order`, `update-order`, `update-order-paid`, `update-order-status`) include `payment_method` for PayLater orders, and what string value (`'paylater'`, `'PayLater'`, `'pay_later'`, etc.)? | BUG-087 FE exclusion check |
| Q-088-1 | BUG-088 | Is `POST /api/v2/vendoremployee/order/order-shifted-room` live on backend today? | BUG-088 endpoint switch |
| Q-088-2 | BUG-088 | Does the v2 endpoint accept the same payload keys as v1 (`{ order_id, payment_mode, payment_amount, payment_status: 'paid', room_id, order_discount, self_discount, comm_discount, tip_amount, vat_tax, gst_tax, service_tax, service_gst_tax_amount, tip_tax_amount }`), or a different shape? | BUG-088 payload builder |
| Q-088-3 | BUG-088 | Which v2 socket event does backend emit after room transfer — `update-order-paid`, `update-order`, or a new event? Will it carry the full order payload (`{ orders: [...] }`) like other v2 events? | BUG-088 socket handling + removal of optimistic clearing |

### Backend-blocking questions (must answer to unblock Bucket C)

| Q-ID | Bug | Question | Blocks |
|---|---|---|---|
| Q-090-1 | BUG-090 | Does `POST /api/v1/vendoremployee/pos/user-group-check-in` already accept a `customer_id` field? If not, what is the expected field name and where in the payload? | BUG-090 FE payload addition |
| Q-092-1 | BUG-092 | Phone format contract for room check-in and CRM search: `+91XXXXXXXXXX` (E.164) or raw `XXXXXXXXXX` (10 digits)? Must be consistent between check-in payload, CRM search, and storage. | BUG-092 FE formatting |
| Q-094-1 | BUG-094 | Can backend include the full order payload in the `delivery-assign-order` socket event (same shape as v2 `update-order-paid`)? | BUG-094 FE switch to payload pattern |
| Q-101-1 | BUG-101 | **Confirmed missing by owner (2026-05-18).** Backend / print-template owner must add `delivery_charge_gst_amount` to the print payload echo (top-level + `raw_payload`) AND the bill print template rendering. | BUG-101 closure |

### Backend-only items (no FE blocker, backend owns delivery)

| Q-ID | Bug | Note |
|---|---|---|
| Q-091 | BUG-091 | CRM team to dedupe results from `GET /pos/customers?search=<phone>`. FE may optionally add client-side dedup. |
| Q-093 | BUG-093 | Backend to add `room_info.checkin_date` to `get-single-order-new` response for in-house rooms. |

### Owner clarifications

None required for the 13 bug-fix items. (Owner clarification for BUG-102 was already captured in the impact analysis: socket-response-driven reset, ~2s fallback max.)

---

## 9. Business Rules Protection Checklist

The implementation agent must verify these frozen rules are preserved after each bucket.

| Rule | Applicable Buckets | Check |
|---|---|---|
| PAY-001 / PAY-002 / PAY-004 | B | Payment payload shape unchanged for normal flows |
| PAY-007 | B | PayLater settlement misspelled `'sucess'` preserved |
| PAY-008 | C, A | TAB/Credit customer name + mobile only; no `customer_id` (unrelated to BUG-090 which is room check-in) |
| DASH-001 / DASH-002 / DASH-003 | A, B | Hold orders on Hold tab only; channel/status consistency |
| ROOM-001 | B, C | Room report totals formula unchanged |
| ROUND-002, TOTALS-001/002, TAX-001..008, SC-001..006, TIP-001/002 | B | Financial math untouched by any planned bug |
| DEL-004 / DEL-005 | C | Delivery charge read-only for prepaid preserved |
| MC-02 (Architecture) | A, B, C, D | Realtime flows continue to sync through socket |
| API-03 (Architecture) | A, B | OrderEntry for composition; CollectPaymentPanel for settlement |
| EP-01 / EP-02 (Architecture) | C | Multi-variable env contract; CRM required by default |

---

## 10. Risks and Mitigation

| Risk | Bucket | Mitigation |
|---|---|---|
| Backend v2 endpoint not live → BUG-088 cannot ship | B | Hold endpoint flip until Q-088-1 confirmed; keep optimistic clearing fallback |
| `update-item-status` does not fire in all item-status flows → BUG-089 breaks rapid item updates | A | Convert handler to safety no-op first; full deletion deferred to BUG-095 |
| Local-toast removal regresses user feedback when FCM is delayed/fails | A | Per-action audit before removal; document required socket coverage gaps |
| Socket-driven reset for BUG-102 never receives a confirming event → button never re-enables | A | Mandatory 2s fallback timer; keep `isActionInProgress` double-click guard |
| `fetchSingleOrderForSocket` deletion (BUG-095) breaks an unknown consumer (5 report/audit references) | D | Grep + manual verification before delete; ship cleanup in its own commit |
| PayLater contract differs across socket events (some include `payment_method`, others don't) → BUG-087 still flaky | B | After backend confirms, write a normalized resolver in `orderFromAPI.order` rather than per-card defensive checks |
| Phone format contract change breaks existing customer search history | C | Backend confirms first; FE pins format consistently across check-in and search in one commit |

---

## 11. Handoff To Implementation Agent

### Start here:
1. Read this master plan in full.
2. Send all questions in §8 to backend / owner **immediately**.
3. Implement Bucket A in the recommended order (BUG-102 → BUG-089 → BUG-103 → BUG-100).
4. QA Bucket A.
5. As backend answers arrive, implement Bucket B (BUG-087 then BUG-088) and pull Bucket C items.
6. After BUG-088 + BUG-089 are QA-green, implement Bucket D (BUG-095).

### Critical rules:
- **Never modify `/app/memory/final/`** during implementation — only after full QA + owner reconfirmation.
- **Never promote pending-freeze rules to baseline** — that requires a separate approval cycle.
- **Preserve `data-testid` attributes** on any element you touch in OrderCard / TableCard.
- **For BUG-088: keep the optimistic clearing block in place until the v2 socket event is observed live in QA**, then remove in a follow-up commit.
- **For BUG-089: do not delete `handleUpdateFoodStatus` yet**. That is BUG-095's responsibility, and only after BUG-088 + BUG-089 are both green.
- **For BUG-100: produce a notification source map artifact** (toast → event coverage) alongside the implementation so backend can pick up the gaps.

### Per-bucket handover:
After each bucket, produce:
1. Implementation summary (files changed, what changed).
2. QA report (assertions passed/failed; regression list checked).
3. Business rules protection checklist (§9) verified.

### When blocked items unblock:
- Q-087-1/2 answered → BUG-087 ships in Bucket B.
- Q-088-1/2/3 answered → BUG-088 ships in Bucket B; optimistic clearing removal follows after live socket QA.
- Q-090-1, Q-092-1, Q-094-1, Q-101-1 answered → respective Bucket C items ship.
- BUG-091 (CRM dedup) and BUG-093 (check-in date field) are backend-only ships; FE consumes when available.

---

## 12. Final Status

`master_implementation_plan_created_for_pos3_0_bug_fix_sprint`

### Summary

| Metric | Count |
|---|---|
| Total POS3.0 bugs (in scope of this plan) | 13 |
| FE-only implementable now (Bucket A) | 4 |
| Backend-blocked critical (Bucket B) | 2 |
| Backend-owned / first (Bucket C) | 6 |
| Sequential cleanup (Bucket D) | 1 |
| Implementation buckets | 4 |
| Estimated calendar days | 7 (with parallel tracks) |
| Highest-risk items | BUG-087, BUG-088 (Bucket B — payment + room lifecycle) |
| Fastest turnaround items | BUG-103, BUG-089, BUG-102 (Bucket A) |
| P0 items | 2 (BUG-087, BUG-102) |
| P1 items | 3 (BUG-088, BUG-089, BUG-100) |
| Backend clarification questions | **2 open + 1 FYI** after 2026-05-18 owner review pass (Q-090-B-1 `customer_id` field, Q-101-1 `delivery_charge_gst_amount` slot; Q-091 FYI on CRM dedup). Reduced from original 9 — see Owner/Backend Question Capture addendum for full evidence trail. |
| Owner clarification questions | 0 |
| Out-of-scope items (deferred to POS3.0 CR sprint) | 9 (BUG-096, 097, 098, 099, 104, 105, 106, 107, 108) |

### Confirmation
- No code was changed.
- `/app/memory/final/` was not updated.
- `/app/memory/BUG_TEMPLATE.md` was not modified.
- No QA was executed.
- File created: `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md`
- Evidence trail for the 2026-05-18 owner review pass and all classification reclassifications: `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_PLANNING_OWNER_BACKEND_QUESTION_CAPTURE_2026_05_18.md`

---

*— End of POS3.0 Bug-Fix Master Implementation Plan —*
