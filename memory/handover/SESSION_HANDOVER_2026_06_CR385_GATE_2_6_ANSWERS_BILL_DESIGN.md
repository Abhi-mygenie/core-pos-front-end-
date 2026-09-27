# SESSION HANDOVER — CR-385 · Gate 2.6 owner answers + Bill-expansion redesign (PLANNING role)

```
Date:        2026-06 (forked session; environment date shows 2026-09-18 in mockup data)
Role:        PLANNING (ALPHA v0.7) — docs + mockup only. src/ untouched (0 lines).
Item:        CR-385 PMS Front Desk — Unified Workstation (P1, HIGH)
Gate state:  2.6 OPEN — all owner questions answered; mockup v2.7 = final design, NOT yet reviewed by owner → next session opens with an owner design review (§6)
Owner:       drives every gate close explicitly. Never auto-advance.
```

## 0. Read first (5 min)
1. `control/AGENT_PROMPT_ALPHA.md` → STEP -1 (read latest handover = this file) → pick **PLANNING**.
2. `plans/CR-385_DESIGN_DECISIONS.md` — §A frozen rows (F2/F4/F5/F9/F15 struck) + **§D Amendments D1–D8** (the live design).
3. `impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md` — header, **§7 decision log** (Q1–Q6, D-1, D-2, Layout, Room discount), **§8 Rev 3.1 changelog + Rev 3.2 notes**.
4. Mockup: `frontend/public/cr385-frontdesk-mockup.html` (**v2.7**) → Departures → `Bill` on R. Fernandes / Room 102 (Layout picker removed — B is final).
5. Previous handover (the 5 questions this session answered): `handover/SESSION_HANDOVER_2026_09_18_CR385_GATE_2_6_IA_REVALIDATION.md`.
6. Test reports for the mockup: `/app/test_reports/iteration_1..4.json` (all pass; **iteration_4 = current v2.7**, earlier ones cover superseded layouts).

## 1. Where this session started
- Environment: React frontend from `pms18sep` branch deployed at `/app/frontend`; `/app/memory` synced from repo (762 files). No React code changed in this session or the previous one for CR-385.
- Gate 2.5 design frozen (2026-09-18). Hard Gate 2.6 IA Rev 3 written with **Q1–Q5 open** for the owner. Gate 3 plan not started. Code reality: NONE.

## 2. What the owner decided this session (all recorded in IA §7 + DESIGN_DECISIONS §D)
| # | Question | Owner answer | Where recorded |
|---|---|---|---|
| Q1 | Undo after checkout / Check Out expansion | **(a)** Undo dropped; row button renamed **`Bill`** (opens expansion only); Check Out = panel's own button | D1, F2/F4/F15 struck |
| Q2 | Extend/Modify/Cancel/No-Show inline vs modal | **(a) `inline` prop on the 4 existing dialogs** (wrapper-only ~5 L each; OD-385-12 exception approved) — no copied form bodies | D2 |
| Q3 | "Shift since" in header | **(c) drop** | D3, F9 struck |
| Q4 | Rooms tile trend hint | **(a) Phase 2** — hidden v1 | D4, F5 struck |
| Q5 | Gate 3 spike | **(a) ½-day throw-away spike** (panel in 560 px box inside `<tr colSpan>`; sticky th; keyboard) | D5 |
| Q6 | Right panel repeats totals (3 collapsible rows) | Rows **hidden** (approved via Layout B). **Mechanism b (prop) vs c (CSS) NOT yet picked** | IA §7 Q6 |
| Layout | Bill expansion A / B / C | **B** — pinned settle bottom-right | IA §7 |
| Room discount | discount control on left ROOM card | **"do the design"** → include control; backend missing → **BQ-385-07** to raise; ships disabled | D1, IA Rev 3.2 |
| D-1 | Adjustments hidden in room mode when transferred orders exist / no items (`CollectPaymentPanel` L1330) | **(a) accept as today** | D6 |
| D-2 | Loyalty needs CRM customer | **ok** | D7 |

