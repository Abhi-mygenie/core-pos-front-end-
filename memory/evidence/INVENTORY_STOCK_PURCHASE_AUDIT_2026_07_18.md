# Investigation Report — Inventory Stock + Purchase Screen Audit

**Date:** 2026-07-18
**Agent Role:** INVESTIGATION
**Steps Used:** 10/10
**Focus:** UX gaps, broken features, proposed fixes

---

# STOCK DASHBOARD SCREEN

## ISSUE S1: Excel Export NOT WORKING — BLOCKER

### Root Cause: FE expects blob, backend returns JSON with download_url

**FE code (InventoryDashboardPanel.jsx L65-72):**
```js
const res = await inventoryService.exportStock();
const url = window.URL.createObjectURL(new Blob([res.data]));  // ← WRONG
```

**Service (inventoryService.js L68-69):**
```js
return api.get(INVENTORY_ENDPOINTS.EXPORT_STOCK, { responseType: 'blob' });  // ← WRONG
```

**Backend actually returns (curl-verified):**
```json
{
  "status": true,
  "message": "File generated successfully!",
  "download_url": "https://preprod.mygenie.online/storage/Purchase_List.xlsx",
  "items_exported": 419
}
```

The download_url IS valid (HTTP 200, 19KB xlsx). FE creates a blob from JSON text instead of using the URL.

### Fix:
```js
// inventoryService.js — remove { responseType: 'blob' }
export async function exportStock() {
  return api.get(INVENTORY_ENDPOINTS.EXPORT_STOCK);  // returns JSON, not blob
}

// InventoryDashboardPanel.jsx — use download_url
const handleExport = async () => {
  try {
    const res = await inventoryService.exportStock();
    const downloadUrl = res.data?.download_url;
    if (downloadUrl) {
      window.open(downloadUrl, '_blank');  // direct download from backend URL
      toast.success(`Stock exported (${res.data.items_exported} items)`);
    } else {
      toast.error('No download URL returned');
    }
  } catch { toast.error('Export failed'); }
};
```

**Files:** `inventoryService.js` (1 line), `InventoryDashboardPanel.jsx` (8 lines)
**Severity:** BLOCKER — feature completely broken

---

## ISSUE S2: Filters — WORKING but with UX gaps

### Status: Filters ARE working in code

**Category filter (L57):** `if (categoryFilter && String(item.categoryId) !== categoryFilter) return false;`
**Status filter (L58-60):**
- `low`: `item.isLowStock && quantity > 0`
- `out`: `quantity <= 0`
- `ok`: `!isLowStock && quantity > 0`

**These DO work if data loads correctly.** If the owner sees filters "not working", possible causes:
1. **Category IDs don't match** — `String(item.categoryId)` vs dropdown value type mismatch
2. **`isLowStock` is always false** — backend may not set `is_low_stock` flag (see S4 below)
3. **No visual feedback** when filter is active — no clear button, no "X results" indicator

