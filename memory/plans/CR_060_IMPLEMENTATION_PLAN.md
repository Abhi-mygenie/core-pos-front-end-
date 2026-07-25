# CR-060 — Implementation Plan (Gate 3)

**ID:** CR-060
**Gate:** 3 (Implementation Plan)
**Date:** 2026-07-06
**Based on:** Impact Analysis (Gate 2) + Screen Freeze (Gate 2.5)
**Code Reality:** PARTIAL — UI shell exists (272 lines), all CRUD mocked
**Conflict Pre-Check:** CLEAN — all target files stable

---

## SCOPE LOCK

**Files WILL change (5 existing):**
1. `api/constants.js` — add TABLE_CONFIG_ENDPOINTS
2. `api/transforms/tableTransform.js` — add config transforms
3. `api/services/tableService.js` — add CRUD functions
4. `components/panels/settings/TableManagementView.jsx` — REWRITE
5. `components/layout/Sidebar.jsx` — remove comingSoon flag

**Files WILL create (1 new):**
1. `components/panels/settings/TableBulkEditor.jsx`

**Files WILL NOT touch:**
- SettingsPanel.jsx, App.js, TableContext.jsx, Header.jsx
- All order/payment/settlement/menu/socket files
- Existing tableService read functions, existing tableTransform transforms

---

## EXECUTION SEQUENCE

### Step 1: `api/constants.js` — Add TABLE_CONFIG_ENDPOINTS

**File:** `/app/frontend/src/api/constants.js`
**Action:** Insert after line 21 (after TRANSFER_FOOD)
**Lines added:** ~15

```javascript
// =============================================================================
// CR-060: TABLE MANAGEMENT CRUD ENDPOINTS
// =============================================================================
export const TABLE_CONFIG_ENDPOINTS = {
  CONFIG: '/api/v2/vendoremployee/restaurant-settings/table-config',
  STORE: '/api/v2/vendoremployee/restaurant-settings/table-config/store',
  DELETE: '/api/v2/vendoremployee/restaurant-settings/table-config',       // DELETE /{id}
  AREA_OPTIONS: '/api/v2/vendoremployee/restaurant-settings/table-config/area-options',
  WAITER_LIST: '/api/v2/vendoremployee/restaurant-settings/table-config/waiter-list',
  EXPORT_SAMPLE: '/api/v2/vendoremployee/restaurant-settings/table-config/export-sample',
  EXPORT_LIST: '/api/v2/vendoremployee/restaurant-settings/table-config/export-list',
  IMPORT: '/api/v2/vendoremployee/restaurant-settings/table-config/import',
};
```

**Verify:** `grep -n "TABLE_CONFIG_ENDPOINTS" constants.js` returns the block.

---

### Step 2: `api/transforms/tableTransform.js` — Add Config Transforms

**File:** `/app/frontend/src/api/transforms/tableTransform.js`
**Action:** Insert new transform blocks AFTER existing `fromAPI` (line 125) and `toAPI` (line 165)
**Lines added:** ~60
**Existing code untouched:** `fromAPI.tableList()`, `fromAPI.table()`, `toAPI.shiftTable()`, `toAPI.transferFood()`, `toAPI.mergeTable()`

```javascript
// =============================================================================
// CR-060: Table Config Transforms (Settings CRUD)
// =============================================================================
export const configFromAPI = {
  /** Transform GET /table-config response */
  tableConfigList: (res) => {
    const data = res?.data || res;
    return {
      tables: (data.tables || []).map(configFromAPI.tableConfigItem),
      walkinQrUrls: data.walkin_qr_urls || {},
      walkinMenuQrUrls: data.walkin_menu_qr_urls || {},
      restaurantId: data.restaurant_id,
      restaurantName: data.restaurant_name,
    };
  },

  tableConfigItem: (api) => ({
    id: api.id,
    tableNo: api.table_no,
    title: api.title || null,
    rtype: api.rtype,
    waiterId: api.waiter_id,
    waiterName: [api.f_name, api.l_name].filter(Boolean).join(' ') || 'Unassigned',
    status: api.status,
    qrCodeUrls: api.qr_code_urls || {},
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }),

  areaOptions: (res) => {
    const data = res?.data || res;
    return (data.areas || []).filter(a => a != null);
  },

  waiterList: (res) => {
    const data = res?.data || res;
    return (data.waiters || []).map(w => ({ id: w.id, name: w.name?.trim() || 'Unknown' }));
  },

  exportResponse: (res) => ({
    success: res.success,
    message: res.message,
    downloadUrl: res.download_url || null,
  }),
};

export const configToAPI = {
  /** Build store payload (create if no id, update if id present) */
  storeTable: (data) => ({
    title: data.title || null,
    table_no: data.tableNo,
    vendorName: data.waiterId || null,
    rtype: data.rtype || 'TB',
    ...(data.id ? { id: data.id } : {}),
  }),
};
```

