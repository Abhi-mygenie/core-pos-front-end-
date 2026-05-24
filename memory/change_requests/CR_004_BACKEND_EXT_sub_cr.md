# CR-004-BACKEND-EXT (Sub-CR): Backend Extensions for Room Orders + Audit Report Display Mappings

## Status
- sub_cr_drafted_pending_backend_review

## Type
- Sub-CR (backend-driven). Frontend cannot ship the consolidated improvement without these backend changes.

## Parent CRs
- **CR-001** — Audit Report status derivation + filter structure (Phase 1 + Phase 2 implemented; this sub-CR captures the parked display-mapping items P1–P6).
- **CR-004** — Room Orders Report (Phases 4.1–4.5 implemented; Phase 2 (cross-day in-house view) is blocked on the backend extensions below).

## Source Documents
- CR-001 doc: `/app/memory/change_requests/CR_001_all_orders_status_derivation.md`
- CR-001 implementation summary: `/app/memory/change_requests/implementation_summaries/CR_001_IMPLEMENTATION_SUMMARY.md`
- CR-001 QA handover: `/app/memory/change_requests/qa_handover/CR_001_QA_HANDOVER.md`
- CR-004 doc: `/app/memory/change_requests/CR_004_room_orders_pms_view.md`
- CR-004 implementation summary (Phases 4.1–4.5): `/app/memory/change_requests/implementation_summaries/CR_004_IMPLEMENTATION_SUMMARY.md`
- CR-004 QA handover (partial — Phases 4.1–4.5): `/app/memory/change_requests/qa_handover/CR_004_QA_HANDOVER.md`

## Why This Sub-CR Exists
During CR-001 Phase 2 + CR-004 Phase 2 UAT we identified eight backend gaps that the frontend cannot work around without compounding tech debt. They group into three buckets:

1. **Display mappings on `/order-logs-report`** — the report endpoint returns IDs but not the human-readable names / fields the new column set needs (P1–P6).
2. **Folio settlement signals on transferred orders** — the frontend has no way to know when a `transferToRoom` order has actually been collected (G1).
3. **Room Orders cross-day in-house view** — the existing `/get-room-list` returns only room metadata; we still need a folio-level fetch + a stale-data fix (G2, G3, plus an endpoint extension to drop the multi-call frontend pattern).

## Affected Endpoints
| Endpoint | Today | Asks below |
| --- | --- | --- |
| `POST /api/v2/vendoremployee/report/order-logs-report` | Returns the day's orders (with `payment_method`, `payment_status`, `f_order_status`, `order_in`, `table_id`, `waiter_id`, `restaurant_order_id`, etc.) | P1–P5, plus G1 settlement signal, plus P6 `room_info` confirmation |
| `GET /api/v2/vendoremployee/get-room-list` | Returns active rooms (`table` + `user`) but NO order pointer, NO `room_info`, NO check-in date | Add `latest_order_id`, `room_info`, `check_in_date`; ensure checked-out rooms are excluded (G2) |
| `POST /api/v2/vendoremployee/get-single-order-new` | Returns folio detail for an `orderId`. Used per-row by both Audit Report drawer and Room Orders Report. | Fix `associated_order_list[].payment_status` staleness on the RM parent's response after checkout (G3) |
| `POST /api/v2/vendoremployee/make-order-unpaid` | Used by CR-003 to flip a paid order back to unpaid. | Confirm whether calling on an SRM transferToRoom row strips the room association (post-success behaviour for the future Unpaid button on Associated Orders — Q-1c) |

## Confirmed Scope

### Bucket A — Display mappings on `/order-logs-report` (CR-001 P1–P6)

#### **P1** Add `waiter_name` to each order row
- Today: `waiter_id` is present, `waiter_name` is `undefined`.
- Frontend impact: PUNCHED BY column shows `Employee #<waiter_id>` instead of the actual staff name.
- Ask: include `waiter_name` (full name string) on every row.
- Acceptance: a row with `waiter_id: 1478` returns `waiter_name: "Owner"` (or whatever the staff record holds).

