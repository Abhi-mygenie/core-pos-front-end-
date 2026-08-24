# Bug Fix Report — GAP-BULK-DEFAULTS: CellRenderer Nesting Fix
**Date:** 2026-08-15
**Role:** BUG FIX
**File:** `components/panels/menu/BulkEditor.jsx`
**Investigation report:** `/app/memory/investigation/GAP-BULK-DEFAULTS_ADDON_VAR_DISPLAY_INVESTIGATION.md`

---

## Fix Summary

| Test | Severity | RCA | Root Cause | Fix | Lines | Verified |
|------|----------|-----|------------|-----|-------|---------|
| ADD-ONS/VARIATIONS/Img show `—` | MAJOR | CODE_ERROR | `image`, `addon_expand`, `var_expand` handlers nested inside `if (col.type === "dropdown")` block (L1131-1227) — structurally unreachable for non-dropdown types | Closed `dropdown` block after `clientId` handler (L1185); moved 3 handlers to top-level CellRenderer (L1189-L1229) | L1185 + L1186-1229 restructured | ✅ Code structure PASS — UI blocked by Firebase auth in headless env |

---

## Root Cause Pattern
CODE_ERROR — structural nesting. Zero logic error. The 3 CR-145 handlers were placed inside the wrong if-block during implementation. Fix is a structural move with zero logic change.

---

## Scope
- Files changed: `BulkEditor.jsx` only ✅
- Scope expansion: NONE
- Adjacent regression: 0 (no logic changed, only scope fixed)

---

## Compile Check
`webpack compiled successfully` — 0 new warnings ✅

---

## EXIT GATE — 5/5 PASS ✅
- [x] 1. registry.json: GAP-BULK-DEFAULTS → IMPLEMENTED — QA pending, sprint: pos_5_1
- [x] 2. BUG_TRACKER.md: GAP-BULK-DEFAULTS row added with IMPLEMENTED note
- [x] 3. FILE_OWNERSHIP.md: BulkEditor.jsx entry updated
- [x] 4. Code markers: `// CR-145 / GAP-BULK-DEFAULTS fix` at L1186
- [x] 5. Compile: 0 new warnings

---

## UI Verification Status
Automated UI test BLOCKED — this POS app requires Firebase auth which is unavailable in headless browser context. Code fix confirmed correct by:
- Static analysis: 3 blocks now at top-level (L1189, L1200, L1215)
- Testing agent code review: ✅ "Fix is correctly implemented in BulkEditor.jsx. The `image`, `addon_expand`, and `var_expand` renderers are now at top-level, outside the dropdown conditional block."
- Compile: clean

**Owner must verify on preprod via manual smoke test.**
