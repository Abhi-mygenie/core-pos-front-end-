# BUG-164 / BUG-165 / BUG-203 — Bundle Implementation Plan (Gate 3)

**Date:** 2026-07-24
**Impact Analyses:**
- `impact/BUG_164_IMPACT_ANALYSIS.md` (Gate 2 ✅)
- `impact/BUG_165_IMPACT_ANALYSIS.md` (Gate 2 ✅)
- `impact/BUG_203_IMPACT_ANALYSIS.md` (Gate 2 ✅)
**Code Reality:** PARTIAL — All 3 have FE workarounds. Backend now returns proper HTTP status codes. FE can simplify.
**Conflict Pre-Check:** ExpenseSetupPanel last modified by CR-074-B (2026-07-17). No active CR targets the same functions.
**Risk:** LOW (all 3 are simplification of existing workarounds, no new logic)
**Scope Lock:** 2 files WILL change, all others WILL NOT touch

---

## Verification Matrix

| Edit # | Bug | File | Change Description | How to Verify | Automated? |
|--------|-----|------|--------------------|---------------|:---:|
| 1 | BUG-164 | `ExpenseSetupPanel.jsx:~236` | Remove `res.data.errors[0]` workaround in `addCategory()`, rely on HTTP 409 catch | Browser: add duplicate category → toast "already exists" | NO |
| 2 | BUG-165 | `ExpenseSetupPanel.jsx:~353 catch` | Surface `err.readableMessage` in addItem catch block | Browser: add duplicate item (bypassing client guard) → toast shows backend message | NO |
| 3 | BUG-203 | `expenseService.js:~111` | Extend `updateExpenseItem()` to accept + pass `unit_price` | Code inspection: PUT body includes unit_price | NO |
| 4 | BUG-203 | `ExpenseSetupPanel.jsx:~619-660` | Merge 2-call into 1-call (PUT with unit_price, remove separate price call) | Browser: edit item price → 1 network call instead of 2 | NO |

---

## Edits (Execution Sequence)

### Edit 1 (BUG-164): `ExpenseSetupPanel.jsx` — Simplify `addCategory()`

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Line:** ~L233-242 (inside `addCategory` try block)
**Current:**
```js
      const res = await expenseService.createEmptyCategory(name);
      // Axios never throws for 2xx — must inspect res.data.errors manually.
      if (res?.data?.errors?.[0]) {
        const msg = res.data.errors[0].message || "This category already exists.";
        toast({ title: "Duplicate", description: msg, variant: "destructive" });
        // ...
        return;
      }
```
**New:**
```js
      // BUG-164: Backend now returns HTTP 409 for duplicates (was 201+errors body).
      // Axios throws on 4xx — catch block handles it. No need for body inspection.
      const res = await expenseService.createEmptyCategory(name);
```

The existing `catch (err)` block at the bottom of `addCategory` already exists. Ensure it surfaces the message:
**Check catch block:** If it doesn't already show `err.readableMessage`, add:
```js
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to create category", variant: "destructive" }); // BUG-164
    }
```

### Edit 2 (BUG-165): `ExpenseSetupPanel.jsx` — Surface backend message in `addItem` catch

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Line:** Inside `addItem` catch block (after the existing client-side guard)
**Current:** The catch block may not surface `err.readableMessage` for the 422 case.
**New:** Ensure catch surfaces backend message:
```js
    } catch (err) {
      toast({ title: "Error", description: err.readableMessage || "Failed to add item", variant: "destructive" }); // BUG-165: surface 422 message
    }
```

**Note:** The client-side guard (case-insensitive name check) remains as fast UX — prevents unnecessary API call. The 422 catch is a safety net for edge cases the client guard misses.

### Edit 3 (BUG-203): `api/services/expenseService.js` — Extend `updateExpenseItem`

**File:** `api/services/expenseService.js`
**Line:** L111-112
**Current:**
```js
export const updateExpenseItem = (itemId, { stock_title, category_id }) =>
  api.put(`${EXPENSE_ENDPOINTS.STOCK_ITEM_UPDATE}/${itemId}`, { stock_title, category_id });
```
**New:**
```js
// BUG-203: Backend now accepts unit_price on PUT (was ignored before fix).
export const updateExpenseItem = (itemId, { stock_title, category_id, unit_price }) => {
  const body = { stock_title, category_id };
  if (unit_price != null) body.unit_price = unit_price; // BUG-203: include when provided
  return api.put(`${EXPENSE_ENDPOINTS.STOCK_ITEM_UPDATE}/${itemId}`, body);
};
```

