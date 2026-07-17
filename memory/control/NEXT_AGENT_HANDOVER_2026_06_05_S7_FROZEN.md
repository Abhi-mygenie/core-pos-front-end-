# NEXT AGENT — S6 FROZEN + S7 Sales FROZEN Handover (2026-06-05)

**Created:** 2026-06-05 (session close)
**Branch:** `5-june`
**Preview URL:** https://insights-phase.preview.emergentagent.com
**Test account:** owner@cafe103.com / Qplazm@10

---

## 0. WHAT WAS DONE THIS SESSION

### S6 Order Ledger — FROZEN (10 changes)

**Freeze Prep (4):**
1. Audit/Ledger Audit tabs env-gated (`REACT_APP_SHOW_AUDIT_TAB`, default hidden)
2. Non-prod labels removed (S6 Hybrid chip, Phase 2B badges, Coming soon tooltips, dev subtitle)
3. Attribution toggle removed — hardcoded to `created_at` (Punched Date)
4. Revised export KPI summary (Net Revenue=Settled+Credit, Pending Revenue=Hold+Running, Revenue Loss=Cancelled, payment method split, per-bucket counts, Avg Order Value)

**Tab Filter Fixes (2 critical bugs):**
5. `TAB_FILTERS.cancelled` — case-insensitive: matches both `'Cancel'` and `'cancelled'` (lowercase). Backend returns `payment_method='cancelled'` (lowercase, 9 chars).
6. `TAB_FILTERS.audit` — true catch-all: negation of all other tab filters. No order can fall into phantom zone.

**Export Fixes (4):**
7. PDF page break — Summary on Page 1, data from Page 2 via CSS `page-break-after: always`
8. Excel TOTAL row — sums ALL 22 numeric columns (was only 3)
9. Excel data pipeline verified correct end-to-end
10. Excel "Settled (incl. Credit)" sheet with "Payment Category" flag column + separate "Added to Credit" sheet kept

### S7 Sales — FROZEN (new screen)

**Business Logic (owner-approved):**
- Revenue = `fOrderStatus === 6` only (paid/settled orders)
- Discount = `discount + couponDiscount` combined
- Room orders excluded
- Cancelled, Merged, Hold, Running excluded from all charts/KPIs

**Screen:**
- Interactive recharts: animated BarChart (daily revenue), PieChart donuts (channel + payment method), AreaChart (hourly distribution)
- KPI cards: Total Revenue, Avg Order Value, Tax Collected, Discount Given
- Daily breakdown table with TOTAL footer
- Excel/PDF export (4 sheets: Daily Sales, By Channel, By Payment Method, By Hour)
- Sidebar linked (`/reports-module/sales`, comingSoon removed)

### Other Changes
- Sidebar: Order Ledger + Sales linked (comingSoon removed)
- CRM URL: changed to `https://insights-phase.preview.emergentagent.com/api` per owner directive

### Investigations
- 85 cancelled orders in cafe103 May: all have `payment_method='cancelled'` (lowercase) + `fOrderStatus=3`. Fixed by case-insensitive cancelled filter.
- 17 orders unaccounted: resolved by catch-all audit filter (no longer phantom).
- Tab count validation: 2062 settled + 55 credit + 68 merged + 85 cancelled + remaining = 2202 total. All accounted for.

---

## 1. ENV VARIABLES

| Variable | Value | Purpose |
|----------|-------|---------|
| `REACT_APP_SHOW_AUDIT_TAB` | `true` | Show Audit tab (preprod). Set `false` for production. |
| `REACT_APP_CRM_BASE_URL` | `https://insights-phase.preview.emergentagent.com/api` | CRM staging build 6 |

---

## 2. FILES MODIFIED/CREATED

| File | Changes |
|------|---------|
| `frontend/src/pages/reports-module/OrderLedgerMockup.jsx` | Freeze prep + tab filter fixes + export fixes |
| `frontend/src/pages/reports-module/SalesMockup.jsx` | **NEW** — S7 Sales screen |
| `frontend/src/utils/reportExporter.js` | PDF page break after summary |
| `frontend/src/components/layout/Sidebar.jsx` | Order Ledger + Sales linked |
| `frontend/src/App.js` | Sales route added |
| `frontend/.env` | REACT_APP_SHOW_AUDIT_TAB + CRM URL change |

---

## 3. NEXT WORK

1. **S8 Payments** — Payment reconciliation (Cash vs Card vs UPI vs TAB breakdown, daily trends)
2. **S9 Cancellations** — Cancelled orders by reason, by employee, revenue loss
3. **S10 Tax** — GST/VAT collected, rate verification

---

## 4. DO NOT TOUCH

- `auditManifest.js` — all 42 rules approved (S5)
- Any FROZEN screen in `CR_011_SCREEN_FREEZE_LOG.md`
- `REACT_APP_SHOW_AUDIT_TAB` env variable behavior
- Export gate logic in `auditEngine.js`
- S7 revenue filter: `fOrderStatus === 6` (owner-locked)

---

*End of S6+S7 handover. Both FROZEN. Next work: S8 Payments.*
