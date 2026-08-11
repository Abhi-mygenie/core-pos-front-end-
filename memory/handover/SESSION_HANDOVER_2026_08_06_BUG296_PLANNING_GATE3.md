# Session Handover — 2026-08-06 BUG-296 Planning Gate 3

**Date:** 2026-08-06
**Role:** PLANNING (Role 2)
**Stage dispatched:** Gate 3 — Implementation Plan
**Items:** BUG-296
**Status:** GATE 3 COMPLETE — Awaiting Gate 4 GO from owner

---

## Summary (1 line)
Gate 3 Implementation Plan complete for BUG-296: exact edits at verified lines, Gate 4 GO placeholder recorded, Verification Matrix + Registry Checklist seeded for Implementation agent.

---

## Boot Confirmation
- Latest handover read: SESSION_HANDOVER_2026_08_06_BUG296_PLANNING_GATE2.md ✅
- Impact Analysis verified accurate (all 3 target lines unchanged) ✅
- registry.json: BUG-296 gate=3 confirmed before writing → now gate=4 ✅
- External conflicts: 0 ✅
- Baseline check: PASS ✅

---

## Gate 3 Output

**Document:** `/app/memory/plans/BUG-296_IMPLEMENTATION_PLAN.md`

### Edits (verified against live file before writing)

| Edit | File | Line | Before | After |
|------|------|------|--------|-------|
| E1 | `foodCourtService.js` | 105 | `'created_at'` (cache key) | `'collect_bill'` + `// BUG-296` |
| E2 | `foodCourtService.js` | 108 | `sort_by: 'created_at'` | `sort_by: 'collect_bill'` + `// BUG-296` |
| E3 | `foodCourtService.js` | 129 | `stationItems.reduce(price)` | `.filter(foodStatus!==3).reduce(price)` + `// BUG-296` |

**E1 + E2 are atomic** — one `search_replace` call covering both lines (both inside `fetchOrReuse` block).

### Key constraints for Implementation agent
1. Run Entry Verification grep BEFORE touching the file
2. E1 + E2 in ONE edit (atomic pair)
3. 3 `// BUG-296` markers required (one per edit)
4. All 5 EXIT GATE checks must pass before writing QA Handover
5. Revenue baseline: ZORKO = ₹5,74,715.00 / Total = ₹18,37,701.34

---

## Docs Updated
- `/app/memory/plans/BUG-296_IMPLEMENTATION_PLAN.md` — NEW (Gate 3 output)
- `/app/memory/control/registry.json` — BUG-296 → GATE 3 COMPLETE, gate=4
- `/app/memory/control/BUG_TRACKER.md` — BUG-296 row updated with plan refs

---

## Next Steps

**Owner:** Provide Gate 4 GO — record verbatim in `plans/BUG-296_IMPLEMENTATION_PLAN.md` header.

**Next role: IMPLEMENTATION** — execute E1, E2, E3 from approved plan. Self-test all V1–V10. Run EXIT GATE 5-point checklist. Write QA Handover at `/app/memory/handover/QA_HANDOVER_BUG296_<DATE>.md`.

**Credentials:** `owner@shimlaqohfoodcourt.com` / `Qplazm@10`

---

## Planning Final Format

```
Planning complete: BUG-296
Stage: Implementation Plan (Gate 3)
Code reality: FULL — target lines re-verified before writing plan
Risk: HIGH (R6)
Files WILL change: src/api/services/foodCourtService.js (3 edits, E1+E2 atomic)
Files WILL NOT touch: FoodCourtMockup.jsx, ItemSalesHybridMockup.jsx,
                      insightsService.js, insightsCache.js, orderTransform.js
Owner decisions: NONE
Docs: plans/BUG-296_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → IMPLEMENTATION
```
