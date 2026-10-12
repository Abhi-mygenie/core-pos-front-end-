# POS_PMS_2 — OWNER SMOKE BATCH — 2026-09-21 (single append-only document for the sprint)

```
Sprint:      pos_pms_2 · Facilitator: SMOKE FACILITATOR agent (ALPHA v0.7 Role 8)
Items:       S-1 … S-12 = CR-385 Phase 0 + Phase 0.5 combined smoke (Gate 6) — BUG-434/435/436/437/438/439 included
Environment: preprod · RID 69 · hotel_code sandbox-pms · login as OWNER_TGK (memory/test_credentials.md — never paste values) · Chrome desktop ≥ 1366 px wide
Pre-read:    QA PASS — test_reports/QA_REPORT_2026_09_21_CR385_P0_5.md (it.7/8/9/10); registry CR-385 GATE_5B_QA_PASSED (P0+P0.5)
Sandbox rule: only room r4 (and r5/r1 if needed) may be toggled; NEVER r2 (8526) / r3 (8524); no bookings, no payments; restore what you toggle
Verdict per step: PASS / FAIL + owner's own words. Any FAIL → Intake → Bug Fix inside Phase 0.5 (phased plan §0-bis). All PASS → owner says "Phase 0 smoke OK" → Gate 6 closed.
Note on speed: preprod's local-reservations call swings 1–7 s (BQ-385-22). A slow "synced" pill or Retry is the backend, not the page.
```

## Steps (≈ 15 min)

| # | Where | Do this | You should see | Verdict | Owner words |
|---|---|---|---|---|---|
| S-1 | Login → `/dashboard` → left sidebar | **Rooms & Reservations → Front Desk (Beta)** | URL `/pms/front-desk-v2`. Header: "Good <morning/afternoon/evening>, <your first name>", today's business date under it, pill "synced just now", **New Booking** greyed. Four tiles: Arrivals · Departures · In-House · Rooms. | | |
| S-2 | Tiles vs old pages (open the old pages in a second tab) | Compare: Arrivals tile ↔ `/pms/arrivals` Today count · In-House tile ↔ `/pms/in-house` row count · Rooms "N free" ↔ `/pms/room-status` Available count | **Identical numbers.** (Today expected 0 · 2 · 0 free.) | | |
| S-3 | Arrivals tab (default) — **BUG-437** | Look at the chips row | Page opens on **Late 10** (bold, red count), **not** on an empty "Today 0". Table shows the late rows. | | |
| S-4 | Arrivals chips — **BUG-437 pin** | Click **Today 0** → click ↻ (top right) → wait for the pill → reload the page | After Today: text "No today arrivals". After ↻: **Today stays selected**. After reload: back on **Late**. | | |
| S-5 | Departures tab | Click the **Departures** tile | Chips Overdue / Today / Tomorrow / Upcoming, opens on the first non-empty (expected **Today 2**). | | |
| S-6 | Departures row — expansion + keyboard (**BUG-438/439**) | Click a row → drawer opens. Press **Esc** → closes. Click a row once to focus it, press **↓ ↑** → highlight moves row to row; **Enter** → opens; **Esc** → closes. Open one row, then click a **different** row | Drawer shows guest, dates, Booking/Paid/SGST/CGST/Balance from the server; greyed Bill / Request HK / Extend at bottom-right (tooltip "Available in Phase N"). Keyboard works. **Only one row is ever open at a time.** | | |
| S-7 | Rooms tab — group-by | Click the **Rooms** tile → **Group by: Area** → reload | Sections Ground Floor · First Floor · 2nd Floor · 3rd Floor · Patal Lok (Title Case). Choice survives reload. Click **Room no.** to restore. | | |
| S-8 | Rooms tab — detail + the one write (**r4 only**) | Click an **occupied** tile (r2/r3 — look only) → detail shows guest, dates, balance. Click **r4 (HK)** → **Mark Clean** → wait → **Request HK** | Mark Clean: button greys with a spinner ≈ 5 s → toast → r4 turns **Available**. Request HK: r4 back to **HK**. (Do NOT press Check-In / Book Room — greyed anyway.) | | |
| S-9 | Global search | Press **/** → type a guest name (e.g. `loki`) → click a result. Press **/** → type the last 4 digits of an in-house phone → click | Cursor jumps to the search box; results grouped (Arriving / In-house / Rooms); clicking jumps to the tab and opens that row. | | |
| S-10 | Retry in-flight state — **BUG-434** | DevTools (F12) → Network → throttle **Offline** → click ↻ → red error card → click **Retry** (watch it) → set **Online** → click **Retry** | While offline: Retry button greys, shows a spinner and **"Retrying…"**, cannot be clicked twice; then returns to "Retry" with the error still shown. Online: page comes back within a few seconds. | | |
| S-11 | One batch, not two — **BUG-435** | DevTools → Network → filter `aiosell` → clear. Switch to another browser tab for ≥ 10 s, come back and click ↻ **immediately**. Then click ↻ twice quickly | **Exactly one** batch of three calls (`local-reservations`, `room-status-board`, `dashboard-kpis`) after coming back + click — not two batches. Two quick clicks → still one batch. | | |
| S-12 | Old page untouched | Open `/pms/front-desk` (old) and `/pms/room-status` | Look exactly as before; no console errors (F12 → Console; ignore the pre-existing socket/firebase lines). | | |

