# CR-005 — Audit Report: PG visibility, Lifecycle completeness, User attribution

**Status:** Requirements gathering & impact analysis (no code changes yet).
**Author:** Requirement Gathering Agent · 2026-05-01
**Source:** User-provided requirements + raw payload samples (`/get-single-order-new` for orders 001285 paid, 001277 running) + PG keys list from `/order-logs-report`.
**Related:** CR-001 (status derivation, PG tri-state filter), REPORTS_FIELD_MAPPING_TRACKER, BUG_CANCEL_DERIVATION_HANDOVER.

---

## 1. Scope (5 sub-requirements)

| # | Title | Scope | Status |
|---|---|---|---|
| 1 | PG details visible on Audit Report rows | Audit Report table | **Locked** (Q-A3 = hybrid pending final OK; Q-A4 = PG-checked only) |
| 2 | Web order user attribution in PUNCHED BY / ACTIONED BY | Audit Report table only (NOT side panel) | **Locked** (Q-B4 = blank `—` default) |
| 3 | PG fields in `/get-single-order-new` side panel | — | **PARKED** |
| 4 | Item-level + order-level lifecycle (Order Taken → Ready → Served → Paid) | Side panel (and item-level cards) | **Locked** (Q-D4 = item has `served_at` + `order_serve_at`; order-level keys backend pending) |
| 5 | Cancelled-by **name** (item + order level), plus ready_by/served_by | Side panel item cards + Cancellation alert | **Locked** — fully backend-dependent |

---

## 2. Confirmed signals & keys

### 2.1 Payment Gateway (Razorpay) keys — from `/order-logs-report`
```
razorpay_order_id           → "order_SjLnc3knK8IOgM"
razorpay_payment_id         → "pay_SjLnhpF6lz8GKV"
payment_amount              → "30.00"
payment_created_at          → "2026-04-29 20:31:40"
snapshot_razorpay_amount    → null  (snapshot, may populate post-webhook)
snapshot_razorpay_status    → null
snapshot_razorpay_method    → null
snapshot_amount_match       → null
snapshot_status_match       → null
snapshot_mismatch_flag      → null
snapshot_fetched_at         → null
```
- Detection rule (already in code): `isPaymentGateway = Boolean(razorpay_order_id)` (`reportService.js:760`).
- **Not present** in `/get-single-order-new` (verified from raw payloads of orders 001285 and 001277).

### 2.2 Web / Auto / Confirmer keys
| Signal | Key | Notes |
|---|---|---|
| Order from web | `order_from === 'web'` | Already normalized to `platform` (`reportService.js:746-756`). |
| Auto-confirmed | `is_auto_confirmed === 1` | **NEW key** — backend already returns it (per user). Not currently consumed. |
| POS confirmer name | TBD | **Backend will add** (key name pending; tracked under Q-B2 follow-up). |

### 2.3 Lifecycle keys (item-level, in `orderDetails[i]`)
| Stage | Key | Verified in payload |
|---|---|---|
| Order Taken | `created_at` (today) **or** new `kot_at`/`order_taken_at` (TBD — Q-D4) | `created_at` ✅ present |
| Ready | `ready_at` | ✅ present (`2026-04-29 21:09:18` in 001285) |
| Served | `serve_at` | ✅ present |
| Paid (item-level) | TBD — **backend will add** per item | Currently absent |
| Cancelled | `cancel_at` | ✅ present (null in samples) |

### 2.4 Cancelled-by / Ready-by / Served-by name keys
| Where | Current | Required |
|---|---|---|
| Item — `orderDetails[i].cancel_by` | numeric id only | **Add `cancel_by_name`** ← backend |
| Item — ready/served | nothing | **Add `ready_by_name`, `served_by_name`** ← backend |
| Order — top-level `canceled_by` (note: single L) | numeric id only, often null | **Add `canceled_by_name`** ← backend |

---

## 3. UI changes scoped (per requirement)

### 3.1 Audit Report table — 3 new PG columns (Req #1)
- **Columns:** `PG Order Id`, `PG Amount`, `PG Status`
- **Sources:**
  - `PG Order Id` ← `razorpay_order_id`
  - `PG Amount` ← `payment_amount`
  - `PG Status` ← **`snapshot_razorpay_status` literal** (Q-A3 LOCKED — Option (a)). **No frontend derivation.** When backend ships `null`, the cell renders `—`. Backend dependency: BE-10 must ensure snapshot keys are reliably populated post-webhook.
