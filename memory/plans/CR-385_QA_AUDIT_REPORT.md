# CR-385 Front-Desk Workstation Mockup — UI/UX + FUNCTIONAL QA AUDIT (READ-ONLY)
Date: 2026-06 · Build audited: `/app/frontend/public/cr385-frontdesk-mockup.html` **v2.25** (title) · Browser: Chromium (Playwright)
Mode: INVESTIGATE → TEST → REPRODUCE → DOCUMENT → CLASSIFY. **No source file was modified.**
Evidence: `/app/test_reports/iteration_26.json` (agent measurement pass) + viewport sweep (6 sizes × 7 states) + code trace (line refs below).
Companion docs: `plans/CR-385_QA_TEST_PLAN.md`, `handover/CR-385_SESSION_HANDOVER.md`, `plans/CR-385_DESIGN_DECISIONS.md`.

> Scope rule applied: MOCKED values (rates, GST %, penalties, HK timers, section names) are **not** defects. **Internal disagreement between screens for the same booking/guest, broken validation, and layout/consistency drift ARE defects.** Deferred items (§5 of the QA plan) are not logged.

---

## A. QA EXECUTIVE SUMMARY
| | |
|---|---|
| Screens / states reviewed | 19 (see §B) — header+search, KPI tab strip, alert bar+popover, Arrivals, Departures, In-House, Rooms board (3 groupings, 7 filters, Mark-all-clean), Room Detail ×6 statuses, Check-In (+multi concept, ID lightbox), New Booking, Bill/Checkout, Extend Stay, Modify Booking, No-Show, Cancel, kebab/user menus, toasts, keyboard nav |
| Workflows reviewed | Departure→Bill→Checkout · Extend Stay (incl. conflict/room-move) · Booking→Check-In · Modify · No-Show · Cancel · Room ops (HK/OOO/Clean/Book) · Search→open |
| **Total findings** | **31** |
| P0 – Critical | 2 |
| P1 – High | 7 |
| P2 – Medium | 12 |
| P3 – Low | 10 |
| by class → BUG | 14 |
| → UI CONSISTENCY | 9 |
| → UX GAP | 5 |
| → CR / ENHANCEMENT | 3 |
| JS console | 0 errors / 0 warnings on every route & hook |
| Horizontal overflow | none at any tested viewport |

**Headline:** the interaction design is coherent and stable (expand-in-place, reveal-scroll, single-button No-Show/Cancel rule, zero JS errors, primary buttons always on-screen). The audit's serious findings are all **money-figure integrity** and **input validation**: the same booking shows up to four different amounts across screens (QA-002), the Checkout bill's room block is hard-coded and does not reconcile with the row's "balance due" (QA-001), and Extend / Modify / Booking accept over-payment, past dates and blank adults while keeping the primary button enabled (QA-004/005/006). These must be fixed before stakeholder acceptance because reviewers will do the arithmetic.

---

