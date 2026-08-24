# Investigation Report — 5 Owner-Reported Issues (2026-07-28)

**Agent:** INVESTIGATION
**Sprint:** POS 5.0
**Steps used:** 10/10
**Source:** OWNER-REPORTED (session 2026-07-28)

---

## Issue 1: Update Order Missing cust_name / cust_mobile / cust_membership_id

### Summary
Root cause: **FE_BUG** — `toAPI.updateOrder()` deliberately omits `cust_mobile` and `cust_membership_id`.
Confidence: **HIGH** (code traced, comment found)

### Data Flow Trace
- `orderTransform.js:1128-1131` → `updateOrder` payload builder
- Line 1131: `cust_name: customer?.name || ''` ← **ONLY cust_name is sent**
- Compare `placeOrder` (L995-1005): sends `cust_name`, `cust_mobile`, `cust_email`, `cust_dob`, `cust_anniversary`, `cust_membership_id`
- Test file confirms this was INTENTIONAL design: `updateOrderPayload.test.js:16` says "updateOrder carries only cust_name; customer mobile/email are captured at place-order time"
- BUT owner now says backend needs all 3 on update too.

### Fix Scope
- **1 file:** `orderTransform.js` line ~1131
- **Add 2 lines** after `cust_name`:
  ```
  cust_mobile: customer?.phone || '',
  cust_membership_id: customer?.id || '',
  ```
- Also update `cancelAndUpdateOrder` (L1286-1291) — already has all 3 ✅
- Risk: LOW (additive payload keys)

### Recommended ID: **BUG-270**

---

## Issue 2: GST/VAT Wrong from Dashboard/Order Page (Print shows wrong; Collect Bill shows correct)

### Summary
Root cause: **FE_BUG (PRINT PATH)** — Manual print path (BUG-168 v3) derives GST/VAT split differently from Collect Bill path.
Confidence: **HIGH** (two distinct code paths traced)

### Data Flow Trace
- **Collect Bill path** (`orderTransform.js:1805-1868`): Iterates `billFoodList`, reads `item.gst_tax_amount` + `food_details.tax_type`, accumulates GST and VAT separately. Applies discount proration. **CORRECT** per owner.
- **Manual Print path** (`orderTransform.js:1870-1915`): Uses `order.amount - order.subtotalBeforeTax` to get totalTax, then does a proportional split by item base price × tax_type. This is an APPROXIMATION (BUG-172 INTERIM comment at L1877).
- The proportional split at L1898-1914 splits by `vatBase / totalBase` ratio — this gives WRONG GST/VAT ratio when items have different tax rates.
- **Dashboard display** would use the `fromAPI` transform which reads `total_gst_tax_amount` from backend. Need to verify if dashboard GST/VAT comes from different API fields.

### Fix Scope
- **1 file:** `orderTransform.js` (print payload builder, ~L1870-1915)
- Replace proportional split with per-item `gst_tax_amount` / `vat_tax_amount` accumulation (same as Collect Bill path)
- Risk: MEDIUM (financial logic, touches print)
- **ALSO CHECK:** Dashboard display transform — does `fromAPI.orderFromSocket` pass GST/VAT separately?

### Recommended ID: **BUG-271**

---

## Issue 3: B2B Customer — No UI to Capture custGST and custGSTName

### Summary
Root cause: **FE_BUG (MISSING FEATURE)** — `custGST` and `custGSTName` fields exist in print payload (`orderTransform.js:2067-2068`) but are hardcoded to `''`. No UI input exists anywhere.
Confidence: **HIGH** (grep confirmed 0 input fields for these)

### Data Flow Trace
- `orderTransform.js:2067-2068`: `custGSTName: ''`, `custGST: ''` — hardcoded empty
- Screenshot confirms: payload shows `custGST: ""`, `custGSTName: ""`, `custName: ""`
- No `<input>` or form field for B2B GST number anywhere in the collect bill flow
- `CollectPaymentPanel.jsx` has customer fields (name, phone, membership) but NO GST fields

### Fix Scope
- **2 files:** `CollectPaymentPanel.jsx` (add custGST + custGSTName input fields in B2B section) + `orderTransform.js` (wire values into print + settle payloads)
- ~40-60 lines
- Risk: MEDIUM (new UI fields, touches payment flow)
- **Owner decision needed:** Where should the B2B toggle / GST fields appear? On the Collect Bill panel? On customer selection? Always visible or conditional?

### Recommended ID: **BUG-272**

---

## Issue 4: Partial Payment Breakdown Missing in Order Report

