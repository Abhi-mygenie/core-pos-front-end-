# TASK_RV4_MULTI_ORDER_PER_TABLE.md
## Validation Task: Can Multiple Running Orders Exist for the Same Table?

> Priority: P1 | Type: Runtime Validation | Blocks: P1-2
> Duration: ~15 minutes | Requires: Active login session, browser devtools console

---

## Objective

Determine whether the MyGenie backend can return multiple running orders with the same `table_id` in a single API response. This determines whether `CONTRADICTION-3` (getOrderByTableId first-match vs orderItemsByTableId last-match) is a real data integrity issue or a cosmetic code inconsistency.

---

## Why This Task Is Needed Now

Two methods in `OrderContext` for looking up orders by `table_id` use opposite strategies:

```
getOrderByTableId(5) → orders.find() → returns FIRST match (orderA)
orderItemsByTableId[5] → loop with map[5] = order → keeps LAST match (orderB)
```

`DashboardPage` uses BOTH:
- Line 187: grid enrichment → `getOrderByTableId` (FIRST)
- Line 474: opening OrderEntry → `orderItemsByTableId` (LAST)

If the `orders[]` array can contain `[orderA(table=5), orderB(table=5)]`, the dashboard shows `orderA` on the grid but opens `orderB` in OrderEntry. The user clicks one order but edits a different one.

**If always unique**: Both return the same result. CONTRADICTION-3 is cosmetic. P1-2 is a cleanup task.
**If multiple possible**: CONTRADICTION-3 is a data integrity bug. P1-2 is a P0-level fix.

---

## Affected Modules/Files

This validation examines data from these files but does NOT modify them:

- `contexts/OrderContext.jsx` — lines 157-159 (`getOrderByTableId`), lines 192-216 (`orderItemsByTableId`), line 187 (`getOrdersByTableId` — note: this function DOES exist and returns an array, but is unused by DashboardPage)
- `pages/DashboardPage.jsx` — line 187 (grid), line 474 (OrderEntry open)
- `api/transforms/orderTransform.js` — line 124 (`tableId: api.table_id || 0`)
- `api/services/orderService.js` — `getRunningOrders()` line 12 (the API endpoint that provides all running orders)

---

## Exact Scope

**IN SCOPE:**
1. Fetch the running orders API response
2. Group orders by `table_id`
3. Check if any `table_id` has more than one order
4. If yes: identify the scenario (which orders, which statuses)
5. Document finding

**EXCLUDED SCOPE:**
- No code changes
- No testing of order placement or cancellation
- No testing of the merge/shift/transfer flows (these create new orders server-side)
- No modification to `orderItemsByTableId` or `getOrderByTableId`

---

## Validation Steps

### Method A: Console Query (quickest, recommended)

**Step 1**: Login and navigate to dashboard (ensure orders are loaded)

**Step 2**: Open browser devtools Console and run:

