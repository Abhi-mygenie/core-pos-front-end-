# CR-385 — Design Decisions (Gate 2.5 FREEZE)

```
Frozen:   2026-09-18 — owner: "more or less I am okay with the design … close this gate, start impact analysis"
Amended:  Gate 2.6 — D17–D19 Check-In corrections; D20 mandatory owner walkthrough/sign-off before Booking
Mockup:   frontend/public/cr385-frontdesk-mockup.html · v2.16 — Check-In baseline CLOSED at v2.14 (§J D31), plus owner-requested additions D32 auto-print receipt (v2.15) & D33 B2B (GST) billing (v2.16); Booking review STARTED (§M D34, 2026-06) — first-iteration blueprint proposed (v2.17), pending owner approval to build
Rule:     Preserve frozen rows; record post-freeze amendments in §D and revalidate at OPEN Gate 2.6. No gate advances without explicit owner close.
```

## A. Fixed behaviour (owner-decided, not switches)
| # | Decision |
|---|---|
| F1 | **One interaction pattern: expand in place** below the row / tile. One open at a time. Sticky header (title · ✕). Footer with actions. `Esc` closes. |
| F2 | ~~**Check Out = Folio.** One `Check Out` button → statement … Footer `[Print] [Extend Stay] [Collect ₹X & Check Out]`; ₹0 → `[Check Out]`. One Print. No "Folio" button anywhere.~~ → **superseded by D1 (Gate 2.6)** |
| F3 | **Common guest row** (Arrivals / Departures / In-House): Room · Guest (name · booking · masked phone · SR ● · CRM ✔) · Source · Check-in (+relative) · Check-out (+nights) · Guests · ₹ · Status · Action. |
| F4 | **Row actions**: Arrivals `Check In` + ⋮ (Modify / No-Show / Cancel); expired-stay row → `Mark No-Show` (disabled + tooltip for non-OTA until BQ-385-04) + `Cancel`. Departures & In-House: ~~`Check Out`~~ **`Bill` (D1)** `· Request HK/Mark Clean · Extend` (3 buttons, both widths). |
| F5 | **Tab strip 60 px**, two lines, Rooms 2× wide, sub-line items are links → tab + chip; red left edge when late/overdue/OOO > 0; `N free` always visible; no "upcoming"/"outstanding" on tiles; ~~Rooms trend hint `yesterday X%` (hidden 1024)~~ **→ D4: hidden in v1 (Phase 2 / BQ-385-02)**. |
| F6 | **Chips**: Arrivals Late · Today · Tomorrow · Upcoming; Departures Overdue · Today · Tomorrow · Upcoming; In-House All · Arrived today · Leaving today · Stayover; Rooms All · Available · Occupied · Booked · HK · OOO. |
| F7 | **Alert bar**: only non-tile items (expired late stays, overdue ≥ 1 day, HK > 2 h, OOO ≥ 1 day), max 3 + "+N"; click → tab + chip + row expanded; no dismiss. |
| F8 | **Global header search** (380 px, centred): room / guest / phone (last digits) / booking; grouped In-house · Arriving · Departing · Rooms · Recent; select → tab + chip + row expanded; tables filter while typing; `/` focuses, `Esc`/✕ clears; "Search past guests in Reservations ↗" footer. |
| F9 | **Header**: `Good <part of day>, <first name>` + date ~~· shift since~~ **(D3: dropped)**; user menu (role · handover note · switch user · sign out); one button `● synced X min ago ↻` (tooltip last refresh); `+ New Booking`. No property name, no BETA badge. |
| F10 | **New Booking in place** (scope added 2026-09-18): header → top of current tab; `Book Room` tile → under tile, room preselected. 3 columns Guest · Stay · Room & amount (picker filtered by type + dates; HK greyed with duration; reserved struck-through; rate hint, GST, total). `Save booking` → Arrivals; `Save & Check in now` → morphs into Check-In. Walk-in button removed. |
| F11 | **Check-In expansion**: Who · Stay · Room & amount (clean-rooms picker) · Guest IDs **per adult** (front/back capture) · Advance & note; late multi-night shows remaining nights; footer `[Cancel] [Collect ₹adv & Confirm Check-In]`. |
| F12 | **Rooms tab**: Comfortable/Compact density (persisted) · group by number/type · tile expands to state-specific detail (available: ready since / rate / next arrival / last guest; booked; occupied; HK duration + assignee; OOO days + reason) with actions; `Mark All Clean` expands a confirmation listing clean / skipped rooms; Auto-HK pill. |
| F13 | **No redirection** for any action inside a tab (incl. Rooms tile Check Out / Check In / Book Room). Intentional "go to": tile links, alert items, search results. Accepted page navigations (review FU-385-D): reports link, "view ↗" cancelled/no-shows, "past guests". |
| F14 | **States**: reservations fail → whole page error + Retry; board fails → Rooms tile "—", HK badges hidden, Rooms panel retry, other tabs work; first load → skeleton rows. |
| F15 | **Post-checkout toast** `Checked out · Room N · [Print bill]` ~~`[Undo 10 s]`~~ **(D1: Undo dropped — no backend un-checkout)**; footers `Cancelled today · No-shows today` (Arrivals), `Checked out today → reports` (Departures). |
| F16 | Column headers **sortable** (▲▼), **sticky**; keyboard `↑↓ Enter` on rows. |

## B. Switch values frozen (★ defaults kept unless noted)
| Switch | Frozen |
|---|---|
| MV-02 Check-In pattern | **expand in place** (side/overlay were compare-only) |
| MV-04 HK indicator | badge on row + HK chip on Rooms |
| MV-05 mini KPI rows | dropped |
| MV-06 Rooms tile number | occupancy % (backend `occupancy_percent_physical`) |
| MV-07 alert dismiss | none |
| MV-08 board layout | RS-A tiles (RS-B rows kept as density-like option? → **No**: frozen RS-A; RS-B dropped) |
| MV-09 grouping | room number default, type toggle available |
| Width | 1440 primary, 1024 supported (two-column Check Out preserved; Rooms 4/8 cols) |
| Density default | Comfortable |

## C. Parked (not in CR-385)
FU-385-A sidebar re-point · FU-385-C cutover/retire old pages · FU-385-D review all other screens · FU-385-E guest notes · FU-385-F bulk-select rooms · FU-385-G late checkout by hours · FU-385-H date navigation · Phase 2 aggregation (BQ-385-02) · sockets (BQ-385-01).

