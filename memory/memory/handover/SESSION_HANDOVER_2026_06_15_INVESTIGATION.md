# SESSION HANDOVER — 2026-06-15 — INVESTIGATION: BUG-134 Root Cause Found
**Registry synced:** YES (BUG-134 → INVESTIGATION COMPLETE)
**Scope drift:** NONE — investigation only, zero code
**From:** INVESTIGATION agent · **For:** BUG FIX agent (or IMPLEMENTATION if owner approves direct fix)

## 1. One-line state
BUG-134 root cause: missing `min-h-0` on 3 flex-column parents in OrderEntry.jsx + CategoryPanel.jsx. HIGH confidence. 3-line fix. DIRECT_BUG_FIX eligible — awaiting owner approval to skip planning gates.

## 2. Root cause
CSS flexbox `min-height: auto` default prevents `overflow-y: auto` children from scrolling. Three flex-column containers lack `min-h-0`:
- `OrderEntry.jsx:1454` (middle panel — menu items)
- `OrderEntry.jsx:1606` (right panel — cart items)
- `CategoryPanel.jsx:20` (left panel — categories)

Contributing factor: `App.css` custom scrollbar width 6px (narrow for Windows classic scrollbar). Optional increase to 8px.

## 3. Why Windows-specific + intermittent
- Mac: overlay scrollbars mask the overflow calculation issue
- Windows: classic scrollbars + 6px width + display scaling (125%/150%) shifts the threshold
- Intermittent: depends on item count vs viewport height — borderline overflow

## 4. Fix (3 lines + 2 optional)
1. OrderEntry.jsx:1454 — add `min-h-0` class
2. OrderEntry.jsx:1606 — add `min-h-0` class
3. CategoryPanel.jsx:20 — add `min-h-0` class
4. (Optional) App.css:33-34 — scrollbar width 6px → 8px

## 5. Planning skip eligibility
✅ ≤10 lines, ✅ 2-3 files, ⚠️ hotspot OrderEntry.jsx (CSS-only, zero logic), ✅ not financial
→ DIRECT_BUG_FIX eligible. Owner must approve.

## 6. Investigation report
`/app/memory/BUG_134_INVESTIGATION_REPORT.md` — full trace, hypothesis table, flex chain diagram.
