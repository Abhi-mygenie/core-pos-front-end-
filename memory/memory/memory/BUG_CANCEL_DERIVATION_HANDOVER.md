# Handover — Cancelled Order Classification Fix (Audit Report)

**Prepared:** 2026-05-01
**Scope:** Frontend-only. Single-file behaviour fix in the report status-derivation pipeline.
**Branch context:** `1-may` (Emergent deployment)
**Ticket tag:** BUG-CANCEL-DERIVATION (May-2026)
**Risk:** Low. See §8.

---

## 1. Problem Statement

In the Audit Report (`/reports/audit`), some **genuinely cancelled** orders are showing up on the **Audit** tab instead of the **Cancelled** tab.

The frontend's status-derivation pipeline for the `order-logs-report` endpoint keys cancellation exclusively off `payment_method === 'Cancel' / 'cancelled'`. On the current backend contract, that is not a reliable signal — cancellation can occur at any payment-flow stage, so `payment_method` on a cancelled row may be `"pending"`, `"transferToRoom"`, or any other value depending on what was set when the cashier cancelled the order.

**The authoritative signal for cancellation is `f_order_status === 3`** — a single, exclusive enum value that the backend sets on every cancelled order, regardless of payment state at the moment of cancellation. Product and backend teams confirm: any row with `f_order_status === 3` **is** cancelled, no exceptions.

## 2. Live Evidence (collected 2026-05-01 from preprod, restaurant 478)

Endpoint: `POST https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report` with body `{"sort_by":"created_at","from_date":"2026-05-01","to_date":"2026-05-01"}`.

### 2.1 Distribution for the day

| `f_order_status` | Count | Meaning |
|---|---|---|
| 3 | 13 | cancelled |
| 5 | 5 | in-progress |
| 6 | 6 | paid |

### 2.2 The two rows that leak into Audit

| `restaurant_order_id` | `f_order_status` | `order_status` | `payment_method` | `cancel_at` | Today's UI tab |
|---|---|---|---|---|---|
| **002291** (the one in the screenshot) | `3` | `"cancelled"` | `"pending"` | `2026-05-01 16:13:03` | ❌ Audit |
| **002289** | `3` | `"cancelled"` | `"transferToRoom"` | `2026-05-01 18:55:57` | ❌ Audit |

### 2.3 The 11 rows that classify correctly

All 11 rows with `f_order_status === 3` **and** `payment_method === "Cancel"` are already shown on the Cancelled tab. No change for these.

### 2.4 Exclusivity check (critical)

Every row with `f_order_status === 3` today has `cancel_at` populated OR `order_status === 'cancelled'` OR `payment_method === 'Cancel'`. **No non-cancelled row carries `f_order_status === 3`.** The enum is exclusive.

## 3. Root Cause (file:line)

**File:** `/app/frontend/src/api/services/reportService.js`
**Function:** `reportFromAPI.singleOrderNew` (inside the `reportFromAPI` object exported near the bottom; the status block is at **lines 660‑725**).

Current derivation chain:
```js
let status = 'audit';                                                           // line 669

if      (paymentMethod === 'Cancel' || paymentMethodLower === 'cancelled')  status = 'cancelled';
else if (paymentMethod === 'Merge'  || paymentStatus === 'Merge')           status = 'merged';
else if (paymentMethod === 'TAB')                                           status = 'credit';
else if (fStatus === 9 || paymentMethodLower === 'paylater')                status = 'hold';
else if (paymentMethodLower === 'transfertoroom')                           { /* running/unpaid/paid sub-chain */ }
else if (paymentStatus === 'unpaid')                                        status = 'unpaid';
else if (fStatus === 6)                                                     status = 'paid';
else if (fStatus !== 3 && fStatus !== 6 && fStatus !== 9 && fStatus != null) status = 'running';
// else falls through to 'audit'
```

**Issues with the current order:**
1. The **cancel rule keys on `payment_method`**, not on the authoritative `f_order_status === 3`.
2. The **running rule excludes `fStatus === 3`** explicitly — so a cancelled row that slipped past the `payment_method === 'Cancel'` check has nowhere to land and falls through to `'audit'`.
3. The `transferToRoom` branch (lines 687‑709) has its own nested conditions that do not set a status for `fStatus === 3`, so a cancelled-after-transfer row also leaks.
4. The comment at line 720 (`"Cancelled (3), paid (6) and hold (9) are already handled above."`) is an unchecked assumption that only holds if all cancellations emit `payment_method === 'Cancel'` — which this backend does not guarantee.