## Phase 1 steps — appended 2026-09-21 (run AFTER S-1…S-12; ≈ 12 min)
Pre-read: QA PASS — `test_reports/QA_REPORT_2026_09_21_CR385_P1.md` (`iteration_11.json` + `iteration_12.json`); registry CR-385 GATE_5B_QA_PASSED (P0+P0.5+P1).
Sandbox for Phase 1: bookings are allowed but ONLY the ones you create in S-15 (Direct, room type **suite** = r4/r5/r1; today → tomorrow; no advance) and ONLY as pending — never check them in; cancel them in S-18. Settings must END at Allow early check-in **OFF** + Extension pricing **Rate table**. Never confirm a No-Show.
Known, not in scope of this smoke: legacy `/pms/arrivals` Cancel/Modify **Confirm** fails with a server 500 (BUG-441, registered) — S-20 checks only that the legacy dialog still opens as an overlay; do not press Confirm there.

| # | Where | Do this | You should see | Verdict | Owner words |
|---|---|---|---|---|---|
| S-13 | Sidebar → Rooms & Reservations → **Channel Manager** | Click the 5th tab **Front Desk Rules** | Card "Front Desk Rules": **Allow early check-in** unticked · **Extension pricing** = Rate table (calendar) · status "Saved" · Save greyed. Tabs 1–4 unchanged. | | |
| S-14 | Front Desk Rules | Tick **Allow early check-in** → **Save** → reload → open the tab again → untick → **Save**. Then pick **Held rate** → **Save** → reload → pick **Rate table** → **Save** | After each Save: toast "Front Desk rules saved", status back to "Saved"; after reload the choice you saved is what you see. **Ends at OFF + Rate table.** | | |
| S-15 | Old `/pms/new-booking` | Create **two** Direct bookings: "Smoke P1 Cancel" and "Smoke P1 Modify", today → tomorrow, 1 adult, room type **Suite** (rate plan suite-s-ep), no advance | Both appear on **Front Desk (Beta) → Arrivals → Today** with Booking ₹ = the rate-table price incl. GST and a "Pay at hotel" chip. | | |
| S-16 | Arrivals rows | Look at the action buttons on a **Direct** row and on a **booking.com** row (Late chip) | Direct: **Check In** (grey, "Phase 2") · **Modify** · **Cancel** — no No-Show. booking.com: **Check In** (grey) · **Modify** · **No-Show** — no Cancel. Never both. Same inside the expanded drawer. | | |
| S-17 | "Smoke P1 Modify" row → **Modify** | The form expands under the row. Change **Check-out** to +1 night; wait half a second | Right card "Current → New": Nights 1 → 2, Booking charge / SGST / CGST / Total / Balance for the new dates **from the server**, "Change vs current +₹…". F12 → Network: exactly **one** `local-reservations/<id>` PATCH per change, body has `"preview":true`, **no** `amount_after_tax`. Set check-out = check-in → red "Check-out must be after check-in", Confirm greyed, no request. | | |
| S-17b | Same form | Reload the page **before** confirming → open the row | Dates/₹ still the original (preview saved nothing). Then reopen Modify, +1 night, **Confirm changes** | Toast "Booking updated", row shows the new check-out, 2 nights and the ₹ that the preview showed. Network: PATCH body without `preview`, without `amount_after_tax`. | | |
| S-18 | "Smoke P1 Cancel" row → **Cancel** | Dialog appears **inside the row** (no dark full-screen overlay) next to a "Cancellation · money outcome" card (Booking ₹ / Prepaid ₹0 / Advance ₹0 · ribbon "Refund · Phase 2"). Reason list shows **guest cancelled** (BUG-440). Pick it → **Confirm Cancellation** | Toast "Booking cancelled", row disappears, Arrivals tile −1. Repeat for "Smoke P1 Modify" (its outcome card shows the **new** total). Today chip back to 0 of yours. | | |
| S-19 | A **booking.com** row (Late) → **No-Show** | Dialog expands inline with the outcome card + "Refund · Phase 2" ribbon; **Cancel / Keep Booking** closes it. **Do NOT press "Mark No-Show & Release Room".** | Inline (no overlay), closes cleanly, row unchanged. | | |
| S-20 | Old `/pms/arrivals` (Late tab) → ⋮ → Cancel | The old dialog opens as a **full-screen overlay** with a dark backdrop; reason list shows "guest cancelled" → **Keep Booking** (do not confirm — BUG-441) | Overlay unchanged; closes. F12 Console: no new errors on `/pms/front-desk-v2` or Channel Manager (ignore socket/firebase lines and the RatesTab key warning). | | |

