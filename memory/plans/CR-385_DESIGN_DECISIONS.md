# CR-385 — Design Decisions (Gate 2.5 FREEZE)

```
Frozen:   2026-09-18 — owner: "more or less I am okay with the design … close this gate, start impact analysis"
Amended:  Gate 2.6 — D17–D19 Check-In corrections; D20 mandatory owner walkthrough/sign-off before Booking
Mockup:   frontend/public/cr385-frontdesk-mockup.html · v2.18 — Check-In CLOSED at v2.14 (+D32/D33; booking-advance pass-through D35); Checkout v2.9 CLOSED; **Booking DESIGN CLOSED at v2.18 (§M D36, owner sign-off 2026-06)**; alert bar tidy+priority+popover (§M D37). NEXT expandable box: Extend Stay (recommended).
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
| 2 | New Booking: header / available room Book Room | **DESIGN CLOSED at v2.18 (§M D36, owner 2026-06)** |
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
| Booking design | **DESIGN CLOSED at v2.18 (§M D36)**; next expandable box = Extend Stay (then Modify Booking, then No-Show/Cancel) |
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
**BUILT as v2.17 and verified iteration_13 (frontend, 100%, no bugs)** — then refined to v2.18 (§ below).

### D35 — v2.18 refinements + cross-tab row-toggle (BUILT + verified iteration_14, 2026-06)
Owner reviewed v2.17 and requested three changes; also flagged that expanded table rows didn't
collapse on re-click. All built and verified (iteration_14, frontend 100%, no bugs).
- **R1 Room × Rate-plan GRID** (owner chose Option B, "Executive with all plans together"): the
  separate room-type + meal-plan pills are replaced by ONE matrix (`booking-rate-grid`) — rows = room
  types, columns = rate plans, each cell (`booking-cell-<type>-<plan>`) = ALL-IN price/night (room
  base + meal supplement). One tap selects both type + plan. Sold-out type row greys out. RIGHT bill
  still itemises room vs meal-plan, SGST/CGST separate.
- **R2 B2B (GST) relocated** into the GUEST block under name/phone (`booking-b2b-row` now inside
  `booking-guest-section`); the separate bottom Billing section removed.
- **R3 Advance carries into Check-In**: `nbSave` writes `a.prepaid=f.advance`; `ciContext` reads
  `line.prepaid` so Check-In's "already paid" reflects the exact booking advance (verified ₹1,000 →
  balance = total−1000). This is the ONLY Check-In change; rest of v2.16 stays locked.
- **Cross-tab row-toggle fix** (workstation-level, no renderer change): `rowHTML` onclick now
  collapses (`S.open=null`) when the row is already open, across Arrivals/Departures/In-House
  (Rooms tiles already toggled). Clicking a different row still swaps in one click; action buttons
  (stopPropagation) and Esc unaffected. Previously rows only closed via the in-expansion Close/✕/Esc
  — now consistent with the Rooms tiles.
- Verified iteration_14: grid prices, cell→bill live update, B2B gating+placement, advance
  pass-through, no-scroll RIGHT (collapsed sh157/ch157 btn505; advance sh340/ch340 btn688), toggle
  on all four tabs, checkout ?bill=103 ₹2,677 / ?bill=107 and check-in ?checkin=a2 regression clean,
  zero JS errors. Checkout v2.9 untouched; Check-In v2.16 only gains the advance pass-through.
- Minor open note (reviewer): a fully sold-out type greys all its rate-plan cells (correct — no room
  of that type is bookable on any plan); revisit messaging at backend wire-up. Not blocking.

Status: New Booking = **v2.18 — DESIGN CLOSED (owner sign-off 2026-06): "Booking is fine. We can close the design for the booking."** See D36/D37 below.

### D36 — New Booking design CLOSED at v2.18 (owner sign-off, 2026-06)
Owner reviewed v2.18 and closed the Booking screen design. Final Booking baseline = **v2.18**:
two-column expand-in-place; LEFT Guest (with B2B/GST inline) → Stay → Room×Rate-plan GRID; RIGHT
live bill (room + meal itemised, SGST/CGST separate) → collapsed advance (Phase-2 payment-link
placeholder) → advance-paid + Bill-to(GST) lines → balance → readiness → Save / Save & Check in now.
Room TYPE only (room number + documents at Check-In); advance carries into Check-In as already-paid.
Locked like Checkout v2.9 & Check-In v2.16 — do not modify without an explicit new owner request.

### D37 — Alert bar tidy + priority + actionable "+N more" (2026-06, verified iterations 15–16)
- "+N more" opens a popover (`alert-popover`) listing ALL alerts, each a clickable shortcut
  (`alert-item-<i>`); toggle-close, outside-click-close, no duplicate nodes.
- Alerts sorted MOST-URGENT-FIRST: overdue check-outs → extended housekeeping → out-of-order →
  no-show (HK by longest duration). Popover rows carry a category tag; overdue+HK get a red
  "urgent" accent.
- Alert links precise (guest + room); expired-arrival alerts open the Mark No-Show panel for that
  exact booking.

### Next expandable box to design (recommendation)
Big three done (Check-In v2.16, Checkout v2.9, Booking v2.18). Remaining expandable boxes are still
old read-only placeholders in `expansion()`:
- **Extend Stay** (`kind='extend'`) — RECOMMENDED NEXT. Frequent front-desk action, currently a bare
  "—" placeholder, and naturally reuses the language we've built (date picker → live extra-nights ×
  rate → SGST/CGST → collect-now Cash/Card/UPI pills → balance → readiness). Real design substance:
  availability conflict for the new dates, rate for extra nights, collect now vs at check-out.
- **Modify Booking** (`kind='modify'`) — close second; can reuse the Booking grid/date components.
- **Mark No-Show + Cancel Booking** — smaller confirmation-style pair (policy/forfeiture, refund,
  source notification); good to do together.
- **Room detail** (Rooms-tab tile) — informational; lower priority.
Recommendation order: Extend Stay (v2.20 done) → Modify Booking (v2.21 done, iteration_20) → No-Show/Cancel pair (v2.22 done, iteration_21) → Room detail (LAST remaining box).

### D39 — Consistent Bill View standard (DOCUMENTED ONLY, not applied · 2026-06)
Owner asked to keep this as a documented standard for now (no code changes). Standard vocabulary for
**in-stay charge/collection** screens (screens that add a charge on top of an existing folio):
`Pending balance · folio` → charge lines (+ discount, SGST, CGST) → **Total payable** (pending +
charge) → `Collect now · optional` (amount + Cash/Card/UPI + UTR) → **Balance remaining** (stays on
folio). Extend v2.20 already complies. NEW screens (Modify, future incidental/room-service posting)
adopt it from the start. Booking (no pending) and Check-In (advance is a deduction, no pending) keep
their own framing. LOCKED Check-In v2.16 / Checkout v2.9 / Booking v2.18 wording is NOT changed
without a separate explicit owner request (a wording-only consistency pass was offered and deferred).

### D38 — Extend Stay BUILT as v2.19 (verified iteration_17, 2026-06)
Owner approved; built as the next expandable box. Two-column expand-in-place (LEFT extension
details / RIGHT extension bill + Confirm), locked language. New check-out (min cout+1) → live extra
nights × room-type rate → SGST/CGST separate → extension total → folio-after. Same-room availability
check; conflict (mock: even room + newCout>cout+1) warns + auto-suggests/pre-selects first free
same-type room (★) and REQUIRES the move before Confirm. Optional Discount (percent/amount + reason;
gates Confirm; rate itself not editable). Settle = Add to folio (default) or Collect now
(Cash/Card/UPI + UTR). Verified 100% (iteration_17); no-scroll RIGHT worst-case 378/378, btn 770.
Closed screens untouched. NEXT expandable box: **Modify Booking**, then No-Show/Cancel pair, then
Room detail. Backlog: consistent discount across Booking (closed) + Extend + Checkout.

### D40 — No-Show + Cancel confirmation pair BUILT as v2.22 (2026-06, verify iteration_21)
Owner reviewed the blueprint (`CR-385_NOSHOW_CANCEL_V2_22_BLUEPRINT.md`) and chose a **confirmation
dialog** (not the tall two-column Extend/Modify form) "seeing the nature of the operation". Both
`expansion(o,'noshow')` and `expansion(o,'cancel')` rebuilt in the compact `.exp/.exh/.exb/.exf`
shell with a 2-col body (inputs left, read-only money outcome right) and a footer consequence hint +
`[Back]` + destructive primary. Decisions:
- **D40-a** Confirmation dialog form factor (short, no internal scroll).
- **D40-b** NO frontend forfeiture/penalty picker — "backend takes care, we just cancel". Frontend
  shows the outcome read-only only.
- **D40-c** Money-outcome card: `Prepaid / advance` → `penalty/forfeited` (with **separate SGST +
  CGST** sample 2.5% each) → **Refund due**; when refund>0 a `Refund … as` [Refund to guest] /
  [Folio credit] toggle, labelled **Phase-2 mock**. `prepaid=0` collapses to "Nothing paid — no
  refund".
- **D40-d** Non-OTA **No-Show Confirm stays disabled** (BQ-385-04) with the "Cancel booking instead"
  path — unchanged. OTA (booking.com/makemytrip) enables Confirm.
- **D40-e** Cancel keeps a **Reason** select whose list is **configuration/API-driven**
  (`CANCEL_REASONS` mock: Guest request / No-show / Duplicate / Payment failed / Other) + a Notify
  toggle (source/guest) + optional audit note. Reason required to enable Confirm (defaults to first).
- **D40-f (Variant A, owner-approved)** prepaid seeding = **booking amount × nights for prepaid/OTA
  bookings** (`pah=false`), **₹0 for pay-at-hotel** (`pah=true`). Sample penalty (MOCKED,
  backend-owned in real life): retain **first night** for no-show / most cancel reasons; ₹0 for
  Duplicate & Payment-failed; capped at prepaid. Added one demo expired-OTA-prepaid arrival
  (`ans` · F. Almeida · MakeMyTrip · Suite · 14→16 Sep) so the enabled No-Show + refund outcome is
  visible.
Also added a review hook `?open=<id>:noshow|cancel` (mirrors `?checkin=`/`?booking=`). New testids per
blueprint §9. LOCKED screens (Checkout v2.9 / Check-In v2.16 / Booking v2.18) untouched. Mockup version
bumped to **v2.22**. NEXT (and last) expandable box: **Room detail**.

### D40.1 — v2.22 refinements (reveal-scroll + EITHER/OR source rule, verified iteration_22)
Two owner-requested corrections after the first v2.22 build:
- **Reveal-scroll**: opening Cancel/No-Show from a lower row now auto-scrolls the panel so the whole
  dialog (header + footer primary button) is visible, matching Booking/Check-In/Extend/Modify. Added
  `fitConfirm(el)` (same reveal pattern as fitCheckin/fitExtend/fitModify) called from `render()` for
  `[data-testid=noshow-dialog],[data-testid=cancel-dialog]`. Verified row-6 (H. Shetty): panel
  scrollTop 0→196, header 385–425 and confirm 697–731 both inside panel 162–800.
- **EITHER/OR by source (never both)**: a booking offers **Mark No-Show for OTA** (booking.com /
  makemytrip) OR **Cancel for non-OTA** (Direct/Walk-in/Goibibo), never both. Centralized in
  `nsOrCancel(o)=isOTA(o)?'noshow':'cancel'` and applied at every entry point: expired-row action
  button, kebab (Modify + one of No-Show/Cancel), alert-bar 'stay expired' links, and global search.
  The old disabled-No-Show-for-non-OTA button is gone (non-OTA simply shows Cancel). Verified 100%
  (iteration_22), zero JS errors.

### D41 — Room Detail v2.23 + Rooms-tab control cleanup v2.24 (verified iterations 23–24)
Owner goal: a property manager should run EVERY front-desk operation from the Rooms tab, and the info tiles must be complete.
- **v2.23 Room Detail (flat cell grid kept, gaps filled):** every status now shows Guest (name·masked phone·A/C), Stay (night X of Y), Balance, Source·booking, a **Housekeeping** cell for every status (Clean/Dirty/In-progress + set-by + assignee, read-only) with a MOCKED **"Manage in Housekeeping →"** link (crew assignment/checklists belong to CR-365, not front desk), and a **Next arrival/turn** line (named guest if a booking is assigned to that exact room, else "none assigned · N {type} arrivals ahead", plus a "Turn today" chip for leaving-today rooms with a same-day arrival). Rate now from the rate table.
- **New actions so all ops are reachable:** Extend on occupied/occupied·HK; a kebab (⋮) on booked with Modify + (No-Show if OTA / Cancel if non-OTA), keeping Check In / Bill / Book Room / HK / OOO. Reuses existing panels via roomDetail() routing (extend→guest, modify/noshow/cancel→linked arrival).
- **Data fix:** each booked room linked to a distinct future/today arrival so Check-In/Modify/Cancel resolve a real booking; added rooms hkBy/hkAssignee; fixed guest[0] check-out (was before check-in).
- **Reveal-scroll:** room-detail added to fitConfirm() so opening a low tile brings the panel fully on-screen.
- **v2.24 controls cleanup (owner: "too many pillars"):** removed the Density/Compact toggle entirely (always Comfortable); moved Group-by off its own row of heavy black pills into a single light **segmented control** on the top filter row — **Room no. · Type · Area**. **Area** = floor derived from the room number (1xx=1st Floor, 2xx=2nd Floor) since the board has no floor field; the real room **`title`/area** field is not yet surfaced (wire later if backend confirms `title` = area). Rooms tab is now one filter row + group headers.
- CR-365 dependency (owner asked): CR-365 = PMS Housekeeping Workflow module (HK task queue/assignment/checklists/timers; backend endpoints already shipped, FE not built). Room-status changes are front-desk (here); crew assignment/checklists stay in CR-365. NEXT: owner review of v2.24; no further expandable boxes remain (Room Detail was the last).

### D42 — Real board shape + section grouping + Turns filter, v2.25 (verified iteration_25)
Backend shared the real room payload (thegoankitchen): `{restaurant_table_id, table_no:"r1", title:"patal lok", aiosell_room_code:"suite", manual_status, display_status, is_occupied, hk_assignee, room_operational_status_at, guest{name,phone,email,booking_id,order_id}, reservation}`.
- **Key finding:** `title` is a SHARED **section/wing** label (owner-confirmed it repeats), NOT a floor and NOT a per-room name; the payload has no floor field and table_no is "r1" (no floor encoding). So the earlier number-derived "1st/2nd Floor" was wrong.
- **Wired:** mock room model now mirrors the real shape (table_no, title=section, code=aiosell_room_code, display_status/manual_status/is_occupied, hk_assignee, room_operational_status_at). `hk_assignee` and `room_operational_status_*` are REAL fields — our Housekeeping cell maps to them. Grouping by **Area now groups by `title` (section)**; mock sections Patal Lok/Baga Wing/Anjuna Block/Palm Court (10 rooms each) stand in until the real `title` list is available. Section is shown in the Room-Detail header (e.g. "Room 101 · Executive · Patal Lok").
- **Turns today filter (owner asked why):** a "turn" = room where the in-house guest checks out today AND a same-type arrival comes in today — the highest-pressure same-day clean. New Rooms status chip 'Turns today N' filters to exactly those rooms (reuses the isTurn/'Turn today' chip logic) so the desk + HK prioritise them and cut check-in waits.
- **Held:** Floor KPIs deferred (no real floor/area dimension exists; would only reflect mock sections). Next real step: replace mock SECTIONS with the actual `title` values from the board API.

### D43 — CR-385 FRONT-DESK DESIGN GATE CLOSED at v2.25 (2026-06)
All front-desk work panels are now designed and agent-tested: Checkout v2.9, Check-In v2.16, Booking
v2.18 (LOCKED baselines) + Extend v2.20, Modify v2.21, No-Show/Cancel v2.22, Room Detail v2.23, Rooms
controls v2.24, real-board-shape/sections/Turns v2.25. No expandable panels remain. Testing agent
green through iteration_25. **Gate CLOSED — no further design changes without a new explicit request.**
Handed to QA: `plans/CR-385_QA_TEST_PLAN.md` (full version walkthrough + hooks + invariants + mocked
list). Session handover: `handover/CR-385_SESSION_HANDOVER.md`. Provenance: agent-tested only; user
acceptance still pending. Next phase = QA review, then real-data wiring (section `title` list,
`guest{}` payload, `hk_assignee`), then Section KPIs / refund processing / discount unification;
CR-365 Housekeeping is a separate module.


### D44 — QA-audit closure, v2.26 (2026-06) — design gate items + minimal money/seed sanity (verified iteration_27)
Source: plans/CR-385_QA_AUDIT_REPORT.md (31 findings) → plans/CR-385_QA_FIX_PLAN.md. Owner split: **19 design items fixed in the mockup + minimal money/seed sanity**; the remaining validation/data items are handed to the impact-analysis / implementation track as acceptance criteria (see D44-h).
- **D44-a (Decision A) Locked screens re-opened for figures & validation only** — Checkout v2.9 → **v2.10**, Check-In v2.16 → **v2.17**, Booking v2.18 → **v2.19** (guards only). No layout change; RHS/LHS structure (D12–D15) preserved.
- **D44-b (Decision B) GST on penalty is charged on top**: Refund due = Prepaid − Penalty − (SGST + CGST on penalty); a "Total deducted" line makes the rows add up. SGST/CGST stay separate lines.
- **D44-c (Decision C) Bill partial-payment state**: "Amount received" input (default = Grand Total) + "Outstanding" line; **Credit** sets received ₹0 and marks "billed to company / folio"; Checkout disabled when the amount is invalid or > grand.
- **D44-d (Decision D) Two-step Checkout**: first click arms the button ("Confirm checkout · ₹X", danger colour), second click checks out; auto-reverts after 3 s. No modal.
- **D44-e (Decision E) Late arrival** charges the full booking; the Late chip states "full booking charged".
- **D44-f (Decision F) Glossary**: **Check-In** (noun/title, buttons), **check in** (verb: "Save & check in now"), **Bill** (UI; "folio" only in backend-facing text), **Checkout**, **In-House**, **Housekeeping** (HK in badges/KPI only), **Out of order** in detail cells. Dismiss = **"✕ Close"** on every header; footer secondary = **"Close"**; the word **Cancel** is reserved for cancelling a booking ("Cancel booking").
- **D44-g Single source of truth for money (mock)**: `RATE` + `bookingCharge(o)` = (type rate + plan supplement) × nights; `prepaid` stored once per record (Variant A refined: prepaid/OTA = **total incl. GST**, pay-at-hotel = ₹0 — hence F. Almeida prepaid ₹9,450 → refund ₹4,725); `folioOf(g)` drives both the row "Balance" and the Bill (room block, F&B, transferred, grand). Arrivals column = "Booking ₹" (total), Departures/In-House = "Balance". Guests seed: no same-day stays; `type`, `pah`, `prepaid`, `payMethod` on every guest. Per-bill drafts (`BILL_D`) — adjustments/payment never leak between guests.
- **D44-h Implementation-track acceptance criteria (not mock work)**: row balance = bill grand total; collected ≤ payable; check-in ≥ today; adults ≥ 1; leaving-today excludes overdue; one booking-charge source; refund arithmetic per D44-b. Minimal versions of the guards were added to the mock so it is not misleading (QA-004/005/006, QA-020).
- **D44-i Consistency tokens**: `money()` en-IN, 2 dp when fractional, sign before ₹; tax rows SGST → CGST with label "· 2.5%" everywhere; `plural()` helper; `fd()` dates everywhere (no ISO on tiles); No-Show red at row/kebab/dialog; refund-mode & notify toggles use the payment pill component; Room Detail actions in a footer; `--mu` #767676; global `:focus-visible`; SVG icons replace emoji; `VERSION` const; review hooks route through `nsOrCancel()`.
- **D44-j Responsive**: Check-In/Booking payment reference field appears only after a method is chosen → right pane fits at 1366×768 without internal scroll; tab sub-lines ellipsise; search min-width 200px; compact row actions ≤ 1100px.
- Provenance: agent-tested (iteration_27: 24/27 pass, then 3 remaining items fixed and self-verified). **Owner visual acceptance pending.**


### D45 — Phase-2 backlog notes (2026-06)
- **D45-a Shift Summary card (Phase 2, not built)**: small end-of-shift card for the receptionist handover — today's check-ins, checkouts, no-shows/cancellations, cash / card / UPI collected, outstanding balances, open HK/OOO. Entry point: user menu › "Shift handover note" (already a mock toast). Data source: backend day-close / shift report; do not derive from front-end counters in production.
- **D45-b Real section titles**: Rooms › Area grouping now derives its groups from the room records' `title` (normalised, title-cased, "No section" bucket for null). The mock `SECTIONS` array is SEED ONLY — swap it for the real board title list (only "patal lok" is confirmed) or wire the API and the grouping follows automatically.
- **D45-c Acceptance-criteria hand-off**: plans/CR-385_IMPLEMENTATION_ACCEPTANCE_CRITERIA.md (AC-01…AC-21) + shareable /cr385-acceptance-criteria.html with tick-boxes.

### D46 — Owner answers to Impact-Analysis questions (2026-09-19) — binding
- **D46-a Booking charge source**: backend provides the aggregated booking charge on the reservation (incl. paid-upgrade line). FE displays only; Check-In amount is read-only.
- **D46-b Refunds**: OTA no-show → refund processed by the OTA (note only). Cancel → booking cancelled, refund settled offline in Phase 1. Refund arithmetic/processing (D40 money card) = **Phase 2**. AC-05 re-scoped accordingly.
- **D46-c Checkout balance**: no checkout with an outstanding balance. Remainder may be assigned to **Credit** (configured payment method; tile shown only when enabled), then checkout. Partial cash/card/UPI stays blocked. AC-08 refined.
- **D46-d Source rule**: non-OTA = Cancel only (BQ-385-04 closed, no backend change).
- **D46-e Architecture**: Option A — new workstation route side-by-side; old pages removed later (FU-385-C). Planning tab-/module-wise after the impact gate.
- **D46-f Phase 1 scope**: room upgrade (D23), auto-print (D32), advance at booking (D34) are all Phase 1.
- **D46-g Mockup v2.26 accepted** by owner 2026-09-19 (visual acceptance closed).
- **D46-h DEC-8 corrected**: Modify ₹0 is a *latent* defect (callers never pass `rateplans`; `amount_after_tax` is omitted today) — P0 intake withdrawn. Live gap = Modify never updates the amount after a date change → resolved by D46-a (backend recomputes on PATCH; BQ-385-08). Dead rate code in ModifyBookingDialog to be removed in CR-385 M3.
- **D46-i DEC-7 (2026-09-19)**: **Server-authoritative snapshot.** Server returns list + tab counts + `business_date` in one response (BQ-385-12); FE displays only — no client counting, no client date logic (`localDate`/`toISOString` removed from PMS pages). Server runs IST; the evening drift was an FE UTC bug (G-17). AC-12 re-worded: tab number = `counts.*` from the same server snapshot as the list.
- **D46-j Split tender (2026-09-19, owner clarification of "partial payment")**: "Partial payment" = **split tender** (one bill, several methods — e.g. half card / half UPI), exactly as POS F&B billing. It **must** be available on room checkout. Under-payment (received < grand total) stays blocked (D46-c); Credit allowed. **Design gap:** mockup v2.26 Bill settlement lacks a "Split" tile → add Split rows (method + amount + Txn/UTR for card/UPI, rows must sum to grand total) in the next mockup revision (v2.27) — no lock reopened, additive. Code: the checkout drawer already shows Split + Credit/TAB in room mode (D4 / OD-P3-14 Dashboard parity) — earlier note "Credit hidden in room mode" was wrong; the hide applies only to the Hold-context `allowedMethods` prop. B-8 risk = fitting the panel with Split rows into the 560 px expansion (D5 spike) + POS regression on any edit.

### D47 — Mockup v2.27 scope approved by owner (2026-09-19) — Gate 2.5 re-entered (additive, no lock reopened)
- **D47-a Split tile = mirror POS F&B Split "By Payment" exactly** (CollectPaymentPanel L2810–2939): one fixed row per enabled method (Cash / Card / UPI — no dropdown, no add-row), amount inputs, on-blur clamp to remaining and auto-fill of the other row when exactly 2 rows, Card row shows "Txn ID · last 4 digits" (numeric, required when amount > 0), "Remaining ₹X" line, Checkout disabled while rows sum < grand total. "By Station" toggle is F&B-only — not shown for rooms.
- **D47-b No under-payment**: free-typed "Amount received" removed. Checkout disabled while tendered < grand total with reason "Collect the full amount or select Credit". Over-tender blocked.
- **D47-c Credit = TAB (same thing)**: a plain method tile — select Credit → Checkout. Bills the guest's TAB using the name + phone already on the booking; **no company/account field, not a Split leg**. BQ-385-15 Q4 (mixed split + credit) withdrawn.
- **D47-d** Two-step Checkout (arm → confirm) unchanged.
- **D47-e** AC-08 rewritten in ACCEPTANCE_CRITERIA (.md + .html).
- **D47-f** Rooms › Area seed = real titles from probe: ground floor · first floor · 2nd floor · 3rd floor · patal lok.
- **D47-g** No-Show / Cancel refund arithmetic card gets a "Phase 2" ribbon (DEC-2) — kept in mockup, not built in Phase 1.
- Out of scope: Bill Layout B, Room block D15, tab strip, Check-In v2.17, Booking v2.19 (locks stay closed).
- **D47 status 2026-09-19**: implemented in mockup **v2.27** (`VERSION='v2.27'`), self-verified (QA_TEST_PLAN §6b, 12/12). Design guidelines consulted: `/app/design_guidelines.json` (settlement block). Note: POS auto-fill of "the other row" applies only when exactly 2 rows exist; with 3 fixed rows (Cash/Card/UPI) it does not trigger — same as POS. Split state panel = 352–395 px (over the 260 px guideline budget) but fits the 560 px row without scroll (AC-19 holds).
- **D47-h Split everywhere (owner 'a', 2026-09-19)**: Split is a method tile at **every** point where money is taken — Bill/Checkout (full amount) **and** the four advance / collect-now points: Check-In, New Booking advance, Extend Stay, Modify. Advance points keep their nature (optional amount ≤ payable; remainder rolls to the bill); Split rows must total the typed amount; Card row needs Txn ID · last 4; **no Credit at advance points** (nothing is collected). Implemented via shared helpers `payPills()` / `payMissing()` (one rule, one renderer); advance Split uses a compact 3-column grid so the Check-In right pane still fits 1366×768 (AC-19: 342/342). Self-verified on all five surfaces, 0 JS errors — QA_TEST_PLAN §6c.
- **Gate 2.5 (design) status 2026-09-19**: v2.27 **complete, self-verified; owner visual acceptance pending**. Design locks unchanged: Checkout v2.10 · Check-In v2.17 · Booking v2.19 · Extend v2.20 · Modify v2.21 (all additive edits only). Design gate is closed for edits until owner review; work returns to **Gate 2.6 (impact analysis) — status: analysis complete, BUILD BLOCKED, waiting for backend replies to BACKEND_BRIEF_CR-385_MASTER.md (BQ-385-08/09/10/06/12/11/14/15/01/03)**.
- **Owner acceptance — mockup v2.27 accepted 2026-09-19** ("go ahead"): Split and Credit flows confirmed. Testing-agent QA audit across all four tabs authorised (iteration_28).
- **Gate 2.5 CLOSED 2026-09-19** — v2.27 owner-accepted; testing-agent four-tab audit iteration_28 29/30, both findings (P1 pane overflow, P3 title casing) fixed and re-measured (QA_TEST_PLAN §6d). Programme returns to Gate 2.6: analysis complete — BUILD BLOCKED, waiting for backend (MASTER §1).

### D48 — Owner answers to post-verification questions N1–N5 (2026-09-20) — binding
- **D48-a Rate source (N1)**: server prices when the FE omits `rate_per_night`; FE never sends a rate. Probe shows the server currently stores ₹0 → **BQ-385-16 (P0) opened**; Direct booking build (M1 New Booking) waits for it.
- **D48-b pah badge (N3)**: `pah` applies to OTA and non-OTA (balance collected at hotel). Badge: **Prepaid** when `charge.prepaid_amount > 0`; else **PAY AT HOTEL** when `pah`; **Advance ₹X** chip additionally when `charge.advance_payment > 0`. AC-03 wording updated accordingly.
- **D48-c B2B at Check-In only (N2)**: remove the "B2B (GST) billing" toggle from New Booking (v2.19 D35) → mockup **v2.28** (additive removal, Booking lock otherwise intact); Check-In keeps firm name + GST no. BQ-385-10 B2B fields dropped.
- **D48-d Board format (N4)**: `{meta, auto_hk_on_rm_checkout, rooms}` is final. ~~FE `roomStatusTransform` must accept it before the backend build reaches production → BUG intake.~~ **Corrected 2026-09-20:** the old payload was already `{auto_hk_on_rm_checkout, rooms}`; the new build only adds `meta`. `fromRoomStatusBoard` was run against both payloads (5/5 rooms, counts correct) → no regression, no hot-fix, no BUG intake. `meta.business_date` read → M4 plan.
- **D48-e Sandbox (N5)**: owner allows use of any checked-in room; sandbox currently blocked by 5 overdue stays → reset requested from backend.
- **D48-c status 2026-09-20**: implemented in mockup **v2.28** (`VERSION='v2.28'`): Booking draft has no `b2b/gstName/gstNumber`; toggle, GST inputs, "GST" progress chip and "Bill to (GST)" bill line removed; replaced by a one-line note `booking-b2b-note` ("captured at Check-In, not at booking"). Check-In v2.17 B2B block untouched. Booking lock v2.19 → **v2.28** (subtractive edit under owner decision N2). QA_TEST_PLAN §2C and AC-07 wording updated.

### D49 — Credit = TAB checkout verified live; D6 closed; D8 opened (2026-09-20)
- Backend answered N6 with the **full live FE body** for `order/order-bill-payment` (`order_id` string · `payment_mode:'TAB'` · `payment_status:'success'` · `paid_room:'yes'` · zero-filled discount/loyalty/coupon/tip fields · `cust_name/cust_mobile/name/mobile`; missing fields → 403 = validation, not RBAC). Owner authorised settling sandbox order 1232582 with it.
- **Verified (probes G1–G4, `evidence/CR-385/probes_2026_09_20/`)**: 200 "Room payment received via TAB" → order `paid/TAB/delivered`, LR line `checked_out`, reservation `departed`, `counts.in_house 0`, room 8525 `hk` unoccupied. **BQ-385-15 VERIFIED · D6 CLOSED · N6 CLOSED.** Design impact: none — Credit tile stays a plain TAB method (D47-c); the FE will send exactly this body through the existing `CollectPaymentPanel` (no new payload code).
- **New D8 (P1 money, backend)**: ledger row = ₹3,300 for a ₹3,490 GST-inclusive settlement; `charge.balance_due` / `remaining_room_balance` remain 3,490 after departure; `advance_payment` not updated. Departures "true balance" (AC-04) and Night Audit outstanding would be wrong until fixed → Credit tile **contract un-blocked, amount blocked on D8**. Also D3+: folio `room_price` basis flips (GST-incl. after check-in, pre-GST after extend).
- Programme status: Gate 2.6 OPEN (owner has not said "close"); money surfaces still blocked by D1 D2 D3(+) D4 D8 + BQ-385-16; non-money surfaces buildable. Sandbox empty.

### D50 — Backend build 3 verified: money contract frozen for implementation (2026-09-20)
- Backend build 3 (`evidence/CR-385/backend_replies/re_fe_2026_09_20.md`) independently re-verified end-to-end (`evidence/CR-385/probes_2026_09_20_gate4/PROBE_REPORT.md` build-3 section): BQ-16, D1–D13 all fixed. Backend blockers **B-1, B-3, B-4, B-5, B-6 = DELIVERED · VERIFIED**. Remaining blockers: B-7 (open-bug smoke), B-8 (D5 spike), B-9 (owner "close Gate 2.6").
- **Money contract (binding for Gate 4 code):** `charge.*` is the only source for rate / GST / advance / balance (AC-01, AC-03, AC-04). **Cleared** ⇔ `payment_status === 'paid' && charge.balance_due === 0`. FE never reads `balance_payment` (legacy, rent-only historical) nor folio `remaining_room_balance` (lags after TAB). `charge.advance_payment` = **cumulative paid so far** → D48-b "Advance ₹X" chip only on pending / in-house rows (label "Paid so far ₹X" on in-house). Upgrade appears as a folio line `Room upgrade: <reason>` (item_type OTHER) → Bill expansion ROOM block lists it under the room line (D14/D15 unchanged). Check-in sends `booking_for=Individual`; TAB sends `payment_amount = charge.balance_due` through the existing `CollectPaymentPanel` body.
- **Owner decisions pending (N7–N9):** N7 early check-in (backend allows check-in before the stay date) — allow from Front Desk? · N8 extension nights priced at the held check-in rate vs rate table · N9 check-in into an HK room allowed by backend → picker warn/block? Default until decided: FE mirrors backend (allow) but surfaces a warning chip; no new blocker.

### D51 — Gate 2.6 FINAL re-validation (IA Rev 4) + Master Checklist (2026-09-20)
- Owner asked for a complete re-check of the Impact Analysis against today's reality and a single checklist so nothing is missed at planning/implementation. Owner rule restated: **agent never closes a gate; owner closes with explicit words** ("not jump gate … follow agent prompt rule").
- Delivered: `impact/CR-385_IMPACT_ANALYSIS_REV4_GATE_2_6_FINAL.md` — alignment report (12 changes since Rev 3), proof re-run, gap register G-01…G-44 re-statused + **12 new gaps G-45…G-56** (cumulative `advance_payment`, forbidden folio fields, N7/N8/N9, LR window/`view=all`, board `meta`, BUG-418 placement, `booking_for`, server GST slab, multi-room parked), backend gaps B-1…B-10 final, blockers B-1…B-9 final (only B-7 process / B-8 Gate-3 / B-9 owner remain), risks R23–R26 new, AC coverage, §7 recommendation "Gate 2.6 can be closed — owner decides".
- Delivered: `/cr385-master-checklist.html` — 9 sections (P planning · X cross-cutting · M0–M6 per module · S B-7 smoke · R regression/release · O owner decisions), ~95 tick-boxes with evidence fields, browser-persisted, export/import; linked from impact-questions + backend-briefs pages.
- Registry decisions put to owner as plain yes/no (checklist §O): O-1 N7 · O-2 N8 · O-3 N9 · O-4 close BUG-384/404/413 by decision · O-5 BUG-418 inside M6 · O-6 transform-field ack (OD-385-12 exception) · O-7 "close Gate 2.6". Defaults recorded if silent. **No gate flipped.**

### D52 — Owner decisions N7 / N8 / N9 (2026-09-20) — binding
Owner walked through the three open product questions (options a/b each) and answered: **N7 = b · N8 = b · N9 = "check-in can happen while housekeeping"** (= allow, warn). Supersedes the D50 "default = mirror backend + warning chip" for N7 and N8.

| # | Question | Owner decision | FE rule (Gate 4) | Backend impact |
|---|---|---|---|---|
| **N7** | Backend accepts a check-in before the stay date (20 Sep check-in for a 10 Oct stay). | **(b) Block early check-in.** Check-In is allowed only when `meta.business_date >= checkin_date`. Staff who genuinely need to check the guest in early must first **Modify Booking** (move the check-in date to today), then check in. | Arrivals rows dated after `business_date` (Tomorrow / Upcoming chips, search results, booked-room tile) render `Check In` **disabled** with tooltip *"Arrives <date> — modify the booking dates to check in today"*; kebab still offers Modify. Compare **server** `meta.business_date` only (G-17/G-51) — never the browser clock. No backend change requested (FE guard; backend acceptance stays as-is). | none |
| **N8** | Extension nights are priced at the **held check-in rate** (build-3 run: 8,600 held vs 7,400 in the rate table for that night). | **(b) Price extension nights from the rate table** for the actual extended dates, not the held rate. | Extend Stay shows the server `charge` figures only (no client maths, D50). Until the backend delivers, the RIGHT panel carries an info note *"Extra nights priced at the held rate — rate-table pricing pending BQ-385-17"*. | **BQ-385-17 (P1) opened** in MASTER v1.7 — `room-extend-stay` must price the added nights from Aiosell for those dates; original nights keep their rate (+ upgrade). **M4 Extend Stay is backend-blocked again (B-4 re-opened ◐)** until delivered + verified. |
| **N9** | Backend allows check-in into a room still in Housekeeping (board → `occupied_hk`). | **Allow — "check-in can happen while housekeeping."** | Room chooser lists HK rooms as eligible with an **HK badge + duration** ("HK · 40 min · assignee") and an amber inline warning *"Room is still being cleaned"* on selection; Confirm stays enabled. After check-in the tile shows `occupied_hk` (existing board state) and the HK chip persists until Mark Clean. No block, no manager auth. | none |

- Effect on gaps/registers: G-48 → decided (block), G-49 → decided (rate table, BQ-17), G-50 → decided (allow + warn). OG-PMS-023 closed by decision; OG-PMS-024 → backend ask BQ-385-17. Checklist O-1/O-2/O-3 ticked; M3-02 / M3-09 / M4-05 wording updated to the decided rules.
- Gate status unchanged: **Gate 2.6 OPEN** — owner has not said "close Gate 2.6". Money surfaces: all buildable except Extend Stay pricing (BQ-17).

### D53 — N7 / N8 delivered by backend as property settings; verified (2026-09-20)
Backend reply `evidence/CR-385/backend_replies/n7_n8_2026_09_20.md` shipped both rules server-side the same day; independently re-verified (`evidence/CR-385/probes_2026_09_20_n7n8/PROBE_REPORT.md`, bookings 175/176).

| # | Backend delivery | Verified | FE rule (supersedes the D52 "FE rule" column) |
|---|---|---|---|
| **N7** | Setting **`allow_early_checkin`** (alias `pms.allow_early_checkin`), default **`false`** → check-in refused **422** "Early check-in is not allowed for this property (stay check-in <d> is after business date <d>)"; reservation `charge` untouched on refusal. | ✅ 422 off / 200 on (10,100) | Read `settings.allow_early_checkin` from `v1/profile`. When **false**: `Check In` disabled for rows with `checkin > meta.business_date` (tooltip → Modify dates first). When **true**: button enabled (early check-in allowed by property policy). Always surface the server 422 text verbatim if it still fires. Server is the source of truth; the FE guard is UX only. |
| **N8** | Setting **`extend_rate_mode`** = **`calendar`** (default) \| `held`. calendar = held rate for the old nights + CM rate per added night, blended into one `rate_per_night`; CM miss → held fallback; shorten = held math. | ✅ calendar 17,500 (rate 8,000) · held 18,700 | Extend Stay RIGHT panel shows `data.charge` only. On extended stays label the rate **"avg. rate / night"** and never multiply it back. No "pending BQ-17" note needed. **BQ-385-17 CLOSED.** |
| **N9** | No change (owner: allow). | — | As D52: HK rooms selectable, HK badge + amber note. |

- **B-4 fully closed again**; **no open backend ask**. New money question **N11** to backend (MASTER v1.8): GST slab must not flip because of the blended rate (D10 class); optionally expose `rate_source` per night.
- **Settings write:** only multipart `data={"basic":{…}}` on `update-settings` (raw JSON silently ignored) — already how BQ-11 was verified; add to the data-contract sheet (P-08).
- **Owner decision O-8 (new):** backend asks the FE to "wire settings UI" for `allow_early_checkin` / `extend_rate_mode`. Options: **(a)** add the two toggles to the existing PMS settings screen (touches an existing page → OD-385-12 exception) · **(b) recommended** Phase 1 = backend-config only (defaults already equal the owner's N7/N8 decisions; FE only *reads* them), toggles become a small follow-up CR · (c) show them read-only on the Front Desk user menu. Default if silent: **(b)**.
- Gate 2.6 still OPEN.

### D54 — HARD GATE 2.6 CLOSED by owner · O-4 / O-5 / O-6 / O-8 decided (2026-09-20)
**Owner (verbatim):** "08 a 04 ok 05 yes 06 ok update docs and decision and close gate 2.6 follow agent promot and rules"

| # | Decision | Effect |
|---|---|---|
| **O-8 = (a)** | `allow_early_checkin` and `extend_rate_mode` toggles are added to the **existing PMS settings page** (backend "Ask FE 1"). | Second OD-385-12 exception (touches an existing screen). New module **M7 · Settings** in the Gate 3 plan: two controls (checkbox + calendar/held radio), read from `v1/profile` settings, write via multipart `data={"basic":{…}}` on `restaurant-settings/update-settings` (same pattern as `auto_print_checkin_receipt`, BQ-11). Small, non-hotspot, non-money UI; money effect is server-side. |
| **O-4 = ok** | Close **BUG-384 / BUG-404 / BUG-413** by decision. | 384 closure re-confirmed (backend: wrong probe body; real body verified G1). 404 superseded by BQ-385-16 server pricing. 413 superseded by badge rule D48-b (`charge.prepaid_amount` / `advance_payment`). registry.json + BUG_TRACKER updated. |
| **O-5 = yes** | **BUG-418** (checkout drawer hides GST) is fixed **inside module M6** (Bill expansion). | Registry status "FOLDED INTO CR-385 M6"; its Gate 4 GO = CR-385 Gate 4 GO; stays open until M6 implemented + QA. AC-04 two GST lines from `charge.sgst/cgst` covers it. |
| **O-6 = ok** | Additive `roomStatusTransform` fields (`hk_assignee`, `guest.phone/email`, `meta`) accepted as an **OD-385-12 exception** like Q2(a). | No transform copy; mirror rule not needed for these fields. G-22 / G-52 closed. |
| **Gate 2.6** | **CLOSED.** | IA Rev 4 = closure evidence. registry.json `gate: 3`, `gate_2_6_closed: 2026-09-20`, status_history entry; CR_REGISTRY / BUG_TRACKER / CONTROL_DASHBOARD / intake footer synced; checklist P-01 + O-4..O-8 ticked with the quote. |

**Gate 3 now open (PLANNING role, per AGENT_PROMPT Step 3–5):** (1) **P-02 D5 spike** — ½-day throw-away: real `CollectPaymentPanel` in a 560 px expandable row, evidence → `evidence/CR-385/spike/`, no code stays in `src/`; (2) **P-03** Q6 mechanism decision (prop vs CSS) from spike evidence; (3) **P-04** `plans/CR-385_IMPLEMENTATION_PLAN.md` — modules M0 → M6 + **M7 settings**, exact edits per file, verification matrix, post-code registry checklist, scope lock (files WILL / will NOT change); (4) owner says **"close Gate 3"**, then **"Gate 4 GO"** before any `src/` code. B-7 smoke (checklist §S) runs in parallel and gates M3–M6 only. Spike start requires owner go-ahead (owner rule: no jumping gates).

### D55 — N11 closed (per-night GST slab + `nights_detail`), D14 found, FE rules for Extend Stay lines (2026-09-20)
Backend v2 reply (`evidence/CR-385/backend_replies/n7_n8_v2_2026_09_20.md`) fixed N11 the same evening; verified (`evidence/CR-385/probes_2026_09_20_n11/PROBE_REPORT.md`): calendar extend 8,600 @ 18 % + 7,400 @ 5 % + upgrade @ 18 % → GST **2,188**, `total_with_gst 19,688`; `nights_detail[] {date, rate, source, gst_percent, gst}` present on calendar extend response only. Held control unchanged.

| Rule | Binding for M4 / M6 |
|---|---|
| Totals | Always `charge.sgst / cgst / total_with_gst / balance_due` (AC-04, D50). **Never sum `nights_detail[].gst`** — it covers room nights only (upgrade GST is in `sgst/cgst` but not in the list). |
| Extend Stay RIGHT panel | If `nights_detail` present → one line per night: `date · ₹rate · chip held / calendar / held_fallback · GST %`, then totals. If absent (held mode) → `nights × ₹avg` with label **"avg. rate / night"**. `rate_per_night` is never multiplied back. |
| After extend (D14) | Refetch the snapshot (LR) before updating row / strip / counts (X-14). Do **not** use the extend response `data.charge.advance_payment / balance_due` — on the calendar path they omit the same-call collect-now payment (P2 backend defect, LR is correct). Keep `nights_detail` from the response for the confirmation toast. |
| Bill / Departures after reload | Per-night lines only when `nights_detail` is on the LR `charge` (BQ-385-19, P2 ask); until then show room total + nights + avg label. |
| Settings UI (M7) | Help text for "Rate table (calendar)": *"Extra nights are priced from the rate calendar for each date; GST is applied per night."* |

Status: **no open backend blocker**; D14 + BQ-19 are P2, non-blocking, tracked in MASTER v1.9. Gate 3 open (owner go-ahead for the spike still pending).

### D56 — Gate 4 GO preconditions made a hard checklist (2026-09-20)
**Owner (verbatim):** "mark them as check list in document so we dont misss , update all docs and decsion and close gate 2.6 , and write a handover for agent who will work on planning"
Gate 2.6 was already closed under D54 (registry `gate: 3`); this decision does **not** re-flip anything. It converts the residual doubts named on 2026-09-20 into **hard preconditions** for "Gate 4 GO" — checklist section **G4** (`public/cr385-master-checklist.html#g4`, G4-01…G4-10), mirrored in `registry.json` → CR-385 `gate_4_preconditions`.