## D. Amendments (Gate 2.6 — owner answers to IA Rev 3 Q1–Q5, 2026-06)
History: v2.6 → v2.7 (D8) → v2.8 (D9–D12) → v2.9 (D13–D15). Frozen rows above are retained as history; D13–D15 now override the specified parts of D1/D9–D11.

| # | Replaces | Amendment | Why |
|---|---|---|---|
| D1 | F2, F4, F15 | **Bill expansion = Layout B (owner-approved 2026-06, final).** Row button `Bill` (Departures / In-House / Rooms tile) opens the expansion; it does **not** check out. Both columns share a fixed 560 px height (viewport-clamped). **LEFT — statement, own scroll:** Guest & stay · **ROOM** card: booking amount (nights × rate) → **Room discount** control (same pattern as F&B: `None ▾ / % / ₹ flat / preset categories` + value box + optional reason; **backend has no room-discount field → BQ-385-07 raised; control ships DISABLED with tooltip until the API accepts it**) → lodging GST (recalculated on the discounted base) → room total → advance paid → other room payments → **room balance** · **TRANSFERRED ORDERS** card: order ids + amounts (incl. GST) → **transferred balance**; no items (feature being retired). No "Balance due" card on the left. **RIGHT — `CollectPaymentPanel` (room mode) embedded, existing structure, top-to-bottom:** header `🍽 F&B BILL · Room orders (n)` + `Print Bill` → *(scrolls)* **🎛 ADJUSTMENTS**: 🏷 Discount `None / % / ₹ / presets` + value + reason · 🎟 Coupon + Apply · ☐ Loyalty (tier · pts · ₹ discount · earn line) · ☐ Wallet (disabled when ₹0) → **📋 BILL SUMMARY (computed, read-only)**: items · Item total · − Discount · − Coupon · − Loyalty · Subtotal · TAXES (CGST · SGST · Round off) · Room orders total → *(pinned, never scrolls)* **SETTLE**: `Room orders (F&B) + Room balance + Transferred = GRAND TOTAL (incl. GST)` · payment tiles Cash / Card / UPI / Credit (one payment for everything) · Received · Reference · **`Checkout ₹X`** always visible. The panel's 3 collapsible section rows (Room / Transferred / Room Orders) are **hidden** (Q6 → see IA §7). **No Split Bill** (`onOpenSplitBill={null}`, as today). Shown even at ₹0. No footer, no Extend inside the expansion. **Undo dropped**; toast `Checked out · Room N · [Print bill]`. Cashier rule: **left = explain; right = adjust → verify → collect.** | Owner iterated 4 rounds (2026-06): real bill breakup not placeholder → no repetition → left scroll / right fixed → F&B bill on the right with adjustments (flat/%/custom discount, coupon, **loyalty**) exactly like the restaurant panel, room + transferred on the left, single payment. Backend has no un-checkout API (R16). |
| D2 | F1 (scope note), OD-385-12 | **Extend / Modify / Cancel / No-Show reuse the 4 existing dialogs via a new `inline` prop** (`ExtendStayDialog`, `ModifyBookingDialog`, `CancelBookingDialog`, `NoShowDialog`). `inline` omitted → today's overlay, old pages unchanged; `inline` → same body rendered without the overlay inside the expanded row. **OD-385-12 exception (owner-approved):** these 4 files may receive a wrapper-only edit (~5 L each, no logic lines). No copied form bodies. | Owner: "we need clean code". Removes 4×110 L duplicates and the R17/R21 drift risk. |
| D3 | F9 | `shift since` **dropped** from header and user menu. | Login time is not stored anywhere; owner chose (c). |
| D4 | F5 | Rooms tile trend hint `yesterday X%` **hidden in v1**; add with BQ-385-02. | Would need a second `dashboard-kpis` call per refresh. |
| D5 | — | **Gate 3 spike approved (½ day, throw-away):** scratch route with a dummy `GuestTable`, one `ExpandableRow`, real `CollectPaymentPanel` in a 560 px box; verify collapse / inner scroll / Checkout visible / sticky `<th>` / `↑↓ Enter`. Evidence → `memory/evidence/CR-385/spike/`; scratch code deleted, nothing stays in `src/`. | R15 / R19 — prove the container before writing the Implementation Plan. |
| D6 | — (code reality) | **Adjustments visibility kept as today (owner D-1 = a).** `CollectPaymentPanel` L1330 hides the whole Adjustments block in room mode when the room has **any transferred order** or **no room-order items**. Accepted: transferred orders are being retired, so this resolves itself; until then no F&B discount / coupon / loyalty at checkout for a guest with a transferred order. **No edit** to the panel for this. | Owner: "d1 a". |
| D7 | — (dependency) | **Loyalty requires a CRM customer (owner D-2 = ok).** Panel looks up points by the guest phone already passed in room mode (`buildCustomer`); guests not in CRM see no loyalty row. Accepted. | Owner: "d2 ok". |
| D8 | mockup | **Mockup updated to v2.7 = final D1** (owner approved 2026-06: "go ahead and modify design"). Layout A/C removed; right = 🎛 Adjustments (Discount None/%/₹/Staff-10% + value + reason · Coupon + Apply · ☐ Loyalty Bronze 168 pts ₹110 · ☐ Wallet disabled) → 📋 Bill summary (items · item total · −discount · −coupon · −loyalty · subtotal · CGST · SGST · round off · room orders total) → pinned Settle; left ROOM discount control rendered disabled + tooltip "needs BQ-385-07". Verified by testing agent (`test_reports/iteration_4.json`). | Owner instruction 2026-06. |
| D9 | D1 right initial scroll (FB-1) | **Open at Bill Summary.** Adjustments remain above Summary in document order and are reachable by scrolling up. Initial anchoring happens only when opening a bill; editing discounts/coupon/loyalty must preserve the current scroll and input focus. | Owner approved proposal with `yes` after feedback clarification. Trade-off disclosed: adjustments are less immediately visible. |
| D10 | D1 height/settle containment (FB-2) | **Checkout stays visible outside the scrolling bill body.** Bound the bill to the available viewport (560 px maximum), keep settlement non-shrinking, and position the expanded bill in the visible workstation area on opening. Left and right contents scroll independently. | Owner screenshot cropped the payment controls below the viewport; pinning inside a tall offscreen box was insufficient. |
| D11 | D1 left ROOM structure (FB-3) | **Guest & stay → ROOM heading → room Adjustments → Room Summary → Transferred orders.** Match right-side heading/section/summary hierarchy. Room discount type, value and optional reason remain disabled pending BQ-385-07. Do not introduce room coupon/loyalty/wallet, another payment form, or a Balance-due card. | Owner approved left/right structural mirroring. Existing room arithmetic remains unchanged. |
| D12 | D1 settlement styling/order (FB-4) | **Neutral settlement rows, in this exact order: Room orders (F&B) → Transferred orders → Room balance → Grand Total.** Same white background and neutral amount colour; remove orange divider/outline and tinted total block. Grand Total distinguished by typography/spacing only. Single existing payment area and Checkout follow. | Owner: `room transfer room balance grand total`; clarified back as these four labels; owner confirmed `yes`, then approved proceeding `yes`. |

