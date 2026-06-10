# PROD-HOTFIX-006 — Takeaway Print: Customer Phone Empty When No Phone Entered

**Date:** 2026-05-29
**Severity:** P2
**Status:** INTAKE — INVESTIGATING (owner to confirm exact symptom)
**Affected flow:** Takeaway → Customer linked (name only, no phone) → Print Bill / KOT

---

## 1. Symptom (reported by owner)

In takeaway orders, when a customer is linked with name but **no phone number**, the printed bill may not show customer details.

## 2. Payload Evidence (owner-provided)

**Payload 1 — customer linked, NO phone entered:**
- `custName: "Abhishek Jain 1"` — PRESENT in payload
- `custPhone: ""` — EMPTY in payload
- Order: 869330, restaurant_order_id: "009576"

**Payload 2 — customer linked, phone "2" entered:**
- `custName: "abhi123"` — PRESENT in payload
- `custPhone: "2"` — PRESENT in payload
- Order: 869331, restaurant_order_id: "009577"

## 3. Analysis

Frontend IS sending `custName` in both cases. The issue is likely:
- **Backend/print template** gates customer info display on `custPhone` being non-empty
- OR the printed bill doesn't render when `custPhone` is empty

## 4. Open Questions

- **OQ-1:** Is the customer name NOT showing on the actual printed bill? (Owner to confirm with printed bill screenshot)
- **OQ-2:** If yes → this is a backend print template fix (template should show `custName` even when `custPhone` is empty)
- **OQ-3:** Should frontend enforce phone number as required when linking a customer?

## 5. Files Likely Involved (if frontend fix needed)

- `api/transforms/orderTransform.js` — `buildBillPrintPayload` populates `custName` / `custPhone`
- `components/order-entry/CollectPaymentPanel.jsx` — customer data flow
- `components/order-entry/OrderEntry.jsx` — customer modal → cart data

## 6. Status

WAITING — Owner will come back with printed bill evidence to confirm exact symptom.

---
---

# PROD-HOTFIX-008 — Manual KOT/Bill Print: Customer Name & Phone NULL in Payload

**Date:** 2026-05-29
**Severity:** P1 (customer info missing on printed bills)
**Status:** INTAKE — CONFIRMED BUG
**Affected flow:** Dine-in → Customer linked → Manual Print Bill / KOT

---

## 1. Symptom

When printing a manual bill/KOT for a dine-in order with a linked customer, `custName` and `custPhone` are both **null** in the print payload. The printed bill will NOT show customer information.

## 2. Payload Evidence (owner-provided)

Order 869335, restaurant_order_id "009581", dine-in, paid ₹838:
```
custName: null        ← SHOULD be customer name
custPhone: null       ← SHOULD be customer phone
custGSTName: null
custGST: null
```

Backend response confirms the null values were sent by frontend:
```json
"cust_name": null,
"cust_phone": null,
"cust_gst_name": null,
"cust_gst": null,
```

## 3. Comparison with Working Cases

| Scenario | custName | custPhone | Working? |
|---|---|---|---|
| Takeaway, customer linked, no phone | "Abhishek Jain 1" | "" | Name: YES, Phone: EMPTY |
| Takeaway, customer linked, phone entered | "abhi123" | "2" | Both: YES |
| **Dine-in, manual KOT/bill print** | **null** | **null** | **BOTH: BROKEN** |

## 4. Root Cause (likely)

The `buildBillPrintPayload` in `orderTransform.js` (~1916 lines) has different code paths for:
- **Place+Pay (prepaid):** customer data flows from OrderEntry state → payload ✅
- **Collect Bill (postpaid):** customer data flows from CollectPaymentPanel → payload ✅
- **Manual print (dashboard card / re-print):** customer data may NOT be available in the context used to build the payload — it likely reads from the order object which may not have `customer_name` / `customer_phone` populated

The manual print path rebuilds the payload from the placed order data, and if the order object from the API doesn't include customer fields (or they're in a different location like `customer_details` or `customer`), the payload builder maps them as null.

## 5. Files to Investigate

| File | Why |
|---|---|
| `api/transforms/orderTransform.js` | `buildBillPrintPayload` — where custName/custPhone are mapped |
| `components/order-entry/OrderEntry.jsx` | Manual print trigger path |
| `components/order-entry/RePrintButton.jsx` | Re-print button logic |
| `components/order-entry/CollectPaymentPanel.jsx` | Collect Bill print path (WORKING — for comparison) |

