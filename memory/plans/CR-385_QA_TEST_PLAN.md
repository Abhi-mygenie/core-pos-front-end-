# CR-385 · Front-Desk Workstation Mockup — QA TEST PLAN & VERSION WALKTHROUGH
Status: v2.26 — QA-audit fixes applied (D44) · re-QA against this plan + plans/CR-385_QA_AUDIT_REPORT.md · Date 2026-06

> For the QA reviewer (human or agent). This is a **static, fully-mocked interactive HTML mockup** —
> a design prototype, **no backend**. Everything (pricing, GST, availability, payments, HK, documents,
> CRM, print, sections) is client-side demo data. QA is verifying **design, flows and interaction
> correctness**, NOT real data/persistence. Nothing persists across reload.

---

## 0. How to run it
- **URL:** `{REACT_APP_BACKEND_URL}/cr385-frontdesk-mockup.html`
  (REACT_APP_BACKEND_URL is in `/app/frontend/.env`; currently `https://pos-front-staging-2.preview.emergentagent.com`)
- **Viewport for all checks: 1920×800** (the no-scroll invariant is defined at this size).
- **File under test:** `/app/frontend/public/cr385-frontdesk-mockup.html` (single self-contained file).
- Tabs (left nav): Front Desk (dashboard strip) · Arrivals · Departures · In-House · Room Status · (Tape Chart / POS / OTA are placeholders).

### Review hooks (open a specific panel deterministically via URL query)
| Hook | Opens |
|---|---|
| `?checkin=a2` | Check-In panel for arrival `a2` (add `&concept=multi` to see the multi-room *concept*, Phase-2/ON-HOLD) |
| `?bill=102` | Checkout / folio for the departing guest in room 102 (use any departing room no.) |
| `?booking=1` | New Booking form |
| `?open=ans:noshow` | Mark No-Show dialog (F. Almeida, OTA/MakeMyTrip — enabled path + refund) |
| `?open=a1:cancel` | Routes through the source rule → opens **No-Show** for a1 (Booking.com). Use a Direct prepaid arrival (kebab › Cancel booking) for the Cancel-with-refund case |
| `?room=101` | Room Detail — occupied |
| `?room=119` | Room Detail — booked (Direct source) |
| `?room=223` | Room Detail — booked (OTA source) |
| `?room=225` | Room Detail — housekeeping (dirty) |
| `?room=228` | Room Detail — out of order |
| `?room=229` | Room Detail — available |
| `?room=101:extend` | Extend Stay opened from an occupied room tile |

Key mock IDs: arrivals `a0`(Direct, expired=K.Menon) · `a1`(Booking.com, late multi-night=J.Pereira) · `ans`(MakeMyTrip, expired prepaid=F.Almeida). Rooms 101–120 (sections Patal Lok/Baga Wing) and 221–240 (Anjuna Block/Palm Court).

---

## 1. GLOBAL INVARIANTS (check on EVERY panel)
1. **No internal scroll at 1920×800** — every expanded panel/dialog must show its primary action
   button (Confirm/Save/Check-In/etc.) without an inner scrollbar on the right pane.
2. **SGST and CGST are ALWAYS separate lines** — never merged, on every bill/outcome.
3. **Expand-in-place** — operational panels expand inline in the list (not modal popups). (No-Show/
   Cancel are compact inline confirmation dialogs, still inline.)
4. **Reveal-scroll** — opening a panel from a lower row auto-scrolls so the whole panel is on-screen.
5. **data-testid** present on interactive + critical elements.
6. **Zero JS console errors** on every route.
7. **Alert bar** shows top exceptions + a `+N more` popover (priority-ordered).

---

## 2. LOCKED / FROZEN BASELINES — regression only, do NOT expect changes
These were closed in earlier sessions; QA should confirm they still render and behave, but they are
**not** in scope for redesign.

### 2A. Checkout / Folio — v2.9 (LOCKED)  ·  hook `?bill=102`
- Single-screen folio: LEFT = room + orders + transferred (collapsed) + adjustments (room/F&B
  discount, loyalty, coupon); RIGHT = booking total, advance, pre-GST balance, **SGST**, **CGST**,
  payable total, payment method (Cash/Card/UPI + transaction fields), Grand Total.