- **Visibility (Q-A4 locked):** show **only** when the PG checkbox in the FilterBar is checked (`isPaymentGateway` filter active). When unchecked → 3 columns hidden.
- Layout risk: now mitigated since columns toggle in/out — table stays at 9 columns by default.

### 3.2 Audit Report table — PUNCHED BY / ACTIONED BY rules (Req #2)
| Condition | PUNCHED BY column | ACTIONED BY column |
|---|---|---|
| `platform === 'web'` AND `is_auto_confirmed === 1` | `"Customer"` | `"Auto"` |
| `platform === 'web'` AND POS user confirmed | `"Customer"` | `<confirmer_name>` |
| `platform === 'web'` AND not yet confirmed | `"Customer"` | `"—"` (blank) |
| `platform === 'web'` AND neither flag/name present (Q-B4 locked) | `"Customer"` | `"—"` (blank — no false "Auto" attribution) |
| Non-web (`platform !== 'web'`) | unchanged: `waiter_name` | unchanged (Collected by / Cancelled by / Merged by logic) |

### 3.3 Side panel item-level lifecycle (Req #4)
**Today (`OrderDetailSheet.ItemTimeline`, L248-319):** Created → Ready → Served → Cancelled
**Required:** Order Taken → Ready → Served → Paid (+ Cancelled as terminal)
- Order Taken icon = currently `Circle` (zinc-400)
- Paid icon = needs new icon (`CheckCircle2` or `IndianRupee`)
- Per-item Paid timestamp = backend will add
- For cancelled items: stop at Cancelled stage (already correct).