| D13 | Mockup-only toolbar/frame | **Hide the entire black preview-controls panel** (Width, MV options, test states, Freeze, Reset). Show the workstation at actual available page width/height, without artificial frame margins, so the owner can judge the complete page. Frozen application navigation remains unchanged. | Owner screenshot + "show it without this panel"; subsequent explicit "go ahead with design chnages and show revised mock up". |
| D14 | D1/D9/D10/D11 column content and default state | **LEFT = all bill details and section operations; RIGHT = final figures and one payment/Checkout area.** Three independent, **collapsed-by-default** LHS sections: Room, Room orders (F&B), Transferred orders. Each heading always displays its computed total equal to its corresponding RHS row. Expanding Room exposes room controls/summary; expanding F&B exposes items, discount/coupon/loyalty/wallet and tax summary; transferred exposes existing order references/amounts. RHS no item list, no adjustment controls, no empty fixed-height scroll body. D9 Summary-first RHS scrolling is superseded, not retained as a hidden secondary mode. Neutral D12 RHS order remains unchanged. | Owner: "complete section operation will happen on LHS adjustment etc and RHS will reflect final figures". Compact design explicitly requested and approved. |
| D15 | D1/D11 Room Summary display | **Booking amount (total for all nights) → Advance paid → Balance (after advance, before GST) → SGST → CGST → Total (final payable including GST).** Remove duplicate intermediate Room total and the misleading nights × rate label. GST base/rules and final payable remain unchanged; demo GST50 is displayed as SGST25 + CGST25 on booking total1000, not on balance900. If other room payments already exist, show their deduction after the tax rows and before Total so fully-paid rooms still reconcile to0. Room discount stays disabled pending BQ-385-07. | Owner explicitly confirmed Balance definition. Preserve existing payments; do not silently drop money to fit the compact layout. |

### v2.9 scope and gate lock
- PLANNING only: HTML demonstration plus design/impact/evidence documents; no `src/`, backend, environment, frozen baseline or registry gate edits.
- All transactions/printing in this HTML remain **MOCKED**. Room discount stays disabled. D6 production Adjustments visibility remains accepted; mockup demonstrates adjustment controls even with transferred orders, not a new production policy.
- Verification: Room 103/P. Nair (owner screenshot), Room 102/R. Fernandes (discount/coupon/loyalty), Room 105/M. D'Souza (zero room balance), width presets 1440/1024 and 390px browser containment, independent scroll/focus, neutral row order and invariant totals.
- Gate 2.6 remains OPEN. Subsequent owner confirmation settles v2.9 checkout; continued expansion review is recorded in §§E/F. Q6 mechanism, BQ-385-07 brief and IA Rev 3.2 consolidation follow design review; Gate 3 spike/plan requires separate owner approval.


## E. v2.9 pre-feedback checkpoint / expansion review queue (2026-09-18 continuation)

Owner asked to document the current version before giving further feedback. Checkout is settled and must stay unchanged. Gate 2.6 remains OPEN; this is continued PLANNING/design, not production implementation or gate closure.

| Review group | Expansion / entry points | Status |
|---|---|---|
| 1 | Check-In: Arrivals row / booked room tile / New Booking continuation | **CLOSED / LOCKED at v2.14 (owner 2026-06, §J D31)** |
| 2 | New Booking: header / available room Book Room | **IN REVIEW (§M D34, 2026-06)** — owner authorized start; first-iteration blueprint proposed (v2.17), awaiting approval to build |
| 3 | Extend Stay: Departures / In-House | Waiting for owner feedback; unchanged |
| 4 | Modify Booking: Arrivals menu | Review with Extend Stay; unchanged |
| 5 | Cancel Booking: Arrivals menu / expired booking | Review with No-Show; unchanged |
| 6 | Mark No-Show: Arrivals menu / expired booking | Review with cancellation; existing source restrictions retained |
| 7 | Room Details: Available, Booked, Occupied, Occupied + HK, HK, OOO | Six state variants; unchanged |
| 8 | Mark All Clean: Rooms toolbar confirmation | Eligible/skipped room list; unchanged |

Walk-in is New Booking -> Save & Check in now -> Check-In, not a ninth remaining form. Room-tile Check-In/Book Room/Bill reuse the respective expansion. Individual HK/Clean/OOO/Back in Service actions currently execute immediately; menus/search results are not expansion forms. All are MOCKED demonstrations.

Review order: Check-In -> New Booking -> Extend/Modify -> Cancel/No-Show -> Room Details/Mark All Clean. Each group follows review -> proposal -> owner approval -> mockup edit -> verification -> owner freeze. No automatic Gate 2.6 closure.

Baseline v2.9 HTML SHA256: `6a8546d358d569aea0c8870ed6c67f0fe1770413fb3fd0b193dbf8b882c60a92`. D13-D15 match the owner's settled screenshot. Earlier v2.8 7/7 PASS is reported in history but those reports are absent here; do not infer a completed full v2.9 QA run. Read-only current-session inspection confirmed Room107 collapsed checkout at desktop1920x800/mobile390x844 with no horizontal overflow.

## F. Check-In first layout pass — v2.10 (D16)

| Amendment | Supersedes | Owner-approved direction |
|---|---|---|
| D16 | F11 visual grouping only | Two columns like checkout. LEFT: compact guest/contact information, rooms booked and existing booking/stay/room information. RIGHT: per-adult documents and existing check-in advance payment. Owner confirmed no new full-bill settlement, no checkout changes. First layout pass only; detailed feedback/freeze pending. |

