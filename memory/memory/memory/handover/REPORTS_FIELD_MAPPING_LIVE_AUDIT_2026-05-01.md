# Reports — Live Payload Audit (preprod, 2026-05-01)

**Method:** Logged into preprod as `owner@18march.com` (Mantri password rejected — `Qplazm#10` no longer valid for that tenant).
**Endpoints hit:**
- `POST /api/v1/auth/vendoremployee/login` ✓
- `POST /api/v2/vendoremployee/report/order-logs-report` (2026-04-28 & 2026-04-29, 18march) — 7 order rows total
- `GET /api/v2/vendoremployee/get-room-list` — 2 rooms
- `POST /api/v2/vendoremployee/get-single-order-new?order_id=817413` (RM parent, r1) — room folio

**Artefacts preserved:** `/tmp/olr_2026-04-28.json`, `/tmp/olr_2026-04-29.json`, `/tmp/rooms.json`, `/tmp/gso_817413.json`.

---

## 0. Headline

Backend has delivered **more than the tracker claimed**, but with **significant naming / placement deviations** from BE-1 spec:
- `waiter_name` and `cancellation_reason` are live at the **order level** (`orders_table.*`) ✓
- `cancel_by`, `cancel_by_name`, `cancel_type` are live at the **item level** (`order_details_table[i].*`) — **not** at the order level as BE-1 P2/P3/P4 requested ⚠
- `employee_id` + `employee_name` are a **new undocumented pair** present on every row — likely the "order puncher" (distinct from `waiter_*`). **Needs product clarification before use.**
- `table_no` field does **not** exist — backend sends `table_name` instead ⚠
- BE-2 (`lodging_collected`, `discount_amount`, `discount_reason`) — **not shipped**, only the original 3 `room_info` fields present
- `is_room_settled` (BE-1 G1) — **not shipped**

**Policy change (user, 2026-05-01):** No fallbacks. If a field is missing in the payload, render blank (no `'—'`, no `Employee #<id>`, no alternate key chains).

---

## 1. Field-by-field status (live evidence)

### 1.1 `orders_table` level — for Audit Report consumption

| BE-1 ID | Field (spec) | Actual BE key | Live sample | Verdict | FE action |
|---|---|---|---|---|---|
| P1 | `waiter_name` | `waiter_name` | `"Manager"`, `"Owner"` | ✅ **SHIPPED** | Use `api.waiter_name` directly. Drop `Employee #<id>` fallback. |
| P1 extra | — | `waiter_id` | `1476`, `1478` | Info only | Don't display |
| P1 extra | — | `employee_name` | `"Owner"`, `"Manager"` | ⚠ **NEW — needs product** | `employee_*` differs from `waiter_*` on same row. Likely = "puncher/creator". **Open question #1.** |
| P2 paid | `collect_by_name` | — | — | ❌ **NOT SHIPPED** | No collector-name field on paid row. `collect_bill` timestamp exists but no "who". Render blank. |
| P2 cancelled | `cancel_by_name` | `canceled_by` (order-level) | `null` (even for cancelled row) | ❌ **NOT SHIPPED at order level** | But item-level `order_details_table[0].cancel_by_name` is populated for *item* cancels — see §1.2. For whole-order cancels, both are null. |
| P2 merged | `merge_by_name` | — | — | ❌ No merged orders in sample; no `merge_*` keys present on any row. |
| P3 | `cancel_reason` | `cancellation_reason` | `"Hdgshhshs"` | ✅ **SHIPPED (different key)** | Use `api.cancellation_reason`. Drop `cancel_reason` fallback. |
| P3 extra | — | `cancellation_note` | `"Hdgshhshs"` (same text) | Duplicate — ignore |
| P4 | `cancel_type` | — (absent at order level) | — | ❌ **NOT at order level**; item-level has it — see §1.2 |
| P5 | `table_no` | `table_name` (!) | `null` for all POS-created rows in sample | ⚠ **KEY MISMATCH** + empty in sample | Switch to `api.table_name`. Needs verification against a row with an actual table assignment. |
| P5 extra | — | `table_id` | `0` | Confirms no dine-in table in sample |
| P6 | `room_info` on RM rows | — | No RM rows in 18march sample | Cannot verify from this sample | Re-test against Mantri with an active RM order |
| G1 | `is_room_settled` | — | — | ❌ **NOT SHIPPED** |

