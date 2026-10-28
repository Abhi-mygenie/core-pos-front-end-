# BUG-457 — Impact Analysis (Gate 2)
**S1: Addon recipe delete fails 422 "The reason field is required." (FE sends no body)**
**S2: Deleted recipe row stays in list until page reload (missing onRefresh)**

**Planning agent:** 2026-09-24 · **Code Reality:** NONE · **Conflict Pre-Check:** CLEAN
**Risk:** HIGH (API contract) · **OD-457-01 LOCKED: reason = dropdown from `delete-reasons`**

---

## Header

| Field | Value |
|---|---|
| Code Reality | **NONE** — `grep -n "reason" recipeService.js deleteAddonRecipe` = 0 hits; `RecipeBulkEditor deleteRow` uses `window.confirm` only |
| Conflict Pre-Check | **CLEAN** — `recipeService.js` + `RecipeBulkEditor.jsx` not touched by any active sprint item in sep_bug_closure |
| Hotspot files (R5) | **NONE** — `RecipeBulkEditor.jsx` is NOT in the R5 hotspot list |
| Financial logic (R6) | **NO** — recipe deletion is a catalogue operation |
| API contract confirmed | **HIGH confidence** — live curl 2026-09-24: no-body → 422, `{reason}` → 200 |
| Owner decisions locked | OD-457-01 LOCKED: dropdown from `GET product/delete-reasons` · **OD-457-02 LOCKED: Option A (Addon only)** · **OD-457-03 LOCKED: YES (useMemo +3 lines)** · OD-457-04 OPEN (optional). **Gate 2 CLOSED 2026-09-24.** |

---

## §1 · S1 Data Flow Trace — Addon Delete

```
UI  RecipeBulkEditor.jsx:209 deleteRow(row)
    :214 window.confirm(...)           ← OK/Cancel only, no reason collected
    :216 await dispatch.del(row.id)    [dispatch.addon.del = recipeService.deleteAddonRecipe]

SVC recipeService.js:83
    deleteAddonRecipe(id) {
      return api.delete(`${DELETE_ADDON_RECIPE}/${id}`)   ← NO body
    }

API DELETE /api/v2/vendoremployee/product/delete-addon-recipe/{id}
    → 422 {"errors":{"reason":["The reason field is required."]}}
    ← BREAK POINT S1: recipeService.js:83 sends no body; RecipeBulkEditor collects no reason

FIX CONTRACT (curl-verified 2026-09-24):
    api.delete(url, { data: { reason: '<text>' } }) → 200 "Add-on recipe deleted successfully."
Standard/Sub: api.delete(url) with no body → 200 (reason NOT required, NOT stored)
```

## §2 · S2 Data Flow Trace — Stale List After Delete

```
RecipeBulkEditor.jsx:216  await dispatch.del(row.id) → 200
:218  setRows(prev => prev.filter(r => r._key !== row._key))  ← LOCAL removal only
      NO onRefresh?.() call  ← BREAK POINT S2 (Batch Save L272/277 has it; deleteRow does not)

Parent RecipeManagementPanel.jsx:583:
  <RecipeBulkEditor recipes={sortRecipes({...}[activeTab])} .../>
  sortRecipes() returns a NEW array on every parent render

RecipeBulkEditor.jsx:99–103 useEffect:
  [recipes, recipeType, foodsMaster] deps → re-seeds rows from parent's STALE list
  on next parent render (tab switch, sort, search) → deleted recipe reappears
Card view + tab counters: same stale data until fetchData() (page reload / batch save)
```

---

## §3 · OD-457-02 — Addon-only vs All Tabs (OPEN)

| Option | What it means | Recommendation |
|---|---|---|
| **Addon only** (recommended) | Reason dialog shown only on Addon tab. Standard + Sub use a simple Confirm AlertDialog (no reason field). | Matches backend contract — reason is required by addon endpoint, irrelevant for standard/sub. |
| All 3 tabs | Reason dialog on all tabs; backend ignores reason for standard/sub. | Consistent UX; slightly more code; reason values are menu-oriented ("Item not in menu"). |

**IA proceeds with Option A (Addon only) — LOCKED by owner 2026-09-24.**
Standard + Sub use a plain "Are you sure?" AlertDialog (no reason dropdown). ~5 fewer lines than Option B.

---

## §4 · Delete Reasons Endpoint (curl-verified)

```
GET /api/v2/vendoremployee/product/delete-reasons
→ 200 {"reason": ["Item not in menu any more", "Duplicate item"]}
```
Already wrapped by `menuManagementService.getDeleteReasons()` (confirmed by investigation). No new API call needed — reuse existing service function.

---

## §5 · Affected Files — Exact Edit Sites

### E1 — `src/api/services/recipeService.js`

| Sub | Lines | Change |
|---|---|---|
| E1a | L83–84 `deleteAddonRecipe(id)` | Change signature to `deleteAddonRecipe(id, reason)` and body to `api.delete(url, { data: { reason } })` |

