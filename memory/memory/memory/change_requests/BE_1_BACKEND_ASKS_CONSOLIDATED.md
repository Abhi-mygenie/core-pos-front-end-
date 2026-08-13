# BE-1: Backend Asks — Consolidated (CR-001 + CR-004)

**Ticket type:** Backend, additive only (no breaking changes)
**Owner CRs:** CR-001 (Audit Report) + CR-004 (Room Orders Report)
**Drafted:** 2026-04-29
**Status:** `pending_backend_review_and_scheduling`

**Bundles:** Bucket A (P1–P6) display fields on `/order-logs-report` + Bucket C (G2 + G3) correctness fixes on `/get-room-list` and `/get-single-order-new` + the single new field `latest_order_id` (was Bucket C OPT) needed by FE-1.

**Withdrawn from this ticket:** Bucket B G1 (`is_room_settled` / `room_settled_at`) — frontend can derive the badge state from existing `f_order_status` + `payment_method` fields. Tracked in FE-3 (`CR_001_AUDIT_SRM_BADGE_FIX.md`).

---

## 1. Affected endpoints (3 total)

| Endpoint | Today | Asks below |
|---|---|---|
| `POST /api/v2/vendoremployee/report/order-logs-report` | Returns the day's orders | **P1–P6** display-mapping fields |
| `GET /api/v2/vendoremployee/get-room-list` | Returns active rooms (table + user blocks) | **G2** in-house filter + **`latest_order_id`** field |
| `POST /api/v2/vendoremployee/get-single-order-new` | Returns folio detail for an `orderId` | **G3** refresh of `associated_order_list[].payment_status` post-checkout |

All changes are **additive** — no field renames, no type changes, no removed fields. Existing consumers continue to work unchanged.

---

## 2. Bucket A — `/order-logs-report` display-mapping fields (CR-001 P1–P6)

For every order row returned by this endpoint:

### **P1** — `waiter_name`
- **Today:** `waiter_id` is present, `waiter_name` is `undefined`.
- **Frontend impact:** `PUNCHED BY` column shows `Employee #<waiter_id>` instead of staff name.
- **Ask:** include `waiter_name` (full name string) on every row.
- **Acceptance:** a row with `waiter_id: 1478` returns `waiter_name: "Owner"` (or whatever the staff record holds).

### **P2** — `*_by_id` and `*_by_name` for state-transition actors
- **Today:** all of `cancel_by`, `cancelled_by`, `cancel_by_name`, `merge_by`, `merged_by`, `merge_by_name`, `collect_by`, `collected_by`, `collect_by_name`, `payment_collected_by`, `payment_collected_by_name`, `cashier_id`, `cashier_name` come back as `undefined`.
- **Frontend impact:** `ACTIONED BY` column shows `Collected by —`, `Cancelled by —`, `Merged by —` (label only, never a name).
- **Ask:** per row, include whichever of these are applicable:
  - paid rows → `collect_by_id` + `collect_by_name`
  - cancelled rows → `cancel_by_id` + `cancel_by_name`
  - merged rows → `merge_by_id` + `merge_by_name`
- **Acceptance:** a paid row whose bill was collected by employee #1478 returns `collect_by_id: 1478` and `collect_by_name: "Owner"`.

### **P3** — `cancel_reason` (free text)
- **Today:** not returned.
- **Frontend impact:** Cancelled tab `Reason` column shows `—`.
- **Ask:** include `cancel_reason` (string) on cancelled rows.
- **Acceptance:** a cancelled row returns `cancel_reason: "customer changed mind"` (or whatever was entered).

### **P4** — `cancel_type` (cancellation stage)
- **Today:** not returned.
- **Frontend impact:** A scoped Cancellation-Status column on the Cancelled tab cannot be rendered.
- **Ask:** include `cancel_type` (string) on cancelled rows. Allowed literals (frontend will normalise):
  - `before_cooking` / `Before cooking`
  - `before_serving` / `Before serving`
  - `after_serving` / `After serving`
  - Any literal works — please share the actual mapping (e.g. `pre_cook`/`pre_serve`/`post_serve`) once available.
