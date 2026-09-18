# CR-385 Impact Analysis — Rev 3.1 · HARD GATE 2.6 (re-validation against frozen design + owner answers)

```
Role:       PLANNING (ALPHA v0.7)  ·  Date: 2026-09-18 (Rev 3) · 2026-06 (Rev 3.1 — Q1–Q5 answered, see §7/§8)
Baseline:   IA Rev 2.2 (Gate 2 closed 2026-09-17) + DESIGN_DECISIONS (Gate 2.5 frozen 2026-09-18, §D amended Gate 2.6)
Code check: grep "frontdesk/|FrontDeskWorkstation|NewBookingForm|GlobalSearch" src → 0 hits (still NONE)
Registry:   conflicts re-scanned 2026-09-18 — BUG-411/402/419/425/426 still GATE_5A (QA pending); CR-364-PRINT, CR-384 still backend-blocked; CR-365 unblocked, Gate 2 pending
Risk:       HIGH (unchanged) — money path copied twice (Check-In advance, Check Out payment), App.js +2, Sidebar +1, 4 dialog wrapper edits (D2)
Gate:       2.6 — all 5 owner answers recorded (§7); AWAITING owner "close Gate 2.6"
```

## 1. What the frozen design changed vs Rev 2.2

| Area | Rev 2.2 assumption | Frozen design | Impact |
|---|---|---|---|
| Interaction | side panel (Check-In) + full-width panel (Folio) + modals | **expand in place for everything** | New host component `ExpandableRow` (a `<tr>` with `colSpan`) used by 3 tables + `RoomTileDetail` for the board. Dialog components (`ExtendStay`, `ModifyBooking`, `CancelBooking`, `NoShow`) are **modals** — their JSX can't be reused inline without copying their *form bodies* → **4 more copies** (~120 L each). |
| Folio/Checkout | `FolioCheckoutPanel` full-width | same content **inside an expanded row** | `CollectPaymentPanel` (`flex flex-col h-full`, own scroll `flex-1 overflow-y-auto`) needs a **fixed-height container** inside the `<td>` (e.g. 560 px) or it collapses to content height — verify at Gate 3 (R15). |
| Tables | 3 separate panel tables | **one `GuestRow`/`GuestTable`** with per-tab cell renderers | Fewer files: `ArrivalsPanel/DeparturesPanel/InHousePanel` shrink to config + chips; logic centralises in `GuestTable`. |
| New Booking | out of scope | **in scope**, in place | `NewBookingForm.jsx` copy of `NewBookingPage.jsx` L28–47 (state), L64–110 (nights/valid/save/walk-in), L136–260 (form JSX). Success card L270–290 replaced by toast; walk-in `navigate` → morph into `CheckInForm` with the same prefill object (`state.walkin` shape, L101–104). |
| Search | header box | global search over snapshot | `GlobalSearch.jsx` — pure client filter; no API. Phone matching uses `fromPendingArrival.phone` (aiosellTransform L136) ✔ and In-House `phone` ✔. "Recent" group needs cancelled/departed rows → already in LR window ✔. |
| Header | property name | **user first name** + shift | `user.firstName` exists (Sidebar L819 uses it) ✔. "Shift since" = login time — not stored; use `auth` login timestamp if present, else hide (Q3). |
| Tab strip | 4 cards | 60 px links strip + red edge + trend | Trend "yesterday X%" needs a **second `dashboard-kpis` call** for yesterday → Phase 2 / optional (Q4). |
| Chips | Late/Today/Upcoming | + **Tomorrow** | Client bucket from LR ✔ (`checkin === today+1`). Add `arrivalsTomorrow` / `depTomorrow` to the new service (not to `pmsService`). |
| Room picker | list of bookable rooms | **clean-only, HK greyed, reserved struck** (by dates) | `getBookableRooms()` gives now-state only. Reserved-by-date = client overlap over LR rows (stop-gap) until **BQ-385-06**. |
| Alerts | list | HK > 2 h, OOO ≥ 1 day | `room_operational_status_at` ✔ (board rows) — **not read by `roomStatusTransform`** → read it in the new service's join, don't edit the transform (OD-385-12). |
| Sorting / sticky / keyboard | — | yes | pure FE. |
| Post-checkout **Undo** | — | 10-s undo | **No backend "un-checkout" exists.** Undo must be a *delayed commit* (payment posted only after 10 s or on toast dismiss) — conflicts with "payment posts immediately" UX and receipt printing. → **Q1 (owner)**. |
| Print | Print Bill + Print Folio | **one Print** | Bill now (`printOrder`); switches to folio when CR-364-PRINT lands — Gate 3 flag. |
| BETA badge / Walk-in button / side panel / MV-01/03 / Q1-Q3/Q5 | present | removed | Simplifies. |

## 2. Files (scope lock, Rev 3)

