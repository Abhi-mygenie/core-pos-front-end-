# CR-549: Dashboard Widget Redesign — 12 Tiles (4×3) with Revenue Impact on Every Widget

**Type:** CR (Change Request)
**Priority:** P1
**Risk:** HIGH
**Client:** ALL
**Assignee:** Gyan (backend data additions) + Abhishek (frontend implementation)
**Routing reason:** Backend needs to add revenue-per-tier, revenue-per-audit-event to existing endpoints. Frontend rewires dashboard + navigation.
**Release target:** 2026-11-20
**Date:** 2026-11-17
**Source:** Owner directive during Batch C design review

---

## Problem Statement

The current Insights Dashboard has 9 widgets in a 3×3 grid. **7 of 9 are dead-ends** (no click navigation). The "Net Sales" label is incorrect. No risk/fraud visibility at dashboard level. Audit events have no revenue tie-in. Owner cannot see "what's wrong" or "how much money is at risk" from the dashboard — has to dig through separate pages.

---

## Requirement: 12 Widgets (4×3 Grid, No Scroll)

**Design principle:** Every widget = **headline number + ₹ revenue impact + click-through** to insight page.

### Row 1 — Revenue (what came in)

| # | Widget | Headline | Revenue Tie | Clicks To | Change |
|---|--------|----------|-------------|-----------|--------|
| 1 | **Total Sales** | ₹4,64,938 | Breakdown: Net Sales (excl tax), GST, VAT, Service Charge | `/reports-module/sales-audit` | RENAME from "Net Sales" + add tax breakdown |
| 2 | **Payments** | ₹4,64,938 | Revenue by method: Cash, Card, UPI, Room | `/reports-module/settlement` | ADD click navigation |
| 3 | **Channels** | 448 orders | Revenue per channel: Dine-In ₹X, Delivery ₹X, etc. | `/reports-module/sales` | ADD click + revenue per channel |

### Row 2 — Operations (what happened)

| # | Widget | Headline | Revenue Tie | Clicks To | Change |
|---|--------|----------|-------------|-----------|--------|
| 4 | **Top Items** | 186 unique | Top 3 by revenue | `/reports-module/items` | KEEP (already works) |
| 5 | **Kitchen Ops** | 12m prep / 18m serve | Revenue at risk from delays (orders >30m) | Kitchen Ops Report | RENAME "Kitchen" → "Kitchen Ops" + ADD click + revenue-at-risk |
| 6 | **Customers** | 78 repeat / 211 new | Repeat customer revenue vs new customer revenue | Customer Report | ADD click + revenue split |

### Row 3 — Risk & Leakage (what's wrong)

| # | Widget | Headline | Revenue Tie | Clicks To | Change |
|---|--------|----------|-------------|-----------|--------|
| 7 | **Cancellations** | 101 items + risk tier mini-bar | **₹18,420 lost** — ₹ per risk tier (High Risk = ₹X) | `/reports-module/cancellations` | ADD risk bar (CR-543) + ₹ per tier |
| 8 | **Discounts** | ₹12,340 | Direct / Coupon / Loyalty / Comp breakdown | `/reports-module/items` (discount tab) | ADD click navigation |
| 9 | **Cancel After Unpaid** | 2 fraud events | **₹183 at risk** (sum of flagged item amounts) | `/reports-module/audit-log?filter=cancel_after_unpaid` | NEW widget (CR-544 data) |

### Row 4 — Post-Action Audit (what was changed after the fact)

| # | Widget | Headline | Revenue Tie | Clicks To | Change |
|---|--------|----------|-------------|-----------|--------|
| 10 | **Post-Settle Edits** | 5 unpaid + 1 pay change | **₹2,084 made unpaid** (sum of unpaid order amounts) | `/reports-module/audit-log?filter=post_settle` | ADD click + ₹ amount |
| 11 | **Post-Bill-Print** | 2 item + 1 order cancel + 1 edit | **₹X revenue affected** after bill print | `/reports-module/audit-log?filter=post_print` | NEW widget (split from old audit tile, CR-528 data) |
| 12 | **Discount After Print** | 4 applied + 4 removed | **₹X net discount manipulation** | `/reports-module/audit-log?filter=discount_after_print` | NEW widget (CR-546 data) |

---

## Backend Requirements for Gyan

### 1. Revenue per risk tier (CR-543 extension)
Add to `insights-dashboard` response under `audits`:
```json
{
  "late_cancel_ok_revenue": 4200.00,
  "late_cancel_doubt_revenue": 890.00,
  "late_cancel_risk_revenue": 60.00,
  "late_cancel_high_risk_revenue": 13270.00,
  "late_cancel_unknown_revenue": 0
}
```
Sum of `amount` per risk tier — backend already has this data, just needs aggregation.

### 2. Revenue per audit event type
Add to `insights-dashboard` response under `audits`:
```json
{
  "make_unpaid_total_amount": 2084.00,
  "cancel_after_unpaid_total_amount": 183.00,
  "item_cancel_after_print_total_amount": 350.00,
  "order_cancel_after_print_total_amount": 450.00,
  "order_edit_after_print_total_amount": 200.00,
  "discount_apply_after_print_total_amount": 8.00,
  "discount_remove_after_print_total_amount": 4.00
}
```
Sum of `amount` (or `discount_amount` for discount events) per event type.

### 3. Revenue per channel
Add to `insights-dashboard` response (if not already present):
```json
{
  "channels": {
    "dine_in": { "count": 312, "revenue": 320000 },
    "delivery": { "count": 89, "revenue": 89000 },
    "takeaway": { "count": 34, "revenue": 34000 },
    "aggregator": { "count": 13, "revenue": 21938 }
  }
}
```

