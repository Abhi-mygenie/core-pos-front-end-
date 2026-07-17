# Batch A — Ship-Now Group — Implementation Plan (Gate 3)

**Date:** 2026-07-16
**Role:** PLANNING
**Gate:** 3 (Implementation Plan)
**Sprint:** POS 5.0
**Alpha Version:** v0.8

**Scope:** ONLY items with zero unresolved blockers. Backend-gated (BUG-201 full, BUG-202) and design-gated (CR-074-B) items remain at Gate 2 and are explicitly excluded from this plan.

---

## 0. Preconditions — all satisfied (2026-07-16)

| Precondition | Status |
|---|---|
| Impact Analysis (Gate 2) complete | ✅ `/app/memory/impact/BATCH_A_EXPENSE_BUGS_IMPACT_ANALYSIS.md` |
| Owner decisions locked (B-1..B-8, Q-1, Q-2) | ✅ Impact doc §9.5 |
| Curl-verified backend contracts | ✅ `/app/memory/evidence/BATCH_A/CURL_VERIFY_FINDINGS.md` |
| BACKEND_BRIEFs written (BUG-201, BUG-202) | ✅ handed off to owner |
| Code reality checked | ✅ PARTIAL — no drift since Gate 2 |
| Conflict pre-check | ✅ CLEAR — no other open item touches target files |
| Alpha R25 relevance | ✅ Reviewed — none of these edits touch update endpoints |

## 1. Scope-Lock

### Items covered by this plan (4)

| ID | Title | Type |
|---|---|---|
| **BUG-199** | Expense Entry: new item defaults to "misc" (create + edit flows) | Payload additive fix |
| **BUG-200** | Expense Report category filter | **Close as DUPLICATE-OF-BUG-199** (auto-resolves, no code) |
| **CR-074-A** | Remove Import/Export from Expense Bulk Editor + dead-code sweep | Code removal |
| **BUG-201 Phase 1 interim** | Update delete-item modal wording to warn about cascade | Copy change |

### Items explicitly EXCLUDED (blocked)

| ID | Why excluded |
|---|---|
| **BUG-201 Phase 1 (full)** | Waits on BACKEND_BRIEF_BUG201 delivery (409 cascade blocking) |
| **BUG-202** | Waits on BACKEND_BRIEF_BUG202 delivery (new PUT item-update endpoint) |
| **CR-074-B** | Waits on `design_agent_full_stack` mockup + owner approval |

### Files WILL change (4)

1. `/app/frontend/src/components/expense/ExpenseEntryPanel.jsx`
2. `/app/frontend/src/api/services/expenseService.js`
3. `/app/frontend/src/api/constants.js`
4. `/app/frontend/src/components/expense/ExpenseBulkEditor.jsx`
5. `/app/frontend/src/api/transforms/expenseTransform.js`
6. `/app/frontend/src/components/expense/ExpenseSetupPanel.jsx`

### Files WILL NOT touch

- Any hotspot: `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js`, `DashboardPage.jsx`, `LoadingPage.jsx`
- `ExpenseReportPage.jsx` — no change (report filter already correct per curl B-2)
- `utils/reportExporter.js` — shared across multiple report pages, out of scope
- Any file outside `expense/` module
- `AppProviders.jsx`, `axios.js`, `AuthContext.js`

### Registry / doc side-effects

- BUG-199, BUG-200, BUG-201 already registered.
- **CR-074 needs Gate 1 registration** (both -A and -B). Included as Step 0 of execution sequence.
- Registry.json + BUG_TRACKER.md + CR_REGISTRY.md updates included in Post-Code Checklist.

---

## 2. Exact Edits

### Edit #1 — `expenseService.js` — extend create payload (BUG-199 part 1)

