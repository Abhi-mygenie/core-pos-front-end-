# Batch C — Owner Answers (DRAFT, round 1) — 2026-11-14

Status: DRAFT — not yet written to registry. Scope: P0 only.

| Q | Answer |
|---|---|
| 605-01 | Merge BUG-605 into CR-526. |
| 605-02 | Nothing happens on click. |
| 605-03 | Make Unpaid only fails. |
| 605-04 | All order types. |
| CR-503 | Collect opens a pop-up; the pop-up must include a Print Bill option. |
| BUG-675 | Screenshot referenced — NOT received. Code check: text "definition pending" no longer exists anywhere in frontend/src → likely old build deployed, or different text. |
| CR-444 | → P1 |
| CR-497 | → P1 |
| CR-537 | → P1 |
| CR-539 | → P1 |
| CR-138 | → P1 |
| BUG-192 | → P1 |
| C-client | ALL |
| C-assign | Yes — Abhishek FE, waiting on Gyan; Gyan keeps BUG-605 (merged), CR-497, CR-138, BUG-192. |

## Round 2 answers (2026-11-14)
| Q | Answer |
|---|---|
| BUG-675 | Screenshot referenced again — still NOT received. |
| 503-02 | Already behaves by existing rules (moves after collection). |
| 503-03 | Yes — use CR-515 rights. |
| CR-504 | → P1 |
| CR-505 | 505-01 a, 505-02 a — owner believes already done. Code check: BUG-645 (QA PASS 2026-11-08) already gives Order Beta + Audit: split legs in Payment dropdown, partial orders shown under any matching mode with leg amount "(of ₹full)", day/summary totals sum leg amounts only. → propose CLOSE as covered by BUG-645. |
| CR-507 | → P1 |
| CR-508 | → P1 |
| CR-509 | → P1 |
| CR-510 | Owner: already done. Code check: OrderDetailSheet.jsx L337-395 renders variations + add-ons with prices for every item; BUG-601 (aggregator variations dropped) is GATE_5B_QA_PASS. → propose CLOSE (verify on one Swiggy/Zomato order). |
| CR-532 | → P1 |
| CR-528 | Goes in the Audit report; rest at impact. |
| CR-524 | Duration in minutes; punch time = when item was added. |

Still not answered: CR-506, CR-511, 505-03.