Verdict: all S-1…S-12 PASS → say **"Phase 0 smoke OK"**; all S-13…S-20 PASS → say **"Phase 1 smoke OK"**. Any FAIL → Intake → Phase 1.5 (phased plan §0-bis) before Phase 2 GO.


## GATE 6 CLOSED 2026-09-22 — owner words "Close gate 6, we will look into bugs after phase 2 note is down" (D80). Ticked rows: M1-S04, M1-S07. Findings during the smoke: BUG-445 (fixed P1.5c), BUG-446 / OD-385-19 / BQ-385-25 (review after the Phase 2 note).

## Phase 1.5 steps — appended 2026-09-22 (run AFTER S-13…S-20; ≈ 5 min)
Pre-read: `test_reports/QA_REPORT_2026_09_22_CR385_P1_5_ROLE4.md` (Phase 1 33/33, BUG-441/442 verified). Known, ignore: after a Modify the row shows **"SR ●"** with text "| MODIFY: …" — backend appends the modify reason to special requests (**BQ-385-23/24**, no frontend workaround). Known blocker: S-22 — **BUG-444 DEFERRED-TO-FU-385-C** (old tape chart hides new Direct bookings): write "blocked, BUG-444" and cancel that booking from Front Desk (Beta).

| # | Where | Do this | You should see | Verdict | Owner words |
|---|---|---|---|---|---|
| S-21 | Old `/pms/arrivals` (Today or Upcoming) | ⋮ on one of YOUR Smoke bookings → **Cancel** → reason "guest cancelled" → Confirm | **200**, toast "Booking cancelled", card leaves the list and appears under **Cancelled**. F12 → Network: URL ends `/local-reservations/<number>/cancel` (a number, not MG-…). | | |
| S-22 | Old `/pms/reservations` | Find a block of YOUR Smoke booking → popover → **Cancel** → reason → Confirm | 200, block gone after Refresh. **If the booking is not on the chart → write "blocked, BUG-444"** and cancel it from Front Desk (Beta) instead. | | |
| S-23 | Any cancel (S-18 / S-21) | F12 → Network → the `/cancel` request → Payload | `cancelled_by` shows **your name** (e.g. "Owner"), not "staff". | | |
| S-25 | Old `/pms/arrivals` ⋮ → Modify (optional) | If you modify from the OLD page: rate cards show ₹0 and the request carries `amount_after_tax: 0` | **Known dirty payload, harmless** — the server recomputes the price (probe 2026-09-22: 2 → 3 nights = ₹74,340 → ₹111,510). Retires with FU-385-C (BUG-443). Not a bug for this smoke. | | |
| S-26 | Front Desk (Beta) → In-House tab | Compare the "Leaving today" chip with the tile's "N leaving today" | Same number (BUG-445 fixed in P1.5c). Overdue guests sit under **Stayover** with a red "Overdue N d" pill. Rooms tile "% occupancy" may disagree with occupied/free when a guest overstays = **known BQ-385-25, ignore**. | | |
| S-24 | Front Desk (Beta) after S-17b | Look at the modified row | "SR ●" marker with "| MODIFY: …" text = **known BQ-385-23/24 — ignore**, not a bug. | | |

