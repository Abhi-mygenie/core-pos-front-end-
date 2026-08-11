# Impact Analysis + Implementation Plan — BUG-135-C + BUG-147

**Date:** 2026-07-11
**Agent:** PLANNING (Gate 2 + Gate 3)
**Code Reality:** NONE (0 markers for both)
**Conflict Pre-Check:** SAFE — BUG-172/173/174 are ExpenseBulkEditor (different file)

---

## BUG-135-C: Bulk Editor — Error not visible for ≤3 failures

### Root Cause
`BulkEditor.jsx` L520-531: Two branches for failure display:
- ≤3 failures → toast says "Hover red rows to see why" (error text ONLY in icon tooltip)
- \>3 failures → toast has [View errors] button → opens dialog with error text

For 1-3 failures, user must hover a 12px ⚠ icon to see "food already exists". No modal, no visible text.

### Recommended Fix: Always show errors drawer for ANY failure count

**File:** `components/panels/menu/BulkEditor.jsx`

| Line | Current | New |
|------|---------|-----|
| L520-531 | Two branches: `if (failed > 0 && failed <= 3)` generic toast, `else if (failed > 3)` drawer toast | Single branch: `if (failed > 0)` → always show drawer toast with [View errors] button |

**Exact edit:**
```
// Replace L520-531:
if (failed > 0) {
  // BUG-135-C: always show errors drawer — no more hidden tooltip-only path
  toast({
    title: "Partial Save",
    description: `${saved} saved, ${failed} failed.`,
    action: (
      <ToastAction altText="View errors" onClick={() => setShowErrors(true)} data-testid="view-errors-toast-btn">
        View errors
      </ToastAction>
    ),
  });
}
```

**Risk:** LOW — removes a UI branch, makes behavior consistent. Drawer dialog already exists and works.

---

## BUG-147: Duplicate item error toast missing item name

### Root Cause
Backend returns `{"errors":[{"code":"duplicate","message":"food already exists"}]}` — no item name in the message. The FE correctly extracts `"food already exists"` but cannot add the item name because backend doesn't include it.

### Fix locations (3 surfaces):

**Surface 1: BulkEditor.jsx — row error display (L508)**
The `_saveError` field stores `err.readableMessage = "food already exists"`. The row's `productName` is available. Prefix the item name.

| Line | Current | New |
|------|---------|-----|
| L508 | `_saveError: err.readableMessage` | `_saveError: \`${row.productName}: ${err.readableMessage}\`` |

**Surface 2: AddCustomItemModal.jsx — inline error (L78)**
The item `name` is available in scope. Prefix it.

| Line | Current | New |
|------|---------|-----|
| L78 | `setError(err.readableMessage \|\| ...)` | `setError(\`"${name.trim()}": ${err.readableMessage \|\| 'Failed to add item.'}\`)` |

**Surface 3: ProductForm.jsx — toast error (L531)**
The `form.name` or `product.name` is available. Prefix it.

| Line | Current | New |
|------|---------|-----|
| L531 | `toast({ title: "Error", description: err.readableMessage, variant: "destructive" })` | `toast({ title: "Error", description: \`"${form.name \|\| product?.name \|\| 'Item'}": ${err.readableMessage}\`, variant: "destructive" })` |

**Risk:** LOW — string formatting only. No logic change.

---

## Verification Matrix

| Edit | ID | File | Change | How to Verify |
|------|-----|------|--------|---------------|
| 1 | BUG-135-C | BulkEditor.jsx L520-531 | Merge two branches → always show drawer | Add duplicate item in bulk editor → [View errors] button in toast → dialog shows "food already exists" |
| 2 | BUG-147 | BulkEditor.jsx L508 | Prefix item name on _saveError | Error drawer shows "Rum: food already exists" (not just "food already exists") |
| 3 | BUG-147 | AddCustomItemModal.jsx L78 | Prefix item name on error | Inline error shows '"Rum": food already exists' |
| 4 | BUG-147 | ProductForm.jsx L531 | Prefix item name on toast | Toast shows '"Rum": food already exists' |

## Post-Code Registry Checklist
- [ ] registry.json: BUG-135 + BUG-147 → IMPLEMENTED
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: 3 files listed
- [ ] Code markers: // BUG-135-C, // BUG-147
- [ ] Compile check: 0 new warnings

---

## Summary

| ID | Files | Lines | Risk |
|----|:-----:|:-----:|------|
| BUG-135-C | 1 (BulkEditor) | ~8 (replace 12 with 8) | LOW |
| BUG-147 | 3 (BulkEditor + AddCustomItemModal + ProductForm) | 3 (1 per file) | LOW |
| **Total** | **3 files** | **~11 lines** | **LOW** |
