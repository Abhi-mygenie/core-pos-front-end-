# Impact Analysis — BUG-702: ScanOrderPopOut shows partial variation

**Gate:** 2 — Impact Analysis · **Role:** PLANNING
**Date:** 2026-11-18 · **Status:** GATE_2_5_DESIGN_APPROVED (Option A)
**Priority:** P0 · **Risk:** LOW · **Assignee:** Abhishek · **Release:** 2026-11-17
**Source:** INV-POS-3BUGS (Issue 2, 2026-11-18) — CONFIRMED (code-traced vs backend contract)
**Intake:** `change_requests/BUG-702_SCANORDERPOPOUT_PARTIAL_VARIATION_DISPLAY_INTAKE.md`
**Design:** `design/POS_INVEST_GATE2_5_MOCKUPS_2026_11_18.html` (BUG-702 Option A)

---

## Code Reality: CONFIRMED
- Order items carry `variation` in **backend RESPONSE shape** `[{ name, values:[{label, optionPrice}] }]` — stored raw at `orderTransform.js:136` (`variation: Array.isArray(detail.variation) ? detail.variation : []`).
- `ScanOrderPopOut.jsx` renders the **wrong fields** in both render paths:
  - **Collapsed "new items" summary** `L481`: `variations.map(v => v.name).join(', ')` — group name only.
  - **Expanded list** `L609-631`: `L621` prints `v?.name || v?.label`; `L622` prints `Number(v?.price)` — **neither reads `v.values[].label` / `v.values[].optionPrice`**, so the chosen option and its upcharge never show (and `v.price` is `undefined` → no amount).
- **Correct reference renderer**: `CartPanel.jsx:112-124` extracts labels (`v.values.map(val => val.label)`, also handles `v.values.label` array form) and `L213-216 / L417-419` sums `v.values[].optionPrice`.

## Conflict Pre-Check
- **ScanOrderPopOut.jsx** — last touched **CR-552** (GATE_5A_IMPLEMENTED 2026-11-18: two-section render + Mode-B) and **CR-545** (per-item cancel + KOT). Our edit is confined to the variation `<span>`/row markup at `L481` and `L609-631` — the two-section structure CR-552 added stays intact; we only change what each variation line prints. **Parallel-safe, but same file as CR-547 (below) — batch the two ScanOrderPopOut edits together.**
- `orderTransform.js:136` — read-only dependency, not edited.

## Data Flow Trace
```
API order_details[i].variation = [{name:"Choice of milk", values:[{label:"Oat milk", optionPrice:"40"}]}]
  ↓
orderTransform.js:136 → item.variation (RAW response shape, preserved)
  ↓
ScanOrderPopOut L481 / L621-622
  ↓ ← BREAK POINT: reads v.name + Number(v.price); v.values[] ignored, v.price undefined
UI: "(Choice of milk)" with no option label, no +₹  ❌
```

## Risk Classification: LOW
- Display-only. Single component, two adjacent render spots. No state/money/print logic. Line totals already computed upstream (variationAmount) — unchanged.

## Affected Files + Lines (planned — Gate 3)
| File | Change |
|---|---|
| `src/components/dashboard/ScanOrderPopOut.jsx` | `L481` (collapsed) and `L614-629` (expanded): render selected option label(s) from `v.values` (array-of-objects → `val.label`; also tolerate `v.values.label` array), joined with `, `; show `(+₹optionPrice)` per option when `> 0`. Mirror `CartPanel.jsx:112-124`. Keep `v.name`/`v.label` as fallback only when no `values`. |

## Owner Decisions — RESOLVED
- **OD-702-01 → Option A**: show **selected option name(s) + each price**, e.g. `Oat milk (+₹40.00), Large (+₹20.00)`. Mirrors the cart exactly.

## Test Plan
- Item with 1 variation group, 1 option → `Oat milk (+₹40.00)`.
- Item with 2+ selected options → comma-joined with each price.
- Option with `optionPrice=0` → label shown, no `(+₹)`.
- Legacy `v.values.label` array form → still renders labels.
- Item with no variation → row unchanged (regression).

## Rollback
Single-file revert of the two render blocks. No data/API change.