Verdict: S-21, S-23, S-24 PASS (S-22 PASS or "blocked, BUG-444") → include in **"Phase 1 smoke OK"**.

## Status 2026-09-21 — DEFERRED (owner exception D74) → now COMBINED with Phase 1 (S-13…S-20 appended)
Not run. Owner: Phase 0 smoke is executed together with the Phase 1 smoke in one combined session. Append the Phase 1 steps as S-13… to THIS document when Phase 1 reaches Gate 6; run S-1…S-12 first.

## Result
_(facilitator fills)_ S-1…S-12: __/12 PASS · S-13…S-20: __/8 PASS · S-21…S-26: __/6 PASS (S-22 = blocked) · owner verdict: ________ · date/time: ________
Any FAIL → BUG-4xx filed via Intake → Bug Fix in Phase 0.5 → re-smoke the failed step only.

## Phase 2 steps — appended 2026-09-22 — M2-S01…M2-S13 · **D84: DEFERRED, run TOGETHER with the Phase 3 rows M3-S01…S10** · **D86 (2026-09-22): DEFERRED AGAIN — combined run after Phase 4 — ≈60 min, money — needs one Executive room free (stay 174 checked out or another) and a Departures settle path. Rows M2 + M3 + M4 in ONE session after Phase 4 QA; M2/M3 rows below untouched; M4-S01…Sxx appended after Phase 4 QA. Every row gets the owner's verdict verbatim — no summary close.**
```
Items:       M2-S01 … M2-S13 = CR-385 Phase 2 (M1 New Booking · M3 Check-In) owner smoke. Gate 5B CLOSED 2026-09-22 (D83) with gaps OG-PMS-038…044 — S08/S09/S10/S01 are their live re-checks.
Pre-read:    QA PASS — test_reports/QA_REPORT_2026_09_22_CR385_P2_ROLE4.md (it.17 smoke 13/13 · it.18 live T1/T4/T6, 0 defects). Registry CR-385 GATE_5B_CLOSED (P2 QA).
Staff note:  BUG-431/432 are fixed ONLY on Front Desk (Beta). The old /pms/new-booking and /pms/check-in pages still misprice (legacy → FU-385-C). Staff: use Front Desk (Beta) for booking and check-in.
Executive:   M2-S08 (paid upgrade) needs an EXECUTIVE room FREE. Today r2 (8526, executive) is blocked by YOUR real Walk-In stay id 174 "bkol" (order 1232602, checked in 2026-09-20, due out 2026-09-21 — overdue) and r3 (8524, suite) by stay id 155 "blpi" (order 1232583). To run S08 you must check out stay 174 from /pms/departures (Cash) first — or skip S08 and write "blocked — Executive occupied".
Toggle:      M2-S09/S10 flip Allow early check-in ON then back OFF — the rule MUST end OFF; Extension pricing stays "Rate table".
Dates:       "today" = the business date shown in the header (server), never your PC clock.
Rooms:       check in only into r4 / r5 / r1. Never select r2 / r3.
Clean-up:    settle every smoke stay from /pms/departures → Upcoming → Check Out → Cash → Confirm; cancel the "tomorrow" booking from Front Desk (Beta).
Known-ignore: OG-PMS-043 header date shows "—" for a moment before it loads · BQ-385-26 the server answers 200 "skipped" to an empty booking (the page shows it as a red error) · BQ-385-22 slow "synced"/Retry · BQ-385-23 "SR ●" on modified rows · BQ-385-25 occupancy %.
Verdict per step: PASS / FAIL + owner's own words, EVERY row ticked. Any FAIL → Intake → Bug Fix Phase 2.5 → re-smoke the failed step. All PASS → owner says "Phase 2 smoke OK" → Gate 6 closed.
```

