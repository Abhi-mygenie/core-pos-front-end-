# BUG-037 — Owner Smoke Sign-off

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-037
> **Title:** Scan & Order Accept fails when restaurant default config is "Delivered"
> **Sign-off type:** Owner smoke-test pass (preprod)
> **Date:** 2026-05-12 (current session)
> **Final status:** `smoke_pass_ready_to_close` ✅
> **Resolution category:** Backend fix + FE constants alignment (no FE behavioural change required after BE response)
> **Related docs:**
> - Impact analysis / backend pull: `/app/memory/bugs/BACKEND_CONFIRMATION_PULL_BUG_037_039_042_047.md`

---

## 1. Owner Smoke Result

| # | Scenario | Status |
|---|---|---|
| 1 | Restaurant default order status set to "Delivered" → Scan & Order Accept succeeds (no HTTP 500) | ✅ PASS |
| 2 | Subsequent flow (printing / dashboard refresh) behaves correctly | ✅ PASS |
| 3 | Other default statuses (Placed / Preparing / Ready) — regression anchors unchanged | ✅ PASS |

**Owner explicitly confirmed end-to-end on preprod.**

---

## 2. What Was Verified

- Backend now accepts the "Delivered" default-status path correctly.
- FE `F_ORDER_STATUS_API` table (`/app/frontend/src/api/constants.js`) already carries the `DELIVERED: 'delivered'` literal — alignment confirmed.
- BUG-011 (Scan order HTTP 500/404) shared the same root cause and is also verified working — see `BUG_011_SMOKE_SIGNOFF.md`.

---

## 3. Closure Checklist

- [x] Backend fix delivered + owner-verified on preprod.
- [x] FE constants verified consistent.
- [x] No code change in this repo required during owner smoke.
- [x] No `/app/memory/final/` updates.
- [x] No `BUG_TEMPLATE.md` updates.
- [ ] **Tracker keeper:** flip BUG-037 row in `BUG_TEMPLATE.md` to Closed.

---

## 4. Final Status

**`smoke_pass_ready_to_close`** ✅

BUG-037 closed. Tracker flip pending.

---

*End of BUG-037 Smoke Sign-off. Bug closed.*
