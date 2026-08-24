# CR-159 — Bulk Delete in Menu Management
## Gate 3: Implementation Plan

**Date:** 2026-08-21
**Role:** PLANNING agent
**Stage:** Implementation Plan (Gate 3)
**Gate 2 doc:** `/app/memory/impact/CR-159_IMPACT_ANALYSIS.md`
**Gate 2 accuracy check:** PASS — all target lines verified 2026-08-21
**Risk:** HIGH (BulkEditor.jsx hotspot — 5 CRs layered)

---

## Scope Lock

**Files WILL change:**
1. `src/api/services/menuManagementService.js`
2. `src/components/panels/menu/BulkEditor.jsx`
3. `src/components/panels/MenuManagementPanel.jsx`

**Files will NOT touch:**
`ProductList.jsx`, `orderTransform.js`, `CollectPaymentPanel.jsx`, `AddonStockTab.jsx`,
`VariationStockTab.jsx`, `AggregatorSetupView.jsx`, any financial logic.

---

## Pre-Implementation Entry Check (MANDATORY per R3/Implementation Role Step 0)

Before writing any code, verify these starting states match:

```
1. menuManagementService.js line 96:
   EXPECTED: export const deleteFood = (foodId, deleteReason) =>

2. BulkEditor.jsx line 234:
   EXPECTED: const [rows, setRows] = useState(() => foods.map(f => buildRow(f)));

3. BulkEditor.jsx line 920:
   EXPECTED: <thead className="sticky top-0 z-10">

4. BulkEditor.jsx line 922:
   EXPECTED: <th className="px-3 py-2.5 text-left ... w-10 sticky left-0 z-20 bg-[#F9FAFB]"

5. MenuManagementPanel.jsx line 26:
   EXPECTED: const [addonPanelMode, setAddonPanelMode] = useState(false); // CR-144

6. MenuManagementPanel.jsx ~line 271:
   EXPECTED: <BulkEditor
               foods={filteredFoods}
```

If any of these don't match → **STOP. Return to PLANNING agent.**

---

## Execution Sequence (6 edits across 3 files)

### Edit 1 — `menuManagementService.js`: Add `deleteFoodBulk`

**File:** `src/api/services/menuManagementService.js`
**After line 100** (after closing `});` of `deleteFood`)

**search_replace — old_str:**
```js
/** API #6 — Toggle food status (active/inactive)
 * BUG-301: Aggregator items require { food_for: 'Aggregator' } — { status } only works for Normal.
 */
export const toggleFoodStatus = (foodId, status, foodFor = 'Normal') => // BUG-301
```

**search_replace — new_str:**
```js
/** CR-159: Bulk delete — non-Aggregator menus only.
 *  DELETE /api/v2/vendoremployee/product/delete-bulk
 *  { ids: number[], delete_reason: string, food_for: 'Normal'|'Party'|'Premium' }
 */
export const deleteFoodBulk = (ids, deleteReason, foodFor = 'Normal') =>
  api.delete(`${BASE_V2}/delete-bulk`, {
    data: { ids, delete_reason: deleteReason, food_for: foodFor },
  });

/** API #6 — Toggle food status (active/inactive)
 * BUG-301: Aggregator items require { food_for: 'Aggregator' } — { status } only works for Normal.
 */
export const toggleFoodStatus = (foodId, status, foodFor = 'Normal') => // BUG-301
```

**Verify:** `grep -n "deleteFoodBulk" src/api/services/menuManagementService.js` → returns 1 hit
**Risk:** LOW — purely additive

---

### Edit 2 — `BulkEditor.jsx`: Add state + guard + handler

**File:** `src/components/panels/menu/BulkEditor.jsx`
**After existing useState block** (~line 241, after `const [importing, setImporting] = useState(false);`)

**search_replace — old_str:**
```js
  const [showExportMenu, setShowExportMenu] = useState(false);
```

**search_replace — new_str:**
```js
  const [showExportMenu, setShowExportMenu] = useState(false);
  // CR-159: bulk delete state — non-Aggregator only
  const [selectedIds,      setSelectedIds]      = useState(new Set());
  const [bulkDeleteOpen,   setBulkDeleteOpen]   = useState(false);
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');
  const [bulkDeleting,     setBulkDeleting]     = useState(false);
```

