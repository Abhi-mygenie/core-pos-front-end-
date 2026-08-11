# Next Agent Handover · 2026-06-03 (evening close)

**Project:** MyGenie POS · CR-011 Reports Module · S6 Order Ledger Hybrid
**Session length:** Full day, 2026-06-03 (deploy → S6 Gate ① → ② → ③ → ④ → ⑤ revision pass → classifier fix → Ledger Audit Block A → glance-readability)
**Owner present:** Yes, throughout. All decisions captured verbatim in `auditManifest.js` `approvedSource` fields and `SPRINT_STATUS.md` Owner Decision Log.

---

## TL;DR — where things stand

| Surface | Status |
|---|---|
| **S6 Order Ledger** (auth route `/reports-module/order-ledger`) | 🟢 **Gate ⑤ in-flight** · Code complete · Awaiting owner data triage |
| Live preview on cafe103 (owner@cafe103.com / Qplazm@10) | Working with 2202 orders for May 2026, 449 for last 7 days |
| Lint / compile | Clean across all S6 files |
| Documented in control layer | Freeze Log, Sprint Status, Control Dashboard, PRD, this handover |

S5 Hybrid is **PARKED** (backend GST bug ESC-3 still open). S6 is the active screen.

---

## What's live in S6 right now

### Header
- **From-To range picker** (default 7 days, max 60) with orange draft border, green Apply button
- **Preset pill**: Today · 7D · 30D · MTD · FY-disabled
- **Attribution toggle**: By Paid Date / By Punched Date (Cancelled tab: By Cancelled / By Punched). Default = **Punched Date** (matches `AllOrdersReportPage.jsx` L237 hardcoded behavior)
- **Download menu** (F26B33 styling): Excel ✓ · PDF ✓ · Email / WhatsApp / SMS disabled `Phase 2B`
- Hidden on both Audit tabs

### Tabs (10)
All Orders · Settled · Cancelled · Added to Credit · On Hold · Merged · Running · Aggregator · **Audit (Reconciliation)** · **Ledger Audit**

Tab classification uses verbatim `TAB_FILTERS` from `AllOrdersReportPage.jsx` L66‑123 (paymentMethod/paymentStatus/fOrderStatus/orderIn/status fields). Room exclusion via `isRoomOrderForReport`.

### Bill-totals KPI tiles (4)
Item Total · Sub Total · Tax (GST+VAT) · Total. Sums currently-visible rows. Shown on all non-audit tabs. Hidden on audit.

### Calculation-chain column layout
Money columns flow left-to-right: `Item Total → +Delivery +Service +Tip − Discount → Sub Total → +GST +VAT → +Round Off → Total Amount → (tender split)`. Reading any row traces the bill math like a receipt.

### Column chooser
51 cols in 10 groups. Default 16 visible. localStorage `s6.columnVisibility.v1`. Order ID locked. Reset / Show all / Hide all controls.

### Sticky Σ TOTALS row
Right under column headers. Sums every visible numeric column. Only renders when ≥1 row visible. Respects column visibility.

### Audit (Reconciliation) tab
Mirrors Audit Report logic: missing-ID gap detection + transform `status='audit'` unmatched. Dynamic red/green pill.

### Ledger Audit tab — Block A engine LIVE
5 active RED rules + 2 POLICY + 1 REJECTED:

| Rule | Status | Formula | May result on cafe103 |
|---|---|---|---|
| FE-81 | RED | Cancelled order carries tax | 0 ✓ |
| FE-82 | REJECTED | (was: expected tax via rate) — tax is per-item | — |
| FE-82R | RED | `subTotal = itemTotal − discount + delivery + service + tip` | **16 flags** |
| FE-83 | RED | Order has both GST and VAT | 0 ✓ |
| FE-84 | POLICY | Tolerance = ₹0 (no fuzzy match) | — |
| FE-85 | POLICY | Skip orders where subTotal = gst = vat = 0 | 125 skipped |
| FE-86 | RED | `gstAmount = Σ items.tax_amount` | **2069 flags ⚠️** (likely false positives — see Action Item 1) |
| FE-88 | RED | `totalAmount = subTotal + gst + vat + roundOff` | **45 flags** |