## B. SCREEN COVERAGE MATRIX
| # | Screen / state | Visual | Functional | Responsive | Business logic | Status |
|---|---|---|---|---|---|---|
| 1 | Header · greeting · global search · sync · + New Booking | ✔ | ✔ | ✔ (search 110px @768) | n/a | PASS WITH ISSUES (QA-023) |
| 2 | KPI tab strip (Arrivals/Departures/In-House/Rooms + sub-line links) | ✔ | ✔ | ✔ (clipping @≤1440) | ✔ reconciles today | PASS WITH ISSUES (QA-020, QA-021) |
| 3 | Alert bar + "+N more" popover | ✔ | ✔ (6 items = 3 + 3) | ✔ | ✔ | PASS |
| 4 | Arrivals list (Late/Today/Tomorrow/Upcoming, sort, footer counters) | ✔ | ✔ | ✔ | ✘ ₹ column (QA-002/003/029) | FAIL (data) |
| 5 | Departures list | ✔ | ✔ | ✔ (acts wrap @1024) | ✘ row balance ≠ bill (QA-001) | FAIL (data) |
| 6 | In-House list (All/Arrived today/Leaving today/Stayover) | ✔ | ✔ | ✔ | ✘ same-day cin=cout (QA-007) | FAIL (data) |
| 7 | Bill / Checkout expansion (Room · F&B · Transferred · adjustments · settlement) | ✔ | ✔ | ✔ | ✘ hard-coded room block (QA-001) | FAIL |
| 8 | Check-In expansion (single) + ID lightbox | ✔ | ✔ | ✘ right-pane scroll @1366/1024 (QA-010) | ✘ charge ≠ nights (QA-002) | PASS WITH ISSUES |
| 9 | Check-In multi-room concept (ON HOLD) | ✔ | ✔ (disabled) | – | n/a | PASS (concept) |
| 10 | New Booking expansion (grid, B2B, advance, Save / Save & Check in) | ✔ | ✔ | ✔ | ✘ validation (QA-006) | PASS WITH ISSUES |
| 11 | Extend Stay (dates, conflict + room move, discount, collect) | ✔ | ✔ | ✔ | ✘ over-collect (QA-004) | PASS WITH ISSUES |
| 12 | Modify Booking (grid, dates, reason, change ±) | ✔ | ✔ | ✔ | ✘ validation (QA-005) | PASS WITH ISSUES |
| 13 | Mark No-Show dialog | ✔ | ✔ | ✔ reveal-scroll ok | ✘ tax lines not reconciled (QA-009) | PASS WITH ISSUES |
| 14 | Cancel Booking dialog | ✔ | ✔ (reason → penalty 0) | ✔ | ✘ same (QA-009) | PASS WITH ISSUES |
| 15 | Rooms board · tiles · Group Room no./Type/Area · filters · Turns today · Mark all clean | ✔ | ✔ (Type 3 groups=40, Area 4=40, Turns 4=4) | ✔ | ✔ | PASS WITH ISSUES (QA-019) |
| 16 | Room Detail ×6 statuses + actions + kebab | ✔ | ✔ | ✔ reveal-scroll ok (240) | ✔ | PASS WITH ISSUES (QA-024) |
| 17 | Kebab / user menu / toasts | ✔ | ✔ | ✔ | ✔ single-button rule | PASS WITH ISSUES (QA-016) |
| 18 | Keyboard: `/` ↑ ↓ Enter Esc, search list nav | – | ✔ | – | – | PASS |
| 19 | Loading / quiet-day / board-failed / side-panel variants (hidden `#ctl`) | – | – | – | – | NOT TESTED (controls hidden by design) |
| — | Browsers Safari / Edge | – | – | – | – | NOT TESTED (Chromium only — see §G) |

---

## C. ISSUE REGISTRY
Legend: **BUG** · **UIC** = UI consistency · **UXG** = UX gap · **CR** = enhancement. Line refs are into the single HTML file.

### P0 — Critical (financial integrity)
| ID | Screen | Type | Issue | Expected | Actual (measured) | Evidence / fix hint |
|---|---|---|---|---|---|---|
| **QA-385-001** | Departures › Bill › Checkout | BUG | Room block of the bill is **hard-coded** (`roomAmt=1000, adv=100`, line 560) for every guest, so the bill never reconciles with the row. | Row "balance due" = bill Grand Total; room charge = rate × nights − actual advance. | Room 102 (R. Fernandes, Deluxe, 1 night): row **₹2,150 balance due** → bill Room ₹1,000 − ₹100 + GST ₹50 = ₹950; Grand **₹2,425**. Room 113 (3 nights) also ₹1,000, zeroed by a synthetic "Other room payments −₹950". | iteration_26 H2/H3; screenshot 1366×768 bill. Derive room block from `g` (type rate × nights, real advance). |
| **QA-385-002** | Arrivals row · Check-In · Modify · No-Show/Cancel | BUG | **One booking, four amounts.** Each screen reads a different field for "booking amount". | Identical booking value on every screen (per-night rate × nights + plan supplement). | a1 J. Pereira (Booking.com, Executive, 3 n): row ₹ **1,000** (`o.amt`, line 432) · Cancel prepaid **₹3,000** (`amt×nights`, line 549) · Modify "Current booking" **₹10,395** (3300×3 + 5 %, line 510) · Check-In a2 "Booked charge · 3 nights" **₹2,200** (`charge = line.amt`, NOT × nights, line 641). | iteration_26 H1. Single `bookingCharge(o)` helper used by all five call-sites. |

