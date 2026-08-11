# BUG-223 — Stock Audit Drift Preview (Amber + Banner) — IMPLEMENTATION PLAN (Gate 3)

**Date:** 2026-07-23 (Session E) | **Impact:** `/app/memory/BUG-223_IMPACT_ANALYSIS.md` (approved; no owner decisions) | **Risk:** LOW
**Entry verification:** PASS 2026-07-23 — negative-drift red badge block and `hasEntries`/`handleSaveAll` present in StockAuditPanel.jsx (badge block near lines 160-170; toolbar near :96-115 — implementer re-anchors by searching `TrendingDown`).

## Dependencies / Wave
Standalone — any session. No shared-file conflicts (registry scan CLEAR).

## Scope Lock
WILL change: `components/inventory/StockAuditPanel.jsx` only. WILL NOT touch: `handleSaveAll`/addStock flow, getDrift math, positive/match badges.

## Edits (exact)
1. **Negative drift badge** (search anchor: `text-red-600 bg-red-50` + `TrendingDown`):
```jsx
<span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
  <TrendingDown className="w-3 h-3" /> {drift.diff.toFixed(2)} {drift.unit}
</span>
```
→
```jsx
<span className="inline-flex flex-col items-center gap-0.5 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full" data-testid="drift-preview-badge"> {/* BUG-223 */}
  <span className="inline-flex items-center gap-1"><TrendingDown className="w-3 h-3" /> {drift.diff.toFixed(2)} {drift.unit}</span>
  <span className="text-[9px] text-amber-400 font-normal leading-none">preview</span>
</span>
```
2. **Unsaved banner** — after toolbar div, conditional `hasEntries` (impact doc Fix B verbatim, `data-testid="unsaved-adjustments-banner"`), + `AlertCircle` added to existing lucide import. `// BUG-223`.

1 file, ~15-20 lines.

## Verification Matrix
| # | Verify | How | Auto? |
|---|---|---|---|
| 1 | Enter physical qty → amber badge + "preview" + banner appears | Browser | NO |
| 2 | No API call fires on typing (Network tab silent) | Browser | NO |
| 3 | Save Adjustments → entries cleared, banner gone (existing flow unchanged) | Browser (revert test adjustment or use net-zero entry) | NO |
| 4 | Match/positive badges still green | Browser | NO |

## Registry Checklist
- [ ] registry.json BUG-223 → IMPLEMENTED, pos_5_0  - [ ] BUG_TRACKER row  - [ ] FILE_OWNERSHIP  - [ ] `// BUG-223` markers  - [ ] webpack clean

*Gate 3 complete. Awaiting Gate 4 GO.*
