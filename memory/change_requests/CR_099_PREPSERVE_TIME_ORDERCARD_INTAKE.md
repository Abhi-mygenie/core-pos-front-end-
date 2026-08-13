# CR-099 — Intake — 2026-07-24

**CR:** Per-Item Preparation & Serve Time Display on Order Card
**Sprint:** POS 5.0
**Status:** INTAKE
**Priority:** P1 — High
**Risk:** MEDIUM (OrderCard is R5 hotspot, but change is display-only)

---

## 1. Requirement

Display elapsed preparation time and serve time per item on OrderCard rows, so kitchen/operations staff can see at a glance how long each item has been in prep or waiting to serve.

## 2. Classification

- **Type:** CR (new feature — display layer)
- **Duplicate check:** DISTINCT
  - BUG-192 (INTAKE) — different scope: Insights Kitchen Ops report, not OrderCard
  - BUG-146 (CLOSED) — different feature: schedule time badge, not prep/serve time
- **Related:** BUG-192, BUG-146, OrderTimeline.jsx (order-level timeline already exists)

## 3. Current State (Code Reality: NONE)

| Layer | Exists? | Detail |
|---|---|---|
| Item-level timestamps in API | ✅ | `orderDetails[].ready_at`, `serve_at`, `created_at` per item |
| orderTransform item mapping | ✅ | `orderTransform.js:137-140` maps `item.readyAt`, `item.serveAt`, `item.createdAt` |
| Order-level timeline | ✅ | `OrderTimeline.jsx` renders ●──14m──●──3m──● using order-level timestamps |
| **Per-item time on OrderCard** | ❌ | OrderCard item rows (L639-700) do NOT use `readyAt`/`serveAt`/`createdAt` |
| Configured prep/serve time (catalog) | ✅ (menu only) | `productTransform.js:139-140` — `prepTimeMin`, `serveTimeMin` — NOT in orderTransform |

## 4. Expected Behavior

Per item row on OrderCard:
- **Preparing items:** Show elapsed prep time since order placed (e.g., "Prep: 8m")
  - Computed: `now - item.createdAt`
- **Ready items:** Show elapsed prep time (actual) + waiting time (e.g., "Prep: 8m · Wait: 3m")
  - Prep: `item.readyAt - item.createdAt`
  - Wait: `now - item.readyAt`
- **Served items:** Show actual prep + serve durations
  - Prep: `item.readyAt - item.createdAt`
  - Serve: `item.serveAt - item.readyAt`

## 5. Affected Files (estimated)

| File | Change | Lines |
|---|---|---|
| `components/cards/OrderCard.jsx` | Add time display per item using existing `item.readyAt`, `item.serveAt`, `item.createdAt` | +15-20 lines |

**No orderTransform change needed** — timestamps already mapped at L137-140.

## 6. Blast Radius

- Scope: SMALL (1 file, ~15-20 lines)
- Hotspot: YES — OrderCard.jsx (R5)
- Risk: MEDIUM — R5 hotspot, but change is purely additive display logic with zero state/API/financial impact

## 7. Evidence

- Source: INVESTIGATION (2026-07-24) — confirmed via code trace
- Investigation report: `/app/memory/reports/INVESTIGATION_SHORTCODE_PREPTIME_2026_07_24.md`

## 8. Open Questions

| # | Question | Default |
|---|---|---|
| OQ-01 | Show time on ALL order types (Dine-in, TakeAway, Delivery, Room) or only Dine-in? | All types |
| OQ-02 | Show configured target time vs actual (requires mapping `food_details.prepration_time_min`)? | Just elapsed (actual) for now |

## 9. Next

Planning Gate 2 (Impact Analysis) → Gate 3 (Implementation Plan)
