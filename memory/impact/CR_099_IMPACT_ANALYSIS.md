# CR-099 — Impact Analysis (Gate 2)

**Date:** 2026-07-24
**Code Reality:** NONE — per-item timestamps exist in transform but not rendered on OrderCard
**Conflict Pre-Check:** No active CR/BUG touches OrderCard item rows. R5 hotspot — display-only addition.
**Risk:** MEDIUM (R5 hotspot, but zero state/API/financial change)

---

## Data Flow Trace

```
API: order.order_details[].ready_at, serve_at, created_at (ISO timestamps)
  → Transform: orderTransform.js:137-140 — MAPPED ✅
    → item.readyAt, item.serveAt, item.createdAt
      → Component: OrderCard.jsx:639-700 — NOT USED (gap)
        → UI: item rows show name + qty + status badge only, no time
```

**Break point:** OrderCard item render (L639-700) ignores `item.readyAt`, `item.serveAt`, `item.createdAt`.

## Timestamp Logic

| Item Status | Display | Computation |
|---|---|---|
| **Preparing** | `Prep: 8m` | `now - item.createdAt` (live, needs interval) |
| **Ready** | `Prep: 8m · Wait: 3m` | Prep: `item.readyAt - item.createdAt`, Wait: `now - item.readyAt` (live) |
| **Served** | `Prep: 8m · Serve: 3m` | Prep: `item.readyAt - item.createdAt`, Serve: `item.serveAt - item.readyAt` (static) |

**Live timer consideration:** Preparing + Ready items need `now` — requires `useEffect` with `setInterval` (1-minute tick). OrderCard already re-renders on socket updates, but a timer ensures elapsed time updates even without socket events.

## Affected Files

| # | File | Line(s) | Change | Risk |
|---|------|---------|--------|------|
| 1 | `components/cards/OrderCard.jsx` | L639-700 (item rows) | Add elapsed time display per item using existing timestamp fields | LOW — display only, +15-20 lines |

**Files WILL NOT touch:** orderTransform (already maps timestamps), orderService, API, CartPanel.

## Design Decisions Needed

1. **Timer granularity:** 1-minute tick adequate? Or 30s?
2. **Visual format:** plain text (`Prep: 8m`) or badge/chip?
3. **Cancelled items:** Show prep time for cancelled items? (L769-780 render area)
4. **Performance:** OrderCard renders per-order — a 1-min `setInterval` inside OrderCard means N timers for N visible orders. Consider a shared timer context or `requestAnimationFrame` approach if performance is a concern.

**Recommendation:** 1-min tick, plain text, skip cancelled items, single `useState` + `useEffect` in OrderCard is fine for typical 10-30 visible orders.

## Scope Lock

- **1 file, ~15-20 lines + ~5 lines for timer hook**
- No API change, no transform change
- R5 hotspot (OrderCard) — display-only, no state mutation

---

**Next:** Gate 3 (Implementation Plan) → Gate 4 GO
