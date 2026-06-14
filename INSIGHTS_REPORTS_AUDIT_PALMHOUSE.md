# Insights Module — Cross-Report Consistency Audit · The Palm House

**Date:** 2026-06-11 · **Restaurant:** The Palm House (rid 541, owner@palmhouse.com) · **Period verified:** March 1 – June 10, 2026 (live preprod data)
**Method:** Identical to the cafe103 audit (2026-06-10): replicated each report's exact frontend aggregation logic on the same raw `/order-logs-report` payloads (5,858 orders, ~150 MB), then cross-compared + compared against backend `daily-sales-revenue-report` and `get-settlement-report`.
**Business day:** 06:00 → 03:00(+1), all days (same as cafe103).

---

## Executive Summary

Palm House confirms every systemic cafe103 finding **and activates the two "latent" ones** — it has live **Room orders** and a high after-midnight order volume, so the divergence between screens is much larger here. The same month produces **four different revenue totals** depending on the screen:

| Metric (March 2026, biggest month) | Value | Source / gate |
|---|---|---|
| Sales / Payments report revenue | **₹11,68,821** | fStatus=6, rooms EXCLUDED, TAB included |
| Order Ledger "Paid" tab | **₹11,01,364** | rooms + TAB excluded (−₹67,457 TAB) |
| Dashboard / Items & Menu | **₹13,46,993 / ₹13,46,763** | fStatus=6, rooms INCLUDED |
| Settlement report "total sale" | **₹15,03,418** | backend basis, exceeds everything |

Max spread: **₹4,02,054 (34% of the lowest figure)** for the same question — "how much did March sell?"

| Metric (May 2026) | Value |
|---|---|
| Sales report | ₹13,21,940 |
| Ledger Paid | ₹12,72,480 |
| Dashboard / Items | ₹14,23,021 / ₹14,23,816 |
| Settlement sale | ₹14,58,269 |

---

## A. CRITICAL — verified with live numbers

### A1. Room revenue is in some reports and not others — *the cafe103 "latent" A10 is LIVE here*
Palm House runs Rooms (`order_in` RM/SRM + `payment_method='ROOM'`): 122 room orders in May alone.
- **Sales, Payments, Order Ledger** exclude rooms (`isRoomOrderForReport`).
- **Dashboard and Items & Menu** include them.

| Month | Room revenue (paid) | Dashboard − Sales gap |
|---|---|---|
| Mar | ₹1,78,172 | ₹1,78,172 |
| Apr | ₹1,43,603 | ₹1,43,603 |
| May | ₹1,01,081 | ₹1,01,081 |
| Jun 1–10 | ₹3,445 | ₹3,445 |

The **payment-mix is equally distorted**: March Card = ₹4,28,630 on Sales vs **₹5,68,852** on Dashboard (room guests pay by card). An owner comparing the two donuts sees a ₹1.4L card discrepancy with no explanation on screen.
Additional edge: 4 June orders have `payment_method='ROOM'` but `order_in=null` — they're caught only by the ROOM-string check; any report relying on `order_in` alone would misclassify them.
**Recommendation:** one shared room predicate + an explicit "incl./excl. rooms" badge per screen (or a toggle).

### A2. Punch-date vs collection-date attribution (cafe103 A1) — extreme cases verified
Frontend Insights attribute revenue to `created_at` (punch); Settlement & backend Order Summary to collection date. June live proof (Palm House was closed Jun 4–6):

| Day | Sales report (punch) | Backend paid (collect) | Settlement sale |
|---|---|---|---|
| Jun 2 | 37,422 | 49,180 | 51,494 |
| **Jun 3** | **7,838** | **22,897** | **24,892** |
| Jun 7 | 0 | 2,705 | 2,631 |
| Jun 8 | 0 (ledger-by-collect: 2,367) | 0 | 0 |
| Mar 15 | 51,064 | 64,648 | 68,420 |

Smoking gun: order `014894` (₹2,367) was **punched May 16 and collected Jun 8 ~00:xx** (and `015234`, ₹264, punched May 22, room order). Settlement books them on the **Jun 7 business day**; the Sales report booked them into **May weeks earlier**; the backend daily endpoint shows them on neither calendar day the frontend would guess. Monthly totals can never be reconciled across screens while the attribution differs and is unlabelled.

### A3. TAB (credit) treated three ways (cafe103 A2)
**All 319 TAB orders Mar–Jun have `f_order_status=6`** despite money not being collected:

| Month | TAB orders | TAB value counted as Sales revenue |
|---|---|---|
| Mar | 133 | ₹70,573 (₹67,457 non-room) |
| Apr | 88 | ₹45,127 |
| May | 86 | ₹49,460 |
| Jun | 12 | ₹5,863 |
| **Total** | **319** | **₹1,71,023** |

Sales/Payments/Dashboard count TAB as settled on punch day; Ledger "Paid" excludes it (the entire Mar Sales-vs-Paid gap of ₹67,457 is TAB); backend treats it as unpaid until `tab_*` settlement. ₹1.7L of uncollected credit is presented as realized revenue on three screens.

### A4. Cancellations "Order-Level" tab is permanently empty (cafe103 A3 string bug)
All 259 cancelled orders Mar–Jun carry `payment_method='Cancel'`; the code matches `'cancelled'`. **Zero rows matched the order scope in all four months** (replication: order-scope qty = 0/310, 0/185, 0/392, 0/23). Every order-level cancel renders under "Item-Level". 1-line fix.

### A5. Cancellation revenue disagrees between Dashboard and Cancellations report (cafe103 A4)

