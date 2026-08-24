# CR-159 — Bulk Delete in Menu Management
## Gate 2: Impact Analysis (FINAL — design frozen 2026-08-21)

**Date:** 2026-08-21
**Role:** PLANNING agent
**Stage:** Impact Analysis (Gate 2) — COMPLETE
**Code Reality:** PARTIAL — single delete exists; bulk select UI + service call = NONE
**Conflict Pre-Check:** See Step 1 below
**Risk:** HIGH (irreversible bulk deletion + hotspot file BulkEditor.jsx)
**Design:** FROZEN — mockup at `/app/frontend/public/batch08-mockup.html`

---

## Design Decisions (Frozen)

| Decision | Answer | Source |
|---|---|---|
| Bulk Editor only (not card view) | YES | Owner resolved in intake |
| Single shared delete reason for all rows | YES | Owner resolved in intake |
| Backend endpoint confirmed | YES | curl: `DELETE /api/v2/vendoremployee/product/delete-bulk` |
| Aggregator menu: **no bulk delete** | YES | Owner confirmed 2026-08-21 — Aggregator has separate APIs, delete-bulk endpoint is non-Aggregator only |
| Checkbox + selection banner hidden for Aggregator | YES | Design frozen 2026-08-21 |

---

## Step 1 — Conflict Pre-Check

| File | Last Modifier | Open Conflict? |
|---|---|---|
| `BulkEditor.jsx` | BUG-248 (isDirty) + BUG-301 (menuType) — **5 CRs layered** | No open item on this file currently. Gate 4 must be sequential with any concurrent BulkEditor work. |
| `menuManagementService.js` | BUG-301 (2026-08-06, closed) | Clean |
| `MenuManagementPanel.jsx` | CR-144 (closed) | Clean — 1-line prop addition only |

**Execution order:** CR-159 and CR-155 share `MenuManagementPanel.jsx`. Implement CR-159 first (adds `deleteReasons` prop to `<BulkEditor>`), then CR-155 (adds `stockMode` state + button). OR handle in two separate search_replace calls within same session — no logical dependency.

---

## Step 2 — Gate 2: Impact Analysis

### API Contract (confirmed — owner curl 2026-08-21)

```
DELETE /api/v2/vendoremployee/product/delete-bulk
Authorization: Bearer <token>
Content-Type: application/json
Body: {
  "ids": [217622, 217624],
  "delete_reason": "Menu cleanup",
  "food_for": "Normal"
}
```

`food_for` accepts the current `menuType` value. For CR-159 scope: Normal / Party / Premium only. Aggregator is excluded.

---

### Data Flow

```
BulkEditor.jsx
  selectedIds (Set<productId>) — new state
  menuType !== 'Aggregator'    — gate condition
    ↓ user checks rows
  selectedIds.size > 0
    ↓ "Delete Selected (N)" button appears
  confirm dialog opens
    → deleteReason dropdown (from deleteReasons prop)
    → user confirms
      → menuManagementService.deleteFoodBulk(
          ids: [...selectedIds],
          deleteReason: reason,
          foodFor: menuType          ← "Normal" | "Party" | "Premium"
        )
          → DELETE /api/v2/vendoremployee/product/delete-bulk
            → on success: selectedIds cleared + onRefresh()
            → on error: toast.error(err.readableMessage)
```

---

### Files WILL Change (3 files)

#### 1. `src/api/services/menuManagementService.js`

**Change:** Add `deleteFoodBulk` function after line 100 (after existing `deleteFood`).

```js
// CR-159: Bulk delete — DELETE /api/v2/vendoremployee/product/delete-bulk
export const deleteFoodBulk = (ids, deleteReason, foodFor = 'Normal') =>
  api.delete(`${BASE_V2}/delete-bulk`, {
    data: { ids, delete_reason: deleteReason, food_for: foodFor },
  });
```

**Lines added:** ~5
**Risk:** LOW — additive, no existing function modified

---

#### 2. `src/components/panels/menu/BulkEditor.jsx`

**This is a HIGH-risk hotspot file (5 CRs layered). Read file state at implementation time before editing.**

