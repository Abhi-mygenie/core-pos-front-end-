# Session Handover — 2026-08-15 (Investigation: GAP-BULK-DEFAULTS Addon/Var Display)

**Date:** 2026-08-15
**Session type:** INVESTIGATION
**Item:** GAP-BULK-DEFAULTS — addon_expand/var_expand/image cells show "—"
**Root cause:** CONFIRMED (HIGH confidence, 4/10 steps)

---

## Finding

`CellRenderer` in `BulkEditor.jsx` (L1131–1227): the `image`, `addon_expand`, and `var_expand` type handlers are nested **inside** the `if (col.type === "dropdown")` block. They are structurally unreachable for non-dropdown column types.

All three show `—` (the L1228 fallthrough) instead of their designed output.

## Fix (zero logic change — structural move only)

Close the `dropdown` if-block after `clientId` handler (~L1184), move the 3 blocks to top-level.

## Investigation Report

`/app/memory/investigation/GAP-BULK-DEFAULTS_ADDON_VAR_DISPLAY_INVESTIGATION.md`

## Recommendation

Owner approves planning-skip (direct bug fix) → 1 file, structural move, zero logic change.
