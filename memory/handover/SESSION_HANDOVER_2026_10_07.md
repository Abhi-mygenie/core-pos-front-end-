# SESSION HANDOVER — 2026-10-07 (Full Session)

**Date:** 2026-10-07
**Roles used:** DEPLOYMENT → INVESTIGATION → INTAKE (BUG-502/503/504) → PLANNING Gate 2+3 → IMPLEMENTATION → INVESTIGATION → INTAKE (BUG-505, complete)
**App URL:** https://frontend-pos-live-4.preview.emergentagent.com
**Branch:** `5oct-1` — `https://github.com/Abhi-mygenie/core-pos-front-end-.git`
**Frontend:** RUNNING port 3000 · webpack `compiled successfully` · 0 new warnings

---

## 1. MANDATORY READING FOR NEXT AGENT

Read in this order before anything else:
1. `memory/control/AGENT_PROMPT_ALPHA.md` — role selection, gate rules
2. This handover (current file)
3. `memory/control/CONTROL_DASHBOARD.md` — live sprint state

---

## 2. WHAT HAPPENED THIS SESSION

### Phase 1 — Deployment
- Cloned branch `5oct-1` → synced `frontend/` into `/app/frontend/`
- Wrote `.env` with all 17 env vars (Firebase, CRM, Google Maps, API URLs, WDS socket)
- Synced `memory/` directory (33 files) from remote branch
- `yarn install --ignore-engines` · `craco start` · HTTP 200 confirmed
- Login page renders — MyGenie POS branding correct

### Phase 2 — Investigation + Intake (BUG-502/503/504)
- Owner reported 3 issues in check-in discount panel (Front Desk v2)
- Investigation: `investigations/INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07.md`
- Registered BUG-502 (P2/LOW), BUG-503 (P1/HIGH), BUG-504 (P0/CRITICAL)

### Phase 3 — Gate 2 + Gate 3 Planning
- Impact Analysis: `impact/BUG-502_IMPACT_ANALYSIS.md`, `impact/BUG-503_IMPACT_ANALYSIS.md`, `impact/BUG-504_IMPACT_ANALYSIS.md`
- Implementation Plans: `plans/BUG-502_IMPLEMENTATION_PLAN.md`, `plans/BUG-503_IMPLEMENTATION_PLAN.md`, `plans/BUG-504_IMPLEMENTATION_PLAN.md`
- All ODs were agent-selected defaults (see §7 OD STATUS)

### Phase 4 — Gate 5A Implementation (BUG-502 + BUG-503 + BUG-504)
- All 3 bugs implemented across 2 files
- webpack compiled successfully · 0 new warnings
- QA handover written: `handover/QA_HANDOVER_BUG502_503_504_2026_10_07.md`

### Phase 5 — Investigation + Intake (BUG-505) ← ⚠️ OUTSTANDING
- Owner reported "GST coming twice" on the check-in bill after BUG-503 was applied
- Root cause found: BUG-503 E4 used wrong OD choice (Option A replaced static bill grid values with dynamic post-discount values — inconsistent display)
- Also: BUG-503 E5 introduced wrong balance due formula (₹102.50 instead of ₹50)
- **BUG-505 registered and intake COMPLETE: GATE_1_INTAKE**
- Owner confirmed: balance formula = `bc − discount − advance = ₹50` (NOT ₹102.50)
- **BUG-505 FIX NOT YET IMPLEMENTED — top priority for next agent**

---

## 3. CURRENT CODE STATE — EXACT FILES CHANGED

### CheckInForm.jsx — BUG-502+503+504 implemented (contains BUG-505 defect at L196-202)

