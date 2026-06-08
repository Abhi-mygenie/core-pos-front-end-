# BUG-044 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-044
> **Title:** Free / Available Table Still Shows Old Order Items
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** Owner-verified working end-to-end (covered by BUG-042-C status-9 terminal-clear + BUG-049 PayLater predicate refinement)
> **Related docs:**
> - Runtime investigation: `/app/memory/bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`
> - Covers PayLater/Hold half: `/app/memory/bugs/BUG_042_C_SMOKE_SIGNOFF.md`
> - Covers PayLater table-card half: `/app/memory/bugs/BUG_049_SMOKE_SIGNOFF.md`

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | Freed table no longer carries stale order items in the running view | ✅ PASS |
| 2 | PayLater / Hold closure paths (covered by BUG-042-C + BUG-049) | ✅ PASS |
| 3 | Cash / Card / UPI closure paths (regression anchors) | ✅ PASS |
| 4 | Yet-to-Confirm (status 7) and status-8 dashboard recall paths — unchanged | ✅ PASS |

**Owner explicitly confirmed end-to-end on preprod.**

---

## 2. What Was Verified

- BUG-042-C `status-9` terminal-clear in running OrderContext.
- BUG-049 PayLater predicate refinement (`isPayLaterSettle`).
- No additional FE change required at this stage; the stale-table scenario is no longer reproducible per owner's smoke test.

---

## 3. Closure Checklist

- [x] Owner-verified working end-to-end on preprod.
- [x] BUG-042-C + BUG-049 coverage accepted by owner.
- [x] No additional FE code change in this repo.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-044 row in `BUG_TEMPLATE.md` to Closed.

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-044 closed (resolved by BUG-042-C + BUG-049 coverage; owner verified). Tracker flip pending.

---

*End of BUG-044 Smoke Sign-off. Bug closed.*