#### **P2** Add `*_by` and `*_by_name` fields for state-transition actors
- Today: all of `cancel_by`, `cancelled_by`, `cancel_by_name`, `merge_by`, `merged_by`, `merge_by_name`, `collect_by`, `collected_by`, `collect_by_name`, `payment_collected_by`, `payment_collected_by_name`, `cashier_id`, `cashier_name` are returned as `undefined` on this endpoint.
- Frontend impact: ACTIONED BY column shows `Collected by —` / `Cancelled by —` / `Merged by —` (only the label, never a name).
- Ask: per row, include whichever of these are applicable to the row's terminal state:
  - **For paid rows:** `collect_by_id` + `collect_by_name` (or any equivalent canonical names already in the schema).
  - **For cancelled rows:** `cancel_by_id` + `cancel_by_name`.
  - **For merged rows:** `merge_by_id` + `merge_by_name`.
- Acceptance: a paid row whose bill was collected by employee #1478 returns `collect_by_id: 1478` and `collect_by_name: "Owner"`. Same convention for cancel and merge.

#### **P3** Add `cancel_reason` (free-text)
- Today: not returned.
- Frontend impact: Cancelled tab's `Reason` column shows `—`.
- Ask: include `cancel_reason` (string, free-text) on cancelled rows.
- Acceptance: a cancelled row returns `cancel_reason: "customer changed mind"` (or whatever was entered at cancellation time).

#### **P4** Add `cancel_type` (cancellation stage)
- Today: not returned (the legacy `cancellationType` reference in `reportTransform.js` shows the field name was anticipated).
- Frontend impact: a Cancelled-tab Cancellation Status column was scoped (`Before cooking` / `Before serving` / `After serving`) but cannot be rendered.
- Ask: include `cancel_type` (string) on cancelled rows. Allowed values (per UAT discussion):
  - `"before_cooking"` / `"Before cooking"`
  - `"before_serving"` / `"Before serving"`
  - `"after_serving"` / `"After serving"`
  - Any literal is fine — frontend will normalise. Provide a sample mapping if the backend uses a different code (e.g. `pre_cook`/`pre_serve`/`post_serve`).
- Acceptance: a cancelled row returns `cancel_type: "before_cooking"` (or equivalent backend literal).

#### **P5** Add `table_no` (human-readable label)
- Today: not returned. `table_id` is the only table reference.
- Frontend impact: TABLE NO column falls back to `Dine-in` / `Delivery` / `Takeaway` / `Walk-in` for most rows because the resolver has no human label to render.
- Ask: include `table_no` on every row that has an associated table (e.g. `"T-7"`, `"12"`, `"r1"`).
- Acceptance: a dine-in row with `table_id: 3237` returns `table_no: "T-7"` (or whatever the table_no value is in the master table list).

#### **P6** Confirm / include `room_info` on RM rows
- Today: room rows that briefly appeared in the Audit Report (during the G4 mis-fix) had `room_info: undefined` and `order_amount: 0`. The socket `new-order` event and `/get-single-order-new` both DO return `room_info`, but `/order-logs-report` doesn't.
- Frontend impact: now moot for the Audit Report (rooms are excluded again per CS-16..CS-22), but still relevant for any future cross-report aggregation or for the Room Orders Phase 2 cross-day flow.
- Ask: include `room_info: { room_price, advance_payment, balance_payment }` on RM parent rows in `/order-logs-report`.
- Acceptance: an RM parent row with `restaurant_order_id: "002914"` returns `room_info: { room_price: 6000, advance_payment: 1000, balance_payment: 5000 }`.

### Bucket B — Folio settlement signal (CR-001 G1) — **WITHDRAWN 2026-04-29**

> **Status: WITHDRAWN — superseded by frontend-only fix in `CR_001_AUDIT_SRM_BADGE_FIX.md` (FE-3).**
>
> User confirmed (2026-04-29) that the data needed to derive the SRM badge state is already present on each row: `f_order_status` flips to `6` AND `payment_method` becomes a real method (cash/card/upi/…) once the room is checked out and the SRM is settled. Frontend just needs to narrow the existing too-blunt `transferToRoom`-forces-running override. No backend field needed.

