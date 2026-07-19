# BUG-016 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-016
> **Title:** Delivery Payload Sent on Non-Delivery Order Types
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** FE workaround (Apr-2026 — `delivery_address: null` always emitted) + Backend `isset()` guard delivered

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | Dine-In order placeOrder → backend no longer rejects on missing delivery fields | ✅ PASS |
| 2 | Takeaway order placeOrder → unchanged behaviour | ✅ PASS |
| 3 | Delivery order with full address → unchanged behaviour | ✅ PASS |
| 4 | Room order placeOrder → unchanged behaviour | ✅ PASS |

**Owner explicitly confirmed end-to-end on preprod.**

---

## 2. What Was Verified

- FE workaround from Apr-2026 (always emit `delivery_address: null` when not a delivery) remains in place.
- Backend `isset()` guard now added and verified end-to-end.
- No FE behavioural change required at this stage.

---

## 3. Closure Checklist

- [x] FE workaround intact + backend guard delivered + owner-verified on preprod.
- [x] No FE code change in this repo at this stage.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-016 row in `BUG_TEMPLATE.md` to Closed.

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-016 closed. Tracker flip pending.

---

*End of BUG-016 Smoke Sign-off. Bug closed.*
