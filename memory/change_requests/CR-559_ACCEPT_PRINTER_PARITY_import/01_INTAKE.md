# CR-554 — Web/Scan Accept: printer_agent payload parity with Place/Update Order (INTAKE)

**Gate:** 1 (Intake) · **Registered:** 2026-11-19 · **Type:** CR · **Status:** IMPLEMENTED (retroactive registration — see Process Note)
**Reporter:** Owner · **Agent:** E1 · **Sprint:** nov_cr_batch

> ⚠️ PROCESS NOTE (honest disclosure): This item was implemented directly off the backend
> brief reply WITHOUT first passing Gate 0 (Registration), Gate 2 (Impact Analysis) or
> Gate 3 (Implementation Plan). The owner flagged the gate violation. This intake + the
> impact/plan docs are therefore a **retroactive backfill** of already-shipped, live-verified
> code. Code Reality = FULL. Future changes to this area must follow the gate sequence.

## 1. Symptom / Requirement
When staff **Accept** a web/scan "New Web Order — Awaiting Confirmation" pop-up, the confirm
request did NOT include printer details (`printer_agent`), whereas **Place Order** and
**Update Order** do. Kitchen/bill printing that depends on printer-agent routing therefore
never fired on Accept. Owner: "when we accept the pop up order we dont send printer details
as we send for place order and update order — the gating will be same."

## 2. Classification
- **Type:** CR (parity enhancement — Accept never carried printer details; web-order equivalent of CR-108 aggregator auto-KOT)
- **Priority:** P1
- **Risk:** CRITICAL (printing / order flow — see RISK CLASSIFICATION table)
- **Area:** Order Flow / Printing (web & scan YTC accept)

## 3. Duplicate Check
**DISTINCT.** Related items:
- CR-130 — Place Order appends BILL agent to printer_agent (gating reused here).
- POS2-003-REOPEN-A — update/cancel printer_agent (prior parity work).
- CR-108 / CR-118 — aggregator accept auto-KOT (the aggregator-side equivalent; web/scan had no such wiring).
- CR-545 / CR-547 — manual KOT button in the web/scan pop-up (reprint path; unchanged).

## 4. Evidence
- Investigation: `investigations/INV-ACCEPT-PRINTER_2026_11_19.md`
- Code trace: `evidence/INV-ACCEPT-PRINTER-2026_11_19/code_trace.md`
- Backend brief + reply: `backend_briefs/BACKEND_BRIEF_INV-ACCEPT-PRINTER_2026-11-19.md`
- Live probe (post-fix): PUT `waiter-dinein-order-status-update` for order `1578881` sent
  `printer_agent` = [KDS, BILL], `order_status: "cooking"` (captured via network interception).

## 5. Blast Radius
**MEDIUM.** 3 files. `handleConfirmOrder` is shared by the web/scan pop-up AND non-web POS
status-7 OrderCard confirms, so the change must be gated to web orders only. `orderItemsByTableId`
is a widely-consumed projection (OrderEntry/CartPanel) — change is additive (one extra field).

## 6. Backend Decision (received 2026-11-19)
Option A (payload parity) approved. Confirm endpoint now accepts & forwards `printer_agent`.
Do NOT send `print_kot` (backend decides). Do NOT also call `printOrder` (double-print). Web orders only.

## 7. Owner Decisions
- OD-1: Option A (payload parity) — **LOCKED by backend reply.**
- OD-2: KOT station set — new web order = all active items; web edit = only food_status-7 items — **LOCKED by backend reply.**
- OD-3: Append BILL agent unconditionally (CR-130 parity) — **LOCKED by backend reply.**

Next: Gate 2 Impact Analysis → Gate 3 Plan (both backfilled) → QA Gate 5b.