### P1 — High
| ID | Screen | Type | Issue | Expected | Actual | Evidence / fix hint |
|---|---|---|---|---|---|---|
| **QA-385-003** | Arrivals · Room Detail (booked) | BUG | Room-link IIFE (line 332) rewrites `a.type = r.type` but leaves `a.amt`, so the ₹ column **contradicts the rate table** (Suite 4500 / Exec 3300 / Deluxe 2200). | Amount matches the shown type. | Row 119 **Executive ₹2,200**, 120 **Deluxe ₹4,500**, 221/224 **Suite ₹1,000**. Check-In 119 header "Executive · Room 119", bill ₹2,200. | Screenshot 1280 Arrivals; `arr` dump. Recompute `amt` from `CI_RATE[r.type]` when linking. |
| **QA-385-004** | Extend Stay › Collect now | BUG | Over-collection is accepted: **negative "Balance remaining"**, readiness says Ready, **Confirm enabled**. | Cap at Total payable or show error; Confirm disabled. | `?room=101:extend`, Collect 999999 + Cash → Total payable ₹3,465, Balance remaining **₹-9,96,534**, Confirm enabled (line 474/475). | iteration_26 H4. Add `collected > totalPayable → 'Amount exceeds payable'`. |
| **QA-385-005** | Modify Booking | BUG | No guard for **Adults blank/0**, **past check-in**, **over-collection**. | Save disabled with reasons. | `?room=119` › ⋮ Modify: adults "" + check-in 2026-09-01 + reason "test" → Save **enabled**, readiness "Ready · collect ₹55,440" (line 511). | iteration_26 H5. Extend `modMissing()`. |
| **QA-385-006** | New Booking | BUG | Same gaps: **past check-in**, **Adults blank**, **advance > total → negative balance**, Save & Save-and-Check-in enabled. | Save disabled; balance ≥ 0. | `?booking=1`: cin 2026-09-01, adults "", advance 999999 → readiness "Ready to save this booking", balance **₹-9,95,379** (line 744/745). | Own run. Extend `nbMissing()`; also `booking-checkout` has no `min`. |
| **QA-385-007** | In-House · Departures | BUG (seed/business state) | Guests in rooms **102–105 have check-in = check-out = today** yet are billed "1 night" and listed both under "Arrived today" and "Leaving today". | A stay has ≥1 night; a same-day arrival cannot also be a scheduled departure. | Rows show Check-in "17 Sep · today" and Check-out "17 Sep · 1 night" (`guests` seed line 326: `cin:i<6?T…`, `cout:i<5?T`). Extend on 102 then reads "Check-in 17 Sep · Check-out 17 Sep". | Own run (INHOUSE rows). Handover said room 101 was fixed; 102–105 were not. |
| **QA-385-008** | Bill › settlement | UXG | "**₹2,425 received**" is a fixed label equal to Grand Total; there is **no amount-received input**, so partial payment / short payment / "Credit" (bill-to-company) cannot be represented, and the label asserts full receipt before any payment. | Editable amount received → outstanding shown; Credit method sets received ₹0 + outstanding to folio/company. | line 596 `${money(grand)} received`. Prompt §5A explicitly requires empty / partial / fully-paid states — only "fully paid" exists. | Screenshots bill. Note: Checkout v2.9 is LOCKED — raise as CR against the lock, not silent change. |
| **QA-385-009** | No-Show · Cancel dialogs | BUG (arithmetic) | **SGST/CGST rows on the penalty are displayed but not applied**: Refund due = Prepaid − Penalty, ignoring the tax it lists. | Either refund = prepaid − penalty − tax (tax charged on top) or label tax as "included in penalty". | F. Almeida: Prepaid ₹9,000 − forfeited ₹4,500, SGST ₹112.5 + CGST ₹112.5 shown, Refund **₹4,500** (not ₹4,275). J. Pereira cancel: 3,000 − 1,000 (+25+25 shown) → ₹2,000. (`refundCard`, line 553). | Screenshot no-show dialog. Backend owns the policy, but the mock must state which it is. |

