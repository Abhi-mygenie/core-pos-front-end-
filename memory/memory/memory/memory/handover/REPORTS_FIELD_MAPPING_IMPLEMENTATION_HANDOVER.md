# Reports — Field-Mapping Implementation Handover (REVISED 2026-05-01)

**For:** Implementation Agent
**Source docs (read first, in order):**
1. `/app/memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md` — **authoritative status** (live preprod evidence)
2. `/app/memory/change_requests/REPORTS_FIELD_MAPPING_TRACKER.md` — original tracker (now partially outdated; audit supersedes)
3. `/app/memory/change_requests/BE_1_BACKEND_ASKS_CONSOLIDATED.md` — BE-1 spec
4. `/app/memory/change_requests/BE_2_LODGING_PAYMENT_BREAKDOWN.md` — BE-2 spec

**Branch:** `CR-28-april`
**Supersedes:** the earlier "standby playbook" version of this file (pre-audit).

---

## 0. Ground rules (POLICY UPDATE 2026-05-01)

1. **NO FALLBACKS.** If a field is absent, render blank. This means:
   - Drop `|| 'Employee #' + id` chains
   - Drop `|| '—'` in transforms (UI layer may still render `—` at display time for column alignment; that is a UI decision, not a transform decision)
   - Drop alternate-key chains like `api.cancel_reason || api.cancellation_reason` — pick the **one canonical key** per the audit
   - Drop the 5-key `resolveName()` chain at `reportService.js:735-766` — collapse to single canonical key per action type
2. **Canonical key = what backend actually sends** (verified in audit §1), not what the BE-1 spec said.
3. **One ticket = one commit** for rollback granularity.
4. **Diagnostic logs stay** only for tickets still blocked on backend. For tickets that land on the basis of this audit, **remove their diagnostic logs** in the same commit.
5. **No test agent, no automated test runs.** Manual QA against 18march (credentials work: `owner@18march.com` / `Qplazm@10`) — Mantri creds `Qplazm#10` failed during audit; ask user for updated password.

---

## 1. Four tickets that can ship NOW (backend confirmed)

### 1.1 · P1 — `waiter_name` (SHIPPED, wire today)

**Evidence:** `orders_table.waiter_name = "Manager" / "Owner"` on every row (audit §1.1).

**Edit — `frontend/src/api/services/reportService.js:720-724`**
```js
// BEFORE
const waiterId = api.waiter_id || null;
const waiterName = api.waiter_name || null;
const punchedBy = waiterName || (waiterId ? `Employee #${waiterId}` : '—');

// AFTER
const punchedBy = api.waiter_name || '';
```

**Edit — `frontend/src/api/transforms/reportTransform.js:160, 195, 278`**
Change `waiter: api.waiter_name || '—'` → `waiter: api.waiter_name || ''`.

**Do NOT touch** L385 (`orderDetails` transform — uses nested `order.waiter_name || employee.f_name`). That path is `/employee-order-details` and was not audited here. Leave for a follow-up.

**Verify:** Audit Report → PUNCHED BY shows real names on all rows. No `Employee #…` strings anywhere.

**LOC:** 4 lines modified.

---

### 1.2 · P3 — `cancellation_reason` (SHIPPED, wire today — key rename)

**Evidence:** `orders_table.cancellation_reason = "Hdgshhshs"` (audit §1.1). Canonical key is `cancellation_reason`, NOT `cancel_reason`.

**Edit — `frontend/src/api/transforms/reportTransform.js:216`**
```js
// BEFORE
cancellationReason: api.cancel_reason || api.cancellation_reason || '—',
// AFTER
cancellationReason: api.cancellation_reason || '',
```

**Edit — `frontend/src/api/transforms/reportTransform.js:404`**
```js
// BEFORE
cancellationReason: order.cancel_reason || order.cancellation_reason || null,
// AFTER
cancellationReason: order.cancellation_reason || null,
```

**Verify:** Cancelled tab → Reason column shows operator-entered text for cancelled rows. Cell is empty (no `—`) when reason unset.

**LOC:** 2 lines.

---

### 1.3 · P4 — `cancel_type` via item-level (SHIPPED at item level, wire today)

**Evidence:** `order_details_table[0].cancel_type = "Pre-Serve" | "Post-Serve" | "Order"` (audit §1.2). Order-level `orders_table.cancel_type` is absent.

**Edit — `frontend/src/api/transforms/reportTransform.js`** (cancelledOrder transform, around L217)

