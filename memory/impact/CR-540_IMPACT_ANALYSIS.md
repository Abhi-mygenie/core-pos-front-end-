# CR-540 — Revenue Leakage Controls — Impact Analysis (Gate 2) — 2026-11-14

Code Reality: NONE for net-new ideas. Risk: HIGH. Priority: TBD (owner).

| Idea | Covered by | Net-new? |
|---|---|---|
| 1 PIN+reason after bill/serve | CR-494 + CR-493 | no |
| 2 Daily caps ₹+count | CR-494 | no |
| 3 Discount cap per role | — (existing `role_base_discount` setting = "No" on cafe103; `discount` right only shows/hides) | YES |
| 4 Owner alert above ₹X / post-bill change | CR-443 (if OD-443-A adds it) | partial |
| 5 Cancels & Discounts by Employee report | insights-cancellations already returns `by_employee` (probe 10); discounts by employee in Discount report | partial — needs merge view |
| 6 Repeat comp/discount to same phone | — | YES (backend aggregation) |
| 7 Reprint audit log | CR-515 gates reprint only; no log | YES (backend) |
| 8 EOD leakage summary % of sales | — | YES |

Open: OD-540-01 priority; OD-540-02 which of 3/5/6/7/8 in phase 1. OPEN.