## 3. Design evolution of the Bill expansion (4 owner rounds — so you don't re-propose rejected ideas)
1. v2.5 mockup: simplified "Collect payment" box + "Nothing due" empty state → **rejected** (owner wants the real bill breakup; no Split Bill; payment methods were missing).
2. Left = folio cards incl. Balance due; right = real panel with 3 collapsed rows + totals → **rejected** (repetition left/right; top-3 rows repeat the totals block).
3. Left = accordion statement (Room / Room orders / Transferred with nested items), right = totals + payment only → **rejected** ("not working out": owner wants **F&B bill with full breakup on the RIGHT**, room + transferred on the LEFT, discounts on both sides, one payment).
4. Options A/B/C built in mockup (`Layout:` picker) → owner **chose B**, with feedback: panel must open like the existing restaurant panel (**🎛 ADJUSTMENTS: Discount None/%/₹/presets + value · Coupon+Apply · ☐ Loyalty tier/pts · ☐ Wallet → 📋 BILL SUMMARY read-only → GRAND TOTAL → PAYMENT METHOD → Pay**). Owner: "suggest first and freeze before changing design" → proposal made, owner approved (1 yes, 2 yes, 3 do the design, d1 a, d2 ok) → **then said: "update docs and decision, do not modify design"**.

### Final D1 (approved in chat 2026-06, drawn in mockup v2.7 — awaiting owner review)
- **LEFT (scrolls, 560 px):** Guest & stay · **ROOM**: booking amount → *Room discount* [None ▾ / % / ₹ / presets] + value + reason (**disabled + tooltip until BQ-385-07**) → lodging GST (on discounted base) → room total → advance paid → other room payments → **room balance** · **TRANSFERRED ORDERS**: ids + amounts incl. GST → **transferred balance** (no items; being retired). No Balance-due card.
- **RIGHT (existing `CollectPaymentPanel` room mode, 560 px):** header `🍽 F&B BILL · Room orders (n)` + `Print Bill` → *(scrolls)* 🎛 Adjustments (Discount / Coupon / Loyalty / Wallet) → 📋 Bill Summary (items · item total · − discount · − coupon · − loyalty · subtotal · CGST · SGST · round off · room orders total) → *(pinned)* `F&B + Room balance + Transferred = GRAND TOTAL` · Cash / Card / UPI / Credit · received · reference · **`Checkout ₹X`**. 3 collapsible section rows hidden. No Split Bill. Shown at ₹0. No footer, no Extend, no Undo.

## 4. Code facts verified this session (don't re-derive)
- `components/order-entry/CollectPaymentPanel.jsx` (3,332 L, CRITICAL money file, 0 edits planned except optional Q6-b):
  - Room-mode sections collapsed by default: `showRoomBooking/showTransferredOrders/showRoomService` L224–227.
  - Adjustments block gate L1330: `!(isRoom && (associatedOrders.length > 0 || visibleCartItemCount === 0))`.
  - Discount select L1349–1388: `None / % / ₹ / preset_<id> (name — X%)` + value input L1391 + reason (CR-137).
  - Loyalty `useLoyalty` L307, `loyaltyDiscount` L612; Wallet `useWallet` L313.
  - Payment Method section L2681+. Checkout button label `Checkout ₹X` L3324. Split Bill only when `onOpenSplitBill` passed (L1300).
- `components/pms/PmsCheckoutDrawer.jsx`: passes `onOpenSplitBill={null}`, `isRoom`, `associatedOrders`, `roomInfo` (remainingRoomBalance formula L274–285), `customer={buildCustomer(detail)}` (phone → loyalty), payload/BUG-386/425 L114–172.
- 4 dialogs (`ExtendStayDialog` 147 L, `ModifyBookingDialog` 140, `CancelBookingDialog` 103, `NoShowDialog` 127): self-contained; overlay wrapper `fixed inset-0` at ExtendStay L78 → `inline` prop = skip wrapper.
- `GuestFolioPage.jsx` L241–412: folio cards incl. BUG-424 room-order items + BUG-427 transferred tiles (source for left statement copy).
- No room-discount field anywhere in checkout payload → BQ-385-07.
- Login timestamp not stored anywhere (Q3 basis).

