# BUG-043 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-043
> **Title:** Room Orders Report — wrongly shows Discount column / value
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** Owner-verified working end-to-end (BUG-048 calculation model adoption resolved the ambiguity)
> **Related docs:**
> - Sibling fix: `/app/memory/bugs/BUG_048_SMOKE_SIGNOFF.md`

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | Room Orders Report renders the Discount column with correct values | ✅ PASS |
| 2 | Totals reconcile with the owner-locked BUG-048 calculation model | ✅ PASS |
| 3 | Settled / running / phantom-discount cases (covered by BUG-048) — clean | ✅ PASS |

**Owner explicitly confirmed end-to-end on preprod.**

---

## 2. What Was Verified

- BUG-048 calculation model (owner-locked) is in effect and resolves the BUG-043 ambiguity.
- No separate FE change required at this stage; BUG-043 disposition was accepted as supersession by BUG-048.

---

## 3. Closure Checklist

- [x] Owner-verified working end-to-end on preprod.
- [x] BUG-048 calculation model adopted.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-043 row in `BUG_TEMPLATE.md` to Closed (superseded by BUG-048).

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-043 closed (superseded by BUG-048). Tracker flip pending.

---

*End of BUG-043 Smoke Sign-off. Bug closed.*