Owner request: "The left-hand side will have guest details, the number of rooms booked, and whatever is coming from the booking details. The right-hand side is for something that is only at check-in time, like collecting the documents and paying the bill." Owner said `yes` to preserving current check-in advance-payment rules and modifying only the Check-In mockup.

Implementation scope: scoped Check-In markup/CSS and review deep link only. Existing single-room demo data supplies the displayed rooms-booked count; no real multi-room workflow invented. Fields remain a layout preview; document capture and payment are MOCKED, no files uploaded. Check-In submission/demo arithmetic, checkout render/style/submission, other forms, src/, backend, env and registry gates remain unchanged. Responsive containment does not add a production mobile scope decision.

Verification: PASS — current `/app/test_reports/iteration_1.json` + `iteration_2.json`, frontend-only mockup QA (not historical report1/2). Desktop1920x800/mobile390x844 and1024px content width: containment, readable left/right, normal/late guest data, six-adult document scroll, checkbox, capture toasts, Close/Cancel/Esc/confirm, Arrivals/room119/NewBooking entrypoints passed. Checkout107 zero and103 total2677 regression passed. Protected SHA256 checks confirm checkout render/CSS/submission, Check-In submission, src/backend/env and registry unchanged. Detailed owner Check-In feedback/freeze remains pending. Gate 2.6 IA Rev3.2 consolidation, Q6, BQ-385-07, Gate3 spike/plan remain pending after the owner finishes design review.


## G. v2.11 — Check-In feedback correction and optional multi-room concept (D17–D19)

Owner feedback: compact the read-only facts; primary name/phone already known; additional adults need NAME plus their own ID; assignment and collection must belong to the relevant booked room; handle40-room/30-vacant property without a tile wall. Owner then explicitly corrected **IDs to LHS**, accepted room/payment and remaining-gap summary, parked multi-check-in in Phase2 but allowed a simple design preview. Owner selected **b: revised single-room Check-In plus lightweight multi-room concept for review only**.

| Decision | Overrides | Approved direction |
|---|---|---|
| D17 | D16 visual grouping and placeholder guest controls | LEFT compact one-label/value-per-row booking facts AND per-guest ID collection. Known primary identity reused; extra adult name input + ID type/front/back per person; child names/age separate. RIGHT relevant room assignment and that booking-room bill/collection. |
| D18 | D16 six-tile picker / fixed500 Cash placeholders | Compact searchable eligible-room dropdown with all matching choices reachable. No automatic fallback to another category or unrelated reservation. Show selected room context, booking charge/GST, payments already allocated, balance before/new collection/remaining or credit. Prepaid/zero scenarios included. Sample 40-room/30-vacant selector is isolated, non-submittable. |
| D19 | D16 no multi-room preview | Separate **Phase2 concept / review only**: sample3-room booking, compact per-room switcher, independent room/guest/payment drafts, one checked-in room read-only. No combined submission or Phase1 promotion approved. |

Implementation boundaries:
- v2.11 is an HTML-only local state design, not API/React implementation. Only Check-In and its room-tile entry guard change. Checkout renderer/CSS/submission and NewBooking/other expansion handlers remain unchanged.
- ID capture/preview/remove are simulated states; no real file upload/storage. Additional names/type fields are locally editable and retained across switches/close until reload. Primary on-file sample ID does not satisfy another adult's requirement. Front required, back optional in this sample per owner reference; live ID policy differences across old/new source still need reconciliation. Child ID policy is NOT newly defined.
- Room collection inputs now drive the MOCKED single-room confirmation; the prior fixed500 subtraction is superseded for Check-In only. All seeded monetary allocations/GST are explicitly sample ledger values, not inferred production contract or new advance-limit policy. Credit is shown for sample overcollection rather than inventing a hard cap. No automatic equal division of multi-room totals.
- Read-only booking counts/guest capacity follow the sample booking; adding/removing occupants stays out of this pass. Existing real sources differ (single-room PMS submit, older multi-room modal, additional-adult limits, advance validation); a simple UI does not establish backend support.
- Real future-date overlap checks and exact booking-room payment allocation remain backend/IA dependencies. 40/30 inventory changes only local picker fixture, not workstation counts/rooms. Multi concept cannot confirm even if all fields ready.
- Room-tile Check-In must use a linked, non-expired reservation; missing link shows a block instead of substituting an arbitrary arrival. Preassigned mismatched/blocked room is displayed but cannot confirm until an eligible assignment is chosen.

Verification: PASS — `/app/test_reports/iteration_3.json`, current v2.11 frontend-only browser checks: single/late/prepaid/CRM, named per-adult simulated IDs, required-field/readiness and typing/caret/escaping, full searchable room list and40/30 isolation, selected-room collection arithmetic, zero/prepaid/credit, normal mock confirmation, room119 linked / room120 missing-link, multi draft preservation/deduplication/read-only/no-submit, desktop1920x800/mobile390x844/1024-content and checkout103/107 regressions. No reported errors. Main SHA256 checks confirm checkout renderer/CSS/submission, other forms/NewBooking helpers, src/backend/env/registry unchanged. Test3 narrative typo: concept room2 tax165 =82.50SGST+82.50CGST; total3465, not3300+55+55. No code defect. NewBooking helper unchanged; v2.10 entrypoint regression plus current renderer checks, not a claim of live integration QA. Gate2.6 OPEN; Check-In owner review pending; multi remainsPhase2 concept.


## H. D20 — Mandatory Check-In walkthrough and explicit close before Booking

**Owner instruction:** "update docs and descisons and write handover was next agent how will walk through check in page and take my feedback and explicit close before moving to booking screen". Owner approved this DOCUMENTATION-ONLY procedure with `yes`. This approval does NOT close the Check-In design.

| Review status | Current value |
|---|---|
| Active role | PLANNING / design only |
| Checkout | v2.9 settled; leave untouched |
| Check-In | **v2.14 — CLOSED / LOCKED by owner (2026-06, §J D31).** Treat like Checkout v2.9; no edits without a new explicit owner request |
| Booking design | **IN REVIEW (§M D34)** — blueprint proposed (v2.17), awaiting approval to build |
| Multi-room | Phase2 concept only; separate scope approval needed to include inPhase1 |
| Hard Gate2.6 | OPEN, independent of individual screen sign-off |

