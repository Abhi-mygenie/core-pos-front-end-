# SESSION HANDOVER — 2026-06-11 (evening) — Insights Batch EXECUTED
**From:** implementation agent (this session) · **For:** next agent
**Read first:** memory/control/AGENT_HANDOVER_PROTOCOL.md · OWNER_DECISION_QUEUE.md (Category H + Addendum-2) · this file.

## 1. One-line state
ALL 9 Insights-batch items closed this session — 8 SHIPPED + QA-passed (GO-1: BUG-125/126/128 · GO-2: CR-029/030/032+BUG-127 · GO-3: CR-031/034) plus bonus CR-035 (Report Definitions page). CR-033 remains parked (backend brief #1). Owner Gate-6 smoke pending on everything.

## 2. What shipped (code gates have full detail)
| Wave | Items | Gate-4 doc |
|---|---|---|
| GO-1 | BUG-125 cancel predicate · BUG-126 round_up · BUG-128 dup fetch | memory/bugs/GO1_CODE_GATE_2026_06_11.md |
| GO-2 | CR-029 room incl · CR-030 collection basis · CR-032 classifier · BUG-127 credit tile | memory/change_requests/code_gates/GO2_CODE_GATE_2026_06_11.md |
| GO-3 | CR-031 cancel truth · CR-034 Credit bucket | memory/change_requests/code_gates/GO3_CODE_GATE_2026_06_11.md |
| — | CR-035 definitions page + ⓘ links (5 screens) | memory/change_requests/code_gates/CR_035_CODE_GATE_2026_06_11.md |

## 3. New shared modules (use these — do NOT re-derive)
- `frontend/src/utils/paymentClassifier.js` — ONE payment_method→bucket map (CR-032). TAB/pending/transferToRoom/Cancel/Merge → null.
- `frontend/src/utils/cancellationValuation.js` — ONE cancellation truth (CR-031): `CANCEL_LOOKBACK_DAYS=45`, `isOrderCancelledScope`, `valueCancelledLine` (comp at complementary_price), `valueCancelledOrder` (OPS-CANCEL).
- `orderLedgerService.js` — `REVENUE_BASIS='collect'` flag (1-line rollback to 'punch'), `getRevenueOrdersForRange` (fs6, collect_bill bd window, to+1 tail, room incl, TAB flagged), `getTabSettlementsForRange` (N daily-sales calls).

## 4. Live-validated facts (don't re-litigate)
- Sales identity: `Σ fs6 orders by collect_bill business day (room incl, TAB excl) + tab settlements ≡ daily-sales paid_revenue` — 31/31 March exact, owner formula confirmed.
- CR-034 identity: Sold+Credit ≡ old Sold to the rupee; Credit May = ₹49,460 exact.
- `sort_by='cancel_at'` NOT supported by backend (success=false) → 45d lookback pattern (max observed gap 33d).
- `tap-waiter-list` now returns `restaurant-tap-summary` {credit,debit,balance} but IGNORES all date params → tile is "as of today" (owner ruling R2-AMEND).
- Settlement `total_sale = paid_revenue − TAB settled + TAB punched` (derived, ₹2,304 March residue) — CR-033 parked on backend confirming.
- NEW backend anomaly: daily-sales "ghost cash" Jun 7 (₹74) / Jun 10 (₹128) — in NO order row, settlement engine agrees with our screens. In brief Addendum-2.

## 5. Pending / next
1. **Owner Gate-6 smoke** on all shipped work (key checks: Cancellations Order-Level tab fills · Sales total == backend paid_revenue · Items "Added to Credit" tab on a May range · Dashboard Credit Outstanding == tap summary).
2. **Owner forwards BACKEND_BRIEF_2026_06_11.md** (now with 2 addenda) → unblocks CR-033 + BUG-127 historical upgrade + ghost-cash explanation.
3. Deferred (small): Credit-tab export sheet · audit-engine flags for credit bucket · basis footer in exports (proposed, not approved).
4. cafe103 (rid 644) spot-check of GO-2/GO-3 numbers — March Palm House is fully reconciled; cafe103 only spot-checked for tap summary.

## 6. Gotchas for next agent
- App bootstrap: direct URL nav re-bootstraps (slow). For Playwright use `window.history.pushState(...) + PopStateEvent('popstate')` after login. Palm House creds in memory/test_credentials.md.
- Items/Cancellations/Dashboard now fetch 45d extra (cancel lookback) — payload grew; if perf complains, that's why (backend range-endpoint ask #4 would fix).
- Dashboard makes 3 order-log fetches + N daily-sales + tap-list per load — intentional (punch tiles / revenue tiles / cancel tiles have different bases).
- Cancellations screen: `cancelledItems.__orderAgg` carries OPS-valued order-scope totals (array property — don't spread the array or it's lost).
- Comp qty counters now exclude comp-cancel lines (precedence partition H20) — small comp-count drops vs old screen are CORRECT.
- KPI "Revenue Loss" (OPS-valued) may differ slightly from stage-chart Σ (line-valued) — documented OPS-vs-line drift, not a bug (e.g., 7-day view: 138 vs 130).
- requirements/package files: only add deps via yarn add / pip freeze. Preview env: supervisor manages frontend (port 3000) — never start own servers.

## 7. Doc state (all current as of session close)
CR_REGISTRY.md · BUG_TRACKER.md · registry.json (art4/art5 PRESENT, 5/7 for all 9+1 items) · CR_011_SCREEN_FREEZE_LOG.md (S5/S7/S8/S9 amendments ×3) · OWNER_DECISION_QUEUE.md (H-Addendum-2 incl. H22-KEY closed) · BACKEND_BRIEF_2026_06_11.md (+2 addenda) · INSIGHTS_BATCH_HANDOVER_2026_06_11.md (+addendum) · PRD.md (full session log).