### P2 — Medium
| ID | Screen | Type | Issue | Expected | Actual | Evidence / fix hint |
|---|---|---|---|---|---|---|
| QA-385-010 | Check-In (right pane) | UXG | At **1366×768 and 1024×768** both panes get an **internal scrollbar**; "Remaining balance" is below the fold of the right pane (primary button still visible in pinned footer). Booking right pane also scrolls at every size ≤1440. | No right-pane scroll for the money summary (design rule, defined at 1920×800). | Measured `scrollHeight>clientHeight`: Check-In right pane **true** @1366/1024; left pane true at all sizes. | Viewport sweep; screenshot 1366 check-in. Rule may need to be restated for 1366×768 (most common laptop). |
| QA-385-011 | Bill › Guest & stay card | BUG/UIC | Prepaid/Pay-at-hotel badge is derived from **channel** (`pah(o.ch!=='Direct')`, line 564): OTA MakeMyTrip → "Pay at hotel", Direct → "Prepaid", Walk-in → "Pay at hotel". Contradicts Variant-A rule (OTA = prepaid) used by No-Show/Cancel and the arrivals `pah` flag. | Same field/meaning for Prepaid on every screen. | Room 102 · MakeMyTrip shows **PAY AT HOTEL** in the bill card. | Screenshot bill. Store `pah` on `guests` seed and read it. |
| QA-385-012 | Bill (Room vs F&B blocks) · all bills | UIC | **Tax line order and labels differ**: Room "SGST · 2.5%" then CGST; F&B "CGST 2.5%" then "SGST 2.5%"; Check-In/Extend/Modify/Booking "SGST · sample 2.5%"; No-Show "SGST · sample 2.5%" indented under penalty. | One order (SGST → CGST) and one label pattern. | lines 577-578 vs 589. | Trivial, but visible on the two screens the stakeholder compares. |
| QA-385-013 | All money displays | UIC | **Currency formatting is not unified**: `money()` = no rounding (`₹1,234.567`), one-decimal outputs (`₹112.5`), F&B uses `toFixed(2)` (`₹17.48`, `+₹0.04`), negatives render **`₹-9,96,534`** (sign after symbol). | `₹1,234.57` / `−₹500`, consistent decimals per context. | `money(-500)='₹-500'`, `money(112.5)='₹112.5'`, `money(1234.567)='₹1,234.567'`. | Own run. Use `Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'})` or fixed 2-dp helper. |
| QA-385-014 | Panel headers (7 dialogs) | UIC | **Five different dismiss labels** for the same action: Bill "Close", Check-In "Close", Extend/Modify/Booking "✕ Cancel", No-Show/Cancel "✕ Close", Room Detail "✕" only. In **Modify Booking** the header "✕ Cancel" sits next to a workflow where "Cancel booking" is a destructive action → ambiguity. | One label + glyph (recommend "✕ Close"); never "Cancel" as a dismiss where booking-cancel exists. | iteration_26 H6 list. | |
| QA-385-015 | Panel footers | UIC | **Three footer patterns**: [Cancel][Primary] (Check-In/Booking/Extend/Modify) · [Back][Danger] (No-Show/Cancel) · single full-width "Checkout ₹X" with no secondary (Bill). Primary heights also differ (34px `.btn` vs auto-height `.ci-payment-actions .btn.p` min 36px vs full-width). | Same footer grammar and primary size for all final-confirmation actions. | Code: lines 505, 538, 597, 618, 633, 708, 784. | |
| QA-385-016 | Arrivals row / kebab / dialog | UIC | **No-Show colour semantics differ**: red outline on expired-row button (`.btn.dg`), **amber** text in kebab (`color:var(--am)`, line 804), red on dialog Confirm. Cancel is red everywhere. | One colour per destructive action. | iteration_26 H7 (room 223 kebab amber). | |
| QA-385-017 | Refund-mode / Notify toggles | UIC | Single-select toggles use **two component styles**: payment & discount pills = `.ci-pill`/`.pm button` (black inset ring); No-Show/Cancel refund-mode and Notify = `.btn.sm.o` (orange outline); Modify refund-mode = `.ci-pill`. | One segmented-toggle component. | lines 557, 625 vs 536. | |
| QA-385-018 | Whole module | UIC (content) | **Terminology drift**: "Check In" (button/title) · "Check-In" (Confirm Check-In) · "Check-in" (column) · "Check in" (Save & Check in now) · "checked in"; "Bill" (button) vs "Final figures" (pane) vs "folio" (Extend/Modify line) vs "Checkout"; sidebar "Room Status" vs tab "Rooms"; "HK" vs "Housekeeping"; "OOO" vs "Out of order"; "In-House" tab vs "In-house" badge. | Standardise: **Check-In** (noun/title), **check in** (verb), **Bill** for the UI, **Checkout** one word; expand HK/OOO on first use per screen. | grep of labels. Recommendation only — do not auto-change. | |
| QA-385-019 | Rooms tile (occupied) | UIC | Tile sub-line prints **raw ISO date** `out 2026-09-19` (line 816) while every other surface prints `19 Sep`; Bill guest card is the only place with a time (`14:20`). | `fd()` everywhere; time either everywhere or nowhere. | Rooms tab tiles 101, 106…; screenshot. | |
| QA-385-020 | KPI strip · In-House | BUG (latent) | In-House "leaving today" = `cout <= T` (line 404/451) **includes overdue** guests, so it will exceed Departures "today" as soon as one guest is overdue. Today's seed has 0 overdue → both read 4, masking it. | "Leaving today" = `cout === T`; overdue counted separately (as Departures already does). | Code trace; reproducible by extending seed. | |
| QA-385-021 | Bill adjustments / payment state | BUG | Discount type/value/reason, coupon, loyalty, payment method and reference live in **global `S`** and are **not reset when a different guest's bill is opened** → leak between folios in one session. | Per-bill draft keyed by guest id (as Extend/Modify already do with `EX`/`MOD`). | lines 340-342, 595-596; open bill 102 → apply coupon → open bill 103 → coupon still applied. | iteration_26 note. |