**Then**, find the `const isRowDirty` declaration and add the guard + handler immediately before it:

**search_replace — old_str:**
```js
  const isRowDirty = useCallback((row) => getColumns(menuType).some(c => isDirty(row, c.key)), [isDirty, menuType]); // BUG-324: menuType added to deps
```

**search_replace — new_str:**
```js
  // CR-159: Aggregator menu does not support delete-bulk endpoint
  const showBulkDelete = menuType !== 'Aggregator';

  const handleBulkDeleteConfirm = async () => {
    if (!bulkDeleteReason || selectedIds.size === 0) return;
    setBulkDeleting(true);
    try {
      await menuService.deleteFoodBulk([...selectedIds], bulkDeleteReason, menuType);
      toast({ title: 'Deleted', description: `${selectedIds.size} item(s) deleted.` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      setBulkDeleteReason('');
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: err.readableMessage || 'Delete failed', variant: 'destructive' });
    } finally { setBulkDeleting(false); }
  };

  const isRowDirty = useCallback((row) => getColumns(menuType).some(c => isDirty(row, c.key)), [isDirty, menuType]); // BUG-324: menuType added to deps
```

**Verify:** `grep -n "showBulkDelete\|handleBulkDeleteConfirm\|bulkDeleteOpen" BulkEditor.jsx` → 3 hits
**Risk:** MEDIUM — hotspot file; verify no naming collision with existing state keys

---

### Edit 3 — `BulkEditor.jsx`: Checkbox `<th>` in thead

**File:** `src/components/panels/menu/BulkEditor.jsx`

**search_replace — old_str:**
```jsx
            <tr style={{ background: "#F9FAFB" }}>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider border-b border-r w-10 sticky left-0 z-20 bg-[#F9FAFB]"
                  style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>#</th>
```

**search_replace — new_str:**
```jsx
            <tr style={{ background: "#F9FAFB" }}>
              {/* CR-159: checkbox Select All — non-Aggregator only */}
              {showBulkDelete && (
                <th className="px-2 py-2.5 border-b w-10 text-center sticky left-0 z-20 bg-[#F9FAFB]"
                    style={{ borderColor: COLORS.borderGray, borderRight: `1px solid ${COLORS.borderGray}` }}>
                  <input type="checkbox"
                    data-testid="bulk-select-all-checkbox"
                    checked={selectedIds.size > 0 && filteredRows.every(r => selectedIds.has(r._id))}
                    onChange={e => setSelectedIds(e.target.checked ? new Set(filteredRows.map(r => r._id)) : new Set())}
                    style={{ accentColor: '#EF4444', cursor: 'pointer' }}
                  />
                </th>
              )}
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider border-b border-r w-10 sticky left-0 z-20 bg-[#F9FAFB]"
                  style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>#</th>
```

**Note:** `filteredRows` — verify this variable name in BulkEditor. If BulkEditor uses a different name for the visible rows array, adjust. Check with:
```bash
grep -n "filteredRows\|displayRows\|groupedRows\|visibleRows" BulkEditor.jsx | head -5
```

**Verify:** Open Bulk Edit on Normal menu → checkbox column visible left of #. On Aggregator → no checkbox.
**Risk:** MEDIUM — sticky column positioning; left-offset of existing `#` column increases by 40px when checkbox renders

---

### Edit 4 — `BulkEditor.jsx`: Checkbox `<td>` in each row

**search_replace — old_str:**
```jsx
                  <td className="px-3 py-1.5 text-xs font-mono border-r sticky left-0 bg-inherit" style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>
                    {row._saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
```

**search_replace — new_str:**
```jsx
                  {/* CR-159: per-row checkbox — non-Aggregator only */}
                  {showBulkDelete && (
                    <td className="px-2 text-center border-r sticky left-0 bg-inherit"
                        style={{ borderColor: COLORS.borderGray, width: 40 }}
                        onClick={e => e.stopPropagation()}>
                      <input type="checkbox"
                        data-testid={`bulk-row-checkbox-${row._id}`}
                        checked={selectedIds.has(row._id)}
                        onChange={e => setSelectedIds(prev => {
                          const next = new Set(prev);
                          e.target.checked ? next.add(row._id) : next.delete(row._id);
                          return next;
                        })}
                        style={{ accentColor: '#EF4444', cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  <td className="px-3 py-1.5 text-xs font-mono border-r sticky left-0 bg-inherit" style={{ color: COLORS.grayText, borderColor: COLORS.borderGray }}>
                    {row._saveStatus === "saving" && <Loader2 className="w-3 h-3 animate-spin text-amber-500" />}
```

