# BACKEND-PRINT-001 — Print-temp-store column promotion for new owner-approved fields

**Filed**: 2026-05-17 · **Source**: POS2.0 Frontend Wave 4 Print Cluster owner-smoke follow-up · **Owner**: POS2.0 Backend team

---

## 1. Problem statement

The POS2.0 frontend `order-temp-store` request includes 6 owner-approved fields at the HTTP body top level that the backend does not currently persist as typed DB columns. They survive only inside the `raw_payload` text blob. Downstream consumers (print template, audit reports, analytics queries) that read DB columns directly cannot access these values without parsing the text blob.

This handoff was filed after the owner verified via DevTools (Order #000051, 2026-05-17) that the frontend payload is correct — see frontend investigation report `POS2_0_PRINT_PAYLOAD_FIELD_PROMOTION_PLAN_2026_05_17.md` and `POS2_0_PRINT_PAYLOAD_FIELD_PROMOTION_IMPLEMENTATION_REPORT_2026_05_17.md`.

---

## 2. Endpoint affected

`POST /api/v1/vendoremployee/order-temp-store`

---

## 3. Required DB migration

Add the following columns to the print-temp-store table (typically `order_temp_store` or equivalent):

```sql
ALTER TABLE order_temp_store
  ADD COLUMN rtype                      VARCHAR(8)     NULL,
  ADD COLUMN payment_status             VARCHAR(32)    NULL,
  ADD COLUMN payment_method             VARCHAR(32)    NULL,
  ADD COLUMN cgst_amount                DECIMAL(12,2)  NULL,
  ADD COLUMN sgst_amount                DECIMAL(12,2)  NULL,
  ADD COLUMN delivery_charge_gst_amount DECIMAL(12,2)  NULL;
```

If `emp_code` is missing as a typed column and is currently only inside `raw_payload`, add similarly: `ADD COLUMN emp_code VARCHAR(64) NULL`.

---

## 4. Handler / extractor update

In the `order-temp-store` controller, extract these 6 keys from the incoming JSON request body into the new columns:

| JSON key (top-level) | DB column | Type | Nullability | Notes |
|---|---|---|---|---|
| `rtype` | `rtype` | varchar(8) | nullable, default `'TB'` if absent on bill prints | Always emitted by frontend; `'RM'` for room orders, `'TB'` for all others |
| `payment_status` | `payment_status` | varchar(32) | nullable | May be empty string for pre-settle previews (Collect Bill panel); contains real value for paid orders. Preserve legacy backend typo `'sucess'` as-is |
| `payment_method` | `payment_method` | varchar(32) | nullable | May be empty string for pre-settle previews; contains real value for paid orders |
| `cgst_amount` | `cgst_amount` | decimal(12,2) | nullable | Composite split of `gst_tax`. **Preserve `gst_tax` column as composite total — do NOT replace it** |
| `sgst_amount` | `sgst_amount` | decimal(12,2) | nullable | Composite split of `gst_tax`. **Preserve `gst_tax` column as composite total — do NOT replace it** |
| `delivery_charge_gst_amount` | `delivery_charge_gst_amount` | decimal(12,2) | nullable | Present only on delivery orders (key absent on non-delivery). Phase 3 D-GST rule |

Keep the existing `raw_payload` blob persistence unchanged for backward compatibility during template rollout.

---

## 5. Existing column extraction (already working — confirm parity)

For reference, the following frontend keys already map correctly to DB columns:

| Frontend key | DB column |
|---|---|
| `orderNote` | `order_note` |
| `serviceChargeAmount` | `service_charge_amount` |
| `roomRemainingPay` | `room_remaining_pay` |
| `roomAdvancePay` | `room_advance_pay` |
| `roomGst` | `room_gst` |
| `Tip` | `tip_amount` |
| `Date` | `order_date` |
| `waiterName` | `waiter_name` |
| `tablename` | `table_name` |
| `custName` | `cust_name` |
| `custPhone` | `cust_phone` |
| `custGSTName` | `cust_gst_name` |
| `custGST` | `cust_gst` |

No changes needed to these — listed only so the new extractor follows the same camelCase → snake_case convention.

---

## 6. Print template / Blade update

The print Blade template should:
1. Read primarily from new top-level columns (`rtype`, `payment_status`, `payment_method`, `cgst_amount`, `sgst_amount`, `delivery_charge_gst_amount`)
2. Fall back to parsing `raw_payload` JSON for the same key names during rollout
3. Display CGST + SGST as separate lines when both are populated (existing template likely already shows composite `gst_tax` — split into 2 lines)

---

## 7. Audit report / analytics

With these columns added, the Audit Report Paid tab can:
- Filter by `payment_status` / `payment_method` columns directly (no `raw_payload` parsing)
- Filter room vs non-room bills by `rtype = 'RM'` vs `rtype = 'TB'`

---

## 8. Sample payload (Order #000051, 2026-05-17, room order)

```json
{
  "order_id": 868514,
  "restaurant_order_id": "000051",
  "print_type": "bill",
  "payment_amount": 2676,
  "grant_amount": 11510,
  "order_item_total": 2119,
  "order_subtotal": 2330.9,
  "discount_amount": 0,
  "coupon_code": "",
  "loyalty_dicount_amount": 0,
  "wallet_used_amount": 0,
  "Date": "16/May/2026 4:54 PM",
  "waiterName": "Saurav",
  "tablename": "102",
  "custName": "parth",
  "custPhone": "9696759718",
  "custGSTName": "",
  "custGST": "",
  "billFoodList": [],
  "orderNote": "",
  "serviceChargeAmount": 211.9,
  "roomRemainingPay": 7000,
  "roomAdvancePay": 3000,
  "roomGst": 0,
  "associated_orders": [],
  "deliveryCustName": "",
  "deliveryAddressType": "",
  "deliveryCustAddress": "",
  "deliveryCustPincode": "",
  "deliveryCustPhone": "",
  "Tip": 0,
  "station_kot": "",
  "order_type": "pos",
  "rtype": "RM",
  "payment_status": "unpaid",
  "payment_method": "pending",
  "gst_tax": 144.54,
  "cgst_amount": 72.27,
  "sgst_amount": 72.27,
  "vat_tax": 61.6,
  "delivery_charge": 0,
  "printer_agent": [{ "station": "BILL", "printer_agent_id": "4497", ... }]
}
```

---

## 9. QA checklist (for backend rollout)

| # | Check | Pass criteria |
|---|---|---|
| 1 | Migration runs cleanly on staging | No data loss |
| 2 | New columns nullable | Old rows have NULL values |
| 3 | Handler extracts new keys | New rows populate new columns |
| 4 | `raw_payload` blob still populated | Backward-compatible |
| 5 | Print Blade reads new columns | Receipt renders correctly |
| 6 | Audit Report Paid tab filter | Works on `payment_status` / `payment_method` |
| 7 | Frontend smoke: print on every channel | Receipt identical pre/post rollout |
| 8 | No regression on existing columns | `order_note`, `service_charge_amount`, etc. still populated |

---

## 10. Risk assessment

| Risk | Severity | Mitigation |
|---|---|---|
| Migration column rename collision | Low | Pure additive migration — no existing column renamed or dropped |
| Print template hard-coded to `raw_payload` only | Low | Update template to read top-level with `raw_payload` fallback during rollout |
| Existing audit / analytics break | Low | Migration is additive; existing columns untouched |
| Frontend regression | None | No frontend code change required |

---

## 11. Contact / coordination

- **Frontend lead**: confirms no further frontend change needed; flat-payload contract already correct
- **Owner**: approved this handoff 2026-05-17 (Option A)
- **Reference docs** (in `/app/memory/change_requests/final_sprint_reconciliation/`):
  - `POS2_0_PRINT_PAYLOAD_FIELD_PROMOTION_PLAN_2026_05_17.md`
  - `POS2_0_PRINT_PAYLOAD_FIELD_PROMOTION_IMPLEMENTATION_REPORT_2026_05_17.md`

---

*— End of BACKEND-PRINT-001 handoff brief —*
