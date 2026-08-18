# CR-121 — Dashboard Quick-Start: Single-Click Order for Delivery / Takeaway / Walk-in

**ID:** CR-121  
**Type:** CR (Feature)  
**Priority:** P2  
**Risk:** MEDIUM  
**Area:** Dashboard  
**Sprint:** pos_5_0  
**Intake Date:** 2026-07-31  
**Gate:** 0-1  
**Source:** OWNER-REPORTED

---

## Owner Description

> "Need single click option from dashboard for delivery, takeaway, walk-in."

Currently, starting a new order requires: navigating to order entry → selecting order type → proceeding. Owner wants a one-click shortcut directly from the dashboard to instantly create an order with the type pre-selected.

---

## Feature Scope

Dashboard should have quick-action buttons (or a prominent widget) allowing staff to start an order with a single click:

1. **Walk-in** — creates POS/counter order immediately
2. **Takeaway** — creates takeaway order, jumps to order entry
3. **Delivery** — creates delivery order, jumps to order entry (with customer/address prompt if configured via CR-051)

---

## Blast Radius (Preliminary)

| File | Change Type | Estimate |
|------|------------|----------|
| `DashboardPage.jsx` | +quick-action buttons/widget | ~30–50 lines |
| `OrderContext.jsx` or `orderService.js` | +createQuickOrder function | ~10–20 lines |
| Routing/navigation | Auto-navigate to OrderEntry with type pre-set | ~5 lines |

**Estimated: 2–3 files, ~50–80 lines**  
**Risk: MEDIUM** — touches DashboardPage (R5 hotspot list) and order creation flow

---

## Open Questions

| # | Question | Blocking? |
|---|----------|-----------|
| OQ-1 | Should the quick-start buttons be a floating widget, a top-bar section, or cards in the dashboard? | YES — affects design |
| OQ-2 | Walk-in: should it create the order silently and open OrderEntry, or show a confirmation? | YES |
| OQ-3 | Delivery/Takeaway: should it prompt for customer name/phone before creating (per CR-051 settings)? | YES |
| OQ-4 | Should Dine-in (table-based) also have a quick-start, or is that already covered by table tap? | NO |

---

## Duplicate Check

- CR-051 (Customer Field Mandatoriness): RELATED — CR-051 validates fields, CR-121 is about quick entry point. Distinct scope.
- No other "quick order" or "single click order" CR exists.

**Verdict: DISTINCT**

---

## Acceptance Criteria (Preliminary)

```
AC-1: Dashboard shows quick-start buttons for Walk-in, Takeaway, Delivery
AC-2: Single click creates order with correct type and navigates to OrderEntry
AC-3: CR-051 field mandatoriness rules respected for each order type
AC-4: Works on both desktop and tablet viewports
```