### Required sequence for the next agent
1. Read ALPHA, this D20, current v2.11 handover/PRD and report3. Establish current preview host from env. Do not reapply v2.7-v2.10 superseded designs or treat prior QA as final owner approval.
2. Open single-room `?checkin=a2` first and introduce the boundary: Check-In review only; checkout unchanged; Booking cannot start yet. Explain MOCKED data/documents/payments once.
3. Walk through compact booking facts -> primary/additional guest IDs/children -> relevant-room assignment/40-30 example -> room bill/collection/readiness -> entry/late/prepaid/missing-booking states. Show one area at a time and ask for the owner's feedback before moving through the next area. Detailed actions/expected sample amounts are in handover §Next-agent walkthrough.
4. Summarize each feedback item as current behaviour, desired change and proposed correction. Ask clarification only when needed; do not assume a policy decision from a visual preference. Obtain approval BEFORE editing the mockup. A request to explain/compare is not permission to edit.
5. After an approved revision, verify affected interactions/responsive layout and checkout regression, update decisions/change status/evidence, and show the result. Ask whether it resolves that feedback; do not auto-freeze after tests pass.
6. Show multi-room concept separately only after the single-room walkthrough or when the owner requests it. Preserve Phase2 label/non-submittable boundary; distinguish design preference, technical feasibility and authorization to promote toPhase1. Deferring multi does NOT prevent the owner from closing the single-room design.
7. Present the final Check-In version, resolved feedback, explicitly deferred items and remaining limitations. Ask for an unambiguous owner decision, for example: **"Do you explicitly close this Check-In design and authorize us to start the Booking design review?"**
8. Proceed only after an explicit owner statement such as **"Check-In design closed — proceed to Booking."** Equivalent clear wording is acceptable; record the exact quote, date/version, deferred scope and verification reference. A generic `yes` to an edit, `looks good`, report PASS, approval of optionb, or approval of THIS document is NOT Check-In closure. If the owner closes Check-In but does not authorize Booking, ask for that permission separately.
9. Only then change the review queue to Check-In CLOSED / Booking READY and ask for Booking-specific feedback. Do not interpret this screen-level closure as Hard Gate2.6 closure, Gate3 spike approval, Gate4GO, or permission for production code.

Current handover: `handover/SESSION_HANDOVER_2026_09_18_CR385_V2_11_CHECKIN_CONCEPT.md`. No executable changes/version bump in this documentation pass. Existing NewBooking -> Check-In transition is historical entrypoint context, not permission to start a Booking walkthrough. If later Check-In regression work requires revisiting that screen before sign-off, explain the narrow need and ask first; do not redesign it.


## I. v2.12 — Owner UX-priority feedback accepted (D21–D27, 2026-06)

Owner reviewed the v2.11 Check-In walkthrough with **user experience as the stated priority** ("wat u suggest user expeience is priority") and, in the next turn, explicitly accepted the UX-first recommendations: **"f1 ok … f4 ok, ok with recommendations for gaps, please update docs and decisions"**. Owner then chose (via ask_human): (1) update docs AND implement F1–F4 into the mockup as **v2.12** now; (2) for F1, **reuse existing check-in document/ID logic — thumbnail + lightbox is display only; mandatory/back policy comes from backend/existing code, the mockup invents no new rule.**

This is still PLANNING / design review. Gate 2.6 remains OPEN. **Accepting these recommendations and the v2.12 mockup is NOT Check-In closure** — the D20 explicit-closure protocol still governs before Booking. Checkout v2.9 stays settled/untouched. Multi-room stays Phase 2. Labels F1–F4/G1–G7 below are the owner's UX-review labels (distinct from the §A F1–F16 baseline switches).

| # | Label | Overrides | Approved direction (v2.12) |
|---|---|---|---|
| D21 | F4 + G1 | D17 LEFT stacked 9-fact list | **Compact booking facts: 4 dense rows, empty fields hidden.** Row 1 Guest = name · masked phone · email (hidden if none) · CRM ✓ badge. Row 2 Booking = booking id · source chip · room count/category. Row 3 Stay = dates · nights · **checkout time "out 11:00" (G1)**; a **Late arrival chip** ("arrived <date> · N nights left") appears only when actual check-in precedes the booked date. Row 4 Guests = adults/children · billing-to. Special requests render only when present, as a chip. Goal: bring room selection + ID capture above the fold. |
| D22 | F1 + G2 + G7 | D17 text capture buttons; F1 recommendation's "back mandatory for Aadhaar" | **Document display = inline ~56–64 px thumbnail + tap-to-enlarge lightbox** (ID-type badge, side label; lightbox has Retake / Remove / Close). **Mandatory/back policy is NOT redefined by the mockup — it reuses existing check-in logic** (CR-350: front required only when the property ID-upload toggle is ON; CRM document on file exempts; **back is optional for all ID types**). The earlier "back mandatory for Aadhaar" idea is **superseded/dropped** per owner's reuse choice. **G7:** on-file (CRM) documents show source/date/validity metadata ("CRM · added 12 Aug 2025 · valid to 2031", sample). **G2** resolved by this reuse: back stays optional. |
| D23 | F2 | D18 booked-category-only picker | **Complimentary + paid upgrades during Check-In (Phase 1, opt-in).** Picker default stays booked-category only; a **"Show higher categories (upgrade)"** toggle reveals higher categories. Selecting a higher-category room shows a **Complimentary / Paid** choice. **Paid:** category delta/night × nights → a **"Room upgrade" line is added to this room's bill**, GST + balance update live. **Complimentary:** requires a **reason** (Overbooking / Loyalty / Service recovery / Manager discretion) **and manager authorization** (recorded), no charge. Never auto-upgrade; no downgrade on this screen. Rate ladder in the mockup is SAMPLE (Deluxe 2200 / Executive 3300 / Suite 4500 per night); real rates/allocation are backend/IA dependencies. |
| D24 | F3 | D17/D18 Method `<select>` | **Cash / Card / UPI payment pills** (Checkout-style), replacing the dropdown. Disabled while Collect Now = 0; when collection is non-zero the staff must **explicitly pick a method (no Cash default)**. **Card/UPI require a Txn / UTR no.** (field relabels + becomes required); Cash keeps an optional note. Method set mirrors the **existing** check-in advance flow (`restaurant.paymentMethods`: Cash/Card/UPI). The recommendation's extra "Other"/Credit is **not added** — existing check-in advance has no such method; adding it would be new backend scope. |
| D25 | G3 | D17 "Advance already paid" | **Advance/prepaid source is labelled:** "Advance · Direct" / "Advance · OTA (MakeMyTrip)" / "Prepaid · …"; "No advance yet" when zero. Clarifies where money already collected came from. Sample values only. |
| D26 | G4 | — | **Out-of-order rooms shown as a count**, not a full list, in the room-availability line ("… · N out of order"). Light treatment, no OOO room enumeration on Check-In. |
| D27 | G5 + G6 | — | **Deferred, accepted as deferrals:** **G5** early check-in fee/waiver → later CR (property-rule heavy); **G6** welcome-slip printing → **CR-364-PRINT** (keep Check-In scope clean). No mockup change beyond noting. |

