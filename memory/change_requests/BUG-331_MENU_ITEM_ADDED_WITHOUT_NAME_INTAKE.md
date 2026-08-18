# BUG-331 — Menu Item Can Be Added Without Item Name

**Type:** Bug
**ID:** BUG-331
**Date:** 2026-08-17
**Status:** INTAKE COMPLETE — awaiting Gate 2 (Planning)

---

## Description

A menu item (product) can be saved/added without entering an item name. The Name field in `ProductForm` shows a red asterisk (marked `required` visually) but there is **no client-side validation guard** before the API call. The form submits with an empty `productName`, resulting in a nameless menu item being created in the system.

## Classification

| Field | Value |
|---|---|
| Type | BUG |
| Area | Menu Management → Add Product / Edit Product |
| Priority | P1 |
| Severity | HIGH — data integrity issue; nameless menu items cause display/ordering problems and are hard to recover from |
| Risk | HIGH (data mutation — creates corrupt menu data in backend) |
| Fast Lane | POSSIBLE (1 guard line in ProductForm.jsx) — needs owner FAST LANE APPROVED |

## Evidence

- Source: OWNER-REPORTED
- Steps to reproduce:
  1. Open Menu Management → Add Product
  2. Leave Name field empty
  3. Fill in price and category, click Save
  4. Item is saved without a name
- Confidence: CONFIRMED (code inspection)

## Code Reality Check

```bash
# ProductForm.jsx line 317:
  <InputField label="Name" value={form.productName} onChange={(v) => update("productName", v)} required />
  # Shows red asterisk but NO submit guard

# Line 542 — add-on name HAS a guard (correct pattern):
  if (!newAddonName.trim() || !newAddonPrice) return;

# handleSave / onSave — NO equivalent guard for productName:
  # No: if (!form.productName.trim()) return toast(...)
  # The form proceeds to API call with empty productName
```

- **Code reality: FULL** — bug is confirmed; the fix pattern exists in the same file (addon guard)
- Primary file: `src/components/panels/menu/ProductForm.jsx`
- Secondary: `src/components/panels/menu/BulkEditor.jsx` (check if bulk editor also allows nameless save)

## Blast Radius

- Primary: 1 guard line in `ProductForm.jsx`
- Secondary check: `BulkEditor.jsx` may also need validation (row save with empty productName)
- Estimated scope: SMALL (1-2 files, ~3-5 lines)

## Expected Behavior

- Clicking Save with an empty Name field should:
  1. Prevent the API call
  2. Show a toast: `"Item name is required"`
  3. Focus/highlight the Name field
- Mirrors the existing add-on name guard pattern in the same file

## Owner Decisions Needed

None — fix is clear from existing patterns in the same file.

## Duplicate Check

DISTINCT — no prior BUG references nameless menu item validation.

---

**Next:** Planning Gate 2 — Fast Lane eligible (1 guard, 1 file) — needs owner `FAST LANE APPROVED`
