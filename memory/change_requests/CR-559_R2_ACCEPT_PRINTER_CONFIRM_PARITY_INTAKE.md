# CR-559 R2 — Web/Scan Accept: printer_agent on CONFIRM + update-print-status, drop order-temp-store (INTAKE)

**Gate:** 1 (Intake) · **Registered:** 2026-11-20 · **Type:** CR (re-scope of shipped CR-559) · **Status:** INTAKE
**Reporter:** Owner · **Agent:** E1 (INTAKE role) · **Sprint:** nov_cr_batch

> Re-intake requested by owner ("start again from intake role") after reversing the shipped CR-559
> mechanism. Supersedes OD-FINAL v3. Authoritative decision: `control/OWNER_DECISIONS_2026_11_20.md`
> → "CR-559 — R2 REVERSAL".

## 1. Requirement (what / why)
When staff **Accept** a web/scan "Awaiting Confirmation" order, forward printer routing the same way
Place/Update Order do — but via the confirm endpoint, and gated by the two auto-print toggles.
- Send `printer_agent:[KOT…, BILL]` on `PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update`.
- Then `POST /api/v2/vendoremployee/print/update-print-status` → `{order_id, kot_print:"Yes", bill_print:"No"}`.
- **Remove** the current `printOrder → /api/v1/vendoremployee/order-temp-store` call.
- No `print_kot` field on the confirm payload (backend decides).

## 2. Classification
- **Type:** CR (parity/behaviour change on an already-shipped CR).
- **Priority:** P1 (print/order flow; realtime kitchen impact, no clean workaround beyond manual KOT).
- **Risk:** CRITICAL (printing / order flow). → **FAST LANE: NO** (≥3 files, CRITICAL, hotspots). Full gate required.
- **Area:** `Printing / Printer Agent`.

## 3. Step 0a — Code Reality Check
**FULL (superseded mechanism shipped).** Current code on branch:
- `DashboardPage.handleConfirmOrder` (L1375-1388): web + `scanOrderAutoPrint` gate → `printOrder('kot',…)`
  → `/order-temp-store` + `update-print-status kot_print:'Yes'`. **KOT only, no printer_agent on confirm.**
- `orderService.confirmOrder` (L70) / `toAPI.updateOrderStatus` (orderTransform.js:1842): 3-arg, no printer_agent.
- `OrderContext.orderItemsByTableId` (L348): already carries `isWebOrder` (CR-559 E5).
→ R2 modifies this shipped behaviour (not a greenfield build). Retroactive/re-scope, not NOT-STARTED.

## 4. Step 0b — Duplicate Detection
**RE-SCOPE of CR-559** (same item, reversed direction). RELATED: CR-130 (BILL agent append),
CR-POS2-003 (printer_agent field), CR-512 (update-print-status), CR-545/547 (manual KOT reprint, unchanged),
CR-118/108 (aggregator accept — out of scope). Not a new ID — tracked as **CR-559 R2**.

## 5. Evidence
- Owner sample payload (target), confirm endpoint: `printer_agent:[KDS 5843, BILL 5843]`, `order_status:"cooking"`, order 1578953.
- Live probe (uploaded bundle), order 1578881: same shape PASS, no second printOrder observed.
- Bundle: `change_requests/CR-559_ACCEPT_PRINTER_PARITY_import/` · Investigation vs Option-A:
  `…_import/06_INVESTIGATION_ACCEPT_PRINTER_VS_OPTIONA_2026-11-20.md`.
- Source: OWNER-REPORTED · Confidence: CONFIRMED (owner-specified payload + prior live probe).

## 6. Step 3 — Blast Radius
- **MEDIUM — 3 files.** `DashboardPage.jsx` (handleConfirmOrder), `orderService.js` (confirmOrder + new
  updatePrintStatus), `OrderContext.jsx` (verify only). Hotspots: YES (DashboardPage, orderService).
- All behind the web + dual-toggle gate; shared ready/serve/cancel + non-web confirms unaffected.

## 7. Client + Assignee
- **Client:** ALL (platform-wide web/scan accept printing) — *owner to confirm if client-specific.*
- **Assignee:** **Piyush** (auto-route: Area = Printer / Printer Agent). Routing reason: "Printer Agent area → Piyush".
  *Owner to confirm/override.*

## 8. Owner Decisions (LOCKED this session)
- OD-R2-1 no order-temp-store · OD-R2-2 printer_agent [KOT,BILL] on confirm, no print_kot field ·
  OD-R2-3 update-print-status `{kot_print:'Yes',bill_print:'No'}` · OD-R2-4 gate AND
  `isWebOrder && settings.autoKot(print_kot) && settings.scanOrderAutoPrint`.
- confirmItems: new web order = ALL items; web edit = `food_status===7`/`isNotConfirmed` only.

## 9. Open Questions / Pre-impl validation (blocks Gate-4 build)
1. **Backend readiness (PRE-IMPL PROBE):** confirm `waiter-dinein-order-status-update` honours `printer_agent`
   AND that `update-print-status {kot_print:'Yes'}` actually fires the KOT on this setup (the superseded path
   relied on backend auto-print being *suppressed*; reversing assumes the backend now prints from the confirm
   block). **Needs preprod owner login** (REACT_APP_API_BASE_URL=preprod.mygenie.online) — owner-run or
   credentials supplied securely.
2. Client scope (ALL vs specific restaurant) + assignee confirm.

## Handover → PLANNING
Item **CR-559 R2** registered. Intake: this doc. Code reality: **FULL (re-scope of shipped CR-559)**.
Duplicate: **RE-SCOPE of CR-559**. Severity: **P1 / Risk CRITICAL** (no fast lane). Blast radius: **MEDIUM**
(3 files, hotspots DashboardPage/orderService). Evidence: captured. Client: ALL (confirm). Assignee: Piyush (confirm).
Impact Analysis + Gate-3 plan already drafted at `plans/CR-559_R2_IMPLEMENTATION_PLAN.md`.
Owner decisions: all locked (OD-R2-1..4). **Blocker:** PRE-IMPL backend probe needs preprod creds.
Next: PLANNING to validate Impact/Plan → owner Gate-4 GO → IMPLEMENTATION.