### P3 — Low
| ID | Screen | Type | Issue | Actual | Fix hint |
|---|---|---|---|---|---|
| QA-385-022 | KPI tab sub-lines | UIC | Sub-line text is **clipped mid-word without ellipsis** at ≤1440 wide ("6 arrived toc"): `text-overflow:ellipsis` has no effect on a flex container. | Measured `scrollWidth>clientWidth` on 1 sub-line @1440/1366/1280, 2 @768. | Wrap the links in a block span or drop `.opt` earlier. |
| QA-385-023 | Header search · row actions (tablet/small laptop) | UIC | @768 search input shrinks to **110px**; @1024 the 3 row buttons (Bill · Request HK · Extend) **wrap to two lines** making rows 2× tall. | Viewport sweep; screenshot 1024 bill. | Min-width for search; collapse 3rd action into kebab ≤1100px. |
| QA-385-024 | Check-In facts · Room Detail · Bill card | UIC (grammar) | "**1 nights**" (Check-In stay fact + "Booked charge · 1 nights", lines 687/699); "**Overdue · N day**" never pluralised (line 438); "night(s)"/"day(s)" style in Bill card & Room Detail vs runtime plurals elsewhere. | `?checkin=a3` → "17 Sep → 18 Sep · 1 nights". | One `plural(n,'night')` helper. |
| QA-385-025 | Arrivals vs Departures/In-House "₹" column | UXG | Same column header "₹" means **booking amount (per-night)** on Arrivals and **balance due** on Departures/In-House; Room Detail "Amount ₹X · prepaid" also unlabelled per-night/total. | Row data. | Header "Booking ₹ / night" vs "Balance"; or label the cell sub-line. |
| QA-385-026 | Accessibility | UXG | Muted text `#888` on white ≈ **3.5:1** (fails AA for 10–11px text used for sub-lines, hints, section labels); sidebar labels **8px**; hit targets 22–28px (`.btn.sm`, `.kebab`, `.opts .op`); `:focus-visible` styles defined only inside bill/check-in expansions (chips, tabs, row buttons rely on browser default); icons are **emoji** (🔍 🧹 ⚠ ⋮ ▾ ✕) → glyph/size varies per OS/browser. | CSS lines 5, 15, 31, 66, 94, 140, 194. | Darken `--mu` to ≥ #767676; SVG icons (lucide) for consistency. |
| QA-385-027 | Review hook `?open=a1:cancel` + QA plan §0 | Doc/observation | Hook opens **Cancel for an OTA (Booking.com) booking**, bypassing the OTA→No-Show-only rule; the QA plan documents it as an expected path. | `?open=a1:cancel`. | Hooks should route through `nsOrCancel()`; update plan to use a non-OTA id (e.g. `a0`). |
| QA-385-028 | Version labels | Doc | Hidden `#ctl` says **v2.21**, `freeze()` says **v2.22**, `<title>` v2.25; per-panel disclaimers cite v2.16/v2.18/v2.20/v2.21 (intended, but reads as drift). | lines 280, 869. | Single `VERSION` const. |
| QA-385-029 | Bill › Checkout button | UXG | Checkout is a **one-click irreversible** action (row removed, room → HK) with no confirm step, while the far less consequential No-Show/Cancel get a confirmation dialog. | line 597/799. | Decide deliberately (D-record) — inline "Confirm checkout ₹X" second click, or accept and document. |
| QA-385-030 | Check-In (late arrival) | UXG/policy | Chip says "Late · arrived 17 Sep · **2 nights left**" but bill charges the full "Booked charge · 3 nights". Correct if policy = pay all booked nights; ambiguous otherwise. | `a1` Check-In. | Add a one-line policy note ("late arrival — full booking charged") or recompute. |
| QA-385-031 | Rooms › Mark all clean panel · Room Detail booked kebab | UIC | Mark-all-clean panel uses a third dialog chrome (card→exp→exf with "Cancel"/"Confirm") and Room Detail hosts action buttons **inside the header** while all other panels keep actions in the footer. | lines 836, 841. | Align to footer-action pattern. |

