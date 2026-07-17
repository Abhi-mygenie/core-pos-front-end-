# CR-064 Curl Verification — Unit Price on Item Create (2026-07-17)

**Purpose:** Validate backend contract for CR-064 (unit-price field on quick-add row) and understand historical Bulk Editor unit-price restrictions.

---

## 🚨 Historical Issue Found (source of owner's memory)

`ExpenseBulkEditor.jsx:174-190` documents two hardcoded restrictions:

```js
// OQ-1 = B: block rename — backend endpoint pending (CR-065)
if (titleChanged) { failed++; ... "Rename not available — backend support pending"; return; }

// OQ-2 = B: block category move if item has a unit price
if (catChanged && row._original.unitPriceAmount) {
  failed++; ... "Cannot move — unit price is set. Remove unit price first."; return;
}
```

**Root cause:** The DnD workflow uses `DELETE item → POST re-create in new category`. Because the unit_price cascade-deletes on item delete (verified below), moving a priced item this way loses its price. So CR-067 defensively **blocks category moves for priced items** in the bulk editor.

**Resolution path (already in flight):** BUG-202 backend brief requests `PUT /expense/stock-items/{id}` — once delivered, category-change becomes a real update (no delete+recreate), unit_price survives, and OQ-2's restriction can be removed.

---

## Curl Findings (2026-07-17)

### Finding 1 — `unit_price` inline on POST /store_expense is silently IGNORED
```
POST /api/v2/vendoremployee/expense/store_expense
Body: { "category_name":"grocery", "stock_title":["CURL_UP1_inline"], "unit_price":5.5, "quantity":1 }

→ HTTP 200 → item created (id=4594)
→ Response says: "unit_price": false, "unit_price_amount": null
→ /stock-unit-prices list does NOT contain the new item
```
**Conclusion:** Backend does NOT currently support inline unit_price on item creation.

### Finding 2 — Two-call sequence works
```
Step A: POST /store_expense { category_name, stock_title[] } → created item id=4595
Step B: POST /stock-unit-price { stock_id, quantity, price }  → HTTP 201, price row created
Verify: /stock-unit-prices lists it → PASS
```
**Conclusion:** CR-064 can ship using a two-call pattern.

### Finding 3 — Unit price CASCADE-DELETES with item
```
DELETE /expense/expenses/4595 → HTTP 200 "Expense deleted."
→ /stock-unit-prices: unit_price row for stock_id=4595 also gone (cascaded)
```
**Conclusion:** No orphan risk. But this is exactly why the DnD move-with-price problem exists — cascade takes the price with it.

---

## Implications for CR-074-B

| Aspect | Impact |
|---|---|
| CR-064 quick-add "unit price" input | **Must use 2-call sequence** (create item → set price). Handle mid-sequence failure: if step A succeeds but step B fails, show a toast "Item created but price save failed — set it in Unit Prices tab." |
| Bulk-select **Move to Category** action on priced items | Same trap as CR-067's OQ-2 restriction. Until BUG-202 lands, moving a priced item destroys its price. **Option:** show a warning modal listing which selected items are priced, and require explicit acknowledgment before proceeding. |
| Inline "change category" on a single row (BUG-202 UI) | Only safe once BUG-202 PUT endpoint delivers. **Design should ship inline-edit UI behind a feature flag** until backend is ready. |
| Frontend rename via bulk editor | Still blocked pending BUG-202. Same feature-flag pattern. |

---

## Options for CR-064 Implementation

### Option A — Ship two-call sequence now (recommended)
- Simple: `createCategoryWithItems(cat, [name]) → then addUnitPrice(newId, 1, price)`
- Risk: mid-sequence failure orphans an item without a price. Recoverable via Unit Prices tab.
- Ship blocker: none.

### Option B — Request backend enhancement for inline unit_price on POST /store_expense
- Cleaner UX. Atomic operation.
- Ship blocker: backend delivery. Add to BACKEND_BRIEF_BUG202 as a nice-to-have OR file separately.

**My recommendation:** Ship Option A immediately (works today), file a follow-up ask for Option B as an optional backend enhancement.

---

## Preprod cleanup
- Item 4594 (CURL_UP1_inline) — deleted
- Item 4595 (CURL_UP2_twocall) + its unit_price row — deleted (cascaded)
- Verified final report today: clean.

---

## Owner Rulings (2026-07-17)

| ID | Question | Ruling |
|---|---|---|
| **Q-CR064-1** | CR-064 quick-add: two-call sequence (A) vs backend inline (B) | ✅ **A** — two-call sequence, ship now |
| **Q-CR064-2** | Bulk "Move to Category" with priced items: (a) block / (b) warn+proceed / (c) defer | ✅ **(c) DEFER** — hide `[Move to Category ▼]` bulk action from selection banner until BUG-202 delivers. Selection banner ships with only `[Delete Selected]` + `[Clear]`. |
| **Q-CR064-3** | Add optional inline unit_price to BACKEND_BRIEF_BUG202 §3.4 | ✅ **YES** — added to brief as OPTIONAL nice-to-have |
