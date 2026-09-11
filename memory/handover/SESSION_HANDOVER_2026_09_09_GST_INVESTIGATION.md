# Session Handover — GST Investigation Session

**Date:** 2026-09-09
**Branch:** audit8 (deployed to /app/frontend)
**Preview URL:** https://core-pos-preview-15.preview.emergentagent.com
**Sprint:** pos_pms_1
**Roles used:** INVESTIGATION

---

## Session Summary

Environment deployed (audit8 branch). Full memory dir synced from repo (88+ handover files restored). One full investigation cycle completed: GST wrong base + wrong slab on PMS Check-In form. Root cause confirmed with owner decision. Two bugs identified — both documented, no code written.

---

## What Was Done This Session

### 1. Environment + Memory Sync
- audit8 branch deployed to `/app/frontend/` (npm install, supervisor running)
- Full memory dir restored from `/tmp/pos-staging/memory/` → `/app/memory/` (444+ files)
- All env vars written to `/app/frontend/.env`

### 2. AGENT_PROMPT_ALPHA.md read → INVESTIGATION role selected
- Owner presented screenshot: ₹7,500 room showing 5% GST slab (expected 18%)
- Initial investigation: backend slab config gap (slab2.min = 7500.01) identified

### 3. Owner re-focused investigation
- Owner pointed out: "total seventy-six hundred" = room ₹7,500 + advance ₹100 = ₹7,600
- GST is being computed on room amount only — advance excluded from base

### 4. Investigation — Two bugs found (CLOSED)

**Bug A — PLAN_GAP (primary):** `CheckInPage.jsx` calls `computeRoomGst` with `form.orderAmount` only. `advancePayment` (₹100) is excluded. Since advance is an **additional charge** (not a deposit), the correct GST base = orderAmount + advancePayment = ₹7,600. Impact: wrong slab (5% instead of 18%), wrong GST amount, wrong balance_payment.

**Bug B — CONFIG_ISSUE (secondary):** Backend room_gst config has `slab2.min = 7500.01` instead of `7500.00`. Even with Bug A fixed, a room at ₹7,500 with zero advance would still hit the 5% slab.

**Owner decision OD-GST-02 CONFIRMED:** advance = additional charge → GST base = orderAmount + advancePayment.

---

## Exact Fix (for Planning agent — do NOT code without Gate 4 GO)

### E1 — `CheckInPage.jsx` GST strip (lines ~385–389)
- Change `amt` to `gstBase = amt + advAmt` (where advAmt = Number(form.advancePayment) || 0)
- Pass `gstBase` to `computeRoomGst` and to slab rate lookup
- Update "Total incl. GST" display to show `gstBase + gstTotal`

### E2 — `CheckInPage.jsx` handleConfirm (lines ~169–175)
- Change `Number(form.orderAmount)` → `Number(form.orderAmount) + Number(form.advancePayment || 0)`

### E3 — `pmsService.js` balance_payment (line 159)
- Current: `to2dp(orderAmount + gstTax - advance)`
- Fix: `to2dp(orderAmount + gstTax)` ← advance cancels out (it's in base AND subtracted)
- Verified: ₹100 advance + ₹8,868 balance = ₹8,968 total = (7500+100) + 1368 ✓

### Backend brief (separate — not FE)
- Change room_gst slab2.min: `7500.01` → `7500.00` for RID 69 (and any other affected restaurants)

Full detail: `/app/memory/evidence/BUG-GST-7500/INVESTIGATION_REPORT_BUG_GST_7500_2026_09_09.md`

---

## Numeric Proof

| | Current (wrong) | Fixed (correct) |
|---|---|---|
| GST base | ₹7,500 | ₹7,600 (room + advance) |
| Slab | 5% | 18% |
| GST tax | ₹375 | ₹1,368 |
| balance_payment | ₹7,775 | ₹8,868 |
| Total collected | ₹7,875 | ₹8,968 |

---

## Current PMS Status (unchanged from last session)

| State | Items |
|---|---|
| Gate 5b — Ready for owner smoke | CR-358-P1/P2/P3/P4, CR-360, BUG-380, BUG-381, BUG-386 (8 items) |
| Gate 5a — QA needed | CR-358-P5, BUG-383 |
| New — Investigation closed, needs INTAKE + Planning | **BUG-388 (GST advance base)** |
| Backend-blocked | BUG-384, BUG-385, CR-361/362/365/367 + slab config fix |
| Needs owner decisions | BUG-387 (OD-387-01/02) |

---

## Next Steps (priority order)

1. **INTAKE: BUG-388** — Register the GST advance base bug (3 edits, CRITICAL risk, 2 files)
2. **Planning: BUG-388** — Gates 2–3 (Impact Analysis + Implementation Plan)
3. **Gate 4 GO** — Owner approves plan before implementation
4. **Backend brief: slab config** — Send to backend team to fix slab2.min = 7500.01 → 7500.00
5. Continue with BUG-383 QA + CR-358-P5 QA + Gate 6 owner smoke batch (8 items)

---

## ⚠️ Pre-Production Checklist (carried forward)
- [ ] Remove `public/backend-briefs.html` before production deploy

---

*Session: 2026-09-09 | Role: INVESTIGATION | Sprint: pos_pms_1*