---

## D. CROSS-SCREEN DESIGN INCONSISTENCIES (grouped)
**Buttons** — dismiss label ×5 variants (QA-014); footer grammar ×3 (QA-015); primary sizes 34px `.btn` / 36px+ auto in `.ci-payment-actions` / full-width Checkout; No-Show colour red↔amber (QA-016); Room Detail actions in header (QA-031).
**Typography** — Poppins throughout ✔; body 12px, tables 11–12px, hints 10px, disclaimers 9px, sidebar 8px — five sub-12px sizes; `text-transform:uppercase` headers in Bill (`.adjh`, `h4`) vs sentence-case `h3` uppercase in Check-In family ✔ consistent within family but Bill "Final figures" heading is 12px normal-case while "Extension bill"/"Modified bill"/"Bill & collection" are 14px `h2`.
**Forms** — Check-In family inputs 32px `.ci-input` r6 vs Bill `.num/.sel/.reason` 4px-padding r6 vs No-Show/Cancel reuse `.reason`/`.sel` (Bill style) for note/reason → dialogs look like Bill, not like the Check-In family; date inputs native (browser format) vs `fd()` text elsewhere.
**Cards** — `.fc` r8 / `.box` r8 / `.exp` left 3px orange bar / Room Detail `.rex .exp` r8 with border — consistent; tiles r10 vs cards r10 ✔.
**Colours / statuses** — Prepaid/PAH badge semantics differ by screen (QA-011); status badge set (`b-r/b-a/b-g/b-gy/b-o`) consistent ✔; room status colours via `col{}` consistent ✔.
**Navigation** — Esc closes any expansion ✔; reveal-scroll consistent across all 7 panel types ✔ (measured); kebab menus auto-close ✔.
**Payment UI** — method pills consistent (black inset) ✔ except refund/notify toggles (QA-017); Checkout has "Credit" others don't (intentional); reference field label "Reference / txn id" (Bill) vs "Txn / UTR no." (all others).
**Billing UI** — tax order/labels (QA-012); currency formats (QA-013); "folio" vs "Bill" vs "Final figures" (QA-018); Bill = collapsible `<details>` ledger, others = flat `ci-money` rows (accepted D14, but the two "sample screens" therefore look like different systems — flag for stakeholder awareness).

---

## E. FUNCTIONAL FLOW RESULTS
| Flow | Result | Notes |
|---|---|---|
| Departure → Bill → adjustments → payment → Checkout | **PASS WITH ISSUES** | All controls work: discount %/₹/Staff recompute, coupon disables discount select, loyalty toggles, payment pills `aria-pressed`, reference persists across re-render, Print toast, Checkout removes row, Departures −1, HK +1, footer counter +1, no double-fire (row gone after first click). Failures: QA-001, 008, 011, 012, 013, 021. |
| Extend Stay (+1, +3 nights, discount, UPI/UTR, conflict → room move, confirm) | **PASS WITH ISSUES** | Conflict on even rooms triggers ⚠ + picker + ★ suggestion + "Room move" progress; confirm moves guest, old room → HK. Totals correct (§F). Failure: QA-004 (over-collect), QA-007 (same-day seed on 102). |
| Booking → Save / Save & Check in now | **PASS WITH ISSUES** | Grid selects type+plan; bill lines room+meal; CRM autofill 9811122233; advance carried into Check-In as already-paid. Failure: QA-006. |
| Check-In (assign, upgrade paid/comp, B2B, IDs, collect, auto-print, confirm) | **PASS WITH ISSUES** | Ready state only after all fronts; comp upgrade needs reason + manager tick; over-collect shows "Credit after collection" ✔ (the only screen that handles it). Failures: QA-002, 010, 024, 030. |
| Modify Booking (no-op / longer / cheaper / reason) | **PASS WITH ISSUES** | Change = ₹0 / + / − correct; refund-mode pills. Failure: QA-005. |
| No-Show (OTA) / Cancel (non-OTA) incl. reason → penalty 0, refund mode, confirm, counters | **PASS WITH ISSUES** | Single-button rule holds at row, kebab, alert, search, Room Detail ✔. Failure: QA-009 (tax rows not reconciled), QA-027 (hook). |
| Rooms ops (Mark Clean / OOO / Back in service / Needs HK / Request HK / Book Room / Mark all clean) | **PASS** | Tab counts update live; Turns filter 4 = tiles 4; Area 4×10 = 40; Type = 40. |
| Global search + keyboard | **PASS** | `/`, ↑↓, Enter, Esc, click-outside, "filtered by" chip, no-results + "+ New booking for this number". |
| Alert bar | **PASS** | 3 inline + "+3 more" → popover lists 6, priority ordered, links navigate & open the right row/dialog. |

