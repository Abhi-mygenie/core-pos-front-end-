# CR-106 Wave 2 — Batch 3+4 Planning Gap Analysis

**Document:** `plans/BATCH3_4_PLANNING_GAP_ANALYSIS.md`
**Created:** 2026-07-27
**Role:** PLANNING
**Status:** GAP IDENTIFIED — Batch 3+4 share computation logic, should be planned together

---

## Planning Gap

CR-109 (Batch 3) and CR-107 (Batch 4) were planned as separate batches, but they share the **same core logic** — dynamic prep time computation from restaurant settings.

### Shared Computation Logic

```
INPUT:  order.items[] + restaurant.settings
OUTPUT: computed prep time in minutes

STEPS:
1. totalQty = sum of item.quantity across all items in order
2. Find bracket in prep_time_bonus_config where:
   min_items <= totalQty <= max_items
3. prepTime = default_prep_time + bracket.bonus_minutes
```

**Restaurant 478 brackets:**
| Items | Bonus | Total Prep |
|-------|-------|-----------|
| 1–3   | +0    | 15 min    |
| 4–6   | +5    | 20 min    |
| 7–10  | +10   | 25 min    |
| 11–15 | +15   | 30 min    |
| 16+   | +20   | 35 min    |

### How Each Batch Uses This Logic

**Batch 3 — CR-109 (manual popup path):**
```
auto_prep_time_ack = No (current state)
  → New aggregator order arrives (f_order_status=0)
  → AggregatorOrderPopOut shows
  → COMPUTE prep time from brackets
  → Pre-select the matching pill (e.g., 15 min → "15" pill highlighted)
  → Staff can change or accept as-is
  → Manual "Accept" click required
```

**Batch 4 — CR-107 + CR-108 (auto-accept path):**
```
auto_prep_time_ack = Yes
  → New aggregator order arrives (f_order_status=0)
  → COMPUTE prep time from brackets (SAME logic as CR-109)
  → Skip popup entirely
  → Auto-call Accept API with computed prep time
  → Order goes to Preparing immediately
  → If aggregator_auto_kot = Yes → auto-print KOT (CR-108)
  → Staff sees order in Preparing column — no manual action
```

### Recommendation

Build the **computation util** once (in CR-109), then CR-107 reuses it. Batch 3 can proceed independently — it only adds computation + pill pre-selection. Batch 4 uses the same util but adds the auto-accept flow.

**No planning change needed.** Original batch split is valid. CR-109 is a prerequisite for CR-107 but not a blocker — they can be built sequentially.

---

## Decisions Summary (All Sessions)

| # | Decision | Answer | Date |
|---|----------|--------|------|
| OD-W2-1 | BUG-250 approach | A — Simple skip in polling | 2026-07-26 |
| OD-W2-2 | BUG-254 toast | Error only, no success toast | 2026-07-26 |
| OD-W2-3 | CR-110 badge | MyGenie mascot icon from GENIE_LOGO_URL | 2026-07-26 |
| OD-W2-6 | Dispatched (status 5) | STAY on dashboard with "Dispatched" label | 2026-07-26 |
| OD-W2-7 | Completed (status 6) | REMOVE from dashboard | 2026-07-26 |
| OD-W2-8 | Cancelled (status 3) | REMOVE from dashboard | 2026-07-26 |
| OD-W2-9 | CR-111 scope | Aggregator only | 2026-07-27 |
| OD-W2-10 | CR-112 scope | Aggregator only, Option B (context) | 2026-07-27 |
| OD-W2-11 | CR-112 price permission | **EMPLOYEE-LEVEL** (role-based), not restaurant-level. Key TBD by owner. | 2026-07-27 |
| OD-W2-12 | CR-113 data source | UrbanPiper API (NOT CRM) | 2026-07-27 |