**File:** `/app/frontend/src/api/services/expenseService.js`
**Location:** function `addExpenseEntry` (lines 134–146)
**Current (L138–145):**
```js
details: lines.map((l) => ({
  expense: l.expense,
  amount: l.amount,
  payment_method: l.payment_method,
  quantity: l.quantity || 0,
  unit: l.unit || '',
  physical_quantity: l.physical_quantity || 0, // BUG-176
})),
```
**New:**
```js
details: lines.map((l) => ({
  expense: l.expense,
  amount: l.amount,
  payment_method: l.payment_method,
  quantity: l.quantity || 0,
  unit: l.unit || '',
  physical_quantity: l.physical_quantity || 0, // BUG-176
  category_id: l.category_id ?? null, // BUG-199: preserve line's category (curl-verified 2026-07-16)
  notes: l.notes || '',                // pass through (already present in caller — BUG-177)
})),
```
**Rationale:** Curl-verified backend accepts `category_id` at line level. Missing → defaults to misc (cat 273).
**Note:** `notes` was already being sent by caller (`ExpenseEntryPanel.jsx:496`) but not by this wrapper — including it here in the same edit closes an existing propagation gap.

---

### Edit #2 — `ExpenseEntryPanel.jsx` — pass categoryId on create (BUG-199 part 2)

**File:** `/app/frontend/src/components/expense/ExpenseEntryPanel.jsx`
**Location:** `handleSave`, `details` mapping (lines 489–497)
**Current:**
```js
const details = lines.map(l => ({
  expense: l.itemName,
  amount: parseFloat(l.amount),
  payment_method: l.paymentMethod,
  quantity: parseFloat(l.quantity || 0),
  unit: l.unit || "",
  physical_quantity: parseFloat(l.physical_quantity || 0), // BUG-176
  notes: l.notes || "",  // BUG-177
}));
```
**New:**
```js
const details = lines.map(l => ({
  expense: l.itemName,
  amount: parseFloat(l.amount),
  payment_method: l.paymentMethod,
  quantity: parseFloat(l.quantity || 0),
  unit: l.unit || "",
  physical_quantity: parseFloat(l.physical_quantity || 0), // BUG-176
  notes: l.notes || "",  // BUG-177
  category_id: l.categoryId ? parseInt(l.categoryId, 10) : null, // BUG-199: pass user-selected category
}));
```
**Rationale:** `l.categoryId` is captured in component state (EMPTY_LINE at L33, dropdown at L218–221, auto-fill at L177). Only the last-mile serialization was missing. Coerce to int since the state stores it as string per select-onChange.

---

### Edit #3 — `expenseService.js` — extend edit payload (BUG-199 part 3, per Q-1)

**File:** `/app/frontend/src/api/services/expenseService.js`
**Location:** function `editExpenseEntry` (lines 154–163)
**Current:**
```js
export const editExpenseEntry = (id, data) =>
  api.put(`${EXPENSE_ENDPOINTS.EDIT_EXPENSE}/${id}`, {
    exp_name: data.expense ?? data.exp_name,
    e_dates: data.e_dates,
    d_amount: data.d_amount,
    payment_method: data.payment_method,
    quantity: data.quantity || 0,
    unit: data.unit || '',
    physical_quantity: data.physical_quantity || 0, // BUG-176
  });
```
**New:**
```js
export const editExpenseEntry = (id, data) =>
  api.put(`${EXPENSE_ENDPOINTS.EDIT_EXPENSE}/${id}`, {
    exp_name: data.expense ?? data.exp_name,
    e_dates: data.e_dates,
    d_amount: data.d_amount,
    payment_method: data.payment_method,
    quantity: data.quantity || 0,
    unit: data.unit || '',
    physical_quantity: data.physical_quantity || 0, // BUG-176
    notes: data.notes || '',                        // BUG-177 propagation (was passed by caller L522, dropped here)
    category_id: data.category_id ?? null,          // BUG-199 Q-1: preserve category on edit
  });
```
**Rationale:** Q-1 approval — preserve category across edits so amount/payment_method changes don't accidentally reset an item's category to misc if backend re-does lookup.
**Note:** R25 not violated — this endpoint is already `api.put` (correctly).

---

### Edit #4 — `ExpenseEntryPanel.jsx` — thread categoryId through startEdit (BUG-199 part 4, per Q-1)

