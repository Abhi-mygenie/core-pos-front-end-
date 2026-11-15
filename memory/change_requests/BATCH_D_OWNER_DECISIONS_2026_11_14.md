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

## Gate 2 — owner answers (round 1)
- **Gate 2 GO** for Batch D, all 6 P0 items (BUG-667, BUG-669, BUG-673, CR-525, CR-521, CR-523). Docs only, no code; ask before any probe.
- **667-02 answered: BOTH places** — (a) sidebar bottom "Name · #ID" line (Sidebar.jsx ~L886-889) AND (b) restaurant name next to the date in the header of the PMS pages (FrontDeskPage, ReservationsPage, RoomStatusPage, …). Both get the 2-line wrap.
- CR-376-FU-C priority: owner asked for an explanation → re-asked in round 2.

## Gate 2 — owner answers (round 2)
- **CR-376-FU-C: keep at P3, not in Batch D.** Stays parked until CR-376 Gate 6 is done and the backend team is ready. This closes the open intake question.

## Gate 2: owner answers (round 3, 2026-11-15)
- **Probes:** ALL probes allowed on a TEST restaurant. Owner gives credentials through the secure secrets window (session-only, never written to docs).
- **OD-669-A:** an empty add-on price box stays EMPTY (no auto-fill 0) and Save is blocked with the message "Enter a price (0 is allowed)".
- **OD-669-B:** owner reports that in Menu Management BOTH zero-priced variations AND zero-priced add-ons cannot be added today. The FE variation row pre-fills "0" and has no FE block, so the variation block is likely on the backend. The probe will confirm. Whether a new variation option should start empty: owner did not choose. Re-ask after the probe if still relevant.
- **OD-673-A:** empty search box → NO item highlighted. Enter does nothing until the user types something or uses the arrow keys.
- **OD-673-B:** after a mouse-click add → search clears and the cursor goes back to the search box (same as Enter).

## Gate 2: owner answers (round 4, 2026-11-15)
- **OD-525-A (stage):** owner: "this configuration will be a setting at outlet level; present scenarios will not change" → agent reading: CR-525 runs behind an outlet-level setting. With the setting OFF, today's cards are unchanged. To be CONFIRMED in R5 (where the setting lives, and which stages count when ON).
- **OD-525-B (rooms):** keep **C/Out** for room cards. No Collect Bill on rooms.
- **OD-525-C (prepaid / delivery):** NO change. Prepaid keeps Settle; delivery keeps Assign / Dispatch / On The Way. Owner asked for the conflict to be explained → explained in R5 intro.
- **OD-523-A (locked orders):** keep it BLOCKED when the order is locked after bill print (CR-489 / BUG-656 stays). Only users with `order_edit_access`, or outlets with the lock OFF, can link or change the customer after print.
- **OD-523-B:** NO automatic bill reprint after a customer link or change.
- Probe status: preprod was unreachable (timeouts) until about R4. Then the login with the secrets-card credentials returned **401 "Invalid credentials"** → re-requested.

## Gate 2: owner answers (round 5, 2026-11-15)
- **OD-525-A CONFIRMED:** CR-525 is controlled by the EXISTING outlet setting **"Lock order after bill print"** (`order_edit_access`, CR-489; FE `restaurant.settings.orderEditAccess`). Setting OFF → cards unchanged from today. No new backend key.
- **OD-525-D (stage):** when ON and the bill is printed → Collect Bill replaces the buttons at **every stage** after print (Preparing / Ready / Served), not only Served. Rooms (C/Out), prepaid (Settle) and delivery rider buttons are excluded (OD-525-B/C).
- Prepaid/delivery conflict explained to the owner: prepaid is already paid (Collect would double-charge), and delivery "On The Way" prints the bill on dispatch (Collect would skip the rider steps). Keeping them unchanged = no conflict.

## Gate 2: owner answers (round 6, 2026-11-15)
- **OD-669-B follow-up:** variation ₹0 not reproduced (FE + backend accept 0 on a new Normal-menu item). **Owner will check** where it fails → OPEN, non-blocking for the add-on fix. Gate 3 for the variation part waits for the owner's steps.
- **Test data:** 2 probe customers on CAFE 103 (TEST_BATCHD_CUST 9999900001 = user 51320, TEST_BATCHD_CUST2 9999900002 = user 51321) can't be deleted from the POS. **Owner will ask the team to remove them.** Test order #021544 (id 1578761) cancelled. Probe add-on 13732 and foods 248233/248234/248235 deleted.
- **OD-523-C:** **allow removing** a customer from a placed order → backend work (brief §2).
- **OD-523-D:** customer save sends the **customer only**. Unsent cart items are NOT sent.
- **OD-525-E:** release order = **wait for the server fix** (bill_print reset on edit) before CR-525 / CR-521 go live.

## Impact order
BUG-667 → BUG-669 → BUG-673 → CR-525 then CR-521 (shared card files, sequential) → CR-523.
