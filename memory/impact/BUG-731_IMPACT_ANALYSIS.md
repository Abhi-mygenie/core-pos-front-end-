# IMPACT ANALYSIS (Gate 2) — BUG-731

**Date:** 2026-11-20 · **Role:** PLANNING (Gate 2 — Impact Analysis only) · **Risk:** MEDIUM · **Priority:** P0 (owner override)
**Item:** BUG-731 — ScanOrderPopOut shows the "Check In" system marker as a real KOT item; counts include the marker.
**Cluster:** F (ScanOrderPopOut) · **QA source:** reproduced during CR-557 QA (`test_reports/CLUSTER_F_QA_REPORT_2026-11-20.md`, testing_agent iteration_9).
**Code Reality:** NONE (no fix code exists). **Conflict pre-check:** CLEAN (see §4).

---

## 1. Symptom (confirmed)
On a checked-in room / web order whose cart carries the backend **"Check In"** system row, ScanOrderPopOut renders it as a normal line: **"1× check in ₹0.00"** with a **KOT checkbox** and a **cancel (X)**. It also:
- inflates the item-count label (e.g. shows 1 extra item), and
- is included in the KOT-selectable set and the `KOT (n)` count — so Select-all selects it and it can be sent in the KOT payload.

## 2. Root cause (data-flow trace)
- `api/transforms/orderTransform.js` **L298-309**: every order line named "check in" is mapped with `isCheckInMarker: true`, `price/unitPrice: 0`, tax 0. The transform's own comment (**L292-297**) states: *"Consumers MUST filter `!isCheckInMarker` before rendering or running bill math."*
- **ScanOrderPopOut.jsx is a consumer that never filters it.** Every other consumer already does — `OrderEntry.jsx` (L814, 1146, 1150, 1163, 1166), `CartPanel.jsx` (L874-875, 409), `CollectPaymentPanel.jsx` (L174, 214, 226…), `RePrintButton.jsx` (L26), `SplitRoomItemsModal.jsx` (L17), and `orderTransform.js` bill-math (L1012/1041/1219/1588). ScanOrderPopOut is the lone gap.

**Classification:** FE_BUG (missing consumer filter). Not a CR-557 regression — pre-existing; CR-557 only swapped the row renderer, it did not add/remove the marker.

## 3. Affected locations in `ScanOrderPopOut.jsx` (all consume `activeOrder.items` without `!isCheckInMarker`)
| # | Line(s) | What | Effect of marker leak |
|---|---------|------|-----------------------|
| L1 | **170-175** `formatItemCount` | qty reduce + `items.length` | count includes marker |
| L2 | **332** `newItems` filter (Mode B) | `isNotConfirmed && status!=='cancelled'` | marker could appear if not confirmed |
| L3 | **333** `prevItems` filter (Mode B) | `!isNotConfirmed` | marker (a placed row) renders in prev list |
| L4 | **335** `kotSelectedItems` | `selectedItemIds.has(it.id)` | marker reaches KOT payload if selected |
| L5 | **595-597** normal-mode Select-all `some` predicate | marker counted selectable |
| L6 | **607-626** normal-mode Select-all `filter`/count/label | marker in allIds + count |
| L7 | **632-651** Mode A list `.map` | renders the marker row (checkbox + X) |

(Mode B `newItems` map at L553-569 inherits from L2; prev map L578-587 from L3.)

## 4. Conflict pre-check (FILE_OWNERSHIP + registry)
`ScanOrderPopOut.jsx` is a hotspot. All prior owners — **CR-545 / CR-547 / CR-552 / CR-557, BUG-679 / BUG-702** — are IMPLEMENTED at HEAD; **CR-558 = DONE_NO_CODE** (no pending edits). BUG-731's change is **purely additive** (one exclusion filter) and sequences AFTER CR-557. → **CLEAN.**
⚠ Future overlap note (not a conflict now): **BUG-738** (channel/amount, same file) is still GATE_1_INTAKE — whoever codes second rebases.

## 5. Recommended fix direction (for Gate 3 plan — NO code written here)
Single source-of-truth filter, mirroring `CartPanel.visibleCartItems` (L874):
- Derive once near L326: `const visibleItems = (activeOrder.items || []).filter(i => !i.isCheckInMarker);`
- Use `visibleItems` for: `newItems`/`prevItems` derivation (L332-333), the Mode A list map (L632), both Select-all predicates/counts (L595-626), and `kotSelectedItems` (guard the marker out).
- `formatItemCount` (L170-175): count off the non-marker items (pass filtered list or add `!isCheckInMarker` in the reduce/length).
- Scope lock — **WILL change:** `ScanOrderPopOut.jsx` only. **WILL NOT touch:** `PopoutItemRow.jsx`, `orderTransform.js`, `DashboardPage.jsx`, any print/socket/payment file.
- Est. blast radius: 1 file, ~8–12 lines. Risk MEDIUM (hotspot file + KOT-selection logic), functionally low (presentation + selection only; marker is already price-0/tax-0 so bill math is unaffected).

## 6. Verification Matrix (seeds QA)
| # | Check | How to verify | Automated? |
|---|-------|---------------|:---:|
| 1 | Marker not rendered | Open popout on a checked-in-room order → no "check in" row in Mode A / Mode B / prev list | NO (browser) |
| 2 | Count excludes marker | item-count label = real items only | NO |
| 3 | KOT excludes marker | Select-all → `KOT (n)` = real items; marker never in payload | NO (unit-testable) |
| 4 | Regression | non-marker orders render identically to today (CR-557 parity) | NO |
| 5 | Unit | extend a ScanOrderPopOut/CR547 test with an `isCheckInMarker` line → absent from selectable set | YES |

## 7. Owner Decision Queue
**None.** Fully hiding the marker in the popout matches the documented transform contract and every other consumer (OrderEntry/CartPanel/RePrintButton). No business-rule ambiguity.

## Handover (→ Gate 3 / IMPLEMENTATION)
Impact Analysis complete. BUG-731 → **GATE_2_IA_COMPLETE**. Single-file additive filter (ScanOrderPopOut.jsx), Risk MEDIUM, no owner decision, conflict CLEAN. Ready for Gate 3 implementation plan / implementation (assignee Abhishek). QA re-test via Verification Matrix §6 once coded.
