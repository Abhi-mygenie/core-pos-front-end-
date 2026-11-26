# BACKEND_BRIEF_BATCH-C — Batch C FE Impact Analysis Backend Asks — 2026-11-15

**Assigned to:** Gyan
**Priority:** P0 (CR-524 blocks FE implementation; CR-528 partial — workaround available)
**Classification:** CONTRACT_MISMATCH (CR-524) + DATA_GAP (CR-528)
**Frontend impact:** CR-524 Punch Time + Duration columns cannot be computed without `created_at`; CR-528 post-print-edit section requires a print timestamp

---

## ASK 1 — CR-524: Add `created_at` to insights-cancellations items

### Summary
- Issue: `created_at` (item punch timestamp) is absent from the `insights-cancellations` API response. The FE needs it to compute "Cancellation Duration" (minutes between item punch and cancellation).
- Classification: CONTRACT_MISMATCH — field exists in backend DB but not surfaced in API
- Frontend impact: CR-524 "Punch Time" and "Cancellation Duration" columns cannot be shown
- Priority: P0 / LOW risk

### Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/insights-cancellations`
- Auth: Bearer token (restaurant employee)

### Current response (items array — observed 2026-11-15, RID 644):
```
food_id, name, food_name, unit_price, scope, qty, amount, value, item_total,
discount, service_charge, gst, vat, stage, cancel_type, reason, notes,
cancel_date, cancel_time, cancelled_by, punched_by, station,
order_id, order_number, restaurant_order_id, table_no, table_name, order_date
```
`cancel_time` = "16:15" (HH:MM only, no date component)

### Required additions:
```json
{
  "created_at": "2026-11-01T16:10:00",  // full ISO — when the food item was punched/added
  "cancel_time_full": "2026-11-01T16:15:00"  // optional: full ISO cancel datetime
                                              // FE can combine cancel_date + cancel_time if kept as-is
}
```

**Minimum ask:** Add `created_at` (full ISO datetime) per item.
**FE will compute:** `duration_min = Math.max(0, Math.round((cancel_datetime - created_at_datetime) / 60000))`

---

## ASK 2 — CR-528: Add `bill_printed_at` timestamp to order-logs-report

### Summary
- Issue: `orders_table.print_bill_status` exists (Yes/No) but no timestamp of WHEN the bill was printed. FE needs the timestamp to filter `operations` and item-level `cancel_at` values to those that occurred AFTER bill print.
- Classification: DATA_GAP — field present but incomplete
- Frontend impact: CR-528 "Post-Bill-Print Changes" section can filter orders (using Yes/No flag) but cannot accurately determine which operations happened AFTER the print without a timestamp
- Priority: P0 / MEDIUM (workaround: use `collect_bill` as proxy)

### Endpoint
- Method: POST
- URL: `/api/v2/vendoremployee/report/order-logs-report`
- Auth: Bearer token

### Current response (orders_table per order — observed 2026-11-15, RID 644):
```
print_bill_status: 'No'  ← exists, but only Yes/No, no timestamp
collect_bill: '2026-11-01 21:39:31'  ← payment collection time (NOT print time)
```

### Required addition:
```json
{
  "bill_printed_at": "2026-11-01 21:35:00"  // datetime when bill was first printed
                                             // null if never printed
}
```

### Workaround (acceptable if backend cannot add timestamp quickly):
FE will use `collect_bill` as proxy for bill-print time. This is conservative — catches only edits between print and collection. Known limitation: documented in release notes.

### Also confirm:
- What values does `print_bill_status` take? FE assumes `'Yes'` / `'No'`. Confirm expected values.
- Does `operations[*].operation = 'item_cancel'` or similar exist? Currently only `order_edit` seen for edits. Confirm if item-level cancellations also appear as operations, or only in `order_details_table[*].cancel_at`.

---

## REVISION 2026-11-15 — after write probe (orders 1578757–1578760, all cancelled)

Evidence: `/app/memory/evidence/BATCH-C-IA/probes_2026_11_15_write/`

### ASK 1 (CR-524) — updated
- Return `punched_at` per cancelled line = the ORIGINAL line's add time. Partial cancel splits the line and the new row's `created_at` = cancel time (row 3969224 vs parent 3969222).
- Same timezone as `cancel_time` (IST), or ISO with offset. Today `order_details.created_at` is UTC Z and everything else is IST.
- Order-scope cancels: return item-level lines (or per-item `punched_at`). Owner wants one duration per item.

### ASK 2 (CR-528) — upgraded to BLOCKING, no proxy (owner)
- `update-print-status` bill_print=Yes returns `bill_print_count: 1`, but `print_bill_status` stays 'No' and nothing appears in `operations[]`. Please:
  1. Persist `print_bill_status` = Yes on print.
  2. **Owner round 3: REQUIRED** — log a `bill_print` event in `operations[]` for **every** bill print, including reprints after an edit (time, employee, order amount at print). Also give `bill_print_count` and `bill_printed_at` (latest print) on orders_table in `order-logs-report`.
  3. Fix `order_edit` previous/current_order_amount (logged 420→420 while order went 420→630).
  4. Log order-level cancel in `operations[]` (`item_cancel` already exists).

---

## Evidence artifacts

```
/app/memory/evidence/BATCH-C-IA/probes_2026_11_15/
  01c_cr524_items_full.txt   — CR-524: full item keys, created_at MISSING confirmed
  02g_cr528_orders_table_full.txt — CR-528: full orders_table, no bill_printed_at
  02f_cr528_ops_detail.txt   — CR-528: operations types incl. order_edit
```

---

## Frontend workaround (if delayed)

| Ask | Workaround | Quality |
|-----|-----------|---------|
| CR-524 `created_at` | Cannot show Punch Time or Duration columns | No workaround — feature blocked |
| CR-528 `bill_printed_at` | ~~Use `collect_bill` as proxy~~ — rejected by owner 2026-11-15 | Feature blocked until backend |