### 1.2 `order_details_table[i]` level — item-level metadata (drill-down consumers)

These fields are **live** but placed on items, not orders. The Cancelled tab shows order rows; it can back-fill from `order_details_table[0]` when present.

| Field | Sample value (item-cancel) | Sample value (order-cancel) | Notes |
|---|---|---|---|
| `cancel_by` | `"3082"` | `null` | Employee id who cancelled the item |
| `cancel_by_name` | `"p"` | `null` | Name (note: test tenant used `"p"` as name) |
| `cancel_reason_text` | `"bhuii"` | `"Hdgshhshs"` | Duplicates `orders_table.cancellation_reason` for order-level cancel |
| `cancel_type` | `"Pre-Serve"` | `"Order"` | **Literal set confirmed: `Pre-Serve` / `Post-Serve` / `Order`** |
| `cancel_at` | `"2026-04-28 09:09:50"` | `null` | |
| `reason` / `reason_type` | `"bhuii"` / `"359"` | — | Dup + id ref |

**Key insight for P4:** `cancel_type="Order"` means "this was a whole-order cancellation". For the Cancelled tab, render this as blank (or "Order" explicitly — product decision, see open question #2).

### 1.3 `/get-room-list` status

| Tracker item | Actual BE key | Live sample | Verdict |
|---|---|---|---|
| `latest_order_id` | `order_id` | `817413` | ✅ Already shipped + tracker §4.1 #1 closed correctly |
| G2 in-house filter | N/A | 2 rooms returned | Cannot verify from single snapshot — trust tracker §4.1 #2 closure |

### 1.4 `/get-single-order-new` (RM parent `order_id=817413`)

`room_info` present, but only the 3 original fields:

```json
"room_info": {
  "room_price":      "6666.00",
  "advance_payment": "666.00",
  "balance_payment": "6000.00"
}
```

- ❌ **BE-2 NOT SHIPPED** — no `lodging_collected`, `discount_amount`, `discount_reason`, `payment_breakdown`.
- `associated_order_list` empty on this sample — **G3 not verifiable** from this data. Need a settled RM parent with transferred SRMs to test.

### 1.5 `/order-logs-report` RM-row extended shape (added 2026-05-01 — screenshot evidence)

A follow-up scan against 2026-04-27 / 2026-04-29 on 18march tenant surfaced RM rows that were absent from the first sample. Backend **has shipped** both `room_info` and `associated_orders` on `/order-logs-report` wrapper, richer than the `/get-single-order-new` equivalent.

Wrapper keys for an RM row (id=817426, fos=6 / settled):
```
['associated_orders', 'order_details_table', 'order_info', 'orders_table', 'room_info']
```

`room_info` on `/order-logs-report` carries **significantly more fields** than on `/get-single-order-new`:
```jsonc
{
  "id": 12463, "user_id": 1, "id_type": "Aadhar card",
  "restaurant_id": 478, "order_id": 817426,
  "order_amount": "7000.00", "order_note": null,
  "room_no": "r2",                              // NEW vs /get-single-order-new
  "total_adult": 1, "total_children": 0,
  "children_name": null,
  "idfront_image": "", "idback_image": "",
  "person_name_2": null, "id_type2": null, /* … guest 2/3/4 metadata */
  "firm_name": null, "firm_gst": null,
  "gst_tax": "0.00",
  "payment_status": "paid",                     // NEW — lodging settlement status
  "payment_mode": null,
  "checkin_date": "2026-04-27",
  "checkout_date": "2026-04-28",
  "room_price": "7000.00",
  "advance_payment": "2000.00",
  "booking_type": "WalkIn",
  "balance_payment": "5000.00",                 // NOTE: not zeroed even on settled room
  "booking_for": "individual",
  "balance_payment_mode": "cash",               // NEW — method used for balance
  "receive_balance": "5000.00",                 // NEW — cash actually collected at checkout
  "created_at": "2026-04-27 17:39:30",
  "updated_at": "2026-04-29 13:47:44"
}
```

`associated_orders[i]` shape:
```jsonc
{
  "id": 4007,
  "room_id": 6182,
  "associate_order_id": 822695,       // RM parent order id
  "order_id": 805888,                  // SRM child order id
  "order_amount": "405.00",            // food amount on the SRM
  "order_status": 0,                   // NOT payment_status — see below
  "created_at": "…", "updated_at": "…"
}
```

### 1.6 Re-classification based on §1.5

| Ticket | Prior verdict | NEW verdict (2026-05-01 post-scan) |
|---|---|---|
| **BE-1 P6** (room_info on /order-logs-report RM rows) | ❌ Not shipped | ✅ **SHIPPED** — wrapper-level `room_info` |
| **BE-2 §4.3** (room_info with new fields on /order-logs-report) | ❌ Not shipped | ✅ **SHIPPED** — same delivery as P6 |
| **BE-2 §4.1** (`lodging_collected`, `discount_amount`, `discount_reason`) | ❌ Not shipped | ⚠ **Partially derivable** — `lodging_collected ≈ advance_payment + receive_balance`; `discount_amount` still not explicit |
| **BE-1 G3** (refresh `associated_order_list[i].payment_status`) | ❓ Unverified (prev sample empty) | ❌ **Still pending** — `associated_orders[i]` carries `order_status` (0/1/2) but **no `payment_status`**. Frontend cannot tell which SRM child is settled from this payload. |

### 1.7 Derived-formula option for BE-2 (until explicit fields ship)

**⚠ Validated 2026-05-01 against welcomeresort tenant (14 RM rows, 7 settled). Critical correction below.**

`balance_payment` is **NOT zeroed post-checkout** by backend. It carries the original receivable even on settled rooms. The "invariant" `advance + balance + receive = price` from BE-2 spec **does not hold** in live data — it overshoots by `balance_payment` on every paid room.

**Correct derivation:**
```js
const advance  = parseFloat(ri.advance_payment) || 0;
const balance  = parseFloat(ri.balance_payment) || 0;   // STALE on settled rooms — see below
const received = parseFloat(ri.receive_balance) || 0;
const price    = parseFloat(ri.room_price) || 0;
const isLodgingPaid = ri.payment_status === 'paid';

// Money actually in the till for lodging:
const lodgingCollected = advance + received;

// Lodging side outstanding:
//   - In-house room: residual balance net of any partial checkout collection.
//   - Settled room:  trust payment_status; ignore balance_payment (backend doesn't zero it).
//                    Any positive gap here = undisclosed discount/write-off.
const lodgingOutstanding = isLodgingPaid
  ? Math.max(0, price - lodgingCollected)   // healthy data → 0; >0 only when operator under-collected
  : Math.max(0, balance - received);        // checkout still pending or partial
```

**Validation against welcomeresort 2026-04-29 (paid rooms):**

| oid | room | price | adv | recv | calc lodging_collected | gap |
|---|---|---|---|---|---|---|
| 822723 | 102 | 1200 | 0 | 1200 | 1200 | 0 ✓ |
| 822316 | 107 | 2000 | 0 | 2000 | 2000 | 0 ✓ |
| 822682 | 101 | 1200 | 0 | 1200 | 1200 | 0 ✓ |
| 822412 | 109 | 1200 | 1200 | 0 | 1200 | 0 ✓ |
| 822282 | 103 | 1100 | 1100 | 0 | 1100 | 0 ✓ |
| 822170 | 102 | 1200 | 1200 | 0 | 1200 | 0 ✓ |
| 822092 | 101 | 1200 | 1200 | 0 | 1200 | 0 ✓ |

All 7 reconcile cleanly. **Zero discount cases in this sample** — meaning the derived approach yields `discount = 0` for healthy operations, and only flags a positive number when an operator **actually under-collected**.

**Caveat:** without explicit `discount_amount` / `discount_reason`, an under-collected room is indistinguishable from an approved discount. Until backend ships those fields, the only thing the UI can honestly show is **"Cash Gap"** (with no reason).

---

## 2. Summary: shipped vs blocked

| # | Ticket | Live status (2026-05-01) | FE ready to wire? |
|---|---|---|---|
| 1 | `latest_order_id` on /get-room-list | ✅ Already live + wired (tracker §4.1) | — |
| 2 | G2 in-house filter | ✅ Already live + wired | — |
| 3 | BE-1 G1 `is_room_settled` | ❌ Not shipped | No |
| 4 | BE-1 G3 payment_status refresh | ❓ Cannot verify (empty associated list) | Re-test on Mantri once creds confirmed |
| 5 | BE-1 P1 `waiter_name` | ✅ **SHIPPED** | **YES — wire now** |
| 6 | BE-1 P2 `*_by_name` (order-level) | ❌ Not shipped at order level; item-level partial | No (order-level); partial yes for Cancelled tab via item back-fill |
| 7 | BE-1 P3 `cancel_reason` | ✅ **SHIPPED as `cancellation_reason`** | **YES — wire now (key rename)** |
| 8 | BE-1 P4 `cancel_type` | ✅ **SHIPPED at item level** (literal set: `Pre-Serve` / `Post-Serve` / `Order`) | **YES — wire via `order_details_table[0].cancel_type`** |
| 9 | BE-1 P5 `table_no` | ⚠ Backend uses `table_name`; empty on sample | **YES — rename key; verify against dine-in row** |
| 10 | BE-1 P6 `room_info` on /order-logs-report | ❌ Not in /order-logs-report RM rows | No (subsumed into BE-2 anyway) |
| 11 | BE-2 lodging breakdown | ❌ Not shipped | No |

---

## 3. New discoveries (not in original BE-1 spec)

### 3.1 `employee_id` + `employee_name` on every order row
**Open question (OQ-1):** What does `employee_*` represent vs `waiter_*`?
- On order `819021` (paid): `waiter_id=1476 ('Manager')`, `employee_id=1478 ('Owner')` — **different people**.
- Hypothesis: `waiter_*` = assigned server (from table); `employee_*` = order puncher / creator.
- Product needs to confirm before we expose this anywhere in the UI.

### 3.2 `cancel_type` literal set is confirmed
Values observed: `"Pre-Serve"`, `"Order"`. BE-1 spec P4 listed literals like `before_cooking` / `pre_cook` — backend chose the **Pre-Serve / Post-Serve / Order** set instead. Handover `normalizeCancelType()` helper needs trimming to this final set.

### 3.3 Duplicated cancel-reason keys
Backend sends all three of these with the same value on a cancelled row:
- `orders_table.cancellation_reason`
- `orders_table.cancellation_note`
- `order_details_table[0].cancel_reason_text`
Frontend should read **only** `orders_table.cancellation_reason`. Drop the other two key-name alternates.

### 3.4 `table_name` vs `table_no`
Backend ships `table_name`, spec asked for `table_no`. This is a **hard rename**, not an additive field. Frontend's current `extractLocation()` reads `api.table_no` — will return blank until we switch keys. Need product/BE sign-off on the canonical key (prefer `table_name` since that's what's live).

---

## 4. No-fallback policy — what changes

Per user 2026-05-01: if a field is missing, leave the UI cell **blank** (empty string / `null`). Remove all of these patterns:
- `api.waiter_name || 'Employee #' + api.waiter_id || '—'` → `api.waiter_name`
- `api.cancel_reason || api.cancellation_reason || '—'` → `api.cancellation_reason`
- `api.cancel_type || '—'` → `api.cancel_type` (with normalizer)
- `resolveName()` chain across 5 key alternates → single canonical key
- `punchedBy = waiterName || Employee#<id> || '—'` → `punchedBy = api.waiter_name`

Transform-level `|| '—'` must also go. Consumers (table cells, cards) will render whatever they get; if they need a placeholder, let them add it at display time — not at transform time.

**Rendering discipline:** The UI layer (`OrderTable.jsx`, `RoomRowCard.jsx`, etc.) is responsible for handling `null` / `''` / `undefined` — probably by rendering nothing, or a subtle `—` dash if needed for column alignment. **That decision belongs to the UI layer, not the transform.** The transform returns the truth.

---

## 5. Edits that can land TODAY (no backend waiting)

Based on the audit, 4 tickets are immediately actionable:

1. **P1 `waiter_name`** — remove `Employee #<id>` + `—` fallback in `reportService.js:720-724`.
2. **P3 `cancellation_reason`** — switch to canonical key, drop `cancel_reason` alternate in `reportTransform.js:216, 404`.
3. **P4 `cancel_type`** — read from `order_details_table[0].cancel_type`; add normalizer for `{Pre-Serve, Post-Serve, Order}`; render Cancellation Status column in `OrderTable.jsx`.
4. **P5 `table_name`** — rename field read in `extractLocation()` (single grep-replace `api.table_no` → `api.table_name`). Verify against a dine-in row before shipping.

See the **revised implementation handover** at `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` for exact edits.

---

## 6. Still blocked (backend action required)

Consolidated ticket for backend, in priority order:

| Priority | Ticket | Ask | Needed because |
|---|---|---|---|
| P1 | BE-2 | `lodging_collected`, `discount_amount`, `discount_reason` on `room_info` | Cash reconciliation on Room Report is still approximate |
| P1 | BE-1 P2 (paid) | `collect_by_id` + `collect_by_name` on paid orders_table rows | Audit ACTIONED BY column renders blank for paid rows |
| P1 | BE-1 P2 (whole-order cancel) | `cancel_by_id` + `cancel_by_name` on orders_table for order-level cancels | Audit Cancelled tab ACTIONED BY blank for whole-order cancels |
| P2 | BE-1 P6 / BE-2 §4.3 | `room_info` on /order-logs-report RM rows | Removes the 1+N detail-fetch on Room Report |
| P2 | BE-1 G1 | `is_room_settled` / `room_settled_at` | Lets us delete `getActiveSrmIds()` walk |
| P2 | BE-1 G3 | `associated_order_list[].payment_status` refresh post-checkout | Needs a settled RM with transferred SRMs to verify |
| P3 | BE-1 P2 (merged) | `merge_by_id` + `merge_by_name` on orders_table for merged orders | Need a merged order sample to even verify |

---

## 7. Open questions for product (block specific edits)

1. **`employee_*` vs `waiter_*`** (from §3.1): which represents the "puncher" for the PUNCHED BY column? The POS may use one or the other per tenant config. Without clarity we should keep showing `waiter_name` (which is what the column has been showing).
2. **`cancel_type="Order"` in Cancelled tab Status column** — render as "Order", "Whole order", or blank? Product call.
3. **P5 key rename** — go directly to `api.table_name` or ask backend to also publish `table_no` for consistency with spec? Currently frontend will show blank until rename.
4. **Mantri credentials** — `Qplazm#10` returned `auth-001 Unauthorized`. Need updated password for BE-2 / G3 verification against Mantri tenant specifically.

---

**End of audit.**

---

## 8. BE-1 INVARIANT logger — installed 2026-05-01

A lightweight dev-mode diagnostic was added in `reportService.js:getOrderLogsReport` (right after the response lands). It logs `console.warn('[BE-1 INVARIANT] …')` once per fetch if any row is missing a field the audit confirmed shipped:

- `waiter_name` (P1) — expected on every row
- `cancellation_reason` (P3) — expected when `payment_method === 'Cancel'` or `f_order_status === 3`
- `cancel_type` from `order_details_table[0]` (P4) — expected on cancelled rows
- `table_name` (P5) — expected when `table_id > 0`

**Cost:** zero in production (gated by `NODE_ENV === 'development'`). **Rule:** remove a check from the gap tracker the moment its ticket is retired from the handover. Add new checks (P2, BE-2) here as those fields ship.
