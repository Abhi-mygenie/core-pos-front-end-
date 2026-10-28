# BUG-489 — CR-407 check-in discount not visible on front-desk-v2 (mirror rule missed)

**ID:** BUG-489
**Type:** BUG
**Date:** 2026-10-05
**Registered by:** Intake agent (session 2026-10-05)
**Status:** GATE_1_INTAKE
**Sprint:** oct_bug_batch
**Risk:** MEDIUM
**Severity:** P1
**Related:** CR-407 (parent — Sub-scope A)

---

## Description

After CR-407 Sub-scope A was implemented, the room discount field is **not visible** on the check-in panel inside `front-desk-v2` (`/pms/front-desk-v2?tab=arrivals`).

Owner confirmed via screenshot: the right-hand check-in panel shows no discount input — only advance payment, B2B toggle, and "Confirm check-in".

---

## Root Cause

Two parallel check-in entry points exist in the codebase:

| Route | Component | Service | CR-407 applied? |
|-------|-----------|---------|:---:|
| `/pms/check-in` | `CheckInPage.jsx` | `pmsService.pmsCheckIn()` | ✅ YES |
| `/pms/front-desk-v2` | `CheckInForm.jsx` | `frontDeskService.buildCheckInFormData()` | ❌ NO |

Both files carry an explicit **mirror rule**:

- `CheckInForm.jsx` line 1–2: *"Copied from pages/pms/CheckInPage.jsx… mirror rule until FU-385-C"*
- `frontDeskService.js` line 69: *"FormData builder COPIED from pmsService.pmsCheckIn… mirror rule until FU-385-C"*

CR-407 Sub-scope A (A-E1..A-E5) updated `CheckInPage.jsx` + `pmsService.js` but did **not** apply the mirror to `CheckInForm.jsx` + `frontDeskService.js`. The mirror rule was not noted in the CR-407 plan.

**Classification:** PLAN_GAP (CR-407 scope missed the mirror rule)

---

## Duplicate Check

- Registry search: "CheckInForm", "frontDeskService", "mirror rule", "discount front-desk-v2" — no existing entry
- CR-407 explicitly scoped to `CheckInPage.jsx` · `pmsService.js` only — DISTINCT files
- **Duplicate check: DISTINCT — Related: CR-407**

---

## Code Reality

**NONE** — zero discount code in either target file.

```
grep "discount" CheckInForm.jsx        → 0 hits
grep "room_discount" frontDeskService.js → 0 hits
```

---

## Severity

**P1 — HIGH**
- `front-desk-v2` is the **primary** check-in interface used by staff (not the legacy `/pms/check-in`)
- Discount feature is completely absent — no field rendered, no data sent
- Workaround: use `/pms/check-in` directly — painful and not how staff operate
- No financial data corruption — feature is simply missing, not broken

---

## Risk Classification

**MEDIUM**
- Change mirrors CR-407 A-E1..A-E5 exactly (same pattern, same logic, different files)
- Neither `CheckInForm.jsx` nor `frontDeskService.js` is an R5 hotspot
- No financial formula change — discount UI + optional FormData append (guarded by `if (p.roomDiscount > 0)`)
- Same `roomDiscountRs` useMemo pattern already verified working in CheckInPage

---

## Evidence

- **Screenshot:** Owner-provided (session 2026-10-05) — check-in panel on front-desk-v2, no discount field visible
- **Static trace:** `CheckInForm.jsx` — no `ciRoomDiscountAmt`/`ciRoomDiscountType` state, no discount UI, no discount in `confirm()` call
- **Static trace:** `frontDeskService.buildCheckInFormData()` — no `fd.append('room_discount', ...)` block
- **Mirror rule confirmed:** `CheckInForm.jsx` line 1 + `frontDeskService.js` line 69 — both carry explicit mirror mandate
- **Source:** OWNER-REPORTED + AGENT-DISCOVERED (investigation)
- **Confidence:** CONFIRMED (static trace)

---

## Blast Radius

| File | Change |
|------|--------|
| `components/pms/frontdesk/CheckInForm.jsx` | Add `ciRoomDiscountAmt`/`ciRoomDiscountType` state + `roomDiscountRs` useMemo + discount UI (after advance section) + discount spread in `confirm()` |
| `api/services/frontDeskService.js` | Add conditional `fd.append('room_discount', ...)` block in `buildCheckInFormData()` |

- **2 files, not hotspots**
- **Blast radius: SMALL**

---

## Fix Sketch (for Planning)

Mirror CR-407 A-E1..A-E5 into the two target files:

1. **`CheckInForm.jsx`**
   - Add `ciRoomDiscountAmt` + `ciRoomDiscountType` state (mirrors A-E1)
   - Add `roomDiscountRs` useMemo (mirrors A-E2)
   - Spread discount into `confirm()` call (mirrors A-E3)
   - Add discount UI after advance/method section (mirrors A-E4)

2. **`frontDeskService.js`**
   - Add conditional `fd.append('room_discount', ...)` block in `buildCheckInFormData()` (mirrors A-E5)

All logic is identical to what was verified working in `CheckInPage.jsx` + `pmsService.js`.

---

## Next

Planning Gate 2 → Gate 3 → Gate 4 GO → Implementation
P1 — recommend prioritising in current `oct_bug_batch` sprint (CR-407 is already implemented and QA-pending).