```js
// Fetch current running orders directly from API
const API_BASE = 'https://preprod.mygenie.online/';
const token = localStorage.getItem('auth_token');

fetch(`${API_BASE}api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  const orders = data.orders || [];
  console.log(`Total running orders: ${orders.length}`);
  
  // Group by table_id
  const byTable = {};
  for (const o of orders) {
    const tid = o.table_id || 0;
    if (!byTable[tid]) byTable[tid] = [];
    byTable[tid].push({
      order_id: o.order_id,
      table_id: tid,
      order_status: o.order_status,
      f_order_status: o.f_order_status,
      order_in: o.order_in,
      created_at: o.created_at
    });
  }
  
  // Find duplicates
  const duplicates = Object.entries(byTable)
    .filter(([tid, orders]) => tid !== '0' && orders.length > 1); // Exclude walk-ins (table_id=0)
  
  if (duplicates.length === 0) {
    console.log('%c RESULT: No duplicates found. Each table has at most 1 running order.', 'color: green; font-weight: bold');
    console.log('CONCLUSION: CONTRADICTION-3 is cosmetic. P1-2 is low priority.');
  } else {
    console.log(`%c RESULT: ${duplicates.length} table(s) have multiple running orders!`, 'color: red; font-weight: bold');
    for (const [tid, orders] of duplicates) {
      console.log(`Table ${tid}: ${orders.length} orders`);
      console.table(orders);
    }
    console.log('CONCLUSION: CONTRADICTION-3 is a DATA INTEGRITY issue. P1-2 should be escalated to P0.');
  }
  
  // Also check: are there table_id=0 orders? (walk-ins — expected to have multiple)
  const walkIns = byTable['0'] || byTable[0] || [];
  console.log(`Walk-in orders (table_id=0): ${walkIns.length} (expected: multiple)`);
});
```

**Step 3**: Record the output.

### Method B: Curl from Backend (alternative)

```bash
API_BASE="https://preprod.mygenie.online/"
TOKEN=$(curl -s -X POST "${API_BASE}api/v1/auth/vendoremployee/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"YOUR_EMAIL","password":"YOUR_PASSWORD"}' | python3 -c "import sys,json;print(json.load(sys.stdin).get('token',''))")

curl -s "${API_BASE}api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager" \
  -H "Authorization: Bearer ${TOKEN}" | python3 -c "
import sys, json
from collections import defaultdict
data = json.load(sys.stdin)
orders = data.get('orders', [])
print(f'Total orders: {len(orders)}')
by_table = defaultdict(list)
for o in orders:
    by_table[o.get('table_id', 0)].append(o.get('order_id'))
dupes = {k: v for k, v in by_table.items() if k != 0 and len(v) > 1}
if dupes:
    print(f'DUPLICATES FOUND: {dupes}')
else:
    print('No duplicates. Each table has at most 1 running order.')
"
```

### Method C: Historical Check via Context (supplementary)

Even if current running orders show no duplicates, race conditions during merge/cancel could temporarily create them. Run this in console on the dashboard to monitor in real-time:

```js
// Monitor for duplicate table_id assignments in real-time
const origLog = console.log;
const __tableMonitor = setInterval(() => {
  // Access React internal state (works in development mode)
  const orderCtx = document.querySelector('[data-testid]')?.__reactFiber$;
  // Alternative: just check what the context returns
}, 5000);

// Or: add a console spy for OrderContext addOrder
// Watch for: "[OrderContext] addOrder: Adding new order X" followed by 
// another add for same tableId
```

This is supplementary — the primary test is Method A.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Restaurant has no orders currently (empty response) | Run test during active service hours, or place 2+ test orders on different tables first. |
| Walk-in orders (table_id=0) skew results | The script explicitly excludes table_id=0 from duplicate detection. Walk-ins are expected to share table_id=0. |
| Backend temporarily returns duplicates during a merge-in-progress | Run Method A multiple times over a 5-minute window to catch transient states. |
| Race condition is timing-dependent and hard to reproduce | Method C (real-time monitor) helps, but if duplicates never appear in normal operation, the risk is theoretical. Document as "not observed but not disproven." |

---

## Acceptance Criteria

- [ ] **AC-1**: Running orders API fetched and grouped by `table_id`
- [ ] **AC-2**: Walk-in orders (table_id=0) correctly excluded from duplicate check
- [ ] **AC-3**: Result documented as one of:
  - **NO DUPLICATES**: Each non-zero `table_id` has at most 1 running order. CONTRADICTION-3 is cosmetic.
  - **DUPLICATES FOUND**: Specific `table_id`(s) have multiple orders. Document which orders and their statuses. CONTRADICTION-3 is a data integrity issue.
  - **NOT CONCLUSIVE**: No orders currently running, or restaurant has no table orders. Need to test during active hours.
- [ ] **AC-4**: If duplicates found: identify the scenario (merge in progress? race condition? business rule?)

---

## Evidence to Capture

1. **Console output** from Method A showing total orders and grouping result
2. **Duplicate details** (if any): table_id, order_ids, statuses, timestamps
3. **Number of unique table_ids** vs total orders (to confirm the ratio)
4. **Observation context**: time of day, approximate restaurant activity level

Store in: `/app/memory/v2/evidence/RV4_multi_order_per_table_result.md`

---

## Rollback Notes

N/A — this is a read-only validation task. No code changes.

---

## Exact Next Prompt After Completion

**If result = NO DUPLICATES:**
```
RV-4 validated: No multiple running orders per table observed.
CONTRADICTION-3 is cosmetic. Execute P1-2 from REFACTOR_BACKLOG.md at P1 priority.
Align both getOrderByTableId and orderItemsByTableId to use find() (first-match) for consistency.
Add a dev-mode assertion in addOrder that logs a warning if duplicate tableId detected.
Files: contexts/OrderContext.jsx only.
```

**If result = DUPLICATES FOUND:**
```
RV-4 validated: Multiple running orders per table ARE possible.
ESCALATE P1-2 to P0 priority. CONTRADICTION-3 is a data integrity issue.
Immediate fix required in contexts/OrderContext.jsx:
  1. orderItemsByTableId must become Map<tableId, order[]> (array, not single)
  2. getOrderByTableId should return array, let DashboardPage handle display
  3. DashboardPage.jsx lines 187 and 474 must handle multi-order per table
  4. Also check: does the engaged lock mechanism need per-order (not per-table) tracking?
Refer to VALIDATED_ARCHITECTURE.md INV-5c for the current inconsistency details.
```

**If result = NOT CONCLUSIVE:**
```
RV-4 not conclusive: insufficient data (no running orders or no table orders observed).
Keep P1-2 at P1 priority with CONTRADICTION-3 caveat.
Add defensive logging: in OrderContext.addOrder, log a warning when a new order has the same
tableId as an existing order (non-zero). This will catch the edge case if it ever occurs in production.
Revisit RV-4 during the next active service period.
```