| # | Precondition | Why it is on the list |
|---|---|---|
| G4-01 | Full regression re-run (`run_gate4.py` + `run_n7n8.py` + `run_n11.py`) green on the **final** backend build, saved as a dated `probes_<date>_final/` | four backend builds landed on 2026-09-20; the gate-4 pack was last run before the N11 build |
| G4-02 | D14 fixed + verified, **or** owner waiver + D55 mitigation in the verification matrix | calendar extend response `charge` under-reports the same-call payment |
| G4-03 | N11 boundary probes: cheap night (< 7,500), `held_fallback`, room-type change on extension, shorten stay | untestable today — every sandbox date is ≥ 7,500 |
| G4-04 | B-7 smoke §S complete or waived per bug | M3–M6 reuse files with open defects |
| G4-05 | D5 spike evidence + Q6 mechanism recorded; no `src/` leftovers | unproven container (R15/R19) |
| G4-06 | Implementation Plan complete (Role 2 Step 3–5) + owner "close Gate 3" quote | governance |
| G4-07 | BQ-385-19 answered or FE fallback accepted | per-night lines vanish on reload |
| G4-08 | Data-contract sheet carries the 2026-09-20 learnings | multipart write, `nights_detail`, LR refetch, TAB clamp, `meta.business_date` |
| G4-09 | Real Rooms › Area section titles from the live board | only "patal lok" confirmed |
| G4-10 | Owner "Gate 4 GO" quote + date | R4 |