- Verify: discounts recompute totals; SGST/CGST separate; grand total correct; no right-pane scroll.

### 2B. Check-In — v2.16 (LOCKED)  ·  hook `?checkin=a2`
- Checkout-mirrored layout; ID/document cards with lightbox concept; room assignment + upgrade flow;
  checkout-style payment pills; compact booking facts; **auto-print receipt** setting + per-check-in
  override (v2.15); **B2B/GST** toggle capturing GST customer name + GSTIN (v2.16); completion badge /
  Ready state. Multi-room is **ON HOLD / Phase-2 concept only** (`&concept=multi`).
- Verify: room assign + upgrade updates figures; B2B reveals GST name+GSTIN (required); auto-print
  toggle; Ready badge; no right-pane scroll.

### 2C. New Booking — v2.18 (LOCKED)  ·  hook `?booking=1`
- **Type-only** (reserves a room TYPE from inventory, not a room number; room number assigned at
  Check-In; documents captured at Check-In). Room × rate-plan **matrix grid** (rows=types,
  cols=plans, each cell = all-in per-night price; one click selects both type & plan). **B2B/GST**
  under the Guest block (GST name + GSTIN inline). Optional **advance** → passed to Check-In as
  already paid. RIGHT bill shows advance + GST company. `Save` and `Save & Check in now`.
- Verify: grid cell selects type+plan and updates price; advance shows in bill; row re-click
  collapse; Save & Check in now carries type/guest/dates/advance/B2B into Check-In.

---

## 3. THIS PROGRAMME'S WORK — full QA scope (v2.19 → v2.25)

### 3A. Extend Stay — v2.20  (in-house/departures row → Extend; or `?room=101:extend`)
Right pane shows the WHOLE current bill position, not just the increment:
- Pending balance (folio) · Extension charge · Discount (if any) · **SGST** · **CGST** · **Total
  payable** · optional **Collect now** (Cash/Card/UPI + UTR) · **Balance remaining** on folio.
- **Conflict:** if the same room is unavailable for the new dates → show conflict, **auto-suggest the
  first available same-type room**, require a room move before Confirm.
- Rate reductions modelled as **discounts** (no raw rate override).
QA: extend by N nights recomputes bill; discount reduces total; UPI shows UTR; conflict forces room
move; no right-pane scroll. (Evidence: iteration_17/18/19.)

