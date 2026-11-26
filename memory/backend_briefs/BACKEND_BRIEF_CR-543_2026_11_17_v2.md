# BACKEND_BRIEF_CR-543 — v2 (Revised after Backend Feedback)

**Supersedes:** `BACKEND_BRIEF_CR-543_2026_11_17.md` (v1)
**Revision reason:** Backend feedback — tier boundary ambiguity, full-order cancel scope, missing timestamp handling
**Date:** 2026-11-17
**Priority:** P0 / HIGH
**Assigned to:** Gyan

---

## Changes from v1

| # | What Changed | v1 | v2 |
|---|---|---|---|
| C1 | Tier boundaries | Ambiguous inclusive ranges (0–5, 5–15, etc.) | **Exclusive upper bounds using seconds** (0≤s<300, 300≤s<900, etc.) |
| C2 | `duration_minutes` calculation | Not specified | **`floor(elapsed_seconds / 60)`** |
| C3 | Full-order cancel scope | Allowed `scope: "order"` | **Always `scope: "item"` — emit per-item events** |
| C4 | Missing `punch_time` | Not addressed | **`risk_level: "unknown"`, `duration_minutes: null`** — never skip |
| C5 | Negative duration | Not addressed | **`risk_level: "ok"`, `duration_minutes: 0`** — log server warning |
| C6 | `risk_level` allowed values | 4 values | **5 values** (added `"unknown"`) |
| C7 | KPI counts | 5 counts | **6 counts** (added `late_cancel_unknown_count`) |

---

## Summary

- **Issue:** No time-based cancellation risk classification in audit
- **Classification:** NEW_FEATURE (audit observability)
- **Frontend impact:** Order Edit Audit page needs late-cancel risk tiers per cancelled item
- **Priority/Risk:** P0 / HIGH

---

## Endpoint

- **Method:** POST
- **URL:** `/api/v2/vendoremployee/report/insights-dashboard`
- **Auth:** Bearer token
- **Response section:** `audits.orders[]` (new event type) + `audits` (new KPI counts)

---

## Owner Decision (LOCKED 2026-11-17)

Fixed 4-tier risk classification — NO configurable threshold, NO settings API needed.
Tiers are hardcoded server-side — consistent audit standard across all restaurants.

---

## Classification Rules (FINAL — v2)

Backend computes `elapsed_seconds = cancel_timestamp - punch_timestamp` (both in same timezone, converted to seconds).

| Tier | Rule (seconds) | `risk_level` value | Displayed `duration_minutes` | FE Badge |
|------|---------------|-------------------|------------------------------|----------|
| 1 — OK | `0 ≤ elapsed < 300` | `"ok"` | `floor(elapsed/60)` → 0–4 | Green |
| 2 — Doubt | `300 ≤ elapsed < 900` | `"doubt"` | `floor(elapsed/60)` → 5–14 | Amber |
| 3 — Risk | `900 ≤ elapsed < 1800` | `"risk"` | `floor(elapsed/60)` → 15–29 | Orange |
| 4 — High Risk | `elapsed ≥ 1800` | `"high_risk"` | `floor(elapsed/60)` → 30+ | Red |
| N/A — Unknown | `punch_time` is null/missing | `"unknown"` | `null` | Grey |

### Boundary examples:

| `elapsed_seconds` | `duration_minutes` | `risk_level` |
|---|---|---|
| 0 | 0 | `"ok"` |
| 299 | 4 | `"ok"` |
| 300 | 5 | `"doubt"` ← exactly 5 min = Doubt, NOT OK |
| 899 | 14 | `"doubt"` |
| 900 | 15 | `"risk"` ← exactly 15 min = Risk, NOT Doubt |
| 1799 | 29 | `"risk"` |
| 1800 | 30 | `"high_risk"` ← exactly 30 min = High Risk |
| 7200 | 120 | `"high_risk"` |
| null | null | `"unknown"` |

### Pseudocode:

```
function classifyLateCancelRisk(punch_time, cancel_time):
    if punch_time is NULL or punch_time is invalid:
        return { risk_level: "unknown", duration_minutes: null }
    
    elapsed_seconds = (cancel_time - punch_time) in seconds
    
    if elapsed_seconds < 0:   // clock skew / data error
        log_warning("Negative cancel duration", order_id, punch_time, cancel_time)
        return { risk_level: "ok", duration_minutes: 0 }
    
    duration_minutes = floor(elapsed_seconds / 60)
    
    if elapsed_seconds < 300:     return { risk_level: "ok",        duration_minutes }
    if elapsed_seconds < 900:     return { risk_level: "doubt",     duration_minutes }
    if elapsed_seconds < 1800:    return { risk_level: "risk",      duration_minutes }
    return { risk_level: "high_risk", duration_minutes }
```

---

## Scope Rules (FINAL — v2)

### Always emit per-item events (`scope: "item"`).

Do NOT emit `scope: "order"` events. Reason: each item has its own `punch_time`, so each item has its own risk tier.

