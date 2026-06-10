# Investigation Handover — Report Bill Summary Rounding + Sequence Issues

## Context
During CR investigation on the Order Detail Sheet (used by Audit Report + Order Ledger), two issues were found:

1. **Sequence fix** — already implemented this session (CR not registered)
2. **Display rounding** — ~~discovered via live API data, needs further investigation~~ **FIXED (2026-06-11)**

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

## Issue 2: Display Rounding — FIXED (2026-06-11)

### Root cause
`formatCurrency` / `fmtCur` functions across 12 report files used `maximumFractionDigits: 0` or `Math.round()`, rounding all currency values to integers.

### Fix applied
All 12 functions updated to show decimals when the value has them, hide `.00` for whole numbers:
```js
const hasDecimals = n % 1 !== 0;
minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 2
```

### Files fixed (12):
1. `components/reports/OrderDetailSheet.jsx`
2. `components/reports/OrderTable.jsx`
3. `components/reports/SummaryBar.jsx`
4. `components/reports/RoomRowCard.jsx`
5. `pages/reports-module/OrderLedgerMockup.jsx` (fmtCur)
6. `pages/reports-module/FoodCourtMockup.jsx`
7. `pages/reports-module/RoomOrdersMockup.jsx`
8. `pages/reports-module/SettlementReportMockup.jsx`
9. `pages/reports-module/DashboardMockup.jsx`
10. `pages/reports-module/ItemSalesMockup.jsx`
11. `pages/reports-module/PrepServeTimeMockup.jsx`
12. `pages/reports-module/EdgeStatesMockup.jsx`

### Already correct (no change needed):
- `OrderLedgerMockup.jsx` L839 (`fc` — audit drill-down)
- `ItemSalesHybridMockup.jsx`
- `ExportButtons.jsx`
- `ItemDrillSheet.jsx`

---

## Additional fixes in same session (2026-06-11)

### singleOrderNew transform — missing financial fields (FIXED)
Added 12 fields to `singleOrderNew` return block in `reportTransform.js`: `itemTotal`, `gstAmount`, `vatAmount`, `serviceChargeAmount`, `tipAmount`, `roundOff`, `discountAmount`, `couponCode`, `couponAmount`, `deliveryChargeGst`, `orderNote`. Fixed `subtotal` to read from backend.
**Impact:** OrderDetailSheet FETCH MODE (Credit Panel drill-down) now shows correct bill summary.

### orderLogsReportRow — missing fields (FIXED)
Added to transform: `customerPhone`, `customerEmail`, `customerContact`, `transactionRef`, `deliveryAddress`, `roomTotal`, `roomAdvance`, `roomBalance`, `roomCheckout`. Wired into `toLedgerRow()` in `orderLedgerService.js`.

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
- **FETCH MODE** (L503): calls `getSingleOrderNew()` → uses `singleOrderNew` transform — **NOW FIXED** with all financial fields

---

## Related open items
- **CR-025** (Discount payload) — implemented, awaiting smoke test
- **Report sequence fix** — implemented (no CR registered), awaiting smoke test
- **Gap 4** (Partial payment breakup in reports) — **BACKEND ASK** — `order-logs-report` doesn't return cash/card/upi breakdown
- **Credit Panel TOTAL CREDIT / TOTAL PAID** — **BACKEND ASK** — `tap-waiter-list` needs totals at top level