### v2.12 scope and gate lock
- Executable change: `frontend/public/cr385-frontdesk-mockup.html` **v2.11 → v2.12**, Check-In section + its CSS/helpers only. Checkout renderer/CSS/submission, New Booking and other expansion handlers, `frontend/src/`, backend, `.env` and registry gates unchanged.
- All capture / availability / taxes / upgrades / payments remain **MOCKED** local state; no files, uploads, auth, network or financial formula changes. Thumbnail/lightbox images are placeholders. Upgrade rate ladder, GST and allocations are sample ledger values, not production contract.
- Implementation faithfully honours owner's F1 reuse choice: mockup mandatory markers (front `*`, back "optional") mirror existing code behaviour; no new mandatory rule invented.
- Gate 2.6 stays OPEN. **D20 explicit Check-In closure + Booking authorization still required.** Acceptance of D21–D27 or a v2.12 QA PASS is NOT closure.

### D28 — v2.13 consistency refinements (IMPLEMENTED, 2026-06)
Owner reviewed v2.12 and asked for three consistency fixes ("we can make it 2 columns and use space"; the black pill "doesnt … design guidelines … we dont have any where black … frozen checkout page design"; "idea is same as checkout page to have checkout visible in same scroll screen"). Approved with "yes". Shipped in `frontend/public/cr385-frontdesk-mockup.html` v2.12 → **v2.13**:
- **2-column booking facts** — the compact LEFT facts reflow to a 2×2 grid (Guest | Booking, Stay | Guests) to use the pane width; special-requests chip spans full width.
- **Checkout-consistent payment pills** — the selected pill drops the solid black fill and mirrors the frozen checkout `CollectPaymentPanel` pill (`.pm button.on`): white background + dark inset ring + bold. Nothing in the palette/checkout uses a solid black block.
- **Bounded columns + pinned Confirm** — both Check-In columns are bounded to a viewport-clamped height and scroll internally; the Confirm/Cancel/readiness sit in a pinned footer so they stay visible, reusing the checkout containment idea (`fitCheckin()` + reveal-scroll, analog of `fitBill()`/D10). *(This RHS-scroll aspect is refined by D29, which removes the need for the right column to scroll at all.)*
- Verification: iteration_5 confirmed 2-col facts + regression PASS; flagged the pinned-Confirm not fully in view at 1920×800 and the selected pill reading #FAFAFA on hover — both fixed (viewport-aware `fitCheckin` + reveal-scroll; `.ci-pill:not(.on):hover`). Re-test folds into the D29/v2.14 pass.

### D29 — v2.14 checkout-mirrored layout (IMPLEMENTED, 2026-06)
Owner brainstorm: "do we really need scroll in RHS … recheck layout"; "id card section can be expandable/collapsable and we can look at assign room in LHS in that case". Owner approved **Option B** ("a ok") and, for ID cards, **user can expand/collapse with auto-collapse when complete** ("b user can expand collapse, auto-collapse when complete"). Recorded here documentation-only; **do not build until picked up as the v2.14 implementation pass.**

**Approved layout (mirrors frozen Checkout D14 = LEFT details/adjustments, RIGHT final figures + settle):**
- **LEFT column (scrolls):** (1) compact 2-col booking facts; (2) **Room assignment + upgrade moved here** from the right — it behaves like a checkout adjustment and updates the right-side figures live; (3) **per-guest ID cards collapsible/expandable** — user can toggle each; a card **auto-collapses once its required capture is complete**, incomplete cards stay expanded with an amber/pending marker; collapsed summary shows name · ID type · front/back status.
- **RIGHT column (short, NO internal scroll):** room bill (charge + upgrade line, GST, total, advance, balance) → Collect now + Cash/Card/UPI pills + Txn/UTR → remaining/credit + readiness + **Confirm** (always visible because the block is now short).

**Effect / supersedes:** D29 removes room assignment from the RIGHT column, so the right side no longer needs the bounded-scroll containment from D28 (RIGHT becomes naturally short/scroll-free); the LEFT column keeps checkout-style bounded scroll for many expanded IDs. Room/upgrade selection on LEFT drives RIGHT figures live (same as checkout adjustments → figures). All still MOCKED; mandatory ID logic still reuses existing code (D22); no new backend scope. Gate 2.6 OPEN; D20 closure still required.

**Verification (v2.14):** iteration_6 PASS on structure, room-in-LEFT → RIGHT live update (upgrade Paid raises total), collapsible cards + auto-collapse-when-complete (manual-expanded stays open), F1 lightbox, F3 pills (selected pill pure white), F4 2-col facts, a5/a1 states, mobile 390 stack, checkout 103/107 regression. iteration_6's one HIGH (RIGHT still scrolled / Confirm clipped at 1920×800) was resolved in two steps: (1) `fitCheckin()` rewritten viewport-aware (reveal expansion to panel top, then cap `--ci-height` to panel bottom − layout top − disclaimer) + disclaimer compacted; (2) owner asked to reclaim space from headings rather than merge the tax lines — removed the redundant RIGHT h3 "This room's booking bill" (the pane header "Bill & collection" already labels it) and tightened RIGHT section/footer spacing. **SGST/CGST breakup kept intact.** Re-verified iteration_7 with hard numbers: RIGHT `.ci-pane-body` scrollHeight==clientHeight (392) across a2/a5/a1 (and paid-upgrade case), Confirm bottom 733.5 < 800 — NO RIGHT internal scroll; SGST+CGST separate confirmed.