**Total real findings to triage: 61** (FE-82R + FE-88).
**Mass false-positive to investigate: FE-86.**

Loyalty/coupon/wallet are deliberately excluded from `discount` per owner directive ("ignore loyalty and coupon for now"). Will be added as separate rules later.

---

## Critical Action Items for next agent — in priority order

### 🔴 P0 · Action Item 1 — Investigate FE-86 mass-firing
**Symptom:** FE-86 (tax aggregation rollup) flagged 2069 of 2077 scanned orders. Sample drift values: `expected ₹0, got ₹3 / ₹18 / ₹44.5` etc.
**Hypothesis:** `sumItemTax(o)` in `/app/frontend/src/utils/orderLedgerAuditEngine.js` reads `it.tax_amount ?? it.taxAmount ?? it.tax`. The transformed `items[]` from `reportListFromAPI.orderLogsReport` may not carry tax at item level — it may use a different field path (`it.tax`, `it.gst`, `it.itemTax`, or computed from `it.tax_rate × it.price × it.qty`).
**Investigation steps:**
1. Login as owner@cafe103.com, hit any order in May 2026 ledger
2. `console.log` the order's `__source.items[0]` to inspect field structure
3. Locate the actual tax field
4. Update `sumItemTax` in `orderLedgerAuditEngine.js` — 3-line fix
**Expected after fix:** FE-86 count drops from 2069 to ~0-20 (real header/body drift)
**Source of truth:** `frontend/src/api/transforms/reportTransform.js` `orderLogsReportRow` function L818-940

### 🔴 P0 · Action Item 2 — Triage 61 real Block A flags
Once FE-86 is fixed, owner needs to review:
- **16 FE-82R flags** (SubTotal formula breaks) — open each in OrderDetailSheet drill, identify root cause
- **45 FE-88 flags** (Grand Total formula breaks) — same
Some may be real backend bugs warranting ESC-3-style escalation. Others may be data-entry edge cases.

### 🟡 P1 · Action Item 3 — Aggregator predicate extension
cafe103 marks Zomato orders via `payment_method='zomato_gold'` not `order_in='zomato'`. Audit Report has the same blind spot. Owner approved option B in earlier session — extend the predicate:
```js
aggregator: (o) =>
  ['zomato', 'swiggy'].includes((o.orderIn || '').toLowerCase()) ||
  ['zomato_gold', 'zomato', 'swiggy', 'swiggy_dineout'].includes((o.paymentMethod || '').toLowerCase()),
```
File: `/app/frontend/src/pages/reports-module/OrderLedgerMockup.jsx` TAB_FILTERS constant.
Register as new FE rule (FE-93 or next free ID) in `auditManifest.js` with rationale.

### 🟡 P1 · Action Item 4 — Tab labels final rename
Placeholders today: **"Audit"** (reconciliation) + **"Ledger Audit"** (Block A). Owner deferred rename "until wiring done". Wiring is done now. Ask owner for final names.

### 🟢 P2 · Action Item 5 — Block B/C rule decisions
Proposed but pending owner triage:
- **Block B** (S5-rollup) — FE-86 (now approved as part of Block A revised), FE-87 (item-level fallback chain audit at order rollup), FE-88 (now approved as part of Block A revised)
- **Block C** (order-only) — FE-89 (tax on zero base) / FE-90 (effective tax > 30%) / FE-91 (service charge without GST) / FE-92 (gstAmountOnly drift)

### 🟢 P2 · Action Item 6 — Loyalty/coupon discount rules
Owner said "will add later". When ready, propose rule(s) for:
- `loyaltyDiscount` (price reduction via loyalty)
- `couponDiscount` (price reduction via coupon)
- `walletUsed` (tender-side reduction)
- `loyaltyUsed` (tender-side reduction)
Tender-side rules would be a separate audit (Σ tenders = finalTotal).