## 4. Target Rule

> **`f_order_status === 3` ⇒ `status = 'cancelled'`.** This is the single, authoritative check for cancellation. It must run **first** in the chain.

All other existing rules remain intact. The `payment_method === 'Cancel'` check becomes a redundant safety net; we **keep** it rather than remove it, for robustness against any future backend variations where `f_order_status` might be absent on a cancelled row.

## 5. Exact Code Change

**File:** `/app/frontend/src/api/services/reportService.js`
**Lines to replace:** `669` through `725` (the entire `let status = 'audit'` block up to and including the fall-through comment).

### 5.1 OLD (lines 669‑725 — paste-and-replace target)

```js
    let status = 'audit';

    // CR-001 priority-based status determination.
    // Order matters. The `hold` rule must run BEFORE `unpaid` so paylater rows
    // never leak into Unpaid. The legacy `transferred` rule (paymentMethod === 'ROOM'
    // || orderIn === 'SRM' → 'transferred') has been removed entirely per Q-A —
    // room rows are excluded globally at the page layer (CS-16..CS-22), so the
    // value is no longer derived here.
    if (paymentMethod === 'Cancel' || paymentMethodLower === 'cancelled') {
      status = 'cancelled';
    } else if (paymentMethod === 'Merge' || paymentStatus === 'Merge') {
      status = 'merged';
    } else if (paymentMethod === 'TAB') {
      status = 'credit';
    } else if (fStatus === 9 || paymentMethodLower === 'paylater') {
      // CR-001 CS-1: Hold rule keyed on f_order_status === 9 OR payment_method === 'paylater'
      // (case-insensitive). Method-first per EC-9 (paylater + payment_status === 'paid' is still Hold).
      status = 'hold';
    } else if (paymentMethodLower === 'transfertoroom') {
      // … (existing transferToRoom sub-chain, unchanged) …
      if (activeSrmIds === null || activeSrmIds.has(api.id)) {
        status = 'running';
      } else if (paymentStatus === 'unpaid') {
        status = 'unpaid';
      } else if (fStatus === 6) {
        status = 'paid';
      }
    } else if (paymentStatus === 'unpaid') {
      status = 'unpaid';
    } else if (fStatus === 6) {
      status = 'paid';
    } else if (fStatus !== 3 && fStatus !== 6 && fStatus !== 9 && fStatus != null) {
      // CR-001 follow-up (Audit fall-through fix): open / in-progress orders
      // (kitchen preparing, served, billed-not-collected — i.e. f_order_status
      // ∈ {0, 1, 2, 4, 5, 7, 8}) are 'running', not 'audit'. Audit must remain
      // a true catch-all reserved for genuinely anomalous rows where
      // f_order_status is null/undefined or no other rule matched.
      // Cancelled (3), paid (6) and hold (9) are already handled above.
      status = 'running';
    }
    // No silent `else status = 'paid'` — only orders with null/undefined
    // f_order_status (or no derivation rule match) fall through to the
    // 'audit' default declared above.
```

### 5.2 NEW (replacement — identical chain with ONE new rule added at priority 1)

