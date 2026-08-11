# CR-106 — Investigation Report #2: 7 Items

**Document:** `evidence/CR-106/INVESTIGATION_REPORT_7_ITEMS_2026_07_26.md`
**Created:** 2026-07-26
**Role:** INVESTIGATION
**Status:** ROOT CAUSE FOUND — HIGH confidence for all 7 items
**Steps used:** 10/10

---

## 1. Summary

| # | Issue | Root Cause | Classification | Fix Scope |
|---|-------|-----------|----------------|-----------|
| I-1 | "Aggregator" missing from Platform dropdown | `PLATFORM_OPTIONS` only has All/POS/Web. No aggregator entry. | FE_BUG (missing option) | 1 file, ~5 lines |
| I-2 | Ready button doesn't work | 2 causes: (a) UrbanPiper rejects stale order IDs; (b) handler catches error silently — no toast. | FE_BUG + DATA_ISSUE | 1 file, ~3 lines (add toast) |
| I-3 | Item-level ready/serve shown for aggregator | OrderCard item status dots (line 623-720) have NO `isAggregator` guard. | FE_BUG (missing guard) | 1 file, ~2 lines |
| I-4 | After Ready → Served column + Dispatch flow | Status mapping is correct (ready=2→occupied column). User saw status-5 (Dispatched) which maps to served. Dispatch is API-triggered by staff, NOT auto by rider. | CLARIFICATION (not a bug) | Documentation only |
| I-5 | Auto-accept configuration | Backend has `auto_prep_time_ack: No` + `default_prep_time: 15`. **FE does NOT implement auto-accept for aggregator.** Feature is NOT built. | FE_GAP (missing feature) | NEW feature — needs planning |
| I-6 | Auto-KOT and auto-bill | Backend has `aggregator_auto_kot: Yes`, `aggregator_auto_bill: No`. FE settings UI reads `aggregatorAutoKot` but **aggregator acceptance flow does NOT trigger auto-KOT.** | FE_GAP (not wired) | Needs wiring into accept handler |
| I-7 | Dynamic prep time during auto-accept | Backend has `prep_time_count_method: quantity` + `prep_time_bonus_config` + `default_prep_time: 15`. **FE does NOT compute dynamic prep time.** | FE_GAP (missing feature) | NEW feature — needs planning |

---

## 2. Detailed Findings

### I-1: Aggregator Filter Missing from Platform Dropdown

**File:** `components/layout/PlatformDropdown.jsx`

**Current options:**
```js
export const PLATFORM_OPTIONS = [
  { value: null,  label: 'Platform: All' },
  { value: 'pos', label: 'POS' },
  { value: 'web', label: 'Web / Scan' },
];
```

**Missing:** `{ value: 'aggregator', label: 'Aggregator' }` (or `'Swiggy / Zomato'`)

**Platform predicate** (DashboardPage.jsx:854-858):
```js
const platformMatches = (item) => {
  if (platform === null) return true;
  return platform === 'web' ? isWebOrigin(item) : !isWebOrigin(item);
};
```
Currently, aggregator orders with `orderFrom: 'aggregator'` fall into the "POS" bucket (`!isWebOrigin`), which is incorrect. They need their own bucket.

**Code comment confirms intent:** "Future BE values (kiosk / aggregator / whatsapp / qr_campaign) extend this list — no other code change needed." — was planned but not executed.

---

### I-2: Ready Button Doesn't Work

**Cause A — Stale UrbanPiper order IDs (DATA_ISSUE):**
```
POST /api/v1/urbanpiper/orders-status-update
  {"order_id":40474, "urban_order_id":"1803634534", "new_status":"Food Ready"}
→ 200 {"message":"Failed to update order status at UrbanPiper","error":"{\"status\":\"error\",\"message\":\"Order id [1803634534] invalid.\"}"}
```
The 4 aggregator orders on preprod (40474-40477) have UrbanPiper IDs that are no longer valid. UrbanPiper rejects them as "invalid". **This is a test data freshness issue, not a code bug.**