## 6. Expected Fix

The `buildBillPrintPayload` function needs to:
1. Read customer name from the order object (likely `order.customer_name` or `order.customer?.name`)
2. Read customer phone from the order object (likely `order.customer_phone` or `order.customer?.phone`)
3. Fall back gracefully to empty string (not null) if no customer is linked

## 7. Implementation Summary (Artifact #5)

**Date:** 2026-05-29
**File changed:** `api/services/orderService.js` (2 lines added at L155-156)
**Change:** Added `custName` and `custPhone` to the KOT payload path (the `else` branch in `printOrder`).

```js
// BEFORE (KOT path):
payload = { order_id, print_type, waiterName, tablename, orderNote, billFoodList };

// AFTER:
payload = { order_id, print_type, waiterName, tablename, custName, custPhone, orderNote, billFoodList };
```

**Pre-implementation verification:**
- Curl-probed `POST /order-temp-store` with `custName` + `custPhone` on a KOT payload → backend returned `status: true`, `cust_name: "Test Customer"`, `cust_phone: "9876543210"` ✅

**Post-implementation verification:**
- Hot reload compiled with 0 new warnings ✅
- Only pre-existing ESLint warning (OrderEntry.jsx L1311 printOrder dependency) ✅

**QA needed:**
Owner to test: Place a dine-in order → link customer via CustomerModal → print KOT → verify customer name and phone appear on KOT slip.

## 8. Artifact Tracker

| # | Artifact | Status |
|---|---|---|
| 1 | Intake document | ✅ |
| 2 | Impact Analysis | ✅ |
| 3 | Implementation Plan | ✅ |
| 4 | Pre-Implementation Code Gate | ✅ (endpoint curl-verified + owner approved) |
| 5 | Implementation Summary + QA Report | ✅ (this section) |
| 6 | Owner Smoke Sign-off | ✅ PASSED — owner confirmed "its working" (2026-05-29) |

---

# PROD-HOTFIX-007 — Loyalty Points Earned Not Displayed on Collect Bill

**Date:** 2026-05-29
**Severity:** P2
**Status:** INTAKE
**Affected flow:** Any order type → Collect Payment → Loyalty section

---

## 1. Symptom

On the Collect Payment screen, the Loyalty section shows **redeem info** but NOT **earn info**.

**What currently shows (redeem):**
- `Loyalty` | `Bronze` | `(128 pts)` | `₹128 discount`
- `128 pts redeemed · ratio ₹1/pt`

**What currently shows (insufficient points):**
- `Loyalty` | `Bronze` | `Earn 50 more`
- `Minimum 50 points required`

**What is MISSING (earn):**
- No indication of "You'll earn X points on this order"
- Cashier cannot inform customer how many points they'll earn from the current purchase

**Expected:** A line like `"You'll earn X pts on this order"` visible in the Loyalty section, regardless of whether the customer redeems or not.

## 2. Screenshot Evidence

**Screenshot 1** (2026-05-29) — order ₹2,571, insufficient points:
- Loyalty: "Bronze" | "Earn 50 more" | "Minimum 50 points required"
- No earn-points display

**Screenshot 2** (2026-05-29) — same customer, redeeming 128 pts:
- Loyalty: checked | "Bronze" | "(128 pts)" | "₹128 discount"
- "128 pts redeemed · ratio ₹1/pt"
- Still no earn-points display

## 3. Root Cause (likely)

The CRM loyalty API may return:
- Current points balance
- Points needed to redeem (shown as "Earn 50 more")
- Tier (Bronze)

But either:
- The API doesn't return "points to be earned on this order"
- OR the frontend doesn't display it even if available

## 4. Investigation Needed

- Check CRM loyalty API response — does it include `points_to_earn` or similar field?
- Check `CollectPaymentPanel.jsx` loyalty section — what data is rendered?
- Check `loyaltyTransform.js` — what fields are extracted?
- Check CRM 2.0 CR-002 contract — was "earn points display" in scope?

## 5. Files Likely Involved

- `components/order-entry/CollectPaymentPanel.jsx` — loyalty section render
- `api/transforms/loyaltyTransform.js` — loyalty data transform
- `hooks/useCustomerIntel.js` — customer intelligence hook (CRM 2.0)
- CRM API response shape — may need new field

## 6. Status

INTAKE — needs code investigation to determine if this is a frontend display gap or CRM API gap.