| # | Lines | Bug | Change | State |
|---|-------|-----|--------|-------|
| 1 | L11-12 | BUG-503 | `useRestaurant` + `computeRoomGst` imports | ✅ Correct |
| 2 | L29-33 | BUG-503 | Hook + `formNights = row?.nights ?? 1` | ✅ Correct |
| 3 | L65-75 | BUG-503+504 | `{ maxPct, maxFlat }` useMemo with `gst_on_advance` — reordered BEFORE roomDiscountRs | ✅ Correct |
| 4 | L77-85 | BUG-504 | `roomDiscountRs` cap → `maxFlat` (₹7,950) | ✅ Correct |
| 5 | L91-94 | BUG-503 | `displayGstTotal/displayCgst/displaySgst` useMemo | ✅ Keep — needed by BUG-505 strip (Part B) |
| 6 | L96-102 | BUG-503 | `displayGstRate` useMemo | ✅ Keep — needed by BUG-505 strip (Part B) |
| 7 | **L196-198** | **BUG-503 ❌** | SGST/CGST/slab badge dynamic in bill grid | **❌ BUG-505 — revert to `c.sgst`/`c.cgst`** |
| 8 | **L199** | **BUG-503 ❌** | Total dynamic in bill grid | **❌ BUG-505 — revert to `c.total_with_gst`** |
| 9 | **L202** | **BUG-503 ❌** | Balance `bc−disc+displayGstTotal−advance=₹102.50` | **❌ BUG-505 — fix to `bc−disc−advance=₹50`** |
| 10 | L225 | BUG-504 | Input max → `maxFlat` | ✅ Correct |
| 11 | L241-245 | BUG-502 | Alert moved outside flex row | ✅ Correct |
| 12 | L244 | BUG-504 | Alert text → `maxFlat.toLocaleString()` | ✅ Correct |

### CheckInPage.jsx — BUG-502+504 implemented — CLEAN (no BUG-505 issue)

| # | Lines | Bug | Change | State |
|---|-------|-----|--------|-------|
| 1 | L265-275 | BUG-504 | `{ maxPct, maxFlat }` useMemo with `gst_on_advance` | ✅ Correct |
| 2 | L277-286 | BUG-504 | `roomDiscountRs` cap → `maxFlat` | ✅ Correct |
| 3 | L907 | BUG-504 | Input max → `maxFlat` | ✅ Correct |
| 4 | L922-926 | BUG-502 | Alert moved outside flex row | ✅ Correct |
| 5 | L925 | BUG-504 | Alert text → `maxFlat.toLocaleString()` | ✅ Correct |

---

## 4. BUG-505 — TOP PRIORITY — NOT YET IMPLEMENTED

**Status:** GATE_1_INTAKE · P1/HIGH · `CheckInForm.jsx` only · SMALL blast

### What's wrong right now in CheckInForm.jsx
```
Bill grid currently shows (with 90% discount entered):
  Booking charge     ₹9,000   ← static (correct)
  SGST               ₹26.25   ← WRONG: should be c.sgst = ₹810
  CGST               ₹26.25   ← WRONG: should be c.cgst = ₹810
  5% Slab            badge     ← WRONG: remove from bill grid
  Total (incl. GST)  ₹1,102.50 ← WRONG: should be c.total_with_gst = ₹10,620
  Already paid       ₹1,000   ← correct
  Balance due        ₹102.50  ← WRONG: should be ₹50
```

### Owner-confirmed correct balance formula
```
bc − roomDiscountRs − advance = 9000 − 7950 − 1000 = ₹50   ✅
```
Why ₹102.50 is wrong: `displayGstTotal=5%×1050=52.50` includes `5%×50=2.50` (GST applied to the preserved GST — compound effect).

### BUG-505 Fix (Gate 2→3→4→5)

**OD-505-01 LOCKED** — Owner confirmed both parts.

**Part A — Revert 6 lines in CheckInForm.jsx L196-202:**
```javascript
// L196: displaySgst → c.sgst
// L197: displayCgst → c.cgst
// L198: REMOVE slab badge row entirely
// L199: (bc-disc)+displayGstTotal → c.total_with_gst
// L201: update comment
// L202: max(0, bc-roomDiscountRs+displayGstTotal-advance) →
         max(0, Number(c.booking_charge||0) - roomDiscountRs - Number(c.advance_payment||0))
```

**Part B — Add separate GST strip AFTER discount section (~L244):**
- Mirrors CheckInPage.jsx L927-970 exactly
- Uses EXISTING `displayGst`/`displayGstRate` useMemos (L91-102) — DO NOT REMOVE
- Only visible when `roomGstApplicable && roomGstSlabs && roomDiscountRs > 0`
- INFORMATIONAL only — no impact on balance due

**Bill after fix (at max discount ₹7,950):**
```
Booking charge     ₹9,000  |  Already paid  ₹1,000
SGST               ₹810    |  Balance due   ₹50  ← bc−disc−advance ✓
CGST               ₹810    |
Total (incl. GST)  ₹10,620 |

[Room Discount ₹7,950]

GST after discount (informational strip):
  5% Slab · CGST ₹26.25 · SGST ₹26.25 · Total ₹52.50 · Incl. GST ₹1,102.50
```