**Verify:** Import and call `configFromAPI.tableConfigList()` with sample JSON — returns correct shape.

---

### Step 3: `api/services/tableService.js` — Add CRUD Functions

**File:** `/app/frontend/src/api/services/tableService.js`
**Action:** Add new functions AFTER existing code (line 110). Add new imports at top.
**Lines added:** ~80
**Existing functions untouched:** `getTables()`, `getTableById()`, `filterBySection()`, etc.

**Edit 3a:** Add imports at top (after line 4):
```javascript
import { TABLE_CONFIG_ENDPOINTS } from '../constants';           // CR-060
import { configFromAPI, configToAPI } from '../transforms/tableTransform'; // CR-060
```

**Edit 3b:** Add functions after line 109 (end of existing code):
```javascript
// =============================================================================
// CR-060: Table Management CRUD (Settings)
// =============================================================================

/** GET /table-config — full table config with QR URLs */
export const getTableConfig = async () => {
  const res = await api.get(TABLE_CONFIG_ENDPOINTS.CONFIG);
  return configFromAPI.tableConfigList(res.data);
};

/** POST /table-config/store — create or update table/room */
export const storeTable = async (data) => {
  const payload = configToAPI.storeTable(data);
  const res = await api.post(TABLE_CONFIG_ENDPOINTS.STORE, payload);
  return res.data;
};

/** DELETE /table-config/{id} — delete table/room */
export const deleteTable = async (id) => {
  const res = await api.delete(`${TABLE_CONFIG_ENDPOINTS.DELETE}/${id}`);
  return res.data;
};

/** GET /table-config/area-options — unique area titles */
export const getAreaOptions = async () => {
  const res = await api.get(TABLE_CONFIG_ENDPOINTS.AREA_OPTIONS);
  return configFromAPI.areaOptions(res.data);
};

/** GET /table-config/waiter-list — waiters for assignment */
export const getWaiterList = async () => {
  const res = await api.get(TABLE_CONFIG_ENDPOINTS.WAITER_LIST);
  return configFromAPI.waiterList(res.data);
};

/** GET /table-config/export-sample — returns {download_url} */
export const exportSample = async () => {
  const res = await api.get(TABLE_CONFIG_ENDPOINTS.EXPORT_SAMPLE);
  return configFromAPI.exportResponse(res.data);
};

/** GET /table-config/export-list — export existing tables */
export const exportList = async () => {
  const res = await api.get(TABLE_CONFIG_ENDPOINTS.EXPORT_LIST);
  return res.data;
};

/** POST /table-config/import — bulk import from Excel (multipart) */
export const importTables = async (file) => {
  const formData = new FormData();
  formData.append('button', 'import');
  formData.append('table_file', file);
  const res = await api.post(TABLE_CONFIG_ENDPOINTS.IMPORT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};
```

**Verify:** Each function callable. Curl-testable via browser console.

---

### Step 4: `components/panels/settings/TableManagementView.jsx` — REWRITE

**File:** `/app/frontend/src/components/panels/settings/TableManagementView.jsx`
**Action:** FULL REWRITE (272 lines → ~450 lines)
**Existing export preserved:** `export const TableManagementView` — same name, SettingsPanel import unchanged.

**Structure:**

```
State:
  tables[]           ← from getTableConfig()
  areas[]            ← from getAreaOptions()
  waiters[]          ← from getWaiterList()
  selectedArea       ← filter right panel
  bulkEditMode       ← toggle to TableBulkEditor
  loading, saving
  dialogOpen         ← add/edit dialog state
  dialogMode         ← 'add' | 'edit'
  dialogData         ← {id, tableNo, title, rtype, waiterId}
  deleteConfirm      ← {id, tableNo} for confirmation

Lifecycle:
  useEffect: fetchAll() — getTableConfig + getAreaOptions + getWaiterList (parallel)

Layout (bulkEditMode=false):
  ┌── Left Panel (w-1/4) ──┐  ┌── Right Panel (w-3/4) ──────┐
  │ + Add Section           │  │ Toolbar: heading + buttons    │
  │ Section list            │  │ Card grid (responsive)       │
  │   (click to filter)     │  │ Each card: #, type badge,    │
  │   (edit/delete hover)   │  │   area, waiter, actions      │
  └─────────────────────────┘  └──────────────────────────────┘

Layout (bulkEditMode=true):
  <TableBulkEditor tables={tables} areas={areas} waiters={waiters} ... />

Dialog (Shadcn Dialog):
  - Type toggle (TB/RM)
  - Table/Room Number input (required)
  - Area/Section combobox (existing areas + free text)
  - Waiter dropdown
  - Cancel + Save

Delete confirmation:
  - Inline below card (same pattern as current code)
  - Toast on success/error

CRUD handlers:
  handleAdd()    → storeTable(data) → refreshAll() → toast
  handleEdit()   → storeTable(data with id) → refreshAll() → toast
  handleDelete() → deleteTable(id) → refreshAll() → toast
  refreshAll()   → re-fetch config + areas + refresh TableContext

Error handling (MUST match BulkEditor.jsx):
  - API errors → toast({ variant: "destructive" })
  - Validation → inline red border + text below input
  - Loading → Loader2 spinner
  - Empty state → centered message
```

