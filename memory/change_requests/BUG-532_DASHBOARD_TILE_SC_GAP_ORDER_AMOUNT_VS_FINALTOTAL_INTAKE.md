# BUG-532 — Intake

## Dashboard Room Tile Amount ≠ CPP Total — order.amount Excludes Service Charge (SC Gap)

**Date:** 2026-10-10
**Type:** BUG
**Priority:** P2
**Risk:** MEDIUM
**Area:** PMS / Dashboard / DashboardPage (R5)
**Sprint:** oct_bug_batch
**Registered by:** INTAKE role (bundled with BUG-529)
**Related:** BUG-527 F1 (discount fix — partial fix; SC gap remains), BUG-529 (same bundle), backend brief BACKEND_BRIEF_DASHBOARD_BALANCE_SC_GAP_2026_10_10.md

---

## Duplicate check
- RELATED to BUG-527 F1: F1 fixed the discount subtraction on `computeRoomCardAmount`. SC gap is a pre-existing separate issue.
- DISTINCT root cause — BUG-527 F1 is implemented and correct; BUG-532 is the residual gap.
- DISTINCT from BUG-529, BUG-530, BUG-531

---

## Symptom
Dashboard room tile shows ₹827.  
CPP (CollectPaymentPanel) shows ₹848.  
Gap = **₹21 = Service Charge** on food order (₹248 with SC vs ₹227 without SC).

Numbers breakdown:
| Source | Food | Room Balance | Total |
|--------|------|------|-------|
| `computeRoomCardAmount` (DashboardPage) | `order.amount = ₹227` (no SC) | ₹600 | **₹827** |
| CPP `effectiveTotal` | `finalTotal = ₹248` (with SC) | ₹600 | **₹848** |

---

## Code Reality Check
**NONE — fix not applied (also backend-blocked)**

```
DashboardPage.jsx:L49 (computeRoomCardAmount):
  const food = Number(order?.amount) || 0;   ← order.amount = food subtotal WITHOUT service charge
```

Comment at L47 already documents this:
> "not the discount-aware finalTotal. Non-room orders are untouched and keep using `order.amount` directly."

CPP E1 uses `order.finalTotal` (with SC) via the roomInfo computation path.  
`computeRoomCardAmount` uses `order.amount` directly (no SC).

---

## Root Cause
Backend `order.amount` = food subtotal (pre-SC). The FE `finalTotal` adds SC on top via profileTransform.  
Dashboard tile reads `order.amount` directly; CPP reads `finalTotal` from a different computation path.  
**FE fix = use `order.finalTotal` instead of `order.amount` in `computeRoomCardAmount`.**  
However: `order.finalTotal` may not be available on all order snapshots (backend field availability TBC).  
**Backend ask already filed:** include SC in `order.amount` for room orders → no FE change needed.

---

## Evidence
- Source: AGENT-DISCOVERED (investigation session 2026-10-10)
- Confidence: CONFIRMED — code traced at DashboardPage.jsx L49, CPP E1 path
- Classified as: PRE-EXISTING (gap predates BUG-527; not a regression)
- Backend brief: `backend_briefs/BACKEND_BRIEF_DASHBOARD_BALANCE_SC_GAP_2026_10_10.md`

---

## Blast Radius
- **1 file:** `src/pages/DashboardPage.jsx` (**R5 hotspot**)
- **1 line:** `order.amount` → `order.finalTotal ?? order.amount`
- Estimated scope: SMALL (1 file, 1 line)
- Hotspot: YES (R5)
- Fast Lane eligible: NO (R5 file)
- **Backend-blocked:** FE change deferred until backend confirms `order.finalTotal` field availability on room-order snapshots, or ships SC in `order.amount`

---

## Owner Decisions
- OD-532-01: Proceed with FE fix using `order.finalTotal ?? order.amount` (R5) OR wait for backend to include SC in `order.amount`?  
  Recommended: wait for backend — avoids R5 edit for a P2 display gap.

---

## Classification
- **PRE-EXISTING gap** — not a regression introduced by BUG-527
- BUG-527 F1 fixed the discount subtraction. SC gap predates the entire oct_bug_batch.
- No money moves incorrectly — the CPP total is correct; the tile is a display indicator only.

---

## Gate Status
- Gate 1: COMPLETE (this document)
- Gate 2: BLOCKED (backend-blocked — OD-532-01 must be answered first)
- Gate 3: NOT started
- Gate 4 GO: NOT given

---

## Next
- Forward `backend_briefs/BACKEND_BRIEF_DASHBOARD_BALANCE_SC_GAP_2026_10_10.md` to backend team.
- Owner answer OD-532-01: FE fix now (R5) OR wait for backend?
- If FE fix approved: Gate 2 Impact Analysis → Gate 3 → bundle with BUG-529 pass.
