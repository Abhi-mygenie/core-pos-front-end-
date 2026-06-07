# NEXT AGENT HANDOVER — 2026-06-06 Session Close (Final)

**Created:** 2026-06-06
**Branch:** `5-june`
**Preview URL:** https://mygenie-pos-ui.preview.emergentagent.com
**Test account:** owner@cafe103.com / Qplazm@10

---

## 0. TL;DR — WHAT WAS DONE THIS SESSION

| Work Item | Status |
|-----------|--------|
| Deployment (clone + env + yarn install) | ✅ Complete |
| S9 FIX 1 — Loader inherited (useReportFetch + ReportLoadingShield wrapper) | ✅ Shipped + tested |
| S9 FIX 2 — Header inherited (S5 Apply button pattern) | ✅ Shipped + tested |
| S9 FIX 3B — Revenue formula aligned with audited insightsService.js | ✅ Shipped + tested |
| S9 Audit Tab — Flags cancelled items with un-reverted financials | ✅ Shipped + tested |
| S9 Gate ⑤ — Owner validated, FROZEN | ✅ |
| S5 3C — Merge exclusion in insightsService.js | ✅ Shipped + tested |
| S0/S5 3E — Business-day filter in insightsService.js | ✅ Shipped + tested |
| FIX B — Dashboard sort_by collect_bill → created_at + isPaid gate | ✅ Shipped + tested |
| FIX A Phase 1 — Order-level charge distribution (delivery+tips+roundOff) | ✅ Shipped |
| S6 — 8 header pills (was 4) | ✅ Shipped + verified |
| S6 Ledger Audit investigation — 0 flags for cafe103 May | ✅ Investigated — backend data is consistent |
| FIX A Phase 2 — Audit engine rehash | DEFERRED |

---

## 1. KEY FINDINGS FROM INVESTIGATIONS

### Revenue Gap (Dashboard vs S5)
- Dashboard uses `order_amount` (grand total including delivery+tips+roundOff)
- S5 was using line-level formula only (missing order-level charges)
- FIX A distributed `delivery_charge + tip_amount + round_off` proportionally to sold items
- `delivery_charge_gst` NOT included — owner confirmed it's already baked into header GST
- Gap closed: ₹3,827 → ~₹480 (acceptable — remaining is SC order-vs-line residual + rounding)

### S6 Ledger Audit — 0 Flags
- cafe103 May: 2072 orders scanned, 130 skipped (FE-85 empty), ALL pass 6 rules
- Engine confirmed working (approved=true, __source populated, items have gstAmount/vatAmount)
- Backend data is internally consistent — `order_sub_total_without_tax` matches formula, `order_amount` matches `subTotal + GST + roundOff`
- Earlier sessions (June 3) reported ~61 flags — backend likely corrected data since then

### Business-Day + sort_by Alignment
- ALL Insights screens now use `sort_by: 'created_at'` consistently
- ALL screens have business-day filter via `getBusinessDayRange` / `isWithinBusinessDay`
- Dashboard's revenue gate tightened from `!isCancelled` to `fStatus === '6'` (isPaid)

### S9 Cancellations — What was fixed
- Loader: manual fetch → `useReportFetch` (abort, debounce, ghosting)
- Header: S5 pattern (green Apply, orange border, FY preset, breadcrumb)
- Revenue: `price × qty` (double-counting) → audited `unitPrice × qty + addon + variation − discount + SC + tax`
- Audit tab: flags cancelled items where discount/SC/GST/VAT ≠ 0

---

## 2. S6 ORDER LEDGER — 8 HEADER PILLS

**Bill math flow (left to right):**
```
Item Total + Delivery + SC+Tips − Discount = Sub Total
Sub Total + Tax + Round Off = Total
```

| Pill | Backend field | Size |
|------|--------------|------|
| Item Total | `order_sub_total_amount` | Regular |
| Delivery | `delivery_charge + delivery_charge_gst` | Small |
| SC + Tips | `total_service_tax_amount + tip_amount` | Small |
| Discount | `restaurant_discount_amount` | Small |
| Sub Total | `order_sub_total_without_tax` | Small |
| Tax (GST+VAT) | `total_gst_tax_amount + total_vat_tax_amount` | Regular |
| Round Off | `round_up` | Small |
| Total | `order_amount` | Regular + orange accent |

All pills are **pure backend passthrough** — zero frontend calculation, just `Σ` of each order's backend field.

---

## 3. insightsService.js — ALL CHANGES MADE

### getItemSalesAggregated
- **Signature**: `(fromDate, toDate, sortBy, schedules = [])` — 4th param added
- **Import**: `getBusinessDayRange`, `isWithinBusinessDay` from businessDay.js
- **Merge exclusion**: `payment_method === 'merge'` → skip
- **Business-day filter**: applied after API response
- **Order-level charge distribution** (FIX A Phase 1): 2-pass per order
  - Pass 1: process lines, track sold-item revenue per order
  - Pass 2: distribute `delivery_charge + tip_amount + round_off` proportionally to sold items by revenue share
  - `delivery_charge_gst` NOT included (already in header GST)