**On single-item cancel:**
```
→ 1 event with scope="item", food_name=item name, punch_time=item's punch_time
→ Classify using item's individual elapsed time
```

**On full-order cancel (all items cancelled at once):**
```
→ N events (one per item in the order), each with scope="item"
→ Each event uses that item's individual punch_time
→ Each event gets its own risk_level based on its own elapsed time
→ All events share the same order_id (for grouping)
→ All events share the same cancel_time (the order cancel timestamp)
```

**Example — full-order cancel with 3 items:**

```json
// Item 1: punched 14:00, cancelled 14:35 → 35 min → HIGH RISK
{
  "type": "late_cancel",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 350.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:00:00",
  "cancel_time": "2026-11-16T14:35:00",
  "duration_minutes": 35,
  "risk_level": "high_risk",
  "scope": "item"
}

// Item 2: punched 14:30, cancelled 14:35 → 5 min → DOUBT
{
  "type": "late_cancel",
  "order_id": "021544",
  "food_name": "Butter Naan",
  "amount": 60.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:30:00",
  "cancel_time": "2026-11-16T14:35:00",
  "duration_minutes": 5,
  "risk_level": "doubt",
  "scope": "item"
}

// Item 3: punched 14:32, cancelled 14:35 → 3 min → OK
{
  "type": "late_cancel",
  "order_id": "021544",
  "food_name": "Dal Fry",
  "amount": 180.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:32:00",
  "cancel_time": "2026-11-16T14:35:00",
  "duration_minutes": 3,
  "risk_level": "ok",
  "scope": "item"
}
```

---

## Event Schema (FINAL — v2)

### Event type: `late_cancel`

```json
{
  "type": "late_cancel",
  "order_id": "021544",
  "food_name": "Paneer Tikka",
  "amount": 350.00,
  "by": "Counter",
  "punch_time": "2026-11-16T14:10:00",
  "cancel_time": "2026-11-16T14:45:00",
  "duration_minutes": 35,
  "risk_level": "high_risk",
  "scope": "item"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | YES | Always `"late_cancel"` |
| `order_id` | string | YES | Order ID (preserve leading zeros) |
| `food_name` | string | YES | Item name |
| `amount` | number | YES | Item amount (₹) |
| `by` | string | YES | Employee who cancelled |
| `punch_time` | datetime/null | YES | When item was punched. **null if unavailable** (do not omit field) |
| `cancel_time` | datetime | YES | When cancellation happened |
| `duration_minutes` | integer/null | YES | `floor(elapsed_seconds / 60)`. **null if punch_time is null** |
| `risk_level` | string | YES | One of: `"ok"`, `"doubt"`, `"risk"`, `"high_risk"`, `"unknown"` |
| `scope` | string | YES | Always `"item"` (v2 — no order-level events) |

### Allowed `risk_level` values (5 — v2):

```
"ok"         — 0 to 4 minutes
"doubt"      — 5 to 14 minutes  
"risk"       — 15 to 29 minutes
"high_risk"  — 30+ minutes
"unknown"    — punch_time missing/null
```

---

## KPI Counts (FINAL — v2)

Return in `audits` object alongside existing counts:

| Field | Type | Description |
|-------|------|-------------|
| `late_cancel_count` | integer | Total late_cancel events (all tiers including unknown) |
| `late_cancel_ok_count` | integer | Events where `risk_level = "ok"` |
| `late_cancel_doubt_count` | integer | Events where `risk_level = "doubt"` |
| `late_cancel_risk_count` | integer | Events where `risk_level = "risk"` |
| `late_cancel_high_risk_count` | integer | Events where `risk_level = "high_risk"` |
| `late_cancel_unknown_count` | integer | Events where `risk_level = "unknown"` (punch_time missing) |

**Invariant:** `late_cancel_count = ok + doubt + risk + high_risk + unknown`

---

## Dependency

- Requires `punched_at` / `item_punched_at` (ASK 1 / CR-524 — ✅ DONE)
- Same endpoint, same response structure — purely additive

---

## Backward Compatibility

- Additive only — no breaking changes to existing event types
- No settings API needed (removed configurable threshold from v1)
- Existing `insights-dashboard` response shape unchanged
- New fields appear ONLY in `late_cancel` events

---

## Validation Checklist for Gyan

```
□ elapsed_seconds computed from cancel_time - punch_time
□ Tier boundaries use exclusive upper bounds (< 300, < 900, < 1800)
□ duration_minutes = floor(elapsed_seconds / 60)
□ Full-order cancel emits per-item events (not one order event)
□ Missing punch_time → risk_level="unknown", duration_minutes=null
□ Negative duration → risk_level="ok", duration_minutes=0, server warning logged
□ 6 KPI counts returned (total + 5 tiers including unknown)
□ Invariant: total = ok + doubt + risk + high_risk + unknown
□ scope is always "item" (never "order")
□ Existing audit events unchanged
```

---

*End of CR-543 v2 contract. Ref: INV-BATCH-C-BACKEND-FEEDBACK-2026-11-17.md*
