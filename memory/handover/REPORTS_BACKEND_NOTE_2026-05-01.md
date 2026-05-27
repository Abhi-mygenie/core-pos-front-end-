# Backend Note — Reports module field gaps (2026-05-01)

**To:** Backend team
**From:** Frontend / Implementation
**Tenant evidence:** preprod — `owner@welcomeresort.com` / `owner@18march.com`
**Branch evidence:** `core-pos-front-end-` @ `CR-28-april`

---

## 0. Summary

Frontend has wired everything it can against current `/order-logs-report` and `/get-single-order-new` payloads. **4 fields remain genuinely missing** in the API response and block visible UX. Each is documented below with: spec ref, sample evidence, frontend consumer, and operational impact.

A live console diagnostic (`[BE-1 PENDING]` warnings, dev-mode only) will go silent the moment each of these starts shipping — no backend ping needed; QA can self-verify.

---

## 1. Asks — priority order

### 1.1 P0 · `cancel_by_name` / `cancel_by_id` on **order-level** cancellations
**Endpoint:** `POST /api/v2/vendoremployee/report/order-logs-report` → `orders_table.*`
**Spec ref:** BE-1 P2 (cancelled rows)

**Current state:**
- `orders_table.canceled_by` is **always `null`** even on cancelled rows.
- Item-level (`order_details_table[i].cancel_by_name`) IS populated when an individual item is cancelled (e.g. `"counter2"`, `"p"`).
- For **whole-order** cancels (the case where `payment_method === 'Cancel'`), no name resolves anywhere → ACTIONED BY column is blank.

**Live evidence (welcomeresort 2026-04-29, order 822509):**
```json
{
  "orders_table": {
    "id": 822509,
    "payment_method": "pending",
    "f_order_status": 3,
    "canceled_by": null,           ← null
    "cancel_by_name": null         ← absent / null
  },
  "order_details_table": [{
    "cancel_by": "3631",
    "cancel_by_name": "counter2",  ← only here
    "cancel_type": "Post-Serve"
  }]
}
```

**Ask:** populate `orders_table.cancel_by_id` + `orders_table.cancel_by_name` on every cancelled row, including whole-order cancels (where item-level fields are also null because nothing was specifically item-cancelled).

**Frontend consumer:** `reportService.js:830-840` `actionedBy` resolver, falls back to item-level today.

**Console signal:** `[BE-1 PENDING] pending_cancel_by_name` lists row IDs that are missing both order-level and item-level fields.

---

### 1.2 P0 · `cancellation_reason` consistency
**Endpoint:** same — `orders_table.cancellation_reason`
**Spec ref:** BE-1 P3

**Current state:**
- Backend ships the canonical key `cancellation_reason` (✓ — confirmed 2026-04-28 on 18march tenant: value `"Hdgshhshs"`).
- BUT it's populated **only when an operator types a reason at order-level cancel time**.
- For item-level cancellations rolled up to order level, `orders_table.cancellation_reason` is **null** even though `order_details_table[0].cancel_reason_text` may carry the same operator text.
- For whole-order cancels with no typed reason, also null.

**Live evidence (welcomeresort 2026-04-29, order 822509):**
```json
{
  "orders_table": { "cancellation_reason": null },
  "order_details_table": [{ "cancel_reason_text": null }]
}
```

vs (18march 2026-04-28, order 819018):
```json
{
  "orders_table": { "cancellation_reason": "Hdgshhshs" }   ← shipped
}
```

**Ask:** when item-level cancel reason text exists, propagate it to `orders_table.cancellation_reason` so the Cancelled tab REASON column is always populated when a reason was captured anywhere in the cancellation flow.

**Frontend consumer:** `reportService.js:858` `cancellationReason: api.cancellation_reason || ''`. No fallback per product policy — UI shows blank when BE is null.

**Console signal:** `[BE-1 INVARIANT] cancellation_reason` lists cancelled rows where the field is null. (Currently this fires on welcomeresort but not 18march — the inconsistency is exactly what we need fixed.)

---

### 1.3 P1 · Lodging `discount_amount` and `discount_reason`
**Endpoint:** `POST /api/v2/vendoremployee/report/order-logs-report` → wrapper-level `room_info.*`
**Also:** `POST /api/v2/vendoremployee/get-single-order-new` → `room_info.*`
**Spec ref:** BE-2 §4.1

**Current state:**
- Backend ships these `room_info` fields already (✓): `room_price`, `advance_payment`, `balance_payment`, `receive_balance`, `payment_status`, `balance_payment_mode`, `room_no`, `checkin_date`, `checkout_date`, `booking_type`.
- Backend does **not** ship `discount_amount` or `discount_reason`.
- Frontend currently *derives* discount as `room_price - advance_payment - receive_balance` on settled rooms (`f_order_status === 6 AND payment_status === 'paid'`). This **only flags amounts**, not reasons, and cannot distinguish operator under-collection from approved discount.

**Live evidence (welcomeresort 2026-04-29 7 settled rooms):**
All reconcile to `discount = 0` because no actual under-collection in sample. The math is correct; we just can't yet show the *why* when a discount happens.