| # | Where | Do this | You should see | Verdict | Owner words |
|---|---|---|---|---|---|
| M2-S01 | Front Desk (Beta) › Arrivals | Click any row to expand it, then press **+ New Booking** in the header. Then click a row again. | Booking form opens **under the tiles** and the expanded row collapses; clicking a row closes the form (one thing open at a time). | | |
| M2-S02 | New Booking form | Name "Smoke P2 Suite", any 10-digit phone, dates today → tomorrow, 1 adult. Wait for the grid, pick a **Suite** price cell. | Grid = room types × plans with the rate-table ₹/night (you cannot type a price; sold-out types greyed). Right side = **Stay summary**: type · plan, rate/night, nights, advance — **no Total / SGST / CGST yet**. Green "✓ Ready to book". | | |
| M2-S03 ₹ | Same form | Tick "Collect an advance now" → ₹1,000 → **UPI** → notice Save is greyed → type UTR "SMOKE1" → **Save booking**. | Confirmation from the server: Booking charge · SGST · CGST · **Total incl. GST** · Advance ₹1,000 · **Balance = Total − 1,000**. (F12 › Network › direct-reservation: payload has room_code / rateplan_code / rooms_count 1 / advance, and NO rate_per_night or room_price.) | | |
| M2-S04 | Same form | Press **Done**. | Toast "Booking saved — MG-69-…", form closes, list refreshes; Arrivals › **Today** shows the row with a **₹1,000 advance chip**. | | |
| M2-S05 ₹ | That row | Press **Check In**. | Form opens in place. Right side = the same server figures (rate/night, Booking charge, SGST, CGST, Total, **Already paid ₹1,000**, Balance). Confirm greyed, "Missing: room". | | |
| M2-S06 | Room dropdown | Pick **r4, r5 or r1** (a room tagged **HK** is fine). | Only Suite rooms that are Available or Needs-cleaning are listed — r2/r3 never. HK room → amber "still being cleaned — check-in is allowed" note. Confirm becomes live. | | |
| M2-S07 ₹ | Collect now | ₹500 → **Card** → Txn ID "SMOKE2" → **Confirm check-in**. | Toast "Checked in — Room rX", form closes, refresh. **In-House** row shows **Paid so far ₹1,500**; Rooms tile occupied. (Network: user-group-check-in is multipart with advance_payment 500, payment_method Card, room_price 0, order_amount 0, gst_tax 0.) Old Guest Folio: two payment rows (₹1,000 UPI + ₹500 Card). | | |
| M2-S08 ₹ | New Booking → Check In (needs Executive FREE — see pre-read) | Create "Smoke P2 Exec" (Executive, today → tomorrow, no advance) → Done → its row → Check In → tick **Show higher categories (upgrade)** → pick a Suite (r4/r5/r1) → **Paid upgrade** ₹1,500, reason "smoke" → Confirm. | Options end "· upgrade"; Paid / Complimentary choice appears. After Confirm the old Folio shows a **"Room upgrade: smoke"** line and GST recomputed on the new total; In-House balance = server figure. If Executive is occupied write **"blocked — Executive occupied"**. | | |
| M2-S09 | New Booking | Create a Suite booking for **tomorrow → day after** (no advance) → Done → Arrivals › **Tomorrow**. | Its **Check In is greyed**; hovering shows "Arrives <date> — modify the booking dates to check in today". | | |
| M2-S10 | Channel Manager › Front Desk Rules | Allow early check-in **ON** → Save → back to Front Desk (Beta), reload → look at the same row → return, switch **OFF** → Save → reload. | ON → Check In is live (do not press it) · OFF → greyed again. Extension pricing still **Rate table**. Rule ends **OFF**. | | |
| M2-S11 | New Booking (optional) | Try a Card advance without Txn ID, and a 9-digit phone. | Save greyed with "Missing: payment reference / 10-digit phone"; nothing is sent. Any server refusal (e.g. "no rate configured") appears verbatim in red under the summary and the form stays open. | | |
| M2-S12 | Old pages | Open `/pms/new-booking` and `/pms/check-in`. | Both open as before (legacy untouched; still misprice = BUG-431/432 → FU-385-C — do not use them for real work). | | |
| M2-S13 ₹ | Clean-up | Old `/pms/departures` › Upcoming → **Check Out** each smoke stay → **Cash** full → Confirm. Front Desk (Beta): cancel the "tomorrow" booking (and any other smoke booking). Front Desk Rules = OFF + Rate table. | Toast "Checked out · Room rX"; r4/r5/r1 free; In-House = only r2/r3 (or fewer if you checked out 174); no No-Show confirmed. Then say **"Phase 2 smoke OK"**. | | |