### D30 — Completion Badge (IMPLEMENTED v2.14, 2026-06)
Owner requested "a small left-column progress line ('IDs 2/2 · Room assigned · Balance ₹1,810') so staff see readiness at a glance before Confirm." Implemented as a pinned strip `checkin-progress` at the top of the LEFT column (below the header, above the scrolling body): three pills — `checkin-progress-ids` (IDs done/total; done = name + front captured; green when all, amber otherwise), `checkin-progress-room` (green "✓ Room N assigned" when an eligible room is picked, amber "• Room not assigned" otherwise), `checkin-progress-balance` (info pill "Balance ₹N" = balance before collection, `f.due`). Updates live on every redraw. **Badge polish (owner request):** once every step is complete (`!done && !multi && !d.inventoryDemo && ciMissing(c).length===0`) a green **"Ready to check in"** pill `checkin-progress-ready` appears and the strip gets a subtle green tint — a final confidence cue before Confirm; it disappears if any requirement is removed and is hidden in blocked modes (multi-room concept, inventory example). Verified iteration_7 (values correct, live warn→ok transitions, balance matches `checkin-balance-before`) and iteration_8 (ready pill green rgb(50,153,55), appears only when fully ready, disappears on requirement removal, hidden in blocked modes). MOCKED display only; no new logic/scope.

## J. D31 — Check-In design CLOSED by owner (2026-06)
**Owner instruction (verbatim):** "Badge Polish: Add a subtle 'Ready to check in' green state on the badge once every step is complete … after that close the design for check in update docs and decision with all details." This is the explicit D20 Check-In closure. Recorded here with date/version.

- **Closed at:** mockup `frontend/public/cr385-frontdesk-mockup.html` **v2.14** (Check-In section), 2026-06.
- **Review queue now:** **Check-In = CLOSED / LOCKED** (treat like Checkout v2.9 — do not edit without a new explicit owner request). **Booking design = READY** to begin **next**.
- **D20 note:** the owner closed Check-In but did NOT in this message explicitly authorize starting the Booking review. Per D20 steps 8–9, confirm a Booking go-ahead before editing the New Booking screen. This closure is screen-level only — it is **NOT** Hard Gate 2.6 closure, Gate 3 spike approval, Gate 4 GO, or permission for production code.

### What the closed Check-In (v2.14) contains
- **Layout (D29):** checkout-mirrored two columns. LEFT (scrolls) = compact 2-col booking facts (D21/F4, incl. checkout time + late-arrival chip / G1) → room assignment + upgrade (D23/F2) → collapsible per-guest ID cards (user toggle, auto-collapse when complete, manual-expanded stays open). RIGHT (short, **no internal scroll**, Confirm always visible) = room bill + collection.
- **Documents (D22/F1, G2, G7):** inline ID thumbnails + tap-to-enlarge lightbox (Retake/Remove/Close); mandatory rules **reuse existing check-in logic** (front required, back optional, CRM doc on file exempts — no new rule invented); on-file CRM docs show source/date/validity.
- **Upgrades (D23/F2):** "Show higher categories (upgrade)" in the picker; Paid adds a "Room upgrade" bill line (delta/night × nights) updating GST/balance live; Complimentary requires reason + manager authorization; no auto-upgrade, no downgrade.
- **Payments (D24/F3):** Cash/Card/UPI pills in the frozen-checkout selected style (white + dark ring, no black fill); disabled at ₹0; non-zero requires an explicit method; Card/UPI require Txn/UTR; Cash optional note. SGST + CGST shown as **separate** lines (not merged).
- **Clarity (G3/G4):** advance/prepaid source label ("Advance · Direct" / "Prepaid · OTA (…)"); out-of-order rooms shown as a count.
- **Consistency (D28):** 2-col booking facts; checkout-consistent pills; viewport-aware containment (`fitCheckin`) so the whole screen fits and Confirm stays visible; redundant RIGHT bill heading removed to keep the RIGHT scroll-free.
- **Completion Badge (D30):** LEFT `checkin-progress` strip (IDs x/y, room state, Balance ₹N) + green "Ready to check in" pill when fully ready.
- **Deferred (D27):** G5 early check-in fee/waiver → later CR; G6 welcome-slip printing → CR-364-PRINT.
- **Phase 2:** multi-room check-in remains concept-only (non-submittable) unless separately approved.

### Verification of the closed design
frontend-only mockup QA, all PASS: iteration_4 (v2.12 F1–F4/G1–G7), iteration_6 (v2.14 layout, collapse/auto-collapse, upgrade→figures live, lightbox, pills), iteration_7 (RIGHT no-scroll hard numbers scrollHeight==clientHeight 392 across a2/a5/a1 + paid upgrade; Confirm bottom 733.5<800; SGST/CGST separate; Completion Badge), iteration_8 ("Ready to check in" pill). Checkout `?bill=107` (₹0) / `?bill=103` (₹2,677) regression unchanged throughout; no JS console errors; desktop 1920×800 + mobile 390×844 clean. Checkout v2.9 renderer/CSS/submission, New Booking + other expansions, `frontend/src`, backend, `.env`, registry gates untouched (all MOCKED design work).

### Next
Ask the owner to confirm proceeding to the **New Booking** design review (D20 step 8–9). On go-ahead, set Booking = active and follow the same review → proposal → approval → edit → verify loop; keep Check-In v2.14 and Checkout v2.9 locked. Hard Gate 2.6 / Q6 / BQ-385-07 / IA Rev 3.2 / Gate 3 spike remain after the full expansion design review.

## K. Open / parked Check-In items after v2.14 closure (2026-06)
After closing single-room Check-In (§J D31), the owner reviewed remaining Check-In items. **Multi-room check-in is explicitly ON HOLD by owner decision** ("For now, we will put multi check-in on hold"). Check-In v2.14 stays CLOSED/LOCKED; these are tracked, not in active design.

| # | Open item | Status |
|---|---|---|
| K1 | **Multi-room check-in** | **ON HOLD (owner, 2026-06).** Remains Phase 2 **concept-only / non-submittable** in the mockup (`?…&concept=multi`: room tabs, per-room draft/assignment/bill, no combined check-in or payment). Not to be designed until the owner explicitly resumes it. |
| K2 | Booking-wide payment split (per-room vs combined-and-split allocation of a booking-level advance/collection) | PARKED — tied to K1; mockup intentionally does no auto-split. |
| K3 | G5 — early check-in fee / waiver | DEFERRED to a later CR (property-rule heavy). |
| K4 | G6 — welcome slip / registration card printing | DEFERRED to CR-364-PRINT. |
| K5 | Occupancy changes at check-in (add/remove guests) | Current rule: guest count follows the booking; changes routed to booking review. Confirm as final if revisited. |
| K6 | Live-rule reconciliation (availability/stay-overlap, ID-upload toggle, tax rates, upgrade rate ladder) | IMPLEMENTATION, not design — all MOCKED now; wire to real property logic when CR-385 moves to build. |