Add a helper near the top of the file:
```js
// BE-1 P4 — literal set confirmed 2026-05-01 via live payload audit:
//   Pre-Serve | Post-Serve | Order   (the last means whole-order cancel)
const CANCEL_TYPE_LABELS = {
  'Pre-Serve':  'Pre-Serve',
  'Post-Serve': 'Post-Serve',
  'Order':      '',            // whole-order cancel → blank (per product, OQ-2)
};
const normalizeCancelType = (raw) => CANCEL_TYPE_LABELS[raw] ?? '';
```

Update L217:
```js
// Read from item-level — order-level cancel_type is absent in current BE payload
cancellationType: normalizeCancelType(api.order_details_table?.[0]?.cancel_type),
```

Update L405 (`orderDetails` transform):
```js
cancellationType: normalizeCancelType(order.order_details_table?.[0]?.cancel_type),
```

Note: the `orders_table` is accessed via the wrapper in `reportService.js`. Check that the `api` object passed into `transform.cancelledOrder` has `order_details_table` available. If not (because the service layer unwraps to `orders_table` only), propagate the item-level `cancel_type` from the service layer:

**Edit — `frontend/src/api/services/reportService.js`** (around L533-550, inside `getOrderLogsReport`)
Attach item-level cancel_type to the transform input:
```js
const api = orderWrapper.orders_table || {};
api._firstItemCancelType = orderWrapper.order_details_table?.[0]?.cancel_type || null;
```

