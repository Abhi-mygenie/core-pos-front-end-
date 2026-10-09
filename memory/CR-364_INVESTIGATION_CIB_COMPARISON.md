# CR-364 — INVESTIGATION REPORT
## Comparison: "Customer Intelligence (Beta)" vs CR-364 Guest Folio Detail Page

**Date:** 2026-09-16
**Role:** INVESTIGATION (ALPHA v0.7)
**Trigger:** Owner asked whether the existing "Customer Insights Beta" report (Insights → CRM-fed, populated when an order is paid) is the same feature CR-364 proposes.
**Steps used:** 7 / 10
**Confidence:** HIGH (both artifacts fully traced in code)

---

## 1. Summary

**They are NOT the same feature and cannot substitute for each other.**

- "Customer Insights Beta" in the sidebar is actually **`Customer Intelligence (Beta)` — CR-131**, a **restaurant-wide CRM analytics report** aggregating **all paid customers** across dine-in / takeaway / delivery / room over time.
- CR-364 is a **per-stay operational folio page** for **one PMS order** (one guest, one room stay) — live, mid-stay, with money mutations (Check Out, Record Payment, Print Folio).

Different data source, different auth, different granularity, different lifecycle stage, different actions. Zero overlap in scope.

---

## 2. Hypotheses Tested

| # | Hypothesis | Test Method | Result | Evidence |
|---|---|---|---|---|
| H1 | "Customer Insights Beta" is a per-customer/per-stay page like CR-364 | Read source | **ELIMINATED** | `CustomerIntelligenceBeta.jsx` renders KPI strip + Lifecycle + Tiers + Revenue + Top Customers table + Win-Back table — no order/stay detail view |
| H2 | Both hit the same backend | Read services + constants | **ELIMINATED** | CIB uses CRM (`REACT_APP_CRM_BASE_URL`, X-API-Key). CR-364 uses POS Laravel (`get-single-order-new`, `pos/room-payment`) |
| H3 | Room stay data flows into CIB after checkout payment | Read CRM endpoints + CIB fields | **CONFIRMED — but only aggregated** | Once a room order is paid, it becomes part of `total_spent` / `total_visits` / lifecycle roll-up. Individual stay lines, room#, nights, F&B split, advance ledger are NOT retained in CRM output |

---

## 3. Data Flow Traces

### 3.1 Customer Intelligence (Beta) — CR-131
```
Sidebar "Customer Intelligence (Beta)"
  → /reports-module/customers-intel-beta  (App.js L180)
  → CustomerIntelligenceBeta.jsx
  → crmReportService.js: getSummary() / getTopCustomers() / getChurnRisk()
  → crmAxios (baseURL = REACT_APP_CRM_BASE_URL, X-API-Key = crm_token)
  → GET /pos/reports/summary          (5-min cache)
    → { customers{total, active_30d, new_7d}, lifecycle{new,active,at_risk,dormant,churned},
        tiers{platinum,gold,silver,bronze}, revenue{total, revenue_30d, avg_order_value,
        avg_order_value_30d}, loyalty{points_outstanding, orders_with_redemption_pct} }
  → GET /pos/reports/top-customers?sort_by=&limit=  (5-min cache)
    → { customers:[{customer_id, name, phone, tier, total_visits, total_spent,
                    avg_order_value, last_visit_days_ago}], ... }
  → GET /pos/reports/churn-risk?band=high|medium&limit=  (NO cache)
    → { count, customers:[{customer_id, name, phone, tier, last_visit_days_ago,
                            total_spent, total_visits}] }
```
- **Population trigger:** paid orders are pushed to CRM; CRM aggregates.
- **Granularity:** restaurant-wide roll-up per customer_id (phone-keyed).
- **Windows:** fixed CRM windows (all-time / 30d / 7d) — no ad-hoc date filter.
- **Freshness:** 5-min cache on summary + top; win-back always fresh. Depends on CRM push cadence.

### 3.2 CR-364 Guest Folio Detail Page
```
Entry point (In-House "View Bill" / Departures / Tape popover "Folio" / Arrivals)
  → /pms/folio/:orderId  (NEW route)
  → GuestFolioPage.jsx (NEW)
  → pmsService.getGuestFolio(orderId)
  → POS Laravel axios (POS bearer token)
  → GET /aiosell/get-single-order-new (existing) — reused from PmsCheckoutDrawer L89–101
    → orderDetails[], room_info{room_price, advance_payment, receive_balance,
                                balance_payment, payment_status, balance_payment_mode,
                                room_no, check_in_date, check_out_date},
      associated_order_list[]
  → getReservationOps() join for guest name/phone/channel/PAH/meal plan
  → Actions:
      Check Out    → PmsCheckoutDrawer (existing) → order-bill-payment
      Record Payment → POST /pos/room-payment {room_order_id, payment_amount,
                        payment_mode, payment_type:'interim'}  (BUG-384 resolved 2026-09-10)
      Print Folio   → printOrder(orderId, 'bill')
```
- **Population trigger:** the stay exists in POS (in-house or departed).
- **Granularity:** one stay = one orderId.
- **Freshness:** live — required before payment, during payment, at checkout.
- **Money:** display-only, backend-computed; no FE recomputation (CR-358 D3 lock).

