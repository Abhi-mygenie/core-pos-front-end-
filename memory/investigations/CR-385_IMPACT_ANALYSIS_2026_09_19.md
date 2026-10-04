# CR-385 Front Desk — Impact Analysis: design v2.26 → existing React implementation

```
Role:         PLANNING (ALPHA v0.7) · Stage: Impact Analysis (Gate 2 re-baseline against design v2.26) · READ-ONLY
Date:         2026-09-19
Input:        handover/SESSION_HANDOVER_2026_06_CR385_V2_26_TO_IMPACT_ANALYSIS.md (§1 sources, §4 checklist, §7 template)
Design:       public/cr385-frontdesk-mockup.html v2.26 · DESIGN_DECISIONS D1–D45 (D44/D45 binding) · ACCEPTANCE_CRITERIA AC-01…AC-20 (+F)
Proof:        test_reports/iteration_26.json (pre-fix audit) · iteration_27.json (post-fix, 24/27) · 3 self-verified follow-ups
Code reality: PARTIAL — every design surface has an implementation under CR-358 P1–P5 / CR-162/163/362/364 / BUG-38x–43x,
              but as separate PAGES + MODALS, built before D44 rules existed. 0 lines of `frontdesk/` workstation code exist.
Conflict pre-check: 21 registry items touching the same files are NOT CLOSED (GATE_5A/5B, awaiting owner smoke) — see §7.
Risk:         CRITICAL (money: booking charge, GST split/base, partial payment, refund arithmetic; hotspot CollectPaymentPanel 3,331 L)
Supersedes:   impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md is retained as history (file plan / Rev 3.x decisions). This document
              is the gap register against the FINAL v2.26 design; Rev 3.x line estimates are NOT re-validated here.
Files changed by this session: this file · handover/SESSION_HANDOVER_2026_09_19_CR385_IMPACT_ANALYSIS.md · PRD.md (entry) ·
              test_reports/iteration_26.json + iteration_27.json restored from the repo clone (proof files were missing from /app).
```

---

## 1. Executive summary

1. **Fit:** the implementation covers ~70 % of the design's *operations* (check-in, checkout, extend, modify, cancel, no-show, room board, KPIs) but only ~25 % of its *rules*. It is a set of 9 pages + 5 modals; the design is one 4-tab workstation with expand-in-place — the architectural gap is total (§6).
2. **Biggest gaps (money):** booking charge is typed/recomputed client-side on 4 screens (AC-01 ✗); "Balance" columns show the booking amount, not the bill (AC-02 ✗); CGST is listed before SGST in Check-In and in the panel's item block, and the folio shows one merged "Lodging GST" line (AC-04 ✗); partial payment is blocked and there is no Outstanding/Credit-to-folio state (AC-08 ✗); no refund/penalty maths at all on No-Show/Cancel (AC-05 — BACKEND GAP).
3. **Latent P0 found in code:** `ModifyBookingDialog.jsx` L31–35 reads `rp.rates?.[checkin] ?? rp.rate` on rate-plan objects that only have `{roomCode, rateplanCode}` → per-night = ₹0 → `amount_after_tax: 0` is PATCHed on every modification when the property has rate plans (same class as BUG-402, which fixed only ExtendStay). Needs INTAKE as a BUG now, independent of CR-385.
4. **Effort band:** **L / XL** — P0 money integrity ≈ 2–3 sprints incl. backend contract; workstation shell (P2) ≈ 3,000–3,400 new FE lines per Rev 3.1 file plan (unchanged); backend needs 6 fields/2 endpoints (§5).
5. **Decisions needed from owner:** 9 (§9) — chiefly: tabs-vs-pages cut-over strategy, where the booking charge is computed (backend vs FE), partial-payment/credit policy on room checkout, non-OTA no-show (BQ-385-04), and whether Check-In upgrades / auto-print / booking advance are Phase 1.

---

## 2. Proof / validation check (§4A)

| # | Check | Result | Evidence |
|---|---|---|---|
| A1 | Mockup `<title>` says v2.26 and `VERSION='v2.26'` | **PASS** | grep `<title>CR-385 · Front Desk Workstation (Beta) — Mockup v2.26`; `VERSION='v2.26'`; runtime `VERSION` = `v2.26` |
| A2 | `iteration_26.json` = pre-fix audit of v2.25 (read-only, 0 console errors) | **PASS** | summary field; 31 QA findings basis |
| A3 | `iteration_27.json` = post-fix verification of v2.26, 24/27 | **PASS** | `success_rate.frontend = "24/27 QA items PASS (89%)"` |
| A4 | Post-27 fix 1 — Check-In "✕ Close" | **PASS** | `checkin-close-button … >✕ Close` (source + runtime) |
| A5 | Post-27 fix 2 — `Math.max(0,f.balanceRemaining)` clamp | **PASS** | 2 occurrences (extend + modify) |
| A6 | Post-27 fix 3 — `noshow-close-button` / `cancel-close-button` | **PASS** | both present; runtime `noshow-close-button = "✕ Close"` |
| A7 | iteration_27 P1 "prepaid ₹9,450 ≠ ₹9,000" | **RESOLVED BY DECISION, not a defect** | D44-g: prepaid/OTA = total **incl. GST** → ₹9,450 / refund ₹4,725 is the intended value. Testing agent's "expected ₹9,000" pre-dates D44-g. |
| A8 | Proof files present in `/app/test_reports` | **FAIL → fixed** | Files were missing from the pulled tree; restored from `/tmp/pos-repo-fresh/test_reports/`. **Design-build defect (process):** the mockup QA evidence is not committed with the repo — recommend committing `test_reports/iteration_26/27.json` or copying them to `memory/evidence/CR-385/`. |
| A9 | Owner visual acceptance | **PENDING** (PRD L366) | Design is agent-tested only. Every gap below is against an owner-unaccepted design — flagged. |

## 3. Design self-consistency (§4B) — walked at 1366×768 with hooks

| Rule | Hook | Observed in mockup | Verdict |
|---|---|---|---|
| AC-12 / D44-h leaving-today excludes overdue; tab number = list count | strip | Departures `4 · 4 today · 0 overdue`; In-House `4 leaving today`; Departures "Today 4" chip | ✅ |
| AC-05 / D44-b refund = prepaid − penalty − GST on penalty, "Total deducted" | `?open=ans:noshow` | ₹9,450 − ₹4,500 − ₹112.50 − ₹112.50 = deducted ₹4,725 → refund ₹4,725 | ✅ |
| AC-08 / D44-c Amount received + Credit tile + Outstanding | `?bill=102` | `Amount received` input (default ₹3,785), tiles Cash/Card/UPI/Credit, "₹3,785 received · Settled" | ✅ |
| AC-04 SGST → CGST separate | Room section (collapsed by default) | verified iteration_27 (`SGST listed FIRST`) | ✅ (by proof) |
| AC-19 no right-pane scroll at 1366×768 | `?bill=102`, `?checkin=a2` | bill settlement 258/258; Check-In right pane 300/300 (left 674/427 scrolls — allowed) | ✅ |
| AC-17 dismiss "✕ Close" / footer "Close" | all | Bill `✕ Close` + footer `Close`; No-Show `✕ Close` + `Close` | ✅ |
| AC-13 OTA → No-Show only / non-OTA → Cancel only | `?room=223`, `?room=119` | Actions live in the tile kebab (closed on load) — not visible to a body-text probe; verified in iteration_22 | ✅ (by proof) |
| D44-i SVG icons, en-IN money, `fd()` dates | bill | `−₹112.50`, `16 Sep`, lucide-style glyphs | ✅ |
| **Design defect** — none found. Notes: (a) mock left nav shows both "Front Desk (Beta)" and "Front Desk" — intended for the beta route (FU-385-A/C parked). (b) The mock's bill "Room" block is collapsed by default (D14) so SGST/CGST are one click away — acceptable. | | | |