Then transform reads `api._firstItemCancelType`. (Alternative: pass the full `orderWrapper` through — pick whichever pattern matches the existing code; don't mix both.)

**Edit — `frontend/src/components/reports/OrderTable.jsx`** (Cancelled tab, after L164)

Add column definition (Cancelled tab only — scope by tab id):
```js
{ id: 'cancellationType', label: 'Status', sortable: true, width: 'w-28' },
```

Add cell renderer (near L501):
```js
case 'cancellationType':
  return (
    <span className="text-sm text-gray-700" data-testid={`row-cancel-type-${order.id}`}>
      {order.cancellationType}
    </span>
  );
```

**Edit — `frontend/src/components/reports/ExportButtons.jsx`** (after L65)
```js
columns.splice(7, 0, { key: 'cancellationType', label: 'Cancel Status' });
```

**Verify (18march tenant):**
- Cancelled tab → Status column populated with `Pre-Serve` on item-cancelled orders.
- Whole-order cancelled rows show **blank** Status (per `"Order"` → `""` map).
- CSV export carries the new column.

**Open question before final ship:** confirm OQ-2 (render `"Order"` as blank, literal "Order", or "Whole order"). Default here: blank.

**LOC:** ~25.

---

### 1.4 · P5 — `table_name` (KEY RENAME, wire today)

**Evidence:** Backend sends `table_name`, not `table_no` (audit §1.1, §3.4). Frontend currently reads `api.table_no` which is always undefined → column blank.

**Edit — `frontend/src/api/services/reportService.js`** (search `table_no` across the file)

```js
// BEFORE
const tableName = api.table_no || null;
// AFTER
const tableName = api.table_name || null;
```

**Edit — `frontend/src/api/transforms/reportTransform.js`** — verify `extractLocation()` helper. Likely same rename.

**⚠ Do NOT rename the FE variable `tableName`** — only the backend key lookup changes. Downstream UI types stay on `tableName`.

**Verify against a dine-in row:**
- Today's 18march sample had `table_id=0` for all rows (no dine-in with table). Before merging, fire a fresh /order-logs-report against a tenant with an active dine-in order (Mantri once creds fixed) and confirm `api.table_name = "T-7"` (or similar) populates the TABLE NO column.

**LOC:** 2 lines.

---

## 2. Five tickets still BLOCKED on backend

| Ticket | Status | Action |
|---|---|---|
| P2 paid (`collect_by_name`) | ❌ No collector-name field present on any paid row | Do **not** touch `resolveName()` yet. Keep chain until backend confirms delivery. |
| P2 whole-order cancel (`cancel_by_name`) | ❌ `canceled_by` is null even for cancelled row | Same — keep chain. |
| P2 merged (`merge_by_name`) | ❌ No merged orders in sample; no `merge_*` keys | Need a merged sample first. |
| ~~P6 / BE-2 §4.3 (`room_info` on /order-logs-report)~~ | ✅ **SHIPPED 2026-05-01** | See §2.5 — frontend rewire still pending product OK |
| BE-2 §4.1 lodging breakdown | ⚠ Partially derivable via `advance_payment + receive_balance` | See §2.6 — derived-formula option ready |
| G1 `is_room_settled` | ❌ Not shipped | — |
| G3 `associated_orders[i].payment_status` | ❌ associated_orders ships without `payment_status` (only `order_status` 0/1/2) | — |

When each ships, apply the corresponding section from the original handover (or see §5 below for pre-planned edits).

### 2.5 · BE-1 P6 / BE-2 §4.3 — `room_info` + `associated_orders` on /order-logs-report (SHIPPED, rewire pending)

**Evidence:** Audit §1.5 / §1.6. Both blocks are now on the wrapper of RM rows. Confirmed against 18march tenant on 2026-04-27 / 2026-04-29.

**Frontend opportunity (1+N cleanup):** `RoomOrdersReportPage` currently fires `getSingleOrderRoom(parentOrderId)` per RM row to fetch `room_info` + associated SRMs. With this delivery, both can be read directly from the `/order-logs-report` payload — collapses N+1 calls to 1.

**Suggested edit (approve before merging):**

`reportService.js::getOrderLogsReport` (around L580+ where the row is transformed) — attach the wrapper's `room_info` and `associated_orders` to the transformed row:
```js
// After existing transform, before return:
if (orderIn === 'RM') {
  transformed.roomInfo = orderWrapper.room_info || null;
  transformed.associatedOrders = (orderWrapper.associated_orders || []).map(a => ({
    id: a.id,
    orderId: a.order_id,
    amount: parseFloat(a.order_amount) || 0,
    orderStatus: a.order_status,
    createdAt: a.created_at,
  }));
}
```

`RoomRowCard.jsx` — drop the `useEffect` that calls `getSingleOrderRoom`; consume `row.roomInfo` + `row.associatedOrders` directly. **Caveat:** SRM `payment_status` is still not in `associated_orders`. The `optimisticRemovedIds` Set workaround stays until G3.

**LOC:** ~30 net (delete fetch + cache logic; add 8-line passthrough).

**Status:** **NOT YET IMPLEMENTED.** Awaiting product sign-off because:
1. RoomOrdersReportPage relies on `getSingleOrderRoom` for richer detail (room_info shape on `/get-single-order-new` differs slightly — fewer fields). Need to confirm the new `/order-logs-report` shape is sufficient.
2. SRM payment status (G3) is still pending — current `RoomRowCard` math walks the associated list to filter settled SRMs. Without G3, this still needs the optimistic set + getSingleOrderRoom for SRM child status.

### 2.6 · BE-2 §4.1 — derived formula now possible

**Evidence:** Audit §1.5 / §1.7. `lodging_collected = advance_payment + receive_balance` validates against the live 7000/2000/5000 sample.

**Suggested formula change in `RoomRowCard.jsx::numbers` (L340-399)** — only when `room_info.payment_status === 'paid'`:
```js
const advance = parseFloat(ri.advance_payment) || 0;
const received = parseFloat(ri.receive_balance) || 0;
const price = parseFloat(ri.room_price) || 0;
const isLodgingPaid = ri.payment_status === 'paid';
const lodgingCollected = advance + received;
const discount = isLodgingPaid ? Math.max(0, price - lodgingCollected) : 0;
// food side stays as today (Rule-2)
const outstanding = isFullySettled ? 0 : food + Math.max(0, price - lodgingCollected);
const paid = lodgingCollected + (isFullySettled ? food : 0);
```

**Caveat:** without an explicit `discount_amount`/`discount_reason`, a tenant that genuinely failed to collect cannot be distinguished from a tenant that approved a discount. Use this formula only with a clear product decision.

**Status:** **NOT YET IMPLEMENTED.** Awaiting product sign-off on:
1. Use derived formula now, or wait for explicit BE-2 §4.1 delivery?
2. Should the Discount column be added now (showing derived discount) or wait for `discount_reason` for context?

---

## 3. Fallback removal audit (cross-cutting, do last)

After the 4 ticketed edits, do a single cleanup commit across both files:

**Search and remove these patterns** (only where the canonical key is now authoritative):

- `|| '—'` at transform output layer (keep at display layer in `OrderTable.jsx` where column width needs a placeholder — if any)
- `Employee #${id}` string construction in `reportService.js:739` (inside `resolveName`) — **keep for P2 items still blocked**; remove only when backend ships their names
- Transform-level `api.waiter_name || '—'` → `api.waiter_name || ''` (done in §1.1)

**Do NOT remove:**
- `resolveName()` entirely — still needed until P2 ships
- `getActiveSrmIds()` — still needed until G1 ships
- `optimisticRemovedIds` Set in `RoomOrdersReportPage.jsx` — still needed until G3 verified
- Rule-2 approximation in `RoomRowCard.jsx` — still needed until BE-2 ships

---

## 4. Diagnostic logs — remove for shipped tickets only

After §1 edits land and preprod verification passes for each ticket:

| Log | Keep? | Reason |
|---|---|---|
| `[CR-001 P2 DIAG]` | **KEEP** | Still need for P2 fields not yet shipped |
| `[CR-001 G5 DIAG]` | **KEEP** | Auto-snapshots malformed prefixes — still valuable |
| `[CR-004 P2 DIAG]` | Review | Was for `/get-room-list` — that endpoint is now trusted; fine to remove with LOI+G2 cleanup PR |

---

## 5. Pre-planned edits for the 5 remaining items (apply when each ships)

### 5.1 BE-2 (lodging breakdown)
See original handover §3.2. Add invariant check: `lodging_collected + discount_amount + balance_payment === room_price`.

### 5.2 G3
See original handover §3.1. Drop `optimisticRemovedIds` Set + 1500ms timeout in `RoomOrdersReportPage.jsx:373-430`.

### 5.3 G1
See original handover §3.8. Delete `getActiveSrmIds()` + its call-sites.

### 5.4 P2 (order-level `*_by_name`)
Collapse `resolveName` chain in `reportService.js:735-766` to single keys once BE confirms canonical names:
- Paid: `api.collect_by_name` + `api.collect_by_id`
- Cancelled: `api.cancel_by_name` + `api.cancel_by_id`
- Merged: `api.merge_by_name` + `api.merge_by_id`

### 5.5 P6 (room_info on /order-logs-report)
Drop the 1+N `getSingleOrderRoom` loop in `reportService.js:362-371` once `room_info` is available on RM rows in /order-logs-report.

---

## 6. Verification matrix (manual QA, 18march-primary)

| Ticket | Tenant | Page | Signal |
|---|---|---|---|
| P1 | 18march + Mantri (creds pending) | `/reports/audit` all tabs | PUNCHED BY = real names; no `Employee #…` |
| P3 | 18march | `/reports/audit` Cancelled tab | Reason = operator text |
| P4 | 18march | `/reports/audit` Cancelled tab | Status column: `Pre-Serve` on item-cancel, blank on order-cancel |
| P5 | Mantri (tenant with dine-in) | `/reports/audit` Paid tab | TABLE NO = real label (e.g. "T-7") |

**Credentials:** Mantri password `Qplazm#10` returned auth-001. **Get updated Mantri credentials from user before verifying P5 / BE-2 / G3.**

---

## 7. Open questions (block specific edits)

| # | Question | Blocks |
|---|---|---|
| OQ-1 | `employee_name` vs `waiter_name` — which is "puncher"? | Optional column enhancement; not a blocker for §1.1 |
| OQ-2 | `cancel_type="Order"` render — blank / "Order" / "Whole order"? | §1.3 P4 column text (default: blank) |
| OQ-3 | P5 key rename permanent (`table_name`) or will backend add `table_no` too? | §1.4 — edit is the same either way |
| OQ-4 | Updated Mantri password | Testing P5 / BE-2 / G3 |
| OQ-5 | `employee_*` fields — are they safe to ignore for now? | §1.1 — current default: ignore |

---

## 8. Post-implementation checklist

After each ticket lands:
- [ ] Code edit matches §1 exactly
- [ ] Diagnostic log trimmed per §4 (only for the shipped ticket)
- [ ] Manual QA against 18march (and Mantri once creds fixed)
- [ ] Update `REPORTS_FIELD_MAPPING_TRACKER.md`:
  - Move row §4.2 → §4.1 with ship date
  - Update "As of" header + §8 change log
- [ ] Commit: `fix(reports): BE-1 <code> — <field> wired to canonical BE key`

---

## 9. Handover sign-off

- **Live audit:** 2026-05-01 against preprod (18march tenant, 7 rows across 2 dates + 1 RM folio).
- **Conclusion:** 4 tickets (P1, P3, P4 via item-level, P5 via key rename) are **ready to implement today**. 5 tickets remain blocked on backend delivery.
- **Policy:** no-fallback — canonical BE keys only, UI renders blank when absent.

**End of revised handover.**
