# BUG-608 — Impact Analysis (Gate 2)

**ID:** BUG-608
**Date:** 2026-10-22
**Code Reality:** PARTIAL — lock condition exists but appears correctly scoped
**Risk:** HIGH (financial — GST configuration)
**Conflict Pre-Check:** CLEAN

---

## 1. Summary

Owner reports GST fields cannot be edited in Menu Management for a new restaurant. Investigation of the code reveals:

### ProductForm.jsx (L440-462)

The GST lock is **correctly conditional** on `menuType === 'Aggregator'`:

```jsx
{menuType === 'Aggregator' ? (
  // LOCKED: shows static "GST 5% (mandatory)" text
) : (
  // EDITABLE: SelectField for tax type + InputField for tax %
)}
```

For **Normal** menu items, L456-461 renders fully editable GST fields (SelectField + InputField). The BUG-391 lock does NOT bleed into Normal items.

### BulkEditor.jsx

Tax fields are also rendered based on menu type (L80: `menuType === 'Aggregator'` adds extra columns). The tax type and percentage columns are editable for Normal items.

### Possible Real Causes

Since the code correctly gates on `menuType`, the issue may be:

| # | Hypothesis | Likelihood |
|---|-----------|:---:|
| H-1 | New restaurant opens menu management → defaults to Aggregator tab (wrong tab) → sees locked GST | Medium |
| H-2 | Restaurant's `gstStatus` flag is `false` → BulkEditor validation rule (L220: `gstRequired = restaurant?.tax?.gstStatus === true`) shows validation error, user interprets as "locked" | Medium |
| H-3 | A different UI element (not ProductForm) is blocking GST — e.g. a settings page where GST is enabled/disabled at restaurant level | Medium |
| H-4 | Browser/device-specific rendering issue making the input appear uneditable | Low |

## 2. Open Decisions (still blocking)

| ID | Question | Impact |
|---|---------|--------|
| OD-608-01 | Is this for **all** items or only during initial setup? | Determines if it's a one-time config issue or systemic |
| OD-608-02 | Is the field **visually disabled** (greyed out) or does it **accept input but not save**? | Distinguishes FE render bug from backend save bug |
| OD-608-03 | Is the user on the **Normal** or **Aggregator** tab when they see this? | If Aggregator → by design (BUG-391). If Normal → real bug. |

## 3. Recommendation

**Cannot proceed to Gate 3 without OD-608-02 and OD-608-03.** The code appears correct for Normal items. If the owner is on the Aggregator tab, the lock is intentional. A screenshot from the owner showing the exact screen would resolve this immediately.

## 4. Files Affected (pending owner input)

| File | Potential Change |
|------|-----------------|
| `ProductForm.jsx` | Only if H-1/H-2 confirmed — possibly default tab selection or validation messaging |
| `BulkEditor.jsx` | Only if H-2 confirmed — validation error messaging |

**Files WILL NOT touch:** `menuManagementService.js`, `orderTransform.js`, any payment/report file.

## 5. Scope Lock

Pending OD-608-02 and OD-608-03. Estimated: 1-2 files, small scope.