- **Acceptance:** a cancelled row returns `cancel_type: "before_cooking"` (or backend's chosen literal).

### **P5** — `table_no` (human-readable label)
- **Today:** only `table_id` is returned.
- **Frontend impact:** TABLE NO column falls back to `Dine-in` / `Delivery` / `Takeaway` / `Walk-in`.
- **Ask:** include `table_no` on every row that has a table (e.g. `"T-7"`, `"12"`, `"r1"`).
- **Acceptance:** a dine-in row with `table_id: 3237` returns `table_no: "T-7"` (per master table list).

### **P6** — `room_info` on RM rows
- **Today:** room rows briefly visible during the G4 mis-fix had `room_info: undefined` and `order_amount: 0`.
- **Frontend impact:** moot for the Audit Report today (rooms are excluded), but useful for future cross-report aggregation and for the FE-1 All-filter union.
- **Ask:** include `room_info: { room_price, advance_payment, balance_payment }` on RM parent rows.
- **Acceptance:** an RM parent row with `restaurant_order_id: "002914"` returns `room_info: { room_price: 6000, advance_payment: 1000, balance_payment: 5000 }`.

---

## 3. Bucket C — Room data correctness

### **G2** — Filter `/get-room-list` to currently in-house rooms only
- **Today:** the endpoint appears to return all active rooms regardless of in-house state. Checked-out rooms (e.g. `r1` post-checkout) keep showing up with stale outstanding (`₹17,120`).
- **Frontend impact:** breaks the FE-1 cross-day in-house view; until G2 ships, frontend ships a defensive client-side filter as a stop-gap.
- **Ask:** filter `/get-room-list` to return only rooms whose latest booking is currently in-house (i.e. not checked out).
  - **Optional:** hide behind a `?in_house_only=true` query flag if the legacy behavior must remain for other consumers.
- **Acceptance:** when `r1` is checked out, `/get-room-list` no longer returns `r1` until a new check-in.

### **G3** — Refresh `associated_order_list[].payment_status` on RM-parent's `/get-single-order-new` response post-checkout
- **Today:** when `r1` is checked out, the SRM `transferToRoom` orders settled to that room have their own `payment_status` updated correctly (verified via `/get-single-order-new(SRM_id)` → returns `paid`). BUT calling `/get-single-order-new(RM_parent_id)` returns an `associated_order_list[]` whose entries still show stale payment statuses cached at transfer-time.
- **Frontend impact:** Outstanding amount on the Room Orders Report is computed as `parent.order_amount + Σ associated_orders[].order_amount + max(0, balancePayment)`. After settlement, `associated_orders[].order_amount` is still summed and Outstanding stays inflated.
- **Ask:** refresh the `associated_order_list[]` items embedded in the RM parent's response so each item carries the same `payment_status` that an individual call to `/get-single-order-new(SRM_id)` would return.
- **Acceptance:** after `r1` is settled, `/get-single-order-new(RM_parent_id)` returns `associated_order_list[i].payment_status === "paid"` for every settled SRM, and the frontend formula collapses Outstanding to ₹0.

### **`latest_order_id`** — new field on `/get-room-list`
- **Today:** `/get-room-list` returns only `table` + `user` per room. The active RM-parent order id is not included.
- **Frontend impact:** to fetch a room's folio, frontend must first reverse-lookup `table_id → latest_order_id` via `/order-logs-report`. This breaks the FE-1 cross-day view (because `/order-logs-report` is date-filtered).
- **Ask:** add a single field `latest_order_id` (string \| null) to each room object. `null` only for rooms between bookings.
- **Acceptance:** every in-house room object in the response carries `latest_order_id` matching the RM-parent order id that owns the room's `room_info` + `associated_order_list[]`.

---

## 4. Worked example

After all changes, a single `/get-room-list` item should look like:

```json
{
  "table": { "id": 3237, "table_no": "r1", "title": "Floor1" },
  "user":  { "id": 8421, "f_name": "Jane", "l_name": "Doe", "phone": "+91..." },
  "latest_order_id": "002914"
}
```

After all changes, a single `/order-logs-report` order row should look like (existing fields + new):

```json
{
  // ... existing fields (id, restaurant_order_id, payment_method, etc.) ...
  "waiter_id": 1478,
  "waiter_name": "Owner",                                   // P1
  "collect_by_id": 1478,                                    // P2 (paid rows)
  "collect_by_name": "Owner",                               // P2
  "cancel_by_id": null,                                     // P2 (cancelled rows only)
  "cancel_by_name": null,                                   // P2
  "merge_by_id": null,                                      // P2 (merged rows only)
  "merge_by_name": null,                                    // P2
  "cancel_reason": null,                                    // P3
  "cancel_type": null,                                      // P4
  "table_id": 3237,
  "table_no": "T-7",                                        // P5
  "room_info": { ... }                                      // P6 (RM parent rows only)
}
```

---

## 5. Acceptance Criteria (rolled up)

| ID | Criterion |
|---|---|
| P1 | Every row from `/order-logs-report` returns `waiter_name`. |
| P2 | Every paid / cancelled / merged row returns the corresponding `*_by_id` + `*_by_name`. |
| P3 | Cancelled rows return `cancel_reason`. |
| P4 | Cancelled rows return `cancel_type` with one of the agreed literals. |
| P5 | Rows with a table assignment return `table_no`. |
| P6 | RM parent rows return `room_info`. |
| G2 | `/get-room-list` excludes checked-out rooms. |
| G3 | `/get-single-order-new(RM_parent_id)` refreshes `associated_order_list[].payment_status` post-settlement. |
| LOI | Every in-house room in `/get-room-list` returns `latest_order_id`. |

---

## 6. Risk

| Risk | Level | Mitigation |
|---|---|---|
| Backend changes are purely additive | Low | Frontend already handles `undefined` defensively; new fields are read with optional chaining + fallbacks. |
| `cancel_type` literal mismatch | Low | Frontend will normalise once samples are shared. |
| `room_info` payload growth on `/order-logs-report` | Low | Only a few extra numeric fields per RM row. |
| `/get-room-list` filter behaviour change | Medium | Optional `?in_house_only=true` flag preserves legacy consumers. |

---

## 7. Frontend follow-ups unlocked (per ID)

| ID | Frontend change | Effort |
|---|---|---|
| P1 | `punchedBy` resolver flips from `Employee #<id>` to `waiter_name`. | 1 line |
| P2 | `actionedBy` resolver flips from `—` to `*_by_name`. | 1 line |
| P3 | Cancelled-tab `Reason` column wires `cancel_reason`. | 1 line |
| P4 | Cancelled-tab gains a Cancellation Status column wiring `cancel_type`. | ~10 lines |
| P5 | TABLE NO column starts showing real labels. | already wired — becomes correct |
| P6 | Optional Audit-Report cross-aggregation (not in scope). | TBD |
| G2 | FE-1 drops its defensive client-side checked-out filter. | ~5 lines deletion |
| G3 | Room Orders Outstanding starts collapsing to ₹0 post-settlement. | already correct — formula starts producing 0 |
| LOI | FE-1 drops the `/order-logs-report` lookback kludge. | ~10 lines deletion |

---

## 8. Sequencing

The asks are independent and can ship in any order. Recommended priority by frontend value:

1. **`latest_order_id`** + **G2** — unblock FE-1's clean shape (drop the kludge + drop the defensive filter).
2. **G3** — fix Outstanding correctness on Room Orders Report.
3. **Bucket A (P1–P6)** — unblock the audit-report column polish.

---

## 9. Diagnostic logs already in the frontend (for verification)

- `[CR-001 P2 DIAG] order=<id>` — logs raw `/order-logs-report` payload for watch-listed order ids.
- `[CR-001 G5 DIAG]` — auto-snapshot of any order with a missing prefix.
- `[CR-004 P2 DIAG] /get-room-list response` — logs full `/get-room-list` payload on `/reports/rooms` mount (will be removed in FE-1; backend can verify against this until then).

---

## 10. Definition of Done

- [ ] All 9 ACs in §5 pass on staging against the live frontend diagnostic logs.
- [ ] No regression on existing consumers of these endpoints (other reports, dashboard widgets, socket-driven flows).
- [ ] FE-1 cleanup PR (drop lookback + defensive filter) lands once `latest_order_id` + G2 ship.
- [ ] Parent sub-CR (`CR_004_BACKEND_EXT_sub_cr.md`) updated with cross-references and G1 withdrawn.
