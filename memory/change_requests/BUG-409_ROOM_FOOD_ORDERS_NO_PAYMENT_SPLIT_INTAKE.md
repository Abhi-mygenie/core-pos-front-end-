# BUG-409 — Room Food Orders (orderRoom): No cash/UPI/card breakdown in API

**ID:** BUG-409  
**Registered:** 2026-09-15  
**Status:** GATE 1 — INTAKE COMPLETE — BACKEND-BLOCKED  
**Type:** BUG — Missing API field  
**Priority:** P2  
**Risk:** MEDIUM  
**Sprint:** pos_pms_1  

---

## What the issue is (plain English)

The Daily Report shows "Room Orders" (food ordered by in-house guests) as a single total (e.g. ₹16,888). There is no breakdown of how those food orders were paid — no Cash, no UPI, no Card split. The user expects to see how room food was settled by payment method.

## Evidence (probe_13_daily_sales.json)

```
orderRoom = 16888.38   ← single total, no sub-fields
```

No `room_food_revenue` or equivalent object exists anywhere in the API response.

## Root cause

**Missing API field.** The backend returns `orderRoom` as a single aggregated total. No per-payment-method breakdown was ever designed for room food orders in the `daily-sales-revenue-report` endpoint. This is not a mapping error — the field simply does not exist.

## Open Decision

| OD | Question | Options |
|---|---|---|
| **OD-409-01** | Do you want a Cash/UPI/Card split for food ordered in-room? | **YES** — file backend brief to add `room_food_revenue: {Room Cash, Room Card, Room UPI}` · **NO** — show total only (current) |

## Action needed (if OD-409-01 = YES)

File backend brief: `POST daily-sales-revenue-report` should add `room_food_revenue` object with same shape as `room_checkin_revenue`.

*Intake written 2026-09-15 · INTAKE agent (ALPHA v0.7)*
