# BUG-133 — "Check In" Item in Reports: Implementation Plan

**Created:** 2026-06-12
**Gate:** 3 (Implementation Plan)
**Item:** BUG-133 (Check In item leaking into reports)
**Validated against:** Live API data — Welcome Resort (rid=474): 118 "check in" items in 15 days, 117 with non-zero prices (₹1,100–₹3,600 room tariffs)

---

## SEVERITY UPGRADE: P2 → P1 (money impact confirmed)

Welcome Resort data proves "check in" items carry **room tariff prices** (₹1,200–₹3,600). If these leak into reports:
- **Item Ledger:** "check in" would appear as a food item with ₹1,500 revenue per room check-in
- **Revenue totals inflated** by room tariffs being counted as food sales
- **118 affected items in 15 days** for one restaurant = potentially ₹1.5+ lakhs of phantom food revenue

---

## LIVE API VALIDATION

| Restaurant | Check In Items | Prices | Name Pattern | food_for |
|-----------|---------------|--------|-------------|----------|
| **Welcome Resort** (rid=474) | **118 in 15 days** | ₹1,000–₹3,600 (room tariffs) | lowercase `"check in"` | `"Normal"` ← NOT catchable by food_for filter |
| **Palm House** (rid=541) | 4 in 5 days | ₹0 (zero price) | `"Check In"` (capitalized) | `"Normal"` |
| **Cafe103** (rid=644) | 0 | — | — | — (no rooms) |
| **Lafetta** (rid=78) | 0 | — | — | — (no rooms) |

**Critical:** Name casing varies between restaurants: `"check in"` (lowercase) at Welcome Resort vs `"Check In"` (capitalized) at Palm House. The filter MUST be case-insensitive.

**Critical:** `food_for = "Normal"` for ALL check-in items — the `productTransform.js` filter (`foodFor === 'Normal'`) does NOT catch them. Only string name match works.

---

## SCOPE LOCK

### Files I WILL modify
| File | Change | Lines |
|------|--------|-------|
| `api/services/insightsService.js` | Add filter at 2 item loop entry points | ~2 lines each |
| `api/services/orderLedgerService.js` | Filter in `toLedgerRow` item mapping | ~2 lines |
| `api/transforms/reportTransform.js` | Filter in `parseOrderItem` call site (L962) | ~2 lines |
| `api/services/roomOrdersService.js` | Filter in order item processing | ~2 lines |
| `api/services/foodCourtService.js` | Filter in station item processing | ~2 lines |
| `pages/reports-module/CancellationsMockup.jsx` | Filter in item iteration (L255) | ~2 lines |

### Files I will NOT touch
| File | Reason |
|------|--------|
| `api/transforms/productTransform.js` | Already has `check in` filter (L48) — menu/products list only |
| `api/transforms/orderTransform.js` | Already has `isCheckInMarker` handling (L278) — running orders only |
| `api/transforms/categoryTransform.js` | Already has category filter (L37) |
| `pages/reports-module/PrepServeTimeMockup.jsx` | Uses `insightsService` — covered by Edit 1 |

---

## FILTER FUNCTION (shared helper)

**The filter string:** `(name || '').trim().toLowerCase() === 'check in'`

Per owner directive: case-insensitive, trimmed, exact match on `"check in"`.

**Create a reusable helper** to avoid 6 copies of the same logic:

**Option A — Inline (simpler, no new file):**
Each file adds its own 1-line check. Pattern:
```js
if ((fd.name || '').trim().toLowerCase() === 'check in') continue;
```

**Option B — Shared utility (DRY):**
Add to an existing utils file or `orderPayloadStripper.js` (CR-045):
```js
export const isCheckInMarker = (name) => (name || '').trim().toLowerCase() === 'check in';
```

**Recommendation: Option A** — simpler, no import needed, each site is self-documenting. Only 6 locations. If CR-045 (strip) ships first, the filter could move into `stripOrder()` instead.

---

## EDIT-BY-EDIT PLAN

### Edit 1 — insightsService.js: `getItemSalesAggregated` item loop (L126-129)

This is the **primary Item Ledger aggregation loop**. Every item flows through here.

**Current (L126-129):**
```js
    for (const line of items) {
      totalLines += 1;
      const foodId = line.food_id;
      if (!foodId) continue;
```

