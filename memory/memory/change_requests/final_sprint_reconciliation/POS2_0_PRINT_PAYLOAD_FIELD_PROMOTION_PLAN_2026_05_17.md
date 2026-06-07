# POS2.0 Print Payload Field Promotion — Investigation Plan — 2026-05-17

## 1. Executive summary

**Verdict: BACKEND TICKET. No frontend code change required.**

The reported "fields only inside `raw_payload`" issue is caused by the backend `order-temp-store` handler not having DB columns or extractors for newer fields. The frontend already sends ALL approved fields at the top level of the HTTP request body — verified by owner via DevTools Network → Request Payload capture on 2026-05-17 (Order #000051, room order).

---

## 2. Files inspected

| File | Lines | Finding |
|------|-------|---------|
| `frontend/src/api/transforms/orderTransform.js` | L1300-1794 (`toAPI.buildBillPrintPayload`) | Builds single flat object with all fields top-level. No nested `raw_payload` key. |
| `frontend/src/api/services/orderService.js` | L131-170 (`printOrder`) | Appends `printer_agent` at top level (L158), then POSTs flat object to `API_ENDPOINTS.PRINT_ORDER`. |
| `frontend/src/api/constants.js` | L60 | `PRINT_ORDER: '/api/v1/vendoremployee/order-temp-store'` |

No `raw_payload` key is generated anywhere in the frontend codebase (confirmed via grep across `/app/frontend/src/`).

---

## 3. Current payload construction path

```
buildBillPrintPayload(order, scPct, overrides)
   ↓ returns flat object
{ order_id, restaurant_order_id, print_type, payment_amount, grant_amount,
  order_item_total, order_subtotal, discount_amount, coupon_code,
  loyalty_dicount_amount, wallet_used_amount, Date, waiterName, tablename,
  custName, custPhone, custGSTName, custGST, billFoodList,
  orderNote, serviceChargeAmount, roomRemainingPay, roomAdvancePay, roomGst,
  associated_orders,
  deliveryCustName, deliveryAddressType, deliveryCustAddress,
  deliveryCustPincode, deliveryCustPhone,
  Tip, station_kot, order_type,
  rtype, payment_status, payment_method,
  gst_tax, cgst_amount, sgst_amount, vat_tax, delivery_charge,
  ...(delivery_charge_gst_amount conditional) }
   ↓
printOrder() adds:
  + printer_agent: [...]
   ↓
api.post('/api/v1/vendoremployee/order-temp-store', payload)
```

---

## 4. Owner-verified DevTools evidence (Order #000051, room order, 2026-05-17)

```
order_id: 868514
restaurant_order_id: "000051"
print_type: "bill"
payment_amount: 2676
grant_amount: 11510
order_item_total: 2119
order_subtotal: 2330.9
discount_amount: 0
coupon_code: ""
loyalty_dicount_amount: 0
wallet_used_amount: 0
Date: "16/May/2026 4:54 PM"
waiterName: "Saurav"
tablename: "102"
custName: "parth"
custPhone: "9696759718"
custGSTName: ""
custGST: ""
billFoodList: [...]
orderNote: ""                ← TOP-LEVEL ✓
serviceChargeAmount: 211.9   ← TOP-LEVEL ✓
roomRemainingPay: 7000       ← TOP-LEVEL ✓
roomAdvancePay: 3000         ← TOP-LEVEL ✓
roomGst: 0                   ← TOP-LEVEL ✓
associated_orders: [...]
deliveryCustName, deliveryAddressType, deliveryCustAddress,
  deliveryCustPincode, deliveryCustPhone: ""
Tip: 0
station_kot: ""
order_type: "pos"
rtype: "RM"                  ← TOP-LEVEL ✓ (was: only in raw_payload string column)
payment_status: "unpaid"     ← TOP-LEVEL ✓ (was: only in raw_payload string column)
payment_method: "pending"    ← TOP-LEVEL ✓ (was: only in raw_payload string column)
gst_tax: 144.54              ← TOP-LEVEL ✓
cgst_amount: 72.27           ← TOP-LEVEL ✓ (was: only in raw_payload string column)
sgst_amount: 72.27           ← TOP-LEVEL ✓ (was: only in raw_payload string column)
vat_tax: 61.6                ← TOP-LEVEL ✓
delivery_charge: 0           ← TOP-LEVEL ✓
printer_agent: [...]         ← TOP-LEVEL ✓
```

All 15 listed approved fields are at the HTTP body top level. NO nesting.

---

## 5. Field-by-field status table

| Field | Frontend payload | Backend DB column visible at top level | Source of mismatch |
|-------|------------------|----------------------------------------|---------------------|
| `orderNote` | ✅ top-level (camelCase) | ✅ `order_note` (snake) | Backend has name mapper |
| `serviceChargeAmount` | ✅ top-level (camelCase) | ✅ `service_charge_amount` | Backend has name mapper |
| `roomRemainingPay` | ✅ top-level | ✅ `room_remaining_pay` | Backend has name mapper |
| `roomAdvancePay` | ✅ top-level | ✅ `room_advance_pay` | Backend has name mapper |
| `roomGst` | ✅ top-level | ✅ `room_gst` | Backend has name mapper |
| `Tip` | ✅ top-level | ✅ `tip_amount` | Backend has name mapper |
| `Date` | ✅ top-level | ✅ `order_date` | Backend has name mapper |
| `gst_tax` | ✅ top-level | ✅ `gst_tax` | Same name |
| `vat_tax` | ✅ top-level | ✅ `vat_tax` | Same name |
| `delivery_charge` | ✅ top-level | ✅ `delivery_charge` | Same name |
| `associated_orders` | ✅ top-level | ⚠️ stored as nullable JSON | Already mapped |
| `printer_agent` | ✅ top-level | ⚠️ inside raw_payload only | **No backend column** |
| `rtype` | ✅ top-level | ❌ inside raw_payload only | **No backend column** |
| `payment_status` | ✅ top-level | ❌ inside raw_payload only | **No backend column** |
| `payment_method` | ✅ top-level | ❌ inside raw_payload only | **No backend column** |
| `cgst_amount` | ✅ top-level | ❌ inside raw_payload only | **No backend column** |
| `sgst_amount` | ✅ top-level | ❌ inside raw_payload only | **No backend column** |
| `delivery_charge_gst_amount` | ✅ top-level (conditional) | ❌ inside raw_payload only | **No backend column** |
| `vendoremployee` | ❌ not sent by frontend | ⚠️ inside raw_payload | Backend-injected — out of frontend scope |
| `emp_code` | ❌ not sent by frontend | ⚠️ inside raw_payload | Backend-injected — out of frontend scope |

---

## 6. Required backend changes (handoff brief)

### 6.1 Database migration on `order_temp_store` (or equivalent table)
Add columns:
```sql
ALTER TABLE order_temp_store
  ADD COLUMN rtype VARCHAR(8) NULL,                       -- 'RM' | 'TB'
  ADD COLUMN payment_status VARCHAR(32) NULL,             -- 'paid' | 'unpaid' | 'sucess' (legacy typo)
  ADD COLUMN payment_method VARCHAR(32) NULL,             -- 'cash' | 'card' | 'upi' | 'pending' | ...
  ADD COLUMN cgst_amount DECIMAL(12,2) NULL,
  ADD COLUMN sgst_amount DECIMAL(12,2) NULL,
  ADD COLUMN delivery_charge_gst_amount DECIMAL(12,2) NULL;
  -- emp_code already populated by backend; if missing, add similarly.
```

### 6.2 Handler update (`order-temp-store` controller)
- Extract these 6 keys from incoming JSON into the new columns
- Keep existing `raw_payload` blob persistence unchanged for backward compatibility
- Field-by-field nullability:
  - `rtype` — always present on bill prints; default `'TB'` if absent
  - `payment_status` / `payment_method` — may be empty string for pre-settle previews
  - `cgst_amount` / `sgst_amount` — composite split of `gst_tax`; preserve `gst_tax` as the composite total
  - `delivery_charge_gst_amount` — present only when applicable (Phase 3 D-GST rule)

### 6.3 Print template / downstream consumers
- Print Blade template (or equivalent) should read from new top-level columns where available, falling back to `raw_payload` parsing if migration is rolled out gradually.
- Audit report queries can index on `rtype` / `payment_status` / `payment_method` for filtering.

---

## 7. Proposed mapping change on frontend

**NONE.** Frontend is already sending all fields at the top level. No code change needed.

If the backend team requests it, the only frontend-side option is to rename camelCase keys to snake_case for parity:
- `orderNote` → `order_note`
- `serviceChargeAmount` → `service_charge_amount`
- `roomRemainingPay` → `room_remaining_pay`
- `roomAdvancePay` → `room_advance_pay`
- `roomGst` → `room_gst`
- `Tip` → `tip_amount`
- `Date` → `order_date`
- `waiterName` → `waiter_name`
- `tablename` → `table_name`
- `custName` → `cust_name` (etc.)

⚠️ This would risk breaking existing backend column extraction if the backend currently relies on name aliases. **NOT recommended without backend coordination.**

---

## 8. Wave attribution

This belongs in a **separate backend payload mapping patch**, not in Wave 4 Print Cluster or Wave 2 BUG-083:

- Wave 4 Print Cluster (BUG-050, BUG-057, BUG-059, PRINT-002) is **closed** — owner-smoke verified the frontend-emitted fields are correct.
- Wave 2 BUG-083 (delivery GST key) is also closed on the frontend side — `delivery_charge_gst_amount` is correctly emitted conditional on non-delivery, but the backend doesn't persist it as a column.
- **New ticket recommended**: `BACKEND-PRINT-001 — Print-temp-store column promotion for new owner-approved fields` (DB migration + handler extractor + template consumer update).

---

## 9. QA checks (when backend ticket lands)

| # | Check | Expected |
|---|-------|----------|
| 1 | Print payload still contains `raw_payload` text column | ✅ |
| 2 | New top-level columns present: `rtype`, `payment_status`, `payment_method`, `cgst_amount`, `sgst_amount` | ✅ |
| 3 | `associated_orders` JSON column remains present and valid | ✅ |
| 4 | Room bill payload exposes `rtype: 'RM'`, `roomRemainingPay/roomAdvancePay/roomGst` columns | ✅ |
| 5 | Tax columns expose composite `gst_tax` + split `cgst_amount`/`sgst_amount` | ✅ |
| 6 | Delivery order exposes `delivery_charge_gst_amount` only when applicable | ✅ |
| 7 | Non-delivery orders do not have a non-null `delivery_charge_gst_amount` | ✅ |
| 8 | Print Blade template renders from top-level columns | ✅ |
| 9 | No totals double-counted | ✅ |
| 10 | Existing bill print works for dine-in / takeaway / delivery / room | ✅ |

---

## 10. Risk assessment

| Risk | Severity | Mitigation |
|------|---------|-----------|
| Backend column rename collisions during migration | Medium | Add columns additively; do not rename existing |
| Print template hard-coded to read `raw_payload` only | Low | Update template to read top-level with `raw_payload` fallback |
| Existing audit / analytics queries break | Low | Migration is additive; existing columns untouched |
| Frontend-side regression | **None** | No frontend code change |

---

## 11. Files not touched / scope guard

- ❌ `/app/memory/final/` — not updated (freeze docs respected)
- ❌ Pending freeze docs — untouched
- ❌ Wave 4 Print Cluster baseline docs — untouched (Wave 4 closed; this is a separate ticket)
- ❌ No frontend production code changed
- ❌ No bug status flipped to QA-passed

---

## 12. Owner decision required

- **(A)** File the backend handoff ticket (`BACKEND-PRINT-001`) with §6 specification; close this thread on the frontend side
- **(B)** Renaming frontend keys to snake_case proactively (risky, not recommended without backend coordination)
- **(C)** Defer; observe whether the missing fields actually break a real consumer first, then decide

Reply **A / B / C**.

---

*— End of POS2.0 Print Payload Field Promotion — Investigation Plan — 2026-05-17 —*
