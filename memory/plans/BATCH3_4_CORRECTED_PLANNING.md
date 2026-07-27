# CR-106 Wave 2 — Batch 3+4 Corrected Planning

**Document:** `plans/BATCH3_4_CORRECTED_PLANNING.md`
**Created:** 2026-07-27
**Role:** PLANNING
**Status:** DECISIONS LOCKED — awaiting Gate 4 GO

---

## Corrected Understanding (2026-07-27)

### Old Plan (WRONG):
- Batch 3 (CR-109): Just pre-select pill in popup, manual accept
- Batch 4 (CR-107): Skip popup entirely, auto-accept in background

### Corrected Flow (OWNER CONFIRMED):

```
New aggregator order arrives (f_order_status=0 via socket)
  ↓
COMPUTE prep time from brackets:
  totalQty = sum(item.quantity)
  bracket = find(min_items <= totalQty <= max_items)
  prepTime = default_prep_time(15) + bracket.bonus_minutes
  ↓
IF auto_prep_time_ack = YES:
  → Popup shows with pill PRE-SELECTED (e.g., "15" highlighted)
  → AUTO-ACCEPTS IMMEDIATELY with that time (no manual click needed)
  → Popup closes/dismisses
  → IF aggregator_auto_kot = Yes → PRINT KOT
  → Order moves to Preparing column
  
IF auto_prep_time_ack = NO:
  → Popup shows with pill PRE-SELECTED
  → Staff MANUALLY selects time + clicks Accept
  → Normal manual flow (existing AggregatorOrderPopOut)
```

### Key Correction:
CR-109 now includes auto-accept behavior when `auto_prep_time_ack = Yes`. The popup **briefly shows** with the pre-selected pill then **auto-accepts** — staff sees what time was chosen but doesn't need to act. This merges the old CR-109 + CR-107 scope.

---

## Decisions Locked (2026-07-27)

| # | Decision | Answer |
|---|----------|--------|
| OD-W2-13 | CR-112 price permission key | **`Swiggy_zomato_price`** — employee-level permission (role-based). Backend created. Not yet in Owner role's 53 permissions — needs role assignment. |
| OD-W2-14 | CR-109 auto-accept behavior | Popup shows with pre-selected pill → **auto-accepts immediately** with computed time. No manual click when `auto_prep_time_ack = Yes`. |
| OD-W2-15 | KOT trigger timing | **After successful Accept API call**, if `aggregator_auto_kot = Yes` → frontend calls `printOrder(orderId, 'kot', ...)`. Same pattern as regular QSR auto-KOT. |

---

## Revised Batch Plan

### Batch 3 (CR-109 + CR-107 merged) — ~50 lines, MEDIUM risk

**Scope:**
1. **Util:** `utils/aggregatorPrepTime.js` (~15 lines) — pure computation function
2. **AggregatorOrderPopOut.jsx** (~20 lines):
   - Read `settings.auto_prep_time_ack`, `settings.default_prep_time`, `settings.prep_time_bonus_config`
   - Compute prep time on mount
   - Pre-select matching pill
   - If `auto_prep_time_ack = Yes` → auto-trigger accept after brief delay (~1-2s for visual feedback)
3. **DashboardPage.jsx** (~15 lines):
   - After successful accept, if `aggregator_auto_kot = Yes` → call `printOrder(orderId, 'kot', ...)`

**Files WILL change:**
- `utils/aggregatorPrepTime.js` (NEW — computation util)
- `components/dashboard/AggregatorOrderPopOut.jsx` (pre-select + auto-accept)
- `pages/DashboardPage.jsx` (auto-KOT after accept)

**Files WILL NOT touch:**
- `aggregatorTransform.js`, `aggregatorService.js`, `OrderCard.jsx`, `TableCard.jsx`

### Batch 4 (CR-108 standalone — auto-bill) — DEFERRED

Only auto-bill remains (triggers at `aggregator_auto_bill_stage` when enabled). Currently `aggregator_auto_bill = No`. Low priority.

---

## KOT Trigger — Detailed Flow

```
handleAggregatorAccept(order, prepTimeMins)
  ↓
POST /api/v1/urbanpiper/orders-status-update
  { order_id, urban_order_id, new_status: "Acknowledged", extra: { prep_time_mins } }
  ↓
IF success:
  → Socket fires aggregator-order-update → order moves to fOrderStatus=1 (Preparing)
  → Check: restaurant.settings.aggregator_auto_kot === 'Yes'
  → IF true: printOrder(order.orderId, 'kot', null, order, 0, {}, printerAgents)
  → KOT prints on configured printer
  
IF failure:
  → toast.error('Failed to accept order — please retry') (existing BUG-254)
  → No KOT
```

---

## Prep Time Brackets (Restaurant 478)

| Total Items | Bracket | Bonus | Computed Prep Time |
|------------|---------|-------|-------------------|
| 1–3 | 1 | +0 min | **15 min** → pill "15" |
| 4–6 | 2 | +5 min | **20 min** → pill "20" |
| 7–10 | 3 | +10 min | **25 min** → pill "25" |
| 11–15 | 4 | +15 min | **30 min** → pill "30" |
| 16+ | 5 | +20 min | **35 min** → manual input (no 35 pill) |

---

## UPDATE 2026-07-27: KOT/Bill PARKED

**Owner directive:** Park the print (KOT + bill) part. Keep as separate CR (CR-108). Owner will reconfirm payload later.

**CR-109 revised scope (FINAL):**
1. Prep time computation util
2. Pre-select pill in popup
3. Auto-accept when `auto_prep_time_ack = Yes`
4. ~~Auto-KOT~~ → PARKED in CR-108

**CR-108 status:** PARKED — owner reconfirming KOT/bill payload before implementation.

**Batch 3 = CR-109 only (~35 lines, 2 files). No printing.**
