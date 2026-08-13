# Session Handover — 2026-08-06 BUG-296 Planning (Gate 2)

**Date:** 2026-08-06
**Role:** PLANNING (Role 2)
**Stage dispatched:** Gate 2 — Impact Analysis only (STOP per stage dispatch rule)
**Items:** BUG-296
**Status:** GATE 2 COMPLETE — ready for owner review → Gate 3

---

## Summary (1 line)
Gate 2 Impact Analysis complete for BUG-296: 1 file, 3 edits confirmed at exact lines; scope lock declared; verification matrix seeded for Gate 3 + QA.

---

## Boot Confirmation (per R28)
- CONTROL_DASHBOARD.md: read ✅
- BUG-296 intake doc: read ✅
- FILE_OWNERSHIP.md: read — last modifier CR-045 (CLOSED), no conflict ✅
- OPEN_GAPS_REGISTER.md: read — FE-PROPORTIONAL-001 noted (intentional divergence, not affected) ✅
- foodCourtService.js: read — all 3 target lines verified at exact positions ✅
- Baseline check: PASS — target file not frozen ✅
- API Probe Log: DONE — evidence/BUG-296/live_validation_2026_08_06.json confirms gap = ₹0.00 ✅

---

## Impact Analysis Output

**Document:** `/app/memory/impact/BUG-296_IMPACT_ANALYSIS.md`

### What changes
| Edit | File | Line | Change |
|------|------|------|--------|
| E1 | `foodCourtService.js` | 105 | cache key `'created_at'` → `'collect_bill'` |
| E2 | `foodCourtService.js` | 108 | `sort_by: 'created_at'` → `sort_by: 'collect_bill'` |
| E3 | `foodCourtService.js` | 129 | `itemTotal` filter: add `.filter(it => it.foodStatus !== 3)` |

**Note:** E1 + E2 are atomic (must ship together — cache key must match API sort param).

### Key findings
- `gstAmount` and `vatAmount` (L130-131) already filter `foodStatus !== 3` — E3 corrects the inconsistency on `itemTotal` only
- Cache key change (E1) is necessary to prevent stale `created_at` results from being served after the API call changes
- After fix, Food Court shares cache with Item Sales (both use `collect_bill`) — bonus efficiency
- Discount proportional share (L134-137) side-effect: minor, negligible for Shimla (rare cancellations, no discounts)
- `totalQty`, `itemCount`, `orderDetails` still include cancelled items — display-only, out of scope

### Scope lock
- **WILL change:** `src/api/services/foodCourtService.js` (1 file, 3 edits)
- **WILL NOT touch:** `FoodCourtMockup.jsx`, `ItemSalesHybridMockup.jsx`, `insightsService.js`, `insightsCache.js`, `orderTransform.js`, `reportTransform.js`

### Revenue baseline for regression (post-fix)
| Station | Expected revenue |
|---------|-----------------|
| CREAMBELLPARLOUR | ₹2,42,458.34 |
| GUPTAJEE | ₹7,18,535.00 |
| MSB | ₹3,01,993.00 |
| ZORKO | ₹5,74,715.00 |
| TOTAL | ₹18,37,701.34 |

---

## Docs Updated
- `/app/memory/impact/BUG-296_IMPACT_ANALYSIS.md` — NEW (Gate 2 output)
- `/app/memory/control/registry.json` — BUG-296 → GATE 2 COMPLETE, gate=3
- `/app/memory/control/BUG_TRACKER.md` — BUG-296 row status updated

---

## Next Steps for Next Agent (PLANNING Gate 3 or IMPLEMENTATION)

**Owner must:**
1. Review `/app/memory/impact/BUG-296_IMPACT_ANALYSIS.md`
2. Confirm scope + risk acceptable
3. Provide Gate 3 GO (Implementation Plan) → then Gate 4 GO (code)

**Next role: PLANNING (Gate 3)** — write Implementation Plan at `/app/memory/plans/BUG-296_IMPLEMENTATION_PLAN.md`

Gate 3 plan must include:
- Exact edits (file, line, current → new) — already verified in Impact Analysis
- Gate 4 GO record placeholder (verbatim owner words + date)
- Verification matrix (inherited from §9 of Impact Analysis)
- Post-code registry checklist (from §11 of Impact Analysis)

**Credentials:** `owner@shimlaqohfoodcourt.com` / `Qplazm@10` (regression testing)

---

## Planning Final Format

```
Planning complete: BUG-296
Stage: Impact Analysis (Gate 2)
Code reality: FULL — target lines confirmed at exact positions
Risk: HIGH (R6 — reports revenue computation)
Files WILL change: src/api/services/foodCourtService.js (3 edits)
Files WILL NOT touch: FoodCourtMockup.jsx, ItemSalesHybridMockup.jsx,
                      insightsService.js, insightsCache.js, orderTransform.js
Owner decisions: NONE (both fixes approved in Investigation session)
Docs: impact/BUG-296_IMPACT_ANALYSIS.md
Next: Owner review → Gate 3 GO → Implementation Plan
```