### 3B. Modify Booking — v2.21  (Arrivals kebab ⋮ → Modify booking; or room booked kebab → Modify)
Pre-check-in, so it uses the **Booking-style type × rate-plan grid + type-level availability** (NOT
Extend's assigned-room move).
- LEFT: Guests · Stay dates (auto night calc) · type×plan grid · type availability · optional
  discount · **required reason/audit**.
- RIGHT: Pending balance · **Current booking amount (= rate × nights)** · New booking charge ·
  **Change** line (positive = extra to collect / negative = refund/credit) · Total payable · Collect
  now · Balance remaining.
QA (KEY arithmetic): **no change → Change = ₹0**; longer stay / pricier plan → **positive collect**;
shorter / cheaper → **negative refund/credit**; SGST/CGST separate; no right-pane scroll.
(Evidence: iteration_20/21.)

### 3C. No-Show + Cancel — v2.22 (+refinements)  (`?open=ans:noshow`, `?open=a1:cancel`)
Compact **confirmation dialogs** (destructive, low-input). **Backend owns the penalty**; the desk
just confirms; the dialog shows a **read-only money outcome**:
- Prepaid/advance → Forfeited/penalty (**separate SGST + CGST**) → **Refund due** → refund-to-guest /
  folio-credit toggle (labelled **Phase-2 mock**). `prepaid = 0` collapses to "Nothing paid".
- **Single-button rule by source (never both):** **OTA** (booking.com / makemytrip) → **Mark
  No-Show** only; **non-OTA** (Direct / Walk-in / Goibibo) → **Cancel** only. Enforced at the
  expired-row button, the kebab (⋮), the alert-bar links, and global search.
- Non-OTA No-Show stays **disabled** (backend BQ-385-04) via routing to Cancel; OTA No-Show enabled.
- Cancel keeps a **config-driven Reason** select + Notify toggle + audit note.
- Variant-A prepaid seeding (v2.26, D44-g): prepaid = booking total incl. GST for prepaid/OTA, ₹0 for pay-at-hotel. Refund = prepaid − penalty − GST on penalty (D44-b).
QA (v2.26): F.Almeida no-show → Prepaid ₹9,450 / forfeit ₹4,500 / SGST − ₹112.50 / CGST − ₹112.50 / Total deducted − ₹4,725 / refund ₹4,725, Confirm
enabled; Direct prepaid cancel → refund = prepaid − first night − 5 % of it; changing Cancel reason
to Duplicate/Payment-failed → penalty ₹0, full refund; single-button rule holds everywhere;
reveal-scroll from a low row. (Evidence: iteration_21/22.)

### 3D. Room Detail — v2.23  (`?room=<no>`)
Flat cell grid (kept, gaps filled) — a property manager can run **every front-desk op from a tile**:
- Cells per status: Guest (name·masked phone·A/C), Stay (night X of Y), Balance, Source·booking,
  **Housekeeping** (Clean/Dirty/In-progress + set-by + assignee, read-only) with a **"Manage in
  Housekeeping →"** link (CR-365, MOCKED toast), **Next arrival / turn** (named guest if a booking is
  assigned to that exact room, else "none assigned · N {type} arrivals ahead"; **"Turn today"** chip
  when a leaving-today room has a same-day arrival). Rate from the rate table.
- Actions: occupied → Bill · **Extend** · Request HK · Mark OOO(disabled); occupied·HK → Bill ·
  Extend · Mark Clean; **booked → Check In + kebab (Modify + No-Show/Cancel by source)**; hk → Mark
  Clean · Mark OOO; ooo → Back in Service · Needs HK; available → Book Room · Needs HK · Mark OOO.
- Booked rooms are **linked to distinct arrivals** so Check-In/Modify/Cancel resolve a real booking.
QA: each status shows the right cells + actions; Extend/Modify/Cancel/No-Show/Check-In open the right
panel; reveal-scroll on a low tile. (Evidence: iteration_23.)

### 3E. Rooms controls cleanup — v2.24
- **Density/Compact removed** (always Comfortable). **Group-by** is now a single **light segmented
  control** on the top filter row: **Room no. · Type · Area** (no more second row of big pills).
QA: one control row; group modes render correct headers; no Compact anywhere. (Evidence: iteration_24.)

### 3F. Real board shape + section grouping + Turns — v2.25
- Mock room model **mirrors the real board payload**: `table_no, title (section), code
  (aiosell_room_code), display_status/manual_status/is_occupied, hk_assignee,
  room_operational_status_at, guest{...}, reservation`.
- **"Group by Area" groups by `title` (section)** — MOCK sections **Patal Lok / Baga Wing / Anjuna
  Block / Palm Court** (10 rooms each) until the real `title` list is wired. Section shown in the
  Room-Detail header ("Room 101 · Executive · Patal Lok").
- **"Turns today" filter** = occupied rooms whose guest checks out today AND a same-type arrival
  comes in today (same-day turn needing a fast clean).
QA: Area → 4 sections summing to 40; Type → Suite/Executive/Deluxe; Turns chip count = rooms listed;
`hk_assignee` populates the HK cell. (Evidence: iteration_25.)

---

## 4. MOCKED — do NOT raise as bugs (by design, no backend)
Pricing, GST rates/amounts, availability, penalties/refunds & refund mode, HK assignee/timers/ETA,
section (`title`) names, payments & transaction refs, ID/documents & lightbox, CRM flags, receipt
printing, alert contents, "sync" indicator. All figures are demo values; **nothing persists on
reload**; "Manage in Housekeeping →" is a mock toast (CR-365 module not built).