## Result (Phase 2)
_(facilitator fills)_ M2-S01…M2-S13: __/13 PASS (S08 may be "blocked — Executive occupied", S11 optional) · owner verdict: ________ · date/time: ________

## Phase 3 steps — appended 2026-09-22 (run in the SAME combined session right after M2-S01…S13; ≈ 15 min) — M3-S01…M3-S10 · Phase 3 QA PASSED (it.19 + `QA_REPORT_2026_09_22_CR385_P3_ROLE4.md`) · **D86: run after Phase 4 QA together with M4-S01…Sxx**
```
Pre-read:    Rows M2-S01…S13 first (D84 combined smoke). Balance column now = room + room service + transferred F&B, ROUNDED LIKE THE BILL (CR-170: paise ≥ 10 rounds up) → it can differ by ₹1 from the OLD In-House page (2,212.35) and OLD Folio (2,212); hover the amount to see "raw + round-off". That is BUG-433 fixed, not a defect.
Executive:   if you checked out stay 174 (r2) for M2-S08, keep r2 free until M2-S08 is done, then it may be re-used.
Rates:       M3-S06 needs the backend "wipe → extend → restore" recipe (D68) for the "held (no rate for this date)" chip — optional if backend is unavailable; write "skipped — no recipe".
Rooms/settle: still r4 / r5 / r1 only; settle every stay via /pms/departures (Cash); Front Desk Rules end OFF + Rate table.
Known-ignore: BQ-385-22 slow LR (after Extend the row may take a few seconds to refresh) · BQ-385-23 "SR ●" · BQ-385-25 occupancy % · OG-PMS-043 header date flash.
```

| # | Where | Do this | You should see | Verdict | Owner words |
|---|---|---|---|---|---|
| M3-S01 ₹ | Front Desk (Beta) › In-House | Use the stay you checked in at M2-S07. Compare its **Balance** with the old Guest Folio "Total Balance Due" and with the POS checkout drawer grand total. | Balance = POS grand total **to the rupee**; the old Folio may be ₹1 lower (its own display rounding — BUG-433 residual, OD-385-20). Hover shows "₹x.xx + ₹0.yy round-off". | | |
| M3-S02 ₹ | POS | Add a room-service order (with an add-on) to that room from POS. Back on Front Desk (Beta) press Refresh. | In-House **Balance** and the POS grand total move by the **same** amount. | | |
| M3-S03 ₹ | In-House row | Press **Extend** → new check-out **+1 night** → reason "smoke" → **Confirm**. | Right side after confirm: **each night with its source chip** ("rate table" — the property default), SGST and CGST as two lines, total, paid so far, balance — all server figures; list refreshes and the row shows the new check-out. Refresh the page → per-night lines still there. | | |
| M3-S04 ₹ | Same row → Extend again | +1 night, tick **Collect now ₹500 Cash** → Confirm. | Balance remaining drops by exactly ₹500; old Folio shows the ₹500 Cash payment row. | | |
| M3-S05 ₹ | Same row → Extend | Shorten by **one night** (pick an earlier check-out) → confirm text reads "Shorten to <date>" → Confirm. | Totals drop to the sold night's rate (not an average); SGST = CGST. | | |
| M3-S06 | Same row → Extend (optional, needs backend recipe D68) | Extend to a date the backend has left without a rate → Confirm → backend restores the rate afterwards. | The added night shows **"held (no rate for this date)"**; nothing is priced by the page. Write "skipped — no recipe" if not available. | | |
| M3-S07 | Rooms tab → the occupied tile | Press **Extend** on the tile. | Jumps to the In-House row expanded as the Extend form (same form). Esc closes it. | | |
| M3-S08 | In-House row | Press **Request HK** (then, on the Rooms tab, **Mark Clean** for that room). | Toast, tile turns Needs-cleaning, then Clean; same behaviour as the Rooms tab buttons. | | |
| M3-S09 | Departures tab | Look at the chips. | **Leaving today** lists only today's departures; an overdue stay (e.g. r2/r3) sits under **Overdue** with "Overdue N d" — never under Leaving today. A fully paid stay shows a **Cleared** pill with Bill greyed. | | |
| M3-S10 ₹ | Clean-up | Old `/pms/departures` → Check Out the smoke stay → **Cash** full → Confirm. Cancel any leftover smoke booking. Front Desk Rules = OFF + Rate table. | Toast "Checked out · Room rX"; r4/r5/r1 free; In-House = owner rows only. Then continue with M4-S01… (D86) — the closing sentence is **"Phase 2 + 3 + 4 smoke OK"** at M4-S09. | | |