Permanent constraints honoured: separate SGST/CGST ✅ · Booking = type only ✅ (D34) · confirmation dialogs for No-Show/Cancel ✅ · never both ✅ · Area = `title` ✅ (D42) · HK crew assignment not in Room Detail ✅ (D41).

---

## 4. Gap register (§4C) — implementation vs design

Status: **P** Present · **Pa** Partial · **M** Missing · **C** Contradicts. Gap type: **FE** · **BE** (backend field/endpoint) · **DEC** (product decision). Effort S < 1 d · M 1–3 d · L > 3 d.

### 4.1 Money (AC-01…AC-05, D44-b/c/g, D15)

| ID | Surface / AC | Rule | Implementation | St | Type | Eff | Risk | Evidence |
|---|---|---|---|---|---|---|---|---|
| G-01 | AC-01 booking charge single source | (type rate + plan supp) × nights from backend; never recomputed | Arrivals/Departures show `row.amount` = `amount_after_tax` (LR). Check-In **editable** `ci-amount` prefilled from `a.amount`; New Booking **typed** `nb-amount`; Modify recomputes `perNight × nights` (and is broken, G-02); Extend `perNight × extraNights` with fallback `amount/nights` | **C** | BE + FE | L | CRITICAL | `CheckInPage.jsx` L180, L803, L315 · `NewBookingPage.jsx` L243, L89 · `ModifyBookingDialog.jsx` L30–35 · `ExtendStayDialog.jsx` L34–47 · `aiosellTransform.js` L148 |
| G-02 | Modify amount | live rate for new dates | `rp.rates?.[checkin] ?? rp.rate ?? 0` on `{roomCode, rateplanCode}` objects → ₹0/night, "Standard Rate", random id; `amountAfterTax: 0` sent | **C (latent P0 bug)** | FE | S | CRITICAL | `ModifyBookingDialog.jsx` L31–37, L56 vs `aiosellTransform.fromRates` L158–191; BUG-402 fixed only `ExtendStayDialog` |
| G-03 | AC-01 amount base mixing | one base (pre-GST) for rate maths | Extend fallback divides `currentPrice` = `row.amount` (**after-tax**) by nights → GST-inclusive per-night added to a pre-tax total | **C** | FE | S | HIGH | `DeparturesPage.jsx` L257 (`currentPrice: Number(row.amount)`), `ExtendStayDialog.jsx` L39–41 |
| G-04 | AC-02 row Balance = bill grand total | Departures/In-House "Balance" = room balance + F&B + transferred, GST-incl. | Departures column **"Balance"** renders booking `amount` (not a balance). In-House balance is correct (3-call folio join). Arrivals column also headed "Balance" (design: "Booking ₹") | **C** (Dep) / **P** (In-House) | FE (+BE for cheap aggregation BQ-385-02) | M | CRITICAL | `DeparturesPage.jsx` L195, L232 · `ArrivalsPage.jsx` L211, L243 · `pmsService.getInHouseGuests` L76–151 |
| G-05 | AC-03 prepaid/pah is a field | same badge everywhere | `pah` read from LR ✅ badge on Arrivals/Departures ✅; **not** shown on Check-In, Bill/Checkout drawer, Folio, Room Detail. BUG-413 says backend is still fixing the `pah` field | **Pa** | FE (+BE BUG-413) | S | MED | `aiosellTransform.js` L203 · `PahBadge` Arrivals L24 / Departures L20 · no `pah` in `CheckInPage`, `PmsCheckoutDrawer`, `GuestFolioPage`, `RoomStatusPage` |
| G-06 | AC-04 SGST then CGST, never merged | two lines, SGST first, en-IN, `−₹X` | Check-In GST block: **CGST first** (L864) then SGST (L868) + a merged "Total GST" line; Folio: **single "Lodging GST"** line (L372); CollectPaymentPanel item GST **CGST first** (L2562/2566) but SGST first at L2283 (inconsistent); No-Show/Cancel: no tax lines at all | **C** | FE (hotspot) | M | HIGH | `CheckInPage.jsx` L864–872 · `GuestFolioPage.jsx` L97–100 (items SGST→CGST ✅) vs L372 · `CollectPaymentPanel.jsx` L2283–2287, L2562–2566 |
| G-07 | AC-05 / D44-b refund arithmetic | Prepaid − penalty − GST(penalty), read-only, "Total deducted", refund-to-guest / bill-credit toggle | `cancelReservation` sends `{reason, cancelled_by, notify_cm}`; `markNoShow` sends `{bookingId, channel}`; responses carry no penalty/GST/refund. Cancel dialog shows a text note "Advance ₹X — refund manually" gated on `target.advance` which **never exists** on `reservationOps` rows (always 0 → note never renders) | **M** | **BE** (+FE) | L | CRITICAL | `pmsService.js` L473–487 · `CancelBookingDialog.jsx` L27, L68–73 · `ArrivalsPage.jsx` L273 (`advance: row.advance ?? 0`) |
| G-08 | D15 Room ledger order | Booking amount → Advance → Balance (pre-GST) → SGST → CGST → Total; other payments deducted | Folio card: Room Price → Lodging GST → Advance → Amount Received → Room Balance (tile). Checkout panel: room balance is a single pass-through number (`roomBalance`, no breakdown) | **Pa** | FE | M | HIGH | `GuestFolioPage.jsx` L369–404 · `CollectPaymentPanel.jsx` L195–202 · `PmsCheckoutDrawer.jsx` L268–284 |
| G-09 | D1 room discount control (disabled until BQ-385-07) | control present, disabled, tooltip | absent | **M** | FE stub + **BE BQ-385-07** | S | LOW | no `roomDiscount` in `CollectPaymentPanel`/drawer |

### 4.2 Validation (AC-06…AC-10, D24, D44-j)