## 5. Files changed this session (docs + mockup only)
| File | Change |
|---|---|
| `plans/CR-385_DESIGN_DECISIONS.md` | header "Amended"; F2/F4/F5/F9/F15 struck → §D **D1–D8** |
| `impact/CR-385_IMPACT_ANALYSIS_REV3_GATE_2_6.md` | header → Rev 3.1; §7 decision log (Q1–Q6, D-1, D-2, Layout, Room discount); §8 Rev 3.1 changelog (13 files / ≈3,380 L / 7 copied sources; R16, R17 closed; R21 → MED; R22 new) + **Rev 3.2 notes** (R23, BQ-385-07, Q6 mechanism impact) |
| `frontend/public/cr385-frontdesk-mockup.html` | **v2.7 (final D1, owner-approved to build, not yet owner-reviewed)**: `Bill` row buttons; no Undo; no shift-since; no trend hint; Bill expansion = Layout B only — left ROOM (disabled room-discount control + "soon" tag, tooltip BQ-385-07) + TRANSFERRED ORDERS; right F&B bill: 🎛 Adjustments (Discount None/%/₹/Staff-10% + value + reason · Coupon + Apply/Remove · ☐ Loyalty Bronze 168 pts ₹110 · ☐ Wallet disabled) → 📋 Bill summary (items · item total · −discount · −coupon · −loyalty · subtotal · CGST · SGST · round off · room orders total) → pinned Settle (F&B + room balance + transferred = GRAND TOTAL · Cash/Card/UPI/Credit · received · reference · Checkout). All controls are live demos with real arithmetic. |
| `PRD.md` | session entry appended |
| `/app/test_reports/iteration_1..4.json` | testing-agent runs on the mockup (all pass); **iteration_4 = current v2.7** (10 checks incl. every discount/coupon/loyalty arithmetic path) |
| **NOT touched** | `registry.json`, `control/CR_REGISTRY.md`, `control/CONTROL_DASHBOARD.md`, `OPEN_GAPS_REGISTER.md`, backend briefs, any `src/` file |

## 6. Next session — exact sequence (owner instruction: "next agent will ask me to check the modified designs and give feedback")

### Step 1 — Owner design review of mockup v2.7 (FIRST thing, before anything else)
Say (plain English): *"Last session you approved the final Bill layout (B) and I built it into the mockup as v2.7. Please review it and give feedback, if any."* Then give the owner this click path:

