# Investigation Report — GAP-BULK-DEFAULTS / CR-145: Add-ons & Variations Columns Show "—"

**Date:** 2026-08-15
**Role:** INVESTIGATION
**Steps used:** 4/10
**Triggered by:** Owner screenshot — ADD-ONS and VARIATIONS columns visible but showing "—" instead of chips

---

## 1. Summary

**Root cause:** `CellRenderer` in `BulkEditor.jsx` — the `addon_expand`, `var_expand`, and `image` type handlers (L1186, L1197, L1212) are **nested inside the `if (col.type === "dropdown")` block** (L1131–1227). They are structurally unreachable for non-dropdown column types.

**Classification:** FE_BUG — CODE_ERROR (wrong scope/nesting, not wrong logic)
**Confidence:** HIGH — confirmed by both static code analysis (brace-counting script) and API probe
**Steps used:** 4/10

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | Food item genuinely has no add-ons | API probe: `GET /api/v2/vendoremployee/product/addon-list` | ❌ ELIMINATED | 2 add-ons exist (`id=13193, name='Dark'`). Even with 0 add-ons, correct code shows "None" not "—". |
| H2 | `addons` prop not reaching BulkEditor | Code trace: MenuManagementPanel → BulkEditor | ❌ ELIMINATED (partial) | `BulkEditor` receives `addons=[]` prop (L206). Pass-through works. Doesn't explain "—". |
| H3 | CellRenderer `addon_expand`/`var_expand` trapped inside `dropdown` block | Code trace + brace-counting script | ✅ CONFIRMED | `dropdown` if-block spans L1131–L1227. `image` (L1186), `addon_expand` (L1197), `var_expand` (L1212) are inside. |

---

## 3. Data Flow Trace — BREAK POINT

```
API: GET /foods-list → food.addOns = []
Transform: menuManagementTransform.fromAPI.food() → addonIds: []
State: BulkEditor rows[i].addonIds = []
Component: CellRenderer receives col.type = "addon_expand"

CellRenderer execution path:
  L1102: if (col.type === "text")      → FALSE
  L1106: if (col.type === "number")    → FALSE
  L1112: if (col.type === "time")      → FALSE
  L1116: if (col.type === "toggle")    → FALSE
  L1125: if (col.type === "yesno")     → FALSE
  L1131: if (col.type === "dropdown")  → FALSE  ← NEVER ENTERS
         (addon_expand/var_expand handlers are INSIDE this block — dead code)
  L1228: return <span>—</span>         ← ALWAYS REACHED for addon_expand/var_expand/image
```

**Break point:** L1131 — `col.type === "dropdown"` is false for `addon_expand` columns, so the block containing the addon chip renderer is never entered.

---

## 4. Exact Code Evidence

**Confirmed by Node.js brace-counting script:**
```
dropdown if-block: lines 1131 to 1227
L1185: // CR-145: food thumbnail        ← inside dropdown block
L1186: if (col.type === 'image') {      ← inside dropdown block — UNREACHABLE for image columns
L1196: // CR-145: addon chip            ← inside dropdown block
L1197: if (col.type === 'addon_expand') { ← UNREACHABLE for addon_expand columns
L1211: // CR-145: variation chip        ← inside dropdown block
L1212: if (col.type === 'var_expand') { ← UNREACHABLE for var_expand columns
L1226: }
L1227: }  ← closes dropdown block
L1228: return <span>—</span>           ← fallthrough for ALL non-dropdown types
```

**API probe:** `GET /api/v2/vendoremployee/product/addon-list` — Restaurant 69 has **2 add-ons** (`id=13193 "Dark"` + 1 more). Token refreshed via login.

---

## 5. Design Deviation

| Element | Designed (CR-145) | Actual |
|---|---|---|
| ADD-ONS cell (food with 0 add-ons) | `"None"` chip (grey, clickable to add) | `—` (raw fallthrough) |
| ADD-ONS cell (food with N add-ons) | `"N add-ons ▾"` chip (blue, click to expand) | `—` |
| VARIATIONS cell (food with 0 groups) | `"None"` chip (grey, non-clickable) | `—` |
| VARIATIONS cell (food with N groups) | `"N groups ▾"` chip (purple, click to expand) | `—` |
| Image cell | 36×36 thumbnail or grey placeholder | `—` |

**Root cause of design deviation:** Same nesting bug. All 3 types (`image`, `addon_expand`, `var_expand`) were added to CellRenderer inside the `dropdown` block instead of at the top level.

---

## 6. Why This Wasn't Caught by CR-145 QA (18/18 PASS)

The CR-145 QA was conducted when `addons` was tier 2 and `variations` was tier 3 — **both HIDDEN by default**. The tester would have had to manually open the Columns picker to see them. The expand sub-row (AddonExpandPanel, VariationExpandPanel) may have been tested by directly triggering `toggleExpand` in the test, bypassing the chip click. The "—" rendering was not noticed because columns were hidden.

**GAP-BULK-DEFAULTS** (2026-08-15) promoted addons to tier 1 and variations to tier 2, making them visible by default — which exposed the broken chip rendering.

---

## 7. Evidence Artifacts

- API probe token: `/app/memory/inv_goan_token.txt` (refreshed 2026-08-15)
- Brace-counting script: inline (Node.js, no artifact needed)
- Source file: `components/panels/menu/BulkEditor.jsx` L1131–1228

---

## 8. Fix Required

**3 if-blocks must be moved from INSIDE the `dropdown` block to TOP-LEVEL in CellRenderer:**

```
Before (BROKEN):                     After (CORRECT):
if (col.type === "dropdown") {        if (col.type === "dropdown") {
  if (col.key === "categoryId") {...}    if (col.key === "categoryId") {...}
  if (col.key === "itemType") {...}      if (col.key === "itemType") {...}
  ...                                    ...
  if (col.key === "clientId") {...}      if (col.key === "clientId") {...}
  // WRONG POSITION:                  }                               ← close here
  if (col.type === 'image') {...}     // TOP-LEVEL (correct):
  if (col.type === 'addon_expand'){…} if (col.type === 'image') {...}
  if (col.type === 'var_expand') {...} if (col.type === 'addon_expand') {...}
}                                     if (col.type === 'var_expand') {...}
```

**File:** `components/panels/menu/BulkEditor.jsx`
**Lines involved:** L1131–L1228 (restructuring, zero logic change)
**Risk:** LOW — no logic changes; the 3 blocks' content is correct, just placed in wrong scope.

---

## 9. Recommendations

**Classification:** FE_FIX
**Scope:** 1 file (`BulkEditor.jsx`) — close the `dropdown` block after `clientId` check (~L1184), leave the 3 type-check blocks at top level.
**Planning skip eligible:** The content of the 3 blocks does NOT change; only the structural nesting changes. Technically ~40 lines involved. **Recommend owner approves a planning-skip (direct bug fix)** given the fix is zero-logic-change structural move.

**Retroactive candidates:** None (CR-145 is correctly registered; this is a post-delivery gap).

---
