# CR-060 — Impact Analysis (Gate 2)

**ID:** CR-060
**Gate:** 2 (Impact Analysis)
**Date:** 2026-07-06
**Code Reality:** PARTIAL — UI shell exists (272 lines), all CRUD mocked, zero API calls
**Conflict Pre-Check:** CLEAN — TableManagementView.jsx last touched at initial build, no active CRs
**Risk:** MEDIUM (no financial logic; but TableContext is used by order flow — must not break)
**Priority:** P1

---

## 1. Scope

Wire the existing Table Management Settings sub-view to real backend CRUD APIs. Add Room/Table type support, waiter assignment, and Bulk Editor mode. Remove `comingSoon` sidebar flag. Stay within Settings framework (NOT a standalone route).

---

## 2. Data Flow

```
                     ┌──────────────────────────┐
                     │ preprod.mygenie.online     │
                     │ /restaurant-settings/      │
                     │   table-config/*           │
                     └───────────┬────────────────┘
                                 │ 8 endpoints
                     ┌───────────▼────────────────┐
                     │ tableService.js             │  ← MODIFY: add CRUD functions
                     │ (existing: read-only)       │
                     └───────────┬────────────────┘
                                 │
                     ┌───────────▼────────────────┐
                     │ tableTransform.js           │  ← MODIFY: add config transforms
                     │ (existing: boot transforms) │
                     └───────────┬────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                                     │
     ┌────────▼─────────┐               ┌──────────▼──────────┐
     │TableManagementView│               │ TableBulkEditor     │
     │ (REWRITE)         │ ──toggles──►  │ (NEW)               │
     │ • Sections list   │               │ • Spreadsheet grid  │
     │ • Card grid       │               │ • Add Item top-right│
     │ • Add/Edit Dialog │               │ • Save Changes      │
     │ • Delete confirm  │               │ • Row states        │
     └────────┬─────────┘               └─────────────────────┘
              │
     ┌────────▼─────────┐
     │ TableContext      │  ← USES existing refreshTables() after mutations
     │ (NO structural    │
     │  changes needed)  │
     └──────────────────┘
```

---

## 3. Files WILL Change (5 existing files)

| # | File | Lines Changed | Change Description | Risk |
|---|------|--------------|-------------------|------|
| 1 | `components/panels/settings/TableManagementView.jsx` | ~400 (REWRITE) | Full rewrite: replace mocked CRUD with real API calls. Add Dialog for add/edit (Type toggle, Number, Area, Waiter). Add bulk edit toggle. Add room support. Real error handling. | **MEDIUM** — self-contained component, no external consumers except SettingsPanel import |
| 2 | `api/services/tableService.js` | +80 lines | Add CRUD functions: `getTableConfig()`, `storeTable()`, `deleteTable()`, `getAreaOptions()`, `getWaiterList()`, `exportSample()`, `exportList()`, `importTables()` | **LOW** — additive functions, existing read functions untouched |
| 3 | `api/transforms/tableTransform.js` | +60 lines | Add `fromAPI.tableConfig()`, `fromAPI.areaOptions()`, `fromAPI.waiterList()`, `toAPI.storeTable()`, `toAPI.updateTable()` | **LOW** — additive transforms, existing transforms untouched |
| 4 | `api/constants.js` | +15 lines | Add `TABLE_CONFIG_ENDPOINTS` block | **LOW** — additive constant block |
| 5 | `components/layout/Sidebar.jsx` | 1 line | Remove `comingSoon: true` from table-management entry (line 95) | **LOW** — single flag change |

## 4. Files WILL Create (1 new file)

| # | File | Est. Lines | Purpose | Pattern Reference |
|---|------|-----------|---------|-------------------|
| 1 | `components/panels/settings/TableBulkEditor.jsx` | ~350 | Spreadsheet-style bulk editor for tables/rooms | `components/panels/menu/BulkEditor.jsx` (simplified — 4 columns vs 33) |

## 5. Files WILL NOT Touch

| File | Reason |
|------|--------|
| `SettingsPanel.jsx` | Already imports TableManagementView correctly at line 13, mapped in DETAIL_VIEWS at line 42. No changes needed. |
| `App.js` | No new routes — Table Management stays within Settings. |
| `contexts/TableContext.jsx` | Has `refreshTables()` already (line 30-33). We call it after mutations. No structural changes. |
| `Header.jsx` | The `add-table-btn` (line 667) is actually the "Add Order" button, not related to table management. |
| Order flow files | `OrderEntry.jsx`, `CartPanel.jsx`, `TableCard.jsx`, `DashboardPage.jsx` — untouched |
| `tableService.js` existing functions | `getTables()`, `getTableById()`, `filterBySection()` etc. — untouched (read-only boot functions) |
| `tableTransform.js` existing transforms | `fromAPI.tableList()`, `fromAPI.table()`, `toAPI.shiftTable()` — untouched |
| Socket handlers | `socketHandlers.js`, `useSocketEvents.js` — untouched |

---

## 6. API Integration Map

