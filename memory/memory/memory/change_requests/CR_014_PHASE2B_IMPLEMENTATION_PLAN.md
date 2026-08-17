# CR-014 Phase 2B — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-09

---

## File 1: `menuManagementService.js` — Add 3 functions after line 57

```js
/** API #9 — Bulk export all foods → { message, download_url } */
export const bulkExport = (type = 'all') =>
  api.post(`${BASE_V2}/bulk-export`, { type });

/** API #8 — Bulk import from xlsx → { normal_food, aggregator_food, total, message } */
export const bulkImport = (file) => {
  const formData = new FormData();
  formData.append('products_file', file);
  return api.post(`${BASE_V2}/bulk-import`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

/** API #10 — Export sample template → { message, download_url } */
export const exportSample = () =>
  api.get(`${BASE_V2}/export-sample`);
```

---

## File 2: `BulkEditor.jsx` — Replace disabled buttons (lines 463-471)

**Current (disabled):**
```jsx
<button disabled title="Coming soon">Excel</button>
<button disabled title="Coming soon">Import</button>
```

**New:**

### Excel button → dropdown with 2 options
```jsx
// State: const [showExportMenu, setShowExportMenu] = useState(false);
// State: const [exporting, setExporting] = useState(false);
// Ref: const exportRef = useRef(null);
// Click-outside: close dropdown

<div className="relative" ref={exportRef}>
  <button onClick={() => setShowExportMenu(v => !v)} disabled={exporting}>
    <Download /> {exporting ? "Exporting..." : "Excel"}
  </button>
  {showExportMenu && (
    <div className="absolute dropdown">
      <button onClick={handleExportAll}>Export All Items (.xlsx)</button>
      <button onClick={handleExportTemplate}>Download Template (.xlsx)</button>
    </div>
  )}
</div>
```

### Import button → hidden file input trigger
```jsx
// State: const [importing, setImporting] = useState(false);
// Ref: const fileInputRef = useRef(null);

<button onClick={() => fileInputRef.current?.click()} disabled={importing}>
  <Upload /> {importing ? "Importing..." : "Import"}
</button>
<input ref={fileInputRef} type="file" accept=".xlsx" className="hidden"
  onChange={handleImport} />
```

### Handler functions (inside BulkEditor component):
```js
const handleExportAll = async () => {
  setShowExportMenu(false);
  setExporting(true);
  try {
    const res = await menuService.bulkExport('all');
    const url = res.data?.download_url;
    if (url) window.open(url, '_blank');
    else toast({ title: "Error", description: "No download URL received." });
  } catch (err) {
    toast({ title: "Error", description: "Export failed." });
  } finally { setExporting(false); }
};

const handleExportTemplate = async () => {
  setShowExportMenu(false);
  setExporting(true);
  try {
    const res = await menuService.exportSample();
    const url = res.data?.download_url;
    if (url) window.open(url, '_blank');
    else toast({ title: "Error", description: "No download URL received." });
  } catch (err) {
    toast({ title: "Error", description: "Template download failed." });
  } finally { setExporting(false); }
};

const handleImport = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = ''; // reset for re-upload
  setImporting(true);
  try {
    const res = await menuService.bulkImport(file);
    const d = res.data;
    const imported = (d.normal_food?.imported || 0) + (d.aggregator_food?.imported || 0);
    const updated = (d.normal_food?.updated || 0) + (d.aggregator_food?.updated || 0);
    toast({ title: "Import Complete", description: `${imported} new, ${updated} updated (${d.total} total)` });
    onRefresh();
  } catch (err) {
    toast({ title: "Error", description: err?.response?.data?.message || "Import failed." });
  } finally { setImporting(false); }
};
```

### Click-outside for export dropdown:
Add to existing useEffect or new one:
```js
if (exportRef.current && !exportRef.current.contains(e.target)) setShowExportMenu(false);
```

---

## Summary

| File | Change | Lines |
|------|--------|-------|
| `menuManagementService.js` | +3 functions after reorder section | ~15 |
| `BulkEditor.jsx` | +3 state vars, +1 ref, +3 handlers, replace 2 buttons | ~45 |

**Risk:** ZERO on existing grid. Buttons are isolated from grid logic.

---

*End of Implementation Plan — Gate 3 Complete. Ready for implementation.*