| ID | Surface / AC | Rule | Implementation | St | Type | Eff | Risk | Evidence |
|---|---|---|---|---|---|---|---|---|
| G-10 | AC-06 Extend collect ≤ payable | collect-now field, cap, inline reason | Extend has **no collect-now at all** (add-to-folio only), no discount, no room-conflict check / room move, no SGST/CGST lines | **M** | FE + **BE** (extend-stay endpoint takes only `new_room_price`; no payment, no room move) | L | HIGH | `ExtendStayDialog.jsx` L59–75 · `pmsService.extendStay` L506–514 |
| G-11 | AC-07 Booking/Modify guards | check-in ≥ today, checkout ≥ +1, adults ≥ 1, advance ≤ total, `min` on pickers | New Booking: checkout>checkin ✅, adults ≥ 1 ✅ (blur reset), **no past-date guard** (`nb-checkin` no `min`), advance N/A (no advance field). Modify: checkout>checkin ✅, **no past-date guard, no adults field, reason optional** (design: required). Check-In: `ci-checkin` no `min` | **Pa** | FE | S | MED | `NewBookingPage.jsx` L70, L158–161, no `min` on checkin · `ModifyBookingDialog.jsx` L47, L83, L121 · `CheckInPage.jsx` L674 |
| G-12 | AC-08 / D44-c partial payment, Outstanding, Credit | editable received; Outstanding = grand − received; Credit → received ₹0, receivable recorded; block if received > grand | `CollectPaymentPanel` **aborts cash when received < effectiveTotal** (hard guard L1079–1085) → no partial payment; no "Outstanding" line; Credit/TAB exists in the panel but the room-mode flag set hides Credit (L71/L374); received > grand is treated as change, not blocked | **C** | FE (hotspot, CRITICAL file) + **DEC** (does the hotel allow check-out with outstanding? R6) + **BE** (receivable/credit posting on room checkout) | L | CRITICAL | `CollectPaymentPanel.jsx` L71, L374–380, L771, L1074–1085 |
| G-13 | AC-09 Card/UPI need reference | Txn/UTR required; Cash not | Check-In advance: method pills ✅ (BUG-411) but **no reference field**; Checkout panel: reference handling exists for card/UPI in POS flow (verify in room mode); Extend/Booking: no payment | **Pa** | FE | S | MED | `CheckInPage.jsx` L56–75, L811 (no `utr`/`reference` in file) |
| G-14 | AC-10 two-step, idempotent checkout | arm → confirm, one submit | `isPaying` re-entry guard ✅ (idempotent per session); **no confirm/arm step**; one click checks out | **Pa** | FE | S | HIGH | `PmsCheckoutDrawer.jsx` L128–172 |
| G-15 | D24 no default method when collecting | explicit pick | Check-In: method required when advance > 0 ✅, cleared when advance ≤ 0 ✅ | **P** | — | — | — | `CheckInPage.jsx` L250, L807 |

### 4.3 Business state & counters (AC-11…AC-16)

