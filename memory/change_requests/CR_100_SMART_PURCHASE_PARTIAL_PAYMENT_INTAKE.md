# CR-100: Smart Purchase — Partial Payment, Reference ID, Notes & Unpaid Status

**Registered:** 2026-07-24
**Source:** OWNER-REPORTED
**Classification:** CR (Feature Enhancement)
**Severity:** P1
**Risk:** HIGH (payment/financial logic)
**Status:** INTAKE — BACKEND-BLOCKED
**Duplicate Check:** DISTINCT
**Investigation:** Complete (2026-07-24, 8/10 steps)

---

## Summary

Smart Purchase currently sends a **single `payment_method` string** per vendor PO to `POST /add-purchase`. Owner requires the same partial/split payment capability that exists in the Expense module (CR-083):

1. **Split/Partial Payment** — split a vendor PO across multiple payment methods (e.g., ₹50,000 Cash + ₹20,000 UPI)
2. **Reference ID** — transaction/cheque/UPI reference per payment row (`payment_ref_id`)
3. **Notes** — free-text notes per vendor PO (`notes` — field exists in transform but not in FE form)
4. **Unpaid/Partial Status** — a PO can be: Fully Paid, Partially Paid, or Unpaid (credit). Enables "half paid, half unpaid" scenario.

---

## Current State (FE Code Trace)

| Aspect | File | Line | Current |
|---|---|---|---|
| Payment field | `inventoryTransform.js` | L162 | `payment_method: data.paymentMethod \|\| ''` (single string) |
| Vendor preview | `GroupedVendorPreview.jsx` | L27-35 | Single `<select>` per vendor card |
| Submit | `SmartPurchasePanel.jsx` | L142-160 | One `addPurchase()` call per vendor, one PM |
| Validation | `SmartPurchasePanel.jsx` | L126 | Only checks PM is not empty |
| Notes field | `inventoryTransform.js` | L164 | `notes` exists but FE hardcodes `"Smart Purchase · horizon Xd"` |
| Reference ID | — | — | **Not in payload or UI** |
| Payment status | — | — | **Not in payload or UI** |

## Expense Module Reference (CR-083 — working pattern)

| Feature | How Expense Does It |
|---|---|
| Split toggle | "Split" button per line → expands to [{method, amount}] rows |
| Validation | Sum of splits must equal line total (± ₹0.01) |
| API shape | `flatMap` expands each split into separate API detail entries with own `payment_method` + `amount` |
| Reference ID | `payment_ref_id` per line (CR-087) |
| Notes | `notes` per line (BUG-177) |

---

## Backend Contract Changes Needed

### 1. `POST /api/v2/vendoremployee/inventory/add-purchase` — Extend Payload

**Current accepted payload:**
```json
{
  "vendor_name": "Saurav",
  "vendor_id": 123,
  "purchase_date": "24-07-2026",
  "payment_method": "Cash",        // ← single string
  "invoice_number": "",
  "notes": "Smart Purchase · horizon 7d",
  "purchase_items": [
    { "Ingredient": 42, "Unit": "kg", "quantity": 50, "rate": 146, "Amount": 7300, "converion_factor": 1 }
  ]
}
```

**Proposed extended payload:**
```json
{
  "vendor_name": "Saurav",
  "vendor_id": 123,
  "purchase_date": "24-07-2026",
  "payment_method": "Cash",                  // kept for backward compat (single payment)
  "payment_status": "partial",               // NEW: "paid" | "unpaid" | "partial"
  "paid_amount": 50000,                      // NEW: amount actually paid (≤ total)
  "invoice_number": "INV-2026-0789",
  "notes": "Bulk cheese order for weekend",  // existing field, now user-editable
  "partial_payments": [                      // NEW: array, only when payment_status = "partial" or "paid" with split
    { "method": "Cash",   "amount": 30000, "payment_ref_id": "" },
    { "method": "UPI",    "amount": 20000, "payment_ref_id": "UPI-TXN-ABC123" }
  ],
  "purchase_items": [ ... ]                  // unchanged
}
```

### 2. New Fields Required

| Field | Type | Required | Description |
|---|---|---|---|
| `payment_status` | enum string | YES (default "paid") | `"paid"` / `"unpaid"` / `"partial"` |
| `paid_amount` | number | When status ≠ "paid" | Amount actually paid. 0 for unpaid. |
| `partial_payments` | array | When split | `[{method: string, amount: number, payment_ref_id: string}]` |
| `payment_ref_id` | string | NO | Reference/transaction ID (single payment mode) |
| `notes` | string | NO | Already accepted — no change needed |

### 3. Backward Compatibility

- If `partial_payments` is absent → treat as single payment (existing behavior)
- If `payment_status` is absent → default to `"paid"` (existing behavior)
- Existing FE versions that send only `payment_method` continue to work

---

## FE Implementation Plan (Ready When Backend Delivers)

| # | File | Change | Lines |
|---|---|---|---|
| 1 | `GroupedVendorPreview.jsx` | Add payment status toggle (Paid/Partial/Unpaid), split rows UI, reference ID input, notes input | ~120 lines |
| 2 | `SmartPurchasePanel.jsx` | Wire split state per vendor, validation (split sums), submit logic | ~40 lines |
| 3 | `inventoryTransform.js` | Extend `addPurchase()` with `payment_status`, `paid_amount`, `partial_payments[]`, `payment_ref_id` | ~15 lines |
| 4 | `constants.js` | No change (endpoint stays the same) | 0 |

**Total estimated:** ~175 lines across 3 files. Pattern cloned from Expense CR-083.

---

## Open Questions for Backend

1. Does the purchase table already have a `payment_status` column? If not, migration needed.
2. Should `partial_payments` be stored as JSON column or as separate `purchase_payments` table rows?
3. Should unpaid purchases appear differently in purchase history / reports?
4. Is there an existing `update-purchase` endpoint to later mark an unpaid PO as paid?

---

## Blast Radius

- **Files:** 3 FE files (GroupedVendorPreview.jsx, SmartPurchasePanel.jsx, inventoryTransform.js)
- **Hotspots:** NO
- **Financial:** YES (payment amounts) — requires owner approval at Gate 4
- **Regression:** Smart Purchase submit flow only — no impact on other modules

---

## Next

**BACKEND-BLOCKED.** Backend brief appended to `BACKEND_BLOCKERS_BRIEF_2026_07_22.html` (§CR-100). FE implementation ready to start once backend confirms contract and delivers the endpoint changes.
