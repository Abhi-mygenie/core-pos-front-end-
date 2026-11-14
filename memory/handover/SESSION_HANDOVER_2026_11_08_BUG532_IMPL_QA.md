# SESSION HANDOVER — BUG-532 Implementation + QA — 2026-11-08

**From:** Implementation agent (E1)
**Date:** 2026-11-08
**For:** Next agent / owner smoke

---

## Summary

BUG-532 GATE_5B_QA_PASS. Dashboard room tile now includes service charge (SC) in the displayed amount — matches Collect Bill Panel. 1-line fix in `DashboardPage.jsx` L52. QA PASS.

---

## What Was Done

**Investigation (GATE_3 → GATE_4):**
- Confirmed bug NOT fixed in code — `computeRoomCardAmount` still used `order.amount` only
- Plan revalidated: line anchor shifted L49 → L52 (+3 lines from comment block growth since Oct 10)
- Text anchor confirmed matching exactly
- Test order confirmed: Ruby ZAP #000533 (`order_in: RM`, SC=0 for this order)
- Confirmed Ruby ZAP has SC=10% enabled on profile

**E1 — `DashboardPage.jsx` L52:**

Before:
```js
const food = Number(order?.amount) || 0;
```

After:
```js
const food = (Number(order?.amount) || 0) + (Number(order?.serviceTax) || 0); // BUG-532
```

`order.serviceTax` = `parseFloat(api.total_service_tax_amount)` — already mapped in `orderTransform.js` L225. Zero-safe for SC=0 restaurants.

---

## QA Results (iteration_4)

| Test | Result |
|------|--------|
| Room R-1 tile shows ₹3,685.12 (amount + SC) | ✅ PASS |
| Fix at DashboardPage.jsx L52, BUG-532 marker present | ✅ PASS |
| Non-room dine-in tiles unaffected | ✅ PASS |
| SC=0 order #000533 handled safely (+ 0) | ✅ PASS |
| webpack compiled successfully, 0 warnings | ✅ PASS |

**Success rate: 100%**

---

## Registry State

| ID | Gate | Sprint |
|----|------|--------|
| BUG-532 | GATE_5B_QA_PASS | oct_bug_batch |
| BUG-659 | GATE_5A_IMPLEMENTED | nov_cr_batch |
| BUG-645 | GATE_5B_QA_PASS | nov_cr_batch |

---

## Files Changed

| File | Change |
|------|--------|
| `src/pages/DashboardPage.jsx` | L52 — 1 line, `+order.serviceTax` |
| `memory/plans/BUG-532_IMPLEMENTATION_PLAN_2026_10_10.md` | Line refs updated L49→L52, Gate 4 noted |

---

## Next Steps

- **Owner smoke**: Ruby ZAP dashboard → Room tab → find room order with SC > 0 → confirm tile = food + SC
- **BUG-659 QA**: Run `handover/QA_HANDOVER_BUG659_2026_11_08.md` test cases
- **BUG-659 Option A**: P5 reprint paths need separate planning gate