**~2 lines changed.** No other service function changes.

---

### E2 — `src/components/inventory/RecipeBulkEditor.jsx`

**New state needed:**
```js
const [deleteTarget, setDeleteTarget] = useState(null);   // {row, isAddon}
const [deleteReason, setDeleteReason] = useState('');
const [deleteReasons, setDeleteReasons] = useState([]);   // from getDeleteReasons()
```

| Sub | Lines | Change |
|---|---|---|
| E2a | Imports | Add `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle` from `@/components/ui/alert-dialog` · Add import of `menuManagementService` |
| E2b | State | Add `deleteTarget`, `deleteReason`, `deleteReasons` state vars (3 lines) |
| E2c | `deleteRow()` L209–221 | Replace `window.confirm` + immediate delete with: set `deleteTarget = {row, isAddon: recipeType === 'addon'}` → open AlertDialog. Fetch reasons if addon. |
| E2d | `confirmDelete()` (new fn) | Execute `dispatch.del(row.id, reason)` → toast success → `setRows(filter)` → **`onRefresh?.()`** → `setDeleteTarget(null)` |
| E2e | AlertDialog JSX (after row list) | Confirm dialog: if `isAddon` → reason `<select>` from `deleteReasons` (required, disabled if empty); else plain "Are you sure?". Cancel + Delete buttons. |

**Estimated lines:** ~35–40 lines across E2b–E2e. Precedent: `IngredientBulkEditor.jsx:527` AlertDialog (BUG-276 pattern). Reason dropdown: `BulkEditor.jsx:1281` pattern.

---

## §6 · OD-457-03 — `useMemo` parent prop (OPEN)

`RecipeManagementPanel.jsx:583` passes `recipes={sortRecipes(...)}` — new array reference each render — which amplifies the stale-row bug. The primary fix (E2d `onRefresh?.()`) is sufficient to close the symptom. Stabilising the prop with `useMemo` is an optional clean-up (~3 lines).

**OD-457-03 LOCKED — YES, include useMemo (+3 lines, `RecipeManagementPanel.jsx`). Owner 2026-09-24.**
Files WILL change: `recipeService.js` · `RecipeBulkEditor.jsx` · `RecipeManagementPanel.jsx`

---

## §7 · Scope Lock

**Files WILL change:** `recipeService.js` · `RecipeBulkEditor.jsx` · `RecipeManagementPanel.jsx` (OD-457-03 LOCKED YES)
**Files will NOT touch:** all hotspot files · `recipeTransform.js` · any PMS/order file

**Total estimated lines:** ~40–42 lines across 2 files (+3 optional for OD-457-03).

---

## §8 · Risk Register

| # | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R1 | `getDeleteReasons()` fetch fails → dialog opens with empty dropdown → user can't delete | LOW | Fallback: hard-code `["Item not in menu any more", "Duplicate item"]` as default; load from API when available |
| R2 | S2 fix (`onRefresh?.()`) triggers full data re-fetch on every delete — performance | LOW | `onRefresh` calls `fetchData()` in parent, same as Batch Save already does |
| R3 | `dispatch.del` for standard/sub ignores the `reason` arg (not passed) — harmless | NONE | `deleteAddonRecipe` signature change is isolated; standard/sub `dispatch.del` is `deleteRecipe` / `deleteSubRecipe` unchanged |
| R4 | S2 MEDIUM confidence — stale-row repro depends on parent re-render timing | MEDIUM | Plan includes browser validation step (V4). `onRefresh?.()` is the correct fix regardless. |

---

## §9 · Verification Matrix

| # | Edit | How to verify | Automated? |
|---|---|---|---|
| V1 | E1a: `deleteAddonRecipe` sends `{ data: { reason } }` | Code review: recipeService.js signature + body | YES (grep) |
| V2 | S1 fix: addon delete with reason succeeds (no 422) | Browser: Addon tab → delete recipe → choose reason → toast green + row gone | NO |
| V3 | S1: standard/sub delete still works with no dialog reason | Browser: Standard tab → delete recipe → Confirm → toast green | NO |
| V4 | S2 fix: deleted recipe disappears immediately (no stale row) | Browser: Standard tab → delete → switch tab and back → row gone | NO |
| V5 | Dialog shows reason dropdown on Addon tab only | Browser: compare Addon vs Standard delete dialog | NO |
| V6 | Delete button disabled until reason selected (addon) | Browser: open addon dialog → Delete grayed until dropdown selected | NO |
| V7 | Cancel closes dialog without deleting | Browser: open dialog → Cancel → recipe still in list | NO |
| V8 | No change to Batch Save (onRefresh still fires after batch) | Code review: L272/277 `onRefresh?.()` unchanged | YES (grep) |

---

## §10 · Post-Code Registry Checklist

```
- [ ] registry.json: BUG-457 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: recipeService.js, RecipeBulkEditor.jsx (+ RecipeManagementPanel.jsx if OD-457-03)
- [ ] Code markers: // BUG-457 on every modified line
```
