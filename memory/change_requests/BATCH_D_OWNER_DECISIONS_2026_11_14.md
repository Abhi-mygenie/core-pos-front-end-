# Batch D — Owner Decisions (FINAL for intake) — 2026-11-14

Source: owner Q&A rounds 1–2 (2026-11-14). Detail in `BATCH_D_OWNER_ANSWERS_DRAFT_2026_11_14.md`.
Scope: P0 only. Client = **ALL**. Assignee rule: Abhishek FE, "waiting on Gyan" where backend needed.

## P0 → impact analysis
| Item | Decision |
|---|---|
| BUG-667 | Long restaurant name in sidebar bottom (Sidebar.jsx ~L886-889, "Name · #ID") → **wrap onto 2 lines**. Line already has `truncate`; parent `flex-1` likely lacks `min-w-0` — check at impact. Confirm at impact this is the screen owner meant (667-02 not answered). |
| BUG-669 | Add-ons AND variations can be created with ₹0. Price must be typed (empty not allowed), ₹0 allowed. Screens: Menu Management form + Bulk Editor (owner believes both — impact to check). |
| BUG-673 | First item always selected by default; after search + add, Enter adds the default item again. Fix: after adding, selection jumps back to search box. Short-code highlight + Enter stays as today. Short-code vs name search scope → impact. |
| CR-525 | After bill print: KOT + Bill replaced by one Collect Bill button on table AND order cards. Button and tapping the card both open the Collect Bill screen directly (not order screen). Order edited after print → KOT + Bill return. |
| CR-521 | Keep green border; background orange instead of green on table AND order cards (same colour coding). Exact orange: design agent decides, shown at impact. Code: TableCard.jsx L287-288, OrderCard.jsx L460 (`COLORS.billPrintedBg`). |
| CR-523 | Link customer to placed order without Update/Complete; saved immediately on pop-up save; works after bill print. Change existing customer → if possible, check at impact. |

## Moved to P1
CR-518, CR-516, CR-437, CR-404.

## Still open
- CR-376-FU-C priority — not answered.
- 667-02 (screen confirmation) — impact to confirm.

## Not in scope this round
CR-441 (P3), BUG-594 (P2), CR-439 (P2), BUG-609 (P2).

## Impact order
BUG-667 → BUG-669 → BUG-673 → CR-525 then CR-521 (shared card files, sequential) → CR-523.
