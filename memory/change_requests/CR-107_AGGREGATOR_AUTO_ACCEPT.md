# CR-107 — Aggregator Auto-Accept (with Dynamic Prep Time)

**ID:** CR-107
**Type:** CR (Feature)
**Created:** 2026-07-26
**Priority:** P2 — MEDIUM (operational efficiency; manual accept works as workaround)
**Risk:** HIGH (touches order flow, auto-triggers API calls, prep time computation)
**Module:** Dashboard — Aggregator Lifecycle
**Duplicate Check:** DISTINCT. Extends CR-106 (aggregator module).
**Source:** INVESTIGATION (Report #2, §I-5 + §I-7)
**Confidence:** CONFIRMED — backend settings exist (`auto_prep_time_ack`, `default_prep_time`, `prep_time_count_method`, `prep_time_bonus_config`), FE feature NOT built
**Code Reality:** NONE

## Description

When `auto_prep_time_ack` is enabled in restaurant settings, new aggregator orders (f_order_status=0) should be automatically accepted with dynamically computed prep time — bypassing the manual popup.

**Backend settings (restaurant 478):**
- `auto_prep_time_ack: No` (currently disabled)
- `default_prep_time: 15`
- `prep_time_count_method: quantity`
- `prep_time_bonus_config: [{"min_items":"1","max_items":"3","bonus_minutes":"0"}, ...]`

**Dynamic prep time formula:**
```
totalQty = sum(item.quantity for item in order.items)
bracket = bonus_config.find(b => totalQty >= b.min_items && totalQty <= b.max_items)
prepTime = default_prep_time + (bracket.bonus_minutes || 0)
```

## Blast Radius

LARGE — 3+ files (AggregatorOrderPopOut, DashboardPage, new hook/util), ~100 lines. Needs Gate 2-3 planning.
