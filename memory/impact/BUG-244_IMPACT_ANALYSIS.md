# BUG-244 — Impact Analysis (Gate 2)

**ID:** BUG-244
**Title:** add-purchase payload: wrong payment key + missing header totals
**Date:** 2026-07-25
**Risk:** MEDIUM
**Code Reality:** NONE — fix code does not exist.
**Conflict Pre-Check:** No OTHER item touching `inventoryTransform.js:addPurchase` in current sprint. Last modifier: CR-102 (2026-07-24, different function — `addIngredient`/`updateIngredient`). SAFE.

---

## 1. Affected Code

**Single function:** `toAPI.addPurchase()` at `inventoryTransform.js:167-186`

**Two callers:**

| Caller | File | `vendorId` | `paymentMethod` | `conversionFactor` |
|--------|------|-----------|-----------------|-------------------|
| Smart Purchase | `SmartPurchasePanel.jsx:160` | Real ID or `null` (System Vendor) | From `pmByVendor[vid]` dropdown (e.g. "Cash", "UPI") | `1` (hardcoded) |
| Manual Purchase | `PurchaseEntryPanel.jsx:95` | **Always `null`** (only captures `vendorName` text) | From `paymentMethod` dropdown (same values: "Cash", "UPI", etc.) | `ingr?.conversionFactor \|\| 1` (usually `1` — most ingredients have null conversion) |

---

## 2. Unambiguous Fixes (per backend contract)

These are clear from the contract with zero ambiguity:

| # | Current Code | Fix | Contract Reference |
|---|-------------|-----|-------------------|
| F1 | `payment_method: data.paymentMethod` (L172) | Rename key → `payment_type` | "Use `payment_type`, never `payment_method`" |
| F2 | `tot_amount` not sent | Add `tot_amount` = sum of all `items[].amount` | "Always send `tot_amount` and `item_total`" |
| F3 | `item_total` not sent | Add `item_total` = same sum | Same as above |
| F4 | `tot_fair` not sent (defaults to 1) | Add `tot_fair: 0` | Defaults to 1 if omitted |
| F5 | `tot_tax` not sent (defaults to 1) | Add `tot_tax: 0` | Defaults to 1 if omitted |

---

## 3. Owner Decision Queue — BLOCKERS

### OQ-1 (BLOCKER): `vendor_id: null` — Contract says Required, FE sends null in 2 paths

**Backend contract:** `vendor_id` — **Yes (Required)**

**FE reality:**
- `PurchaseEntryPanel` **always** sends `vendorId: null` — it only captures a text `vendorName`, has NO vendor ID picker.
- `SmartPurchasePanel` sends `null` for System Vendor rows (`vid === 'system' → null`).

**Historical evidence:** preprod purchase history contains many records with `vendor_id: null`. So backend accepts it in practice.

**Question:** 
- **A)** `vendor_id: null` is fine — backend accepts it despite the doc saying "Required". No change needed.
- **B)** `vendor_id: null` should be fixed — PurchaseEntryPanel needs a vendor ID picker (scope expansion). System Vendor needs a different handling.
- **C)** Defer — keep current behavior, file separate item for PurchaseEntryPanel vendor picker.

**This question blocks the fix scope.** If B, the fix grows beyond 1 file.

---

### OQ-2 (BLOCKER): `converion_factor` — When exactly to omit?

**Backend contract:** "G-020 only. Omit unless SKU has real conversion. Do not always send 1."

**Current FE:** `converion_factor: item.conversionFactor || 1` — always sends (defaults to `1`).

**Data reality (curl-probed):** All 117 ingredients on Kunafa Mahal have `converion_factor: null` and `has_unit_conversion: false`. So the FE always falls back to `1`.

**Question — what's the omit condition?**
- **A)** Omit when `conversionFactor` is `0`, `null`, `undefined`, or `1` (i.e., only send when > 1)
- **B)** Omit always — let the backend derive it from the ingredient master
- **C)** Send `null` instead of omitting (different from omitting the key entirely)

---

### OQ-3 (NON-BLOCKER, surfacing): `invoiceNumber` UI field — dead?

`PurchaseEntryPanel` has a UI input for invoice number. It passes `invoiceNumber` to `addPurchase`. But the backend contract says: "`invoice_number` — Ignored on add-purchase (string). Invoice is file upload only."

**Question:** Should the `invoiceNumber` UI field be hidden/removed from PurchaseEntryPanel? Or is it intentional for future backend support?

**Not blocking BUG-244 fix** — but worth noting. The field will continue to be sent (per owner directive to keep ignored keys).

---

## 4. Data Flow — `tot_amount` Computation

The transform receives `data.items[]` where each item has `.amount` (already computed by both callers as `quantity * rate`).

**Proposed computation (in transform):**
```
const totalAmount = (data.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
```

**Verification:** 
- SmartPurchase: `amount: Number(r.qty ?? r.suggest_qty) * Number(r.rate)` ✅ already computed
- PurchaseEntry: `amount: Number(item.quantity) * Number(item.rate)` ✅ already computed

Both callers pass pre-computed `amount` per item. Sum is safe to compute in transform.

---

## 5. Payment Method Values — Confirmed Safe

API endpoint `/expense/payment-method` returns: `["UPI", "Cash", "Bank Transfer", "Cash Draw"]`

Both callers use these exact strings from the dropdown. The fix is a pure key rename (`payment_method` → `payment_type`), values unchanged.

---

## 6. Downstream Impact

| Consumer | Affected? | Why |
|----------|-----------|-----|
| `inventoryService.addPurchase` | YES — sends the fixed payload | Direct consumer of transform |
| `SmartPurchasePanel` | NO code change — benefits from fix | Passes same data, transform fixes the output |
| `PurchaseEntryPanel` | NO code change — benefits from fix | Same |
| All other inventory transforms | NOT affected | Different functions in same file |
| Reports / vendor-item-list | Improved — `payment_type` and `tot_amount` will now be correct in backend records | Downstream benefit |

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `payment_type` key not accepted by older backend version | LOW | Payment still null | Contract doc confirms key; curl "good example" uses it |
| `tot_amount` rounding mismatch | LOW | Header total ≠ sum of lines by fraction | Use raw sum without rounding (backend handles precision) |
| Omitting `converion_factor` breaks backend for G-020 ingredients | MEDIUM | Stock miscounted | OQ-2 must be resolved before coding |

---

## Summary

**3 fixes are unambiguous** (F1-F5): payment_type rename, add tot_amount/item_total, add tot_fair/tot_tax.

**2 questions BLOCK implementation planning:**
- **OQ-1:** Is `vendor_id: null` acceptable? (affects scope — 1 file vs multiple)
- **OQ-2:** What's the exact omit condition for `converion_factor`?

**1 question is non-blocking:** OQ-3 (invoiceNumber UI field — keep or remove?)

**Next:** Resolve OQ-1 + OQ-2 → Gate 3 (Implementation Plan)