```js
    let status = 'audit';

    // CR-001 priority-based status determination.
    // Order matters. The `hold` rule must run BEFORE `unpaid` so paylater rows
    // never leak into Unpaid. The legacy `transferred` rule (paymentMethod === 'ROOM'
    // || orderIn === 'SRM' → 'transferred') has been removed entirely per Q-A —
    // room rows are excluded globally at the page layer (CS-16..CS-22), so the
    // value is no longer derived here.
    //
    // BUG-CANCEL-DERIVATION (May-2026): `f_order_status === 3` is the
    // authoritative, exclusive backend signal for a cancelled order. Product
    // and backend confirm no other row carries this value. Previously the
    // cancel rule keyed only on `payment_method === 'Cancel'`, which is not
    // set when a cashier cancels an order before payment is chosen (stays
    // `"pending"`) or after a room transfer (`"transferToRoom"`). Such rows
    // silently leaked into the Audit tab. The rule is now promoted to
    // priority-1 so it catches the cancel signal regardless of
    // payment_method state. Live evidence (restaurant 478, 2026-05-01):
    // orders 002291 (payment_method=pending) and 002289 (payment_method=
    // transferToRoom) both had f_order_status=3 but were landing in Audit.
    if (fStatus === 3) {
      status = 'cancelled';
    } else if (paymentMethod === 'Cancel' || paymentMethodLower === 'cancelled') {
      // Kept as a defensive safety-net in case a future backend row carries
      // payment_method='Cancel' without f_order_status=3. Redundant on the
      // current contract but harmless.
      status = 'cancelled';
    } else if (paymentMethod === 'Merge' || paymentStatus === 'Merge') {
      status = 'merged';
    } else if (paymentMethod === 'TAB') {
      status = 'credit';
    } else if (fStatus === 9 || paymentMethodLower === 'paylater') {
      // CR-001 CS-1: Hold rule keyed on f_order_status === 9 OR payment_method === 'paylater'
      // (case-insensitive). Method-first per EC-9 (paylater + payment_status === 'paid' is still Hold).
      status = 'hold';
    } else if (paymentMethodLower === 'transfertoroom') {
      // … (existing transferToRoom sub-chain, unchanged) …
      if (activeSrmIds === null || activeSrmIds.has(api.id)) {
        status = 'running';
      } else if (paymentStatus === 'unpaid') {
        status = 'unpaid';
      } else if (fStatus === 6) {
        status = 'paid';
      }
    } else if (paymentStatus === 'unpaid') {
      status = 'unpaid';
    } else if (fStatus === 6) {
      status = 'paid';
    } else if (fStatus !== 6 && fStatus !== 9 && fStatus != null) {
      // CR-001 follow-up (Audit fall-through fix): open / in-progress orders
      // (kitchen preparing, served, billed-not-collected — i.e. f_order_status
      // ∈ {0, 1, 2, 4, 5, 7, 8}) are 'running', not 'audit'. Audit must remain
      // a true catch-all reserved for genuinely anomalous rows where
      // f_order_status is null/undefined or no other rule matched.
      // Cancelled (3) is now handled by the priority-1 rule above; this
      // branch no longer needs to exclude it explicitly.
      status = 'running';
    }
    // No silent `else status = 'paid'` — only orders with null/undefined
    // f_order_status (or no derivation rule match) fall through to the
    // 'audit' default declared above.
```

### 5.3 Diff summary

Three material changes inside the replacement block:

1. **Added** a new priority-1 branch (`if (fStatus === 3) status = 'cancelled';`).
2. **Converted** the old priority-1 check to an `else if` safety-net (one-word change: `if` → `else if`).
3. **Removed** the now-redundant `fStatus !== 3` exclusion from the `running` branch (simplifies the condition from `fStatus !== 3 && fStatus !== 6 && fStatus !== 9 && fStatus != null` to `fStatus !== 6 && fStatus !== 9 && fStatus != null`).

Plus comment updates to document the reason.

> The `else if` in step 2 is the subtle but important part — DO NOT make it a separate `if` or you'll double-set `status` and break no-op predictability.

## 6. Regression Test (new)

**File:** `/app/frontend/src/__tests__/api/services/reportService-status.test.js` (new file, or append to an existing `reportService` spec if present — run `fd reportService /app/frontend/src/__tests__` first).

### 6.1 Minimum test matrix

The test should exercise the full status-derivation table as it stands **post-fix**, with the two new live-evidence regression cases pinned as named tests.

