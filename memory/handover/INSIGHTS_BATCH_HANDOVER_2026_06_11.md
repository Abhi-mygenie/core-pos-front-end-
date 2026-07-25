# HANDOVER — Insights Reconciliation Batch → Implementation Agent
**Date:** 2026-06-11 · **State:** Gates 0–3 COMPLETE for all items · **NEXT:** Gate 4 (code gate + owner GO) → implement → harness QA → owner smoke
**HARD RULE (owner R3):** NO code until owner gives explicit GO per wave. Owner approves waves as "GO-1" / "GO-2" / "GO-3".

---

## 1. CONTEXT IN 60 SECONDS
Two cross-report audits (cafe103 rid 644, Palm House rid 541; Mar 1–Jun 10 2026 live preprod data) proved the Insights module's screens disagree by up to 34%/month because each screen has its own hidden rules (date basis, room scope, TAB credit, cancellation math). ~35 owner decisions were extracted over 2 Q&A rounds and FROZEN. 9 implementation plans were written. Everything is owner-ruled — do NOT re-litigate decisions; if something seems wrong, check the decision queue first, then ask the owner.

## 2. ENVIRONMENT
- Repo: branch `11-june` of core-pos-front-end-, lives directly in `/app` (frontend-only React/CRACO app at `/app/frontend`, supervisor-managed, port 3000; FastAPI stub backend at `/app/backend` — NOT used by this batch)
- `/app/frontend/.env`: REACT_APP_API_BASE_URL=https://preprod.mygenie.online/ (the real API), plus Firebase/socket/CRM keys — do not modify
- Restart: `sudo supervisorctl restart frontend` (only for .env/dependency changes; hot reload otherwise)

## 3. CREDENTIALS (also in /app/memory/test_credentials.md)
- Palm House owner: `owner@palmhouse.com` / `Qplazm@10` (rid 541 — rooms, TAB, comps: richest test data)
- cafe103 owner: `owner@cafe103.com` / `Qplazm@10` (rid 644 — has `transferToRoom`, `zomato_gold` enums)
- Login: POST `/api/v1/auth/vendoremployee/login` → bearer token

## 4. DOCUMENT MAP (read order)
1. `/app/memory/control/OWNER_DECISION_QUEUE.md` — **Category H + H-Addendum = the law.** Every locked decision with owner verbatims
2. Implementation plans (Gate 3, scope LOCKED):
   - `/app/memory/memory/bugs/BUG_{125,126,127,128}_IMPLEMENTATION_PLAN.md`
   - `/app/memory/memory/change_requests/CR_{029,030,031,032,034}_IMPLEMENTATION_PLAN.md`