### 3.4 Side panel order-level lifecycle (Req #4)
**Today (`OrderDetailSheet.Timeline`, L146-208):** Created → Ready → Served → Paid/Cancelled/Merged
**Required:** Same 4-stage shape, driven entirely from API status fields (`order_status`, `f_order_status`) — **no frontend derivation**. Per user: "no front end involvement".
- This means: stop computing `firstReadyAt` / `lastServeAt` from item array (`reportTransform.js:469-481`); use API-supplied order-level keys.
- **Q-D4 (locked):** Item-level payload now includes both `served_at` (item's own) **and `order_serve_at`** (order-level serve time, replicated on every item). Use `order_serve_at` from `orderDetails[0]` as the order-level Served timestamp until backend ships true order-level keys.
- Order-level `ready_at` / `served_at` / `paid_at` will be added by backend in a follow-up (BE-9). Until then, the analogous proxies are:
  - Order-level Ready → no proxy yet (backend pending) — display ready stage only when item-level reductions allow
  - Order-level Served → `orderDetails[0].order_serve_at`
  - Order-level Paid → `order.updated_at` when `payment_status='paid'` (existing behaviour)

### 3.5 Cancelled-by / Ready-by / Served-by name (Req #5)
- Item card "Cancelled By" line (`OrderDetailSheet.jsx:354-362`): replace `Employee #<id>` with `cancel_by_name`.
- Add new "Ready By" / "Served By" lines on item card (when names present).
- `CancellationAlert` component (`OrderDetailSheet.jsx:403-417`): add "Cancelled By: <name>" line.

---

## 4. File-by-file impact (read-only inventory)

> **No code is being modified by this CR's RG phase.** This is the implementation surface for the next agent.

### 4.1 Frontend — Transforms
| File | Lines | Change required |
|---|---|---|
| `frontend/src/api/services/reportService.js` | 758-760, 882-935 | Already extracts `razorpay_order_id` + `isPaymentGateway`. Add: `razorpayPaymentId`, `paymentAmount`, `paymentCreatedAt`, `snapshotRazorpayStatus`, `snapshotMismatchFlag`. **No derivation** — pass through literal values. UI renders `—` if backend ships `null`. |
| `frontend/src/api/services/reportService.js` | 820-880 (punchedBy/actionedBy block) | Add web-order branch: when `platform === 'web'` → `punchedBy = 'Customer'`; when `is_auto_confirmed === 1` → `actionedBy = 'Auto'`; else use confirmer name key (TBD). |
| `frontend/src/api/transforms/reportTransform.js` | 453-638 (`singleOrderNew`) | (a) Stop deriving `timeline.ready/served` from item-array reductions; consume API-supplied order-level keys when backend lands them (BE-9). Until then, use `orderDetails[0].order_serve_at` as Order-level Served proxy. (b) Add per-item `paidAt` field (BE-3). (c) Map `cancel_by_name`, `ready_by_name`, `served_by_name` → `cancelByName` / `readyByName` / `servedByName`. (d) Map order-level `canceled_by_name` → top-level `cancelledByName`. |

### 4.2 Frontend — UI components
| File | Lines | Change required |
|---|---|---|
| `frontend/src/components/reports/OrderTable.jsx` | 119-132 (column defs); 445-465 (cell renderers) | Add 3 conditional column definitions (`pgOrderId`, `pgAmount`, `pgStatus`) — render only when PG checkbox active (Q-A4 locked). Update `punchedBy` / `actionedBy` rendering only if formatting needed (likely none — values pre-resolved by transform). |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | 248-319 (ItemTimeline) | Add Order Taken stage (icon + time) and Paid stage (icon + time). |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | 354-362 (item cancelled by) | Replace `cancelByName` fallback `Employee #<id>` with real name; show `—` if missing. |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | 403-417 (`CancellationAlert`) | Add "Cancelled By: <name>" row using new `cancelledByName`. |
| `frontend/src/components/reports/OrderDetailSheet.jsx` | (new) inside `OrderItemCard` | Add Ready By / Served By info lines when present. |
| `frontend/src/components/reports/FilterBar.jsx` | (existing PG tri-state — now 2-checkbox per CR-001 P2) | When PG checkbox toggled, signal table to show/hide the 3 PG columns. Wire via existing filter state (`isPaymentGateway` boolean). |

### 4.3 Frontend — Tests
| File | Change |
|---|---|
| `frontend/src/api/transforms/__tests__/reportTransform.test.js` (if exists) | Add cases: web+auto-confirmed, web+POS-confirmed, web+not-confirmed; PG-row vs non-PG row; item with cancel_by_name; item with ready_by/served_by names. |
| `frontend/src/__tests__/integration/` | Add a snapshot test for the 5-stage item lifecycle. |

### 4.4 Backend asks (consolidated)
| # | Ask | For requirement |
|---|---|---|
| BE-1 | Add `is_auto_confirmed` consumption confirmation (already shipped per user) | #2 |
| BE-2 | Add **POS confirmer name** key on `/order-logs-report` (and ideally `/get-single-order-new`) | #2 |
| BE-3 | Add **per-item paid timestamp** (`paid_at` in `orderDetails[i]`) | #4 |
| BE-4 | Decide on Order Taken: keep `created_at`, or add explicit `kot_at`/`order_taken_at` | #4 |
| BE-5 | Add `cancel_by_name` to `orderDetails[i]` | #5 |
| BE-6 | Add `ready_by_name`, `served_by_name` to `orderDetails[i]` | #5 |
| BE-7 | Add `canceled_by_name` at order level | #5 |
| BE-8 | (Optional) Mirror PG keys on `/get-single-order-new` if requirement #3 is un-parked later | #3 (parked) |
| BE-9 | Add **order-level** `ready_at` / `served_at` / `paid_at` (per user 2026-05-01: "order level are not there backend needs to add"). Until shipped, frontend uses `orderDetails[0].order_serve_at` as a proxy for Served. | #4 |
| BE-10 | Reliably populate `snapshot_razorpay_status` and `snapshot_mismatch_flag` from Razorpay webhook reconciliation. Frontend will display literal values — no frontend derivation. | #1 |

---

## 5. Risks & dependencies

| ID | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R-1 | Audit table becomes too wide with +3 PG columns | High | Resolve via Q-A4 (visibility-bound). Consider responsive overflow. |
| R-2 | `is_auto_confirmed` semantics differ across tenants | Medium | Validate on 2+ live tenants before shipping (`owner@brew.com`, `18march@owner.com`). |
| R-3 | Backend timeline (per-stage timestamp) gaps for older orders | High | Frontend MUST gracefully degrade — render `<Stage>` icon with `—` time when key absent. |
| R-4 | `vendorEmployee: null` in many orders means `cancelByName` fallback never resolves a name today | High (current bug) | Fully resolved once BE-5 lands. |
| R-5 | Existing CR-001 PG tri-state filter is independent of new PG columns | Low | Keep filter behaviour unchanged; new columns are display-only. |
| R-6 | "No frontend involvement" for status (Req #4 D3) implies removing existing item-array reductions in `singleOrderNew` | Medium | Could change displayed timeline for orders predating new BE keys. Need backwards-compat plan. |

---

## 6. Open questions tracker

| ID | Question | Owner | Resolution |
|---|---|---|---|
| Q-A3 | Source of "PG Status" column: `snapshot_razorpay_status` vs derived | Product | **LOCKED 2026-05-01 — Option (a):** `snapshot_razorpay_status` literal. No frontend derivation. Backend (BE-10) must reliably populate this + `snapshot_mismatch_flag` from Razorpay webhook reconciliation. Cell renders `—` when null. |
| Q-A4 | Visibility rule for 3 new PG columns | Product/UX | **LOCKED 2026-05-01:** show only when PG checkbox is checked in FilterBar. |
| Q-B2 | Backend key for POS confirmer name | Backend | **In flight** — backend will add (per user). Block frontend on this. |
| Q-B4 | Web order with no `is_auto_confirmed` and no confirmer | Product | **LOCKED 2026-05-01:** display blank `—` in ACTIONED BY. |
| Q-C2 | UI placement of PG block in side panel | Product | **PARKED** (Req #3 entirely parked). |
| Q-D4 | `created_at` vs new `kot_at` for Order Taken stage; order-level lifecycle keys | Product/Backend | **LOCKED 2026-05-01:** Item-level uses `created_at`, `ready_at`, `served_at`, `paid_at`. Item-level also carries `order_serve_at` (order-level serve replicated per item). True order-level keys will be added by backend (BE-9). Frontend uses `orderDetails[0].order_serve_at` as a temporary proxy. |
| Q-E2 | Roster-based fallback if BE-5 unavailable | Product | Not needed — backend will ship `cancel_by_name`. |

---

## 7. Acceptance criteria (preliminary, will firm up after Q-A3..Q-D4)

1. Audit Report table shows PG Order Id, PG Amount, PG Status columns (visibility per Q-A4).
2. Web orders show `"Customer"` in PUNCHED BY column.
3. Auto-confirmed web orders show `"Auto"` in ACTIONED BY column; POS-confirmed web orders show confirmer name.
4. Side panel item card shows 4-stage lifecycle: Order Taken → Ready → Served → Paid (+ Cancelled terminal).
5. Cancelled item shows `cancel_by_name` (real name) — no more `Employee #<id>`.
6. Ready / Served stages on item card show `ready_by_name` / `served_by_name` when present.
7. Order-level Cancellation alert shows `Cancelled By: <name>`.
8. Order-level lifecycle in side panel sources status from API (no frontend derivation).
9. Backwards compat: orders missing new keys still render with `—` placeholders.

---

## 8. Out of scope (this CR)

- PG block in side panel (Req #3 — parked under Q-C2).
- PG section UI styling (deferred until Req #3 un-parked).
- Backfill of `cancel_by_name` / `ready_by_name` etc. on historic orders (purely backend concern).
- Roster API integration (only relevant if Q-E2 alt path is chosen).
- Mobile / KDS surfaces — current screens only.

---

## 9. Hand-off note

This document is the **final contract** for the next agent (implementation phase). All Q-questions are now LOCKED.

Before any code is written:
1. Wait for backend to ship BE-2, BE-3, BE-5, BE-6, BE-7, BE-9, BE-10 (BE-1 already done).
2. Re-run live audits on `owner@brew.com` and `18march@owner.com` to verify new keys land on real rows.
3. Implementation order suggestion (from low-risk → high-risk):
   - **Phase A (zero backend dep):** Req #2 web-attribution rules — uses `is_auto_confirmed` (already shipped) + `order_from='web'` (already wired). Confirmer name displays `—` until BE-2 lands.
   - **Phase B (BE-10):** Req #1 PG columns — pass-through display.
   - **Phase C (BE-5/6/7/9):** Req #4 lifecycle expansion + Req #5 named cancellations.

---

## 10. Decision log

| Date | Decision | Source |
|---|---|---|
| 2026-05-01 | Q-A4 locked: PG columns visible only when PG checkbox is checked | User |
| 2026-05-01 | Q-B4 locked: blank `—` in ACTIONED BY when web order has neither auto flag nor confirmer name | User |
| 2026-05-01 | Q-D4 locked: lifecycle uses item-level `served_at` + `order_serve_at`; order-level keys backend-pending | User |
| 2026-05-01 | Req #2 scope = Audit Report table only (PUNCHED BY + ACTIONED BY columns), NOT side panel | User |
| 2026-05-01 | Req #3 (PG block in side panel) parked | User |
| 2026-05-01 | Req #4 D3 — no frontend status derivation; rely on API `order_status` + `food_status` | User |
| 2026-05-01 | Req #5 — backend will ship `cancel_by_name`, plus `ready_by_name` / `served_by_name` | User |
| 2026-05-01 | Q-A3 LOCKED: PG Status column = `snapshot_razorpay_status` literal (Option a). No frontend derivation. Backend dep BE-10 added. | User |
