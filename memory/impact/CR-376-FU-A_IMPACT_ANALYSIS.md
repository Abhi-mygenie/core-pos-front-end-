# Impact Analysis — CR-376-FU-A
## CustomerModal: Hide Off-Menu Suggestion Rows

**Date:** 2026-09-25
**Planning agent:** ALPHA v0.7 Role 2
**Sprint:** sep_bug_closure
**Risk:** LOW
**Parent CR:** CR-376 (GATE_5B_QA_PASS — unblocked)

---

## Code Reality

**NONE** — no `activeMenuProducts` filter or inert-row guard in `CustomerModal.jsx`.
- `filteredCrossSell` at L240: `filter(xs => { return true; })` — placeholder, no ID check
- `topItems.map` at L554: renders ALL CRM favourites unconditionally
- Code marker `CR-376-FU-A` — 0 hits in codebase

---

## Conflict Pre-Check

| File | Last modifier | Conflict? |
|---|---|---|
| `CustomerModal.jsx` | BUG-294 (2026-08-05) — try/catch blocks, unrelated | NONE |

No other open CR or BUG touches `CustomerModal.jsx`. **CLEAR.**

---

## OQ-A2 — R11 Probe RESOLVED

**Question:** Does the CRM `order-suggestions` payload include `food_for`/`menuType` per item?

**Answer: NO.**

Trace through `customerIntelTransform.js`:
- `topItems` maps `patterns.top_items[]` → fields: `item_id`, `name`, `order_count`, `last_ordered_at` — **NO `food_for`**
- `crossSellItems` maps `data.cross_sell_items[]` → fields: `item_id`, `name`, `reason`, `source`, `confidence` — **NO `food_for`**

**Therefore:** The fix MUST match by product `id` against `menuItems` prop (= `activeMenuProducts.filter(active).map(adaptProduct)` from `OrderEntry.jsx:L2867`).

---

## Data Flow Trace

```
CRM API  →  customerIntelTransform  →  intel.orderPatterns.topItems[]   (item_id only)
                                    →  intel.crossSellItems[]            (item_id only)
                                               ↓
OrderEntry.jsx:L2867  →  menuItems = activeMenuProducts.filter(isActive).map(adaptProduct)
                                               ↓
CustomerModal receives: menuItems = [active menu items ONLY — post CR-376]

═══ GAP (pre-fix) ════════════════════════════════════════════
topItems:      renders ALL CRM favourites  → tap Normal item → silent skip
crossSellItems: renders ALL CRM suggestions → tap Normal item → silent skip
═════════════════════════════════════════════════════════════

BREAK POINT: CustomerModal.jsx —
  topItems.map renders without filtering by menuItems IDs
  filteredCrossSell filter returns true unconditionally

═══ FIX (post-fix) ═══════════════════════════════════════════
topItems:      filtered → only IDs found in menuItems rendered (OQ-A1 = HIDE)
crossSellItems: filtered → only IDs found in menuItems rendered
══════════════════════════════════════════════════════════════
```

---

## Affected Files

| File | Change | Risk |
|---|---|---|
| `src/components/order-entry/CustomerModal.jsx` | 3 edit sites, ~6 lines | LOW |

**Files NOT touched:** `OrderEntry.jsx`, `customerIntelTransform.js`, `customerIntelService.js`, `useCustomerIntel.js`, context files, localStorage, API.

---

## Risk Classification

- **Risk: LOW**
- Trigger: UI display filter only — no state change, no API call, no localStorage, no financial logic
- `CustomerModal.jsx` is NOT on the R5 hotspot list
- Change is strictly additive (add filter conditions to existing patterns)
- Regression risk: MINIMAL — if menuItems is empty (edge case), both sections hide entirely (expected for empty active menu)

---

## Fast Lane Assessment

| Condition | Status |
|---|---|
| 1 file only | ✅ `CustomerModal.jsx` |
| ≤10 lines changed | ✅ ~6 lines total |
| No API/transform/state/localStorage/provider/socket | ✅ |
| Not R5 hotspot | ✅ |
| Not financial | ✅ |
| No FILE_OWNERSHIP conflict | ✅ (BUG-294 was 2026-08-05, different lines) |
| Owner approval | OQ-A1 LOCKED = Option A (HIDE). **Fast Lane requires explicit owner confirm at Gate 3.** |

**Fast Lane: ELIGIBLE — pending owner Gate 4 GO with Fast Lane approval.**

---

## Owner Decisions

| # | Question | Answer |
|---|---|---|
| OQ-A1 | Hide or grey-out off-menu rows? | **LOCKED = Option A (HIDE)** (2026-09-25) |
| OQ-A2 | Does CRM payload include `food_for`? | **NO** — match by ID against `menuItems` |

**Zero open owner decisions. Gate 3 can proceed immediately.**

---

```
Impact Analysis complete: CR-376-FU-A
Code Reality: NONE
Conflict pre-check: CLEAR
OQ-A2: RESOLVED — match by ID (no food_for field in CRM payload)
Risk: LOW
Files: 1 (CustomerModal.jsx — non-hotspot)
Fast Lane: ELIGIBLE (owner Gate 4 GO needed)
Next: Gate 3 Implementation Plan
```