## Phase 4 steps — appended 2026-09-22 (run in the SAME combined session right after M3-S01…S10; ≈ 20 min) — M4-S01…M4-S09 · Phase 4 IMPLEMENTED (Gate 5A) · **Phase 4 + 4.5 QA PASSED (Gate 5B: it.23/25/26, `QA_REPORT_2026_09_22_CR385_P4_ROLE4.md`)** · pre-read: legacy Departures TAB → use **Cash** (BUG-449); M2-S08 paid upgrade needs an Executive room free, else write "not available — OG-PMS-038 5th deferral"; M4-S03 write "integer case only" if no paise
```
Pre-read:    Bill opens UNDER the row (Layout B). LEFT = server statement (no FE totals). RIGHT = the same POS payment panel you use on /dashboard, boxed 440×560; its three "Room booking / Transferred / Room service" toggle rows are hidden here only. Panel room balance is fed from the reservation charge (D50) → equals the row Balance to the rupee. Second payment on a paid order → "Already checked out" (server 200 already_paid, no double charge).
Executive:   OG-PMS-038 (paid upgrade, M2-S08) — 5th deferral if r2 (stay 174) is still occupied; write "not available — OG-PMS-038 open".
Legacy TAB:  on the OLD /pms/departures drawer Credit/TAB needs the TAB name + phone typed by hand (BUG-449, FU-385-C) — use Cash there. In the NEW Bill panel TAB is prefilled from the booking (BUG-448 fixed, OD-385-21).
Rooms:       r4/r5/r1 only; r2/r3 never; settle every smoke stay through the NEW Bill panel (that is the object under test); Front Desk Rules end OFF + Rate table.
```
| # | Where | Do this | You should see | Verdict | Owner words |
|---|---|---|---|---|---|
| M4-S01 ₹ | Front Desk (Beta) › Departures or In-House | On the stay you checked in at M2-S07 (with the M3-S01 room-service order) click **Bill** | Opens **under the row** (Extend closes if it was open). LEFT: Guest & stay · **ROOM** (heading = total) · **ROOM ORDERS** (your order lines) · **TRANSFERRED** (empty or your posted dine-in bill). RIGHT: the familiar POS payment panel; **Checkout button visible without scrolling** — also on a 1366×768 laptop. | | |
| M4-S02 ₹ | Bill › ROOM | Open/close the ROOM section | Per-night lines with chips (rate table / held), Booking amount, *Room upgrade: <reason>* line if you upgraded, **SGST and CGST on two separate lines** (BUG-418), Already paid, Room balance. Discount control greyed "needs BQ-385-07". | | |
| M4-S03 ₹ | Bill › RIGHT panel | Compare three figures | Panel **room balance** = LEFT **Room balance** = the row's **Balance** column, to the rupee. If the grand total ends in paise a **round-off** line appears exactly as on a POS bill (BUG-433 paise case) — otherwise write "integer case only". | | |
| M4-S04 | Bill › RIGHT panel · then `/dashboard` | Look for the "Room booking / Transferred / Room service" toggle rows; then open a dine-in checkout on `/dashboard` | **Not shown** inside Front Desk; **still shown** on `/dashboard` (POS unchanged). | | |
| M4-S05 ₹ | Bill › pay | Select **Credit / TAB** → Checkout (full amount) | Toast **"Checked out · Room rX"**; row gone from Departures/In-House; Rooms tile **Needs cleaning**; old Guest Folio shows the TAB ledger row = amount sent, balance 0. | | |
| M4-S06 | Old `/pms/departures` (if the stay is still listed) | Pay again on the settled stay | "Already checked out" — no second charge, no error page. If the stay is no longer reachable write "not reproducible — stay departed" (QA covers it via API). | | |
| M4-S07 ₹ | Second smoke stay (check in r5 or r1 via Front Desk) → **Bill** | Look at the RIGHT panel tiles, then settle with **Cash** (full) → Checkout | **Split tile NOT shown** (D88 — room-stay split → FU-385-D); Cash / Card / UPI / Credit tiles present; toast "Checked out · Room rX"; row gone; one Cash ledger row on the old folio. | | |
| M4-S08 | POS + legacy | `/dashboard` → dine-in order with a **PRICED item** (grand total > ₹0) → Collect Payment: **Split** tile visible → do a Cash + Card split bill · old `/pms/departures` → open the checkout drawer on any remaining stay (look only, close; if you pay there use **Cash** — BUG-449) | Both **exactly as before** (Split present on POS, D88 hides it only inside Front Desk); no console errors (F12, ignore pre-existing socket/firebase lines). | | |
| M4-S09 | Clean-up | Cancel any leftover smoke booking · Front Desk Rules = **OFF + Rate table** · r4/r5/r1 free · In-House = your rows only | Then say **"Phase 2 + 3 + 4 smoke OK"** (closes Gate 6 for P2, P3 and P4 — only after every row above has a verdict). | | |