**Cause B — Silent error handling (FE_BUG):**
```js
// DashboardPage.jsx:1373-1384
const handleAggregatorReady = useCallback(async (order) => {
  try {
    await updateAggregatorOrderStatus({ ... });
  } catch (err) {
    console.error('[Dashboard] Aggregator ready failed:', err);  // ← SILENT! No toast!
  }
}, []);
```
User clicks "Ready" → API call fails → error logged to console only → **no visual feedback to user**. User sees nothing happen.

**Recommended fix:** Add toast notification for success AND failure in all 4 aggregator handlers (accept, reject, ready, dispatch).

---

### I-3: Item-Level Ready/Serve Shown for Aggregator

**File:** `components/cards/OrderCard.jsx`

Item-level status toggles are at lines 623-720. Each item has a colored dot that can be clicked to toggle `preparing → ready → served`. This feature is for kitchen workflow on POS orders.

**No `isAggregator` guard exists.** Aggregator orders show the same item-level dots.

**User statement:** "we will not have item level ready and serve in aggregator order" — confirmed. Aggregator items are managed by the aggregator platform, not per-item on POS.

**Recommended fix:** Add `!isAggregator &&` guard on the item status dot click handler (line 401) and visual indicator (line 623+).

---

### I-4: After Ready → Status Flow + Dispatch Clarification

**Status mapping (from intake doc):**

| Aggregator Status | f_order_status | FE Column |
|---|---|---|
| New/Pending | 0 | Popup (mandatory) |
| Acknowledged (accepted) | 1 | Preparing |
| Food Ready | 2 | Ready (still 'occupied' column) |
| Cancelled | 3 | Cancelled |
| **Dispatched** | **5** | **Served column** |
| Completed | 6 | Paid (removed) |

**What user observed:** Order at f_order_status=5 (Dispatched) appearing in "Served" column → **This is CORRECT per the mapping.** `ORDER_TO_TABLE_STATUS['served'] = 'billReady'`.

**Flow after Ready click:**
1. Click Ready → API: `new_status: "Food Ready"` → backend changes f_order_status to 2
2. Socket fires `aggregator-order-update` → FE updates order to fOrderStatus=2
3. Card now shows in same column (still 'occupied') but with **Dispatch button** instead of Ready

**Dispatch flow:**
- Per the CR-106 intake doc: Dispatch is **manually triggered by POS staff** via the Dispatch button → opens AggregatorDispatchModal → staff enters rider name + phone → API call `new_status: "Dispatched"`
- Rider assignment/pickup info may come later via socket updates from UrbanPiper
- `auto_dispatch: No` in restaurant settings confirms: dispatch is NOT automatic

---

### I-5: Auto-Accept Configuration — NOT IMPLEMENTED

**Backend settings (restaurant 478):**
```
auto_prep_time_ack: No          ← Auto-accept OFF for this restaurant
default_prep_time: 15            ← Default prep time if auto-accept were ON
prep_time_count_method: quantity ← Calculate prep time per item quantity
```

**Frontend status:** Auto-accept for aggregator orders **does NOT exist in the codebase**. The AggregatorOrderPopOut always shows and requires manual Accept/Reject.

**What auto-accept would do when built:**
1. New aggregator order arrives (f_order_status=0) via socket
2. Instead of showing popup → automatically call Accept API with computed prep time
3. Order skips popup entirely → goes directly to Preparing state
4. Auto-KOT prints if `aggregator_auto_kot: Yes`

**Classification:** NEW FEATURE — needs full planning (Gate 2-3).

---

### I-6: Auto-KOT and Auto-Bill — Settings Exist, NOT Wired

**Backend settings (restaurant 478):**
```
aggregator_auto_kot: Yes           ← ENABLED — should auto-print KOT on accept
aggregator_auto_bill: No           ← Disabled
aggregator_auto_bill_stage: Ready  ← When enabled, trigger at "Ready" stage
```

**Frontend status:**
- Settings UI exists in `ViewEditViews.jsx:283` — toggle for "Aggregator Auto KOT" → reads/writes `aggregatorAutoKot`
- **BUT:** The aggregator accept handler (`handleAggregatorAccept` in DashboardPage.jsx:1336-1350) does NOT check `aggregator_auto_kot` and does NOT trigger KOT printing
- Regular order auto-KOT lives in `OrderEntry.jsx:1309` using `restaurant.settings.autoKot` — completely separate path
- Aggregator orders never go through OrderEntry → auto-KOT never fires