---

## F. CALCULATION / BUSINESS-LOGIC RESULTS
| Check | Formula | Observed | Reconciles? |
|---|---|---|---|
| Bill room block (102) | 1000 − 100 = 900; +25 +25 = 950 | ₹1,000 / −₹100 / ₹900 / +₹25 / +₹25 / ₹950 | ✔ internally · ✘ vs row ₹2,150 (QA-001) |
| Bill F&B (102) | items 699; CGST 17.475→17.48; SGST 17.48; ceil(733.96)=734; round-off 0.04 | ₹699 · ₹17.48 · ₹17.48 · +₹0.04 · ₹734 | ✔ |
| Bill settlement | 734 + 741 + 950 | Grand ₹2,425 | ✔ |
| Bill paid guest (113) | room 1000−100+50−950 = 0; no F&B | ₹0 · Checkout ₹0 enabled | ✔ (design accepts ₹0 checkout) |
| Extend 101 (+1 night Exec) | 3300 → tax 165 (82.5+82.5) → 3,465; payable = 0 + 3,465 | ₹3,465 | ✔ |
| Extend 102 (+3 nights Deluxe) | 2200×3 = 6,600; tax 330; total 6,930; payable 2,150 + 6,930 | ₹9,080 "stays on folio" | ✔ |
| Extend over-collect | payable − 999,999 | ₹-9,96,534, Confirm enabled | ✘ QA-004 |
| Modify no-op | new − current | ₹0 | ✔ |
| Modify current booking (a1) | (3300+0)×3 = 9,900 + 495 | ₹10,395 | ✔ internally · ✘ vs row ₹1,000 / Cancel ₹3,000 / Check-In ₹2,200 (QA-002) |
| Check-In a2 | charge 2,200 (label "3 nights") + 110 GST = 2,310 − 500 advance | ₹1,810 | ✔ internally · ✘ label vs value (QA-002) |
| No-Show F. Almeida | 4500×2 = 9,000; penalty 4,500; tax 225 shown; refund 9,000−4,500 | ₹4,500 | ✘ tax displayed but not applied (QA-009) |
| Cancel J. Pereira (via hook) | 1000×3 = 3,000; penalty 1,000; tax 50 shown; refund | ₹2,000 | ✘ same |
| Cancel a0 (pay-at-hotel) | prepaid 0 | "Nothing paid — no refund" | ✔ |
| Cancel reason Duplicate / Payment failed | penalty 0 | full refund | ✔ |
| KPI strip vs lists | Arrivals 6 today/3 late; Departures 4/0; In-House 18 · 4 leaving · 6 arrived; Rooms 45 % = 18/40 · 12 free · 5 HK · 1 OOO | chip counts & row counts match | ✔ today · latent ✘ QA-020 |
| Rooms grouping | Type Σ = 40; Area Σ = 40; Turns chip = tiles | 40 / 40 / 4 = 4 | ✔ |
| Alerts | 3 inline + "+N more" = popover count | 3 + 3 = 6 | ✔ |

---

## G. RESPONSIVE / BROWSER RESULTS
Measured per viewport for Arrivals, `?bill=102`, `?checkin=a2`, `?booking=1`, `?room=101:extend`, `?open=ans:noshow`, `?room=240`:

| Viewport | H-overflow | Primary button in viewport | Inner scroll (left / right pane) | Tab sub-line clipped | Row actions wrap | Search width |
|---|---|---|---|---|---|---|
| 1920×1080 | none | all ✔ | Check-In L ✔/R ✘ · Booking L only · Bill none · Extend none | 0 | no | 380 |
| 1440×900 | none | all ✔ | same | **1** | no | 380 |
| 1366×768 | none | all ✔ | **Check-In L + R** · Booking L | **1** | no | 380 |
| 1280×800 | none | all ✔ | Check-In L · Booking L | **1** | no | 380 |
| 1024×768 | none | all ✔ | **Check-In L + R** · Booking L | 0 (`.opt` hidden) | **yes** (Bill/HK/Extend) | 366 |
| 768×1024 (tablet) | none | all ✔ | Check-In L · Booking L | **2** | **yes** | **110** |