#### **G1** ~~Add `is_room_settled` (or `room_settled_at`) to transferToRoom rows~~ — withdrawn
- ~~Today: a `transferToRoom` order has `payment_method: "transferToRoom"`, `payment_status: "paid"`, `f_order_status: 6` from the moment of transfer — BEFORE the room has actually checked out and paid. The frontend therefore has no way to distinguish "transferred-but-not-collected-at-restaurant" from "transferred-and-room-has-settled".~~
- ~~Frontend rule today: `transferToRoom` rows are forced to `status='running'` regardless of `payment_status`. This is correct while the room is in-house, but stays incorrect after the room settles (the row should flip to `status='paid'`).~~
- ~~Ask: add a settlement signal on the SRM order so the frontend can flip the badge.~~
- **Resolution:** The `payment_method` field on the SRM row itself transitions from `"transferToRoom"` → `cash/card/upi/...` at checkout, and `f_order_status` becomes `6`. Frontend derivation can use this combination directly (see FE-3 ticket).

### Bucket C — Room Orders cross-day in-house view (CR-004 Phase 2)

#### **G2** Ensure `/get-room-list` returns only currently in-house rooms
- Today: an empirical sample showed the endpoint returning what looked like all active rooms. The `r1` room was visible while in-house and we have no confirmed test case of a room that is checked-out being filtered out automatically.
- Frontend impact: if the endpoint includes checked-out rooms, the Room Orders Report will list them too — confirmed visually with the `r1` room continuing to show post-checkout with stale outstanding (`₹17,120`).
- Ask: filter `/get-room-list` to return only rooms whose latest booking is currently in-house (i.e. not checked out).
- Acceptance: when `r1` is checked out, `/get-room-list` no longer returns `r1` until a new check-in.

#### **G3** Refresh `associated_order_list[].payment_status` on the RM parent's `/get-single-order-new` response post-checkout
- Today: when `r1` is checked out, the SRM transferToRoom orders settled to that room have their own `payment_status` updated correctly (verified via `/get-single-order-new(SRM_orderId)` showing green Paid). BUT calling `/get-single-order-new(RM_parent_id)` returns an `associated_order_list[]` whose entries still show stale payment statuses cached at transfer time.
- Frontend impact: Outstanding amount on the Room Orders Report is computed as `parent.order_amount + Σ associated_orders[].order_amount + max(0, balancePayment)`. Even after settlement, `associated_orders[].order_amount` is still summed and the total stays inflated.
- Ask: refresh the `associated_order_list[]` items embedded in the RM parent's response so each item carries the same `payment_status` that an individual call to `/get-single-order-new(SRM_id)` would return.
- Acceptance: after `r1` is settled, `/get-single-order-new(RM_parent_id)` returns `associated_order_list[i].payment_status === "paid"` for every settled SRM, and the frontend formula collapses Outstanding to ₹0.

#### **OPT** — Optional optimization: collapse 3 calls into 1 on `/get-room-list`
- Today: to render the Room Orders Report, the frontend has to do (a) `/get-room-list`, (b) lookback `/order-logs-report` to map `table_id → latest_order_id`, (c) per-row `/get-single-order-new` for folio detail. That's 1 + 1 + N calls per page load.
- Ask: extend `/get-room-list` to inline:
  - `latest_order_id` (the active RM order on this room — lets us skip the lookback)
  - `room_info: { room_price, advance_payment, balance_payment }` (lets us skip the per-row detail call for the collapsed view; expanded view can still do the detail call for `associated_order_list`)
  - `check_in_date` (the actual stay start, distinct from the registry `created_at`)
- Acceptance: a single `/get-room-list` call returns enough data to render the Room Orders Report's collapsed list (room, guest, check-in, total, food, outstanding) without any other API call; expanded-row detail still uses `/get-single-order-new` for `associated_order_list`.