**Intake doc:** `change_requests/BUG-505_CHECKINFORM_BILL_GRID_MIXED_STATIC_DYNAMIC_GST_INTAKE.md`
**Evidence:** `evidence/BUG-505/formula_trace_2026_10_07.md`

---

## 5. REGISTRY STATE

| ID | Status | QA Handover | Notes |
|----|--------|-------------|-------|
| BUG-492 | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG492_2026_10_06.md` | Pending QA 5b |
| BUG-493 | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG493_2026_10_06.md` | Pending QA 5b |
| BUG-494 | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG494_2026_10_06.md` | Pending QA 5b |
| BUG-495 | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG495_2026_10_06.md` | Pending QA 5b |
| BUG-496 | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG496_497_500_501_2026_10_07.md` | Pending QA 5b |
| BUG-497 | GATE_5A_IMPLEMENTED | same | Pending QA 5b |
| **BUG-498** | **GATE_5A_IMPLEMENTED** | **NONE — write before Gate 5b** | Financial / FolioCheckoutPanel |
| **BUG-499** | **GATE_5A_IMPLEMENTED** | **NONE — write before Gate 5b** | Financial / FolioCheckoutPanel |
| BUG-500 | GATE_5A_IMPLEMENTED | same as 496/497 | Pending QA 5b |
| BUG-501 | GATE_5A_IMPLEMENTED | same | Pending QA 5b |
| BUG-502 | GATE_5A_IMPLEMENTED | `QA_HANDOVER_BUG502_503_504_2026_10_07.md` | ⚠️ DEFER QA until BUG-505 fixed |
| BUG-503 | GATE_5A_IMPLEMENTED | same | ⚠️ DEFER QA until BUG-505 fixed |
| BUG-504 | GATE_5A_IMPLEMENTED | same | ⚠️ DEFER QA until BUG-505 fixed |
| **BUG-505** | **GATE_1_INTAKE** | **NONE — needs Gate 2-3-4-5** | **TOP PRIORITY** |

Total registry: 788 items · Sprint: `oct_bug_batch`

---

## 6. SUGGESTED NEXT AGENT PRIORITY ORDER

**1. BUG-505 Gate 2→3→4→5 (P1/HIGH — bill display wrong RIGHT NOW)**
> OD-505-01 already LOCKED — Gate 2 can be minimal, Gate 3 is ~6 edits in 1 file.
> Ask owner: "Gate 4 GO for BUG-505?" (or Fast Lane if owner approves)
> Implement Part A (revert) + Part B (add strip)

**2. Write QA handover for BUG-498 + BUG-499 (CRITICAL — financial, no handover exists)**
> Reference: `plans/BUG-498-499_REVISED_GATE3_PLAN.md`
> FolioCheckoutPanel.jsx — 17+2 edits — checkout discount + F&B split

**3. QA Gate 5b for BUG-502+503+504+505 (combined, after BUG-505 fixed)**
> Handover: `handover/QA_HANDOVER_BUG502_503_504_2026_10_07.md` + new BUG-505 cases

**4. QA Gate 5b for BUG-496+497+500+501**
> Handover: `handover/QA_HANDOVER_BUG496_497_500_501_2026_10_07.md`

**5. QA Gate 5b for BUG-492/493/494/495**
> Handovers already written (2026-10-06)

---

## 7. OD STATUS

| OD | Choice | Status |
|----|--------|--------|
| OD-503-01 | Option A (useRestaurant hook) | Agent-selected; confirm at Gate 6 |
| OD-503-02 | Option A → **superseded: owner chose Option B via BUG-505** | Superseded |
| OD-504-01 | LOCKED (gst_on_advance formula) | ✅ |
| OD-504-02 | Option A (toFixed(2) decimal %) | Agent-selected; confirm at Gate 6 |
| OD-504-03 | Option A (Percent-only trigger, no code change) | Agent-selected; confirm at Gate 6 |
| **OD-505-01** | **LOCKED: static bill grid + separate strip + balance = bc−disc−advance** | **Owner confirmed** |

---

## 8. ⚠️ CRITICAL WARNINGS FOR NEXT AGENT

### BUG-505 — bill grid wrong RIGHT NOW
- CheckInForm.jsx L196-202: dynamic GST in static bill section
- `displayGst` + `displayGstRate` useMemos at L91-102: **KEEP — needed for BUG-505 Part B strip**
- Balance due: `+displayGstTotal` in formula is the compound GST error

### effectiveBalanceDue (CheckInPage.jsx) — DO NOT CHANGE
- Collect Now max uses `bc−rawDiscount−bookingAdv` (no GST, backend-compatible)
- This is correct per BUG-500 probe — do NOT add GST back in

### maxPct+maxFlat useMemo ORDER — critical in both files
- Must be declared **BEFORE** `roomDiscountRs` useMemo
- `roomDiscountRs` uses `maxFlat` — reversing order causes undefined reference

### TDZ trap in FolioCheckoutPanel.jsx
- `baseBalance` declared at ~L238. ALL useMemos referencing `baseBalance` MUST be after L238.

### BUG-498+499 — no QA handover
- FolioCheckoutPanel.jsx 17+2 edits — financial settlement
- Must write QA handover before Gate 5b

---

## 9. CREDENTIALS + ENVIRONMENT

| Item | Value |
|------|-------|
| App URL | `https://frontend-pos-live-4.preview.emergentagent.com` |
| Preprod API | `https://preprod.mygenie.online/` |
| Socket | `https://presocket.mygenie.online` |
| Login (owner) | `owner@thegoankitchen.com` / `Qplazm@10` |
| Login (staff) | `boi@bang.com` / `Qplazm@10` |
| Test restaurant | RID 69 (The Goan Kitchen) |
| Branch | `5oct-1` |

