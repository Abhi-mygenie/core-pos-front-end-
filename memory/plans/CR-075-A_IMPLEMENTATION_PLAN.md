# Implementation Plan — CR-075-A · Stock Dashboard Polish

**Gate:** 3 (Implementation Plan)
**Author role:** PLANNING (per AGENT_PROMPT_ALPHA v0.7 §Role 2 · §Stage Dispatch "implementation_plan" branch)
**Date:** 2026-07-18
**Sprint:** pos_5_0_wave_2
**Prior Gate 2 IA:** `/app/memory/impact/CR-075_CR-076_BUG-201_IMPACT_ANALYSIS.md` (Round 1 IA, closed 2026-07-18)
**Design reference:** `cr072-inventory-mockup-v5-full.html#screen-current-stock` (canonical mock v5 · restored ruling)
**Ship bundle:** SAME PR as CR-078 + CR-079 + CR-075-B (folded per handover-recommended single-PR ship)

---

## 0. Scope Rationale (post code-walk 2026-07-18)

Prior handover claimed CR-075-A was "IMPLEMENTED via CR-072". Code walk on 2026-07-18 disproved this — items S1/S2/S3/S5/P1/P2/P4/P6 are all in various states of NOT-FIXED / PARTIAL. However, the Purchase-Entry file that P1/P2/P4/P6 targets is being **DELETED by CR-078** (`PurchaseEntryPanel.jsx` → replaced by `SmartPurchasePanel.jsx`).

**Split resolution (owner ruled 2026-07-18 · "recommended path"):**

| Original CR-075-A item | Resolution | Where it lives |
|---|---|---|
| **S1** Excel export blob→url fix | 🟢 IN THIS PLAN | `CurrentStockPanel.jsx` (renamed by CR-079) |
| **S2** Filter UX (clear · active indicator) | 🟢 IN THIS PLAN | `CurrentStockPanel.jsx` |
| **S3** Status chips instead of dropdown | 🟢 IN THIS PLAN | `CurrentStockPanel.jsx` |
| **S4** Low-stock definition | ℹ Deferred — backend EP-1 dependency | No FE action possible |
| **S5** Error display + retry + export loading | 🟢 IN THIS PLAN | `CurrentStockPanel.jsx` + `inventoryService.js` |
| **P1** Per-field purchase errors | ⚫ **Auto-covered by CR-078** — Smart Purchase plan already includes per-field validation | CR-078 plan |
| **P2** Vendor typeahead | ⚫ **Auto-covered by CR-078** — Smart Purchase uses ranked `<select>` from vendor-item-list (superior to typeahead) | CR-078 plan |
| **P3** Invoice upload | 🅿 Parked — CR-076 (S3 backend contract) | CR-076 |
| **P4** Mandatory field indicators | ⚫ **Auto-covered by CR-078** — Smart Purchase enforces PM per vendor + rate>0 as hard validation (B1/B2) with red-* labels | CR-078 plan |
| **P6** Batch/Expiry passthrough | ⚫ **AMENDED into CR-078 Edit #3** (transform passthrough — affects Smart Purchase too) | CR-078 plan (Edit #3 amended 2026-07-18) |

**Net result:** CR-075-A shrinks to **4 Stock Dashboard items only** (S1, S2, S3, S5). ~120 lines across 2 files. LOW risk.

---

## 1. IA Re-Verification (§Stage Dispatch line 504 — MANDATORY)

Verified 2026-07-18 via code walk:

| Assumed | Current | Delta |
|---|---|---|
| `InventoryDashboardPanel.jsx` = 194 lines (was 193 in IA) | 194 lines | +1 (trailing newline) — no logic drift |
| Export handler uses blob (S1 unfixed) | Line 66-72 confirmed blob (`URL.createObjectURL(new Blob([res.data]))`) | 0 |
| `inventoryService.js:68` returns `responseType: 'blob'` | Confirmed | 0 |
| Status filter uses `<select>` (S3 unfixed) | Line 144-149 confirmed `<select>` | 0 |
| Result count present · Clear button absent · Active indicator absent (S2) | Confirmed line 189 has count · no clear/indicator | 0 |
| Errors are generic toasts (S5) | Confirmed line 33 + line 72 | 0 |

**IA still accurate. Plan is safe to proceed.**

**File rename dependency:** CR-079 (this same bundle) renames `InventoryDashboardPanel.jsx` → `CurrentStockPanel.jsx`. This plan applies changes to the file **AFTER the rename** — sequencing enforced in the parent plan's Phase B (renames) BEFORE Phase C+ (this polish work is inserted between Phase B and Phase E).

---

## 2. Locked Owner Rulings

All CR-075-A questions are resolved from prior Gate 2 IA (Round 1):

