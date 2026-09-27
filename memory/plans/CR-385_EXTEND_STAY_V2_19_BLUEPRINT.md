# CR-385 — Extend Stay design · first-iteration blueprint (PROPOSAL, v2.19)

Status: **BUILT + agent-verified — v2.20 (iterations 17→19, frontend 100%, no bugs).** v2.19 shipped the box; v2.20 reworked the RIGHT panel per owner to show the FULL bill (pending folio balance + extension = Total payable) with a single optional Collect-now block (no settle toggle); Balance remaining = total payable − collected, rest stays on folio. No-scroll invariant restored (363/363). Awaiting owner review.
Gate 2.6 OPEN. Checkout v2.9, Check-In v2.16, Booking v2.18 all LOCKED/untouched. This is the next
expandable box after Booking closed (owner: "go one by one"). Everything MOCKED.

## Owner decisions (ask_human, 2026-06)
- Conflict when the SAME room isn't free for the new dates: **show a conflict warning + auto-suggest
  the first available same-type room (pre-selected) + REQUIRE the room move before Confirm.**
- Settlement: extension charge **adds to the folio by default**, with an **optional collect-advance-
  now** (Cash/Card/UPI + txn) — same advance pattern as Booking.
- Rate: **fixed at the room-type rate; NO raw override.** Any reduction is a **Discount** (kept
  consistent). NOTE: Booking (closed) has no discount field yet — logged as a backlog consistency
  item ("discount across Booking + Extend"); do NOT modify closed Booking without a new request.

## Entry points (existing)
"Extend" button on In-House and Departures rows → `S.open='<id>:extend'`. Object = in-house guest
(id, room, rid, guest, bk, cin, cout, a, c, bal, ch, phone). Room type via `rooms.find(rid).type`,
rate via `CI_RATE[type]`.

## Layout (mini two-column, locked language — LEFT details / RIGHT bill + pinned Confirm)
Expand-in-place. Header: `Extend Stay · Room <n> · <guest> · ✕ Cancel`. LEFT scrolls, RIGHT short.

### LEFT (details)
1. **Current stay** — in/out dates, room + type, occupancy, current folio balance (read-only summary).
2. **New check-out *** — date picker (default current cout +1); extra nights auto in sub-label;
   must be after current check-out.
3. **Room for the new dates** — availability check on the SAME room:
   - Free → green `✓ Room 214 free through 20 Sep`.
   - Conflict → red `⚠ Room 214 has an arrival on 19 Sep — room move required`, with the first free
     same-type room **auto-suggested & pre-selected** (`Suggested: Room 218 · Executive · free`) plus
     a compact same-type-available picker (reuse Check-In D18 pattern) to choose another. Readiness
     blocks Confirm until a free room is selected.
4. **Discount (optional)** — toggle → type (percent / amount / preset) + value + reason. Reduces the
   extension charge. (Rate itself is not editable.)
5. **Reason / notes (optional)** — extension note.

### RIGHT (extension bill + confirm, short/pinned)
- Extra nights × room-type rate = **extension charge** → [− discount, if any] → **SGST + CGST
  separate** → **Extension total**.
- **Settle**: `Add to folio` (default → shows new folio balance) · optional **Collect advance now**
  (collapsed → amount + Cash/Card/UPI pills + Txn/UTR, like Booking advance).
- **Folio after**: room folio balance → new total (minus any advance collected now).
- **Readiness strip**: Date ✓ · Room ✓ (free or moved) [· Discount reason ✓] → green
  **"Ready to extend"** pill.
- Pinned **[Cancel] [Confirm extend]** → applies: updates check-out, adds extension to folio (or
  records the advance), room move if any; toast.

## Guardrails
- MOCKED (rates/GST/availability/discount/payment simulated). Replaces the `kind==='extend'`
  placeholder only. Reuse `.checkin-expansion` language. Closed screens untouched.
- No-scroll RIGHT invariant applies (re-verify when advance / discount expanded).

## Backlog (not now)
- Consistent **discount** treatment across Booking (closed) + Extend + Checkout — revisit with owner
  as a separate change; do not reopen closed Booking unprompted.

## Next
On owner approval → build as v2.19 (replace the extend placeholder), then verify (date→nights→bill
live, same-room availability + conflict→auto-suggest+move, discount, add-to-folio vs collect-advance,
readiness gating, Confirm applies, no-scroll RIGHT, regression on closed screens + cross-tab toggle).
