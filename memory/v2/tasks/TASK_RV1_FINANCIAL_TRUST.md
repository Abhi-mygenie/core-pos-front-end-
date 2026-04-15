# TASK_RV1_FINANCIAL_TRUST.md
## Validation Task: Does the Backend Recalculate Financial Totals?

> Priority: P0 | Type: Runtime Validation | Blocks: P0-1, P0-2, P0-5
> Duration: ~30 minutes | Requires: Active login session, browser devtools

---

## Objective

Determine whether the MyGenie backend independently recalculates order financial totals (subtotal, tax, round-off, order_amount) or trusts the values submitted by the frontend.

---

## Why This Task Is Needed Now

This is the single most consequential open question in the system. The answer determines the severity of 3 P0 backlog items:

| If Backend **TRUSTS** Frontend | If Backend **RECALCULATES** |
|-------------------------------|---------------------------|
| CONTRADICTION-1 (triple tax calc) = **CRITICAL** — wrong money hits database | CONTRADICTION-1 = **LOW** — display-only mismatch |
| CONTRADICTION-2 (collect-bill local calc) = **CRITICAL** — payment amount may be wrong | CONTRADICTION-2 = **LOW** — backend overrides anyway |
| P0-1 (tax unification) = **MUST DO IMMEDIATELY** | P0-1 = **can defer** to P1 priority |
| P0-2 (wire orderFinancials) = **MUST DO IMMEDIATELY** | P0-2 = **not needed** for correctness |
| P0-5 (price audit) = **CRITICAL** — wrong base price corrupts all math | P0-5 = **MEDIUM** — display issue only |

Without this answer, we cannot safely prioritize the financial refactor tracks.

---

## Affected Modules/Files

This validation touches the data sent by these files but does NOT require code changes:
- `api/transforms/orderTransform.js` — `toAPI.placeOrder()` lines 402-456 (builds the payload with financial fields)
- `api/services/orderService.js` — `fetchSingleOrderForSocket()` lines 38-51 (reads back what backend stored)

Specifically, these financial fields are under test:
```
order_sub_total_amount   (subtotal before tax)
tax_amount               (total tax)
gst_tax                  (GST portion)
vat_tax                  (VAT portion)
order_amount             (final total after rounding)
round_up                 (round-off adjustment)
```

---

## Exact Scope

**IN SCOPE:**
- Place one test order with a known item (simple: 1 item, no addons, no variations)
- Place one test order with a complex item (with addons + variations)
- For each: compare frontend-sent values vs backend-stored values
- Determine if backend recalculates or echoes frontend values

**EXCLUDED SCOPE:**
- No code changes
- No testing of Update Order (same financial pipeline as Place Order)
- No testing of Collect Bill (different pipeline — tested after this task if needed)
- No testing of reports or cancellation
- No load testing or performance testing

---

## Validation Steps

### Prerequisites
1. Frontend is running at `https://core-pos-frontend-1.preview.emergentagent.com`
2. Login with valid credentials
3. Navigate to dashboard
4. Open browser devtools → Network tab → filter "place-order"

### Test 1: Simple Order (no addons/variations)

**Step 1**: Identify a test table (available, no existing order)

**Step 2**: Open the table, add 1 item with known price. Note:
- Item name: ____________
- Item price: ____________
- Quantity: 1
- Tax type (from restaurant config): GST or VAT
- Tax inclusive or exclusive: ____________
- Tax percentage: ____________

**Step 3**: Click "Place Order" (NOT Place+Pay)

**Step 4**: In devtools Network tab, find the `place-order` request:
- Click the request → "Payload" tab
- The payload is inside a FormData field called `data` (JSON string)
- Record these values from the payload:

| Field | Frontend-Sent Value |
|-------|-------------------|
| `order_sub_total_amount` | |
| `tax_amount` | |
| `gst_tax` | |
| `vat_tax` | |
| `order_amount` | |
| `round_up` | |

**Step 5**: Now check what the backend stored. In devtools Console, run:
```js
// This triggers a GET single-order call (same as socket enrichment)
const API_BASE = 'https://preprod.mygenie.online/';
const token = localStorage.getItem('auth_token');
// Find the order ID from the place-order response:
// Check Network tab → place-order response → data.order_id or similar
const ORDER_ID = /* paste order_id from response */;

fetch(`${API_BASE}api/v2/vendoremployee/get-single-order-new`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ order_id: ORDER_ID })
}).then(r => r.json()).then(d => {
  const o = d.orders?.[0];
  console.table({
    order_sub_total_amount: o?.order_sub_total_amount,
    total_service_tax_amount: o?.total_service_tax_amount,
    gst_tax: o?.gst_tax,
    vat_tax: o?.vat_tax,
    order_amount: o?.order_amount,
    round_up: o?.round_up
  });
});
```

**Step 6**: Record the backend-stored values:

| Field | Backend-Stored Value |
|-------|---------------------|
| `order_sub_total_amount` | |
| `total_service_tax_amount` (or `tax_amount`) | |
| `gst_tax` | |
| `vat_tax` | |
| `order_amount` | |
| `round_up` | |