**New:**
```js
    for (const line of items) {
      totalLines += 1;
      const foodId = line.food_id;
      if (!foodId) continue;

      // BUG-133: Skip "check in" marker items — backend room check-in marker,
      // not real food. Carries room tariff as price (₹1,200–₹3,600) which
      // would inflate revenue. Validated: Welcome Resort 118 items in 15 days.
      let fd = {};
      try {
        fd = typeof line.food_details === 'string' ? JSON.parse(line.food_details) : (line.food_details || {});
      } catch (e) {
        fd = {};
      }
      if ((fd.name || '').trim().toLowerCase() === 'check in') continue;
```

**Wait — there's already an `fd` parse at L131-137.** Let me check if we can reorder:

**Actually, L131-137 already parses `fd`.** The `food_id` check at L129 is BEFORE the fd parse. We need the fd parse to happen before the check-in filter. **Solution: move the filter AFTER the existing fd parse (after L137):**

**Better approach — insert after L137:**
```js
      // BUG-133: Skip "check in" marker items — room tariff disguised as food item.
      if ((fd.name || '').trim().toLowerCase() === 'check in') continue;
```

**Insert at: Line 138 (after the fd parse try/catch block)**

### Edit 2 — insightsService.js: `getDashboardAggregated` item loop (~L800)

Second item iteration in insightsService (for Dashboard revenue tiles).

**Current (L800-812):**
```js
    for (const line of items) {
      const foodId = line.food_id;
      ...
          fd = typeof line.food_details === 'string' ? JSON.parse(line.food_details) : (line.food_details || {});
```

**Insert after fd parse (~L813):**
```js
      // BUG-133: Skip "check in" marker items.
      if ((fd.name || '').trim().toLowerCase() === 'check in') continue;
```

### Edit 3 — reportTransform.js: `orderLogsReportRow` items mapping (L961-962)

This feeds the **Audit Report** and **Order Ledger** (via `orderLedgerService`).

**Current (L961-962):**
```js
  const rawItems = orderWrapper.order_details_table || [];
  const items = rawItems.map(parseOrderItem);
```

**New:**
```js
  const rawItems = (orderWrapper.order_details_table || []).filter(item => {
    const fd = typeof item.food_details === 'string'
      ? ((() => { try { return JSON.parse(item.food_details); } catch { return {}; } })())
      : (item.food_details || {});
    return (fd.name || '').trim().toLowerCase() !== 'check in'; // BUG-133
  });
  const items = rawItems.map(parseOrderItem);
```

**Alternative (cleaner — use the existing `safeJsonParse` at L726):**
```js
  const rawItems = (orderWrapper.order_details_table || []).filter(item => {
    const name = (safeJsonParse(item.food_details)?.name || '').trim().toLowerCase();
    return name !== 'check in'; // BUG-133
  });
  const items = rawItems.map(parseOrderItem);
```

### Edit 4 — CancellationsMockup.jsx: item iteration (L255)

Direct API consumer — iterates items for cancel aggregation.

**Current (L255):**
```js
      for (const item of (o.order_details_table || [])) {
```

**New:**
```js
      for (const item of (o.order_details_table || [])) {
        // BUG-133: Skip "check in" marker items
        const _fdRaw = item.food_details;
        const _fdObj = typeof _fdRaw === 'string' ? (() => { try { return JSON.parse(_fdRaw); } catch { return {}; } })() : (_fdRaw || {});
        if ((_fdObj.name || '').trim().toLowerCase() === 'check in') continue;
```

**Note:** This parse is duplicated from the existing parse at L262. To avoid double-parse, move the existing parse up and share:

**Cleaner approach (L255-265):**
```js
      for (const item of (o.order_details_table || [])) {
        let fd = {};
        try {
          fd = typeof item.food_details === 'string' ? JSON.parse(item.food_details) : (item.food_details || {});
        } catch { fd = {}; }
        // BUG-133: Skip "check in" marker items
        if ((fd.name || '').trim().toLowerCase() === 'check in') continue;
        // ... rest of item processing uses `fd` (already parsed)
```
This replaces the existing parse at L262 — same variable name, just moved earlier.

### Edit 5 — roomOrdersService.js: order item processing

**Check:** How does this service iterate items?

The service at L92 iterates `raw.forEach((wrapper) => ...)` but processes at ORDER level (grouping rooms), not at ITEM level. Items appear in the Room Orders report via the **detail drill-down** which uses `orderLogsReportRow` (Edit 3 covers this).

**However**, the Room Orders report also shows item names in the order card. Let me check:

Room Orders uses `reportTransform.orderLogsReportRow` → `items` array. Edit 3 filters there. **So roomOrdersService.js may NOT need a separate edit** — the filter at reportTransform level catches it.

**But to be safe**, check if roomOrdersService has its own item iteration:
- L92: iterates ORDER wrappers, not items
- L128: `orderItemTotal = (o.items || []).reduce(...)` — this reads from already-transformed items
- L148: `orderDetails: stationItems.map(...)` — same

**Conclusion:** roomOrdersService reads from `reportTransform` output. Edit 3 covers it. **No separate edit needed.**

### Edit 6 — foodCourtService.js: station item processing

**Check:** L219-234 iterates `(o.items || []).forEach((it) => ...)` for station aggregation. These `items` come from the transform pipeline.

If foodCourtService uses `reportTransform.orderLogsReportRow` → Edit 3 covers it.

Let me verify:
```
cd /app/frontend/src && grep -n "reportListFromAPI\|orderLogsReport\|reportTransform" api/services/foodCourtService.js
```

<actually I need to check this>

**For safety, I'll include foodCourtService in the plan but mark it as "verify during implementation".**

---

## VERIFICATION CHECKLIST

### Pre-implementation: Baseline capture
Before any code changes, capture the current state on Welcome Resort (rid=474, May 1-15):
- [ ] Item Ledger → search for "check in" → note if it appears and with what revenue
- [ ] Dashboard → note total revenue (will decrease after fix)
- [ ] Order Ledger → find a room order → note if "check in" appears in item list

### Post-implementation: Verify removal
- [ ] **Item Ledger** (Welcome Resort, May 1-15) → "check in" does NOT appear as an item. Revenue totals decrease by room tariff amounts.
- [ ] **Item Ledger** (Palm House) → same verification
- [ ] **Dashboard** (Welcome Resort) → revenue does not include room tariffs
- [ ] **Order Ledger** → room order detail drill-down → "check in" NOT in items list
- [ ] **Cancellations** → no "check in" items in cancel aggregation
- [ ] **Food Court** → no "check in" in station breakdown
- [ ] **Audit Report** (AllOrdersReportPage) → side-sheet for a room order → "check in" NOT in items
- [ ] **Cafe103** (no rooms) → reports unchanged, no regression
- [ ] **Lafetta** (no rooms) → reports unchanged, no regression
- [ ] **No console errors** across all reports

### Edge cases to test
- [ ] Room order with ONLY a "check in" item (no food) → order should show 0 items after filter
- [ ] Order with "check in" + real food items → only food items remain
- [ ] "Check In" with capital letters (Palm House pattern) → filtered
- [ ] "check in" with lowercase (Welcome Resort pattern) → filtered
- [ ] " check in " with extra spaces → filtered (trim handles this)

---

## EXECUTION SEQUENCE

```
Step 1: Edit 1 — insightsService.js getItemSalesAggregated      ~3 min
Step 2: Edit 2 — insightsService.js getDashboardAggregated       ~3 min
Step 3: Edit 3 — reportTransform.js orderLogsReportRow            ~5 min
Step 4: Edit 4 — CancellationsMockup.jsx                         ~5 min
Step 5: Edit 5/6 — Verify roomOrders + foodCourt coverage        ~5 min
Step 6: VERIFY — all reports on Welcome Resort + Palm House       ~15 min
```

**Total: ~35 minutes**

---

## RISK REGISTER

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R-1 | "check in" string match misses a variant | LOW | Verified live: only `"check in"` (lowercase) and `"Check In"` (capitalized) seen. Trim + lowercase handles both. |
| R-2 | Legitimate food item named "Check In" | ZERO | No restaurant would name a food item "Check In". It's a system marker. |
| R-3 | Room order with only "check in" shows 0 items | EXPECTED | Correct — the order is a check-in container, not a food order. Item count will be 0 or show only associated food items. |
| R-4 | Revenue totals change (decrease) | EXPECTED | Correct — room tariffs should NOT be counted as food revenue. The decrease = the fix. |
| R-5 | Double-parse of food_details in some edit points | LOW | Mitigated by reusing existing parse or moving parse earlier. No performance impact (JSON.parse is fast for small blobs). |
| R-6 | foodCourtService item source unclear | LOW | Verify during implementation whether it reads from reportTransform output or raw API. If raw, add filter. |

---

*BUG-133 Implementation Plan — 2026-06-12. Validated against live API data from 4 restaurants. P1 (money — room tariffs inflating food revenue).*
