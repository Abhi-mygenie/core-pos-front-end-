# BUG-047 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-047
> **Title:** New-order notification shows "18 March" instead of outlet name
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** Backend fix (FCM payload composition) — confirmed by owner to be a backend issue

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | New order placed → FCM notification shows correct outlet name (not "18 March") | ✅ PASS |
| 2 | Notification body contains correct order details | ✅ PASS |
| 3 | Other notification surfaces (serve / cancel) unchanged — regression anchors clean | ✅ PASS |

**Owner explicitly confirmed: this was a backend issue and is fixed end-to-end on preprod.**

---

## 2. What Was Verified

- Backend FCM emitter now composes the outlet-name field correctly.
- No FE composition path involved; this repo did not change.

---

## 3. Closure Checklist

- [x] Backend fix delivered + owner-verified on preprod.
- [x] No FE code change in this repo.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-047 row in `BUG_TEMPLATE.md` to Closed.

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-047 closed. Tracker flip pending.

---

*End of BUG-047 Smoke Sign-off. Bug closed.*