| UI Action | API Endpoint | Method | Service Function |
|-----------|-------------|--------|------------------|
| Load table config | `/table-config` | GET | `getTableConfig()` |
| Add table/room | `/table-config/store` | POST | `storeTable(data)` |
| Edit table/room | `/table-config/store` | POST | `storeTable(data)` (with `id` in body) |
| Delete table/room | `/table-config/{id}` | DELETE | `deleteTable(id)` |
| Load area options | `/table-config/area-options` | GET | `getAreaOptions()` |
| Load waiter list | `/table-config/waiter-list` | GET | `getWaiterList()` |
| Export sample | `/table-config/export-sample` | GET | `exportSample()` |
| Export existing | `/table-config/export-list` | GET | `exportList()` |
| Import from Excel | `/table-config/import` | POST (multipart) | `importTables(file)` |

---

## 7. Transform Mapping

### fromAPI (config response → frontend)

```
tableConfig response:
  data.tables[] → same shape as boot tables but with extra fields (qr_code_urls, f_name, l_name)
  
  fromAPI.tableConfigItem(api) → {
    id: api.id,
    tableNo: api.table_no,
    title: api.title,            // area/section
    rtype: api.rtype,            // "TB" or "RM"
    waiterId: api.waiter_id,
    waiterName: `${api.f_name || ''} ${api.l_name || ''}`.trim(),
    status: api.status,
    qrCodeUrls: api.qr_code_urls,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  }

  fromAPI.areaOptions(res) → string[] (filter nulls)
  fromAPI.waiterList(res) → [{id, name}]
```

### toAPI (frontend → request)

```
  toAPI.storeTable(data) → {
    title: data.title || null,
    table_no: data.tableNo,
    vendorName: data.waiterId || null,
    rtype: data.rtype,             // "TB" or "RM"
    ...(data.id ? { id: data.id } : {}),  // presence triggers update
  }
```

### API Quirks

| # | Quirk | Handling |
|---|-------|---------|
| Q1 | Same endpoint for create + update | Check for `id` in payload |
| Q2 | `vendorName` is waiter ID (int), not a name | Map `waiterId` → `vendorName` in toAPI |
| Q3 | `title` is area/section, not table name | Clear field labeling in UI |
| Q4 | Areas are derived from table `title` | Area dropdown populated from existing titles + free text |
| Q5 | Auto-assigns first waiter if null | OK — UI sends null for unassigned |
| Q6 | `export-sample` returns JSON with download_url | Fetch URL, then trigger browser download |

---

## 8. Risk Register

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | TableManagementView.jsx REWRITE — could break Settings panel | LOW | Self-contained: only imported by SettingsPanel.jsx line 13. Same export name preserved. |
| R2 | tableService.js modifications — could break boot table loading | LOW | ADDITIVE only. Existing `getTables()` (line 11-14) untouched. New functions added below. |
| R3 | tableTransform.js modifications — could break order flow transforms | LOW | ADDITIVE only. Existing `fromAPI.tableList()` and `toAPI.shiftTable()` untouched. New transforms added in separate block. |
| R4 | TableContext refreshTables() — called after CRUD mutations | LOW | Already exists and works. Just invoke it. No changes to context. |
| R5 | Sidebar comingSoon removal — could expose broken feature | LOW | Feature won't be broken — we're wiring real APIs in same CR. |
| R6 | BulkEditor complexity | MEDIUM | Much simpler than Menu BulkEditor (4 columns vs 33, no tiers, no addons). Pattern already proven. |

---

## 9. Owner Decisions (locked during Discovery)

| # | Decision | Ruling |
|---|----------|--------|
| OD-1 | Stays under Settings | NOT standalone route |
| OD-2 | Room/Table type selector | Pill toggle in dialog |
| OD-3 | Waiter assignment | Dropdown in dialog + card |
| OD-4 | QR codes → Phase 2 | Not in this implementation |
| OD-5 | Waiter access permissions → Phase 2 | Business logic pending |
| OD-6 | Bulk Editor follows Menu Mgmt BulkEditor pattern | Add Item top-right, row states, Save Changes |
| OD-7 | Error handling | MUST match BulkEditor.jsx patterns |

---

## 10. Execution Sequence (recommended)

```
Step 1: constants.js — Add TABLE_CONFIG_ENDPOINTS
Step 2: tableTransform.js — Add config fromAPI/toAPI transforms
Step 3: tableService.js — Add CRUD + bulk functions
Step 4: TableManagementView.jsx — REWRITE with real APIs + Dialog + room support
Step 5: TableBulkEditor.jsx — NEW bulk editor (BulkEditor.jsx pattern simplified)
Step 6: Sidebar.jsx — Remove comingSoon flag (line 95)
Step 7: Verify TableContext.refreshTables() works after mutations
```

---

```
Impact Analysis complete: CR-060
Code reality: PARTIAL (UI exists, CRUD mocked)
Risk: MEDIUM
Files WILL change: 5 existing (TableManagementView REWRITE, tableService, tableTransform, constants, Sidebar)
Files WILL create: 1 new (TableBulkEditor.jsx, ~350 lines)
Files WILL NOT touch: SettingsPanel, App.js, TableContext, Header, order flow, socket handlers
Total estimated: ~550 new/modified lines
Owner decisions: 7 locked
Next: Gate 3 (Implementation Plan)
```