**data-testid attributes:**
- `table-management-view`
- `add-section-btn`, `section-list`, `section-{name}`
- `table-toolbar`, `bulk-edit-toggle`, `export-btn`, `import-btn`, `add-table-btn`
- `table-card-grid`, `table-card-{id}`
- `table-type-badge-{id}`, `table-waiter-{id}`
- `table-edit-btn-{id}`, `table-delete-btn-{id}`
- `add-table-dialog`, `dialog-type-toggle`, `dialog-table-number`, `dialog-area-select`, `dialog-waiter-select`
- `dialog-cancel-btn`, `dialog-save-btn`
- `delete-confirm-{id}`, `delete-yes-btn-{id}`, `delete-no-btn-{id}`

---

### Step 5: `components/panels/settings/TableBulkEditor.jsx` — NEW (~350 lines)

**File:** `/app/frontend/src/components/panels/settings/TableBulkEditor.jsx` (NEW)
**Pattern:** Simplified `components/panels/menu/BulkEditor.jsx` (4 columns vs 33)

**Column Definitions:**
```javascript
const COLUMNS = [
  { key: "rtype",    label: "Type",           type: "dropdown", width: 100 },
  { key: "tableNo",  label: "Table/Room No.", type: "text",     width: 160, required: true },
  { key: "title",    label: "Area / Section", type: "dropdown", width: 160 },
  { key: "waiterId", label: "Assign Waiter",  type: "dropdown", width: 140 },
];
```

**Props:**
```
tables[]       — current table config items
areas[]        — for area dropdown
waiters[]      — for waiter dropdown
onRefresh()    — re-fetch after save
onClose()      — exit bulk edit mode
isLoading      — initial load state
```

**State:**
```
rows[]         — editable copy with _id, _original, _isNew, _saveStatus, _saveError, _validationErrors
search         — filter rows
dirtyCount     — computed from rows
saving         — during batch save
importing      — during import
exporting      — during export
```

**Features (matching BulkEditor.jsx exactly):**
- Toolbar: icon + title + count badge + search + Export + Import + **Add Item** (green) + **Save Changes** (orange) + Close
- Spreadsheet grid: sticky header, editable cells, row states (new=green, dirty=amber, error=red, saved=green)
- Row # column: shows +/Loader2/Check/AlertCircle
- Add Item: creates new row at top (green tint), auto-focus tableNo input
- Save: validates (tableNo required), batch save dirty rows via storeTable()
- Delete: Trash2 icon on new rows (remove from local), existing rows → deleteTable()
- Import: file picker → importTables() → refresh
- Export: exportList() → download
- Dirty detection: compare _original vs current field values
- Validation: tableNo required (red border + row indicator)
- Loading overlay: same as BulkEditor.jsx (Loader2 spinner + backdrop blur)

**data-testid attributes:**
- `table-bulk-editor`, `table-bulk-search`, `table-bulk-add-btn`, `table-bulk-save-btn`, `table-bulk-close-btn`
- `table-bulk-export-btn`, `table-bulk-import-btn`
- `table-bulk-row-{id}`, `table-bulk-cell-rtype-{id}`, `table-bulk-cell-tableNo-{id}`
- `table-bulk-cell-title-{id}`, `table-bulk-cell-waiterId-{id}`
- `table-bulk-delete-{id}`
- `table-bulk-loader-overlay`

---

### Step 6: `components/layout/Sidebar.jsx` — Remove comingSoon Flag

**File:** `/app/frontend/src/components/layout/Sidebar.jsx`
**Action:** Line 95 — remove `comingSoon: true`, add `path`

**Current (line 95):**
```javascript
      { id: "table-management", label: "Table Management", comingSoon: true },
```