---

## 4. Side-by-side Feature Matrix

| Dimension | Customer Intelligence (Beta) — CR-131 | CR-364 Guest Folio Detail Page |
|---|---|---|
| **Sidebar location** | Insights → "Customer Intelligence (Beta)" | PMS → In-House / Departures / Tape / Arrivals → per-row action |
| **Route** | `/reports-module/customers-intel-beta` | `/pms/folio/:orderId` (new) |
| **Data source** | CRM (`REACT_APP_CRM_BASE_URL`) | POS Laravel (existing PMS APIs) |
| **Auth** | X-API-Key `crm_token` | POS bearer token |
| **Population trigger** | Paid orders pushed to CRM (lags) | Real-time from POS DB |
| **Granularity** | Restaurant-wide roll-up per customer_id | Single stay per orderId |
| **Timing** | Post-payment history/analytics | Pre-payment, mid-stay, at-checkout, post-checkout |
| **Applies to walk-in without customer profile?** | No (needs customer_id/phone in CRM) | Yes (walk-in stay by orderId works) |
| **Room-specific fields** | None (room#, nights, checkin/out, F&B-on-room, advance, balance) | All present |
| **Money shown** | `total_spent`, `avg_order_value`, `revenue_30d`, points | `room_price`, `advance_payment`, `receive_balance`, `balance_payment`, per-order F&B totals |
| **Payment ledger (dated)** | No | Optional v2 (B-364-01) |
| **Date filter** | None (fixed CRM windows) | Not applicable — single stay |
| **Actions** | Read-only + WhatsApp win-back + Export Excel/PDF | **Check Out**, **Record Payment**, **Print Folio** (money-mutating) |
| **Print output** | Report export (Excel/PDF list) | Guest folio for the stay (`printOrder 'bill'`) |
| **Risk classification** | Display report — MEDIUM | Money display + mutations — **HIGH** (CR-364 intake) |
| **Registered ID** | CR-131 (shipped) | CR-364 (Gate 1, unblocked; awaits ODs 01–05) |
| **Related CRs** | CR-078 Phase 1 (backend), BUG-191 (export), BUG-300 (crm_token refresh) | CR-358-P3, CR-360, CR-358-P4, CR-162, CR-357, OG-PMS-003 |

---

## 5. Where They Touch (and Why That's Not a Conflict)

- **Customer identity overlap:** When a room stay is paid and closed, its total contributes to the customer's `total_spent`, and the customer will appear in CIB's Top Customers / lifecycle roll-up. This is downstream analytics — it does not replace an operational folio.
- **A room stay is not one "order" to CRM:** CRM aggregates paid transactions per customer, not per stay. The room order + any associated F&B orders may each land as separate rows in CRM history.
- **CIB has no concept of "in-house right now."** It cannot show current balance due, advance paid so far, or drive Record Payment / Check Out. Those are POS-live states only.
- **Walk-ins without customer profile are invisible to CIB** but must be servable by CR-364 (they have an orderId).

---

## 6. Business Answer

CIB answers: **"Who are our best/at-risk customers restaurant-wide, based on paid history?"**
CR-364 answers: **"For THIS guest currently staying in room X (or who just checked out today), what do they owe, what did they pay so far, what F&B was posted to the room, and let me collect / check out / print the folio."**

You could not run a front desk from CIB. You could not run marketing/win-back from CR-364.

---

## 7. Recommendations

- **Do NOT close CR-364 as a duplicate of CR-131 / CIB.** Distinct scope, distinct backend, distinct risk profile, distinct users (front desk vs. owner/marketer).
- **Keep both.** CR-364's completion actually improves CIB downstream by ensuring more room stays are cleanly checked out and pushed to CRM with accurate totals.
- **Retroactive check:** No unregistered code found for CR-364 (Gate 1, no implementation yet). No retroactive candidates.
- **Next step for CR-364:** unchanged — answer OD-364-01 through OD-364-05 to unlock Gate 2 Impact Analysis. Backend is not blocking.
- **Optional linkage (post-v1, not part of CR-364 scope):** on the folio page, if `getReservationOps` returns a `crm_customer_id`, add a small "View in CRM" chip that navigates/links to that customer inside CIB. Track as a follow-up idea, not a CR-364 requirement.

---

## 8. Evidence Artifacts

- Code: `/app/frontend/src/pages/reports-module/CustomerIntelligenceBeta.jsx` (L1–445)
- Code: `/app/frontend/src/api/services/crmReportService.js` (L1–75)
- Code: `/app/frontend/src/api/crmAxios.js` (baseURL = `REACT_APP_CRM_BASE_URL`, L10)
- Code: `/app/frontend/src/api/constants.js` L78–80 (CRM report endpoints)
- Code: `/app/frontend/src/App.js` L36, L180 (route)
- Code: `/app/frontend/src/components/layout/Sidebar.jsx` L142 (Insights), L196 (CIB entry)
- Intake: `/app/memory/change_requests/CR-364_PMS_GUEST_FOLIO_DETAIL_PAGE_INTAKE.md`

## 9. Retroactive Candidates
NONE.