Design invariant "primary action visible without scrolling" **holds at every size** (pinned footers). Reveal-scroll verified for No-Show (dialog bottom 772 < 800) and Room 240. Issues: QA-010, 022, 023.

**Browsers:** Chromium only (Playwright). Safari/Edge **NOT TESTED**. Risk list for the browser pass: emoji glyphs (🔍 🧹 ⚠ ⋮ ▾) differ per platform; `scrollbar-gutter:stable` (no Safari <17); `100dvh` (Safari ≥15.4); `inert` attribute; `::-webkit-details-marker` only (Firefox shows default marker); native `<input type=date>` UI differs; `accent-color`.

---

## H. REGRESSION TEST CHECKLIST (reusable, for every future CR-385 build)
Run at **1920×800** and **1366×768**; record console = 0 errors.
1. **Money integrity (one booking):** for a1 and a2 — Arrivals ₹ = Check-In "Booked charge" = Modify "Current booking" (pre-tax) = No-Show/Cancel "Prepaid" basis. Row type matches rate table.
2. **Bill reconciles:** Departures row balance = Bill Grand Total; Room block = rate × nights − real advance; SGST before CGST, same label pattern; currency 2-dp with leading sign.
3. **Bill controls:** discount % / ₹ / Staff / coupon / loyalty recompute; state resets when another bill is opened; payment ref persists on re-render; Checkout removes row, Departures −1, HK +1, counter +1.
4. **Extend:** +1 / +3 nights; discount > 100 % blocked; over-collect blocked; UPI needs UTR; even-room conflict → picker + ★; confirm moves guest.
5. **Modify:** no-op ₹0; longer +; cheaper − with refund pills; blocked when adults < 1, reason empty, past check-in, over-collect.
6. **Booking:** blocked when past check-in, adults < 1, advance > total; grid cell = type+plan; Save & Check in carries advance.
7. **Check-In:** Ready only when all ID fronts + room + (B2B fields); upgrade comp needs reason + manager; over-collect shows credit; no right-pane scroll at 1366×768; "1 night" singular.
8. **No-Show / Cancel:** OTA → No-Show only, non-OTA → Cancel only at row / kebab / alert / search / Room Detail / hooks; reason Duplicate or Payment-failed → penalty 0; tax rows reconcile with Refund due; counters increment once.
9. **Seed sanity:** no guest with check-in = check-out; In-House "leaving today" = Departures "today" + 0 overdue.
10. **KPI reconciliation:** each tab number = chip count = rows; Rooms Type Σ = Area Σ = 40; Turns chip = tiles; alert inline 3 + more = popover.
11. **Rooms ops:** Mark Clean / OOO / Back in service / Needs HK / Request HK / Mark all clean update counts and tiles; Room Detail per status shows correct cells + actions; reveal-scroll on 240.
12. **Consistency sweep:** one dismiss label, one footer grammar, one toggle component, No-Show colour, `fd()` dates everywhere, pluralisation.
13. **Responsive:** no h-overflow 768–1920; primary button on-screen; row actions single line ≥1280; tab sub-lines ellipsised.
14. **Keyboard / a11y:** `/` ↑ ↓ Enter Esc; visible focus on chips/tabs/row buttons; contrast ≥ 4.5:1 on all ≤12px text.

---

## I. SUGGESTED FIX ORDER (for the separate implementation phase — not done here)
1. QA-002 + QA-003 + QA-001: one `bookingCharge()` source of truth (rate × nights + plan supp; advance stored on the record); Bill room block derived from it. Requires re-opening **Checkout v2.9 (LOCKED)** and **Check-In v2.16 (LOCKED)** — needs owner authorisation.
2. QA-004/005/006: validation guards (over-collect, past dates, adults ≥ 1) in `exMissing/modMissing/nbMissing`.
3. QA-007 seed fix (102–105) and QA-020 filter fix.
4. QA-009 decide tax-on-penalty semantics; QA-011 store `pah` on guests.
5. QA-012/013/014/015/016/017/019/024: one consistency pass (money formatter, labels, footer, toggles, dates, plurals).
6. QA-008 / QA-029 / QA-030 need product decisions (D-records) before any change.
