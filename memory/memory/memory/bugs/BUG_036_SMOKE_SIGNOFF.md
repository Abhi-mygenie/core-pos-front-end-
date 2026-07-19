# BUG-036 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-036
> **Title:** PG-Paid Scan Order Stays on Dashboard After Mark-Served
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** Backend fix (BE-A canonical paymentType case) — tracked via CR-011
> **Related docs:**
> - `/app/memory/change_requests/CR_011_PG_SCAN_SERVE_PAYMENTTYPE_CASE_MISMATCH.md`

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | PG-paid scan order → Mark Served → order clears from running dashboard | ✅ PASS |
| 2 | Cash / Card / UPI scan orders — regression anchors unchanged | ✅ PASS |
| 3 | Audit Hold / All Orders reports — scan-order rows render correctly | ✅ PASS |

**Owner explicitly confirmed end-to-end on preprod.**

---

## 2. What Was Verified

- Backend canonicalised the paymentType case (BE-A delivery) per CR-011.
- FE consumes the canonical paymentType correctly without behavioural change in this repo.

---

## 3. Closure Checklist

- [x] Backend fix delivered + owner-verified on preprod.
- [x] CR-011 dependency satisfied.
- [x] No FE code change in this repo.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-036 row in `BUG_TEMPLATE.md` to Closed.

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-036 closed. Tracker flip pending. CR-011 can also be marked Closed.

---

*End of BUG-036 Smoke Sign-off. Bug closed.*
