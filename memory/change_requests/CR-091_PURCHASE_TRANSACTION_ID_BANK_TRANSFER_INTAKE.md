# CR-091 — Purchase: Transaction ID Field for Bank Transfer

**ID:** CR-091
**Type:** CR
**Created:** 2026-07-22
**Severity:** P2 (MEDIUM)
**Risk:** LOW
**Module:** Inventory — Purchase Entry (PurchaseEntryPanel)
**Duplicate Check:** RELATED to CR-087 (New Expense Payment Fields — `payment_made_to` + `payment_ref_id`). DISTINCT: CR-091 is for the PURCHASE module, not expense. Same concept (transaction reference for bank transfer) applied to a different screen/endpoint.
**Code Reality:** NEEDS INVESTIGATION — `PurchaseEntryPanel.jsx` has payment method field. Whether a transaction ID field exists or not requires reading the panel in full.
**Source:** OWNER-REQUESTED (session 2026-07-22)
**Confidence:** REPORTED (PurchaseEntryPanel not fully reviewed this session)

---

## Description

When recording a purchase with **payment method = "Bank Transfer"** (or equivalent), owner needs a **Transaction ID / Reference Number** field to track which bank transfer paid for the invoice. Currently this reference cannot be stored.

### Expected Behavior
- When `paymentMethod === 'bank_transfer'` (or equivalent value): show an additional input "Transaction ID / Ref No."
- Field is optional but should be stored and shown in purchase history
- Mirror of CR-087 pattern (which added `payment_ref_id` to the Expense Entry form)

---

## Evidence

- CR-087 precedent: `payment_ref_id` added to expense transform + entry panel
- `PurchaseEntryPanel.jsx` — has payment method field (not fully reviewed)
- `inventoryTransform.js:addPurchase()` — `invoice_number` exists; `payment_ref_id` not present
- Backend: need to check if purchase API accepts a `payment_ref_id` or `transaction_id` field

---

## Blast Radius

- 2-3 files: `PurchaseEntryPanel.jsx`, `inventoryTransform.js`, possibly `constants.js`
- ~20-25 lines change
- Scope: SMALL-MEDIUM

---

## Fix Plan (seeding — formal plan at Gate 3)

1. Read `PurchaseEntryPanel.jsx` in full
2. Curl-verify: does `POST /add-purchase` payload accept `payment_ref_id` or `transaction_id`?
3. Add `paymentRefId` field to `addPurchase()` transform (conditional, bank transfer only)
4. Add input field to `PurchaseEntryPanel.jsx`, shown when payment method = bank transfer
5. Show in purchase history table if space allows

---

## Next
Planning Gate 2 → Gate 3 → Implementation