**Verify:** Select 2 rows → both checkboxes checked; deselect one → header unchecks.
**Risk:** LOW — `e.stopPropagation()` prevents row click from interfering

---

### Edit 5 — `BulkEditor.jsx`: Selection banner + Confirm Dialog

Place **immediately before** the `<Dialog open={pendingImport ...}>` block (~line 1069).

**search_replace — old_str:**
```jsx
      {/* CR-036-FU-03 N1: confirmation dialog shown when Excel import succeeds
          AND user has dirty rows that would be wiped by the auto-refresh.
```

**search_replace — new_str:**
```jsx
      {/* CR-159: Selection banner — sticky bottom, appears when rows selected (non-Aggregator only) */}
      {showBulkDelete && selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-5 py-3 border-t bg-white flex-shrink-0"
             style={{ borderColor: COLORS.borderGray, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.08)' }}
             data-testid="bulk-delete-banner">
          <span className="text-sm font-medium" style={{ color: '#374151' }}>
            <span style={{ color: '#EF4444', fontWeight: 700 }}>{selectedIds.size}</span>
            {' '}item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-sm rounded-lg border hover:bg-gray-50 transition-colors"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="bulk-delete-clear-btn">
              Clear
            </button>
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white hover:opacity-90"
              style={{ backgroundColor: '#EF4444' }}
              data-testid="bulk-delete-selected-btn">
              Delete Selected ({selectedIds.size})
            </button>
          </div>
        </div>
      )}

      {/* CR-159: Bulk delete confirm dialog */}
      <Dialog open={bulkDeleteOpen} onOpenChange={v => { if (!v) { setBulkDeleteOpen(false); setBulkDeleteReason(''); } }}>
        <DialogContent className="max-w-sm" data-testid="bulk-delete-confirm-dialog">
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Item{selectedIds.size !== 1 ? 's' : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mt-1">
            Permanently delete {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''}. This cannot be undone.
          </p>
          <div className="mt-3">
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Reason for deletion</label>
            <select
              value={bulkDeleteReason}
              onChange={e => setBulkDeleteReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-lg outline-none focus:ring-1 focus:ring-red-200"
              style={{ borderColor: COLORS.borderGray }}
              data-testid="bulk-delete-reason-select">
              <option value="">Select reason…</option>
              {(deleteReasons || []).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => { setBulkDeleteOpen(false); setBulkDeleteReason(''); }}
              className="flex-1 px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
              data-testid="bulk-delete-cancel-btn">
              Cancel
            </button>
            <button
              onClick={handleBulkDeleteConfirm}
              disabled={!bulkDeleteReason || bulkDeleting}
              className="flex-1 px-4 py-2 text-sm rounded-lg text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#EF4444' }}
              data-testid="bulk-delete-confirm-btn">
              {bulkDeleting ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CR-036-FU-03 N1: confirmation dialog shown when Excel import succeeds
          AND user has dirty rows that would be wiped by the auto-refresh.
```

**Verify:** Select rows → banner appears. Click Delete Selected → dialog opens. Select reason → Confirm enabled. Confirm → rows removed + toast.
**Risk:** MEDIUM — Dialog import already present (line 10). `deleteReasons` must be passed as prop (Edit 6).

---

### Edit 6 — `MenuManagementPanel.jsx`: Pass `deleteReasons` prop + add `BulkEditor` prop

**File:** `src/components/panels/MenuManagementPanel.jsx`

**search_replace — old_str:**
```jsx
          <BulkEditor
            foods={filteredFoods} // CR-146: filtered by client/branch
            categories={categoriesWithCounts}
            menuType={menuType}
            clients={clients}
            addons={addons}
            isLoading={loading}
            onRefresh={fetchFoods}
            onClose={() => setBulkEditMode(false)}
          />
```