**Phase-2 multi-room decisions to capture if/when K1 resumes:** (a) IDs per-room vs one lead ID for the booking; (b) payment per-room vs combined-then-split; (c) allow partial "check in the ready rooms now" while others stay pending; (d) complimentary-upgrade manager authorization once per booking vs per room. Plain-English proposed flow (room tabs, per-room drafts, booking-level readiness line, per-room upgrades, check-in-all or in-waves) was walked through with the owner on 2026-06 and is captured in the closure handover for reference.

Active focus stays: **New Booking** design review next (on owner go-ahead), Check-In v2.14 + Checkout v2.9 locked.

## L. Post-closure Check-In additions — owner-requested (D32, D33, 2026-06)
After the v2.14 closure (§J), the owner requested two additions to Check-In; both built and verified. These are approved refinements to the closed baseline (not a reopening of the whole design). Multi-room stays ON HOLD (§K); Checkout v2.9 untouched.

### D32 — Auto-print check-in receipt (v2.15)
Owner: "one checkbox by default which is … from the settings … on or off … used to print the receipt as soon as the check-in is done. Auto print." Implemented: a **"Auto-print check-in receipt"** checkbox in the RIGHT footer above Cancel/Confirm (`checkin-autoprint`), whose **default comes from a property Setting** (mockup `CI_SETTINGS.autoPrintReceipt`, sample = On) shown as "· default from Settings: On"; staff can **override per check-in** (state persists across redraws). On Confirm, the MOCKED toast reports "receipt auto-printed (MOCKED)" when ticked, "no receipt printed" when not. Related to but narrower than G6/CR-364-PRINT (that remains the full welcome-slip print effort). Verified iteration_9.

### D33 — B2B (GST) billing capture (v2.16)
Owner: "if it's a B2B billing … tick mark … then GST customer name and GST customer number needs to be captured. These are the two things." Implemented: a **"B2B (GST) billing"** checkbox in a LEFT-column **Billing** section (`checkin-b2b-toggle`, default unchecked). When ticked it reveals and **requires two fields — GST customer name (`checkin-gst-name`) and GST customer number/GSTIN (`checkin-gst-number`)** — added to readiness (`ciMissing`) so Confirm/ready-pill block until both are filled; the booking-facts "Bill to" flips to "Company (GST)". The B2B billing flow itself is the **existing, working design**; this only captures the two invoice fields. Verified iteration_10 (behaviour) + iterations 11–12 (RIGHT no-scroll invariant re-confirmed after footer/bill changes).

### RIGHT no-scroll invariant (maintained through D32/D33)
Adding the auto-print row briefly re-introduced RIGHT overflow; resolved by removing the redundant footer policy note, relaxing the `fitCheckin` cap buffer (−14→−8), and compacting `.ci-money` bill rows (padding 4→2, line-height 1.5→1.4). **Verified iteration_12: RIGHT `.ci-pane-body` scrollHeight ≤ clientHeight in BOTH baseline (a2/a5/a1) and paid-upgrade states; Confirm within the 1920×800 viewport; SGST/CGST still separate.** No JS errors; checkout `?bill=103` ₹2,677 regression unchanged.

Status: Check-In = **v2.16 working baseline** (v2.14 closed + D32/D33 additions). No new closure statement requested from owner for the additions; treat as settled unless the owner raises more Check-In items. Next: **New Booking** design review — now STARTED (§M).

## M. New Booking design review — STARTED (D34, 2026-06)
Owner authorized starting the Booking review ("yes, we can start looking at the booking part …
suggest what the first iteration will be before we start second iteration") and chose a **written
blueprint first** (build only after approval). This is PLANNING/design; Gate 2.6 stays OPEN;
Checkout v2.9 + Check-In v2.16 remain LOCKED; multi-room stays ON HOLD (§K1). Full blueprint:
`memory/plans/CR-385_BOOKING_V2_17_BLUEPRINT.md`.

### D34 — Booking first-iteration direction & scope (blueprint proposed as v2.17)
| Aspect | Owner-decided direction |
|---|---|
| Layout | Mirror the locked language: expand-in-place, two columns, **LEFT inputs → RIGHT live bill + pinned Save**. Checkout-style pills (white + dark ring, no black). Readiness strip → "Ready to book" pill (like Check-In D30). |
| **Room = TYPE only** | Booking books a **room TYPE from inventory, NOT a specific room number.** Room section = type pills + rooms count + **type-level availability for the dates** (e.g. "6 free · 2 OOO"), rate hint by type. The specific room number is assigned later at **Check-In** (existing D18 picker). No specific-room dropdown on Booking. |
| **Documents NOT here** | Guest ID/document capture stays at **Check-In** (per-guest ID cards, v2.16). Booking captures guest + stay + room type + optional advance + B2B GST only — no document capture, no room picker duplicated. |
| Advance | Possible at booking but **COLLAPSED by default** (most bookings have none). Expanded = Collect-now + Cash/Card/UPI pills + Txn/UTR (same as Check-In) + disabled **"Send payment link — Phase 2"** placeholder (future auto-update-on-paid). |
| Save actions | BOTH `Save booking` (→ Arrivals Today) and `Save & Check in now` (→ morphs into Check-In v2.16, where room number + documents are handled). |
| B2B (GST) | Optional tick → required GST customer name + GSTIN; flips "Bill to" to Company (GST). Same as Check-In D33. |
| Meal plan | Pills, **API-driven** (owner: "we have from API"). Room type selector = pills, **API-driven** (owner: "will be from API"). Mockup renders both from a sample config as if from the API. |
| Scope/guardrails | All MOCKED; replaces old placeholder `nbForm()` only; no `src/`/backend/.env/registry; Checkout v2.9 + Check-In v2.16 untouched. Re-verify RIGHT no-scroll when advance expanded. |

Meal-plan set and room-type list are **API-driven** (rendered from a sample config in the mockup).
Not yet built — awaiting owner go-ahead to implement v2.17.
