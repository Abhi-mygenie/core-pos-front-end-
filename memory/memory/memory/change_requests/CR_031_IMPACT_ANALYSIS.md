# CR-031 — Impact Analysis (Gate 2)

**Date:** 2026-06-11 · **Status:** ANALYSIS COMPLETE — Gate 3 needs owner sign-off on canonical formula · Depends: BUG-125

## 1. The Two Implementations Today
| Aspect | Cancellations report | Dashboard |
|---|---|---|
| Order-cancel money | Σ per-line (subtotal+tax) | `order_amount` |
| Item-cancel money | per-line (subtotal+tax) | raw `line.price` |
| Date gate | created_at business-day fetch, displays cancel_at | created_at fetch + cancel_at within CALENDAR range |
| Counting | qty | lines (`+=1`) |
| Scope detection | `pm==='cancelled'` (broken — BUG-125) | `fStatus==='3'` |

## 2. Proposed Canonical (for owner sign-off at Gate 3)
- Money: per-line `subtotal + tax` (insightsService-audited formula) — robust to partially-cancelled orders where `order_amount` ≠ cancelled value (cafe103 012580: ₹120 vs ₹10,680)
- Count: qty
- Scope: `fStatus===3` → order-level; else item-level (post-BUG-125)
- Attribution: `cancel_at` (consistent with CR-030 collection-mode thinking) — and FIX the partial-window problem: cancels of pre-range orders are currently missed (interacts with BUG-128 follow-up)

## 3. Affected Files
- `insightsService.js` getDashboardAggregated cancellations block → call shared helper
- `CancellationsMockup.jsx` → call shared helper
- NEW `frontend/src/utils/cancellationValuation.js` (single formula + scope + date gate)

## 4. Number Shifts (replication-verified expectations)
Dashboard cancel revenue rises to match Cancellations report: Mar +13,475 / Apr +6,658 / May +10,453 (palmhouse). Owner should expect the Dashboard tile to INCREASE.

## 5. Regression Risk
- MEDIUM. Dashboard tile + glance summary + top-reason aggregation all shift. Cancellations report numbers ~unchanged (it is closer to canonical already).
- Frozen-screen S9 (Cancellations) — freeze-log entry required.

## 6. Test Strategy
Post-change, `analyze.py` Dashboard-cancel replica must equal Cancellations replica exactly, all months, both restaurants. Manual check on the single big June cancel (cafe103 012612 ₹1,02,286).
