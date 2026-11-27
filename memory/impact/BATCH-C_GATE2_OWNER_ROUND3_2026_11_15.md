# BATCH-C — Gate 2 Owner Round 3 (open doubts) — 2026-11-15

## Owner answers
| # | Topic | Owner answer | IA effect |
|---|---|---|---|
| 1 | CR-503 Collect on paid Credit rows | Owner will share screenshot + explanation | OD-503-06 OPEN — awaiting owner input |
| 2 | Hold rows already paid via `paylater` | My assumption wrong — backend moves them out of Hold, already does | Withdraw W-11 conclusion. Next probe: re-check why 1578758 (fos 6, paid, method `paylater`) still matched FE Hold predicate (`pm === 'paylater'`) |
| 3 | Hold status codes 8 / 9 | Only ONE Hold status exists; owner will place an order and give details | FE predicate uses fos 8 OR 9 — confirm real code on owner's order, then Gate 3 decides whether to drop the unused code |
| 4 | Credit collect needs customer (403 without) | Owner will share details + screenshots | OPEN |
| 5 | First vs latest print | Backend must report **every bill print** (incl. reprints after edit) | Backend brief: `bill_print` events in `operations[]` (each print), not only first-print timestamp |
| 6 | Placement | Existing Audit report — will be redesigned | Layout decided in design phase |
| 7 | Batch B clash on AllOrdersReportPage | Next agent checks all clashes | Clash list below |
| 8 | Cancellation row grain | Item-level rows = how the cancellation report works today | Accepted. Next probe: cancel a multi-item order and confirm one row per item |
| 9 | Column names / position | Design phase | Deferred |
| 10 | CR-505 / CR-510 coverage | Owner asked for explanation | See below — CR-510 claim corrected |
| 11 | CR-510 real aggregator order | Owner will give details | OPEN |
| 12 | Probe coverage | Owner will create missing data; agent lists what is needed | List below |
| 13 | Backend brief | Send after IA is frozen | Brief stays DRAFT |

## Clashes for next agent (verify line anchors at HEAD)
| File | Batch C item | Other open items |
|---|---|---|
| `AllOrdersReportPage.jsx` | CR-528 (Audit redesign) | BUG-671, CR-526, CR-542 (Batch B); CR-515 (Batch A) |
| `OrderReportBetaPage.jsx` | CR-503 | CR-515 (Batch A, rights later); BUG-645 code (L81-88, L179, L214, L497, L622) must stay intact |
| `CollectBillPanelDrawer.jsx` | CR-503 (`onPrintBill` prop) | CR-515 (gating later), shared with Audit page |
| `CancellationsMockup.jsx` | CR-524 | none found |
| `SettlementPanel.jsx` / `SettlementPage.jsx` | BUG-675 | CR-372-B deletes `SettlementMockup.jsx` only |

## CR-505 — why covered by BUG-645
Asked: partial payments counted in each mode's total; owner 505-01 a (show order if it has any part in the mode), 505-02 a (show that part only).
BUG-645 (GATE_5B_QA_PASS 2026-11-08) in `OrderReportBetaPage.jsx`:
- L214: Payment dropdown includes split-leg modes.
- L179: Cash/UPI/Card filter keeps partial orders whose leg in that mode > 0 (505-01 a).
- L81-88 + L695: row shows only that leg, with "(of ₹full)" (505-02 a).
- L622 day total and L497 grand total sum leg amounts only → no double count.
Gap NOT proven: CR-505 also says "payment-mode breakdown". BUG-645 covers it when a Payment filter is selected. A breakdown with no filter (e.g. per-mode summary cards) was not checked. Verify on preprod with a split order before closing.

## CR-510 — correction
Earlier IA said "BUG-601 makes aggregator variations flow into order details". **Wrong.** BUG-601 fixed aggregator **menu** variations/add-ons being dropped on **menu save**, not order data.
What is true: `OrderDetailSheet.jsx` L337-405 renders `variations` + `addOns` with prices for any order; `reportTransform.js` L441-442 / L602-612 map `variation` / `add_ons` from the API.
Unproven: whether the order-detail API returns `variation` / `add_ons` for Swiggy/Zomato orders (CR-510 OD-510-01). Status → NEEDS VERIFY, not closed.

## Data needed for next probe (owner to create on preprod, CAFE 103 or named restaurant)
1. Hold order still to be collected (owner's normal POS flow) → order # (Q3).
2. Credit (TAB) order with credit customer, unpaid and paid → order #s + screenshots (Q1, Q4).
3. Order: bill printed → item added → bill reprinted → item cancelled → whole order cancelled after print (CR-528, needs a real printer agent).
4. Dine-in table order with 2+ different items, cancelled as whole order (CR-524 grain, Q8).
5. Item cancelled after serving (Post-Serve) on dine-in (CR-524 stage/time).
6. Partial cancel 1 of 2 on a line punched ≥ 5 min earlier (CR-524 split-line duration).
7. Split payment order (e.g. cash + UPI) → check Beta with and without Payment filter (CR-505).
8. Swiggy/Zomato order with variation + add-on → order # (CR-510).
9. Role without `order_unpaid` / print rights (for CR-515 later, optional).