### WILL create (all NEW under `components/pms/frontdesk/` unless stated)
| # | File | Copied from (read-only) | ~L |
|---|---|---|---|
| 1 | `pages/pms/FrontDeskWorkstationPage.jsx` | `FrontDeskPage.jsx` (shell, greeting, load policy) | 260 |
| 2 | `WorkstationHeader.jsx` | — (user menu, sync+refresh, New Booking) | 110 |
| 3 | `KpiTabStrip.jsx` | — | 110 |
| 4 | `AlertBar.jsx` | — | 80 |
| 5 | `GlobalSearch.jsx` | `InHouseGuestsPage.jsx` L19–58 (match rules) | 200 |
| 6 | `GuestTable.jsx` + `GuestRow.jsx` | `ArrivalsPage` L200–330, `DeparturesPage` L180–290, `InHouseGuestsPage` L115–202 | 320 |
| 7 | `ExpandableRow.jsx` | — (tr/colSpan host, sticky header, footer, Esc) | 90 |
| 8 | `ArrivalsPanel.jsx` / `DeparturesPanel.jsx` / `InHousePanel.jsx` | chips + footers only | 3×80 |
| 9 | `CheckInForm.jsx` | `CheckInPage.jsx` L1–60, L130–347, L457–905 | 500 |
| 10 | `CheckOutExpansion.jsx` | `GuestFolioPage.jsx` L241–412 (cards) + `PmsCheckoutDrawer.jsx` L77–172, L260–290 (host, print, pay, BUG-386/425) | 420 |
| 11 | `NewBookingForm.jsx` | `NewBookingPage.jsx` L28–110, L136–260 | 320 |
| 12 | `ExtendStayInline.jsx` · `ModifyBookingInline.jsx` · `CancelBookingInline.jsx` · `NoShowInline.jsx` | form bodies of the 4 dialogs (`components/pms/*Dialog.jsx`) | 4×110 |
| 13 | `RoomsPanel.jsx` · `RoomTile.jsx` · `RoomTileDetail.jsx` · `MarkAllCleanConfirm.jsx` | `RoomStatusPage.jsx` L11–29, L63–111, L143–190, L198–344 | 520 |
| 14 | `RoomPicker.jsx` | `CheckInPage.jsx` room select + `getBookableRooms` shape | 120 |
| 15 | `api/services/frontDeskService.js` | `pmsService.js` L76–110 pattern | 180 — `getFrontDeskSnapshot`, `bucketWithTomorrow`, `enrichWithFolioBalance`, `joinBoardToRows` (+`room_operational_status_at`), `roomsAvailableFor(checkin,checkout)` (client overlap), `searchSnapshot(q)` |
| 16 | `api/services/__tests__/frontDeskService.cr385.test.js` | — | 200 |
| 17 | `App.js` +1 import +1 route `/pms/front-desk-v2` · `Sidebar.jsx` +1 item "Front Desk (Beta)" | — | 3 |

≈ 3,900 new lines · **existing code edited: 3 lines**. Existing pages/dialogs/transforms/`pmsService`/`CollectPaymentPanel`: **0 lines**.

### Copied-code inventory (R9 mirror rule — each copy gets `// CR-385 COPY-OF <file> L<a>–<b> @ <sha>`)
`CheckInPage.jsx` · `NewBookingPage.jsx` · `GuestFolioPage.jsx` · `PmsCheckoutDrawer.jsx` · `RoomStatusPage.jsx` (RoomTile) · `ExtendStayDialog` · `ModifyBookingDialog` · `CancelBookingDialog` · `NoShowDialog` · `InHouseGuestsPage.jsx` (search) · `ArrivalsPage/DeparturesPage` (row bodies). **11 sources.** FU-385-C diff list grows accordingly.

## 3. Money paths copied (R12 — verification matrix must inherit)
| Path | Source lines | Tests to inherit |
|---|---|---|
| Check-In advance + GST base | `CheckInPage.jsx` L263–347 | CR-379/380, BUG-396/411 V-checks |
| Check Out payment payload, `room_gst_tax`, BUG-425 balance override, print | `PmsCheckoutDrawer.jsx` L114–172, L274–285 | CR-358-P3 checkout, BUG-386, BUG-425 |
| New Booking amount → `createDirectReservation` | `NewBookingPage.jsx` L84–99 | CR-358-P2 |
| Extend Stay rate/nights (BUG-402 fix) | `ExtendStayDialog.jsx` | BUG-402 QA |
Any formula change → CRITICAL, stop.