## Out of Scope
- Frontend implementation of the Room Orders Phase 2 view (cross-day in-house list + Issue 1 Unpaid button + Issue 2 header summary + Issue 3 ROOM BILLING restructure). These are tracked in the CR-004 Phase 2 task list and will be unblocked once the backend asks above land.
- CR-001 Phase 1 / Phase 2 status derivation logic. Already shipped frontend-only. The backend asks above only enrich the display layer.
- CR-002 (status & tab logic refactor). Independent.
- CR-003 (Paid & Hold actions). Already shipped.

## Acceptance Criteria (rolled up)
| ID | Criterion |
| --- | --- |
| P1 | Every order row from `/order-logs-report` returns `waiter_name` populated. |
| P2 | Every paid / cancelled / merged row from `/order-logs-report` returns the corresponding `*_by_id` + `*_by_name` populated. |
| P3 | Cancelled rows return `cancel_reason`. |
| P4 | Cancelled rows return `cancel_type` with one of the agreed literals. |
| P5 | Rows with a table assignment return `table_no`. |
| P6 | RM parent rows return `room_info`. |
| G1 | transferToRoom rows return a settlement signal (`is_room_settled` or `room_settled_at`). |
| G2 | `/get-room-list` excludes checked-out rooms. |
| G3 | `/get-single-order-new(RM_parent_id)` refreshes `associated_order_list[].payment_status` post-settlement. |
| OPT | `/get-room-list` inlines `latest_order_id` + `room_info` + `check_in_date`. |

## Risk
| Risk | Level | Mitigation |
| --- | --- | --- |
| Backend changes are additive in nature | Low | Frontend already handles `undefined` gracefully today; new fields are read defensively. |
| `cancel_type` literal mismatch | Low | Frontend will normalise once samples are shared. |
| `room_info` payload growth on `/order-logs-report` | Low | Only a few extra numeric fields per RM row. |
| `/get-room-list` filter behaviour change | Medium | Could be hidden behind a query flag (e.g. `?in_house_only=true`) if backend wants to retain the legacy behaviour for other consumers. |

## Frontend Follow-Ups After Backend Lands (per ID)
| ID | Frontend change unlocked | Effort |
| --- | --- | --- |
| P1 | `punchedBy` resolver flips from `Employee #<id>` to `waiter_name`. | 1-line |
| P2 | `actionedBy` resolver flips from `—` to `*_by_name`. | 1-line |
| P3 | Cancelled-tab `Reason` column wires `cancel_reason`. | 1-line |
| P4 | Cancelled-tab gains a new `Cancellation Status` column wiring `cancel_type`. | ~10 lines (column config + cell renderer + CSV column) |
| P5 | TABLE NO column starts showing real labels; fallback retained for safety. | already wired — just becomes correct |
| P6 | Optional Audit-Report cross-aggregation (not in scope) | TBD |
| G1 | `transferToRoom` rule in `reportService.js` flips status to `paid` when `is_room_settled === true`. | 1 conditional |
| G2 | Room Orders Report drops local checked-out filter. | trivial |
| G3 | Room Orders Outstanding recomputes correctly. | already correct — the formula starts producing 0 |
| OPT | Collapse the 3-call frontend pattern. | medium refactor |

## Diagnostic Code Currently Live (will help backend verification)
- `[CR-001 P2 DIAG] order=<id>` — logs raw API response for a watch-list of order ids on every fetch of `/order-logs-report`. Add an order id to the watch list in `reportService.js` to inspect.
- `[CR-001 G5 DIAG]` — auto-snapshot of any order with a missing prefix (helps spot dine-in counter / walkin rows).
- `[CR-004 P2 DIAG] /get-room-list response` — logs the full `/get-room-list` payload on `/reports/rooms` mount.

## Approval Path
- Drafted: 2026-04-29 (this session).
- Pending: backend team review + scheduling.
- After backend ships: frontend follow-ups above are queued behind a single small PR to wire the new fields and remove the diagnostics.

## Next Action
- Hand this sub-CR over to the backend team for sizing + scheduling.
- Frontend stays parked on these specific items until the asks above are delivered.