### UX Gaps:
- No "X results found" counter after filtering
- No "Clear filters" button
- No active filter indicator (user doesn't know a filter is on)

### Fix: Add filter result count + clear button (UX improvement, not a bug)

---

## ISSUE S3: Chips instead of dropdown for Status filter — SUGGESTION

### Current: Native `<select>` dropdown
### Proposed: Chip/pill buttons (like the KPI cards style)

```
[All] [In Stock ●234] [Low Stock ●11] [Out of Stock ●51]
```

Benefits:
- Counts visible at a glance (no need to filter to see)
- One-click toggle (faster than dropdown)
- Matches modern POS UX patterns
- KPI cards already show these numbers — chips would be interactive version

### Implementation estimate: ~30 lines in InventoryDashboardPanel.jsx (replace `<select>` with chip row)

---

## ISSUE S4: How is "Low Stock" defined?

### Answer: Backend flag `is_low_stock` + FE threshold fields

**Backend returns:** `is_low_stock` boolean per stock item (mapped by transform L65: `isLowStock: !!item.is_low_stock`)

**FE also has threshold fields (but doesn't use them for classification):**
- `min_qty_alert` → `minQtyAlert` (transform L63)
- `min_unit_alert` → `minUnitAlert` (transform L64)

**Classification logic (InventoryDashboardPanel.jsx L10-12):**
```js
if (Number(quantity) <= 0) → "Out of Stock"    (red badge)
if (isLowStock)            → "Low Stock"        (amber badge)
else                       → "In Stock"         (green badge)
```

**KEY FINDING:** Low stock is 100% backend-determined via `is_low_stock` flag. FE does NOT compute it from `min_qty_alert`. The `min_qty_alert` and `min_unit_alert` fields exist in the data but are only used in the **update-stock** payload (when user edits stock settings).

**Gap:** If backend doesn't set `is_low_stock` correctly (or doesn't use `min_qty_alert` threshold), the Low Stock filter will always show 0 items. **Need backend confirmation: does `is_low_stock = (quantity <= min_qty_alert)`?**

---

## ISSUE S5: No Error Display on Stock Screen

### Current error handling:
```
L36: } catch { toast.error('Failed to load stock data'); }  ← load
L72: } catch { toast.error('Export failed'); }               ← export
```

**Only 2 error toasts in entire component.** No per-field errors, no inline messages, no retry option.

### Gaps:
1. **Generic messages** — "Failed to load stock data" gives no detail
2. **No backend error parsing** — same issue as employee (doesn't read `err.response.data.errors`)
3. **No retry button** on load failure — user must refresh page
4. **No loading indicator** for export — button doesn't show spinner/disabled state

### Fix: Same pattern as employee fix — parse `err.response.data.errors` or `err.response.data.message`

---

# PURCHASE ENTRY SCREEN

## ISSUE P1: No Error Display — MAJOR

### Current error handling (L120):
```js
toast.error(err?.readableMessage || 'Failed to save purchase');
```

**Same pattern as employee bug** — backend may return structured `errors{}` but FE only reads top-level message.

### Fix: Same pattern — parse `err.response.data.errors` for per-field messages.

---

## ISSUE P2: No Vendor Auto-Suggestion — MAJOR UX GAP

### Current: Plain text `<Input>` field (L138-139)
```jsx
<Input value={vendorName} onChange={e => setVendorName(e.target.value)}
  placeholder="e.g. Kunafabake" />
```

**No typeahead, no dropdown, no suggestions.** User types free text.

### Problem:
- Vendor names can be misspelled → creates duplicate vendors on backend
- No way to select existing vendor → `vendorId: null` always sent (L97)
- Vendor list endpoint EXISTS (`/inventory/get-vendor` — confirmed in previous session)

### Proposed Fix:
Replace `<Input>` with combobox/typeahead that:
1. Loads vendor list from `/inventory/get-vendor` on mount
2. Filters as user types (autocomplete)
3. Shows "Add new vendor" option at bottom if no match
4. Sets both `vendorName` AND `vendorId` when selection made

**Estimated effort:** ~40 lines (combobox component + state changes)

---

## ISSUE P3: Invoice Attachment NOT WORKING — PLACEHOLDER ONLY

### Current (L249-253):
```jsx
{/* Invoice Upload Placeholder */}
<div className="bg-white rounded-xl border border-slate-200 p-4 mb-5 flex items-center gap-3">
  <Paperclip className="w-4 h-4 text-slate-400" />
  <span className="text-sm text-slate-500">Attach Invoice (PDF/Image)</span>
  <Button variant="outline" size="sm" className="ml-auto">Browse</Button>
</div>
```

**The Browse button has NO onClick handler.** No `<input type="file">`, no upload logic, no state, no API call. It's pure visual placeholder.

### Storage: NOT PLANNED YET
- No upload endpoint defined in `constants.js` for purchase invoice
- Backend may need a file upload endpoint (multipart/form-data)
- No cloud storage (S3/Firebase Storage) configured

### What's needed:
1. **Backend endpoint** for invoice upload (or use existing if any)
2. **FE file picker** — hidden `<input type="file" accept=".pdf,.jpg,.png">`
3. **Upload logic** — either attach to purchase payload or upload separately
4. **Preview** — show filename/thumbnail after selection
5. **Storage** — Firebase Storage, S3, or backend file storage

**Owner decision needed:** Where should invoices be stored? Is there a backend endpoint for file upload?

---

## ISSUE P4: Mandatory vs Non-Mandatory Fields

### Current validation (L88-90):
```js
if (!vendorName.trim()) { toast.error('Vendor is required'); return; }
const validItems = computedItems.filter(i => i.ingredientId && Number(i.quantity) > 0);
if (validItems.length === 0) { toast.error('Add at least one line item'); return; }
```

### Field Map:

| Field | Label Shows * | FE Validates | Backend Requires | Mandatory? |
|-------|:---:|:---:|:---:|:---:|
| **Vendor** | YES (*) | ✅ toast error | ✅ | **YES** |
| Purchase Date | NO | ❌ | Unknown | Sent but no FE validation |
| Invoice / Bill No. | NO | ❌ | Unknown | Optional |
| Payment Method | NO | ❌ | Unknown | Optional |
| **Ingredient** (per line) | NO | ✅ (filtered out if empty) | ✅ | **YES** |
| Unit (per line) | NO | ❌ | Unknown | Auto-filled from ingredient |
| **Qty** (per line) | NO | ✅ (filtered out if 0) | ✅ | **YES** |
| Rate (per line) | NO | ❌ | Unknown | Defaults to 0.00 |
| Amount | Auto-calc | N/A | N/A | Auto: qty × rate |
| Batch | NO | ❌ | Unknown | Optional |
| Expiry | NO | ❌ | Unknown | Optional |

### Gaps:
1. **No red * on mandatory line item fields** (Ingredient, Qty)
2. **No validation on Rate** — user can submit rate=0 (free purchase?)
3. **Payment Method** — no validation but probably should be required for accounting
4. **No visual indication** which fields are required vs optional
5. **No inline validation** — errors only show on submit attempt

### Recommended fixes:
- Add red * to: Vendor ✅ (already has), Ingredient, Qty, Rate
- Add validation: Rate > 0 ("Rate is required"), Payment Method non-empty
- Inline red border on invalid fields (same pattern as employee fix)

---

# UX IMPROVEMENT SUGGESTIONS (Priority Ordered)

| # | Screen | Suggestion | Impact | Effort |
|---|--------|-----------|--------|--------|
| 1 | Stock | **Fix Excel export** — use download_url instead of blob | BLOCKER fix | ~10 lines |
| 2 | Purchase | **Vendor typeahead** — autocomplete from vendor list API | HIGH — prevents duplicates | ~40 lines |
| 3 | Both | **Surface backend errors** per-field (same as employee fix) | HIGH — user sees what's wrong | ~15 lines each |
| 4 | Stock | **Status chips** instead of dropdown (with counts) | MEDIUM — visual clarity | ~30 lines |
| 5 | Purchase | **Mandatory field indicators** — red * on Ingredient/Qty/Rate | MEDIUM — clarity | ~10 lines |
| 6 | Stock | **Filter result count** + clear button | LOW — nice to have | ~10 lines |
| 7 | Stock | **Low stock definition** — confirm backend uses min_qty_alert | LOW — may already work | Backend check |
| 8 | Purchase | **Invoice upload** — needs backend endpoint first | LOW — blocked | Backend + ~50 lines |
| 9 | Purchase | **Rate > 0 validation** | LOW — edge case | ~3 lines |
| 10 | Both | **Loading/retry states** — spinner on export, retry on load fail | LOW — polish | ~15 lines |

---

## Open Questions

| # | Question |
|---|----------|
| OQ-1 | Does backend set `is_low_stock` based on `min_qty_alert` threshold? If not, what triggers it? |
| OQ-2 | Is there a backend endpoint for invoice file upload? If not, where should files be stored? |
| OQ-3 | Should Payment Method be mandatory on purchase entry? |
| OQ-4 | Should Rate > 0 be enforced, or can a purchase have ₹0 rate (e.g., free sample)? |

---

## Report
`/app/memory/evidence/INVENTORY_STOCK_PURCHASE_AUDIT_2026_07_18.md`
