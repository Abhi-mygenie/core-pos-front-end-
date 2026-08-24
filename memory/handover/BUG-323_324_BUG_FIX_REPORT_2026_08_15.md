# Bug Fix Report — BUG-323 + BUG-324
**Date:** 2026-08-15
**Agent role:** BUG FIX
**File changed:** `components/panels/menu/BulkEditor.jsx` (2 lines, single file)
**Authorized by:** Owner Gate 4 GO (session instruction 2026-08-15)

---

## Fix Summary

| Test # | Severity | RCA Classification | Root Cause | Fix | Lines Changed | Verified |
|--------|----------|--------------------|------------|-----|--------------|---------|
| BUG-323 | MAJOR | DATA_EDGE | `BulkEditor.jsx:324` — `o.categoryId !== Number(row.categoryId)`. When `categoryId=0`, JS falsy coercion: `0\|\|null = null`. `null !== Number(null)` → `null !== 0` → `TRUE`. Permanent false dirty. Affected 37/108 Aggregator foods. | `Number(o.categoryId ?? 0) !== Number(row.categoryId ?? 0)` — null-safe coercion both sides | L324 (+6 chars) | ✅ PASS |
| BUG-324 | MAJOR | CODE_ERROR | `BulkEditor.jsx:372` — `useCallback` deps array `[isDirty]` missing `menuType`. Closure created once at mount with `menuType="Normal"`. In Aggregator mode, `getColumns("Normal")` used → swiggy/zomato/clientId checks never run → Aggregator edits never marked dirty | Added `menuType` to deps: `[isDirty, menuType]` | L372 (+12 chars) | ✅ PASS |

---

## Root Cause Pattern
2/2 were pre-existing silent bugs: DATA_EDGE (falsy coercion) and CODE_ERROR (stale closure).
Both introduced during development; confirmed via investigation in previous session.

---

## Scope
- Files WILL change: `BulkEditor.jsx` ✅
- Files NOT touched: all other files ✅
- Scope expansion: NONE

---

## Compile Check
`webpack compiled with 1 warning` — same pre-existing CR-036 useMemo warning. **Zero new warnings.** ✅

---

## EXIT GATE — 5/5 PASS
- [x] 1. registry.json: BUG-323 + BUG-324 → IMPLEMENTED, sprint_key: pos_5_1
- [x] 2. BUG_TRACKER.md: rows updated with IMPLEMENTED status
- [x] 3. FILE_OWNERSHIP.md: BulkEditor.jsx row added under BUG-323 + BUG-324 section
- [x] 4. Code markers: `// BUG-323` L324 + `// BUG-324` L372 in BulkEditor.jsx
- [x] 5. Compile: 0 new warnings

---

## Escalated Items
NONE

## Next
QA spot-check → then Owner Smoke (Gate 6)