| # | Ruling |
|---|---|
| B7 (Round 1) | Physical Count → Stock Audit (rename — absorbed into CR-079) |
| B8 (Round 1) | is_low_stock ship current flag + intelligence layer |
| S4 backend | EP-1 endpoint not shipped — FE keeps current backend-driven `isLowStock` |
| S1 fix pattern | Use `window.open(download_url)` on response · fallback to blob branch for legacy backend versions |
| S3 chip design | 4 pills: `[All N] [In Stock N] [Low N] [Out N]` — click toggles filter · exclusive selection (matches mock v5 §current-stock) |
| S5 error surface | Inline banner at top of table on load fail with retry button · export button shows spinner during download |

**No additional owner questions.**

---

## 3. Risk Register

| Risk | Level | Mitigation |
|---|---|---|
| Backend still returns blob for some tenants (transitional) | LOW | Detect `Content-Type` — if JSON, use `download_url`; if binary, fall back to blob path. Both branches shipped for one sprint. |
| ESLint hooks warnings on new memoized helpers | LOW | Follow existing `useMemo` pattern (line 42-48 of current file) |
| Rename ordering conflict with CR-079 | LOW | Plan explicitly runs in bundle Phase B.5 (between rename and route-wire) |
| Chip counts drift from filtered list source of truth | LOW | Derive counts from same `stockItems` array — no separate state |

**Overall risk: LOW** — non-financial · UI polish · single file body.

---

## 4. Execution Order (within the parent bundle)

Inserted into the CR-078+CR-079 parent plan's phase sequence:

```
Phase A · Utilities (CR-078)
Phase B · Renames (CR-079) — InventoryDashboardPanel.jsx → CurrentStockPanel.jsx happens here
Phase B.5 · CR-075-A polish  ← THIS PLAN executes here (on the RENAMED file)
Phase C · Smart Purchase (CR-078)
Phase D · Intelligence widgets (CR-079)
Phase E · Nav + routing wire-up
Phase F · Cleanup
Phase G · Post-code hygiene
```

**Order matters:** Applying S1/S2/S3/S5 edits to the renamed file avoids merge conflicts with Phase B.

---

## 5. File-by-File Edit Ledger

### Edit #A — **EDIT** `components/inventory/CurrentStockPanel.jsx` (after rename in Phase B)

#### Change 1 · S1 Export fix (blob → download_url with fallback)

**Location:** `handleExport` function · currently lines 65-73 in `InventoryDashboardPanel.jsx`

**Before:**
```jsx
const handleExport = async () => {
  try {
    const res = await inventoryService.exportStock();
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'stock-inventory.xlsx'; a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Stock exported');
  } catch { toast.error('Export failed'); }
};
```

**After:**
```jsx
const [exporting, setExporting] = useState(false);       // S5 · loading state
const handleExport = async () => {
  setExporting(true);
  try {
    const res = await inventoryService.exportStock();     // returns { download_url } or blob
    // CR-075-A · S1 — support both response shapes for backwards compat
    if (res?.download_url || res?.data?.download_url) {
      const downloadUrl = res?.download_url || res.data.download_url;
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } else if (res?.data) {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'stock-inventory.xlsx'; a.click();
      window.URL.revokeObjectURL(url);
    } else {
      throw new Error('Unexpected export response');
    }
    toast.success('Stock exported');
  } catch (err) {
    toast.error(err?.readableMessage || 'Export failed — please retry');
  } finally {
    setExporting(false);
  }
};
```

**Also update `inventoryService.exportStock`** — remove blob-only response type so JSON responses parse correctly:

```js
// api/services/inventoryService.js:68
export async function exportStock() {
  // CR-075-A · S1 — response may be JSON { download_url } OR binary blob (legacy)
  return api.get(INVENTORY_ENDPOINTS.EXPORT_STOCK, { responseType: 'json' })
    .catch(async (err) => {
      // Fallback to blob if backend still returns binary
      if (err?.response?.headers?.['content-type']?.startsWith('application/vnd')) {
        return api.get(INVENTORY_ENDPOINTS.EXPORT_STOCK, { responseType: 'blob' });
      }
      throw err;
    });
}
```

**Δ:** +15 lines panel · +6 lines service

#### Change 2 · S2 Filter UX (clear button + active indicator)

**Location:** Toolbar block · currently lines 134-153

**Before (dropdown labels are colourless):**
```jsx
<select className={selectCls} value={categoryFilter} ...>
  <option value="">All Categories</option>
  ...
</select>
<select className={selectCls} value={statusFilter} ...>
  <option value="">All Status</option>
  ...
</select>
```