## 4. New / changed risks
| # | Risk | L | Mitigation |
|---|---|---|---|
| R15 | `CollectPaymentPanel` inside `<td>`: `h-full` + inner scroll needs a bounded height; dropdowns use `absolute` (fine) | MED | Fixed 560 px column container; Gate 3 spike first (½ day) |
| R16 | **Undo checkout** has no backend counterpart | HIGH | Q1 — delayed commit or drop Undo |
| R17 | 4 dialog bodies copied (more duplication than Rev 2) | MED | Alternative: render existing dialogs **unchanged** as modals for Extend/Modify/Cancel/No-Show (breaks F1 for rare actions) → Q2 |
| R18 | Client-side "reserved for dates" is a stop-gap (LR window ±30/60 d, OTA not yet synced) | MED | BQ-385-06; show "availability approximate" until backend endpoint |
| R19 | Table `<tr colSpan>` expansion + sticky `<th>` + keyboard focus in a fixed-layout table | LOW | ExpandableRow spike with GuestTable |
| R20 | `user.firstName` may be empty for some roles | LOW | fallback "Good Morning" |
| R21 | 11 copied sources → mirror drift during beta | HIGH | header markers + FILE_OWNERSHIP "MIRROR →" notes; FU-385-C diff |

## 5. Backend dependencies (unchanged + new)
BQ-385-01 sockets (P1) · BQ-385-02 aggregation (P2) · BQ-385-03 `balance_payment` (P2) · **BQ-385-04 No-Show all channels (owner raising)** · BQ-385-05 check-in/out time settings (P3) · **BQ-385-06 availability by date (P1, addendum sent)** · CR-364-PRINT (Print Folio).

## 6. Questions for the owner (Gate 2.6 close)
See chat — answers recorded in §7.

## 7. Decision log (Gate 2.6)
| # | Question | Answer | Date |
|---|---|---|---|
| Q4 | Rooms tile trend hint `yesterday X%` (F5) | **(a) Phase 2** — hide in v1; add when BQ-385-02 aggregation lands. No second `dashboard-kpis` call in v1. | 2026-06 (owner, chat) |
| Q1 | Undo after Check-Out (R16) + Check Out expansion | **(a) Amend F2/F4/F15**: row button `Check Out` → **`Bill`** (opens expansion only); right side = real `CollectPaymentPanel` embedded unchanged (Room + Room Orders/F&B sections, GST split, Grand Total) shown even at ₹0; expansion footer removed — Check Out and Print are the panel's own buttons; no Extend inside expansion; **Undo dropped**, toast `Checked out · Room N · [Print bill]`. | 2026-06 (owner, chat) |
| Q2 | Extend/Modify/Cancel/No-Show inline vs modal (R17) | **(a) `inline` prop on the 4 existing dialogs** (wrapper-only edit, ~5 L each, default = modal). OD-385-12 exception approved by owner. IA #12 copies (4×110 L) removed. | 2026-06 (owner, chat) |
| Q5-design | Bill panel height inside expanded row | **(i) fixed-height box (~560 px, viewport-clamped) with the panel's own inner scroll**; Checkout button always visible. | 2026-06 (owner, chat) |
| Q3 | Shift since HH:MM (F9) | **(c) Drop** "shift since" from the header. F9 amendment required (Gate 2.6 §D). | 2026-06 (owner, chat) |
| Q5 | Gate 3 spike (R15/R19) | **(a) ½-day throw-away spike** before the Implementation Plan (DESIGN_DECISIONS D5). | 2026-06 (owner, chat) |
| Q6 | Right panel repeats totals (3 collapsible rows + totals block both inside `CollectPaymentPanel`) | **Owner approved Layout B with the 3 rows hidden** (design D1). Mechanism still to confirm at Gate 3: (b) `hideRoomSections` prop on `CollectPaymentPanel` (~4 L UI-only, CRITICAL file, recommended for clean code) vs (c) CSS hide from wrapper. Owner has not picked b/c explicitly — **ask at next session together with D1 approval.** | 2026-06 (owner, chat) |
| D-1 | Adjustments hidden in room mode when transferred orders exist / no items (`CollectPaymentPanel` L1330) | **(a) accept as today** — no panel edit; resolves when transferred orders are retired (DESIGN_DECISIONS D6). | 2026-06 (owner, chat) |
| D-2 | Loyalty needs CRM customer | **ok / accepted** (D7). | 2026-06 (owner, chat) |
| Layout | Bill expansion A / B / C | **B** — pinned settle at bottom of right column. | 2026-06 (owner, chat) |
| Room discount | Left ROOM card discount control | **"do the design"** — include the control (None / % / ₹ / presets + value + reason); backend field missing → **BQ-385-07 to raise** in a backend brief addendum; ships disabled until API accepts. | 2026-06 (owner, chat) |

**Q1–Q6 + D-1/D-2 answered. Gate 2.6 close blocked only on: (1) owner approval of final D1 wording after seeing it, (2) mockup v2.7 update to match D1, (3) Q6 mechanism b/c.** Changes applied: DESIGN_DECISIONS §D (D1–D8), mockup v2.6 (A/B/C picker — interim), this IA → Rev 3.1 (§8) + Rev 3.2 notes below.

