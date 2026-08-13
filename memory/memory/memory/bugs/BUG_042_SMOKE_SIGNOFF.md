# BUG-042 (parent) — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042 (parent)
> **Title:** Hold Order — Payment Collection Fails With UPI
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** Backend fix (UPI handling on Hold orders) + previously closed sub-bugs BUG-042-A / -B / -C
> **Related docs:**
> - Sub-bug A: `/app/memory/bugs/BUG_042_A_SMOKE_SIGNOFF.md`
> - Sub-bug B: `/app/memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md`
> - Sub-bug C: `/app/memory/bugs/BUG_042_C_SMOKE_SIGNOFF.md`
> - Backend pull: `/app/memory/bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md`

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | Hold order → Collect Bill → UPI selected → payment completes successfully | ✅ PASS |
| 2 | Hold rail shows Cash / Card / UPI as configured (sub-bug A — already closed) | ✅ PASS |
| 3 | Payload carries `grant_amount` correctly (sub-bug B — already closed) | ✅ PASS |
| 4 | After settle, table clears from running view; PayLater also clears (sub-bug C + BUG-049) | ✅ PASS |
| 5 | Cash / Card on Hold orders — regression anchors unchanged | ✅ PASS |

**Owner explicitly confirmed end-to-end on preprod.**

---

## 2. What Was Verified

- Backend resolved the UPI failure root cause on Hold orders.
- Sub-bugs A (Hold rail cleanup), B (`grant_amount` payload), C (status-9 socket clear) were already closed by their own smoke signoffs.
- No further FE behavioural change required for the parent UPI flow.

---

## 3. Closure Checklist

- [x] Backend fix delivered + owner-verified on preprod.
- [x] All three sub-bugs (BUG-042-A / -B / -C) closed.
- [x] No FE code change in this repo for the parent UPI flow.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-042 parent row in `BUG_TEMPLATE.md` to Closed.

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-042 (parent UPI failure) closed. All three sub-bugs and parent now sealed. Tracker flip pending.

---

*End of BUG-042 (parent) Smoke Sign-off. Bug closed.*