**Change A — State declaration** (after line 237, near existing useState block):
```js
// CR-159: bulk delete selection
const [selectedIds,        setSelectedIds]        = useState(new Set());
const [bulkDeleteOpen,     setBulkDeleteOpen]      = useState(false);
const [bulkDeleteReason,   setBulkDeleteReason]    = useState('');
const [bulkDeleting,       setBulkDeleting]        = useState(false);
```

**Change B — Aggregator guard + handler** (after state block):
```js
// CR-159: only available for non-Aggregator menus
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
```

**Change C — Checkbox column in `<thead>`** (line 920, inside `<tr style={{ background: "#F9FAFB" }}>`) — prepend before existing `<th>` for row number:
```jsx
{showBulkDelete && (
  <th className="px-2 py-2.5 border-b w-10 sticky left-0 z-20 bg-[#F9FAFB] text-center" style={{ borderColor: COLORS.borderGray }}>
    <input type="checkbox"
      data-testid="bulk-select-all-checkbox"
      checked={selectedIds.size > 0 && filteredRows.every(r => selectedIds.has(r._id))}
      onChange={e => setSelectedIds(e.target.checked ? new Set(filteredRows.map(r => r._id)) : new Set())}
      style={{ accentColor: '#EF4444' }}
    />
  </th>
)}
```

**Change D — Checkbox cell in each `<tr>` row** (line ~959, inside row render, before existing number cell):
```jsx
{showBulkDelete && (
  <td className="px-2 text-center" onClick={e => e.stopPropagation()}>
    <input type="checkbox"
      data-testid={`bulk-row-checkbox-${row._id}`}
      checked={selectedIds.has(row._id)}
      onChange={e => setSelectedIds(prev => {
        const next = new Set(prev);
        e.target.checked ? next.add(row._id) : next.delete(row._id);
        return next;
      })}
      style={{ accentColor: '#EF4444' }}
    />
  </td>
)}
```

**Change E — Selection banner** (after closing `</div>` of table scroll container, before Dialog):
```jsx
{showBulkDelete && selectedIds.size > 0 && (
  <div className="flex items-center justify-between px-5 py-3 border-t bg-white"
       style={{ borderColor: COLORS.borderGray, boxShadow: '0 -4px 6px -1px rgba(0,0,0,0.08)' }}
       data-testid="bulk-delete-banner">
    <span className="text-sm font-medium" style={{ color: '#374151' }}>
      <span style={{ color: '#EF4444', fontWeight: 700 }}>{selectedIds.size}</span> item{selectedIds.size > 1 ? 's' : ''} selected
    </span>
    <div className="flex items-center gap-2">
      <button onClick={() => setSelectedIds(new Set())}
        className="px-3 py-1.5 text-sm rounded-lg border"
        style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
        data-testid="bulk-delete-clear-btn">Clear</button>
      <button onClick={() => setBulkDeleteOpen(true)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-white"
        style={{ backgroundColor: '#EF4444' }}
        data-testid="bulk-delete-selected-btn">
        Delete Selected ({selectedIds.size})
      </button>
    </div>
  </div>
)}
```

**Change F — Confirm Dialog** (use existing shadcn `<Dialog>` already imported):
```jsx
{bulkDeleteOpen && (
  <Dialog open={bulkDeleteOpen} onOpenChange={v => !v && setBulkDeleteOpen(false)}>
    <DialogContent className="max-w-sm" data-testid="bulk-delete-confirm-dialog">
      <DialogHeader>
        <DialogTitle>Delete {selectedIds.size} Item{selectedIds.size > 1 ? 's' : ''}</DialogTitle>
      </DialogHeader>
      <p className="text-sm text-slate-500">
        Permanently delete {selectedIds.size} item{selectedIds.size > 1 ? 's' : ''}. This cannot be undone.
      </p>
      <div className="mt-3">
        <label className="text-xs font-semibold text-slate-700 mb-1 block">Reason for deletion</label>
        <select value={bulkDeleteReason} onChange={e => setBulkDeleteReason(e.target.value)}
          className="w-full px-3 py-2 text-sm border rounded-lg outline-none"
          style={{ borderColor: COLORS.borderGray }}
          data-testid="bulk-delete-reason-select">
          <option value="">Select reason…</option>
          {deleteReasons.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => setBulkDeleteOpen(false)}
          className="flex-1 px-4 py-2 text-sm border rounded-lg"
          style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
          data-testid="bulk-delete-cancel-btn">Cancel</button>
        <button onClick={handleBulkDeleteConfirm}
          disabled={!bulkDeleteReason || bulkDeleting}
          className="flex-1 px-4 py-2 text-sm rounded-lg text-white disabled:opacity-50"
          style={{ backgroundColor: '#EF4444' }}
          data-testid="bulk-delete-confirm-btn">
          {bulkDeleting ? 'Deleting…' : 'Confirm Delete'}
        </button>
      </div>
    </DialogContent>
  </Dialog>
)}
```

