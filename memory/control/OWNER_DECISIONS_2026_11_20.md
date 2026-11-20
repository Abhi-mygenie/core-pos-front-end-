# OWNER DECISIONS — 2026-11-20

## CR-559 — Web/Scan Accept: send printer_agent on confirm (imported; was CR-554 on external branch)
**Context:** Imported from `CR-554-investigation-to-impact.zip`. ID collided with this branch's CR-554
(cancellation-detail columns), so registered here as **CR-559**. Full investigation→Gate-2 bundle:
`change_requests/CR-559_ACCEPT_PRINTER_PARITY_import/`.

**Problem:** Accepting a web/scan "Awaiting Confirmation" order sent no `printer_agent`, so KOT/BILL
printing never fired on Accept (unlike Place/Update Order).

**Backend-locked decisions (from the bundle, OD-1/2/3):**
- OD-1 = **Option A (payload parity)** — confirm endpoint `waiter-dinein-order-status-update` accepts `printer_agent`.
- OD-2 = KOT station set: new web order = ALL items; web edit = ONLY food_status-7 items.
- OD-3 = append BILL agent unconditionally (CR-130 parity).
- Do NOT send `print_kot` (backend decides). Do NOT call `printOrder` after accept (double print). Web orders only.

**NEW owner decision — OD-4 (2026-11-20) = OPTION 1 (gate on the Scan-Order Auto-print setting):**
Accept must build/send `printer_agent` **only when the restaurant's "Scan Order Auto-print" toggle is ON**
(frontend `scanOrderAutoPrint`, backend `scan_order_auto_print`, under `settings_config.auto_printing`;
UI: Settings → Printer Config → Auto-print tab, testId `scan-order-auto-print-toggle`).
This mirrors how Place/Update Order gate on `printAllKOT` (= `settings.autoKot`). When the toggle is OFF,
Accept sends no printer details and nothing auto-prints (staff can still use the manual KOT button, CR-545/547).

**Implication / NEW sub-task (blocks build):** `scan_order_auto_print` is currently transformed only in the
printer-config settings screen (`printerAgentConfigTransform.js` → `scanOrderAutoPrint`), NOT in the runtime
restaurant object that the dashboard reads. So `profileTransform.js` must be extended to surface this flag
into `restaurant.settings` so `DashboardPage.handleConfirmOrder` can read it.

**Status:** CR-559 = GATE_2_IA_COMPLETE. **Gate-3 Implementation Plan must be REVISED** to (a) add the
`scanOrderAutoPrint` gate on the Accept path and (b) add the profileTransform exposure sub-task — before Gate-4 build.

---

## CR-559 — OD-5 (2026-11-20): Scan-Order Auto-print flag SOURCE (PROBE-1 result)
**Probe (live, owner@thegoankitchen.com):**
- `GET /api/v1/vendoremployee/profile` → `scan_order_auto_print` **ABSENT** (no `auto_printing`, no `settings_config`). Evidence: `evidence/CR-559/profile_response.json`.
- `GET /api/v2/vendoremployee/restaurant-settings/printer-agent-config` → `settings_config.auto_printing.scan_order_auto_print = "Yes"` (present). Evidence: `evidence/CR-559/printer_agent_config_response.json`.

**Decision needed before Gate-4 build:**
- **Option A (recommended):** backend surfaces `scan_order_auto_print` at `restaurants[0]` root of the profile payload (parity with `print_kot`/`billing_auto_bill_print`); frontend maps it one line in `profileTransform`. Needs BACKEND_BRIEF_CR-559.
- **Option B (no-backend fallback):** frontend calls `printer-agent-config` once at load and merges `scanOrderAutoPrint` into `restaurant.settings`.

**Status:** CR-559 Gate-3 plan REVISED v2 at `plans/CR-559_IMPLEMENTATION_PLAN.md`. Blocked on OD-5 only.

---