**Step 7**: Compare — do they EXACTLY match?

### Test 2: Deliberately Wrong Value

**Step 8**: Place another order for a different table. This time:

1. Before clicking "Place Order", open devtools Console
2. Intercept the request by temporarily monkey-patching the API:
```js
// Save original
const origAppend = FormData.prototype.append;
FormData.prototype.append = function(key, value) {
  if (key === 'data') {
    const parsed = JSON.parse(value);
    console.log('[INTERCEPT] Original order_amount:', parsed.order_amount);
    parsed.order_amount = '99999.00';  // Deliberately wrong
    parsed.order_sub_total_amount = '99999.00'; // Deliberately wrong
    value = JSON.stringify(parsed);
    console.log('[INTERCEPT] Modified to 99999.00');
  }
  return origAppend.call(this, key, value);
};
```
3. Now click "Place Order"
4. Verify in Network tab that the modified value was sent (check payload shows 99999.00)
5. Restore FormData: `FormData.prototype.append = origAppend;`
6. Fetch the order from API (Step 5 above with new ORDER_ID)

**Step 9**: Record the result:

| Field | Sent by Frontend | Stored by Backend |
|-------|-----------------|-------------------|
| `order_amount` | 99999.00 | |
| `order_sub_total_amount` | 99999.00 | |

### Test 3: Complex Item (if Test 2 shows backend recalculates, this test is optional)

**Step 10**: Only if Test 2 shows backend TRUSTS frontend values:
- Place an order with 1 item that has addons and/or variations
- Record item details: base price, addon prices, variation prices, quantities
- Manually calculate expected total using `buildCartItem` formula
- Compare frontend payload vs backend stored value
- This validates whether the specific addon/variation logic in `buildCartItem` matches backend expectations

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Test orders pollute real data | Use a test restaurant/table. Cancel orders after testing. |
| FormData monkey-patch breaks other requests | Restore `origAppend` immediately after test. Refresh page if unsure. |
| Order with ₹99999 triggers alerts | Cancel the test order immediately via the POS cancel flow. |
| Backend validates `order_amount` range and rejects | This IS a valid finding — record the error response as evidence that backend validates. |

---

## Acceptance Criteria

The validation is complete when ALL of the following are answered:

- [ ] **AC-1**: Test 1 completed — simple order values compared (match or differ?)
- [ ] **AC-2**: Test 2 completed — deliberately wrong value sent. Backend stored the wrong value (TRUSTS) or corrected it (RECALCULATES)?
- [ ] **AC-3**: If Test 2 = TRUSTS → Test 3 completed for complex item
- [ ] **AC-4**: Conclusion documented as one of:
  - **BACKEND TRUSTS**: Backend stores exactly what frontend sends. Financial accuracy is the frontend's sole responsibility.
  - **BACKEND RECALCULATES**: Backend independently computes totals. Frontend values are advisory/display.
  - **BACKEND VALIDATES**: Backend checks frontend values against its own calculation and rejects if they differ (error response). Frontend must match backend expectations.
  - **MIXED**: Backend recalculates some fields but trusts others (specify which).

---

## Evidence to Capture

Save the following artifacts:

1. **Screenshot or copy** of the place-order Network request payload (both Test 1 and Test 2)
2. **Console output** from the GET single-order response (both tests)
3. **Comparison table** showing frontend-sent vs backend-stored for all 6 financial fields
4. **Test 2 result**: Did backend store 99999.00 or the correct calculated value?
5. **Conclusion classification**: TRUSTS / RECALCULATES / VALIDATES / MIXED

Store in: `/app/memory/v2/evidence/RV1_financial_trust_result.md`

---

## Rollback Notes

N/A — this is a read-only validation task. Cancel any test orders created.

---

## Exact Next Prompt After Completion

**If result = BACKEND TRUSTS:**
```
RV-1 validated: backend TRUSTS frontend financial values.
Execute P0-1 (unify tax calculation) from REFACTOR_BACKLOG.md immediately.
Files: orderTransform.js, OrderEntry.jsx, CollectPaymentPanel.jsx.
Extract a shared calcItemFinancials() utility. Do not change API payload shapes.
Refer to TASK_P0_3_SOCKET_DEDUP.md for the parallel safe refactor.
```

**If result = BACKEND RECALCULATES:**
```
RV-1 validated: backend RECALCULATES financial totals independently.
Downgrade P0-1 and P0-2 to P1 priority (display-only issues).
Proceed with P0-3 (socket dedup) as the first implementation task.
Update RISK_REGISTER.md: change RISK-001 severity from HIGH to LOW.
Update VALIDATED_ARCHITECTURE.md Section 8: mark Pipeline A and Pipeline B as advisory.
```

**If result = BACKEND VALIDATES (rejects wrong values):**
```
RV-1 validated: backend VALIDATES frontend values against its own calculation.
P0-1 is critical — frontend values must match backend expectations exactly.
Before implementing P0-1, capture the backend's expected calculation for the test items
(from the error response or the corrected stored values).
Use these as the reference implementation for the shared calcItemFinancials() utility.
```
