# Investigation Handover — Report Bill Summary Rounding + Sequence Issues

## Context
During CR investigation on the Order Detail Sheet (used by Audit Report + Order Ledger), two issues were found:

1. **Sequence fix** — already implemented this session (CR not registered)
2. **Display rounding** — discovered via live API data, needs further investigation

---

## Issue 1: Sequence (FIXED — needs smoke test)

**File:** `src/components/reports/OrderDetailSheet.jsx` (L797-852)

The bill summary line items were in wrong order. Fixed to:
```
1. Item Total
2. Discount / Coupon
3. Service Charge (if > 0)
4. Delivery Charge (if > 0)
5. Tip (if > 0)
   ── Subtotal ──
6. GST (if > 0, hidden when zero)
7. VAT (if > 0, hidden when zero)
8. Round-off (if ≠ 0)
   ── Grand Total ──
```

GST and VAT now hide when zero (previously always visible).

---

## Issue 2: Display Rounding (OPEN — needs investigation)

### Evidence: Order 012661 (cafe103, DB id: 939673)

**API returns:**
```
order_sub_total_amount:    334
total_gst_tax_amount:      14.50
round_up:                  0.50
order_amount:              349
```

**Math:** 334 + 14.50 + 0.50 = 349 ✅

**Screenshot shows:**
```
Item Total    ₹334
GST           ₹15      ← should be ₹14.50
Round-off     ₹1       ← should be ₹0.50
Grand Total   ₹349
```

**Visible math:** 334 + 15 + 1 = 350 ≠ 349 — **contradicts Grand Total**

### Root cause hypothesis
The `formatCurrency` function (or the way values are displayed) is rounding to nearest integer. Need to check:

1. **`formatCurrency` function** in OrderDetailSheet — is it rounding?
   ```bash
   grep -n 'formatCurrency' /app/frontend/src/components/reports/OrderDetailSheet.jsx | head -5
   ```
   Then find its definition and check if it rounds.

2. **Should show decimals** — ₹14.50 should display as `₹14.50`, not `₹15`. The formatCurrency should use 2 decimal places for non-integer values.

3. **Check if this affects Order Ledger too** — the Order Ledger uses the same `orderLogsReportRow` data but renders via table cells. Check if the Ledger table also rounds.

### Files to investigate
- `src/components/reports/OrderDetailSheet.jsx` — find `formatCurrency` definition or import
- Check if it's `Math.round()`, `.toFixed(0)`, or `toLocaleString()` without decimal options
- The Order Ledger (`src/pages/reports-module/OrderLedgerMockup.jsx`) uses `fc()` / `fmtCur()` — check those too

### Fix direction
`formatCurrency` should show:
- `₹14.50` when value has decimals (not ₹15)
- `₹334` when value is a whole number (no unnecessary `.00`)

Or always show 2 decimals: `₹14.50`, `₹334.00` — owner decision needed.

---

## API Credentials for Testing

### Cafe 103
- **Email:** owner@cafe103.com
- **Password:** Qplazm@10
- **Test order:** 012661 (DB id: 939673, date: 2026-06-10)

### Kunafa Mahal
- **Email:** owner@kunafamahal.com
- **Password:** Qplazm@10

### How to fetch order data via API
```bash
API_URL="https://preprod.mygenie.online"
TOKEN=$(curl -s -X POST "$API_URL/api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@cafe103.com","password":"Qplazm@10"}' | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

curl -s -X POST "$API_URL/api/v2/vendoremployee/report/order-logs-report" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sort_by":"created_at","from_date":"2026-06-10","to_date":"2026-06-11"}'
```

The response structure: `response.order[]` → each has `orders_table` (DB row) + `order_details_table[]` (items) + `operations[]` (activity log).

---

## Data pipeline recap

Both Audit Report and Order Ledger use the SAME pipeline:
```
API: POST /api/v2/vendoremployee/report/order-logs-report
  → response.data.order[]
  → reportListFromAPI.orderLogsReport() [reportTransform.js L1079]
  → orderLogsReportRow() [reportTransform.js L824-1067]
  → reads ALL financial fields from orders_table (NO recomputation)
```

Order Ledger adds one extra layer:
```
  → toLedgerRow() [orderLedgerService.js L48-110]
  → maps transform output to ledger column names
```

The OrderDetailSheet gets data via two paths:
- **DATA MODE** (L496): `order.items` already present → uses the order-logs transform data directly
- **FETCH MODE** (L503): calls `getSingleOrderNew()` → uses `singleOrderNew` transform which is MISSING most financial fields (only has `subtotal` re-computed from items + `amount`)

For Audit Report drill-down, DATA MODE is used (order already has items from order-logs). For other consumers (Credit panel), FETCH MODE is used and financial data is incomplete.

---

## Related open items
- **CR-025** (Discount payload) — implemented, awaiting smoke test
- **Report sequence fix** — implemented (no CR registered), awaiting smoke test
- **`singleOrderNew` transform gaps** — missing `discountAmount`, `gstAmount`, `serviceChargeAmount`, `tipAmount`, `roundOff`, `itemTotal` — separate issue from rounding, affects FETCH MODE consumers only