### Edit 4 (BUG-203): `ExpenseSetupPanel.jsx` — Merge inline edit to single PUT call

**File:** `components/expense/ExpenseSetupPanel.jsx`
**Line:** ~L619-660 (inline edit save handler)
**Current:** 2-call sequence:
```js
      const res = await expenseService.updateExpenseItem(editingItemId, {
        stock_title: trimmedName,
        category_id: targetCatId,
      });
      // ... success handling ...
      // BUG-203: 2-call workaround — update unit price if changed
      const newPrice = editItemPrice ? parseFloat(editItemPrice) : null;
      const origPrice = originalItem?.unitPriceAmount ?? null;
      const priceChanged = origPrice !== newPrice;
      if (priceChanged && newPrice != null && newPrice > 0) {
        try {
          const priceRow = pricedItems.find(p => String(p.stockId) === String(editingItemId));
          if (priceRow) {
            await expenseService.editUnitPrice(priceRow.id, newPrice);
          } else {
            await expenseService.addUnitPrice(editingItemId, 1, newPrice);
          }
          // ... price state update + refresh ...
        } catch (priceErr) { ... }
      }
```

**New:** Single PUT call:
```js
      // BUG-203: Single PUT with unit_price (backend now accepts it)
      const newPrice = editItemPrice ? parseFloat(editItemPrice) : null;
      const res = await expenseService.updateExpenseItem(editingItemId, {
        stock_title: trimmedName,
        category_id: targetCatId,
        unit_price: newPrice,  // BUG-203: included in single call
      });
      // ... existing success handling (fromAPI.updatedItem, setAllItems, toast) ...
      // BUG-203: Update local price state after successful single PUT
      if (newPrice != null && newPrice > 0) {
        setAllItems(prev => prev.map(i => i.id === editingItemId
          ? { ...i, unitPrice: true, unitPriceAmount: newPrice }
          : i));
        const pricesRefresh = await expenseService.getUnitPrices();
        setPricedItems(fromAPI.unitPrices(pricesRefresh));
      }
```

Remove the inner `try/catch` for the separate price call — it's now part of the main PUT.

---

## Design Decisions (Locked)

| # | Decision | Choice | Rationale |
|---|----------|--------|-----------|
| 1 | Keep BUG-165 client-side guard | YES | Fast UX — no round-trip for obvious duplicates. 422 is safety net. |
| 2 | Remove BUG-164 body inspection | YES | Backend returns 409 → Axios throws → catch handles. Body inspection dead code. |
| 3 | `unit_price` conditional in PUT body | Only include when non-null | Backwards-compatible — omitting field means "don't change price" |
| 4 | Remove `editUnitPrice`/`addUnitPrice` from ExpenseSetupPanel edit flow | YES — from inline edit only | These functions may still be used by quick-add flow (CR-064). Don't delete from service. |

---

## Scope Lock

**Files WILL change:**
- `components/expense/ExpenseSetupPanel.jsx` (3 edits: BUG-164 L236, BUG-165 catch, BUG-203 L619-660)
- `api/services/expenseService.js` (1 edit: extend `updateExpenseItem` signature)

**Files WILL NOT touch:**
- constants.js, expenseTransform.js, ExpenseEntryPanel.jsx, ExpenseReportPage.jsx, expenseReportService.js

## Post-Code Registry Checklist

- [ ] registry.json: BUG-164, BUG-165, BUG-203 → status: IMPLEMENTED, sprint_key: pos_5_0
- [ ] BUG_TRACKER.md: rows updated
- [ ] FILE_OWNERSHIP.md: add ExpenseSetupPanel.jsx, expenseService.js with BUG-164/165/203
- [ ] Code markers: // BUG-164, // BUG-165, // BUG-203 comments in every modified file

---

**Next:** Gate 4 GO → Implementation