### Rev 3.2 notes (post Layout-B / Adjustments decision)
- `CheckOutExpansion.jsx` (#10): left = `RoomStatementCard` (booking · discount control [disabled, BQ-385-07] · GST · advance · balance) + `TransferredOrdersCard` (ids + amounts, no items) — copied from `GuestFolioPage` L241–412 / BUG-427 tiles; right = `PmsCheckoutDrawer` host L77–172 / L260–290 wrapping `CollectPaymentPanel` in a 560 px flex column: panel body scrolls, panel's own Payment Method + Checkout footer pinned (panel already has `sticky` header and bottom button — verify in spike). Room-discount control is **UI-only stub in v1** (no payload field) — must not alter any money formula (R12).
- New risk **R23 (MED)**: room-discount control visible but disabled may confuse cashiers → tooltip "Coming soon — needs backend BQ-385-07"; QA check.
- New backend question **BQ-385-07**: room-level discount on checkout payload (type %/flat/preset, value, reason) → write `backend_briefs/BACKEND_BRIEF_CR-385_ADDENDUM_2_BQ-385-07.md` next session.
- Q6 mechanism affects §2 existing-edits count: (b) adds ~4 L to `CollectPaymentPanel.jsx` (CRITICAL file → CRITICAL review of the byte-diff + old-drawer regression); (c) adds 0.

## 8. Rev 3.1 changelog (post-answers re-check of §1–§4)
| Area | Rev 3 | Rev 3.1 |
|---|---|---|
| §1 Interaction row | 4 dialog form bodies copied (~4×120 L) | **No copies.** `inline` prop on the 4 existing dialogs (D2). |
| §1 Folio/Checkout row | expansion footer `[Print] [Extend Stay] [Collect & Check Out]`; simplified payment box | **`Bill` expansion**: left statement cards + right real `CollectPaymentPanel` in a 560 px box; no footer; panel's own Print/Checkout (D1). |
| §1 Header row | "Shift since" from auth if present | **dropped** (D3). |
| §1 Tab strip row | trend hint optional | **hidden v1** (D4). |
| §1 Post-checkout Undo | Q1 open | **dropped** — toast `[Print bill]` only (D1). |
| §2 #10 `CheckOutExpansion.jsx` | 420 L (cards + host + footer + print + pay) | **~360 L**: left statement cards (`GuestFolioPage` L241–412 incl. BUG-424 room-order items + BUG-427 transferred tiles; **no Balance-due card**) + `PmsCheckoutDrawer` host L77–172 / L260–290 (payload, `onOpenSplitBill={null}`, BUG-386/425, print callback) wrapping `CollectPaymentPanel` in a fixed-height box; no footer / no Extend. Panel sections stay collapsed by default (`showRoomBooking/showTransferredOrders/showRoomService = false`, L224–227) — **0 panel edits**. |
| §2 #12 `*Inline.jsx` ×4 | 4×110 L new files | **removed.** |
| §2 existing edits | 3 lines (`App.js` +2, `Sidebar.jsx` +1) | **3 + ~20 lines**: `ExtendStayDialog.jsx` L78 · `ModifyBookingDialog.jsx` · `CancelBookingDialog.jsx` · `NoShowDialog.jsx` — conditional overlay wrapper on `inline` prop, **no logic lines**. Old pages render identically (`inline` undefined). |
| §2 totals | 17 files · ≈3,900 L · 11 copied sources | **13 files · ≈3,380 L · 7 copied sources** (`CheckInPage`, `NewBookingPage`, `GuestFolioPage`, `PmsCheckoutDrawer`, `RoomStatusPage`, `InHouseGuestsPage`, `ArrivalsPage/DeparturesPage`). |
| §3 Money paths | Extend Stay copied | Extend Stay **not copied** — same component; BUG-402 QA re-run on old page once (wrapper edit). Check Out path unchanged (payload still `PmsCheckoutDrawer` L114–172 copy). |
| §4 R16 | HIGH, open | **CLOSED** (Undo dropped). |
| §4 R17 | MED, copies | **CLOSED** (inline prop). New **R22 (LOW)**: wrapper edit on 4 live dialogs → QA re-checks each dialog opens/closes on Arrivals / Departures / In-House / Reservations. |
| §4 R21 | HIGH, 11 sources | **MED**, 7 sources. |
| §4 R15 / R19 | spike proposed | **spike approved** (D5) — Gate 3 step 0. |
| Risk label | HIGH | **HIGH** (unchanged — money paths still copied twice, 4 live dialog files touched). |
| Conflict pre-check | — | re-scan required at Gate 3 for the 4 dialog files (BUG-402 touched `ExtendStayDialog`; status must be CLOSED or execution order declared). |
