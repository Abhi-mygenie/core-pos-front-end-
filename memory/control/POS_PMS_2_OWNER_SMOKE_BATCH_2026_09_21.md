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

## Result
_(facilitator fills)_ S-1…S-12: __/12 PASS · owner verdict: ________ · date/time: ________
Any FAIL → BUG-4xx filed via Intake → Bug Fix in Phase 0.5 → re-smoke the failed step only.