### 4. Customer revenue split
Add to `insights-dashboard` response (if not already present):
```json
{
  "customers": {
    "repeat": { "count": 78, "revenue": 280000 },
    "new": { "count": 211, "revenue": 184938 }
  }
}
```

### 5. Kitchen Ops revenue at risk
Add to `insights-dashboard.kitchen`:
```json
{
  "delayed_orders_count": 12,
  "delayed_orders_revenue": 15400
}
```
Orders where total time (punch to serve) exceeded 30 minutes.

### 6. Tax breakdown in sales summary
Ensure `insights-dashboard` returns (may already exist):
```json
{
  "sales": {
    "total_revenue": 464938,
    "net_sales": 422671,
    "total_gst": 21147,
    "total_vat": 0,
    "total_service_charge": 21120,
    "paid_order_count": 448
  }
}
```

---

## Frontend Requirements for Abhishek

### 1. Dashboard widget grid
- Change from `grid-cols-3` (9 tiles) to `grid-cols-3` with 4 rows (12 tiles)
- Add row labels: Revenue, Operations, Risk & Leakage, Post-Action Audit
- Every widget gets `onClick={() => navigate(targetPath)}`

### 2. Widget content updates
- **Widget 1:** Rename "Net Sales" → "Total Sales". Add mini-rows: Net Sales (excl tax), GST, VAT, Service Charge
- **Widget 3:** Add revenue per channel
- **Widget 5:** Rename "Kitchen" → "Kitchen Ops". Add revenue at risk from delays
- **Widget 6:** Add revenue split (repeat vs new)
- **Widget 7:** Add CR-543 risk tier mini-bar with ₹ per tier
- **Widget 9:** NEW — Cancel After Unpaid (CR-544 data from `audits`)
- **Widget 10:** Add ₹ amount for made-unpaid events
- **Widget 11:** NEW — Post-Bill-Print (split from old audit tile, CR-528 data)
- **Widget 12:** NEW — Discount After Print (CR-546 data from `audits`)

### 3. Navigation wiring
All 12 widgets clickable. Audit page needs `?filter=` query param support for deep-linking:
- `?filter=post_settle` → show only make_unpaid + payment_method_change
- `?filter=post_print` → show only item/order cancel/edit after print
- `?filter=cancel_after_unpaid` → show only cancel_after_unpaid
- `?filter=discount_after_print` → show only discount apply/remove after print

### 4. Cascading changes to insight pages
- **CancellationsMockup.jsx:** Add risk tier column + filter (needs CR-543 data — separate CR or backend adds to cancellations endpoint)
- **AuditLogMockup.jsx:** Add filter chip support + Batch C event types (already planned in Batch C Gate 3)
- **SalesAuditPage.jsx:** Already shows tax breakdown — verify alignment with dashboard widget

---

## Design Mockups

- Dashboard layout: `design/DASHBOARD_WIDGET_REDESIGN_12_TILES_2026_11_17.html`
- Batch C audit page: `design/BATCH-C_GATE2_5_MOCKUPS_2026_11_17_v2.html`
- Viewable at: `/DASHBOARD_WIDGET_REDESIGN_12_TILES.html` on preview

---

## Evidence

- **Source:** Owner directive during Batch C design review (2026-11-17)
- **Screenshots:** Current dashboard widgets showing dead-end clicks + wrong "Net Sales" label
- **Confidence:** CONFIRMED (owner-directed)

---

## Duplicate Check

- **DISTINCT** — no existing CR covers dashboard widget redesign with revenue tie-in
- **RELATED:** CR-543 (risk tiers), CR-544 (cancel after unpaid), CR-546 (discount after print), CR-528 (post-print audit events)
- **DEPENDS ON:** CR-543/544/546 backend delivery (✅ DONE — preprod verified)

---

## Blast Radius

- **Backend:** 1 endpoint (`insights-dashboard`) — additive fields only, no breaking changes
- **Frontend:** `DashboardMockup.jsx` (major), `AuditLogMockup.jsx` (filter params), `insightsService.js` (transform)
- **Scope:** LARGE (12 widgets, 1 backend endpoint, 3 FE files minimum)

---

## Owner Decisions

| # | Question | Status |
|---|----------|--------|
| OD-549-01 | Kitchen Ops "revenue at risk" — what threshold defines a delayed order? 30 minutes total? | OPEN — suggest 30m |
| OD-549-02 | Customer revenue — should "repeat" count be based on phone number match or CRM registration? | OPEN |
| OD-549-03 | Should Row 4 audit widgets show ₹0 when no events exist, or hide the revenue line entirely? | OPEN — suggest show ₹0 (green = "no issues") |

---

```
Intake complete: CR-549
Classification: CR, Severity: P1, Risk: HIGH
Duplicate check: DISTINCT (depends on CR-543/544/546, related to CR-528)
Evidence: Owner-directed, screenshots of dead-end widgets
Blast radius: LARGE (backend endpoint + 3+ FE files)
Client: ALL
Assignee: Gyan (backend) + Abhishek (frontend)
Release target: 2026-11-20
Docs: change_requests/36_CR-549_DASHBOARD_WIDGET_REDESIGN_12_TILES_INTAKE.md
Registry: SYNCED
3 ODs open (delay threshold, repeat customer definition, zero-state display)
Next: Gyan adds revenue aggregations to insights-dashboard endpoint → Abhishek implements 12-tile dashboard
```
