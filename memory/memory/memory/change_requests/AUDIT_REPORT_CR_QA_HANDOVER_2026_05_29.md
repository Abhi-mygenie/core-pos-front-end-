# AUDIT REPORT CR — QA Handover & Testing Protocol

**CR ID:** `AUDIT_REPORT_OPTIMISE_CR_2026_05_28`
**Date:** 2026-05-29
**Status:** `CODE_COMPLETE — QA_PENDING`
**Test Date:** 2026-05-13 (all 3 restaurants)

---

## 1. Test Credentials

| Restaurant | Email | Password | rid | Profile |
|---|---|---|---|---|
| Cafe 103 | owner@cafe103.com | Qplazm@10 | 644 | No rooms, postpaid, has GST |
| Pav & Pages | vishal@pav.com | Qplazm@10 | 383 | Prepaid, has ready_at |
| Palm House | owner@palmhouse.com | Qplazm@10 | 541 | Rooms, mixed pre/postpaid, has discount+round-off |

**Preview URL:** `https://insights-phase.preview.emergentagent.com`

---

## 2. Owner Answers for Testing

| # | Question | Owner Answer |
|---|---|---|
| 1 | Test date for all restaurants | **2026-05-13** |
| 2 | Credit panel access path | **"Added to Credit" tab on Audit Report → click row** (same OrderDetailSheet, fetch mode) |
| 3 | Print Bill verification | **API call verification only** (no physical printer needed) |
| 4 | Collect Bill test | **Actually settle a test order** (mutating operation approved) |

---

## 3. Test Matrix (T-1 through T-15)

### Functional Tests

| # | Test | Restaurant | Expected | Status |
|---|---|---|---|---|
| T-1 | Page load — rows load, correct API calls | All 3 | Rows populate. Network: `employee-orders-list` + `get-room-list` (if rooms) + `order-logs-report`. NO `get-single-order-new` in list. | PENDING |
| T-2 | Click Settled order row — instant open | All 3 | Modal opens instantly (no spinner). Items shown with name, qty, price, veg indicator, station, variations, add-ons. NO `get-single-order-new` call. | PENDING |
| T-3 | Click Cancelled order row | pav (383) or palm (541) | Modal shows cancel badge, item crossed out, cancel_by_name, cancel_type. | PENDING |
| T-4 | Click Merged order row | palm (541) or cafe (644) | Modal shows Merged badge. | PENDING |
| T-5 | Bill summary on settled order | cafe (644) — has GST | Shows Item Total, Discount (₹0), Subtotal, GST (real value), VAT (₹0), Grand Total. NO negative tax. | PENDING |
| T-6 | Bill summary on cancelled order | Any with cancelled | Shows Item Total, no negative values. | PENDING |
| T-7 | Timeline with serve_at | pav (383) — KDS items | Shows Created → Served → Settled with times and durations. | PENDING |
| T-8 | Timeline with ready_at + serve_at | pav (383) | Shows Created → Ready → Served → Settled. | PENDING |
| T-9 | Credit panel → click order → fetch mode | Any with Credit tab orders | Modal calls `getSingleOrderNew` (spinner visible). Items load via API. Fetch mode preserved. | PENDING |
| T-10 | Print Bill button (Settled tab) | Any | API call `get-single-order-new` fires in network. Print flow works. | PENDING |
| T-11 | Collect Bill (Hold tab) | Any with Hold orders | Drawer opens, settle order succeeds (mutating). | PENDING |
| T-12 | Tab counts | All 3 | All tab counts identical to expected data. | PENDING |
| T-13 | Filters (status, payment, channel, platform, PG, pay type) | All 3 | All filters work including new Prepaid/Postpaid filter. | PENDING |
| T-14 | Audit tab gap detection | Any | Missing orders detected correctly. | PENDING |
| T-15 | Export (PDF/CSV) | Any | Exports work as before. | PENDING |

### Regression Tests

| # | Test | Expected | Status |
|---|---|---|---|
| R-1 | Credit panel OrderDetailSheet | Uses fetch mode (getSingleOrderNew call visible in network) | PENDING |
| R-2 | Print Bill flow | Own SINGLE_ORDER_NEW call, not affected by CR | PENDING |
| R-3 | Collect Bill flow | Own SINGLE_ORDER_NEW call, drawer opens correctly | PENDING |
| R-4 | Room SRM cascade | Still fires for room restaurants (unchanged) | PENDING |
| R-5 | Tab switching + filter reset | Filters reset on tab change, paymentType included | PENDING |

### Build / Lint

| # | Test | Status |
|---|---|---|
| B-1 | `craco build` → exit 0 | ✅ PASS |
| B-2 | Lint clean on all changed files | ✅ PASS |
| B-3 | No new ESLint errors | ✅ PASS |

---

## 4. What Was Implemented (for QA context)

### Files Changed

| File | Lines | What Changed |
|---|---|---|
| `reportTransform.js` | +400 | New `orderLogsReportRow` transform, `deriveOrderStatus`, `parseOrderItem` with direct-serve rule, `buildTimeline`, operations enriched with item names |
| `reportService.js` | -513 | Inline transform + diagnostics removed, replaced with 3-line call |
| `OrderDetailSheet.jsx` | ~80 lines modified | Dual-mode, bill summary rewrite, activity log with item names + diff, order note, Paid→Settled |
| `FilterBar.jsx` | +10 | PayType dropdown, Paid→Settled in filter + pills |
| `FilterTags.jsx` | +3 | PayType tag support |
| `AllOrdersReportPage.jsx` | +4 | PayType filter logic, Paid→Settled tab |

### Key Behaviors to Verify

1. **Data mode vs Fetch mode:** Row click on Audit Report = instant (data mode). Credit panel click = spinner then load (fetch mode). Differentiated by `order.items` presence.
2. **Bill summary:** Item Total + Discount + GST + VAT always shown (even ₹0). SC/Tip/Delivery/Round-off only if > 0.
3. **Activity log:** Operations with resolved item names + difference amounts on cancel.
4. **Direct-serve rule:** PACKAGED items with food_status=5 but no timestamps → created_at used as readyAt/serveAt.
5. **Paid → Settled:** Tab label, status filter, breakdown pill, modal badge, footer badge.
6. **Prepaid/Postpaid filter:** New dropdown before Status, works across all tabs.

---

## 5. Backend Gaps (documented, not blocking QA)

| Gap | Issue | Order Evidence |
|---|---|---|
| `restaurant_discount_amount = 0` | Discount applied but not recorded | Order 063476, rid=383 |
| PACKAGED `ready_at`/`serve_at` not logged | Backend should log serve_at on packaged items | Order 063474, rid=383 (items 1, 3) |
| GAP-5: Order-level cancel fields NULL | `cancel_at`, `canceled_by`, `cancellation_reason` NULL on cancelled orders | Pending backend fix |
| GAP-8: SRM `payment_method` stuck | `transferToRoom` not updated after room checkout | Parked — room cascade stays |

---

## 6. Rules Applied During Implementation

1. **If data not there, don't show. No fallbacks, no derivations, no remainder hacks.**
2. **Direct-serve rule:** Items with `food_status=5` and no timestamps → punched and served at same time → use `created_at`.
3. **GST/VAT/Discount always shown** (even ₹0) so user knows the value.
4. **SC/Tip/Delivery/Round-off** shown only if > 0 (restaurant config dependent).
5. **Operations enriched** with item names from parsed items array.

---

*End of QA Handover.*
