# BUG-298 Investigation Report

**ID:** BUG-298  
**Date:** 2026-08-05  
**Investigator:** INVESTIGATION AGENT  
**Steps used:** 7/10

---

## 1. Summary

**Root cause:** Per-item complementary toggle EXISTS in `CollectPaymentPanel.jsx` (checkboxes at L2185-2197 for all order types) but has **no visible text label** — only a `title` tooltip attribute. Cashiers cannot discover the checkbox without hover. Additionally, the toggle is only accessible **after** order placement on the Collect Bill screen — it is NOT available in the cart view before placing.

- **Classification:** FE_BUG (UX discoverability + pre-place gap)
- **Confidence:** MEDIUM — checkbox exists but discoverability is unconfirmed as sole root cause. Owner needs to confirm which scenario they hit.
- **Steps used:** 7/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | `toggleItemComplimentary()` not wired to any UI button | Code trace: OrderEntry.jsx grep | **PARTIALLY ELIMINATED** | Function exists at L789. Passed to CollectPaymentPanel at L1746 via prop. |
| H2 | CollectPaymentPanel has checkbox but no visible label (discoverability bug) | Code trace: CollectPaymentPanel L2185-2197 | **CONFIRMED** | Checkbox has `title` attr only. No `<label>` text. No visible 'Comp' indicator next to it. |
| H3 | Checkbox absent from non-room order path | Code trace: CollectPaymentPanel L2175+ | **ELIMINATED** | L2175 comment: `/* DEFAULT: Table / Room without transfers */` — checkbox in ALL order types |
| H4 | No complementary option in pre-place cart view | Code trace: OrderEntry.jsx cartItems render | **CONFIRMED** | `toggleItemComplimentary` not passed to cart item row — only to CollectPaymentPanel |

---

## 3. Data Flow Trace

```
OrderEntry.jsx:
  L789: toggleItemComplimentary(itemId) → sets isComplementaryRuntime on cart item
  L1746: onToggleComplimentary={toggleItemComplimentary} → passed to CollectPaymentPanel

CollectPaymentPanel.jsx:
  L2185-2197: checkbox per item (DEFAULT path, all order types)
    - checked={isComp}
    - title="Mark as complimentary"  ← ONLY visible on hover
    - NO text label next to checkbox
    - NO 'Comp' badge/pill visible by default

BREAK POINT 1: CollectPaymentPanel — no visible label on checkbox
BREAK POINT 2: OrderEntry cart item row — no complementary button pre-place
```

---

## 4. Evidence Artifacts

- Code trace: `/app/memory/evidence/BUG-298/code_trace.md`

---

## 5. Recommendations

**Classification:** FE_FIX (two distinct sub-fixes)

**Fix A — Add visible label (MEDIUM confidence fix):**
- `CollectPaymentPanel.jsx` L2185-2197: add `<label>` text "Comp" next to checkbox
- Scope: 1 file, ~5 lines. CollectPaymentPanel.jsx is NOT in R5 list but IS financial flow.

**Fix B — Pre-place toggle in cart view (requires owner decision):**
- Add per-item comp button in OrderEntry.jsx cart item rows
- Scope: OrderEntry.jsx (R5 hotspot). Full planning required.

**OWNER DECISION NEEDED before planning:**
- OD-1: Is the issue (a) can't find the checkbox on Collect Bill, OR (b) want the toggle before order placement?
- OD-2: Should marking item comp pre-place zero the price on Place Order too (financial impact)?

**Planning skip eligibility for Fix A:** NO — CollectPaymentPanel is financial flow, needs planning
**Planning skip eligibility for Fix B:** NO — OrderEntry.jsx is R5 hotspot

**Recommended next step:** ASK OWNER (OD-1 + OD-2) → then PLANNING

---

## 6. Retroactive Candidates

NONE — no drift found.
