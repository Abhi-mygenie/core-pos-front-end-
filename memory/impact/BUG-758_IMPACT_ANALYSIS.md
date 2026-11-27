# Impact Analysis — BUG-758
## Order View: Item-level Prep/Serve Times Show Raw Hours Instead of Days

**Date:** 2026-11-27
**Role:** PLANNING (Gate 2 — Impact Analysis)
**Risk:** LOW
**Code Reality:** NONE — no days branch in formatElapsed at HEAD
**Conflict Pre-Check:** NONE — 0 open items touching OrderCard.jsx

---

## 1. What Is Being Fixed

`formatElapsed()` in `OrderCard.jsx` (L18) caps at hours — it has no `days` branch.
When a served item's elapsed time exceeds 24h, it outputs "119h 47m" instead of "4d 23h".

`formatDuration()` in `TableCard.jsx` (L28) — which renders the order-level dots (● 3d) —
correctly converts `>24h → days`. Two functions, same purpose, different ceiling.

The data values are 100% correct. It is a display-only formatting issue.

---

## 2. Data Flow Trace

```
Backend timestamps: item.createdAt, item.readyAt, item.serveAt

OrderCard.jsx — Served Items section (L880–900):
  Kitchen path (readyAt exists):
    Prep = formatElapsed(item.readyAt - item.createdAt)   ← static cook time
    Serve = formatElapsed(now - item.serveAt)             ← running: time since served

  No-kitchen path (readyAt null):
    Total = formatElapsed(now - item.createdAt)           ← running: total elapsed

BREAK POINT: formatElapsed(ms) L18-25
  Example: ms = 7,187,000ms (119h 47m of real elapsed time)
    mins = 7187
    h = 119, m = 47
    → returns "119h 47m"       ← should return "4d 23h"

TableCard.jsx formatDuration (L28-38) — CORRECT:
  days = floor(hours / 24) = 4
  → returns "4d"               ← correct
```

---

## 3. Affected File

**WILL change:**
- `src/components/cards/OrderCard.jsx` — `formatElapsed` function (L18-25): add days branch (+4 lines)

**WILL NOT touch:**
- `src/components/cards/TableCard.jsx` — `formatDuration` already correct; reference only
- Any API, transform, service, context, or provider file
- The 4 call sites at L808/L813/L891/L894 — unchanged; they call `formatElapsed(ms)` which will now produce correct output

---

## 4. Risk Classification

**Risk: LOW**

| Factor | Assessment |
|--------|-----------|
| R5 hotspot? | NO — OrderCard.jsx not in R5 list (OrderEntry, CPP, orderTransform, DashboardPage, LoadingPage) |
| Financial? | NO — display-only; no amounts, taxes, discounts, settlements touched |
| Print path? | NO — formatElapsed is used for on-screen item timing display only; not in bill/KOT pipeline |
| API? | NO — no API call change; formatElapsed receives already-computed ms values |
| External consumers? | NONE — formatElapsed is a module-level const not exported |
| Blast radius | TINY — 1 function, 4 call sites, all in same file |
| Existing pattern | YES — TableCard.formatDuration is the reference; fix mirrors it exactly |

---

## 5. Numbers Verified

| Item-level (current) | Math | Should show |
|----------------------|------|-------------|
| Serve: 119h 47m | 119 ÷ 24 = 4d 23h | 4d 23h |
| Total: 440h 59m | 440 ÷ 24 = 18d 8h | 18d 8h |
| Total: 393h 37m | 393 ÷ 24 = 16d 9h | 16d 9h |
| Total: 2222h 26m | 2222 ÷ 24 = 92d 14h | 92d 14h |
| Total: 2050h 29m | 2050 ÷ 24 = 85d 10h | 85d 10h |

Order-level dots (already correct): 18d, 16d, 92d, 85d — exact match after conversion.

---

## 6. Owner Decisions Required

NONE. Fix pattern fully established by `TableCard.formatDuration` (same codebase, same purpose).
No business logic choice involved. No new behaviour — purely corrects display above 24h threshold.

---

## 7. Planning Skip Eligibility

| Condition | Status |
|-----------|--------|
| ≤10 lines | YES (+4 lines inside existing function) |
| 1 file | YES |
| Not R5 hotspot | YES |
| Not financial/print/report/auth | YES — display formatting only |

**Planning skip ELIGIBLE.** However, full Gate 3 plan is being written per owner request.
