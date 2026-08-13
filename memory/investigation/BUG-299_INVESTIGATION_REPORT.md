# BUG-299 Investigation Report

**ID:** BUG-299  
**Date:** 2026-08-05  
**Investigator:** INVESTIGATION AGENT  
**Steps used:** 3/10

---

## 1. Summary

**Root cause:** `CartPanel.jsx` (QSR mode) has **zero complementary support** — no toggle function, no state, no UI element, no orderTransform wiring for `isComplementaryRuntime`. The feature exists entirely in the dine-in code path (OrderEntry.jsx + CollectPaymentPanel.jsx) but was never ported to the QSR path.

- **Classification:** FE_BUG (feature entirely absent in QSR code path)
- **Confidence:** HIGH — confirmed by exhaustive grep of CartPanel.jsx
- **Steps used:** 3/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | CartPanel has zero complementary code | grep CartPanel.jsx for 'complementary', 'isComplementaryRuntime', 'comp' | **CONFIRMED** | 0 results returned |
| H2 | CartPanel shares a complementary utility with OrderEntry | Code trace: CartPanel imports | **ELIMINATED** | CartPanel has separate billing logic, no OrderEntry imports |
| H3 | QSR place-order transform handles isComplementaryRuntime | grep orderTransform.js QSR path | Not checked — not needed (upstream gap confirmed) | — |

---

## 3. Data Flow Trace

```
QSR mode:
  CartPanel.jsx → item row renders → NO comp checkbox/button
  CartPanel QSR billing section → NO comp state
  orderTransform.js QSR placeOrder path → not checked (no comp input to transform)

Dine-in mode (for reference):
  OrderEntry.jsx → toggleItemComplimentary() at L789
  CollectPaymentPanel.jsx → checkbox per item (L2185-2197)
  orderTransform → uses isComplementaryRuntime for billing overrides

BREAK POINT: CartPanel.jsx has no complementary entry point — feature was never ported to QSR
```

---

## 4. Evidence Artifacts

- Code trace: `/app/memory/evidence/BUG-299/code_trace.md`

---

## 5. Recommendations

**Classification:** FE_FIX (port feature to QSR path)

**Scope required:**
- `CartPanel.jsx` (R5 hotspot) — add `toggleItemComplimentary()` + state + UI per item
- `orderTransform.js` QSR place-order path — check if `isComplementaryRuntime` already handled; if not, add comp zeroing logic

**Planning skip eligibility:** NO — CartPanel.jsx is R5 hotspot, financial logic (comp = zero price)

**Recommended next step:** Batch with BUG-298 in one PLANNING session (Gate 2 + Gate 3) — both items share the same complementary feature, same files, overlapping scope.

**Owner decisions needed at Planning:**
- OD-1: Should QSR complementary work identically to dine-in (per-item checkbox in billing section)?
- OD-2: Should order-level comp (CR-058) cover QSR too when implemented?

---

## 6. Retroactive Candidates

NONE — no drift found.