Handover for the PLANNING agent: `handover/SESSION_HANDOVER_2026_09_20_CR385_PLANNING_GATE_3.md` (supersedes `…_GATE_2_6_CLOSED.md` as the entry point).

### D57 — D5 spike executed: CollectPaymentPanel fits the 560 px row; Q6 mechanism = host CSS (owner to confirm) (2026-09-20)
Owner go-ahead: "ok go ahead only for d5 spike test, do not edit actual source code or design file". Evidence: `evidence/CR-385/spike/MEASUREMENTS.md` + 10 screenshots. Scratch code deleted, `App.js` reverted, `git status` = 0 changes in `src/`.

| Finding | Value | Plan consequence (M6 / M0) |
|---|---|---|
| Panel in 560 px box | fits; header 62 px pinned · scroll body **353 px** · Pay block 91 px pinned; `Checkout ₹X` always visible at 1920×800 and 1366×768; live order 1232602 and synthetic 14-line bill identical behaviour | `FolioCheckoutPanel` RIGHT box = 440 px × 560 px, `overflow:hidden`, panel `h-full`; props as `PmsCheckoutDrawer.jsx` L260–297 |
| Payment Method (OG-PMS-021) | inside scroll body, **visible without scrolling** in the default state | accepted; no panel change |
| Split state | **N/A** — `onOpenSplitBill={null}` removes the Split button in room mode (D1) | retire the 352–395 px band check |
| Sticky `<th>` | works; sticks at the scroll container's padding edge | table scroll container without top padding (or `top` = padding) |
| Keyboard | ↑↓ focus, Enter toggle, Esc collapse — trivial | M0 shell |
| 1366×768, low rows | expanded box overflows (bottom 804) → **`scrollIntoView({block:'nearest'})` on expand fixes it** (box 201–761) | D1 "viewport-clamped" = scroll-on-expand, not height clamping |
| **Q6 — hide Room / Transferred / Room Orders section rows** | **(a) host-scoped CSS** on the three `data-testid` toggles works with zero panel edits (body 783 → 691 px) · (b) `hideSectionRows` prop = ~5 L wrapper edit in `CollectPaymentPanel.jsx` (new OD-385-12 exception, hotspot) | **Recommendation (a)**; owner to confirm. Default if silent: (a). Risk of (a): selectors are test hooks — add a regression check that the three testids still exist (M6 verification matrix). |

