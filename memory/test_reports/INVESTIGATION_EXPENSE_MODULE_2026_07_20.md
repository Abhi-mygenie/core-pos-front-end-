# Investigation Report — Expense Module Issues (5 items)

**Date:** 2026-07-20
**Role:** INVESTIGATION
**Sprint:** POS 5.0
**Steps used:** 8/10

---

## Issue 1: Bulk Edit — Price change shows "Saved" but doesn't persist

### Summary
Root cause: **CODE_ERROR** — `expenses-list` API returns `unit_price_amount: None` for all items. After bulk save triggers `onRefresh → fetchAll()`, parent re-fetches items from API → `unitPriceAmount: null` → BulkEditor `useEffect` rebuilds rows → price reverts to null.
Confidence: **HIGH** (API probed, code traced)

### Data Flow Trace
1. User changes price in BulkEditor → `updateRow(rowId, "unitPriceAmount", 50000)`
2. `handleSave()` → price-only path (lines 399-424) → `editUnitPrice(priceRow.id, 50000)` ← **API call succeeds**
3. Toast: "Saved" ✅
4. Line 527: `onRefresh()` fires after 500ms
5. Parent `fetchAll()` → `getExpenseItems()` → API returns `unit_price_amount: None` for ALL items
6. `setAllItems(fromAPI.expenseItems(res))` → all items get `unitPriceAmount: null`
7. BulkEditor `useEffect` (line 51-53): `setRows(items.map(r => buildRow(r)))` → **all prices reset to null**

### Evidence
```
API Probe: GET /expenses-list
id=1118 title=10000 unit_price_amount=None
id=999  title=11000 unit_price_amount=None
id=980  title=12000 unit_price_amount=None
```
Backend does NOT return `unit_price_amount` on the expenses-list endpoint.

### Fix Recommendation (FE_FIX)
In `ExpenseSetupPanel.fetchAll()`, after fetching both datasets, cross-join `pricedItems` onto `allItems`:
```js
// After setting allItems and pricedItems:
const priceMap = new Map(pricedItems.map(p => [String(p.stockId), p.price]));
setAllItems(prev => prev.map(item => ({
  ...item,
  unitPriceAmount: priceMap.get(String(item.id)) ?? item.unitPriceAmount ?? null,
  unitPrice: priceMap.has(String(item.id)),
})));
```
**Scope:** ~5 lines in `ExpenseSetupPanel.jsx`, `fetchAll()` function.

### Secondary Bug (same root cause)
The BulkEditor also can't REMOVE a price (set to null/0). Lines 402, 485:
```js
if (priceChanged && row.unitPriceAmount != null && row.unitPriceAmount > 0)
```
Clearing price (→ null or 0) skips the API call but counts as "saved". Fix: add an else branch that calls `deleteUnitPrice()` when price is cleared and a `priceRow` exists.

---

## Issue 2: Can't remove price from Unit Prices tab

### Summary
Root cause: **UX_GAP** — User expects clearing the price field (edit mode) to remove the price. Code blocks this intentionally — `handleEditPrice()` returns early when price is empty/0 (line 856). The DELETE button (trash icon) IS the intended way to remove prices.
Confidence: **HIGH** (code traced)

### Code Trace
```js
// Line 854-856: handleEditPrice
const price = parseFloat(editPriceAmount);
if (!price || price <= 0) return;   // ← early return, nothing happens
```
The ✓ confirm button also has `disabled={!editPriceAmount || parseFloat(editPriceAmount) <= 0}` (line 1600) — so it's grayed out but may not be visually obvious enough.

### Fix Recommendation
This is **working as designed** — the trash button removes prices. However, consider:
- Making the disabled state of ✓ button more visually distinct
- Adding a tooltip: "To remove this price, use the delete (🗑) button"
- OR: allow empty → trigger `deleteUnitPrice()` flow

**Scope:** UX enhancement, not a code bug. ~3 lines if adding tooltip.

---

## Issue 3: Error "Unit price is required" in Stock Master

### Summary
Root cause: **WORKING AS DESIGNED** — When editing an item in Stock Master that already has a unit price, clearing the price field triggers validation (line 565-566):
```js
if (originalItem?.unitPrice && (!editItemPrice || parseFloat(editItemPrice) <= 0)) {
  setEditError("Unit price is required. To remove price, use the Unit Prices tab.");
}
```
This directs users to the Unit Prices tab → trash button for removal.