### 🔵 Backlog · Action Item 7 — Backend ESC-3 (cancelled financials not reverted)
Open with backend team. Item-level S5 evidence stands (Palm House 5 orders / Lafetta 12 orders). Order-level S6 currently shows 0 because backend zeros header on full cancel — but item-level data still wrong.

---

## Files touched in this session (S6 ownership)

| File | Last edit | Purpose |
|---|---|---|
| `frontend/src/pages/reports-module/OrderLedgerMockup.jsx` | 2026-06-03 evening | Main S6 screen |
| `frontend/src/api/services/orderLedgerService.js` | 2026-06-03 evening | API delegate + canonical row mapping |
| `frontend/src/utils/orderLedgerAuditEngine.js` | 2026-06-03 evening | Block A audit engine |
| `frontend/src/utils/auditManifest.js` | 2026-06-03 evening | FE-81 through FE-88 registered (FE-82 REJECTED) |
| `frontend/src/App.js` | unchanged this session | Routes |

**Read-only inheritance (DO NOT modify, S6 inherits from these):**
- `frontend/src/components/reports/OrderDetailSheet.jsx` (drill — DATA MODE)
- `frontend/src/components/reports/FilterBar.jsx` · `FilterTags.jsx` · `DatePicker.jsx`
- `frontend/src/components/reports/ReportLoadingShield.jsx` · `useReportFetch.js`
- `frontend/src/utils/reportExporter.js` (Excel + PDF)
- `frontend/src/utils/businessDay.js` (`getBusinessDayRange`)
- `frontend/src/api/services/reportService.js` `getOrderLogsReport`
- `frontend/src/api/transforms/reportTransform.js` `orderLogsReportRow`
- `frontend/src/pages/AllOrdersReportPage.jsx` (canonical TAB_FILTERS source)

---

## Control-layer doc state (as of this handover)

| Doc | Last updated | What's in it |
|---|---|---|
| `control/CONTROL_DASHBOARD.md` | 2026-06-03 evening | S6 status + key milestones |
| `control/SPRINT_STATUS.md` | 2026-06-03 evening | Owner Decision Log up to date |
| `control/CR_011_SCREEN_FREEZE_LOG.md` | 2026-06-03 evening | S6 row reflects Gate ⑤ in-flight |
| `control/OWNER_DECISION_QUEUE.md` | (last touched prior session) | Pre-existing FE rule decisions (S5 era) |
| `memory/change_requests/impact_analysis/CR_011_S6_ORDER_LEDGER_PLAN_2026_06_03.md` | 2026-06-03 morning | S6 implementation plan (some content now outdated post Block A revisions — refer to manifest + this doc for current state) |
| `PRD.md` | 2026-06-03 evening | Session backlog + completed work |
| `test_credentials.md` | 2026-06-03 | owner@cafe103.com / Qplazm@10 |

---

## Quick-start for next agent

1. Read this doc fully + `CONTROL_DASHBOARD.md`
2. Login: owner@cafe103.com / Qplazm@10 at https://insights-phase.preview.emergentagent.com/
3. Navigate to `/reports-module/order-ledger` → confirm 7-day default loads
4. Set range to **May 1 → May 31** to see Block A engine output (2130 flags, 125 skipped, 2077 scanned)
5. Click **Ledger Audit** tab → see KPI strip + per-rule legend chips
6. **Start with Action Item 1** (FE-86 transform investigation) — quickest win, highest signal
7. Once FE-86 fix lands, refresh + ask owner to triage the ~16 + ~45 remaining flags

---

## Things NOT to do

- Don't modify `AllOrdersReportPage.jsx` — S6 inherits from it; any divergence breaks parity
- Don't change `orderLedgerService.js` to dual-fetch — owner explicitly rejected
- Don't add fields to the row mapper without first checking the transform field path (avoid the FE-86-style mass false positives)
- Don't pre-rename the tab labels without owner approval (Action Item 4)
- Don't combine Block A revisions into the S5 manifest namespace — S6 rules live with `screens: ['S6']`