## 5. DEFERRED / PARKED (out of scope, not defects)
Multi-room Check-In (Phase-2, ON HOLD) · booking-wide payment split · early check-in fee/waiver ·
welcome-slip / registration-card print (CR-364-PRINT) · discount unification across all charge
screens · Section/Floor KPIs · wiring real `title`/section list & real `guest{}` payload · real
refund/credit processing · live API/backend integration · CR-365 Housekeeping Workflow (separate
module: HK task queue, crew assignment, checklists, timers).

## 6. TEST EVIDENCE MAP (agent-tested; NOT user-acceptance)
- Check-In no-scroll: iteration_12 · Booking v2.17/v2.18: iteration_13/14 · Alert popover + booking
  bill: iteration_15/16 · Extend v2.19/v2.20: iteration_17/18/19 · Modify v2.21: iteration_20 (+ post
  arithmetic fix regressed in 21) · No-Show/Cancel v2.22: iteration_21 · reveal-scroll + single-button
  rule: iteration_22 · Room Detail v2.23: iteration_23 · Rooms controls v2.24: iteration_24 · real
  shape + sections + Turns v2.25: iteration_25.
- Reports: `/app/test_reports/iteration_12.json` … `iteration_25.json`.

## 7. SUGGESTED QA PASS ORDER
1. Global invariants sweep on one panel of each type. 2. Locked baselines regression (§2). 3. This
programme's panels (§3A–3F) via the review hooks. 4. Cross-entry consistency for No-Show/Cancel
single-button rule (row/kebab/alert/search). 5. Rooms grouping (Type/Area) + Turns filter + reveal
scroll. 6. Confirm no JS errors on every route. Log anything that contradicts §1–§3; ignore §4–§5.


## 6. v2.26 QA-AUDIT CLOSURE — additional checks (D44, verified iteration_27 + self-test)
Run at 1920×800 and 1366×768. See plans/CR-385_QA_AUDIT_REPORT.md for the finding IDs.
- Money: `arr.every(a=>a.amt===RATE[a.type])`, `guests.every(g=>g.bal===folioOf(g).grand)`, `guests.filter(g=>g.cin>=g.cout).length===0`; Arrivals header "Booking ₹" = rate × nights = Check-In "Booked charge · N nights" = Modify current (pre-tax); Departures "Balance" = Bill Grand Total for every row.
- Bill (`?bill=102`): Room block ₹2,200 → SGST +₹55 → CGST +₹55 → ₹2,310 → advance/prepaid line → Room balance; F&B SGST before CGST, `₹17.48`, round-off `+₹0.04`; Amount received: blank = full, 1000 → "₹X outstanding" in label, 99999 → error + Checkout disabled, Credit → ₹0 received/input disabled; two-step Checkout (arm → confirm; 3 s revert); coupon on 102 does not appear on 103.
- Refund: `?open=ans:noshow` Prepaid ₹9,450 / penalty − ₹4,500 / SGST − ₹112.50 / CGST − ₹112.50 / Total deducted − ₹4,725 / **Refund due ₹4,725**. `?open=a0:cancel` "Nothing paid". `?open=a1:cancel` → No-Show dialog.
- Guards: Extend collect > payable → "Amount ≤ total payable"; Modify adults blank → "Adults ≥ 1", past check-in → "Check-in not in the past", over-collect → "Amount ≤ change"; Booking same + "Advance ≤ total"; date inputs carry `min`.
- Labels: every header dismiss "✕ Close"; footer secondary "Close"; expired Direct row "Cancel booking"; sidebar "Rooms"; badge "In-House"; tile "out 19 Sep"; "1 night"; "Amount · total"; Late chip "full booking charged"; "Pending balance · bill"; "Save & check in now"; kebab No-Show red; refund/notify toggles `.ci-pill`.
- Responsive: Check-In right pane scrollHeight ≤ clientHeight at 1366×768; reference field hidden until a method is chosen; tab sub-lines ellipsised; search ≥ 200px at 768.
- Version: title/#ctl/freeze all v2.26.
