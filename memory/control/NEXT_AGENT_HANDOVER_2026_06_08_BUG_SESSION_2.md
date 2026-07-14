# Agent Handover — POS 4.0 Bug Session #2 (2026-06-08)

**Session:** BUG-115 closed + BUG-117 investigation (no code edit)
**Date:** 2026-06-08
**Branch:** `5-june`
**Preview URL:** https://67b33653-face-44ba-bfc6-51c61b815530.preview.emergentagent.com

---

## What Was Done This Session

### 1. Environment Setup
- Cloned `5-june` branch fresh into `/app`
- Configured all 14 env variables (Firebase, API URLs, Socket, CRM)
- Frontend compiling and running on craco

### 2. Control Layer Compliance
- Read all control docs before any code work
- Registered BUG-112 through BUG-118 + CR-014, CR-015 in `registry.json` (were missing)
- Created Session Start file (Artifact #0)
- Followed full 7-gate process for BUG-115

### 3. BUG-115 — CLOSED (7/7 artifacts complete)
**File:** `AllOrdersReportPage.jsx` — 3 lines changed (L70, L84, L107)
- Aligned `TAB_FILTERS.cancelled` with Order Ledger parity
- Added lowercase `'cancelled'` check to: cancelled filter, paid exclusion, running exclusion
- Owner confirmed backend fixed the `fOrderStatus=3 + paymentMethod='pending'` case
- Owner approved → CLOSED

### 4. BUG-117 — Investigation Complete (NO CODE EDIT)

#### Owner's report
"Discount is getting counted in the Tax (GST) in the UI side-sheet"

#### Screenshot analysis (Order 001148)
- Tax (GST) showing ₹-168 (negative) — the discount amount
- Subtotal (3 items): ₹283, Tax (GST): ₹-168, Total: ₹115

#### Live validation with Order 939440 (Lafetta, rid=78)
Owner placed a live discounted order. Raw API data dumped from `order-logs-report`:

**Order-level tax keys (EXACT values from API):**
```
total_tax_amount:           88
total_gst_tax_amount:       44.00
total_vat_tax_amount:       44.00
order_sub_total_amount:     1450
order_sub_total_without_tax: 1350
order_amount:               1438
restaurant_discount_amount: 100
order_discount:             100.00
```

**Item-level tax keys:**
```
Item 1 (Red Velvet Cake, ₹1250):
  tax_amount: 0, gst_tax_amount: 0.00, vat_tax_amount: 0.00
  gst: 0, item_gst: 0.00, item_vat: 0.00

Item 2 (Beer, ₹200):
  tax_amount: 88, gst_tax_amount: 44.00, vat_tax_amount: 44.00
  gst: 0, item_gst: 0.00, item_vat: 0.00
```

#### Current FE transform (reportTransform.js L957-963):
```js
// VAT-FIX comment says: "Backend stores total tax (GST+VAT) in total_gst_tax_amount"
const rawGstAmount = toNum(api.total_gst_tax_amount);   // = 44
const vatAmount = toNum(api.total_vat_tax_amount);       // = 44
const gstAmount = rawGstAmount - vatAmount;              // = 0 ← WRONG?
```

#### Owner clarification on key naming:
Owner stated: "total_gst_tax_amount is actually total tax amount is a misconception in the key. And total_vat_tax_amount is total VAT. And these are different. Another key which is called gst_tax_amount."

**IMPORTANT: Owner needs to confirm the exact interpretation of each key before any code edit.** The raw data shows `total_gst_tax_amount = 44` and `total_tax_amount = 88`, which contradicts the VAT-FIX comment. But owner said `total_gst_tax_amount` IS gst+vat — which would match `total_tax_amount = 88` NOT 44.

**This needs owner clarification with backend team before any code change.**

#### Additional finding — Audit Report showing 0 orders for Lafetta
Both "Today" and "Yesterday" show 0 orders on the Audit Report for Lafetta (rid=78), even though the order exists (confirmed via API). The `order-logs-report` API returns the order for June 8 — but only with `sort_by=created_at`. The `collect_bill` field is populated (`2026-06-08 02:49:49`). This may be a business-day boundary issue with the restaurant's schedule config, or a date-picker timezone mismatch (order is UTC 02:49 = IST 08:19).

---

## What Remains — Next Agent Picks Up Here

### BUG-117 — Tax Key Interpretation (BLOCKED on owner clarification)
- Raw data captured above — owner must confirm with backend team:
  - Is `total_gst_tax_amount` = pure GST (44) or total tax GST+VAT (88)?
  - Is `total_tax_amount` (88) the canonical total tax field?
  - At item level: `tax_amount=88` vs `gst_tax_amount=44` — which is which?
- Once confirmed, fix the VAT-FIX formula in `reportTransform.js` L957-963
- Same formula used by Order Ledger (inherits from `orderLogsReportRow`)
- Also fix field name mismatch in OrderDetailSheet (intake doc Source A: `discountAmount` vs `discount`)
- **NO CODE EDIT until owner approves the key interpretation**

### BUG-116 — Out-of-kitchen/out-of-menu socket realtime (DISCOVERY COMPLETE)
- Backend-dependent — needs API + socket handler
- Intake doc: `/app/memory/memory/bugs/BUG_116_OUT_OF_KITCHEN_SOCKET_REALTIME_INTAKE.md`

### BUG-118 — Nth-item coupon / BOGO coupon (INTAKE)
- No discovery done yet
- Intake doc: `/app/memory/memory/bugs/BUG_118_NTH_ITEM_BOGO_COUPON_INTAKE.md`

### Audit Report 0 orders for Lafetta
- Not a bug in the code — likely business-day boundary or schedule config
- Owner saw it live (screenshots attached in handover)
- May need investigation if it persists for other restaurants

---

## Files Modified This Session

| File | Bug | Change |
|------|-----|--------|
| `AllOrdersReportPage.jsx` | BUG-115 | L70, L84, L107 — cancelled filter parity with Order Ledger |
| `BUG_TRACKER.md` | BUG-115 | Status → CLOSED — OWNER VERIFIED |
| `OPEN_GAPS_REGISTER.md` | OG-FE-01 | Status → RESOLVED (BUG-115) |
| `registry.json` | All | Added BUG-112..118, CR-014, CR-015; BUG-115 → CLOSED 7/7 |

**No other source files modified. BUG-117 investigation was read-only (API calls + code reading).**

---

## Key Architecture Notes for Next Agent

1. **VAT-FIX formula is suspect** — `gstAmount = total_gst_tax_amount - total_vat_tax_amount` can produce 0 or negative values. The comment claims `total_gst_tax_amount` = total tax (GST+VAT combined), but live data for Lafetta shows `total_gst_tax_amount=44, total_tax_amount=88`. Owner needs to clarify with backend.

2. **Three tax key families exist in the API:**
   - Order level: `total_tax_amount`, `total_gst_tax_amount`, `total_vat_tax_amount`
   - Item level: `tax_amount`, `gst_tax_amount`, `vat_tax_amount`, `gst`, `item_gst`, `item_vat`
   - The relationship between these is NOT documented — owner must confirm

3. **`get-single-order-new` endpoint is missing financial fields** — `total_gst_tax_amount`, `total_vat_tax_amount`, `restaurant_discount_amount` all return MISSING/null. Only `order-logs-report` has them. FETCH MODE in OrderDetailSheet will always show wrong bill summary.

4. **Test credentials used this session:**
   - `owner@lafetta.com` / `Qplazm@10` (rid=78, Lafetta — has VAT items)
   - Order 939440 (restaurant_order_id: 012552) — live test order with discount + VAT

---

## Test Credentials

See `/app/memory/control/ACCESS_REGISTRY.md` + AGENT_PROMPT_ALPHA.md §TEST CREDENTIALS