### Summary
Root cause: **FE_BUG** — `reportTransform.js` does NOT parse `partial_payments` array from the order-logs API response. Payment method shows "partial" but individual legs (cash: 30, upi: 33) are not extracted.
Confidence: **HIGH** (grep confirmed — 0 references to `partial_payments` in reportTransform.js)

### Data Flow Trace
- Screenshot shows backend returns: `"partial_payments": [{"payment_mode":"cash","amount":"30.00"}, {"payment_mode":"upi","amount":"33.00"}]`
- `reportTransform.js:179`: `paymentMethod: api.payment_method || 'cash'` — sets "partial" but no leg breakdown
- `OrderLedgerMockup.jsx:169`: Has column `partialPayment` but the data is never populated from the API response
- The `partial_payments` array from the log API is never parsed by `reportTransform.js`

### Fix Scope
- **2 files:** `reportTransform.js` (parse `partial_payments` array → `cashAmount`, `upiAmount`, `cardAmount`) + `OrderLedgerMockup.jsx` or `DailyReportMockup.jsx` (display the breakdown)
- ~20-30 lines
- Risk: LOW (additive, display-only)

### Recommended ID: **BUG-273**

---

## Issue 5: Auto Settle Local Settings — Remove (Server-Side Now)

### Summary
Root cause: **CONFIG_ISSUE** — Auto-settle toggle exists in `StatusConfigPage.jsx` (L984-1001) and uses `localStorage` key `mygenie_auto_settle_enabled`. Owner says this is now handled server-side.
Confidence: **HIGH** (code traced)

### Affected Code
| File | Lines | What |
|---|---|---|
| `StatusConfigPage.jsx` | L70-71, L984-1001 | Toggle UI + localStorage key |
| `DashboardPage.jsx` | L1526-1560 | Auto-settle queue processor (reads localStorage) |
| `OrderCard.jsx` | L1151-1153 | Hides Settle button when auto-settle ON |
| `TableCard.jsx` | L621-622 | Same hide logic |
| `utils/autoSettlePrefs.js` | L10-27 | Helper: `isAutoSettleEnabled()` / `setAutoSettleEnabled()` |

### Fix Scope
- **5 files** — remove toggle from StatusConfigPage, remove queue processor from DashboardPage, remove conditional hide from OrderCard/TableCard, delete autoSettlePrefs.js
- ~100 lines removed
- Risk: MEDIUM (touches DashboardPage = hotspot R5, changes order card behavior)
- **Owner decision needed:** Should the Settle button ALWAYS show now? Or does server-side auto-settle mean orders arrive already settled (no button needed)?

### Recommended ID: **BUG-274**

---

## Summary Table

| # | Issue | Classification | Confidence | Root Cause | Fix Files | Risk | Planning Skip? |
|---|-------|---------------|------------|------------|-----------|------|:---:|
| 1 | Update order missing customer fields | FE_BUG | HIGH | `updateOrder` omits cust_mobile/membership_id | 1 file, 2 lines | LOW | YES (owner approve) |
| 2 | GST/VAT wrong on print from dashboard | FE_BUG | HIGH | Manual print path uses proportional split vs item-level | 1 file, ~20 lines | MEDIUM | NO (financial R6) |
| 3 | B2B custGST/custGSTName no UI | MISSING FEATURE | HIGH | Fields hardcoded empty, no input exists | 2 files, ~50 lines | MEDIUM | NO (new feature) |
| 4 | Partial payment breakdown in report | FE_BUG | HIGH | `partial_payments` not parsed in reportTransform | 2 files, ~25 lines | LOW | YES (owner approve) |
| 5 | Auto settle local settings removal | CONFIG_ISSUE | HIGH | Server-side now, FE toggle/queue to remove | 5 files, ~100 lines | MEDIUM | NO (hotspot R5) |

## Owner Decisions Needed

1. **Issue 1:** Confirm — always send `cust_mobile` + `cust_membership_id` on update-order? (Direct fix, 2 lines)
2. **Issue 2:** Need to verify if dashboard DISPLAY also shows wrong GST/VAT or only print. Can you confirm with a specific order?
3. **Issue 3:** Where should B2B GST fields appear? On Collect Bill panel? Always visible or B2B-toggle conditional?
4. **Issue 4:** Which report page should show the breakdown? Order Ledger? Daily Report? Both?
5. **Issue 5:** After removing auto-settle FE, should Settle button ALWAYS show? Or do server-settled orders arrive with status=paid (no button)?

## Retroactive Candidates
None.

---

*Investigation report written by: INVESTIGATION agent, 2026-07-28*
*All evidence from code traces — no artifacts saved to /tmp (persistent paths only)*