| ID | Surface / AC | Rule | Implementation | St | Type | Eff | Risk | Evidence |
|---|---|---|---|---|---|---|---|---|
| G-16 | AC-11 no zero-night stay | API rejects; UI never renders | FE guards checkout > checkin on Booking/Check-In/Modify ✅; `buildTapeChart` tolerates `checkout <= checkin` (L398) → data can exist; no API evidence of rejection | **Pa** | **BE** (confirm) | S | LOW | `pmsService.js` L398 |
| G-17 | AC-12 leaving today excludes overdue; KPI = list | `depDueToday` = `checkout === today` ✅, `depOverdue` separate ✅; In-House "Checkout Today" `=== todayStr` ✅ — but `todayStr` is **UTC** (`toISOString`) while ops use `localDate` → off-by-one after 18:30 IST. Front Desk KPI numbers come from `dashboard-kpis` (server) while lists come from LR buckets → can disagree (design: number = list count) | **Pa** | FE (+DEC: server KPI vs list count) | S | MED | `InHouseGuestsPage.jsx` L41 · `CheckInPage.jsx` L14 · `NewBookingPage.jsx` L17 · `FrontDeskPage.jsx` L177–187 vs `pmsService.localDate` L22 |
| G-18 | AC-13 source rule EITHER/OR | OTA → No-Show only; non-OTA → Cancel only; every entry point | Kebab shows **Modify + No-Show (OTA, late/today only) + Cancel for everyone** → OTA rows get both. Two different OTA lists: `['booking.com','gommt']` (Arrivals) vs `['booking.com','goibibo','gommt','makemytrip','expedia','agoda']` (Cancel dialog). No kebab on Room board / search / alerts (surfaces don't exist) | **C** | FE + **DEC/BE BQ-385-04** (non-OTA no-show) | S | HIGH | `ArrivalsPage.jsx` L21, L342–366 · `CancelBookingDialog.jsx` L8 · `pmsService.markNoShowBooking` L469–474 |
| G-19 | AC-14 late arrival full charge + chip | chip "full booking charged" | Check-In has `arrivalsLate` bucket (tab) but **no late chip / policy note** in the form; amount stays whatever `amount_after_tax` says | **M** | FE (+DEC confirm policy) | S | LOW | `CheckInPage.jsx` (no "late" string) |
| G-20 | AC-15 per-folio adjustment state | never leaks between guests | Drawer unmounts panel on close (`detail=null`) → state resets ✅ | **P** | — | — | — | `PmsCheckoutDrawer.jsx` L77–87 |
| G-21 | AC-16 Turns today; Area = `title` | turn chip/filter; grouping Room no./Type/Area | Room board: no grouping, no Area/`title` display, no Turns; `title` is transformed (L13) but unused by the page; tape chart groups by type only | **M** | FE | M | LOW | `roomStatusTransform.js` L13 · `RoomStatusPage.jsx` (no `title`/group) |
| G-22 | F12/D41 Room Detail 4-cell grid + footer actions + HK read-only cell + link to CR-365 | expand tile | Tiles carry inline buttons (HK/OOO/Clean/Check In/View Folio/Book); no detail expansion; `hk_assignee` **not read** by transform; `statusSince` shown ✅ | **Pa** | FE (+ transform field) | M | LOW | `RoomStatusPage.jsx` L243–338 · `roomStatusTransform.js` L6–23 (no `hk_assignee`) |
| G-23 | F7 alert bar (expired stays, overdue ≥ 1 d, HK > 2 h, OOO ≥ 1 d) | max 3 + popover, most-urgent first | Front Desk shows an "overdue" count and a 3-row departures preview; no HK/OOO duration alerts (board `statusSince` available) | **Pa** | FE | M | LOW | `FrontDeskPage.jsx` L126–130, L183 |

### 4.4 Screens & flows (F1–F16, D23–D38, D40)

| ID | Surface | Design | Implementation | St | Type | Eff | Risk | Evidence |
|---|---|---|---|---|---|---|---|---|
| G-24 | F1/F13 one workstation, expand in place, no navigation | 4 tabs, rows expand | 9 routes; every action navigates (`/pms/check-in`, `/pms/folio/:id`, `/pms/in-house` after check-in, `/reports/rooms` fallbacks) | **C** | FE (architecture) | XL | HIGH | `App.js` L259–270 · `navigate(` ×22 across FrontDesk/Arrivals/Departures/InHouse/CheckIn/NewBooking/RoomStatus |
| G-25 | F3 common guest row (Room · Guest · Source · Check-in · Check-out · Guests · ₹ · Status · Action) | one `GuestTable` | three hand-rolled tables with different columns (In-House: Room/Guest/Phone/Check-In/Check-Out/Balance/Actions) | **Pa** | FE | M | LOW | `InHouseGuestsPage.jsx` L120 |
| G-26 | F8 global search (room/guest/phone/booking, grouped) | header | In-House page has a local filter only | **M** | FE | M | LOW | `InHouseGuestsPage.jsx` L19–58 |
| G-27 | F9 header greeting + sync pill + New Booking | — | Front Desk has greeting, Sync Now, New Booking ✅ (navigates) | **P** | — | — | — | `FrontDeskPage.jsx` L145 |
| G-28 | Check-In v2.17: per-adult ID cards (collapsible), upgrade toggle (comp/paid), auto-print (D32), B2B (D33), progress strip, late chip, plural, ref-after-method | expand | Per-adult name + ID + images ✅ (CR-379/380, `GuestDocsSection`); B2B firm name/GST ✅; CRM lookup ✅; **no upgrade flow** (type-mismatch is only a warning), **no auto-print**, **no progress strip**, **no ref field**, navigates away after submit | **Pa** | FE (+BE for paid-upgrade line, print) | L | MED | `CheckInPage.jsx` L250–256, L341, L811–899 |
| G-29 | Booking v2.19: room TYPE × rate-plan grid, optional advance, B2B, Save / Save & check in now | type only | **Picks a specific room** (`restaurantTableId`), amount typed, meal plan written into **notes text**, **no advance** (OD-P2-07), no B2B, "Walk-in · Check In Now" button (design removed it) | **C** | FE + **BE** (`direct-reservation` accepts one `restaurant_table_id`, no `room_code`/`rateplan_code`/advance — BQ-385-06 availability by type+dates) | L | HIGH | `NewBookingPage.jsx` L70–104, L243–264 · `pmsService.createDirectReservation` L196–209 |
| G-30 | Extend v2.19: conflict → room move, discount + reason, collect ≤ payable, "Pending balance · bill" | — | date + reason only (see G-10) | **Pa** | FE + **BE** | L | HIGH | `ExtendStayDialog.jsx` |
| G-31 | Modify v2.21: type grid, change ±, refund pills, reason required | — | dates + broken rate list (G-02), reason optional, no ± delta, no refund mode | **Pa** | FE + **BE** (refund) | M | HIGH | `ModifyBookingDialog.jsx` |
| G-32 | No-Show/Cancel v2.22: money outcome card, config-driven reasons, notify toggle, danger red | dialogs ✅ | Cancel: reasons from `getCancellationReasons` ✅, OTA warning ✅, red ✅; No-Show: remark only, **no money card**, kebab entry **amber** `#D97706` | **Pa** | FE + **BE** (G-07) | M | MED | `NoShowDialog.jsx` · `ArrivalsPage.jsx` L359 |
| G-33 | Bill v2.10 Layout B: left ROOM/F&B/Transferred collapsed sections with totals = right rows; right neutral rows in order F&B → Transferred → Room balance → Grand Total; one payment; Checkout always visible | expansion | Drawer embeds full POS `CollectPaymentPanel` (item list, adjustments, taxes) — right-hand F&B structure exists, but no left statement, no D12 row order, no pinned settle (panel scroll body L1321–3297; only Pay button pinned) | **Pa** | FE (hotspot) | L | HIGH | `PmsCheckoutDrawer.jsx` L260–290 · IA Rev 3.2 source correction |
| G-34 | F14 states: page error + Retry; board failure isolates Rooms; skeleton rows | — | Pages have Retry buttons ✅; no skeletons; board/ops isolation N/A (separate pages) | **Pa** | FE | S | LOW | `DeparturesPage.jsx` L168 |
| G-35 | F16 sortable sticky headers, `↑↓ Enter` | — | none | **M** | FE | S | LOW | — |

### 4.5 Terminology & consistency (AC-17, AC-18, D44-f/i)

| ID | Rule | Implementation | St | Eff | Evidence |
|---|---|---|---|---|---|
| G-36 | "Bill" in UI, "folio" only backend-facing | "View Folio" buttons, "Folio" column, `/pms/folio` page title | **C** | S | `RoomStatusPage.jsx` L281/297 · `DeparturesPage.jsx` L196 · `GuestFolioPage.jsx` |
| G-37 | "Checkout" one word; row button = "Bill" | "Check Out" button (Departures), "Check-Out" column (In-House) | **C** | S | `DeparturesPage.jsx` L252 · `InHouseGuestsPage.jsx` L120 |
| G-38 | "Check-In" noun / "check in" verb | "Check In" button (Room board L306, Arrivals), "Check-In" title ✅, "Walk-in · Check In Now" | **Pa** | S | `RoomStatusPage.jsx` L306 |
| G-39 | dismiss "✕ Close", footer "Close"; "Cancel" reserved for cancelling a booking | Extend/Modify footer secondary = **"Cancel"** next to a booking-cancel workflow; No-Show footer "Cancel / Keep Booking"; Cancel dialog "Keep Booking" | **C** | S | `ExtendStayDialog.jsx` L137 · `ModifyBookingDialog.jsx` L130 · `NoShowDialog.jsx` L109 |
| G-40 | No-Show danger red everywhere | kebab amber | **C** | S | `ArrivalsPage.jsx` L359 |
| G-41 | one date formatter, no ISO on screen | ISO `YYYY-MM-DD` rendered in Extend ("Current Checkout"), Modify subtitle, No-Show "Check-in", In-House checkout column | **C** | S | `ExtendStayDialog.jsx` L89 · `ModifyBookingDialog.jsx` L76 · `NoShowDialog.jsx` L68 · `InHouseGuestsPage.jsx` L164 |
| G-42 | en-IN money, 2 dp when fractional, `−₹X` | `toLocaleString('en-IN')` without fixed dp; negatives never shown | **Pa** | S | throughout |
| G-43 | plurals | `night${n>1?'s':''}` ✅ in Check-In/Booking/Extend; Modify "N nights" unconditional | **Pa** | S | `ModifyBookingDialog.jsx` L110 |
| G-44 | AC-20 a11y: contrast ≥ 4.5:1, focus ring, ≥ 32 px targets, SVG icons | lucide icons ✅; `#888` muted text on white (~3.5:1) widespread; small `p-1.5` icon buttons | **Pa** | M | all PMS pages |

---

## 5. Backend contract gaps (→ BQ-385-xx / new briefs)

| # | Design field / behaviour | Current payload | Proposal | Linked |
|---|---|---|---|---|
| B-1 | **Booking charge** (total, pre-GST) + **rate-plan code/supplement** on every reservation | LR gives `amount_after_tax` only; `rateplan_code` per room line | LR row: `booking_charge`, `gst_amount`, `rateplan_code`, `rate_per_night` — FE displays, never recomputes (AC-01) | new BQ-385-08 |
| B-2 | **prepaid / advance** amount on the reservation | `pah` boolean (BUG-413 in progress); `advance_payment` unread/non-authoritative | LR row: `prepaid_amount` (GST-incl. per D44-g), `advance_payment` reliable | BUG-413, BQ-385-03 |
| B-3 | **No-Show / Cancel outcome**: penalty, SGST/CGST on penalty, refund due, refund mode | none | `GET /local-reservations/{id}/cancellation-preview` → `{prepaid, penalty, penalty_sgst, penalty_cgst, refund_due}`; `cancel`/`no-show` accept `refund_mode` | new BQ-385-09 · BQ-385-04 (non-OTA no-show) |
| B-4 | **Partial payment / Credit on room checkout** | `order-bill-payment` expects full cash | accept `amount_received < grand_total` with `outstanding` + `credit_customer_id`; or reject → DEC | new BQ-385-10 |
| B-5 | **Extend Stay**: collect-now, discount + reason, room move | `{order_id,new_checkout_date,new_room_price,reason}` | add `payment {amount, method, reference}`, `discount {type,value,reason}`, `new_restaurant_table_id` | new BQ-385-11 |
| B-6 | **Booking by room type + dates**, availability count per type, optional advance, B2B | `direct-reservation` = one `restaurant_table_id`, `order_amount`, no advance | accept `room_code + rateplan_code + rooms_count`, `advance {amount,method,reference}`, `firm_name/firm_gst`; availability endpoint by date range | **BQ-385-06** (P1, addendum sent), OD-P2-07 |
| B-7 | Room board `hk_assignee`, `guest.phone/email` | present in payload (D42) — transform drops `hk_assignee`, `guest.phone/email` | FE-only: extend `roomStatusTransform` (transform edit, OD-385-12 exception needed) | — |
| B-8 | KPI = list count / aggregation (Tomorrow, turns, yesterday trend) | `dashboard-kpis` server counts | keep server KPIs but expose the same buckets, or FE derives all from LR (DEC) | BQ-385-02 |
| B-9 | Room-level discount at checkout | none | `room_discount {type,value,reason}` on bill payment | **BQ-385-07** (brief pending) |
| B-10 | Sockets / push | none | — | BQ-385-01 (P1, unchanged) |

Status of open backend questions (grep `BQ-385` 2026-09-19): **none answered** since intake; BQ-385-07 brief still not written (`backend_briefs/` has CR-385 brief + 1 addendum only).

---

## 6. Architecture note — tabs vs pages

| Option | What | Effort | Risk | Notes |
|---|---|---|---|---|
| **A. New workstation route, old pages kept (Rev 3.1 plan)** | `/pms/front-desk-v2` + `components/pms/frontdesk/*` (13 files ≈ 3,380 L), `inline` prop on 4 dialogs, real `CollectPaymentPanel` in 560 px box; old pages untouched until FU-385-C cut-over | XL (≈ 4–5 sprints incl. P0 money) | HIGH — 7 copied sources drift (R21); money paths copied twice (R12); D5 spike still required | Recommended if the owner wants a beta side-by-side. Rev 3.1 file plan stays valid; **but** D14/D15 Bill layout and the D44 rules add ≈ +400 L to `CheckOutExpansion` and a FE `money.js` helper. |
| **B. Restyle pages in place** | Keep routes; apply D44 rules (money, guards, labels) to existing pages/dialogs; no tabs | L (≈ 2 sprints) | MED — touches 9 live pages + hotspot panel; no expand-in-place (violates F1/F13/OD-385-03) | Delivers P0/P1 value fastest; does **not** deliver the design. Only acceptable as an interim phase. |
| **C. Hybrid (recommended)** | Phase P0/P1 = Option B on the shared *services/dialogs* (rules live in `pmsService`/dialogs, reused by both), then Phase P2 = Option A shell consuming the already-fixed pieces | L + L | MED | Avoids copying money paths twice: fix them once in the shared dialogs/services before the shell embeds them. Cuts R12/R21 exposure. |

Quantification of the shell gap (unchanged from Rev 3.1): 13 new files, 3 + ~20 existing lines, 7 copied sources; **plus** design additions since Rev 3.1 that the plan does not yet size: Room×plan grid + advance + B2B on Booking (D34–D36), Check-In upgrades/auto-print/progress (D23, D29–D33), Extend/Modify inline forms replacing the small dialogs (D38, v2.21), No-Show/Cancel money card (D40), Room Detail + Area/Turns (D41/D42), alert popover (D37).

---

## 7. Blast radius & conflicts

- **Shared hotspot:** `CollectPaymentPanel.jsx` (3,331 L, R5 CRITICAL) — used by POS dine-in/takeaway/delivery, GST/VAT invoice, coupons, loyalty, split bill, Credit/TAB. Any AC-08 (partial payment) or AC-04 (tax row order) change here regresses the restaurant flow → owner approval + full E2E regression. Prefer wrapper-level or `isRoom`-gated props.
- **Shared services:** `pmsService.js` (560 L) feeds Tape Chart, Night Audit, Revenue Dashboard, Reservations page, Folio; `aiosellTransform.fromPendingArrival` is explicitly "NOT modified — CheckInPage depends on it" (L194).
- **Printing:** `printOrder` (drawer L120) shared with `OrderEntry`; CR-364-PRINT (Print Folio) still disabled (`GuestFolioPage` L424).
- **HK module:** CR-365 (unblocked, Gate 2 pending) owns crew assignment; Room Detail must stay read-only + link.
- **CRM:** Check-In creates/updates CRM customers and uploads documents (`CheckInPage` L277–339) — non-blocking today; the workstation must keep that contract.
- **Files > 700 L:** `CheckInPage.jsx` 910, `CollectPaymentPanel.jsx` 3,331 — refactor risk; `CheckInPage` is also targeted by BUG-410/411 (GATE_5A, unverified) and CR-382/384 (parked/backend-blocked).
- **Open registry items on the same files (not CLOSED):** BUG-402 (ExtendStayDialog, 5A), BUG-410/411 (CheckInPage, 5A), BUG-418 (Drawer + panel, Gate 2), BUG-421/426/429/430 (pmsService, 5A), BUG-423/427 (Folio, 5A), BUG-425 (Drawer, 5A), BUG-428 (panel, 5A), BUG-404 (NewBooking, Gate 1), BUG-413 (Arrivals pah, backend), CR-367/384 (backend-blocked), CR-368 (Gate 2, roomStatusTransform). **Execution order:** CR-385 implementation must start AFTER BUG-402/410/411/421–430 reach Gate 6 (or declare parallel-safe per file at Gate 3).

---

## 8. Recommended implementation phases

| Phase | Scope | AC / decisions | Regression groups (QA audit §H) | Gate |
|---|---|---|---|---|
| **P0 — Money integrity** | G-02 (Modify ₹0 bug — file as BUG now), G-01/G-03 booking-charge single source (B-1), G-04 Departures Balance, G-06 SGST→CGST order + folio split, G-07 refund preview (B-3), G-08 D15 ledger | AC-01–AC-05; DEC-1, DEC-2 | H1 money integrity, H2 bill reconciles, H8 refund maths, H9 seed sanity | owner approval (CRITICAL) |
| **P1 — Validation & source rule** | G-11 guards (`min`, past date, reason required), G-12 partial payment/Outstanding/Credit (B-4, DEC-3), G-13 reference fields, G-14 two-step checkout, G-17 UTC→local date, G-18 EITHER/OR + one OTA list (BQ-385-04, DEC-4), G-19 late chip | AC-06–AC-14 | H3 bill controls, H4 extend, H5 modify, H6 booking, H8 source rule, H10 KPI reconciliation | Gate 3 plan + Gate 4 GO |
| **P2 — Workstation shell** | Option C shell: tabs, `GuestTable`/`ExpandableRow`, Check-In/Booking/Bill expansions, `inline` prop on dialogs, Room board grouping/Turns/Detail (G-21–G-35), alerts/search | F1–F16, D1–D42; D5 spike first | H7 check-in, H11 rooms ops, H13 responsive, H3 bill | Gate 3 spike → plan → GO |
| **P3 — Consistency & a11y** | G-36–G-44 glossary, dates, money format, plurals, colours, contrast, focus, ≥ 32 px targets | AC-17–AC-20 | H12 consistency sweep, H14 keyboard/a11y | LOW/MED |

Evidence per release: QA_TEST_PLAN §6 + audit §H at 1920×800 and 1366×768, Safari + Edge manual, 0 console errors (AC-F).

---

## 9. Open questions for the owner

| # | Question | Why it blocks |
|---|---|---|
| DEC-1 | Where is the booking charge computed — backend on the reservation (B-1, recommended) or FE from rates × nights? | AC-01; determines whether P0 waits for backend |
| DEC-2 | Refund/penalty policy source: backend preview endpoint (B-3) or "backend cancels, FE shows nothing" until it exists? | AC-05; No-Show/Cancel money card |
| DEC-3 | May a guest check out with an outstanding balance (partial pay / Credit to company)? If yes, who is the receivable owner (CRM customer / company)? | AC-08 touches CollectPaymentPanel (R6) + backend |
| DEC-4 | Non-OTA no-show (BQ-385-04): still Cancel-only, or ask backend for no-show on all channels? | AC-13 |
| DEC-5 | Cut-over strategy: Option A (beta route side-by-side), B (restyle pages), or **C (hybrid, recommended)**? | §6; sizes P2 |
| DEC-6 | Are Check-In paid/complimentary upgrades (D23), auto-print (D32) and booking-time advance (D34) Phase 1 for the real build? Each needs backend fields. | G-28/G-29 |
| DEC-7 | KPI numbers: server `dashboard-kpis` or list counts (AC-12 "number = list count")? | G-17 |
| DEC-8 | Approve filing the Modify ₹0 rate bug (G-02) as a P0 BUG for immediate fix outside CR-385? | Live money defect today |
| DEC-9 | Owner visual acceptance of mockup v2.26 (PRD: pending) — accept, or list changes before Gate 3? | Everything above is measured against an unaccepted design |

---

## 10. Retroactive / process findings
- Proof files (`iteration_26/27.json`) were not in the repo tree → restored; recommend committing under `memory/evidence/CR-385/` (A8).
- `MIRROR`/copy plan of Rev 3.1 must be re-sized after DEC-5/DEC-6 (IA Rev 3.2 consolidation still pending, as noted in REV3 §7).
- No registry/gate advance made by this session (ALPHA R4). Registry CR-385 remains "Gate 2.6 OPEN".

---

## 11. Owner answers — 2026-09-19 (binding; recorded as D46 in DESIGN_DECISIONS)

| # | Owner answer | Consequence for the plan |
|---|---|---|
| DEC-1 | **Backend will provide the aggregation point** (booking charge on the reservation). | B-1 confirmed as a backend deliverable. FE never recomputes; Check-In amount box becomes read-only; Modify/Extend show backend-returned figures. P0 money work is gated on B-1 landing. |
| DEC-2 | **OTA no-show → refund is processed by the OTA.** **Cancel → booking is cancelled; refund happens offline in Phase 1.** Refund processing = **Phase 2**. | B-2 (refund preview endpoint) moves to Phase 2. Phase 1 No-Show/Cancel cards show prepaid (if known) + a fixed note ("Refund handled by <OTA>" / "Refund to be settled offline"); no penalty/GST/refund arithmetic in Phase 1. Mockup D40 money card is Phase 2 (mockup unchanged; AC-05 re-scoped). |
| DEC-3 | **No** — a guest cannot check out with an outstanding balance. Balance may be **put on Credit** (Credit is a configured payment method; tile appears only when enabled), then checkout. | AC-08 refined: partial cash/card/UPI **stays blocked** (current panel behaviour is correct); "Outstanding" line is informational; Checkout enabled only when received = grand total OR remainder is assigned to Credit. B-3 shrinks to "Credit posting on room checkout uses the existing credit method contract" — verify, likely no new backend. Hotspot edit in CollectPaymentPanel is limited to un-hiding the Credit tile in room mode (BUG-418-adjacent). |
| DEC-4 | **(a)** Non-OTA = Cancel only. | Fix kebab EITHER/OR + one OTA channel list. BQ-385-04 closed as "no backend change". |
| DEC-5 | **Option A** — new workstation route side-by-side; old pages become dead code and are **removed later** (FU-385-C). Planning: **tab-wise / module-wise**, sequence to be proposed after the impact gate. | Rev 3.1 file plan stays the base. Proposed sequence (for Gate 3): M0 shared money/format layer → M1 Arrivals tab (rows + Check-In expansion) → M2 Departures tab (Bill expansion, Credit) → M3 In-House tab (Extend / Modify inline) → M4 Rooms tab (board, Area, Detail) → M5 header/search/alerts → M6 dead-code removal. |
| DEC-6 | **All three in Phase 1**: room upgrade (D23), auto-print (D32), advance at booking (D34). | Blockers listed in §12 below. |
| DEC-7 | **Server-authoritative snapshot** — server returns list + counts + business date together; FE displays only. | BQ-385-12 rewritten; G-17 becomes 'remove client date logic'; AC-12 re-worded (D46-i). |
| DEC-8 | Verified by live probe (§15): latent, not live; P0 intake withdrawn. | Covered by BQ-385-08; dead rate code removed in M3. |
| DEC-9 | **Mockup v2.26 accepted.** | Gap register is now measured against a signed design. PRD "owner visual acceptance pending" → accepted 2026-09-19. |

## 12. DEC-6 blockers (all three extras in Phase 1)

| Extra | What backend must add | What FE must add | Blocks until |
|---|---|---|---|
| **Room upgrade at Check-In (D23)** | `pms/check-in` accepts `upgrade: {type: 'complimentary'|'paid', amount, reason}`; when paid, the **aggregated booking charge (DEC-1) must include the upgrade line** so every screen agrees; complimentary stores the flag only. Today type-mismatch is a warning and any room of any type is accepted at the booked price. | Upgrade toggle + paid amount + reason; balance strip updates from backend response. | B-1 spec includes `upgrade_amount` — one brief, not two. |
| **Auto-print check-in receipt (D32)** | A business setting `auto_print_checkin_receipt` (or reuse CR-133 printer-agent config keys) and a receipt payload (guest, room, dates, charge, advance, balance, GST no.). Today `printOrder` prints an *order bill*, not a check-in slip. | Receipt template + print on success when setting is on; manual "Print receipt" button always. | Settings key + payload agreed; printer-agent path (CR-133) confirmed available on preprod. |
| **Advance at booking (D34)** | `aiosell/direct-reservation` accepts `advance_payment {amount, method, reference}` and the LR row returns `advance_payment` reliably (today OD-P2-07 "never sends advance"; `advance_payment` on LR is not authoritative — Data Inventory). | Optional advance block (Cash/Card/UPI + Txn/UTR when not cash), "advance ≤ total" guard, badge on row. | Backend field + LR read-back (ties to B-1/B-2 prepaid field). |

## 13. Pending: DEC-7 (KPI source) and DEC-8 (Modify ₹0 bug) — owner walk-through delivered in chat; awaiting yes/no.

## 14. DEC-8 correction after owner-requested verification (2026-09-19)

**Verified by tracing the callers + stored API evidence (no token available for a live PATCH; `memory/test_credentials.md` is empty):**

| Check | Result |
|---|---|
| Who opens `ModifyBookingDialog`? | `ArrivalsPage.jsx` L323 and `ReservationsPage.jsx` L249 — **neither passes `rateplans`** → prop defaults to `[]`. |
| Effect | `rates` list is empty → `selectedRate` = null → `amountAfterTax: undefined` → `modifyReservation` **omits `amount_after_tax`** (L495). **₹0 is NOT sent today.** |
| Real shape of rate data (`evidence/INV-PMS-ENH/probe_09_fetch_rates.json`, preprod `fetch-rates`) | `{roomCode, rate, rateplanCode}` per date — a `rate` **does** exist per row, but `fromRates()` collapses it to `{roomCode, rateplanCode}`; the dialog's lookup `rp.rates?.[checkin] ?? rp.rate` would still read 0 if wired. |
| Backend contract (`BACKEND_BRIEF_CR362_CR365_2026_09_11.md` Endpoint 2) | `PATCH local-reservations/{id} { checkin?, checkout?, amount_after_tax?, reason }` — amount is optional and **nothing states the backend recomputes it when dates change**. |

**Re-classification of G-02:**
- ❌ *Not* a live "₹0 written" bug → withdrawn as P0 intake. My earlier "live P0" statement was wrong; apologies.
- ✅ **Latent** defect: the moment anyone wires `rateplans` (the CR-385 Modify inline form intends to show a type × plan grid), ₹0 goes out. Must be removed/rewritten in M3, not reused.
- ✅ **Live gap (G-02b, HIGH):** Modify Booking changes dates but **never updates the amount** — a 3-night booking modified to 5 nights keeps the 3-night `amount_after_tax` unless the backend silently recomputes (unconfirmed; needs one PATCH probe on a disposable preprod booking). Resolution is already decided: **DEC-1 / BQ-385-08 rule 1 — backend recomputes `charge.*` on every PATCH; FE sends dates only.**

**Open probe (needs a preprod token):** create a throw-away direct reservation → PATCH `checkout +2 days` with no `amount_after_tax` → GET row → does `amount_after_tax` change? Result decides whether G-02b is FE-only or also a backend gap (it is covered by BQ-385-08 either way).

## 15. Live probe results (owner-authorised, 2026-09-19) — closes the open probe in §14

Full table: `evidence/CR-385/probes_2026_09_19/PROBE_REPORT.md`. Disposable booking 145 created → modified → cancelled.

| Finding | Result | Register impact |
|---|---|---|
| Modify (dates only, no amount) — what the app sends today | 2 → 4 nights, `amount_after_tax` unchanged at 6000 | **G-02b confirmed on both sides**: FE sends nothing, backend does not recompute. Covered by BQ-385-08 rule 1. |
| `amount_after_tax: 0` PATCH | 200, stored as 0.00; `balance_payment` stays 6000 | Backend has **no validation** on amount and `balance_payment` is not derived → BQ-385-03 confirmed. Latent Modify rate code must be deleted in M3. |
| `rooms[].rateplan_code` change via PATCH | ignored (stays null) | Modify-by-plan needs a backend change (BQ-385-08 Q3). |
| `?preview=true` | ignored — real write | No dry-run today (BQ-385-08 Q3). |
| `mark-no-show` Direct | 422 "only booking.com and gommt" | Fact behind D46-d. |
| Cancel response | no refund/penalty fields | B-2 / BQ-385-13 Phase 2 confirmed. |
| LR row has `amount_before_tax` (unread by FE); folio `gst_tax` merged single value | — | AC-04 split is a backend field ask (BQ-385-08 rule 2), not only FE ordering. |
| `dashboard-kpis` returns `as_of_date` and requires `start_date/end_date` | server "today" exists | BQ-385-12 can reuse `as_of_date`; today's server `departures_count 2` to be reconciled against list buckets at Gate 3. |
| Room board `title` values: ground floor · first  floor · 2nd floor · 3rd floor · patal lok; `hk_assignee` present, all null | — | Owner's real section list captured (D42); double-space normalisation required. |
| Settings: `printer_agent: No`, `pay_tab: Yes`, no auto-print key | — | BQ-385-11 key missing; Credit/TAB exists for D46-c. |

Credentials stored in `memory/test_credentials.md` (owner-provided).

## 16. Correction — G-12 / B-8 (owner clarification 2026-09-19, D46-j)
- "Partial payment" in owner vocabulary = **split tender** (multi-method, full amount). Code: available today on room checkout (`CollectPaymentPanel` Row 2 Split / Credit-TAB / More renders because `PmsCheckoutDrawer` omits `allowedMethods`, D4). **Design v2.26 lacks a Split tile → new design gap G-45 (FE/design, S): add Split rows to Bill settlement in v2.27.**
- Under-payment (received < total) stays blocked (D46-c). Credit allowed and already visible — my earlier "Credit hidden in room mode" statement was wrong (hide is Hold-context only).
- B-8 re-scoped: no partial-payment or Credit un-hide edit. Remaining: D5 spike must prove the panel **with Split rows expanded** fits the 560 px Bill expansion at 1366×768; any panel edit → full POS regression.

## 17. Gate status — 2026-09-19 (end of day)
- **Gate 2.5 (design)**: mockup v2.27 done (D47-a…h): Split tile everywhere money is taken (Bill + 4 advance points, shared `payPills/payMissing`), no under-payment at settlement, Credit = TAB plain tile, disabled-state reasons, Phase-2 ribbon on refund arithmetic, real Area titles. Self-verified (QA_TEST_PLAN §6b + §6c). **Owner visual acceptance of v2.27 pending.** New design gap **G-45 closed** by v2.27.
- **Gate 2.6 (impact analysis)**: **analysis complete — BUILD BLOCKED.** Waiting on backend replies in `BACKEND_BRIEF_CR-385_MASTER.md` §1 tracker (B-1 BQ-385-08/09/03 · B-3 BQ-385-15 · B-4 BQ-385-14 · B-5 BQ-385-10/06 · B-6 BQ-385-11/12 · BQ-385-01). Process blockers unchanged: B-7 (21 GATE_5A items on shared files), B-8 (D5 spike), B-9 (owner has not said "close").
- **Register deltas from v2.27**: G-12 → Split rows now also required at Check-In / Booking / Extend / Modify collect points (FE-only, S each); G-13 unchanged (real Check-In has no reference field); AC-08 rewritten.
- **Next session**: (1) owner visual acceptance v2.27 → run testing-agent QA audit across all four tabs; (2) when backend answers land → flip MASTER §1 statuses, re-check matrix in `/cr385-impact-questions.html` §B; (3) owner says "close Gate 2.6 — build blocked" → Gate 3 spike + module plan.

## 18. Backend reply processed — 2026-09-20 (blocker re-assessment)
Reply: `evidence/CR-385/backend_replies/384plan_2026_09_19.md` · verification: `evidence/CR-385/probes_2026_09_20/PROBE_REPORT.md`.

| Blocker | Before | Now | Evidence |
|---|---|---|---|
| **B-1** charge{} | BLOCKED | **UNBLOCKED** — BQ-385-08 verified (charge on 55/55 rows, preview, FE amount ignored, recompute, rateplan change); BQ-385-09 upgrade shipped but unverified | W1a/1b/1c |
| **B-2** refund preview | Phase 2 | Phase 2 (unchanged) | — |
| **B-3** Credit/TAB | open | **ANSWERED** — `payment_mode:'TAB'`, receivable by phone/email; verify at Gate 5 | reply §6c |
| **B-4** extend-stay | BLOCKED | **DELIVERED · unverified** — needs disposable in-house stay (N5) | reply §Wave 5 |
| **B-5** booking by type + advance + availability | BLOCKED | **UNBLOCKED** — BQ-385-10 + 06 verified; open N1 (rate source) and N2 (B2B persistence) | W2b, W4 |
| **B-6** settings key + snapshot | BLOCKED | **UNBLOCKED** — BQ-385-12 verified (meta + counts on LR and board); BQ-385-11 read verified | W1a, W3, W6a |
| **B-7** 21 open registry items on shared files | process | **unchanged** — owner smoke still pending; BUG-384 now closable (backend: wrong FE body) | registry |
| **B-8** payment panel in 560 px | risk | **unchanged** — D5 spike still required | — |
| **B-9** Gate 2.6 open | governance | **unchanged** — owner has not said "close" | — |

**Functionality now buildable (per matrix §B of the decisions page):** Arrivals ₹ column & prepaid badge · Check-In read-only amount + GST split + balance strip · Modify with server preview · New Booking type × plan grid + advance + availability guard · Departures Balance from `charge.balance_due` · tab counts + business date on all tabs · Rooms board (after transform update N4) · No-Show/Cancel EITHER/OR · terminology sweep.
**Still gated:** Check-In upgrade (09 unverified), Extend Stay v2.19 (14 unverified), Bill expansion (B-8 spike + BUG-418/425/428 in B-7), Credit tile (15 verify), auto-print toggle write.
**FE contract changes to carry into the Gate 3 plan:** read `charge.*` only (never `amount_after_tax`/`balance_payment`); omit `rate_per_night`/`new_room_price`/`amount_after_tax` on writes; use `preview=true` for Modify; `roomStatusTransform` → `data.rooms` + `data.meta`; tab counts from `data.counts`; today = `meta.business_date`; auto-print flag from profile.

## 19. Owner answers N1–N5 processed — 2026-09-20 (conflicts found)
| # | Answer | Conflict? | Consequence |
|---|---|---|---|
| N1 | server prices when rate omitted | **YES — with backend reality**: omit → `charge` = ₹0 (rates exist: 7,400). | **BQ-385-16 (P0)** opened; B-1 partially re-blocked for **New Booking pricing only** (matrix: New Booking ◐ → ✗ until 16 lands). Everything else on B-1 stays unblocked. |
| N2 | B2B at Check-In | **YES — with design v2.19 (D35 B2B toggle at Booking)** | Mockup **v2.28** removes the toggle from Booking (D48-c); AC-07 text; BQ-385-10 B2B dropped. |
| N3 | pah for OTA and non-OTA | No | Badge rule D48-b; AC-03 wording. |
| N4 | new board format final | **YES — with the live app** (transform expects a list) | BUG intake needed before backend prod deploy (D48-d). |
| N5 | use any checked-in room | No, but **blocked by sandbox state** (5 overdue in-house stays → all extends 409, no free room) | Backend to check out/reset the 5 stays; BQ-09 / BQ-14 success / BQ-15 verification waits. BQ-14 conflict path verified. N6: TAB curl incomplete vs real contract. |

## 20. End-to-end verification result — 2026-09-20 evening (blocker status reverts partially)
| Blocker | Status now | Why |
|---|---|---|
| **B-1** charge{} | **PARTIALLY RE-BLOCKED** | list/preview/date recompute ✅, but D2 (advance lost at check-in), D3 (folio GST double count), D4 (extend under-charge), BQ-16 (₹0 Direct bookings) are P0 money defects — no money screen may ship against this build |
| **B-4** extend-stay | RE-BLOCKED | D4 pricing wrong; D7 HK state |
| **B-5** booking by type + advance | ✅ create OK · read-back RE-BLOCKED by D2 |
| B-1 upgrade (BQ-09) | RE-BLOCKED | D1 unreachable |
| **B-3** TAB | unverifiable by curl (D6 500/SQL leak) → Gate 5 |
| B-6 snapshot | ✅ unchanged |
**Buildable now (non-money):** tabs/counts/business_date, Rooms board (after transform N4), No-Show/Cancel EITHER/OR, Modify dates with preview, terminology sweep, availability guard. **Everything that shows or computes money waits for D1–D4 + BQ-16 fixes and a re-verification run.**

## 21. Backend build 2 → build 3 — blocker status FINAL for Phase 1 (2026-09-20, ~10:30 and ~13:50)
| Blocker | Status now | Evidence |
|---|---|---|
| **B-1** charge{} incl. upgrade | ✅ **CLOSED** — D1/D2/D3/D5/D9/D10 fixed; upgrade added to rate, GST slab held, advance carried | `evidence/CR-385/probes_2026_09_20_gate4/PROBE_REPORT.md` build-3 |
| **B-3** Credit/TAB | ✅ **CLOSED** — D6/D8 fixed; ledger row = amount sent; `charge.balance_due 0` | same |
| **B-4** extend-stay | ✅ **CLOSED** — D4/D7/D12/D13 fixed | same |
| **B-5** booking by type + advance + pricing | ✅ **CLOSED** — BQ-16 (server pricing, 422 on unknown plan) | same |
| **B-6** snapshot | ✅ unchanged | build 1 |
| B-2 refunds | Phase 2 (DEC-2) | — |
| **B-7** open-bug smoke | ⏳ owner/QA | — |
| **B-8** D5 spike | ⏳ Gate 3 | — |
| **B-9** Gate 2.6 close | ⏳ owner | — |
**Every money surface is now buildable from the backend's side.** Coding rules: DESIGN_DECISIONS D50 (money contract) + AC-22. Open owner questions N7/N8/N9 (OG-PMS-023/024) do not block the plan.