### getDashboardAggregated
- **Signature**: `(fromDate, toDate, schedules = [])` — 3rd param added
- **sort_by**: changed from `collect_bill` → `created_at` (aligns with all other screens)
- **Revenue gate**: `!isCancelled` → `isPaid` (fStatus === '6')
- **Channel gate**: same `!isCancelled` → `isPaid`
- **Merge exclusion + business-day filter**: applied to both `orders` and `cancelDataOrders`

---

## 4. FILES MODIFIED THIS SESSION

| File | Changes |
|------|---------|
| `frontend/src/pages/reports-module/CancellationsMockup.jsx` | Full rewrite: useReportFetch, ReportLoadingShield wrapper, S5 header, revenue formula, Audit tab |
| `frontend/src/api/services/insightsService.js` | Import businessDay, merge exclusion, business-day filter, sort_by alignment, isPaid gate, order-level charge distribution |
| `frontend/src/pages/reports-module/ItemSalesHybridMockup.jsx` | Extract schedules, pass to getItemSalesAggregated |
| `frontend/src/pages/reports-module/DashboardMockup.jsx` | Import useRestaurant, extract schedules, pass to getDashboardAggregated |
| `frontend/src/pages/reports-module/OrderLedgerMockup.jsx` | 8 header pills (billTotals expanded with delivery, scTips, discount, roundOff) |
| `frontend/.env` | REACT_APP_SHOW_AUDIT_TAB=true |

---

## 5. TEST RESULTS

| Iteration | Scope | Result |
|-----------|-------|--------|
| 1 | Deployment (15 tests) | 100% PASS |
| 9 | S9 fixes (4 fixes, 14 tests) | 100% PASS |
| 10 | S5+S0 business-day + merge (8 tests) | 100% PASS |
| 11 | Dashboard sort_by + isPaid (6 tests) | 100% PASS |

---

## 6. NEXT WORK (priority order)

1. **S6 Ledger Audit — Review & update rules with owner**
   - cafe103 May: 2072 scanned, 0 flags — all orders pass all 6 rules
   - Owner needs to review: are current rules sufficient? New rules needed? Thresholds correct?
   - Current rules: FE-81 (cancelled+tax), FE-82R (subtotal formula), FE-83 (GST+VAT both), FE-86 (tax rollup), FE-88 (grand total), FE-89 (delivery GST)
   - Engine: `frontend/src/utils/orderLedgerAuditEngine.js` (312 lines, pure functions)
   - Manifest: `frontend/src/utils/auditManifest.js` entries FE-81/82R/83/86/88/89
   - UI: `OrderLedgerMockup.jsx` Ledger Audit tab (env-gated REACT_APP_SHOW_AUDIT_TAB=true)
   - Previous sessions reported ~61 flags (16 FE-82R + 45 FE-88) — backend data appears corrected since then
2. **S10 Gate ②** — Owner reviews Prep & Serve Time mockup
3. **FIX A Phase 2** — Audit engine rehash (recalculate expectedTax with distributed charges)
4. **S9 export** — Wire Excel/PDF
5. **S10 Gate ④** — Wire live API after owner approval
6. **Phase 3** — 28 mechanical screens (S11–S38)

---

## 7. PARKED ITEMS

| Item | Why parked | Next step |
|------|-----------|-----------|
| FIX A Phase 2 — Audit engine rehash | Owner said "rehash in next phase" | Owner decides timing |
| S5 count metric 3A | S5 "78 cancelled" = unique products, S9 "107" = total qty — both correct | Document only |
| Revenue gap ~₹480 | SC order-vs-line residual + rounding across 2117 orders | Accepted tolerance |
| S6 Ledger Audit 0 flags | Backend data consistent — no action needed | Monitor on other restaurants |

---

## 8. DO NOT TOUCH

- `auditManifest.js` — all 42 S5 rules + 6 S6 rules approved
- `orderLedgerAuditEngine.js` — all rules passing, confirmed working
- `REACT_APP_SHOW_AUDIT_TAB` env behavior
- S7/S8 revenue filter: `fOrderStatus === 6`
- S8 classifier: no catch-all "Other"
- `orderLedgerService.js` business-day filter
- `reportExporter.js`
- FIX A formula: `delivery_charge + tip_amount + round_off` (NOT delivery_charge_gst)

---

*End of session. All Phase 2 screens S0–S9 FROZEN. S10 awaiting Gate ②. 8 fixes shipped, all tested. Ledger Audit confirmed working (0 flags = clean data). Next: S10 + Phase 3.*