**What needs to happen:**
1. After successful Accept API call, check `restaurant.settings.aggregatorAutoKot`
2. If true → trigger KOT print for the accepted order
3. Similarly for auto-bill at the configured stage

---

### I-7: Dynamic Prep Time Calculation — NOT IMPLEMENTED

**Backend settings (restaurant 478):**
```json
default_prep_time: 15
prep_time_count_method: "quantity"
prep_time_bonus_config: [
  {"min_items":"1","max_items":"3","bonus_minutes":"0"},
  {"min_items":"4","max_items":"6","bonus_minutes":"?"},
  ...
]
```

**Frontend status:** The AggregatorOrderPopOut shows static pill presets (5/10/15/20/25/30) with manual input. There is **no dynamic calculation** based on:
- Total item quantity in the order
- `prep_time_count_method` (quantity-based)
- `prep_time_bonus_config` (bonus minutes per item bracket)
- `default_prep_time` (base time)

**What the calculation should be (when auto-accept is built):**
```
totalQty = sum of item quantities in order
bracket = prep_time_bonus_config.find(b => totalQty >= b.min_items && totalQty <= b.max_items)
dynamicPrepTime = default_prep_time + (bracket?.bonus_minutes || 0)
```

**For manual accept (current popup):** Could pre-select the computed pill value instead of defaulting to none.

---

## 3. Evidence Artifacts

| Artifact | Path |
|---|---|
| UrbanPiper API failure | Inline: `{"message":"Failed to update order status at UrbanPiper","error":"Order id [1803634534] invalid."}` |
| Restaurant settings | Probed via `GET /api/v1/vendoremployee/profile` — key fields documented above |
| Platform dropdown code | `components/layout/PlatformDropdown.jsx` (3 options, no aggregator) |
| Item status toggle | `OrderCard.jsx:623-720` (no isAggregator guard) |

---

## 4. Recommendations — Prioritized

| Priority | Item | Fix Type | Scope | Planning Needed? |
|---|---|---|---|---|
| **P0** | I-2b: Add toast for aggregator API failures | DIRECT_BUG_FIX | 1 file, ~10 lines | No (owner approve) |
| **P1** | I-1: Add "Aggregator" to Platform dropdown | DIRECT_BUG_FIX | 2 files, ~10 lines | No (owner approve) |
| **P1** | I-3: Hide item-level status for aggregator | DIRECT_BUG_FIX | 1 file, ~3 lines | No (owner approve) |
| **P2** | I-6: Wire auto-KOT on aggregator accept | FEATURE (small) | 1 file, ~15 lines | Gate 2-3 (touches printing) |
| **P2** | I-7: Pre-compute prep time from settings | FEATURE (small) | 1-2 files, ~20 lines | Gate 2-3 |
| **P3** | I-5: Full auto-accept flow | FEATURE (large) | 3+ files, ~100 lines | Gate 2-3 (new flow) |

---

## 5. Handover

```
Investigation complete. 7 items traced. Steps: 10/10. Confidence: HIGH.

Bugs (DIRECT_BUG_FIX eligible, owner approve):
  I-1: PlatformDropdown.jsx — add "Aggregator" option + predicate
  I-2b: DashboardPage.jsx — add toast on aggregator API failure
  I-3: OrderCard.jsx — hide item-level status toggles for aggregator

Clarifications:
  I-2a: Ready button API failure is stale test data (UrbanPiper rejects old order IDs)
  I-4: Status-5 → Served column is CORRECT. Dispatch is manual (staff), not auto (rider).

New features (need Gate 2-3 planning):
  I-5: Auto-accept flow (not implemented)
  I-6: Auto-KOT wiring on accept (settings exist, not wired)
  I-7: Dynamic prep time calculation (settings exist, not implemented)

Report: memory/evidence/CR-106/INVESTIGATION_REPORT_7_ITEMS_2026_07_26.md
```