---

## 10. ARTIFACTS CREATED THIS SESSION

| Type | Path |
|------|------|
| Investigation | `investigations/INV-CHECKIN-DISCOUNT-CAP-GST-2026_10_07.md` |
| Investigation | `investigations/INV-BUG503-DISPLAY-2026_10_07.md` |
| Evidence | `evidence/BUG-505/formula_trace_2026_10_07.md` |
| Intake | `change_requests/BUG-502_CHECKIN_DISCOUNT_ALERT_SHRINKS_INPUT_INTAKE.md` |
| Intake | `change_requests/BUG-503_CHECKIN_FORM_GST_NO_RECALC_ON_DISCOUNT_INTAKE.md` |
| Intake | `change_requests/BUG-504_CHECKIN_MAX_DISCOUNT_CAP_MISSING_GST_ON_ADVANCE_INTAKE.md` |
| Intake | `change_requests/BUG-505_CHECKINFORM_BILL_GRID_MIXED_STATIC_DYNAMIC_GST_INTAKE.md` |
| Impact Analysis | `impact/BUG-502_IMPACT_ANALYSIS.md` |
| Impact Analysis | `impact/BUG-503_IMPACT_ANALYSIS.md` |
| Impact Analysis | `impact/BUG-504_IMPACT_ANALYSIS.md` |
| Plan | `plans/BUG-502_IMPLEMENTATION_PLAN.md` |
| Plan | `plans/BUG-503_IMPLEMENTATION_PLAN.md` |
| Plan | `plans/BUG-504_IMPLEMENTATION_PLAN.md` |
| QA Handover | `handover/QA_HANDOVER_BUG502_503_504_2026_10_07.md` |
| This handover | `handover/SESSION_HANDOVER_2026_10_07.md` |

---

## 11. SELF-ASSESSMENT

| Dimension | Score | Notes |
|-----------|-------|-------|
| Deployment complete? | ✅ YES | App running, memory synced |
| BUG-502 Gate 5A? | ✅ YES | Alert moved outside flex row — both files |
| BUG-503 Gate 5A? | ⚠️ PARTIAL | Implemented but OD-503-02 Option A was wrong → introduced BUG-505 |
| BUG-504 Gate 5A? | ✅ YES | maxFlat cap + alert text correct in both files |
| BUG-505 intake complete? | ✅ YES | Full intake, formula confirmed by owner |
| BUG-505 implemented? | ❌ NO | Needs Gate 2-3-4-5 next session |
| BUG-498+499 QA handover? | ❌ NO | Must write before Gate 5b |
| webpack clean? | ✅ YES | compiled successfully, 0 new warnings |
| CheckInPage.jsx issues? | ✅ NONE | Clean, no BUG-505 contamination |