## Channel Manager row — appended 2026-09-22 (BUG-450 mini-gate; read-only look, ≈2 min, run any time in the same session)
| Step | Where | Do | Expect | Verdict (owner, verbatim) | Note |
|---|---|---|---|---|---|
| CM-S01 | `/pms/channel-manager` › Rates & Restrictions (rates load on open) › sub-tab **Inventory Restrictions** | Look only — **do NOT push** | One card per **real** room type of the property (same codes as Rate Restrictions; names from Room Mapping when you have opened that tab, else the code) — no "Executive Room" / "Suite" unless the property really has them; Rates grid group headers show the same names. | | |

## Gate 6 combined session — STARTED 2026-09-22 — owner words: "GO combined smoke — logged in. OWNER_TGK on preprod, Front Desk (Beta) › Arrivals, Network tab open." Facilitator Role 8; sandbox frozen for the agent (read-only QA_TGK only on request). Executive room for M2-S08: owner to state at S08.

## Result (combined Phase 2 + 3 + 4 — D86)
M2-S01…S13: 12/13 PASS + S11 skipped (optional) · M3-S01…S10: 9/10 PASS + S06 skipped (optional) · M4-S01…S09: 9/9 · CM-S01: 1/1 — per owner word · owner verdict (verbatim): **"all smoke test passed"** · date/time: 2026-09-23 (P5 agent recorded; read as "Phase 2 + 3 + 4 smoke OK")

**Row-level caveats still to be confirmed by the owner in one line (do not block P5 planning, block only the OG-PMS-038 registry entry):**
- M2-S08 (paid upgrade): **PASS** — owner 2026-09-23 verbatim: "1 pass as sign off this was checked in smoke" → OG-PMS-038 CLOSED (R-P5-2 path a; no exception sentence needed at sign-off).
- M2-S11 (optional) and M3-S06 (optional, D68 recipe): **skipped** — owner 2026-09-23 verbatim: "skip will check later". Not required for Gate 6 (both rows optional); may be re-run by the owner at any time, no P5 dependency.
- No FAIL row reported → no Phase 4.5x cycle. **Gate 6 CLOSED for P2 + P3 + P4 + CM-S01 by owner word 2026-09-23.**

## Status 2026-09-22 — D86: combined P2+P3 smoke DEFERRED AGAIN → one combined session after Phase 4 QA (M2 + M3 + M4 rows). M4 rows M4-S01…S09 appended above (Phase 4 IMPLEMENTED 2026-09-22; run only after Phase 4 QA passes).
