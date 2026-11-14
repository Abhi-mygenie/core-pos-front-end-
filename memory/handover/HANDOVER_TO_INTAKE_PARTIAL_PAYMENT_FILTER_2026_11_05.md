# HANDOVER → INTAKE AGENT — Partial-payment Payment-filter bug (Order Report + Orders Beta)
**From:** INVESTIGATION agent (separate branch/session)  **Date:** 2026-11-05  **Source:** OWNER-REPORTED (2 screenshots, Payment = Cash, 05/11/2026)
## IMPORTANT — Registration
- This was investigated on a **different branch**. A provisional ID "BUG-645" was used there — **IGNORE that ID**.
- Use **YOUR branch's** `memory/control/registry.json` + `BUG_TRACKER.md` as source of truth.
- Run your normal duplicate check (related: BUG-272 partial payment breakdown, BUG-546 Split Bill badge) and assign the **next free BUG ID in your registry**.
- Investigation is COMPLETE and owner decisions are CLOSED — **do not re-investigate**. Register status as: `INVESTIGATION_COMPLETE — ODs closed. Next: PLANNING Gate 2-3.`
## Suggested registry fields
- **Type:** BUG  **Severity/Priority:** P1  **Risk:** MEDIUM (financial display, R6)  **Area:** Reports
- **Title:** Order Report + Orders (Beta) — Payment filter (cash/card/upi) shows wrong amount for split (partial) payments
- **Code reality:** PARTIAL — Daily Report already includes split orders by leg (BUG-272 logic) but sums full bill; Beta has no leg handling.
## Symptom (owner screenshots)
- **Daily Report**, Payment = Cash: T-000285 (Cash ₹10,000 + UPI ₹5,750) shows Amount ₹15,750; header TOTAL ₹16,240. Correct cash = ₹10,000; total should be ₹10,490.
- **Orders (Beta)**, Payment = cash: T-000285 not listed at all; total ₹590 (missing ₹10,000 cash).
## Root cause (HIGH confidence, FE_BUG, no backend ask)
Server sends one label per order (`cash`/`upi`/`card`/`partial`) PLUS a per-mode split. Split orders are labelled `partial`. FE uses the label and full bill, ignoring the split.
1. **Daily Report** — `frontend/src/pages/AllOrdersReportPage.jsx` ~L418-430: filter keeps partial order with cash leg (correct), but row `amount` = full `order_amount` (`api/transforms/reportTransform.js` ~L1030) and `calculateSummary` (~L1177) sums full amount. Split legs already parsed into `cashAmount/cardAmount/upiAmount` (~L851-857, L1109-1111) but unused for amount/total.
2. **Orders (Beta)** — `frontend/src/pages/reports-module/OrderReportBetaPage.jsx` L165: `r.payment_method_raw === filters.payment` (strict) → `partial` rows dropped. Row/day Total (L581) and header total (L456) sum `order_amount_raw`. API row already has `payment: { cash, card, upi, ... }`.
## Evidence (cafe103 preprod)
- Beta API `POST /api/v1/vendoremployee/daily-order-report-details-combined` (1 Oct–5 Nov): 1,813 rows, 36 `partial`, each with `payment{cash,upi,card}`.
- Order-logs API `POST /api/v2/vendoremployee/report/order-logs-report` (02-Oct): order #019223 `payment_method: partial`, `partial_payments[]` = cash 252 + upi 830.
- Backend day Cash totals already correct = cash-only orders + cash legs of split orders (02-Oct 29,880+752=30,632; 03-Oct 26,256+1,879=28,135; 05-Oct 8,976+1,850=10,826). Gap is FE-only.
- Owner's exact orders (T-000285 etc.) are from a different restaurant — not reproducible on cafe103; same code path.
## Owner decisions (CLOSED 2026-11-05)
- **OD-1 YES:** with a payment filter (cash/card/upi), a split order row shows only that mode's part (e.g. ₹10,000) with a small note "of ₹15,750"; totals/avg sum only that part. Applies to BOTH pages.
- **OD-2:** Excel export is backend-generated — NO change.
- **OD-3:** #000249 appears in Beta but not Daily Report for same day (likely business-day window) — owner said DO NOT investigate.
## Scope for Planning
- FE only: `AllOrdersReportPage.jsx` (+ possibly `reportTransform.js` summary helper), `OrderReportBetaPage.jsx`.
- Not touched: backend, Excel export, payment/settle flows.
- Planning skip: **NOT eligible** (2+ files, financial display R6) → full Gate 2-3.
## Ask to INTAKE
1. Check your branch registry; duplicate check vs BUG-272 / BUG-546.
2. Register with next free BUG ID, fields above, status `INVESTIGATION_COMPLETE — ODs closed. Next: PLANNING Gate 2-3`.
3. Save this handover as the intake/investigation reference in your branch.
4. Reply to owner with the assigned ID; hand to PLANNING.