3. Audits (evidence + numbers): `/app/INSIGHTS_REPORTS_AUDIT.md` (cafe103), `/app/INSIGHTS_REPORTS_AUDIT_PALMHOUSE.md`
4. `/app/memory/control/BACKEND_BRIEF_2026_06_11.md` — 7 asks, owner forwards; items 1–2 block CR-033 + BUG-127 historical
5. Control: `registry.json` (182 items, batch at 3/7), `BUG_TRACKER.md`, `CR_REGISTRY.md`, `CR_011_SCREEN_FREEZE_LOG.md` (S7 Sales / S8 Payments / S9 Cancellations are FROZEN)
6. Harness: `/app/audit_data/` — `fetch_data.py` (pulls live data), `analyze.py` (replicates every screen's math), `results.json`

## 5. THE LOCKED SPEC (one paragraph per rule — full detail in plans/queue)
1. **Revenue = collected, by collection date** (`collect_bill`) on Sales/Payments/Dashboard. Fetch `sort_by:'collect_bill'`, range to_date+1 (00:00–03:00 tail), filter+bucket by collect_bill **business day** (06:00→03:00, both restaurants)
2. **Room food included EVERYWHERE** (RM/SRM/pm='ROOM'/transferToRoom). Remove `isRoomOrderForReport` stripping from orderLedgerService + AllOrdersReportPage. Existing TAB_FILTERS classify all stages correctly (validated): checkout→Paid, TAB→Credit, unpaid RM (fs 5/2)→Running, transferToRoom→Running, pm='ROOM' fs6→Paid. Room rent NEVER in order-logs — no double count
3. **TAB (credit) is never revenue at punch.** Exclude pm='TAB' from revenue/mix; keep its GST in tax-collected; add settlements (`tab_payment` = Credit Cash/Card/UPI from daily-sales API per day) on settlement day. TAB is CUMULATIVE per customer — no order linkage, items never move buckets
4. **Items & Menu stays PUNCH-dated**, gains Ledger-style buckets: Sold (non-TAB fs6) / Added to Credit (TAB) / Cancelled (by cancel_at) / Pending. Order Ledger stays punch-dated, no new tabs
5. **Cancellations:** value = item-line `unit_price×qty + addons + variations` (discount zeroed on all 823 verified lines); comp lines at `complementary_price`; count = qty; attribute by `cancel_at` (fetch `sort_by:'cancel_at'`); order display amount = `operations[].order_cancel.previous_order_amount` when present else line consolidation; scope = fs===3 (Merge guard KEPT). Dashboard + Cancellations share ONE module
6. **Payment charts = 3 groups:** order (Cash/Card/UPI/Partial/Room Bill[pm='ROOM']) / Credit settlements / Room — matches backend `paid_revenue_method` structure exactly
7. **Dashboard tile = "Credit Outstanding"** from `tap-waiter-list` Σ balance (range ends today), "—" for historical (backend brief #2 pending)
8. **Per-screen header labels** (Q-B): Sales/Payments/Dashboard "by collection date"; Items+Ledger "by punch date"; Cancellations "by cancellation date"
9. Zero-bill (100%-discount) orders STAY counted (flagged via discount column). `pending` pm = unpaid, never in paid mix

## 6. EXECUTION WAVES (await explicit owner GO per wave)
| Wave | Items | Order/dependency |
|---|---|---|
| GO-1 | BUG-125, BUG-126, BUG-128 | Independent 1-liners; BUG-125 before CR-031 |
| GO-2 | CR-029 → then CR-030 + CR-032 + BUG-127 | Rooms FIRST, then basis switch — one variable at a time so harness isolates each delta. CR-030 behind `REVENUE_BASIS` flag |
| GO-3 | CR-031 → CR-034 | Shared cancellation module first, Items buckets consume it |

**Gate 4 per item:** write a short code-gate doc (scope lock = the plan's Changes section verbatim) + freeze-log amendment for S7/S8/S9 where touched → present to owner → GO → implement → set art4/art5 in registry.json + completeness.

## 7. QA — OWNER-APPROVED RULE (H33)
"A fix is DONE only when the screen matches the harness to the rupee", both restaurants, Mar 1–Jun 10.
- Extend `/app/audit_data/analyze.py` replicas to the new spec per plan's "Expected number shifts" (each plan lists exact target deltas)
- EXCLUDE cafe103 order `012612` (₹1,02,286 cancel) — owner-confirmed TEST data
- Cross-foot daily: Sales(collection) ≈ Order Summary `paid_revenue + room_revenue + tab_payment` per day (verified e.g. Mar 15: room food 137/20,475/1,712 matches to the rupee)
- After each wave also re-run prior waves' checks (regression)

## 8. VERIFIED API/FIELD FACTS (do not re-discover)
- `/api/v2/vendoremployee/report/order-logs-report` POST `{sort_by: created_at|collect_bill|cancel_at, from_date, to_date}` → wrapper keys: `order_info, orders_table, order_details_table, operations, partial_payments`
- Business day: 06:00→03:00(+1), every day, both restaurants (profile `schedules`)
- `f_order_status`: 6=paid/collected · 3=cancelled (also Merge!) · 5/2=running/unpaid · 9/8=hold
- `payment_method` live enums: cash/card/upi/TAB/Cancel/Merge/partial/pending/cash_on_delivery/ROOM (+transferToRoom, zomato_gold at cafe103). Cancelled = `'Cancel'` exactly — NEVER 'cancelled'
- `round_up` exists; `round_off` does NOT (BUG-126)
- Comp lines: `complementary:1`, billed keys zeroed, **`complementary_price`** holds menu value (live-verified)
- `operations[].operation='order_cancel'` → `previous_order_amount` (tax-INCLUSIVE; only ~25/97 coverage; edge garbage cases 015756/015772 — harness flags drift). `item_cancel` ops also exist
- Partial cancels: order_amount = KEPT items only (158/158 verified) — cancelled value lives ONLY in lines
- daily-sales-revenue-report POST `{from:'YYYY-MM-DD'}` → `paid_revenue_method.{order_payment, tab_payment, room_revenue}`, `tab_cash/card/upi`, `unpaid_revenue`, `orderTAB`. room_revenue = room FOOD collected at checkout (verified, not rent)
- Credit: `tap-waiter-list` POST {} → customers with `total_credit/total_debit/balance` (string "1,92,898.00" — strip commas). Palm House: ~₹4.4L outstanding GENUINE (nothing settled — settled-TAB lines legitimately ₹0)
- `paid-in-tab-order-list` is GET with from_date/to_date
- Settlement: `get-settlement-report` POST dates as DD-MM-YYYY; day `totals.total_sale` basis UNKNOWN (backend brief #1 — do not try to reconcile until answered)

## 9. CODE MAP (entry points)
- `frontend/src/api/services/insightsService.js` — getItemSalesAggregated (~line 93 round_off bug; bucket logic), getDashboardAggregated (~530 duplicate fetch; ~655 dead unsettledTab; cancel block ~781)
- `frontend/src/api/services/orderLedgerService.js` — room stripping copy (~line 32), sortBy plumbing
- `frontend/src/pages/AllOrdersReportPage.jsx` — original `isRoomOrderForReport` (~40), TAB_FILTERS (~66)
- `frontend/src/pages/reports-module/{SalesMockup,PaymentsMockup,CancellationsMockup,DashboardMockup,ItemSalesHybridMockup}.jsx` — CancellationsMockup ~line 234 = BUG-125 string
- `frontend/src/api/transforms/reportTransform.js` — deriveOrderStatus (~686) = the canonical status predicate
- `frontend/src/api/services/creditService.js` — credit APIs ready to reuse
- NEW modules to create: `utils/cancellationValuation.js` (CR-031), `utils/paymentClassifier.js` (CR-032)
- data-testid mandatory on all new/changed interactive+KPI elements (kebab-case)

## 10. GOTCHAS
1. Merge orders ALSO have fs=3 — every fs-3 cancel check needs the Merge guard
2. `Observation:` `015868`-type full-cancels have ZERO items — order-level loss only via operations amount (when present)
3. 42 orders/month punched 00:00–03:00 at palmhouse — business-day bucketing is NOT cosmetic
4. June 4–6 palmhouse = closed (zero data is correct, not a bug)
5. cafe103 + palmhouse differ: only cafe103 has transferToRoom/zomato_gold literals — test both
6. Frozen screens S7/S8/S9: freeze-log entry BEFORE merge, per screen, at Gate 4 (owner ruling H34)
7. Numbers will visibly CHANGE for the owner (Sales March +₹1.78L rooms, −₹70K TAB, etc.) — expected-shift tables in each plan are the contract; surprises beyond them = stop and check harness
8. paid_revenue_method.order_payment is ALSO collection-dated — punch-date frontend can never match it (that's the point of CR-030)

## 11. PENDING / EXTERNAL
- Owner to forward backend brief; replies unblock CR-033 (settlement formula) + BUG-127 historical balance
- BUG-129 downgraded (FE gates by pm, not fs) — informational
- After batch ships: owner smoke (Gate 6) per item; suggest "Report Definitions" help page as follow-up (proposed to owner, not approved)

---
## ADDENDUM 2026-06-11 (live-validation session) — §11 updates
1. **BUG-127 UNBLOCKED:** backend added `restaurant-tap-summary` to tap-waiter-list (as-of-now only; date params ignored). Owner ruling R2-AMEND: tile = `restaurant-tap-summary.balance`, label "as of today", ALL ranges (replaces "—" placeholder). Brief #2 (`as_of_date`) still open for the historical upgrade only.
2. **CR-033 formula derived + validated:** total_sale = paid_revenue − TAB settled + TAB punched (₹2,304 March residue, 4 days). Owner: park deeper recon, move forward. Brief #1 sharpened to confirm+residue.
3. **CR-030 acceptance target locked:** Sales(day) must equal daily-sales `paid_revenue` (owner formula "paid orders from order log + TAB settled" validated 5/5 days to the rupee; room orders natively inside order log — disjoint from order_payment bucket, no double count).
4. Stale data note: Palm House credit outstanding now ₹6,27,428 with ₹88,612.50 settled — audit-era "₹4.4L, nothing settled" snapshot superseded.
See OWNER_DECISION_QUEUE.md H-Addendum-2 for verbatims.

---
## FINAL STATUS ADDENDUM — 2026-06-11 session close
**BATCH EXECUTED.** Owner gave GO-1 / GO-2 / GO-3 in-session; all 8 implementable items SHIPPED + QA-passed (harness to the rupee + UI smoke). CR-035 (Report Definitions page — §"proposed to owner" follow-up) approved and shipped same session. CR-033 remains parked on backend brief #1. Owner Gate-6 smoke pending. Full state: handover/SESSION_HANDOVER_2026_06_11_EVE.md (supersedes the "next steps" of this file).