**After (active-indicator dot on each dropdown + Clear button appears when any filter set):**
```jsx
{/* CR-075-A · S2 — active filter indicator via ring */}
<div className="relative">
  <select
    className={`${selectCls} ${categoryFilter ? 'ring-1 ring-orange-400 border-orange-400' : ''}`}
    value={categoryFilter}
    onChange={e => setCategoryFilter(e.target.value)}
    data-testid="stock-category-filter"
  >
    <option value="">All Categories</option>
    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
  </select>
  {categoryFilter && <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full" data-testid="category-active-dot" />}
</div>

{/* CR-075-A · S2 — Clear all filters (shown iff any filter active) */}
{(search || categoryFilter || statusFilter) && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => { setSearch(''); setCategoryFilter(''); setStatusFilter(''); }}
    className="text-xs text-slate-500 hover:text-slate-700"
    data-testid="clear-filters-btn"
  >
    Clear all
  </Button>
)}
```

**Δ:** ~15 lines net (existing dropdowns wrapped + one new button)

#### Change 3 · S3 Status chips instead of `<select>`

**Location:** Status filter `<select>` block · currently lines 144-149

**Before:**
```jsx
<select className={selectCls} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} data-testid="stock-status-filter">
  <option value="">All Status</option>
  <option value="ok">In Stock</option>
  <option value="low">Low Stock</option>
  <option value="out">Out of Stock</option>
</select>
```

**After (chip row — mock v5 §current-stock):**
```jsx
{/* CR-075-A · S3 — status chips replace dropdown */}
<div className="flex items-center gap-1.5" data-testid="status-chips">
  {[
    { key: '', label: 'All', count: kpis.total, colour: 'slate' },
    { key: 'ok', label: 'In Stock', count: kpis.total - kpis.lowStock - kpis.outOfStock, colour: 'green' },
    { key: 'low', label: 'Low', count: kpis.lowStock, colour: 'amber' },
    { key: 'out', label: 'Out', count: kpis.outOfStock, colour: 'red' },
  ].map(chip => (
    <button
      key={chip.key || 'all'}
      onClick={() => setStatusFilter(chip.key)}
      className={`px-2.5 h-8 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5
        ${statusFilter === chip.key
          ? `bg-${chip.colour}-100 text-${chip.colour}-700 ring-1 ring-${chip.colour}-300`
          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
      data-testid={`status-chip-${chip.key || 'all'}`}
    >
      <span>{chip.label}</span>
      <span className={`text-[10px] font-semibold px-1 rounded ${statusFilter === chip.key ? `bg-${chip.colour}-200` : 'bg-slate-100'}`}>
        {chip.count}
      </span>
    </button>
  ))}
