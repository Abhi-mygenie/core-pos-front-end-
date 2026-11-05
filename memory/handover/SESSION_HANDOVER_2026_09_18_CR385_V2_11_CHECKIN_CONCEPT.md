# CR-385 — v2.11 Check-In correction + multi-room concept handover

## Role, gate and owner approval
PLANNING, Gate2.6 OPEN. Checkout v2.9 settled and untouched. **Check-In v2.11 review is OPEN; final owner sign-off NOT received. Booking design review/edits are BLOCKED until the owner explicitly closes Check-In AND authorizes moving to Booking (D20).** User selected **b**: revised single-room Check-In plus a lightweight multi-room concept for review only. Multi-check-in remains Phase2 by default; owner may reconsider ONLY after reviewing simplicity/feasibility. No combined submit or Phase1 promotion approved.

Latest owner approval was `yes` to updating documentation and this walkthrough/sign-off procedure ONLY. It is NOT approval of the final Check-In design. This handover is the current continuation; older v2.10/June handovers are history.

Latest user corrections: compact read-only facts; IDs on **LHS**, primary name/phone known, additional adults need their name and own ID; assignment/payment must be scoped to the relevant booked room; support40rooms/30vacant without30tiles. Accepted remaining suggestions: capacity consistency, document ownership, prepaid/zero collection, drafts preserved, actual vs booked arrival.

## Implemented v2.11 mockup
Only executable file: `frontend/public/cr385-frontdesk-mockup.html`.
- LEFT: one-label/value-per-row summary, existing booking contact, room count/type, occupancy, booked vs actual stay, requests/billing-to; per-adult cards with known primary name, editable additional name, ID type and simulated front/back capture/replace/preview/remove. Children name/age separate. Primary on-file ID only applies to that person.
- RIGHT: explicit assignment for booked room category, searchable bounded dropdown with all eligible choices accessible; none auto-selected if booking lacked assignment. Matching preassignment preserved; mismatch/blocked selection shown and cannot confirm. Room bill = sample charge + GST - sample already-paid, entered collection, remaining balance or credit. Method required only for nonzero collection. Zero/prepaid examples included.
- MOCKED document/front-required/back-optional and seeded room monetary values explicitly labelled; actual production policy is NOT resolved. No real files, uploads, auth, payments or external API calls. Additional names are local preview edits.
- Local drafts persist through close/reopen and single/multi context switches until page reload. Guest count follows booking; no add/remove-occupant flow invented. Sample required-field readiness and malformed amount checks.
- Normal mock Confirm updates selected room, arrival/in-house demo state and sample balance with entered collection. It no longer applies a hardcoded500 deduction.
- Room-tile Check-In no longer substitutes an arbitrary arrival if no linked non-expired reservation exists; displays a blocked state. Room119 sample has multiple assigned arrival rows and type mismatch; do not silently change category.
-40rooms/30vacant example is a separate catalog snapshot used only in the picker, does not mutate workstation inventory. Confirmation disabled there; returning to normal restores the original assignment.
- Phase2 concept: separate synthetic3room booking (2Deluxe+1Suite). Room switcher swaps per-room guest/assignment/payment drafts and seed bills; third room already checked in/read-only. Same physical room cannot be assigned twice. No combined/per-room submission in concept. Back to single room restores single draft.

## Review links
Read base URL from frontend/.env each session (do not trust historical hosts).
- Single room: `/cr385-frontdesk-mockup.html?checkin=a2` — V. Rao,2adults,room charge2200,tax110,already paid500,balance1810
- Prepaid/CRM: `?checkin=a5` — L.Fernandes,2adults,room charge2200,tax110,paid2310,balance0; primary ID on file, additional adult still needs name/front
- Late multi-night: `?checkin=a1`
- Multi concept: `?checkin=a2&concept=multi` or header Multi-room concept button
-40/30 example: room assignment section -> Try40rooms/30vacant example; use search to reach all matches
- Checkout regression: `?bill=107` total0; `?bill=103` F&B986+transferred741+room950=2677

## Code/source findings (not fixes)
Reviewed source modal screenshots against RoomCheckInModal.jsx and CheckInPage.jsx, pmsService.js. Extra adult ID/name validation, CRM exemption, advance cap and single-vs-multi submission differ between these flows. PMS service serializes one room and adults2..4 slots. Future stay availability isn't guaranteed by current status lookup. Corporate editing and child ID policy remain separate decisions. No backend behavior inferred from this concept; no tax or advance-limit policy changed in production.

## Documents
DESIGN_DECISIONS §G D17-D19 supersedes relevant D16 parts; **§H D20 is the mandatory walkthrough and Check-In-before-Booking sign-off rule**. PRD has the matching current status, IA records the design-only hold (NOT consolidated Rev3.2), FILE_OWNERSHIP records mockup changes, test_result/report3 record existing v2.11 QA, design_guidelines is the visual blueprint. This document is the current next-agent handover. Registries/gates remain unchanged. No executable files changed for D20.