| Month | Cancellations report loss | Dashboard cancellation revenue | Δ |
|---|---|---|---|
| Mar | 66,235 | 52,760 | 13,475 |
| Apr | 42,984 | 36,326 | 6,658 |
| May | 82,465 | 72,012 | 10,453 |
| Jun | 4,236 | 3,990 | 246 |

Same verified causes as cafe103: different money basis (line subtotal+tax vs order_amount / raw price), different date gates (cancel_at calendar vs created_at business day), qty vs line counting.

### A6. Settlement "total sale" exceeds every frontend figure — unexplained basis
March: settlement ₹15,03,418 vs Dashboard ₹13,46,993 (rooms included) vs Sales ₹11,68,821. Even Dashboard + cancelled + pending doesn't reach the settlement figure (~₹1.4L unexplained). Either settlement "sale" uses a pre-discount/pre-merge basis or includes items no frontend screen shows. **Needs backend definition** — until then the Settlement screen cannot be footed against anything.

### A7. `round_off` → `round_up` field bug in Items & Menu (cafe103 A8.1) — confirmed live
`insightsService` reads `ot.round_off`; the API field is `round_up`. Missing from Items "Sold" revenue: Mar ₹460, Apr ₹305, May ₹272, Jun ₹23. (Item-sum vs order_amount mismatches are rarer here than cafe103: only ~2 paid orders/month, ≤₹557 — Palm House data hygiene is better.)

### A8. Dashboard "Unsettled TAB" tile dead code (cafe103 A6) + double fetch (A7)
Confirmed ₹0 in all months despite 319 TAB orders. Note: at Palm House even *correct* logic would read ₹0 because backend stamps TAB as fStatus 6 — the tile is doubly meaningless. The duplicate byte-identical `/order-logs-report` POST also stands; a Palm House month is ~40 MB, fetched twice per Dashboard load.

### A9. Unclassified / new payment enums leak through the classifiers
- **`pending` (13 orders, ₹6.5K+ June alone):** unpaid orders (fStatus 2/5) with a payment_method literal no classifier knows. Currently invisible in paid buckets (correct by accident); will surface as a raw "Pending" bucket if ever paid.
- **`partial` (17 orders):** Sales buckets as "Partial", Dashboard passes raw `partial`, backend splits into real legs — March partial: Sales ₹2,268 vs Dashboard ₹9,858 (rooms!), neither matches settlement.
- **`cash_on_delivery` (6 orders, May):** classified into Cash by substring luck.
- **Zero-amount "paid" orders:** 6 / 7 / 17 / 3 per month (May: 17!) — counted in order counts, skew AOV exactly as cafe103 A5.

### A10. After-midnight volume makes business-day edge bugs REAL here
May has **42 orders punched 00:00–03:00** (cafe103: ~0). Consequences:
1. Daily tables attribute them to the *next calendar date* (created_at date string), not the business day the staff worked.
2. The range-end tail (orders punched 00:00–03:00 after `to_date`) is **silently dropped** because the API is fetched only to `to_date` (structural flag B2 from cafe103) — at Palm House this is a near-certainty every range query, not a theoretical risk.

---

## B. Structural flags (same as cafe103, status at Palm House)

1. **Merged orders:** 236 Mar–Jun (all ₹0 amount here) — excluded by Items/Dashboard, but Sales' plain `fStatus===6` gate and Ledger `meta.totalRevenue` would include them if backend ever left amounts non-zero. Ledger meta still includes cancelled orders' amounts (Mar meta ₹11,86,726 vs Sales ₹11,68,821).
2. **VAT (A9 cafe103):** 0 VAT lines at Palm House — the conflicting GST/VAT formulas between `reportTransform` and `insightsService`/`Cancellations` remain latent but unresolved.
3. **`sort_by=collect_bill` fetch + `created_at` filter** (orderLedgerService default): with May→June settlement gaps of 3+ weeks proven above, this mismatch WILL drop rows at Palm House (order fetched by paid-date, filtered out by punch-date).
4. **UTC "today" presets**, **per-report max-range limits (60/62/30 days)**, **Top Items raw `line.price` incl. unpaid** — all unchanged, all apply.

---

## C. Quick-win fix list (priority order for Palm House)

| # | Fix | Effort |
|---|---|---|
| 1 | Cancellations scope: match `'Cancel'`/fStatus 3 (A4) | 1 line |
| 2 | `round_off` → `round_up` in insightsService (A7) | 1 line |
| 3 | Dashboard: remove duplicate fetch; remove/fix dead Unsettled-TAB tile (A8) | small |
| 4 | **Room badge/toggle + one shared room predicate on every screen (A1)** — highest ₹ impact here | medium |
| 5 | TAB policy & gate alignment (A3) | medium |
| 6 | One canonical cancellation money formula (A5) | medium |
| 7 | Punch vs collection attribution toggle, labelled (A2) | larger |
| 8 | Payment-method classifier as one shared module incl. `pending`/`partial`/`cash_on_delivery` (A9) | medium |

## D. Open questions for the owner/backend team
1. What is the settlement report's "total sale" basis? It exceeds the most inclusive frontend figure by ~₹1.4L in March (A6).
2. Same as cafe103: revenue = billed (punch) or collected (settlement)? TAB at punch or settlement?
3. Why does backend stamp TAB orders `f_order_status=6` before collection?
4. What does `payment_method='pending'` mean operationally, and should it ever become payable?
5. Confirm whether room revenue should appear in restaurant Sales/Payments at all, or only on a Rooms screen — today half the module says yes, half says no.

---
*Replication scripts + raw data: `/app/audit_data/` (`fetch_data.py` pulls live data; `analyze.py` reproduces every number in this report; `results.json` has the full breakdown).* No application code was modified.
