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


## Phase 1.5 steps — appended 2026-09-22 (run AFTER S-13…S-20; ≈ 5 min)
Pre-read: `test_reports/QA_REPORT_2026_09_22_CR385_P1_5_ROLE4.md` (Phase 1 33/33, BUG-441/442 verified). Known, ignore: after a Modify the row shows **"SR ●"** with text "| MODIFY: …" — backend appends the modify reason to special requests (**BQ-385-23/24**, no frontend workaround). Known blocker: S-22 — **BUG-444 DEFERRED-TO-FU-385-C** (old tape chart hides new Direct bookings): write "blocked, BUG-444" and cancel that booking from Front Desk (Beta).

| # | Where | Do this | You should see | Verdict | Owner words |
|---|---|---|---|---|---|
| S-21 | Old `/pms/arrivals` (Today or Upcoming) | ⋮ on one of YOUR Smoke bookings → **Cancel** → reason "guest cancelled" → Confirm | **200**, toast "Booking cancelled", card leaves the list and appears under **Cancelled**. F12 → Network: URL ends `/local-reservations/<number>/cancel` (a number, not MG-…). | | |
| S-22 | Old `/pms/reservations` | Find a block of YOUR Smoke booking → popover → **Cancel** → reason → Confirm | 200, block gone after Refresh. **If the booking is not on the chart → write "blocked, BUG-444"** and cancel it from Front Desk (Beta) instead. | | |
| S-23 | Any cancel (S-18 / S-21) | F12 → Network → the `/cancel` request → Payload | `cancelled_by` shows **your name** (e.g. "Owner"), not "staff". | | |
| S-25 | Old `/pms/arrivals` ⋮ → Modify (optional) | If you modify from the OLD page: rate cards show ₹0 and the request carries `amount_after_tax: 0` | **Known dirty payload, harmless** — the server recomputes the price (probe 2026-09-22: 2 → 3 nights = ₹74,340 → ₹111,510). Retires with FU-385-C (BUG-443). Not a bug for this smoke. | | |
| S-24 | Front Desk (Beta) after S-17b | Look at the modified row | "SR ●" marker with "| MODIFY: …" text = **known BQ-385-23/24 — ignore**, not a bug. | | |

Verdict: S-21, S-23, S-24 PASS (S-22 PASS or "blocked, BUG-444") → include in **"Phase 1 smoke OK"**.

## Status 2026-09-21 — DEFERRED (owner exception D74) → now COMBINED with Phase 1 (S-13…S-20 appended)
Not run. Owner: Phase 0 smoke is executed together with the Phase 1 smoke in one combined session. Append the Phase 1 steps as S-13… to THIS document when Phase 1 reaches Gate 6; run S-1…S-12 first.

## Result
_(facilitator fills)_ S-1…S-12: __/12 PASS · S-13…S-20: __/8 PASS · S-21…S-25: __/5 PASS (S-22 = blocked) · owner verdict: ________ · date/time: ________
Any FAIL → BUG-4xx filed via Intake → Bug Fix in Phase 0.5 → re-smoke the failed step only.