**File:** `/app/frontend/src/components/expense/ExpenseEntryPanel.jsx`
**Location:** `startEdit` function (lines 512–524)
**Current:**
```js
const startEdit = (tx) => {
  setEditingId(tx.id);
  setEditRow({
    expense: tx.expense,
    e_dates: tx.date || formatDateDDMMYYYY(selectedDate),
    d_amount: String(tx.amount),
    payment_method: tx.paymentMethod,
    quantity: String(tx.quantity || ""),
    unit: tx.unit || "",
    physical_quantity: String(tx.physical_quantity || ""), // BUG-176
    notes: tx.notes || "",  // BUG-177
  });
};
```
**New:**
```js
const startEdit = (tx) => {
  setEditingId(tx.id);
  setEditRow({
    expense: tx.expense,
    e_dates: tx.date || formatDateDDMMYYYY(selectedDate),
    d_amount: String(tx.amount),
    payment_method: tx.paymentMethod,
    quantity: String(tx.quantity || ""),
    unit: tx.unit || "",
    physical_quantity: String(tx.physical_quantity || ""), // BUG-176
    notes: tx.notes || "",  // BUG-177
    category_id: tx.categoryId ?? null,  // BUG-199 Q-1: preserve category from transaction snapshot
  });
};
```
**Rationale:** `expenseTransform.js:117` already exposes `categoryId` on transaction. Thread it through to the edit payload.
**Note:** Edit UI does NOT expose a category dropdown (BUG-178 keeps item name read-only in edit mode). This edit is purely defensive — preserves the existing categoryId so it round-trips.

---

### Edit #5 — `constants.js` — remove dead import/export endpoint constants (CR-074-A)

**File:** `/app/frontend/src/api/constants.js`
**Location:** `EXPENSE_ENDPOINTS` block (lines 407–434)
**Remove these 6 lines (416, 417, 418, 424, 425, 426):**
```js
  BULK_EXPORT: '/api/v2/vendoremployee/expense/bulk-export-expense',
  BULK_IMPORT: '/api/v2/vendoremployee/expense/bulk-import-expense',
  STOCK_SAMPLE: '/bulk_upload_sample/expense/expense_stock_sample.xlsx',
  ...
  EXPORT_REPORT: '/api/v2/vendoremployee/expense/expenses-export-report',
  DOWNLOAD_SAMPLE: '/api/v2/vendoremployee/expense/download-semple',
  IMPORT_EXPENSE: '/api/v2/vendoremployee/expense/import-expense',
```
**Verify:** All 6 constants are only referenced by the wrappers we're removing in Edit #6. Grep guard before saving:
```bash
grep -rn "BULK_EXPORT\|BULK_IMPORT\|STOCK_SAMPLE\|EXPORT_REPORT\|DOWNLOAD_SAMPLE\|IMPORT_EXPENSE" /app/frontend/src --include="*.js" --include="*.jsx"
```
If any usage exists outside `expenseService.js` or `ExpenseBulkEditor.jsx`, STOP and re-scope.

---

### Edit #6 — `expenseService.js` — remove import/export wrappers (CR-074-A)

**File:** `/app/frontend/src/api/services/expenseService.js`
**Remove:**
- L86–90 (`exportStockMaster`) — used by removed bulk editor button
- L92–103 (`importStockMaster` including formData wrapper) — used by removed bulk editor button
- L175–195 (`exportExpenseReport` + `importExpenses`) — **dead code**, never called in UI

**Guard:** already grep-verified in curl-verify session — these 4 functions are called only from `ExpenseBulkEditor.jsx` (2 of them) and nowhere (the other 2).

---

### Edit #7 — `expenseTransform.js` — remove `fromAPI.exportResponse` (CR-074-A)

**File:** `/app/frontend/src/api/transforms/expenseTransform.js`
**Location:** L192–198
**Remove:**
```js
/**
 * POST /bulk-export-expense → {message, downloadUrl}
 */
exportResponse: (res) => ({
  message: res?.data?.message ?? 'Export ready',
  downloadUrl: res?.data?.url ?? res?.data?.download_url ?? null,
}),
```
**Rationale:** Only caller is `ExpenseBulkEditor.jsx:235`, which is removed in Edit #8.