**search_replace — new_str:**
```jsx
          <BulkEditor
            foods={filteredFoods} // CR-146: filtered by client/branch
            categories={categoriesWithCounts}
            menuType={menuType}
            clients={clients}
            addons={addons}
            isLoading={loading}
            onRefresh={fetchFoods}
            onClose={() => setBulkEditMode(false)}
            deleteReasons={deleteReasons} // CR-159: for bulk delete confirm dialog
          />
```

**Also update BulkEditor prop signature** (in BulkEditor.jsx, line 210):

**search_replace — old_str:**
```js
const BulkEditor = ({ foods = [], categories = [], menuType = "Normal", clients = [], addons = [], isLoading = false, onRefresh, onClose }) => { // CR-140, CR-145: +addons
```

**search_replace — new_str:**
```js
const BulkEditor = ({ foods = [], categories = [], menuType = "Normal", clients = [], addons = [], isLoading = false, onRefresh, onClose, deleteReasons = [] }) => { // CR-140, CR-145: +addons // CR-159: +deleteReasons
```

**Verify:** `grep "deleteReasons" MenuManagementPanel.jsx BulkEditor.jsx` → hits in both files.
**Risk:** LOW — additive prop with default `[]`; existing BulkEditor call sites are not affected.

---

## Pre-flight Check Before Edit 3 (filteredRows variable name)

```bash
grep -n "filteredRows\|displayRows\|const.*rows.*filter\|const.*visible" \
  src/components/panels/menu/BulkEditor.jsx | grep -v "_isNew\|filter(r =>" | head -10
```

If the variable is named something other than `filteredRows`, update Edit 3 `filteredRows` reference accordingly. This check must happen at implementation time.

---

## Verification Matrix

| Edit | File | Change | Self-test | Automated? |
|---|---|---|---|---|
| 1 | menuManagementService.js | `deleteFoodBulk` added | grep `deleteFoodBulk` → 1 hit | YES |
| 2 | BulkEditor.jsx | 4 state vars + guard + handler | grep `showBulkDelete` → ≥2 hits | YES |
| 3 | BulkEditor.jsx | Checkbox `<th>` in thead | Open Bulk Edit (Normal) → checkbox column visible | NO |
| 3 | BulkEditor.jsx | No checkbox (Aggregator) | Switch Aggregator → Bulk Edit → no checkbox col | NO |
| 4 | BulkEditor.jsx | Checkbox `<td>` per row | Select row → checkbox checked + red tint | NO |
| 4 | BulkEditor.jsx | Select All | Click header cb → all rows checked | NO |
| 5 | BulkEditor.jsx | Selection banner | Select 1+ rows → sticky bottom banner appears | NO |
| 5 | BulkEditor.jsx | Confirm dialog | Click Delete Selected → dialog with reason dropdown | NO |
| 5 | BulkEditor.jsx | Confirm disabled until reason | No reason selected → Confirm btn disabled | NO |
| 5 | BulkEditor.jsx | Full delete flow | Pick reason → Confirm → API fires + rows removed + toast | NO |
| 6 | MenuManagementPanel.jsx | `deleteReasons` prop passed | grep `deleteReasons={deleteReasons}` → 1 hit | YES |
| 6 | BulkEditor.jsx | prop signature updated | grep `deleteReasons = \[\]` → 1 hit | YES |

**Compile check:** `yarn build` must produce 0 new warnings after all edits.

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-159 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: CR-159 row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add rows for BulkEditor.jsx, menuManagementService.js, MenuManagementPanel.jsx with CR-159 + date
- [ ] Code markers: // CR-159 present in every modified file (added in edit text above)
- [ ] Compile: webpack 0 new warnings
```

---

## Handover to Implementation Agent

```
"Plan ready. CR-159 — 6 edits across 3 files.
 Scope: BulkEditor.jsx (hotspot — read before editing), menuManagementService.js, MenuManagementPanel.jsx.
 Pre-flight: verify filteredRows variable name in BulkEditor before Edit 3.
 Risk: HIGH (BulkEditor hotspot). All other edits LOW/MEDIUM.
 Verification matrix: 12 checks (3 automated, 9 manual).
 Owner decisions: ALL resolved. Awaiting Gate 4 GO."
```
