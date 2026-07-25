# BUG-127 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — Gate 3 blocked on OWNER DECISION (tile semantics)

## 1. Module Mapping
- Service: `insightsService.getDashboardAggregated` → `payments.unsettledTab` → Dashboard tile (DashboardMockup payments card)
- Dead code at ~line 655: `if (pm === 'tab' && fStatus !== '6')` nested inside `if (isPaid)` (`isPaid = fStatus === '6'`)

## 2. Options (owner picks ONE before Gate 3)
| Option | Change | Implication |
|---|---|---|
| A. Redefine as "Credit outstanding" | `unsettledTab += orderAmount` for ALL `payment_method==='TAB'` rows regardless of fStatus | Shows ₹70,573 (palmhouse Mar) etc. Matches Ledger "Added to Credit" tab. Honest number TODAY despite BUG-129 |
| B. Remove the tile | Delete metric + tile | No misinformation; loses credit visibility |
| C. Wait for BUG-129 backend fix | Keep, hoist condition out of isPaid | Still ₹0 until backend stops stamping fStatus=6 — NOT recommended |

Recommendation: **Option A** — it is computable correctly from current payloads and aligns with the Ledger credit tab.

## 3. Affected Files
| File | Change | Risk |
|---|---|---|
| `frontend/src/api/services/insightsService.js` | Move/redefine unsettledTab accumulation | LOW |
| `frontend/src/pages/reports-module/DashboardMockup.jsx` | Tile label ("Credit Outstanding (TAB)") | LOW |

## 4. Regression Risk
- LOW. `unsettledTab` consumed only by the one tile. No export/PDF path reads it.
- Cross-check: tile value (Option A) must equal Ledger "Added to Credit" tab total for same range (room-exclusion difference: Dashboard includes rooms — note CR-029 interplay; TAB orders at palmhouse are non-room except edge cases, verify in QA).

## 5. Test Strategy
- Palm House May: expect ₹49,460 (86 orders) under Option A.
- `/app/audit_data/analyze.py` `tab.rev` provides expected values for all months.