**Lines added:** ~70–80
**Hotspot note:** Verify `Dialog` import already present (it is — line 10 of BulkEditor.jsx). No new imports needed beyond `menuService.deleteFoodBulk`.

---

#### 3. `src/components/panels/MenuManagementPanel.jsx`

**Change:** Pass `deleteReasons` to `<BulkEditor>` (line ~272, inside `bulkEditMode` conditional render).

Current line ~272:
```jsx
<BulkEditor
  foods={filteredFoods}
  categories={categoriesWithCounts}
  menuType={menuType}
  clients={clients}
  addons={addons}
  isLoading={loading}
  onRefresh={fetchFoods}
  onClose={() => setBulkEditMode(false)}
/>
```

Add one prop:
```jsx
  deleteReasons={deleteReasons}  // CR-159: pass to BulkEditor for bulk delete dialog
```

**Lines added:** 1
**Risk:** LOW — additive prop only

---

### Files Will NOT Touch

`ProductList.jsx` (card view excluded — owner decision), `orderTransform.js`, `CollectPaymentPanel.jsx`, any financial logic, `AddonStockTab.jsx`, `VariationStockTab.jsx`.

---

## Risk Register

| Risk | Severity | Mitigation |
|---|---|---|
| Irreversible bulk delete — no undo | HIGH | Confirm dialog mandatory with reason; DELETE only fires after explicit confirm click |
| Aggregator menu accidentally gets delete | HIGH | `showBulkDelete = menuType !== 'Aggregator'` — checkbox + banner not rendered; no code path to dialog |
| BulkEditor hotspot (5 CRs layered) | MEDIUM | Read file at Gate 5 before editing; verify no dirty/save interaction with checkbox column (different state domain) |
| `deleteReasons` empty state | LOW | Dialog select shows "Select reason…" placeholder; Confirm button disabled until reason selected |
| `selectedIds` stale after refresh | LOW | `onRefresh()` call immediately followed by `setSelectedIds(new Set())` — cleared before re-render |
| Checkbox column breaks sticky left positioning | LOW | Checkbox `th`/`td` uses same `sticky left-0` pattern as existing row-number column |

---

## Verification Matrix (seeds QA handover)

| # | File | Change | How to Verify | Auto? |
|---|---|---|---|---|
| 1 | menuManagementService.js | `deleteFoodBulk` exists | Grep: `deleteFoodBulk` in file | YES |
| 2 | BulkEditor.jsx | Checkbox column visible (Normal menu) | Open Menu Mgmt → Bulk Edit → checkbox column in table | NO |
| 3 | BulkEditor.jsx | No checkbox column (Aggregator menu) | Switch to Aggregator → Bulk Edit → no checkbox | NO |
| 4 | BulkEditor.jsx | Select All works | Click header checkbox → all rows checked | NO |
| 5 | BulkEditor.jsx | Selection banner appears at N > 0 | Select 1 row → banner shows "1 item selected" | NO |
| 6 | BulkEditor.jsx | Confirm dialog shows reason dropdown | Click Delete Selected → dialog opens with reason select | NO |
| 7 | BulkEditor.jsx | Confirm button disabled until reason picked | Open dialog → Confirm button disabled | NO |
| 8 | BulkEditor.jsx | Delete fires API + rows removed | Pick reason → Confirm → network tab shows DELETE + rows gone | NO |
| 9 | BulkEditor.jsx | Error toast on 500 | (mock) → toast with error message | NO |
| 10 | MenuManagementPanel.jsx | `deleteReasons` prop passed | Props inspection or code grep | YES |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-159 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: BulkEditor.jsx, menuManagementService.js, MenuManagementPanel.jsx listed
- [ ] Code markers: // CR-159 in every modified file
```

---

**Next:** Gate 4 GO → Implementation
