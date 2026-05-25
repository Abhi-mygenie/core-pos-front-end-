# BUG-011 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-011
> **Title:** Scan & Order Confirm → HTTP 500 / 404
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** Backend fix (shared root cause with BUG-037)

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | Scan & Order Confirm flow no longer returns HTTP 500 / 404 | ✅ PASS |
| 2 | Successful confirm → order appears on dashboard | ✅ PASS |
| 3 | No regression on the placed/served/cancelled paths | ✅ PASS |

**Owner explicitly confirmed end-to-end on preprod.**

---

## 2. What Was Verified

- Backend fixed the BadMethodCallException root cause.
- BUG-037 (Scan & Order Accept on "Delivered" default) shared the same backend root cause and is also verified — see `BUG_037_SMOKE_SIGNOFF.md`.
- No FE behavioural change needed in this repo.

---

## 3. Closure Checklist

- [x] Backend fix delivered + owner-verified on preprod.
- [x] No FE code change in this repo.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-011 row in `BUG_TEMPLATE.md` to Closed.

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-011 closed. Tracker flip pending.

---

*End of BUG-011 Smoke Sign-off. Bug closed.*