</div>
```

**Note on Tailwind dynamic classes:** the `bg-${chip.colour}-100` pattern won't survive Tailwind purge. **Compile-safe rewrite** using pre-computed class map:
```jsx
const CHIP_CLASSES = {
  slate: { active: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300', count: 'bg-slate-200' },
  green: { active: 'bg-green-100 text-green-700 ring-1 ring-green-300',  count: 'bg-green-200' },
  amber: { active: 'bg-amber-100 text-amber-700 ring-1 ring-amber-300',  count: 'bg-amber-200' },
  red:   { active: 'bg-red-100 text-red-700 ring-1 ring-red-300',        count: 'bg-red-200' },
};
```
Then reference `CHIP_CLASSES[chip.colour].active`. Standard pattern in this codebase (see `OrderCard.jsx` for reference).

**Δ:** ~30 lines (chip row + class map)

#### Change 4 · S5 Error display + retry banner

**Location:** After KPI cards, before Stock Table (new section)

**New state:** `const [loadError, setLoadError] = useState(null);`

**fetchData mutation:**
```jsx
const fetchData = useCallback(async () => {
  setLoading(true);
  setLoadError(null);
  try {
    const [stock, cats] = await Promise.all([
      inventoryService.getStockInventory(),
      inventoryService.getCategories(),
    ]);
    setStockItems(stock);
    setCategories(cats);
  } catch (err) {
    setLoadError(err?.readableMessage || 'Failed to load inventory');
  } finally {
    setLoading(false);
  }
}, []);
```

**New JSX block (below KPI cards):**
```jsx
{loadError && (
  <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4 flex items-center justify-between" data-testid="load-error-banner">
    <div className="flex items-center gap-2">
      <XCircle className="w-4 h-4 text-red-500" />
      <span className="text-sm text-red-700">{loadError}</span>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={fetchData}
      className="text-red-600 border-red-300 hover:bg-red-100"
      data-testid="load-retry-btn"
    >
      Retry
    </Button>
  </div>
)}
```

**Δ:** ~15 lines

**Export button gets loading state (part of Change 1):**
```jsx
<Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}
  className="ml-auto gap-1.5" data-testid="stock-export-btn">
  {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
  {exporting ? 'Exporting…' : 'Export'}
</Button>
```

Import `Loader2` from `lucide-react`.

---

## 6. Scope Lock (§R14)

### Files WILL change (2)
1. `components/inventory/CurrentStockPanel.jsx` (renamed from `InventoryDashboardPanel.jsx` by CR-079 · then polished here)
2. `api/services/inventoryService.js` (line 68 · export response handling)

### Files WILL NOT touch
- `PurchaseEntryPanel.jsx` (being deleted by CR-078)
- All other inventory files not listed
- `Sidebar.jsx` / `App.js` (owned by CR-079)
- Any file outside inventory module

Cross-check with parent CR-078+CR-079 plan: no file collisions · CurrentStockPanel.jsx is created by rename in Phase B and only patched in Phase B.5.

---

## 7. Verification Matrix (§Step 4)

| # | Behaviour | How to Verify | Auto? |
|---|---|---|:---:|
| 1 | Export succeeds when backend returns `{ download_url }` | Manual · click Export · new tab opens with xlsx file | NO |
| 2 | Export succeeds when backend returns blob (legacy) | Manual · mock backend to return blob · confirms fallback branch | NO |
| 3 | Export button shows spinner during download | Manual · slow network throttle · verify spinner + "Exporting…" label | NO |
| 4 | Export error surfaces `readableMessage` | Manual · mock 500 · toast shows backend error text | NO |
| 5 | Status chips render with correct counts | Load page → chips show N Total, N In Stock, N Low, N Out | NO |
| 6 | Clicking chip filters table | Click "Low" chip · table shows only low-stock rows · chip highlighted | NO |
| 7 | Clear all filters resets state | Set search + category + status · click Clear all · all reset · button disappears | NO |
| 8 | Active-filter dot appears on dropdowns | Select a category · dot appears top-right of dropdown | NO |
| 9 | Load-error banner renders + retry button works | Mock 500 on `getStockInventory` · banner shows · click Retry · fetches again | NO |
| 10 | ESLint clean · webpack compile clean | `yarn build` OR watch supervisor log | **YES** |
| 11 | data-testid registry present | grep `data-testid="status-chip-\|clear-filters-btn\|load-error-banner\|load-retry-btn\|category-active-dot"` in built file | **YES** |

**Summary:** 11 checks · 2 automated · 9 manual.

---

## 8. Post-Code Registry Checklist (§Step 5)

```
- [ ] registry.json: CR-075-A → status="IMPLEMENTED", gate=5 (post-QA), sprint_key="pos_5_0_wave_2"
- [ ] registry.json: CR-075 (parent) → status="CLOSED — SPLIT INTO CR-075-A + CR-076 + CR-078 + CR-079 + CR-077"
- [ ] CR_REGISTRY.md: row updated for CR-075-A with plan link
- [ ] FILE_OWNERSHIP.md: add CurrentStockPanel.jsx (renamed) + inventoryService.js.exportStock to "CR-075-A polish"
- [ ] Code markers `// CR-075-A · S1/S2/S3/S5` on every added block
- [ ] IA Round-1 doc footer amended: note items S1/S2/S3/S5 shipped via CR-075-A · P1/P2/P4 absorbed by CR-078 · P6 folded into CR-078 Edit #3 · P3/S4 remain parked
```

---

## 9. Data-testid Registry

| Element | testid |
|---|---|
| Export button | `stock-export-btn` (existing · no change) |
| Load-error banner | `load-error-banner` |
| Load-retry button | `load-retry-btn` |
| Status chip (each) | `status-chip-{all,ok,low,out}` |
| Category active-dot | `category-active-dot` |
| Clear filters button | `clear-filters-btn` |
| Whole status chip row | `status-chips` |

---

## 10. Owner Decisions Needed

**None.** All rulings inherited from Gate 2 IA Round 1 (2026-07-18) + split resolution (2026-07-18).

---

## §Planning final response format

```
Planning complete: CR-075-A (Stock Dashboard polish · S1/S2/S3/S5 only)
Stage: Implementation Plan (Gate 3)
Code reality: PARTIAL — S2 count exists (line 189) · rest NOT FIXED
Risk: LOW (UI polish · non-financial · 2 files · single file body)
Files WILL change: 2 (CurrentStockPanel.jsx after rename + inventoryService.js exportStock)
Files WILL NOT touch: Purchase Entry file (deleted by CR-078) · all non-inventory files
Owner decisions: NONE
Docs: /app/memory/plans/CR-075-A_IMPLEMENTATION_PLAN.md
Next: Ships in the SAME PR as CR-078+CR-079 bundle · Gate 4 GO / Implementation
```