**New:**
```javascript
      { id: "table-management", label: "Table Management", path: "/settings" },
```

**Note:** Path goes to `/settings` which opens SettingsPanel → user clicks "Table Management" tile inside. This matches the existing pattern where sidebar Settings children link to `/settings` (the All Settings page) or specific setting routes.

Actually — looking at the sidebar more carefully, the existing pattern has `path: "/restaurant-settings"` for "Restaurant Setup" which opens the settings panel. Table Management needs to open the settings panel with the table-management view pre-selected.

Let me check how the settings panel handles direct navigation:

**Alternative approach:** Set `path: "/settings"` and rely on user clicking the tile inside. OR remove comingSoon and add onClick handler. The simplest: just remove comingSoon. The sidebar `comingSoon` handler (L316-340) shows a toast — removing the flag lets the click proceed to the default settings navigation.

**Final approach:** Remove `comingSoon: true` and add `path: "/settings"`:
```javascript
      { id: "table-management", label: "Table Management", path: "/settings" },
```

**Verify:** Sidebar shows "Table Management" as clickable (not greyed out). Click navigates to Settings → user clicks Table Management tile.

---

## VERIFICATION MATRIX

| Edit # | File | Change | How to Verify | Auto? |
|--------|------|--------|---------------|:---:|
| 1 | constants.js | TABLE_CONFIG_ENDPOINTS | grep + import test | YES |
| 2 | tableTransform.js | configFromAPI + configToAPI | Unit test: input → output | YES |
| 3a | tableService.js | Import additions | Webpack compiles | YES |
| 3b | tableService.js | 8 CRUD functions | curl each endpoint | YES |
| 4 | TableManagementView.jsx | Full rewrite with real APIs | Browser: Settings → Table Mgmt → CRUD works | NO |
| 4a | — Dialog | Add/Edit dialog with 4 fields | Browser: open dialog, fill fields, save | NO |
| 4b | — Cards | Type badge + waiter + actions | Browser: cards show correct data | NO |
| 4c | — Sections | Left panel filter + add/edit/delete | Browser: click section, CRUD | NO |
| 4d | — Error handling | Toast + validation | Browser: submit empty form, API error | NO |
| 5 | TableBulkEditor.jsx | Spreadsheet + Add Item + Save | Browser: toggle bulk edit, add row, save | NO |
| 5a | — Row states | New=green, dirty=amber, error=red | Browser: add row, edit, break validation | NO |
| 5b | — Import/Export | File upload + download | Browser: import Excel, export | NO |
| 6 | Sidebar.jsx | comingSoon removed | Sidebar: Table Management clickable | NO |

---

## POST-CODE REGISTRY CHECKLIST

```
- [ ] registry.json: CR-060 → status: IMPLEMENTED
- [ ] CR_REGISTRY.md: row updated with IMPLEMENTED + final file list
- [ ] FILE_OWNERSHIP.md: add TableManagementView (rewrite), TableBulkEditor (new), tableService (modified), tableTransform (modified) with CR-060 + date
- [ ] BUG_TRACKER.md: BUG-148 remains CLOSED-SUBSUMED
- [ ] Code markers: // CR-060 comment in every new/modified file
- [ ] Compile check: webpack compiles with 0 NEW warnings
- [ ] TableContext: verify refreshTables() still works after CRUD
```

---

## RISK REGISTER (final)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | TableManagementView REWRITE | LOW | Same export name, same import in SettingsPanel. Self-contained. |
| R2 | tableService.js additions | LOW | Additive only. Existing getTables() untouched. |
| R3 | tableTransform.js additions | LOW | Additive only. New exports `configFromAPI`/`configToAPI` — no name collision. |
| R4 | TableContext.refreshTables() | LOW | Already exists. Just call it. Boot data uses different API (/all-table-list) than config CRUD (/table-config). |
| R5 | Sidebar comingSoon removal | LOW | Feature fully wired before flag removed. |
| R6 | BulkEditor row save — same endpoint for create+update | LOW | Presence of `id` in payload determines mode. New rows have no `id`. |

---

```
Implementation Plan complete: CR-060
Stage: Gate 3
Code reality: PARTIAL
Risk: MEDIUM
Files WILL change: 5 existing (TableManagementView REWRITE, tableService, tableTransform, constants, Sidebar)
Files WILL create: 1 new (TableBulkEditor.jsx ~350 lines)
Total: ~550 new/modified lines
Verification matrix: 12 checks (3 automated, 9 browser)
Post-code checklist: 7 items
Docs: memory/plans/CR_060_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO → Implementation
```