### UX Circle Problem
SS1 error says "use the Unit Prices tab" → SS3 shows user on Unit Prices tab but can't figure out how to remove (Issue 2). The real issue is discoverability of the trash button.

### Fix Recommendation
Improve the error message to be more specific:
```
"To remove this price, go to Unit Prices tab and click the 🗑 delete button next to the item."
```
**Scope:** 1 line text change.

---

## Issue 4: Partial payment (half Cash, half UPI)

### Summary
Root cause: **BACKEND SUPPORTS IT** — API probe confirmed multi-line expenses with different payment methods are accepted.
Confidence: **HIGH** (API probed successfully)

### Evidence
```bash
POST /store-expense-details with 2 detail lines:
  Line 1: APPLE, ₹1, UPI
  Line 2: APPLE, ₹1, Cash
→ Response: 200 OK, id=9903, both lines stored ✅
```
Backend accepts multiple detail lines per expense entry, each with its own `payment_method`. This enables split/partial payments.

### Current FE Limitation
The `ExpenseEntryPanel` allows multiple lines (each line = 1 item + 1 payment method). But there's no explicit "split payment" UX. Users CAN achieve partial payment today by adding the same item twice with different amounts and payment methods — but this isn't obvious.

### Fix Recommendation (FE CR — new feature)
Add a "Split Payment" button per line item that:
1. Duplicates the line with remaining amount
2. Lets user pick different payment method for each part
3. Auto-calculates remaining: if original = ₹1000, user pays ₹500 Cash → second line auto-fills ₹500 + allows UPI/Card selection

**Scope:** New UX feature, ~50-80 lines. Register as separate CR.

---

## Issue 5: Optional fields — Paid To, Payment Reference ID

### Summary
Root cause: **BACKEND STATUS UNKNOWN** — API probe showed `paid_to` and `payment_reference_id` fields were sent but NOT returned in the response. Backend either ignores or silently discards them.
Confidence: **MEDIUM** (sent but not returned — need backend confirmation)

### Evidence
```
POST /store-expense-details with paid_to="Test Vendor", payment_reference_id="REF-001"
→ Response: 200 OK — fields NOT present in response body
```
The backend accepted the request without error but didn't echo the fields back. Need backend team to confirm:
1. Are these fields stored in the database?
2. Are they returned on GET /expenses-report?
3. If not stored, can they be added?

### Suggested Optional Fields
Based on standard expense management:
| Field | Purpose | Priority |
|---|---|---|
| `paid_to` | Vendor/payee name | P1 — critical for audit trail |
| `payment_reference_id` | UPI ref / cheque no / transaction ID | P1 — reconciliation |
| `receipt_image_url` | Photo of receipt/bill | P2 — proof of payment |
| `approved_by` | Manager who approved the expense | P2 — approval workflow |
| `invoice_number` | Vendor invoice reference | P3 — bookkeeping |

### Fix Recommendation
1. **BACKEND ASK:** Confirm if `paid_to` and `payment_reference_id` are stored. If not, request backend to add columns.
2. **FE:** Add optional input fields in ExpenseEntryPanel (text inputs, collapsible "More Details" section)

**Scope:** Backend contract needed first. FE work: ~30-40 lines after backend confirmation.

---

## Summary Table

| # | Issue | Classification | Confidence | FE Fix? | Scope |
|---|---|---|---|---|---|
| 1 | Bulk Edit price not persisting | **CODE_ERROR** | HIGH | YES — cross-join pricedItems in fetchAll | ~10 lines |
| 2 | Can't remove price in Unit Prices tab | **UX_GAP** (working as designed) | HIGH | Optional UX improvement | ~3 lines |
| 3 | "Unit price required" error in Stock Master | **AS DESIGNED** (but UX circle) | HIGH | Better error message | 1 line |
| 4 | Partial payment | **BACKEND SUPPORTS** — FE doesn't expose | HIGH | New CR needed | ~50-80 lines |
| 5 | Optional fields (Paid To, Reference) | **BACKEND_ASK** needed | MEDIUM | Backend first, then FE | ~30-40 lines |

---

## Retroactive Candidates
None found.

## Artifacts
- API probe evidence saved in this report (inline)
- Test expense entries created: id=9902, 9903 (Cafe103, 2026-07-20) — can be deleted