---

### Edit #8 — `ExpenseBulkEditor.jsx` — remove import/export UI + handlers (CR-074-A)

**File:** `/app/frontend/src/components/expense/ExpenseBulkEditor.jsx`
**Removals in order:**

1. **L5 icon imports** — remove `Download`, `Upload` from `lucide-react` import list.
2. **L33** — remove `const [exporting, setExporting] = useState(false);`
3. **L34** — remove `const [importing, setImporting] = useState(false);`
4. **fileInputRef declaration** — find & remove (currently around top of component, referenced only in removed handlers).
5. **L230–255** — remove entire `handleExport` + `handleImport` block including the `// ─── Excel / Import ───` comment header.
6. **L289–296** — remove Excel export button JSX block (`data-testid="bulk-excel-btn"`).
7. **L298–308** — remove Import button + hidden file input JSX block (`data-testid="bulk-import-btn"`, `"bulk-import-file"`).

**Preserve:** Search input, Add Item button, all row/table logic, Save-All, category dropdown, Reset All footer, close button.

**Add code marker:** `// CR-074-A: removed Excel export + Import handlers (owner ruling 2026-07-16)`

---

### Edit #9 — `ExpenseSetupPanel.jsx` — update delete-item modal wording (BUG-201 Phase 1 interim)

**File:** `/app/frontend/src/components/expense/ExpenseSetupPanel.jsx`
**Location:** delete-item modal (lines 897–914)
**Current (L901–902):**
```jsx
<h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Remove Item?</h3>
<p className="text-sm mb-5" style={{ color: COLORS.grayText }}>This action cannot be undone.</p>
```
**New:**
```jsx
<h3 className="text-base font-semibold mb-2" style={{ color: COLORS.darkText }}>Delete Item?</h3>
<p className="text-sm mb-5" style={{ color: COLORS.grayText }}>
  This item may have linked expense transactions. Deleting will permanently remove the item and all related expense records. This cannot be undone.
</p>
{/* BUG-201 Phase 1 interim: cascade-aware wording. Full 409-driven flow lands once BACKEND_BRIEF_BUG201 is delivered. */}
```
**Preserve:** modal container, Cancel button, Remove button (rename Remove → "Delete" for accuracy), `data-testid`s.

**Also update button label (L907–910):**
- Change `Remove` → `Delete` (consistent with title)
- No `data-testid` change (`delete-item-confirm-btn` remains)

---

## 3. Verification Matrix (seeds QA)