## CR-559 — FINAL direction + GATE-3 GO (2026-11-20)
- **OD-1 SUPERSEDED:** no `printer_agent` on the confirm payload; confirm endpoint untouched.
- **OD-2 KEPT:** KOT stations = new web order → ALL items; web edit → food_status-7 (`isNotConfirmed`) items only.
- **OD-3 SUPERSEDED:** **KOT only** on Accept, **no BILL**.
- **OD-4 KEPT:** Accept KOT auto-print gated by `scanOrderAutoPrint` toggle.
- **OD-5 = Option A:** backend adds `scan_order_auto_print` at profile `restaurants[0]` root (brief: `backend_briefs/BACKEND_BRIEF_CR-559_2026-11-20.md`).
- **Mechanism:** Accept reuses the manual-KOT process (`printOrder('kot', ...)` → order-temp-store + update-print-status `kot_print:'Yes'`). Prior "no printOrder after accept" rule reversed (safe: backend auto-print suppressed + web-only + gated).
- **GATE-3 GO** given by owner. **Implementation deferred** until PRE-IMPL VALIDATION (profile probe shows `scan_order_auto_print`) passes. Plan: `plans/CR-559_IMPLEMENTATION_PLAN.md` (FINAL v3).

---

## CR-527 / BB-09 — Backend delivered + Gate-3 GO path (2026-11-20)
- **Backend handoff validated** (`backend_replies/CR-527_BB-09_FRONTEND_HANDOFF_2026-11-20.md`): `GET /api/v2/vendoremployee/pos/tap-customer-record-list` credit rows now return `diner_name` + `diner_mobile` (LOCKED contract names honoured).
- **OD-B-BB09 resolved:** `diner_mobile` is stored **plain text only** — NO customer creation, NO CRM link/sync side-effect. Owner's "diner mobile becomes a customer" concern does not occur.
- **Constraints:** historical rows return `null` (no backfill) → UI shows `—`; **production** requires the migration `2026_11_20_000001_add_diner_snapshot...` deployed to `manage.mygenie.online` before fields appear live.
- **FE plan (2 files):** `plans/CR-527_IMPLEMENTATION_PLAN.md` — map fields (E1/E2), Diner column (E3/E4), diner filter OD-527-C (E5). Awaiting Gate-4 GO.
- **SEPARATE OPEN ITEM (not CR-527):** prepaid amount discrepancy observed on preprod — restaurant **672**, order **1578984** (bill 000823): placement ₹127 but order **saved & credited ₹132.71**; postpaid order 1578985 correct at ₹127. Money-correctness issue → needs its own P1 bug intake.


---

## CR-559 — R2 REVERSAL (owner, 2026-11-20, supersedes OD-FINAL v3)
Owner reversed the shipped CR-559 mechanism back toward payload-parity, with a new dual-toggle gate.
**This is now the authoritative direction for CR-559. OD-FINAL v3 (order-temp-store reuse) is SUPERSEDED.**

**Locked spec (Accept = web/scan YTC confirm path ONLY):**
- **OD-R2-1 — NO `order-temp-store`:** remove the `printOrder(...) → /api/v1/vendoremployee/order-temp-store`
  call from `handleConfirmOrder` (current DashboardPage.jsx:1379-1388 CR-559 block).
- **OD-R2-2 — `printer_agent` ON the confirm payload:** send on
  `PUT /api/v2/vendoremployee/order/waiter-dinein-order-status-update`:
  `{ order_id, role_name, order_status, printer_agent:[ KOT…, BILL ] }`. **No `print_kot` field** (backend decides).
  Block = `[...selectAgentsForKot(printerAgents, <stations of confirmItems>), ...selectAgentsForBill(printerAgents)]`
  (Place-Order shape). confirmItems: new web order = ALL items; web edit = `food_status===7`/`isNotConfirmed` items only.
- **OD-R2-3 — then `update-print-status`:** `POST /api/v2/vendoremployee/print/update-print-status`
  → `{ order_id, kot_print:"Yes", bill_print:"No" }`. Called ONLY when the gate is ON and a non-empty block was sent.
- **OD-R2-4 — GATE (AND):** `isWebOrder (order_from==='web') && settings.autoKot (backend restaurants[0].print_kot==="Yes")
  && settings.scanOrderAutoPrint (backend scan_order_auto_print==="Yes")`. All three true → do the above; else plain
  `{order_id, role_name, order_status}`, nothing auto-prints (manual KOT button CR-545/547 unchanged).
- **Scope lock:** web order + YTC (`f_order_status`) only; item split by `food_status`. Shared `toAPI.updateOrderStatus`
  (ready/serve) + cancel + aggregator + non-web status-7 confirms all UNTOUCHED (isWebOrder gate protects them).
  Everything additive except the isolated order-temp-store→confirm swap inside the gated branch.

**Status:** owner skipped formal gate. Plan: `plans/CR-559_R2_IMPLEMENTATION_PLAN.md`. Awaiting GO to implement.