**Ask:**
1. `room_info.discount_amount` (numeric, default `0.00`) — explicit lodging discount amount.
2. `room_info.discount_reason` (string, nullable) — operator-entered reason or selected category.

**Frontend consumer:** `RoomRowCard.numbers` prefers explicit over derived: `const discount = explicitDiscount > 0 ? explicit : derived`. Discount column + summary stat already wired — just need the field.

**Console signal:** `[BE-1 PENDING] pending_room_info_discount` and `[BE-2 INVARIANT] settled room <id> has ₹<gap> cash gap` — actively running on welcomeresort.

---

### 1.4 P2 · `merge_by_name` / `merge_by_id` on merged orders
**Endpoint:** same — `orders_table.*`
**Spec ref:** BE-1 P2 (merged)

**Current state:**
- No merged-order samples observed in any tenant audited (welcomeresort, 18march). Cannot confirm field shape exists at all.
- ACTIONED BY column for merged rows shows blank.

**Ask:** when a merge action records `payment_method === 'Merge'` (or `merged`), populate `orders_table.merge_by_id` + `orders_table.merge_by_name`.

**Frontend consumer:** `reportService.js:842-846` already wired; will pass through `resolveName()` once shipped.

**Console signal:** `[BE-1 PENDING] pending_merge_by_name` (only fires on rows where `payment_method === 'Merge' || 'merged'`).

---

### 1.5 P3 · Zero `balance_payment` post-checkout (or convention doc)
**Endpoint:** any returning `room_info.balance_payment`
**Status:** **Frontend already works around it.** Filing as a convention concern, not a blocker.

**Current state:**
- `balance_payment` retains the *pre-checkout receivable* on settled rooms.
- Frontend ignores it when `f_order_status === 6` (per CR-004 Rule 2 — locked with product 2026-04-29).
- Math reconciles cleanly. No user-facing bug.

**Ask (cleanup, not urgent):** either zero out `balance_payment` post-checkout for clarity, or document this convention in your API spec so other consumers know to ignore it on settled rooms. Frontend code comments already note this — see `RoomRowCard.jsx:340-399` and `orderTransform.js:312`.

---

## 2. Asks NOT in this list (already shipped)

To avoid noise — these have been verified live and are working:
- `waiter_name` (P1) — every row ✓
- `table_name` (P5) — dine-in rows ✓
- `cancel_type` (P4) at item level (`Pre-Serve` / `Post-Serve` / `Order` / `full`) ✓
- `employee_name` (P2 paid) — every paid row ✓
- `room_info` block on `/order-logs-report` RM rows (P6 / BE-2 §4.3) ✓
- `room_info.receive_balance` / `room_info.payment_status` (BE-2 §4.1 partial) ✓
- `associated_orders[i].order_status === 6` for settled SRMs (G3 — frontend uses this directly, no separate `payment_status` needed) ✓

---

## 3. Verification mechanism for backend QA

Frontend ships a self-running diagnostic in dev builds:

- `[BE-1 INVARIANT] /order-logs-report — N row(s) missing 'field'` → fires when a previously-shipped field is now absent (regression detector).
- `[BE-1 PENDING] /order-logs-report — N row(s) missing 'pending_field'` → fires while a field is still missing (will go silent the moment it ships).
- `[BE-2 INVARIANT] settled room <id> has ₹<gap> cash gap` → fires per settled room with a real reconciliation gap.

**To verify a fix landed:** open `https://preprod.mygenie.online` → log in → open `/reports/audit` or `/reports/rooms` → open browser DevTools Console → reload report. The relevant `PENDING` line will simply disappear.

No frontend code change needed when backend ships any of these — the consumers all fall back through their resolver chains (P2 `resolveName()`, P3 single-key, etc.). Frontend will pick up the data on the next request.

---

## 4. Reference files

- Live audit: `/app/memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md`
- Implementation handover: `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md`
- QA handover (this session's deliverable): `/app/memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md`
- Original BE-1 spec: `/app/memory/change_requests/BE_1_BACKEND_ASKS_CONSOLIDATED.md`
- Original BE-2 spec: `/app/memory/change_requests/BE_2_LODGING_PAYMENT_BREAKDOWN.md` *(note: §2 invariant `advance + balance + receive = price` does NOT hold in live data — see §1.5 above)*

---

## 5. Sample API trace (curl) — for repro

```bash
TOKEN=$(curl -s -X POST https://preprod.mygenie.online/api/v1/auth/vendoremployee/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"owner@welcomeresort.com","password":"Qplazm@10"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"sort_by":"created_at","from_date":"2026-04-29","to_date":"2026-04-29"}' \
  | python3 -m json.tool | less
```

Look for:
- Any cancelled row → `orders_table.canceled_by`, `cancel_by_name` should be populated (1.1)
- Any cancelled row → `orders_table.cancellation_reason` should be populated when item-level reason exists (1.2)
- Any settled RM row → `room_info.discount_amount`, `discount_reason` should be present (1.3)
- Any merged row → `orders_table.merge_by_*` should be present (1.4)

**End of backend note.**
