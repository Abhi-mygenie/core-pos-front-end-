# CR-489 — Configurable lock — once bill is printed, only employees with a specific right can edit the order

**ID:** CR-489  **Type:** CR  **Registered:** 2026-11-05  **Sprint:** nov_cr_batch
**Severity:** P1 (default per owner batch)  **Risk:** CRITICAL  **Status:** GATE_1_INTAKE_COMPLETE — BACKEND DEPENDENCY (BUG-583 print_bill_status + new permission key)
**Area:** Permissions / Security  **Source:** OWNER-REPORTED (chat 2026-11-05)  **Related:** BUG-470, BUG-583, CR-068, CR-071

## Description
Owner: "need configuration if bill is printed edit order can happen only by specific employee with rights". Restaurant-level setting; when ON and bill already printed, edit order (add/remove/qty/price changes) is allowed only for employees holding a dedicated permission.

## Evidence
- Screenshot: not provided · Curl: not applicable at intake · Confidence: REPORTED

## Duplicate Check
RELATED — BUG-470, BUG-583, CR-068, CR-071. Not a duplicate: existing role-gating CRs (CR-068 cancellation, CR-071 app-wide, deferred) do not cover this specific rule.

## Code Reality
PARTIAL — OrderEntry.jsx L333-341 permission flags (order_cancel, food, bill, discount, print_icon…); BUG-470 edit_order gate exists (GATE_6). No "edit after bill print" permission or restaurant setting. Bill-printed signal `billPrinted` (orderTransform.js:310) depends on backend `print_bill_status` — currently BACKEND_BLOCKED (BUG-583).

## Risk
CRITICAL — permissions/order edit; Fast Lane: NO

## Blast Radius
MEDIUM (OrderEntry.jsx R5 hotspot + OrderCard/TableCard edit entry points + Settings toggle + Role permission matrix); backend: new permission key + setting + print_bill_status in orders list

## Open Owner Decisions
- OD-489-01 Setting level: per restaurant ON/OFF toggle — confirm
- OD-489-02 Which actions are locked after print: add item, remove/cancel item, qty change, discount, table shift — OPEN
- OD-489-03 New permission key name (e.g. edit_after_bill_print) — backend to add to role matrix — OPEN
- OD-489-04 Behaviour for non-permitted user: hide Edit / show "Bill printed — manager required" / allow manager PIN override — OPEN
- OD-489-05 Dependency: BUG-583 backend `print_bill_status` in orders list must ship first — BACKEND_BLOCKED

## Next
Owner ODs + backend confirmation → Planning Gate 2.

## Owner Decisions (locked 2026-11-05)
- OD-489-01 **LOCKED: YES** — per-restaurant ON/OFF setting.
- OD-489-02 **LOCKED** — after bill print, user WITHOUT the right can only **Collect Payment**. All other order operations (add/remove/cancel item, qty, price, discount, table shift/merge, food transfer, customer change) blocked.
- OD-489-04 **LOCKED** — no PIN / manager override (no PIN system exists). Non-permitted user simply cannot perform any order operation except payment. **CONFIRMED by owner (2026-11-05):** user without the right "should NOT be able to do any operation in the order-taking process for that order".
- User WITH the right: full edit as today.
- OD-489-03 permission key name — OPEN (backend).
- OD-489-05 BUG-583 `print_bill_status` dependency — still BACKEND_BLOCKED.

## Final Rule (owner confirmed 2026-11-05)
When setting is ON and the bill for an order is printed:
- User WITHOUT the right → **no operation in the order-taking process for that order** (no add/remove/cancel item, qty, price, notes, discount, table shift/merge, food transfer, customer change). **Only Collect Payment allowed.**
- User WITH the right → full edit as today.
- No PIN / override.
- Scope: that order only (other unprinted orders unaffected).
All CR-489 owner ODs CLOSED except OD-489-03 (backend permission key name) and OD-489-05 (BUG-583 `print_bill_status`).

## Owner Decisions (locked 2026-11-05, round 3) — after bill print, user WITHOUT the right:
- Discount / coupon inside Collect Payment: **NOT allowed**.
- Reprint bill: **ALLOWED**.
- Re-print KOT: **NOT allowed**.
- Cancel whole order: **NOT allowed**.
- Who can toggle the setting: **anyone with Settings access**.
- Auto-printed bills: **lock applies** when auto bill print is enabled in restaurant settings.
- Orders printed before setting turned ON: **NOT locked**.
All owner ODs CLOSED. Remaining: backend permission key + BUG-583 `print_bill_status`.

## (2026-11-05) INTAKE FROZEN — backend dependency only.

## Backend brief (2026-11-05)
- `backend_briefs/BACKEND_BRIEF_INTAKE_BATCH_2026_11_05.md` §A+§C