```js
/**
 * BUG-CANCEL-DERIVATION (May-2026) regression coverage for
 * reportFromAPI.singleOrderNew status derivation.
 *
 * Live evidence reference: restaurant 478 on 2026-05-01. Orders 002291
 * (payment_method=pending, f_order_status=3) and 002289 (payment_method=
 * transferToRoom, f_order_status=3) previously leaked into Audit; both
 * must now resolve to 'cancelled'.
 */

import { reportFromAPI } from '../../../api/transforms/reportTransform';
// NOTE: the status-derivation block lives inside reportService.js's
// singleOrderNew factory. If it's inlined in reportService, test via
// getOrderLogsReport by stubbing the HTTP layer, or export the helper
// for direct unit testing. Prefer the latter for speed.

const buildRow = (overrides = {}) => ({
  orders_table: {
    id: 1,
    restaurant_order_id: '002000',
    f_order_status: null,
    order_status: null,
    payment_method: null,
    payment_status: null,
    order_type: 'dinein',
    order_from: 'pos',
    ...overrides,
  },
  order_info: { id: 1, restaurant_order_id: '002000' },
  order_details_table: [],
  room_info: {},
  associated_orders: [],
});

describe('reportFromAPI.singleOrderNew — status derivation', () => {
  describe('BUG-CANCEL-DERIVATION priority-1 rule', () => {
    it('[002291 live] f_order_status=3 + payment_method="pending" → cancelled', () => {
      const row = buildRow({
        restaurant_order_id: '002291',
        f_order_status: 3,
        order_status: 'cancelled',
        payment_method: 'pending',
      });
      const cooked = /* invoke singleOrderNew(row) */;
      expect(cooked.status).toBe('cancelled');
    });

    it('[002289 live] f_order_status=3 + payment_method="transferToRoom" → cancelled', () => {
      const row = buildRow({
        restaurant_order_id: '002289',
        f_order_status: 3,
        order_status: 'cancelled',
        payment_method: 'transferToRoom',
      });
      const cooked = /* invoke singleOrderNew(row) */;
      expect(cooked.status).toBe('cancelled');
    });

    it('[existing behavior] f_order_status=3 + payment_method="Cancel" still → cancelled', () => {
      const row = buildRow({ f_order_status: 3, payment_method: 'Cancel' });
      expect(/* invoke */.status).toBe('cancelled');
    });

    it('f_order_status=3 alone (no payment_method) → cancelled', () => {
      const row = buildRow({ f_order_status: 3 });
      expect(/* invoke */.status).toBe('cancelled');
    });
  });

  describe('priority-2..N rules remain unaffected', () => {
    it('f_order_status=6 + payment_method="cash" → paid', () => {
      expect(/* invoke */.status).toBe('paid');
    });
    it('f_order_status=9 → hold', () => {
      expect(/* invoke */.status).toBe('hold');
    });
    it('f_order_status=5 → running', () => {
      expect(/* invoke */.status).toBe('running');
    });
    it('payment_method="Merge" → merged', () => {
      expect(/* invoke */.status).toBe('merged');
    });
    it('payment_method="TAB" → credit', () => {
      expect(/* invoke */.status).toBe('credit');
    });
    it('payment_method="paylater" → hold', () => {
      expect(/* invoke */.status).toBe('hold');
    });
    it('payment_status="unpaid" (no fStatus) → unpaid', () => {
      expect(/* invoke */.status).toBe('unpaid');
    });
    it('null f_order_status + unrecognised payment_method → audit', () => {
      const row = buildRow({ f_order_status: null, payment_method: 'zombie' });
      expect(/* invoke */.status).toBe('audit');
    });
  });
});
```

### 6.2 How to invoke `singleOrderNew`

The derivation is inside the `reportFromAPI.singleOrderNew` factory but may not be directly exported. Two acceptable approaches:

- **Preferred:** add a small named export at the top of `reportService.js` — e.g.,
  ```js
  export const _deriveStatus = (api, activeSrmIds = null) => { /* the block */ };
  ```
  and call it from `singleOrderNew`. The `_` prefix signals internal-but-testable. Zero behaviour change.
- **Alternative:** test via `getOrderLogsReport` by mocking the `api.post` HTTP call to return a synthetic `order` array. More boilerplate; slower tests.

## 7. Verification Plan

### 7.1 Automated

```bash
cd /app/frontend
CI=true yarn test --testPathPattern=reportService --watchAll=false
# should show the 11 new regression cases green, plus any existing reportService tests
```

Webpack compile check:
```bash
tail -30 /var/log/supervisor/frontend.out.log
# expect: "webpack compiled successfully" (or the pre-existing LoadingPage.jsx
# exhaustive-deps warning — unchanged)
```

### 7.2 Live preprod verification

Log into the deployed preview as `owner@18march.com` / `Qplazm@10` on today (or whichever date has cancelled rows with non-`Cancel` payment_method).

1. Open `/reports/audit`.
2. Click the **Audit** tab → confirm orders **002291** and **002289** are no longer listed (for 2026-05-01 data).
3. Click the **Cancelled** tab → confirm **002291** and **002289** are now listed alongside the 11 that were already there. Count should go from **11 → 13**.
4. Click the **All Orders** tab → total count unchanged; re-classified rows just move tabs.
5. Drill into 002291 via the new Cancelled tab → `OrderDetailSheet` opens normally with the full order data.

### 7.3 API probe (optional, to re-capture current state)