1. Open `<REACT_APP_BACKEND_URL>/cr385-frontdesk-mockup.html` (ribbon must say **v2.7**).
2. Click **Departures** tile (or the "4 today" link) → click **`Bill`** on **R. Fernandes · Room 102** (room balance ₹950, 1 room order, 2 transferred orders — richest case).
3. Review checklist to walk through with the owner (each maps to an approved decision):
   | # | What to look at | Approved decision it implements |
   |---|---|---|
   | R1 | Row button says **Bill** (not Check Out); clicking it only opens the panel | Q1 / D1 |
   | R2 | **Left · ROOM card**: booking amount → *Room discount* (greyed, "soon" tag, hover tooltip "needs BQ-385-07") → Lodging GST → Room total → Advance paid → **Room balance** | D1 + "do the design" for room discount |
   | R3 | **Left · TRANSFERRED ORDERS**: only order ids + amounts + Transferred balance (no items) | D1 ("being retired, not worried") |
   | R4 | **Right header**: `F&B BILL · Room orders (1)` + Print Bill; **no Split Bill** | D1 |
   | R5 | **Right · 🎛 Adjustments**: Discount dropdown **None / % / ₹ / Staff — 10%** → value box appears for % and ₹ → reason box appears once a discount is set; Coupon + Apply; ☐ Loyalty *Bronze (168 pts) ₹110*; ☐ Wallet disabled | owner feedback "flat, % and custom + value" and "loyalty like existing F&B" |
   | R6 | **Right · 📋 Bill summary** (read-only): items, item total, deduction lines, subtotal, CGST/SGST, round off, room orders total | D1 (mirrors restaurant panel) |
   | R7 | **Pinned settle** never scrolls: F&B + Room balance + Transferred = **GRAND TOTAL**, Cash/Card/UPI/Credit, received, reference, **Checkout ₹X** always visible; only the right body and the left column scroll | Layout B |
   | R8 | Try: Discount % → 10, tick Loyalty → grand total drops to **₹2,236** (the figure in the owner's own screenshot); Apply coupon → discount greys out | live arithmetic demo |
   | R9 | Click **Checkout** → toast `Checked out · Room 102 · [Print bill]`, **no Undo**; row disappears | Q1 |
   | R10 | Also open **Bill** on **M. D'Souza · Room 105** (₹0 room balance) → panel still renders, no "Nothing due" | D1 |
4. Ask: **"Any feedback? (a) approve as-is · (b) list changes"**. Keep questions ≤ 5, lettered.

### Step 2 — If feedback → amend, don't redraw blindly
- Owner rule: **"suggest first and freeze before changing design"** → for each feedback item propose the change in words (with downside), get a yes, THEN edit the mockup (→ v2.8), add/strike rows in `DESIGN_DECISIONS.md §D` (new D9…), re-run the testing agent (frontend only; reuse the checklist style of `iteration_4.json`).
- Things the owner has already rejected (don't re-propose): Balance-due card on the left; nested transferred-order items; three collapsible totals rows on the right; simplified "Collect payment" placeholder; Split Bill; Undo; shift-since; trend hint.

### Step 3 — Once the owner says the design is OK
1. Ask **Q6 mechanism**: (b) `hideRoomSections` prop on `CollectPaymentPanel` (~4 L UI-only, CRITICAL-file review) vs (c) CSS hide from wrapper (0 panel edits, fragile). Recommend (b). Record in IA §7.
2. Write `backend_briefs/BACKEND_BRIEF_CR-385_ADDENDUM_2_BQ-385-07.md` (room-level discount on checkout: type %/flat/preset, value, reason; GST on discounted base; audit trail) — follow the format of `BACKEND_BRIEF_CR-385_ADDENDUM_2026-09-18.md`; mirror to dashboard cards if that convention applies.
3. Bump IA header to **Rev 3.2**: fold the "Rev 3.2 notes" into §1/§2/§4, add R23, set existing-edits count per Q6 choice.
4. Ask owner: **"close Gate 2.6"**. On close → sync `registry.json` (CR-385 gate → 3), `control/CR_REGISTRY.md` row, `control/CONTROL_DASHBOARD.md` Last Updated, `PRD.md`. Write session handover.
5. Gate 3 (separate owner approval): spike (D5) → evidence `evidence/CR-385/spike/` → `plans/CR-385_IMPLEMENTATION_PLAN.md` (component tree, `inline` prop edits ×4, Q6 edit, copy inventory with sha, verification matrix inheriting IA §3 money tests, FILE_OWNERSHIP mirror notes, rollout "Front Desk (Beta)", FU-385-C cutover list) → owner closes Gate 3 → Gate 4.

## 7. Rules the owner enforced this session (keep)
- Explain in plain English, ≤ 5 questions, lettered options, say the downside of each.
- "Suggest first and freeze before changing design" — never redraw the mockup before the owner approves the proposal.
- Design changes after freeze go into DESIGN_DECISIONS §D as amendments (strike, don't rewrite frozen rows), then mockup, then IA bump — no flipping back to Gate 2.5.
- No `src/` edits before Gate 4. Money formulas copied byte-for-byte; `CollectPaymentPanel` edits (if Q6-b) are UI-only and CRITICAL-reviewed.
- Testing agent must verify every mockup change (owner treats mockup gaps as bugs).
- The owner reviews designs from screenshots of the mockup and gives feedback in rounds; expect 1–2 more rounds on the Bill screen before Gate 2.6 closes. Record each round's answers in IA §7 before touching the mockup.

## 8. Parked / do not pull in
FU-385-A/C/D/E/F/G/H · BQ-385-01/02/03/04/05/06 · **BQ-385-07 (new, to write)** · CR-364-PRINT · transferred-orders retirement (owner: "not worried about them") · D-1(b) L1330 condition change (only if retirement slips).

## 9. Environment notes
- Preview URL = `REACT_APP_BACKEND_URL` in `/app/frontend/.env` (the mockup is served from `/cr385-frontdesk-mockup.html`). Ignore any other preview URL from older handoffs.
- Frontend runs via supervisor (`npm start` / craco). Backend/Mongo irrelevant to CR-385 planning.
- Mockup tab switching = inline onclick on tile sub-links (e.g. "4 today"); the page re-renders via innerHTML on every click.
