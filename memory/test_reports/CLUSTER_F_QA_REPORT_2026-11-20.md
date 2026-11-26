# QA REPORT — Cluster F (ScanOrderPopOut) — 2026-11-20

**Role:** QA (Role 4) · **Account:** Owner@thegoankitchen.com (live preprod) · **Tool:** testing_agent (iteration_9) + CR-547 unit suite
**Result:** CR-557 cluster = **PASS on all reachable cases**; live end-to-end = **NOT TESTABLE (data)**. BUG-731 = **QA-CONFIRMED reproducible**. BUG-731/738 implementation = out of scope (GATE_1_INTAKE).

## Scope & readiness
| Item | Registry gate | QA action |
|------|---------------|-----------|
| CR-557 | GATE_5A_IMPLEMENTED | QA executed (handover V1–V11) |
| BUG-679 / BUG-702 / CR-545 (Mode B) | GATE_2_IA_COMPLETE, resolved-by-CR-557 | verify-only, executed |
| CR-558 | DONE_NO_CODE (Option B) | controls verified; e2e not testable |
| BUG-731 | GATE_1_INTAKE | NOT QA'd (unimplemented) — but **defect reproduced during CR-557 QA** |
| BUG-738 | GATE_1_INTAKE | NOT QA'd (unimplemented) — not reproducible without the #1578881 channel case |

## Environment / data constraint
Live Goan Kitchen account had only 3 running orders (all `f_order_status=1`) + 1 Zomato delivery — **no YTC web order (`f_order_status=7`) and no `food_status=7` line**, so ScanOrderPopOut never opens naturally. To exercise rendering, the testing agent used **client-side response interception** on `employee-orders-list` (READ-ONLY; nothing written to backend; Accept/Cancel-confirm/KOT-print never clicked on real orders). Script: `/app/tests/cr557_intercept.py`.

## Results (per case)
- **LOGIN** — PASS. Lands `/dashboard`, 0 console errors (only Firebase notif-permission-denied warning + update toast).
- **CR-557 Mode A V1–V4** — PASS (simulated): ₹1 APS badge + "Price TBD" + sorted top; cancelled row strikethrough/"(Cancelled)"/price hidden/no KOT/no X; variation options one-per-line with prices; add-on price + note. *Comp tag NOT TESTABLE (no comp item in data).*
- **CR-557 Mode B V5–V8 (parity)** — PASS (simulated): new rows show APS+Price-TBD, multi-group variations w/ prices, add-on price, note.
- **V9 per-item cancel modal** — PASS both modes (`popout-item-cancel-*`, `popout-cancel-new-item-*` open CancelFood modal; closes cleanly).
- **V10 KOT checkbox/select-all/count/disable** — PASS both modes.
- **V11 previously-ordered read-only** — PASS (collapsed, opacity, no checkbox/button).
- **BUG-679 / BUG-702 / CR-545 (Mode B)** — PASS (simulated).
- **CR-558 Option B** — PARTIAL: Accept (`popout-accept-btn-{id}`) + per-item X present and open the cancel modal; **no selective-accept checkbox exists (correct for Option B)**. Full cancel→Accept→confirmed e2e **NOT TESTABLE** (no real web-edit order; running on intercepted data would mutate real orders).
- **CR-547 unit suite** — 6/6 PASS (local).

## Findings
### MAJOR (functional, but pre-existing — NOT a CR-557 regression) → this IS BUG-731
- **BUG-731 CONFIRMED:** the backend "Check In" system marker (`isCheckInMarker`, price zeroed in `orderTransform.js` ~L299-306) is **not filtered** in ScanOrderPopOut. It renders as "1× check in ₹0.00" **with a KOT checkbox and a cancel X**, inflates the `KOT (n)` count and the item count. `OrderEntry` and `RePrintButton` already filter `isCheckInMarker`; ScanOrderPopOut does not (Mode A list, `newItems`, `prevItems`, `formatItemCount`, and the KOT-selectable set all need the filter).

### MINOR / NOTE (design, in PopoutItemRow — owner to decide ship-or-fix)
- Row 1 uses `justify-between` across name/price/X, so on rows **with** an X the price sits mid-row while read-only rows right-align it → price columns don't line up. Suggest grouping price+X or `ml-auto`.
- Line total shows unit×qty only and omits variation/add-on amounts (shows ₹100 while options +₹45 and add-on +₹25). May be intended; can confuse staff.

### NOTE (test maintenance, already flagged in handover)
- `ScanOrderPopOut.test.jsx` uses `orderFrom:'web'` instead of `isWebOrder:true` → 22 failures that exist on baseline too (NOT CR-557). Separate test-maintenance ticket.

## Verdict & next steps
- **CR-557 + BUG-679/702/CR-545 Mode-B:** rendering logic verified PASS. Because live-data verification wasn't possible, final sign-off needs an **owner smoke on a real YTC web order + a real web-EDIT order** (Gate 6). Recommend keeping CR-557 at IMPLEMENTED/QA-PASS-pending-smoke, not auto-CLOSED.
- **CR-558:** controls correct for Option B; owner smoke should confirm Accept flips the appended lines end-to-end (OD-558-01 was probe-verified on order 1578881, so expected to pass).
- **BUG-731:** QA has reproduced it — route to **PLANNING (Gate 2 IA)** → IMPLEMENTATION (small, well-scoped: mirror the `isCheckInMarker` filter used by OrderEntry/RePrintButton). QA did not fix (QA role).
- **BUG-738:** still GATE_1_INTAKE; needs IA + the #1578881 RM→Dine-In channel case to reproduce.
