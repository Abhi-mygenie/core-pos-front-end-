# BUG-121 — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-09

---

## BUG-121-A — Category Item Count Always Shows 0

### Root Cause
The `GET /product/categories` API does NOT return `products_count` or `item_count`. The field doesn't exist in the response. Transform maps `c.products_count ?? c.item_count ?? 0` → always 0.

### Fix
Derive item counts from the `foods` array (already loaded in `MenuManagementPanel`) by counting foods per `category.id`. Pass enriched categories to `CategoryList`.

### Code Changes

**File: `MenuManagementPanel.jsx`**

1. Create a derived `categoriesWithCounts` that merges API categories with food counts:

```js
// After foods and categories are loaded, derive counts
const categoriesWithCounts = useMemo(() => {
  const countMap = {};
  foods.forEach((f) => {
    const cid = f.categoryId;
    if (cid) countMap[cid] = (countMap[cid] || 0) + 1;
  });
  return categories.map((c) => ({
    ...c,
    itemCount: countMap[c.categoryId] || 0,
  }));
}, [categories, foods]);
```

2. Pass `categoriesWithCounts` instead of `categories` to `CategoryList`, `ProductList`, and `BulkEditor`:

```diff
- <CategoryList categories={categories} .../>
+ <CategoryList categories={categoriesWithCounts} .../>

- <ProductList categories={categories} .../>
+ <ProductList categories={categoriesWithCounts} .../>

- <BulkEditor categories={categories} .../>
+ <BulkEditor categories={categoriesWithCounts} .../>
```

**No changes to `CategoryList.jsx`** — it already reads `c.itemCount` (line 22: `totalItems = cats.reduce((sum, c) => sum + (c.itemCount || 0), 0)`).

### Risk: LOW — pure derived data, no API change.

---

## BUG-121-B — Product List Not Refreshing After Add/Edit

### Root Cause
`onSave` at ProductList line 147-149 calls `onRefresh()` which is `fetchFoods`. This calls the API immediately after save. Possible race: backend hasn't committed the new item yet when the re-fetch fires. Adding a small delay should fix it.

### Code Changes

**File: `ProductList.jsx` line 147-149**

```diff
  onSave={() => {
    setEditingProduct(null);
-   onRefresh();
+   setTimeout(() => onRefresh(), 500);
  }}
```

Same pattern for quick edit save and any other `onRefresh()` calls after writes.

### Risk: LOW — 500ms delay before refetch.

---

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `MenuManagementPanel.jsx` | Add `useMemo` for `categoriesWithCounts`, pass to children | ~8 lines |
| `ProductList.jsx` | Add 500ms delay on `onRefresh()` after save | ~3 lines |

---

*End of Implementation Plan — Gate 3 Complete.*