```bash
TOKEN=$(curl -s -X POST "https://preprod.mygenie.online/api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@18march.com","password":"Qplazm@10"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")

curl -s -X POST "https://preprod.mygenie.online/api/v2/vendoremployee/report/order-logs-report" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sort_by":"created_at","from_date":"2026-05-01","to_date":"2026-05-01"}' \
  | python3 -c "
import sys,json
d = json.load(sys.stdin)
orders = d.get('order') or []
print(f'Total orders: {len(orders)}')
from collections import Counter
print('f_order_status distribution:',
      dict(Counter(o.get('orders_table',{}).get('f_order_status') for o in orders)))
print('payment_method distribution:',
      dict(Counter((o.get('orders_table',{}).get('payment_method') or '').lower()
                   for o in orders)))
# cancellation leaks
leaks = [o.get('orders_table',{}).get('restaurant_order_id')
         for o in orders
         if o.get('orders_table',{}).get('f_order_status') == 3
         and (o.get('orders_table',{}).get('payment_method') or '').lower()
             not in ('cancel','cancelled')]
print(f'Cancelled rows NOT carrying payment_method=Cancel: {leaks}')
"
```

Expected on 2026-05-01: `Cancelled rows NOT carrying payment_method=Cancel: ['002291', '002289']`.

## 8. Risk Assessment

**Low.**

| Dimension | Assessment |
|---|---|
| Behavioural delta | Narrow and positive — 2 rows today move from Audit → Cancelled. All other rows unchanged. |
| Reversibility | Trivial — single-file edit, one git revert. |
| Backend dependency | None — uses only data already in the response. |
| Consumer breakage | None — `status === 'cancelled'` is already a supported value throughout the codebase (tab filter at `AllOrdersReportPage.jsx:87`, OrderTable badge at `OrderTable.jsx:61-93`, OrderDetailSheet header, etc.). No new enum introduced. |
| False-positive risk | Zero on today's data. Confirmed via `/order-logs-report` probe: **no** non-cancelled row carries `f_order_status === 3`. If a backend bug ever emits `f_order_status=3` on a non-cancelled row, that row would mis-classify as cancelled — product-acceptable since the rule is product-authoritative. |
| Test coverage | New regression file pins the two live-evidence IDs plus 9 sibling rules. |

## 9. Rollback Plan

1. `git revert` the single commit.
2. No data migration; the change is purely in-memory derivation.
3. Regression test file can be left in place (it will still pass against the reverted code for every case except the two `002291` / `002289` tests — those two will fail, signalling the revert correctly).

## 10. Out of Scope (explicitly excluded)

- Any change to `payment_method === 'Cancel'` rule — kept as a defensive safety net.
- Any change to the `transferToRoom` sub-chain for non-cancelled rows — its `running / unpaid / paid` handling remains untouched; only the pre-check (the new priority-1 rule) short-circuits cancelled transferToRoom rows.
- Backend changes — none needed.
- Any other status tab (Merged, Hold, Unpaid, Credit, Paid, Running, Audit) — unaffected.
- Gap-detection / MISSING placeholder logic in `AllOrdersReportPage.jsx:309‑337` and `OrderTable.jsx:insertMissingOrders` — unaffected.

## 11. Touched Files Summary

| File | Edit | LOC delta |
|---|---|---|
| `/app/frontend/src/api/services/reportService.js` | 1 block replacement (lines 669‑725) | +4 lines (new branch + comment) / −0 (nothing removed) |
| `/app/frontend/src/__tests__/api/services/reportService-status.test.js` | New file | +≈90 lines |

**Net production LOC added: ~4.**

## 12. Open Questions / Follow-ups (non-blocking)

1. **Redundant `payment_method === 'Cancel'` safety net** — can be removed in a follow-up once the primary rule has soaked for a release. Not recommended to remove in the same commit as the primary rule, for clean blame and easy revert.
2. **Other status enums** — the same root cause (trusting `payment_method` over `f_order_status`) could in principle affect other statuses, but live data shows the current rules for `paid` (`fStatus===6`), `hold` (`fStatus===9`), and `running` (`fStatus∈{0..2,4..5,7..8}`) already key primarily off `f_order_status`. Only the `cancelled` path was keyed off the weaker signal. No other fix required.
3. **Display of Cancelled orders' `payment_method`** — today the `Payment` column will show `"pending"` or `"transferToRoom"` for the two recovered rows. This is technically accurate (that's what the backend says) but may confuse operators who expect `"Cancelled"`. If product wants UI-side override, that is a separate cosmetic change in `OrderTable.jsx` and out of scope for this ticket.

## 13. Contact / References

- Investigation trail: prior conversation thread on Emergent (2026-05-01), including live-API probe outputs in `/tmp/order-logs.json` of the session environment.
- Related prior ticket on this file: `CR-001 CS-2` (changed default fallback from `'paid'` to `'audit'`) and `CR-001 follow-up (Audit fall-through fix)` — both already merged; current change is compatible.
- No related in-flight work touches `reportService.js` in the current branch.

---

*End of handover.*
