# Batch D — Owner Answers (DRAFT, round 1) — 2026-11-14

Status: DRAFT — not yet written to registry. Scope: P0 only.

| Q | Answer |
|---|---|
| CR-518 | → P1 |
| 525-01 | Both KOT and Bill replaced by one Collect Bill button — on order cards AND table cards. |
| 525-02 | Order edited after print → KOT and Bill come back. |
| 525-03 | Button opens the Collect Bill screen directly (not the order screen) — also when tapping the card/collect-bill when bill is printed. |
| 525-04 | Both table and order cards. |
| CR-521 | Keep green border; background orange instead of green — only change. Code: TableCard.jsx L287-288, OrderCard.jsx L460 (`COLORS.billPrintedBg`). |
| 523-01 | Saved immediately on customer pop-up save. |
| 523-02 | Add + change if possible — check at impact. |
| 523-03 | Yes, after bill print too. |
| 673-01 | Same as today (exact short-code highlight + Enter adds). |
| 673-02 | No; owner found question unclear. |
| 673-03 | Root cause per owner: first item is always selected by default; after search + add, pressing Enter adds the default item again (twice) instead of the searched item. |
| BUG-667 | Owner asked which screen — answered: Sidebar bottom (Sidebar.jsx ~L888, "Name · #ID"). |
| CR-516 | → P1 |
| BUG-669 | Requirement: create add-ons AND variations with ₹0 price. |
| CR-437 | → P1 |