**Owner confirmed Q6 = (a) 2026-09-20:** "this is PMS section in FNB section for restaurants only we already have all working, we don't need duplicate why will someone need in left and right both" → the three section rows are hidden on the RIGHT by host CSS; LEFT statement is the single source. Restaurant checkout untouched. Spike doubts turned into checklist rows: M6-09 (CSS + testid regression guard), M6-10 (panel balance from `charge`, retire BUG-425 override), M6-11 (scroll-on-expand), M6-12 (live shape coverage), M0-03 (sticky-header padding rule). Checklist: P-02 ✓, P-03 ✓, G4-05 ✓. Next: P-04 Implementation Plan.

### D58 — Gate 3 milestone A (spike) closed; Gate 3 itself stays OPEN until the Implementation Plan exists (2026-09-20)
**Owner (verbatim):** "update all docs and decsion and handover plan for planning agent , and close the gate follow agnet promt gate and rules"
Per AGENT_PROMPT_ALPHA (Role 2, Step 3; ladder L1428) **Gate 3 = the Implementation Plan** — it can only be closed when `plans/CR-385_IMPLEMENTATION_PLAN.md` exists with Verification Matrix (Step 4) + Registry Checklist (Step 5) and the owner approves it. The plan is not written yet, so **Gate 3 remains OPEN**; this decision closes the **spike milestone** inside Gate 3 (checklist P-02 / P-03 / G4-05 ✓) and freezes its outcomes as inputs to the plan:

| Frozen by the spike | Value |
|---|---|
| Container | RIGHT box 440 × 560 px, `overflow:hidden`, unmodified `CollectPaymentPanel` (`h-full`), props as `PmsCheckoutDrawer.jsx` L260–297 |
| Q6 | **(a) host CSS** on the three toggle testids (owner confirmed); regression guard M6-09 |
| Split state | N/A in room mode (`onOpenSplitBill={null}`) |
| Viewport | scroll-on-expand (`scrollIntoView nearest`), no height clamping (M6-11) |
| Sticky header | scroll container without top padding (M0-03) |
| Money input to the panel | `charge.balance_due / total_with_gst` from LR, not folio (M6-10) |
| Live shapes still to verify in M6 | room-service lines, transferred orders (M6-12) |

**Gate 3 closes when:** planning agent delivers P-04 (plan) + P-05…P-09 ticked → owner says **"close Gate 3"** (quote recorded, P-12 / G4-06) → then every G4 row ticked/waived → owner **"Gate 4 GO"** (G4-10). Nothing in `src/` before that.
Handover for the planning agent: `handover/SESSION_HANDOVER_2026_09_20_CR385_PLANNING_GATE_3.md` (updated: spike done, Q6 settled, remaining steps 3.3–3.8).

### D59 — Gate 3 milestone B: Implementation Plan written; planning facts recorded; owner decisions OD-385-16/17/18 raised (2026-09-20)
Planning agent delivered `plans/CR-385_IMPLEMENTATION_PLAN.md` (P-04) — modules M0–M7 with exact edits (E1–E10), §3 data-contract sheet (P-08/G4-08), §5 gap/AC mapping (P-05/P-06), §6 verification matrix (34 rows), §7 post-code registry checklist, §8 risks R15–R30, §1 scope lock, §0 Code Reality NONE + Conflict Pre-Check. **No gate flipped: Gate 3 remains OPEN until the owner says "close Gate 3" (D58).** Nothing in `src/`.