| # | File | Change | How to Verify | Automated? |
|---|---|---|---|---|
| 1 | `expenseService.js:138-145` (addExpenseEntry) | Adds `category_id`, `notes` to details payload | Curl a `POST /store-expense-details` with `category_id: 42`; response echoes `category_id: 42, category_name: "grocery"` (proven in Gate 2 curl session). | Manual curl |
| 2 | `ExpenseEntryPanel.jsx:489-497` (handleSave) | Passes `l.categoryId` to service | Browser: select "grocery" category, add item "TEST_BUG199", save → refresh → verify row shows "grocery" not "misc" | Manual UI |
| 3 | `expenseService.js:154-163` (editExpenseEntry) | Adds `category_id`, `notes` on edit | Browser: edit existing expense's amount, save, refresh → category field unchanged (regression check) | Manual UI |
| 4 | `ExpenseEntryPanel.jsx:512-524` (startEdit) | Preserves `tx.categoryId` in editRow | Browser: click edit on a "grocery" row → cancel → row still shows "grocery" (state didn't drop it) | Manual UI |
| 5 | BUG-200 auto-resolve | Category filter should now find non-misc rows | Browser: create fresh transaction with "Fish" category (post BUG-199 fix), open Expense Report, filter by Fish → 1 row visible | Manual UI |
| 6 | `constants.js` | 6 constants removed | `grep -rn "BULK_EXPORT\|BULK_IMPORT\|STOCK_SAMPLE\|EXPORT_REPORT\|DOWNLOAD_SAMPLE\|IMPORT_EXPENSE" /app/frontend/src` returns zero hits post-edit | Automated grep |
| 7 | `expenseService.js` | 4 functions removed | `grep -rn "exportStockMaster\|importStockMaster\|exportExpenseReport\|importExpenses" /app/frontend/src` returns zero hits post-edit | Automated grep |
| 8 | `expenseTransform.js` | `fromAPI.exportResponse` removed | `grep -n "exportResponse" /app/frontend/src` returns zero hits post-edit | Automated grep |
| 9 | `ExpenseBulkEditor.jsx` | Excel + Import buttons gone | Browser: open Expense Setup → Bulk Editor → toolbar has only Search + Add Item + Save (no Excel/Import buttons) | Manual UI |
| 10 | `ExpenseBulkEditor.jsx` | No JS runtime error from missing imports | Browser: open bulk editor, save an item, close — no console errors | Manual UI + console |
| 11 | `ExpenseSetupPanel.jsx:897-914` | Modal wording updated | Browser: navigate to Expense Setup → Delete an item → verify modal shows cascade warning text | Manual UI |
| 12 | Regression: `ExpenseEntryPanel` create with no category | Should still land in misc gracefully | Browser: leave category blank, add item, save → item lands in misc (backend fallback still works) | Manual UI |
| 13 | Regression: existing BUG-175/176 behavior | Case A (no qty) + Case B (qty + physical_qty) still save | Browser: two flows unchanged | Manual UI |
| 14 | Regression: report Excel/PDF download | Still works from Insights → Expense Report | Browser: open report, click Download → Excel → file downloads | Manual UI |

---

## 4. Execution Sequence

**Order matters — apply edits in this sequence:**

### Step 0 — Registry Gate 1 (before any coding)
- Register **CR-074** in `registry.json`, `CR_REGISTRY.md` (status: `GATE 2 COMPLETE — split into -A shippable, -B pending design`).
- Register **BUG-202** in `registry.json`, `BUG_TRACKER.md` (status: `GATE 2 COMPLETE — BACKEND-BLOCKED (BACKEND_BRIEF_BUG202)`).
- Add BUG-202 + CR-074 to `FILE_OWNERSHIP.md` targets.

### Step 1 — BUG-199 (highest value; unblocks BUG-200)
1. Edit #1 (`expenseService.js` addExpenseEntry)
2. Edit #2 (`ExpenseEntryPanel.jsx` handleSave)
3. Edit #3 (`expenseService.js` editExpenseEntry)
4. Edit #4 (`ExpenseEntryPanel.jsx` startEdit)
5. Save → hot-reload compile check
6. Manual browser smoke: create expense with grocery category, verify persistence

### Step 2 — CR-074-A (independent removal)
7. Grep guard (Edit #5 verify command) — must return zero external usage
8. Edit #5 (`constants.js` — remove 6 constants)
9. Edit #6 (`expenseService.js` — remove 4 wrappers)
10. Edit #7 (`expenseTransform.js` — remove `exportResponse`)
11. Edit #8 (`ExpenseBulkEditor.jsx` — remove UI + handlers)
12. Save → hot-reload compile check
13. Manual browser smoke: open bulk editor, no console errors, toolbar has Search + Add Item + Save only

### Step 3 — BUG-201 Phase 1 interim
14. Edit #9 (`ExpenseSetupPanel.jsx` modal wording)
15. Save → hot-reload compile check
16. Manual browser smoke: delete an item, verify modal wording

### Step 4 — BUG-200 close (no code)
17. Update `BUG_TRACKER.md`: BUG-200 → `CLOSED — DUPLICATE-OF-BUG-199 (curl-verified 2026-07-16; filter mechanics correct)`

### Step 5 — Testing agent + regression
18. Call `testing_agent_v3` with problem statement and Verification Matrix

### Step 6 — Post-Code Registry Checklist (R17)
19. `registry.json`: BUG-199, BUG-200, BUG-201 (interim only), CR-074-A → `status: IMPLEMENTED, sprint_key: pos_5_0`
20. `BUG_TRACKER.md`: rows updated
21. `CR_REGISTRY.md`: CR-074 row updated (-A implemented, -B pending)
22. `FILE_OWNERSHIP.md`: add all 6 modified files under BUG-199/CR-074-A/BUG-201 headings
23. Code markers verified: `// BUG-199`, `// CR-074-A`, `// BUG-201 Phase 1 interim` present in every modified file (R18)

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `l.categoryId` in `ExpenseEntryPanel` is a stringified id vs numeric — backend might reject non-int | LOW | BUG-199 fix no-ops silently | `parseInt(l.categoryId, 10)` in Edit #2 handles it; regression test #2 verifies persistence. |
| `notes` addition to `editExpenseEntry` payload rejected by backend | LOW | 400 on edit | Curl-verify edit endpoint accepts `notes` before hot-reload OR wrap edit in try/catch (already exists at L536); revert Edit #3 notes line if 400 seen. **Do curl verify during Step 1.** |
| Grep guard on Edit #5 finds hidden usage | LOW | Compile error | Edit #5 STOP condition — re-scope before proceeding. |
| Removing icons `Download`, `Upload` in Edit #8 breaks other imports in same file | LOW | Runtime error | Icons are only used in the removed JSX — grep-verify inside file before saving. |
| Regression on BUG-175/176 (Case A/B save flows) | LOW | Save button breaks | Verification Matrix #13 covers this. Only additive changes to details payload. |
| BUG-201 wording implies functionality that doesn't exist yet (users may expect a proper transaction count) | LOW-MED | UX confusion until BUG-201 full ships | Copy explicitly says "may have linked". Not a false promise. Full 409-driven UX ships when backend delivers. |

---

## 6. Post-Code Registry Checklist (R17 — mandatory for IMPL agent)

```
- [ ] registry.json: BUG-199 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] registry.json: BUG-200 → status: CLOSED — DUPLICATE-OF-BUG-199
- [ ] registry.json: BUG-201 → status: PHASE 1 INTERIM IMPLEMENTED, full pending BACKEND_BRIEF_BUG201
- [ ] registry.json: BUG-202 → GATE 1 REGISTERED, status: BACKEND-BLOCKED (BACKEND_BRIEF_BUG202)
- [ ] registry.json: CR-074 → GATE 1 REGISTERED, -A: IMPLEMENTED, -B: DESIGN-GATED
- [ ] BUG_TRACKER.md: 4 rows updated / added
- [ ] CR_REGISTRY.md: CR-074 row added
- [ ] FILE_OWNERSHIP.md: 6 files listed under BUG-199 / CR-074-A / BUG-201 headings
- [ ] Code markers present in every modified file (R18):
    - ExpenseEntryPanel.jsx    → // BUG-199
    - expenseService.js         → // BUG-199 (2 places)
    - constants.js              → // CR-074-A
    - expenseTransform.js       → // CR-074-A
    - ExpenseBulkEditor.jsx     → // CR-074-A
    - ExpenseSetupPanel.jsx     → // BUG-201 Phase 1 interim
- [ ] Verification Matrix: 14 checks executed (8 automated grep, 6 manual UI)
- [ ] testing_agent_v3 called and report reviewed
- [ ] Handover doc written
```

---

## 7. Handover to Owner (→ Gate 4)

```
Plan ready at /app/memory/plans/BATCH_A_SHIPNOW_IMPLEMENTATION_PLAN.md
9 edits across 6 files (2 additive fixes, 1 modal copy, 6 code removals).
Code reality: PARTIAL (fix sites confirmed against latest source).
Scope: 6 files WILL change / hotspots + report page + reportExporter untouched.
Verification matrix: 14 checks (8 automated grep, 6 manual UI).
Owner decisions needed: NONE — all blockers resolved 2026-07-16.
Awaiting Gate 4 GO.
```

---

## 8. Deferred (parked, unblocked by external delivery)

- **BUG-201 Phase 1 full** — resumes when backend ships 409 responses per BACKEND_BRIEF_BUG201.
- **BUG-202** — resumes when backend ships `PUT /expense/stock-items/{id}` per BACKEND_BRIEF_BUG202.
- **CR-074-B** — resumes when `design_agent_full_stack` returns mockup + owner approves.
