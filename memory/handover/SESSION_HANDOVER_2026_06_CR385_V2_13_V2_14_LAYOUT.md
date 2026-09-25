# CR-385 — v2.13 shipped + v2.14 layout APPROVED (D28–D29) handover

## Role, gate, approval
PLANNING, Gate 2.6 OPEN. Checkout v2.9 settled/untouched. **Check-In review OPEN; final owner sign-off NOT received. Booking BLOCKED until explicit Check-In closure + Booking authorization (D20).** Multi-room stays Phase 2.

## Timeline of this session
1. v2.12 built (D21–D27): F1 ID thumbnail+lightbox (reuse existing mandatory logic), F2 paid/complimentary upgrades, F3 Cash/Card/UPI pills, F4 compact facts, G1 checkout time + late chip, G3 advance source, G4 OOO count, G5/G6 deferred. Verified iteration_4 (all pass).
2. v2.13 built (D28): owner's 3 consistency fixes — 2-col booking facts, checkout-consistent (non-black) selected pills, bounded columns + pinned Confirm. iteration_5 flagged pinned-Confirm clip at 1920×800 + pill #FAFAFA-on-hover; both fixed in code (viewport-aware `fitCheckin` + reveal-scroll; `.ci-pill:not(.on):hover`). **A quick re-test of v2.13 was not separately re-run because v2.14 restructures the right column anyway — verify as part of v2.14.**
3. v2.14 (D29) **APPROVED, NOT YET BUILT** — this is the next implementation pass.

## D29 / v2.14 — what to build (owner approved Option B + ID auto-collapse)
Mirror the frozen Checkout split (LEFT = details/adjustments, RIGHT = final figures + settle):
- **LEFT (scrolls):** compact 2-col booking facts → **room assignment + upgrade (moved from RIGHT)** → **collapsible per-guest ID cards** (user toggles; auto-collapse when the card's required capture is complete; incomplete stays expanded with a pending marker; collapsed summary = name · ID type · front/back status).
- **RIGHT (short, no internal scroll):** room bill (charge + upgrade line + GST + total + advance + balance) → Collect now + Cash/Card/UPI pills + Txn/UTR → remaining/credit + readiness + **Confirm** (always visible).
- Room/upgrade choice on LEFT updates RIGHT figures live (like checkout adjustments → figures).
- RIGHT no longer needs the D28 bounded-scroll; keep LEFT bounded scroll for many expanded IDs. All MOCKED; mandatory ID logic still reuses existing code (D22); no new backend scope.

## Implementation notes for the builder
- File: `frontend/public/cr385-frontdesk-mockup.html`, Check-In section only. Do NOT touch checkout renderer/CSS/submit, New Booking, other expansions, `src/`, backend, `.env`, registry gates.
- Current Check-In helpers to rework: `checkinForm()` (column composition), `ciRoomSelector()` (move into LEFT), `ciGuestCards()` (add collapse/expand state + auto-collapse-when-complete), `ciFigures()`/bill block stays on RIGHT. `fitCheckin()` can bound only the LEFT column now.
- Add per-adult `collapsed` state to the CI draft (default: collapse when name+front satisfied; user override via a toggle testid e.g. `checkin-adult-toggle-N`). Preserve draft/scroll/focus in `ciRedraw()` as today (it already restores `.ci-pane-body` scrolls).
- Keep all v2.12 data-testids; add ones for the collapse toggles and any moved assignment container.
- After building: verify at 1920×800 and 390×844 that RIGHT shows Confirm with no internal scroll, LEFT scrolls with several IDs expanded, upgrade on LEFT updates RIGHT total live, lightbox still works, and checkout `?bill=107`/`?bill=103` regression unchanged. Then update DESIGN_DECISIONS D29 status to IMPLEMENTED + verification, and this handover.

## Review links (base URL from frontend/.env)
`?checkin=a2` (single), `?checkin=a5` (prepaid/CRM on file), `?checkin=a1` (late + special requests), `?checkin=a2&concept=multi` (Phase 2), checkout regression `?bill=107` / `?bill=103`.

## HARD STOP unchanged
D20 protocol still governs. Accepting D28/D29 or any QA PASS is NOT Check-In closure. After v2.14 is built and reviewed, continue the D20 walkthrough and ask the explicit closure question before any Booking work. Multi-room stays Phase 2. Q6/BQ-385-07/IA Rev 3.2/Gate 3 spike/Gate 4 GO and parked backlog unchanged.