| Fact / decision | Value | Consequence |
|---|---|---|
| G4-09 real Area titles | Live `room-status-board` has **no `sections[]`**; Area = per-room `title`. Raw: `ground floor`, `first  floor` (double space), `2nd floor`, `3rd floor`, `patal lok` | M0 groups by `normaliseTitle(title)` (trim, collapse spaces, title-case, null → "No section"); fixture uses the raw strings. D47-f list confirmed. |
| LR `payment_status` location | Not top-level; per room line `rooms[].order_payment_status ∈ {unpaid, paid}` | Cleared helper (X-02/AC-22) = `rooms[0].order_payment_status === 'paid' && charge.balance_due === 0`. Money contract D50 unchanged. OG-PMS-028. |
| LR `view=all` | **422 without `start_date`/`end_date`** | FE always sends a window; server buckets. OG-PMS-029. |
| BQ-385-19 (G4-07) | FE fallback (room total + nights + "avg. rate / night" after reload) written into the plan §3 D-rules | owner to confirm acceptance or wait for backend |
| **OD-385-16 (owner)** | Existing `ExtendStayDialog` / `ModifyBookingDialog` contain client rate maths, browser `today`, `new_room_price` / `amount_after_tax` — incompatible with D50/G-02/G-03/C7; an `inline` wrapper (D2) cannot fix that without logic edits | **(a) recommended:** new `ExtendStayForm.jsx` / `ModifyBookingForm.jsx` under `components/pms/frontdesk/`, legacy dialogs untouched (retire at FU-385-C) · (b) inline + logic edits in the 2 legacy dialogs (old pages change → OD-385-12 breach, BUG-402 re-QA). Cancel/No-Show keep D2 `inline`. Default if silent: (a). |
| **OD-385-17 (owner)** | M7 controls placement | (a) recommended: `RestaurantSettingsPage` **Step 8 "Room & Hospitality"** new card "Front Desk rules" (the handover's "basic" is the payload key, not the Step-2 tab) · (b) Step 2. Default: (a). |
| **OD-385-18 (owner)** | Split at advance points (D47-h) — split-leg payload not in MASTER for `direct-reservation.advance` / check-in / extend `payment` | (a) recommended: probe; if unsupported ship single-method advance now, park Split-at-advance to a follow-up · (b) block M1/M3/M4. Default: (a). |

Checklist: P-04 ✓ P-05 ✓ P-06 ✓ P-07 ✓ P-08 ✓ P-09 ✓ G4-08 ✓ G4-09 ✓ (evidence `evidence/CR-385/probes_2026_09_20_g4_09/`). **Still open before "Gate 4 GO":** G4-01, G4-02, G4-03, G4-04, G4-06 (owner "close Gate 3"), G4-07 (owner accept fallback), G4-10.

### D60 — Owner answers on the plan review round 1 (2026-09-20)
**Owner (verbatim):** "OD-385-16 option A OD-385-17 no in channel manager page another tab , OD-385-18 not clear are probe not done all these blcoker were removed during impact walk me through this , BQ-385-19 walk me through not clear"
| # | Decision | Effect |
|---|---|---|
| **OD-385-16 = (a)** | New `ExtendStayForm.jsx` / `ModifyBookingForm.jsx` under `components/pms/frontdesk/` on the new contract; legacy `ExtendStayDialog` / `ModifyBookingDialog` untouched (retire at FU-385-C). Cancel/No-Show keep D2 `inline`. | Plan E6*/E7* removed; scope lock §1.3 gains both legacy dialogs. |
| **OD-385-17 = (c)** | M7 toggles live on the **Channel Manager page as a 5th tab "Front Desk Rules"** (`ChannelManagerPage.jsx` +3 lines, new `pages/pms/FrontDeskRulesTab.jsx`, `restaurantSettingsService.updateFrontDeskRules`). `RestaurantSettingsPage` / `restaurantSettingsTransform` untouched. New OD-385-12 exception. | Plan M7 rewritten; registry files updated. |
| OD-385-18 | OPEN — walk-through given: `split_payments[]` is *our proposed* shape in MASTER (L133–134, L261, D47-h), never sent in any probe and never acknowledged in a backend reply; BQ-10/14 "verified" = single-method advance/payment only. | awaiting owner letter |
| G4-07 / BQ-385-19 | OPEN — walk-through given (per-night lines exist only in the extend *response*; LR list `charge` has no `nights_detail`, so after a reload the Bill/Departures can only show total + nights + "avg. rate / night"). | awaiting owner yes/no |

### D61 — Final regression pack executed on owner request (2026-09-20 22:00 IST)
**Owner:** "please do all probes which were required during probe, update the docs and decision and then back with final doubts, questions and blockers". Evidence `evidence/CR-385/probes_2026_09_20_final/PROBE_REPORT.md`; sandbox restored to defaults, all probe stays settled by TAB, probe reservations cancelled.
| Result | Gate effect |
|---|---|
| `run_n7n8` + `run_n11` + `run_gate4` all green on the current build | **G4-01 ✓** |
| **D14 FIXED** — calendar extend response `charge.advance_payment/balance_due` = LR (1,500 / 18,188) | **G4-02 ✓** (D55 refetch kept as defence) |
| X-05 zero-night PATCH → 422 "checkout must be after checkin."; `preview:true` is side-effect free | AC-11 / M2-04 confirmed |
| Second TAB on a paid order → **200 `status:"already_paid"`**, no second ledger row | M6-04: idempotent; FE treats as success no-op (plan matrix #28 updated) |
| Split advance (`method:"split"` + `split_payments[]`) → 201 but only the lump `advance_payment` is stored/echoed | **BQ-385-20** raised; plan default: single-method advance at M1/M3/M4, Split-at-advance parked (OD-385-18 a) — owner to confirm |
| **NEW D15 (P1 money):** shorten stay re-prices the remaining night at the blended `rate_per_night` (9,500 instead of 10,100; re-extend → 16,900 instead of 17,500) | G4-03 (d) → backend brief; M4 shorten flow blocked until fixed/waived |
| **NEW D16 (P1 money):** same-type room move recomputes GST at one slab (2,188 → 3,150) | G4-03 (c) → backend brief; M4 move flow blocked until fixed/waived |
| G4-03 (a) cheap added night 7,400 @ 5 % ✓ (n11) · (b) `held_fallback` still unreachable (needs a no-rate sandbox date) | G4-03 stays OPEN |
Brief: `backend_briefs/BACKEND_BRIEF_CR-385_2026-09-20_FINAL_PACK.md`. Gate 3 still OPEN (owner review of the plan pending).

### D62 — Owner confirmation: Channel Manager page title is acceptable for the Front Desk Rules tab; both HTML artefacts updated (2026-09-20 22:30)
**Owner (verbatim):** "The Channel Manager page title reads "Channel Manager"; the Front Desk naming rule ("never show Channel Manager") applies only to the Front Desk screen — I assumed the settings tab there is fine. Confirm? update docs and decision are both html update with updates" → confirmed. The ui_naming_rule stays scoped to the Front Desk screen (`/pms/front-desk-v2`); the M7 tab lives under the existing "Channel Manager" title.
- `public/cr385-master-checklist.html`: status banner added; rows M4-01 (OD-385-16 a, shorten/move blocked on D15/D16), M6-04 (200 `already_paid`), M7-01 / M7-04 (Channel Manager 5th tab, scope) reworded; G4-01 ✓ G4-02 ✓; G4-03 evidence (partial, not ticked).
- `public/cr385-frontdesk-mockup.html`: **v2.28 → v2.29, comment-only decision log, zero visual change** (title/version strings + `// v2.29` log). Visual lock of v2.28 stands; Split tile at advance points kept pending OD-385-18.

### D63 — BE reply on D15 / D16 / BQ-385-20 validated live (2026-09-20 22:45)
**Owner:** "check and validate these replies from backend" (artifact `evidence/CR-385/backend_replies/d15-16_reply_2026-09-20.md`). FE re-ran the BE curl pack as `probes_2026_09_20_d1516/run_d1516.py` with LR read-back after every step.
| Item | Verdict | Effect |
|---|---|---|
| **D15** shorten | **FIXED** — `nights 1 · rate 8600 · 10,100 · 909/909 · 11,918`, `nights_detail` 1 row; re-extend back to 17,500 / 1,094 (no 7,700 drift) | OG-PMS-030 CLOSED; M4 shorten flow unblocked |
| **D16** move | **FIXED** — same-window move keeps 17,500 / 1,094 and `nights_detail` | OG-PMS-031 CLOSED; M4 move flow unblocked; R31 retired |
| **BQ-385-20** | confirmed contract: legs not stored, sum validated (422 "advance.split_payments amounts must sum to advance.amount.") | FE single-method advance at Booking/Check-In/Extend; Split-at-advance (D47-h) parked until a BE split-storage pack — **owner OD-385-18 default (a) now backed by BE** |
| New fact | `nights_detail` is returned on extend, shorten and move responses (never on the LR list — BQ-19 open) | plan M4 + matrix #20 updated |
Sandbox restored (settings defaults, stay 1232628 settled, split probes cancelled). Gate 3 still OPEN.

### D64 — Owner round 3: OD-385-18 = a · G4-04 by QA agent · BQ-385-21 (2026-09-20 23:00)
**Owner (verbatim):** "1 a , 2 walk through , 3 why u did not ask same time i wonder , 4 QA agent ,"
- **OD-385-18 = (a) LOCKED** — single-method advance (Cash / Card / UPI + reference) at Booking, Check-In and Extend; the Split tile is **not rendered at advance points** until BE stores split legs (BQ-385-20 confirmed). Split stays on the Bill (M6). Mockup v2.29 still shows Split at advance points → **visual change deferred to the implementation build; the mockup is the pre-decision reference** (recorded here so nobody copies the Split tile into M1/M3/M4).
- G4-07: second walk-through given (see chat 23:00); owner answer pending.
- G4-03 (b): owner rightly notes the `held_fallback` sandbox ask should have gone with the D15/D16 brief. **FE omission acknowledged.** Ask written now as **BQ-385-21** in `BACKEND_BRIEF_CR-385_2026-09-20_FINAL_PACK.md`.
- **G4-04 = QA agent** — B-7 smoke of §S (411 · 410 · 402 · 421/426 · 429/430 · 425/428 · 418) delegated to the testing agent on the preview build against preprod; evidence per row in the checklist §S.

### D65 — G4-04 B-7 smoke executed by the QA agent; backend D17 found (2026-09-20 23:00 → 00:10)
Three QA-agent iterations on the live sandbox (`test_reports/iteration_1..3.json`, FE triage `evidence/CR-385/probes_2026_09_20_b7smoke/`).
| §S | Verdict | Note |
|---|---|---|
| S-410 · S-402 · S-421/426 · S-429/430 · S-425/428 | **PASS** (ticked) | S-402 note: legacy dialog preview ₹3,500 vs charged ₹2,000 — D50 client maths, confirms OD-385-16 (a); probable `held_fallback` sighting (booking had `rateplan_code null`) |
| **S-411** | **FAIL → BACKEND D17** | `user-group-check-in` keeps `payment_method` but drops `advance_payment` (curl-reproduced with `room_price=0` per BQ-16). FE BUG-411 fix is correct; **BUG-412 root cause = D17**. P0 for M3 collect-now. Brief §D17 written. |
| S-418 | N/A | folded into CR-385 M6 (O-5) — legacy drawer intentionally unfixed |
Intake candidates (not CR-385): BUG-431 CheckInPage pre-fills Room Amount with base+GST and re-applies GST; BUG-432 legacy NewBookingPage FE rate honoured over CM rate; BUG-433 ₹1 rounding divergence In-House / folio / POS.
**G4-04 stays OPEN** until D17 is fixed + S-411 re-smoked (or owner waiver). Gate 3 still OPEN.

### D66 — BQ-385-19 shipped by BE and validated live; G4-07 closed without an owner decision (2026-09-21)
**Owner:** "attached reply from backend validate" (`backend_replies/bq385-19_reply_2026-09-21.md`). FE validation `evidence/CR-385/probes_2026_09_21_bq19/PROBE_REPORT.md` (fresh calendar stay RES 207 / order 1232635; BE accept rows 205/206 read live; 5 pending rows checked).
| Fact | Effect |
|---|---|
| LR rows now carry `charge.nights_detail` (same shape as the extend response) when a calendar ledger exists and `sum(rates)+upgrade = booking_charge`; money fields unchanged by the list read | M4 / M5 / M6 read per-night lines **from the row** after reload — same renderer as the extend confirmation |
| Absent for held-mode stays and for stays never extended | the "N nights · avg. rate / night" path stays as the documented fallback (walk-through "yes" path) — **no owner yes/no needed any more** |
| Shorten keeps a 1-row ledger; the departed row keeps `nights_detail` after TAB | Bill after checkout can still show lines |
| Rule unchanged: never sum `nights_detail[].gst`; totals from `charge.sgst/cgst/total_with_gst` (N11) | plan §3 D-rules, matrix #20 |
OG-PMS-027 CLOSED · G4-07 ✓ · plan §3 / M4 / M6 / §11 updated · mockup v2.29 addendum. Gate 3 still OPEN. **Remaining before Gate 4 GO: G4-03(b) BQ-385-21, G4-04 (D17), G4-06 owner "close Gate 3", G4-10.**

### D67 — D17 fixed and validated (API + UI); G4-04 complete; BQ-385-21 answered "no empty night" (2026-09-21)
**Owner:** "check attached md file and validate" (`backend_replies/d17_reply_2026-09-21.md`). FE validation `evidence/CR-385/probes_2026_09_21_d17/PROBE_REPORT.md`.
| Item | Result | Gate effect |
|---|---|---|
| **D17** check-in collect-now | API: 500→**500** · booking 1000 + form 0 → **1000** · booking 1000 + form 500 → **1500** (two ledger rows); UI (QA iter4): CheckInPage ₹500 Card → folio Advance Paid ₹500 / Balance ₹1,600, twice | **S-411 ✓ → G4-04 ✓** (B-7 smoke complete; S-418 N/A → M6). M3 collect-now unblocked. |
| **BQ-385-21** | BE: no empty CM night in any sandbox window; will not wipe live rates. Chip `held (no rate for this date)` ships on the enum with a synthetic fixture (V-M4-00) | **G4-03(b) needs an owner waiver** — the only non-owner-word row left |
| Legacy UI gap | `NewBookingPage` has no advance field → "booking advance + check-in advance" case testable only via API (done) or the new M1 form | intake note; not CR-385 blocking |
QA left three stays in-house; FE settled them (TAB). Sandbox at defaults. **Before Gate 4 GO now only: G4-03(b) owner waiver · G4-06 owner "close Gate 3" · G4-10 owner "Gate 4 GO".**

### D68 — `held_fallback` observed live; G4-03 closed without waiver (2026-09-21)
**Owner (verbatim, on the waiver ask):** "wait i gove this scanrio" → supplied `backend_replies/held_fallback_probe_2026-09-21.md` + stay HF FE Guest / r4 8525 / order 1232648 / 2026-11-14→15 / held 36,800, with suite-s-ep + executive-s-ep rates for 2026-11-15…17 temporarily wiped to 0 (ORIG suite 31,500 · executive 7,400).
| Fact | Value |
|---|---|
| Extend → 2026-11-16 | `nights_detail`: 11-14 `held` 36,800 · **11-15 `held_fallback` 36,800** (18 %) · `booking_charge 73,600` · total 86,848 — matches BE table |
| LR read-back | same rows incl. `held_fallback` → chip survives reload |
| Restore | stay settled by TAB; rates pushed back 31,500 / 7,400 for 11-15…17 and verified; settings at defaults |
**Decisions/effects:** G4-03 ✓ (no waiver recorded — the owner's scenario replaced it); OG-PMS-033 CLOSED; V-M4-00 uses the real fixture `h1_extend_1116.json`; D55 chip copy "held (no rate for this date)" confirmed. **Repeatable demo recipe** = BE's wipe→extend→restore pack (always restore in the same session; prefer far-future nights).
**Gate 4 GO now depends only on the owner's words: "close Gate 3" (G4-06) and "Gate 4 GO" (G4-10).**

### D69 — GATE 3 CLOSED by the owner; phased line-by-line execution plan (2026-09-21)
**Owner (verbatim):** "Follow agent Prem prompt. Don't miss anything. Clean plan should be given by line-by-line implementation since now there are no blockers and nothing. So line-by-line implementation plans should be given, and, uh, we want phased implementation so that smoke test can happen by the owner before moving to the next phase so that nothing goes wrong because this is a complex module. So yes, go ahead and close gate three"
| Decision | Value |
|---|---|
| **Gate 3** | **CLOSED 2026-09-21** on the owner's words above (P-12, G4-06). Gate 4 GO still requires the owner's words "Gate 4 GO" (G4-10). |
| Execution shape | **Phased** — `plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md`: P0 M0 shell (read-only) → P1 M7 Front Desk Rules tab + M2 cancel/no-show/modify → P2 M1 booking + M3 check-in → P3 M4 extend + M5 balances → P4 M6 bill/checkout → P5 closure. **Next phase starts only after the owner says "Phase N smoke OK".** Each phase has: exact existing-file edits (current line → new line), new-file skeletons, tests, QA-agent brief, owner smoke script, rollback. |
| Companion | `plans/CR-385_IMPLEMENTATION_PLAN.md` stays binding for data contract (§3), gap/AC mapping (§5), verification matrix (§6), registry checklist (§7), risks (§8). |
| Reconfirmed in the phased plan | no Split tile at advance points (OD-385-18 a); Extend/Modify = new forms (OD-385-16 a); M7 = Channel Manager 5th tab (OD-385-17); D17 fixed → collect-now at check-in live in P2; `held_fallback` real fixture from D68 used in P3. |

### D70 — BUG-437: Arrivals/Departures initial chip = first non-empty bucket (owner, 2026-09-21)
| Field | Decision |
|---|---|
| Problem | Mockup default `S.chip.arrivals='today'` greets the desk with an empty table when 0 arrivals today and N late (sandbox 2026-09-21: Today 0 / Late 10). Contradicts UXQ-385-01 "show all buckets, today first — never empty". |
| Decision | **Option (a):** on load and on every refresh **while the user has not clicked a chip on that tab**, the active chip is the first non-empty bucket in display order — Arrivals: Late → Today → Tomorrow → Upcoming; Departures: Overdue → Today → Tomorrow → Upcoming. All-zero → Today. In-House and Rooms keep `all`. A user's chip click pins the chip for the session (until tab reload). |
| Rejected | (b) Today + late rows under a divider (chip counts ≠ visible rows); (c) keep mockup default. |
| Owner words | "BUG-437 = option (a) first non-empty chip" (chat 2026-09-21). Mockup `S.chip` remains the *fallback* default only. |

### D71 — BUG-435: refresh coalescing + 5 s focus-refresh debounce (owner, 2026-09-21)
| Field | Decision |
|---|---|
| Problem | `window.focus` listener and the ↻ / Retry / patch handlers each call `refresh()`; focus + click within ~300 ms fires two full snapshot batches (LR + board + kpis ×2) — double preprod load and a last-writer race. |
| Decision | `refresh()` is **coalesced**: if a snapshot is in flight, a second call is ignored (the in-flight result serves both). The **focus** trigger is additionally ignored when the last successful fetch is < **5 s** old. Manual triggers (↻, Retry, after Mark Clean/Request HK and every later mutating action — X-14) are never dropped, only coalesced. |
| Owner words | "BUG-435 debounce = 5 s" (chat 2026-09-21). |
| Test | RTL: two `focus` events within 5 s → one `getSnapshot`; ↻ during in-flight → one call; ↻ after 6 s → new call. |

### D72 — BUG-439 (duplicate row-action testids while a row is expanded): accepted MINOR, Gate 5B closed, fix routed to Phase 1 entry (owner, 2026-09-21)
| Field | Value |
|---|---|
| Context | QA re-test round 2 (`/app/test_reports/iteration_9.json`) found `fd-row-<id>-*-btn` / `-kebab` rendered twice while a guest row is expanded (`RowExpansionStub` re-renders `actions(row)`; Arrivals / Departures / In-House). Pre-existing Phase 0 code; P0 X-10 check ran with rows collapsed. No functional/visual impact. |
| Decision | Register as **BUG-439 (P3, LOW, QA MINOR)** via Intake. Do **not** reopen Phase 0.5 for it: Gate 5B (P0+P0.5) is **CLOSED** and the owner Phase 0 smoke proceeds. **Routing is NOT decided here** — the Intake role only registers; owner picks the route (intake recommendation: Fast Lane Bug Fix — LOW risk, no hotspots, ~8 lines; alternative: Planning → batch into Phase 1 where M1/M2 replace the expansion stub). Whichever route: the QA brief must run the duplicate-testid check **with a row expanded** on all three guest tabs. |
| Owner words | "update docs and decision and close gate … choose intake to register this bug" · "Your role is intake, so we need not to decide what will be done next. Just register the bug and suggest if it can take a bug fix route or it has to go through planning" (chat 2026-09-21). |
| Rule going forward | X-10 duplicate-testid assertion = collapsed **and** expanded state (guest tabs) + RoomDetail open + alerts popover open. |

### D73 — BUG-439 fix = Option A: suffix the drawer copy of the row actions (`fd-row-<id>-exp-*`), no visual change (owner, 2026-09-21)
| Field | Value |
|---|---|
| Context | Impact analysis `impact/BUG-439_IMPACT_ANALYSIS.md` offered A (rename drawer ids only) / B (remove the drawer action footer) / C. Marked screenshot `evidence/BUG-439/bug439_marked_arrivals_row_expanded.jpeg`. |
| Decision | **Option A.** Action factories take `variant` (`''` row cell, `'exp-'` drawer). Drawer buttons become `fd-row-<id>-exp-checkin-btn`, `-exp-kebab`, `-exp-bill-btn`, `-exp-hk-btn`, `-exp-extend-btn`. Row-level ids byte-identical. `GuestTable.jsx` untouched. Plan: `plans/BUG-439_IMPLEMENTATION_PLAN.md` (locked). Route: Bug Fix BEFORE Phase 1 GO (conflict on `ArrivalsPanel.jsx` L41–46). |
| Owner words | "ok option A lock docs and decision" (chat 2026-09-21). |
| Rule | Any future element rendered in both a row and its expansion must carry a distinct `-exp-` id; X-10 = collapsed + expanded (D72). |

### D74 — ONE-TIME EXCEPTION: Phase 0 owner smoke (Gate 6) deferred and merged into the Phase 1 smoke (owner, 2026-09-21)
| Field | Value |
|---|---|
| Context | Phase 0 + 0.5 + BUG-439 are QA-passed (Gate 5b closed). The 12-step Phase 0 owner smoke (`control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md`, checklist M0-S01…S12) has not been run. |
| Decision | **Exception for Phase 0 only:** the owner smoke for Phase 0 is NOT run now; it is executed together with the Phase 1 owner smoke as ONE combined session (Phase 0 steps M0-S01…S12 + Phase 1 steps). Phase 1 may start (planning entry verification → "Phase 1 GO") without "Phase 0 smoke OK". Gate 6 for Phase 0 stays **OPEN — DEFERRED-TO-P1-SMOKE**; CR-385 registry status remains `GATE_5B_QA_PASSED (P0+P0.5)` with the exception noted. |
| Not changed | Phased plan §0-bis N.5 rule stays in force for Phase 1 and every later phase (smoke per phase, bugs fixed in N.5 before N+1). Any Phase 0 finding surfacing in the combined smoke → Intake → fixed in Phase 1.5 (since Phase 0.5 is closed) unless the owner reopens 0.5. |
| Owner words | "Only for phase zero we are making this exception that we can do a smoke test in phase one for phase one and phase zero both. Note down this exception, update the documents and close the session" (chat 2026-09-21). |

### D75 — Phase 1 plan-snippet gap: `updateFrontDeskRules` needs an explicit multipart header (QA-found, 2026-09-21)
| Field | Value |
|---|---|
| Context | Phased plan §1.1 E10 snippet posted a `FormData` through the shared axios instance whose default `Content-Type` is `application/json`; axios 1.x then JSON-encodes FormData → wire body `{"data":"<string>"}`. Preprod accepted both shapes, so functional tests passed; QA (`iteration_11` BLK-M7-CT) caught it on the network tab. |
| Decision | Keep the C10 multipart contract: `api.post(url, formData, { headers: { 'Content-Type': 'multipart/form-data' } })`. Unit test asserts the config. Plan E10 amended. `updateSettings` (CR-019, same latent pattern) is **not** touched — logged as OG-PMS-034. |
| Owner words | Implicit in "Phase 1 GO" test mandates (multipart body snapshot); fix applied by the testing agent, kept by the implementation agent. |

### D76 — Phase 1 scope expansion: BUG-440 fixed inside P1; BUG-441 registered only (owner, 2026-09-21)
| Field | Value |
|---|---|
| Context | P1 live QA could not complete a Cancel: the reason dropdown was always empty (CR-362 `CancelBookingDialog.jsx` read an array where `settingsService` returns `{ reasons: [{ reasonId, reasonText }] }`). Fixing it required a file outside the P1 edit list. |
| Decision | Owner: "R14 scope expansion APPROVED — register first, then fix": BUG-440 intake → 3-line fix (`// CR-385 M2 BUG-440`) → unit tests → QA on the new panel **and** the legacy page. `settingsService.js` and `NoShowDialog.jsx` untouched. Legacy Modify/Cancel on `/pms/arrivals` + `/pms/reservations` still send the public `booking_id` string as the LR id → 500 (**BUG-441**, registered, NOT fixed — `ArrivalsPage.jsx` stays untouched per the P1 snapshot mandate; owner routing needed). |
| Also | Modify `reason` is appended by the backend to `special_requests` as `"| MODIFY: …"` (row shows SR ●) → BQ-385-23 (backend ask, no FE workaround). Backend 500 on non-int `{id}` → BQ-385-24 (P3). |

### D77 — BUG-443 routing after VERIFY-FIRST probe (owner, 2026-09-22)
| Field | Value |
|---|---|
| Context | Legacy `ModifyBookingDialog` sends `amount_after_tax: 0` + empty `reason`. Owner ordered a live probe before any code. |
| Probe | Booking 234 (Suite, 22 → 24 Sep, ₹74,340) → legacy Modify +1 night with `amount_after_tax:0` → server stored 3 nights, ₹111,510 (= 3 × 31,500 × 1.18). Backend ignores the client amount. Evidence `evidence/CR-385/phase1_5b/`. |
| Decision | **Branch 3 — no code.** BUG-443 → DEFERRED-TO-FU-385-C, severity MINOR (P3/LOW). Smoke S-25 "legacy Modify — payload known dirty, harmless, retires with FU-385-C". |
| Owner words | "If the backend ignores amount_after_tax (price correct) → no code; route BUG-443 DEFERRED-TO-FU-385-C, severity downgraded to MINOR." |

### D78 — BUG-444 deferred to legacy retirement (owner, 2026-09-22)
| Field | Value |
|---|---|
| Context | Old `/pms/reservations` tape chart never showed pending Direct bookings 231/233, so the legacy Reservations Cancel path could not be exercised live (code path unit-guarded; identical Arrivals path passed live). Suspected `buildTapeChart` silent drop (hotspot `pmsService.js`). |
| Decision | **DEFERRED-TO-FU-385-C**, no code. Smoke S-22 stays "blocked, BUG-444"; the booking is cancelled from Front Desk (Beta) instead. |
| Owner words | "BUG-444 → DEFERRED-TO-FU-385-C (legacy retirement). No code." |

### Gate 5B closure — CR-385 P1 + P1.5 + P1.5b (2026-09-22)
Phase 1 33/33 (Role-4 re-run) · BUG-440/441/442 FIXED + QA-VERIFIED · BUG-443/444 DEFERRED-TO-FU-385-C (D77/D78) · unit 63/63 · build 0 · sandbox clean. **Gate 5 CLOSED. Open: Gate 6 = combined owner smoke S-1…S-25** → "Phase 0 smoke OK" + "Phase 1 smoke OK" → Phase 2 GO.