## Verification
PASS — `/app/test_reports/iteration_3.json` (v2.11 frontend-only browser report). Verified single/late/prepaid/CRM, per-adult names/ID states, typing/focus/caret and escaping, searchable eligible list including40/30 example isolation, per-room amount125.50 +UPI -> remaining1684.50, invalid input/method blockers, normal demo confirmation state, room119 and120 linked/missing-booking paths, concept draft switching/deduplication/read-only/non-submit, desktop1920x800/mobile390x844/1024px content, checkout103/107 regression. No reported JS errors or source edits. Main independently confirmed protected hashes and env/registry integrity. Not production QA or owner Check-In freeze.

Report3 narrative arithmetic correction: concept room2 charge3300 has sampleGST165 (82.50+82.50), total3465 and paid500 leaves2965. The report's '55+55' is a prose typo; renderer/data compute165 correctly. Report-linked `/app/tests/cr385_v211_checkin.py` is only a two-line placeholder, NOT a reusable test script; tests were reported as inline browser automation. Future agents must not treat that placeholder as regression coverage. Test-agent hypothetical style/refactor suggestions are not defects or approved scope. No debug hooks/refactors added.
Protected pre-pass hashes:
- checkout-render (function expansion to extend branch):136615dbe2c69c1140cd8ad5a7fcb5bf526300ed5ce254f4b3c3c085793db48e
- checkout-css (v2.9 block to newD17-D19 CSS):df76e397ab8714223849e44f1743ae79bf3db862476ba9990081fb3d08e66b97
- checkout-submit (checkout to extend):42ccd20361aa878f1f62b2d9335384eb5d2a8eb9c47cc0c42e44ce3266557b49
- other expand forms (extend branch to Check-In D17 marker):7876e1e5e99118ab0a62df715b3f7ab2990cf80ac526d4672f11765113ad2b54
- New Booking helpers (roomPicker to actions marker):7e321cae2c45be44951babf504aec5a5341f5fe556eba2a908d0f298f9ae0538
- frontend/src aggregate4daf7cd4e0de443e06f6e4b039530abd103a45a15c95711b9d79870e1def32be
- backend aggregate6d70e9353aec89021f3a5b7625e19baf27f675da903f700cb07e293bec5f7f23
- registry11afc115e23e5db6ce1e6660f2d60e4291ea032aa0c63c83134172dc91970ea6
Check-In demo submission changed intentionally; do not expect its old hash. No auth credentials created/modified.

## Next-agent walkthrough — REQUIRED before Booking

### 0. Establish scope; do not start editing
Read `control/AGENT_PROMPT_ALPHA.md`, PRD's latest D20 entry, DESIGN_DECISIONS §§G/H, this handover and current report3. Choose PLANNING. Inspect the existing HTML/reference sources only as needed, not a new redesign from scratch. Get preview host from frontend/.env. Use the existing app as a MOCKED design review, not real guest data or financial operations.

Suggested opening to owner:
> We are reviewing Check-In v2.11 only. Checkout stays settled. I will walk through one area at a time, summarize your feedback and ask approval before changes. I will not start Booking until you explicitly close Check-In and authorize the move. Shall we start with the compact guest/booking details?

### 1. Compact booking facts (LEFT)
Open `/cr385-frontdesk-mockup.html?checkin=a2` (V. Rao). Point out the one-by-one rows for guest name/phone/email, booking/source, room count/type, occupants, booked stay vs actual check-in, billing-to and special requests. Ask about density, order, wording and missing booking facts. Keep IDs on the LEFT; do not revert to v2.10. Primary identity is already known; do not ask the guest to re-enter it just to collect an ID.

**Feedback checkpoint:** summarize the owner's requested changes and distinguish display order from changes to the underlying booking. No editing until proposal approved.

### 2. Guest identities and documents (LEFT)
Show primary guest #1 and additional adult #2. Demonstrate additional name entry, ID-type choice, front capture, optional back, preview/replace/remove. Make clear capture is simulated. Show the status change when an additional name/front is missing. Changing ID type clears that adult's old captures. Ask about per-guest grouping, name-field size, document affordances and scroll.

Use `?checkin=a5` separately to show a primary CRM ID on file while adult2 still needs their own name and ID. Use `?checkin=a4` if reviewing children (name/age; no newly defined child-ID policy). Occupancy follows the booking; add/remove guests/capacity changes require a separate decision. Existing primary-vs-additional required-document/source inconsistencies are NOT settled by the mockup; record an owner decision or explicitly defer them.

**Feedback checkpoint:** confirm each guest's identity/document ownership is understandable; do not assume a primary CRM document verifies everyone.

### 3. Relevant booked-room assignment (RIGHT)
On a fresh a2 example, show no automatic room assignment. Open the searchable selector, select a matching Deluxe room (229 is a sample choice), and show the selected-room context. Explain category, existing reservation and blocked-state restrictions without claiming a live availability integration.

Open **Try40rooms/30vacant example**:40-room independent catalog,30vacant,10eligibleDeluxe choices. Search/scroll beyond the first6; try an unmatched number. Show that it is not30permanenttiles. Return to current list and show original assignment restored. Example cannot submit and does not change dashboard inventory. If reviewing room-tile entry, Room119 demonstrates linked-booking/category context; Room120 demonstrates missing eligible linked booking and blocks instead of substituting another guest.

**Feedback checkpoint:** ask whether selecting the relevant booked room and its physical room number is clear and whether the large-inventory chooser is compact enough. Real date-overlap assurance remains a dependency, not demonstrated backend support.

### 4. This room's bill and collection (RIGHT)
Use a2: booked room charge2200 +SGST55 +CGST55 =2310; sample already paid500; balance before collection1810. Show Collect now initially0 and method not required. Enter125.50 and UPI -> remaining1684.50. Show prepaid a5 ->0due/0collection, missing method, invalid amount and readiness feedback. Overcollection shows sample credit rather than declaring a new production advance cap.

Ask about bill row order, clarity of prior payments vs collecting now, remaining-balance emphasis and Confirm wording. Explain all allocation/GST/payment data is MOCKED; there is no equal split of a booking-wide payment or approval to change production formulas. In late a1, actual17Sep vsbooked16Sep/remaining2nights must not silently reprice the booked stay.

**Feedback checkpoint:** get the owner's feedback on room scope, zero/partial/prepaid cases and required confirmation details. Do not treat reviewing this screen as payment-rule approval unless explicitly stated.

### 5. Complete the single-room interaction review
Demonstrate readiness before Confirm, name/doc/room/method blockers, close/reopen retaining the draft until reload, and scrolling for additional guests. If the owner wants to see completion, state that Confirm only mutates in-memory demo arrival/room data; show the selected room and collection before clicking. Keep a fresh tab for destructive example checks so an active feedback draft is not lost.

After any approved design revisions, test affected flows and viewport containment (desktop1920x800 and mobile390x844;1024content as relevant), preserve checkout regression and summarize results. Do not re-run a full suite just to collect feedback on unchanged verified v2.11. QA PASS does NOT mean owner visual sign-off.

### 6. Optional multi-room concept — separate decision
Only after the single-room walkthrough, or if the owner explicitly asks earlier, open `?checkin=a2&concept=multi`. Explain Phase2/review-only boundary first. Show3booked-room selectors, independently retained guest/room/payment drafts, room2 seed bill3300+165=3465/paid500/balance2965, prevention of duplicate room assignment, and thirdroom already checked-in/read-only. Confirm stays disabled; no batch action exists.

Ask whether to keep it parked or evaluate Phase1 feasibility. A positive design comment is NOT Phase1 scope approval. Record any explicit promotion request separately with unresolved room-level payment allocations/API/guest-capacity support; do not promise a production multi-room flow because the mockup looks simple. Owner can close single-room Check-In while explicitly deferring multi-room.

### 7. Feedback loop — repeat only for approved changes
For each item, record: owner quote/screenshot -> affected area -> current behaviour -> requested behaviour -> proposed correction -> approval -> implemented mockup version -> verification -> owner response. Use clear states (awaiting clarification / awaiting approval / implemented awaiting review / accepted / deferred). Keep previous decisions as history and append overriding amendments. No auto-edits based on an exploratory question. After approved edits: show the result and ask if that item is resolved.

Do not open a new Booking design discussion while Check-In still has unresolved owner feedback. Do not independently add polish/features or change Checkout. No production src/backend/env, new integrations or registry gate changes.

### 8. Explicit Check-In closure and Booking authorization — HARD STOP
Before moving on, summarize:
- The exact Check-In mockup version reviewed
- Accepted changes and any unresolved or expressly deferred items
- Verification evidence and limits (MOCKED, not production QA)
- Multi-room's phase decision (Phase2 unless explicitly changed)

Then ask:
> Do you explicitly close this Check-In design and authorize us to start the Booking design review?

Wait for an unambiguous statement, for example **"Check-In design closed — proceed to Booking."** Equivalent explicit wording is valid; no magic exact phrase required. Record the owner's exact quote/date/version, deferred scope and verification reference in decisions + PRD + handover. Generic agreement to a proposed edit, optionb approval, `looks good`, automated PASS or `yes` to writing this handover is not closure. If only Check-In closure is granted, ask separately before starting Booking.

**Current state: no closure or Booking authorization received.** Stay on Check-In until both are explicit. Only after approval update review queue to Check-In CLOSED / Booking READY and take Booking requirements/feedback. Screen sign-off does NOT close Hard Gate2.6 or authorize Gate3/Gate4/production work.

## After Check-In is explicitly closed
NewBooking -> Extend/Modify -> Cancel/NoShow -> six room-detail states/MarkAllClean, each reviewed with owner approval. After design: Q6 shared-state feasibility, BQ385-07 brief, IARev3.2, explicitGate2.6 close, Gate3 spike/plan, Gate4GO before production implementation.
Backlog unchanged: FU385-A/C/D/E/F/G/H, BQ385-01..06, CR364-PRINT, transferred-order retirement and eligibility change. Multi-check-in remainsPhase2 concept unless separately approved. This documentation pass leaves HTML v2.11 and all executable code unchanged.
