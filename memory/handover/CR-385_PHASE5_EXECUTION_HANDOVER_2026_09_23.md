# CR-385 — PHASE 5 (CLOSURE) EXECUTION HANDOVER — 2026-09-23

```
Written by:   Phase 5 preparation agent (AGENT_PROMPT_ALPHA v0.7 Role 11 — Closure), 2026-09-23
For:          the agent who EXECUTES Phase 5 (Sessions 0/A/B/C, probe pack, registry closure, QA report, sign-off)
Supersedes:   handover/CR-385_PHASE5_HANDOVER_2026_09_22.md  (still valid for §1 rules, §6 code map, §7 known-ignore, §9 pitfalls — read it too)
Blueprint:    plans/CR-385_P5_PLAN_NOTE_2026_09_23.md  (single source of truth for HOW; this file is WHAT/WHERE/WHEN)
Language:     owner communicates in English — respond in English only
```

Self-contained. Read this, then `control/AGENT_PROMPT_ALPHA.md` (STEP -1, Role 11, Role 4), then the plan note, then the 2026-09-22 handover. Do not ask the owner anything already answered below.

---

## 0. Status at the moment of writing — read this first

| Gate / condition | State | Owner words (verbatim) |
|---|---|---|
| Gate 6 combined owner smoke (M2-S01…S13 · M3-S01…S10 · M4-S01…S09 · CM-S01) | **CLOSED 2026-09-23** | "all smoke test passed" · M2-S08 (paid upgrade): "1 pass as sign off this was checked in smoke" · M2-S11 + M3-S06 (optional): "skip will check later" |
| EC-1 smoke | ✅ | as above; row table in `control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md` Result block: 12/13+skip · 9/10+skip · 9/9 · 1/1 |
| EC-2 smoke-FAIL contingency | not triggered (0 FAIL rows) | — |
| EC-3 OG-PMS-049 (full jest) | ✅ | "approved — quarantine all 12 pre-existing suites + the 2 `process.exit` scripts to their owning CRs (record the mapping in OPEN_GAPS_REGISTER); P5 jest gate = `cr385\|bug450` 128 green; no code in those suites." → mapping recorded |
| EC-4 QA_TGK password rotation + `memory/test_credentials.md` | **OWNER SAYS "EC4 is fine i will give u next agent"** → the owner will hand the QA_TGK credentials to YOU directly. Write them into `memory/test_credentials.md` (`## QA_TGK` section, format in §3) BEFORE anything else. Never echo them. | "I rotate QA_TGK and update `memory/test_credentials.md` after the smoke, before your first mutating session; I'll say 'QA_TGK rotated'." |
| EC-5 "Phase 5 GO" | ⏳ **NOT RECEIVED** | — you must receive the literal words "Phase 5 GO" before any mutation on the sandbox or any code change |
| OG-PMS-038 (paid upgrade) | **CLOSED** by M2-S08 PASS (R-P5-2 path a) | no exception sentence needed at sign-off |
| FU-385-C (retire legacy) | separate CR after CR-385 closes | "separate CR after CR-385 closes. Gate 5 closes without it; BUG-431/432/443/444/446/449, X-06 and legacy rounding stay DEFERRED-TO-FU-385-C with that sentence in the sign-off." |
| FU-385-D (Split for room stays) | separate follow-up CR | "separate follow-up CR. D88 stays; `frontdesk.css` + `hideSectionRows` guard unchanged; OG-PMS-048 stays OPEN pending FU-385-D." |
| Session 0 (guards only) | **DONE 2026-09-23 — all 6 guards PASS** | evidence `evidence/CR-385/probes_2026_09_23_release/SESSION0_GUARDS.md`; entry read-back NOT run (no credentials in workspace) |
| Code | **ZERO changes in `frontend/src` since `642ccb8` + CR-385 phases; workspace == origin `21implement` HEAD `72037e7`** | — |
| Decisions | D89 (+2 addenda) in `plans/CR-385_DESIGN_DECISIONS.md` | — |

**Your first three actions, in order:**
1. STEP -1 of AGENT_PROMPT_ALPHA: read latest `handover/SESSION_HANDOVER_*.md` + this file; tell the owner in one line where things stand (table above).
2. Receive QA_TGK credentials from the owner → write `memory/test_credentials.md` (§3) → run the **entry read-back** (read-only, allowed before GO) → report the 4 facts (business date; r2/r3 owner stays; r4/r5/r1 free/HK; 3 settings default).
3. Wait for the literal **"Phase 5 GO"**. Then execute §5 in order. Nothing mutating before it.

---

## 1. Your role and the rules that bind you

- **Role:** AGENT_PROMPT_ALPHA v0.7 **Role 11 CLOSURE** for the closure paperwork **+ Role 4 QA** discipline for the regression (independent testing_agent, single Playwright call per session, QA_TGK, `finally` cleanup). You are NOT an Implementation agent: **Phase 5 has no feature code.** The only code you may touch is a Phase 5.5 bug fix, and only after intake + owner "Phase 5.5 GO".
- **Branch:** `origin/21implement` ONLY, via the platform **"Save to GitHub"** button; never any other branch, never force. The owner's tracker validates every push (test counts, hotspot byte-identity, markers).
- **Gate words are literal, never inferred:** "Phase 5 GO" (opens mutations), "Phase 5.5 GO" (bug batch, only if a P5 row FAILs), final sign-off word (owner's own phrase — quote it verbatim, e.g. "CR-385 closed"). A summary sentence from you never substitutes for the owner's word.
- **Hotspots — byte-identical, forever in this CR:** `components/order-entry/CollectPaymentPanel.jsx`, `api/transforms/orderTransform.js`, `api/services/pmsService.js`, `components/pms/PmsCheckoutDrawer.jsx`, legacy `pages/pms/NewBookingPage.jsx` / `CheckInPage.jsx` / `GuestFolioPage.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`, `LoadingPage.jsx`, shared round-off helper. `git log -1` on origin must still show `642ccb8`.
- **Frozen money rules:** D50/G-02 (FE never computes or submits `rate_per_night`, `room_price`, `amount_after_tax`, `order_amount`, `new_room_price`); D85 (M5 row balance = FE sum + shared round-off, temporary); D87 (M6 checkout body = unchanged POS `collectBillExisting` + `room_gst_tax` passthrough); D88 (Split hidden in Front Desk Bill by `.frontdesk-bill` CSS → FU-385-D).
- **Sandbox (preprod, RID 69 `sandbox-pms`):** business date = header `meta.business_date`, never the PC clock. **r2 (8526, Executive, stay 174 "bkol", order 1232602) and r3 (8524, Suite, stay 155 "blpi", order 1232583) are the OWNER'S live stays — never check in / pay / cancel / extend / touch.** QA check-ins only into **r4 / r5 / r1** (r1 may be HK — allowed, N9). **Never confirm No-Show.** Every QA stay settled after the test, leftover QA bookings cancelled, rules end at `allow_early_checkin=false`, `extend_rate_mode=calendar` ("Rate table"), `auto_print_checkin_receipt=false`.
- **Read-only vs mutating:** read-only = tab clicks, Bill open (folio fetch), Channel Manager look (never click `rt-inv-push-btn` / `rt-rr-push-btn` / `rt-bulk-btn`), API GETs, `settings-list`, `local-reservations`, `room-status-board`, `room-availability`. Mutating = booking, check-in, extend/shorten, any payment, cancel, rule toggle, room status change, Room Mapping save, OTA push, POS order placement, **and the D17 probe pack** (it creates bookings + check-ins). Mutating only after "Phase 5 GO" and never while the owner is on the sandbox (ask "are you off the sandbox?" before Session A).
- **Credentials:** `memory/test_credentials.md` only; scripts read it (pattern: `evidence/CR-385/phase4_qa/bug450_selfcheck.py` L4–5). Never echo values in chat, reports, scripts, evidence JSON, or commit messages. OWNER_TGK is never used by QA.
- **Tooling:** testing_agent for independent QA (results → `test_reports/iteration_<n>.json`); your own runs are extra evidence only. Login page is `/` (not `/login`), then `/loading` redirect (up to ~15 s). `networkidle` never settles (socket polling) → use `domcontentloaded` + selector waits. Use yarn only. Frontend lives in `/app/frontend` under supervisor — never move it, never start your own server. `pip install playwright` + `executable_path='/usr/bin/google-chrome'` for local read-only self-checks. **Do not clone into /tmp for anything persistent** (pod restarts wipe it); if you need origin history for Guard 3, clone, check, delete.
- **Every session ends with a SESSION_HANDOVER** (`handover/SESSION_HANDOVER_<date>_CR385_P5_<state>.md`) with the mandatory self-assessment: registry synced? scope drift? all artifacts present? credentials scrubbed?

---

## 2. Boot sequence (≈15 min) — read in this order

```
1. handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md   ← this file
2. control/AGENT_PROMPT_ALPHA.md                              ← STEP -1, STEP 0, ROLE 11 (L1281), ROLE 4 (L714), self-assessment rule
3. plans/CR-385_P5_PLAN_NOTE_2026_09_23.md                     ← §1 EC table, §3 matrix plan, §4 sessions, §5 artifacts, §7 registry checklist + 6 guards, §8 closing sequence, §10 owner answers + Session 0 result
4. handover/CR-385_PHASE5_HANDOVER_2026_09_22.md              ← §6 code map + testid conventions, §7 known-ignore list, §9 pitfalls
5. control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md L73–160  ← the M2/M3/M4/CM rows: they ARE the manual recipe for Sessions A/B/C (same clicks, same expected texts)
6. plans/CR-385_IMPLEMENTATION_PLAN.md §6 (34-row matrix), §7 (registry checklist)
7. plans/CR-385_IMPLEMENTATION_PLAN_PHASED.md §5 (Phase 5 definition)
8. plans/CR-385_DESIGN_DECISIONS.md D50, D68, D85, D86, D87, D88, D89
9. control/OPEN_GAPS_REGISTER.md (OG-PMS-020…049), control/BUG_TRACKER.md (BUG-412/418/431/432/433/443/444/446/448/449/450), control/FILE_OWNERSHIP.md (CR-385 entries — 74 lines exist; find what is owed)
10. evidence/CR-385/probes_2026_09_23_release/SESSION0_GUARDS.md  ← what already passed
11. evidence/CR-385/phase4_qa/t0_entry_readback.json + t9_readback.json ← shape of the read-backs you must reproduce
12. evidence/CR-385/probes_2026_09_21_d17/PROBE_REPORT.md + log_d17.txt ← D17 legs A/B/C you will re-run in Session A
13. memory/test_credentials.md ← must contain ## QA_TGK before Session A (owner gives it to you)
```

Environment check (STEP -1.5): `curl -s -o /dev/null -w "%{http_code}" $(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)/` → 200; `sudo supervisorctl status` → frontend RUNNING; `cd /app/frontend && CI=true yarn test --watchAll=false --testPathPattern "cr385|bug450"` → 128 passed.

---

## 3. Credentials file format (write it when the owner gives you QA_TGK)

`memory/test_credentials.md` currently holds only the 3-line header. Append exactly this shape (scripts parse the backticks):

```
## QA_TGK
- role: QA / testing_agent account (preprod RID 69 sandbox-pms) — single-session: one login per browser call
- email `<value>`
- password `<value>`
- login page `/` → wait for `/loading` → app
- rotated by owner: 2026-09-2x ("QA_TGK rotated")

## OWNER_TGK
- owner's own login — NEVER used by agents or testing_agent
```

Hand the same email/password to the testing_agent via the `required_credentials` field **by reference to the file**, not by pasting values into the task text if avoidable; if the tool needs literals, pass them in the tool call only — never in a report, script or evidence file.

---

## 4. What is already done (do not redo)

- Session 0 guards 1–6 **PASS** (`SESSION0_GUARDS.md`): money grep 2 lines; room-type grep 0; hotspots `642ccb8` (verified on origin clone + sha256 identical); mockup sha `12fd0f4a343fc89d…`; jest 128/128; `yarn build` exit 0.
- OG-PMS-049 quarantine mapping recorded (`OPEN_GAPS_REGISTER.md` OG-PMS-049 → TRIAGED).
- OG-PMS-038 → CLOSED (`OPEN_GAPS_REGISTER.md`).
- Gate 6 Result block filled in the smoke sheet; D89 + addenda written; `registry.json` CR-385 `status_history` up to date; CR_REGISTRY / CONTROL_DASHBOARD "Last Updated" lines; PRD.
- Plan note §10 has all owner answers verbatim and the EC scoreboard.

---

## 5. Execution plan — do exactly this, in this order

### 5.0 Before "Phase 5 GO" (allowed now)
1. Write `memory/test_credentials.md` (§3).
2. **Entry read-back** (read-only, QA_TGK API login) → `evidence/CR-385/probes_2026_09_23_release/t0_entry_readback.json`. Endpoints (Bearer token from `POST /api/v1/auth/vendoremployee/common-login` with `{"email","password"}`, header `X-localization: en`; base URL = `REACT_APP_API_BASE_URL` from `frontend/.env`):
   - `GET /api/v2/vendoremployee/restaurant-settings/settings-list` → `data.basic.allow_early_checkin=false`, `extend_rate_mode="calendar"`, `auto_print_checkin_receipt=false`
   - `GET /api/v2/vendoremployee/aiosell/local-reservations?start_date=<bd-30>&end_date=<bd+60>&view=all` → `data.meta.business_date`, `data.counts`, in-house rows (expect only 155/r3 and 174/r2)
   - `GET /api/v2/vendoremployee/aiosell/room-status-board` → r1…r5 `display_status`
   - Shape to reproduce: `evidence/CR-385/phase4_qa/t0_entry_readback.json`. Model script: `evidence/CR-385/probes_2026_09_22_p2_entry/run_entry.py` (read-only parts only — skip its step 4 `direct-reservation` probe, that is a POST).
   - **Note the login is single-session**: an API login while the owner is logged in as OWNER_TGK is fine (different account); an API login while a testing_agent browser is logged in as QA_TGK will kick that browser out — do read-backs only before/after browser sessions, never during.
3. Report to the owner: "Entry read-back: business_date X · r2/r3 = your stays 174/155 · r4/r5/r1 = <free|hk> · settings default ✔. Ready for 'Phase 5 GO'." Ask: "Are you off the sandbox?"

### 5.1 On "Phase 5 GO" — Session A (mutating, one testing_agent Playwright call, QA_TGK)
Reference recipe = smoke rows **M2-S01…S07, S09, S10, S13** (`POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md` L89–101) using the Beta page instead of legacy for cleanup.
1. Login `/` → `/pms/front-desk-v2` (sidebar "Front Desk (Beta)") → `fd-tab-arrivals` → `fd-new-booking-btn`.
2. **New Booking**: `booking-guest-name` "P5 QA Suite", `booking-guest-phone` 10 digits, `booking-checkin` = business date, `booking-checkout` = +1, `booking-adults` 1 → wait `booking-rate-grid` → click a **Suite** cell `booking-cell-<type>-<plan>` → `booking-advance-toggle` ON → `booking-advance-amount` 500 → `booking-pay-card` (New Booking methods are lower-case: `booking-pay-cash|card|upi`) → `booking-pay-ref` "P5QA1" → `booking-save-btn` → `booking-confirmation` shows server figures (SGST/CGST two lines, advance ₹500) → `booking-done-btn` → click `fd-chip-arrivals-today` (OG-PMS-046: row is under Today, not the default chip). Assert: no `rate_per_night`/`room_price`/`amount_after_tax`/`new_room_price` in the POST body (capture requests).
3. **Check-In**: `fd-row-<id>-checkin-btn` (row cell; inside the expansion drawer the same actions are prefixed `fd-row-<id>-exp-checkin-btn`, BUG-439) → `checkin-form` → `checkin-room-select` pick r4 or r5 (r1 shows `checkin-room-hk-badge` — allowed) → `checkin-bill-paid` = ₹500 → `checkin-collect-amount` 500 → `checkin-pay-card` (Check-In methods are lower-cased in the testid: `checkin-pay-cash|card|upi`) → `checkin-pay-ref` "P5QA2" → `checkin-confirm-btn` → toast → In-House row `fd-row-<id>-paid` = ₹1,000. RIGHT pane: `checkin-bill` scrollHeight == clientHeight at 1366×768 (matrix row 17).
4. **D17 / BUG-412 re-verify** (API, in the same session window, after the browser call ends OR as a separate script run — never concurrently with a QA_TGK browser): re-run legs A/B/C of `evidence/CR-385/probes_2026_09_21_d17/` (`*_direct.json` → `*_checkin.json`): A no advance at booking + ₹500 Card at check-in; B ₹1,000 at booking + ₹0 at check-in; C ₹1,000 booking + ₹500 UPI at check-in → assert `charge.advance_payment` cumulative and `balance_due` correct in each response; settle + cancel in cleanup → write `d17_reverify.json` into `probes_2026_09_23_release/`. If the old scripts contain a literal credential, re-point them to read `memory/test_credentials.md` first (do not commit literals).
5. **Paid-upgrade regression (optional — OG-PMS-038 already CLOSED):** only if `room-availability` shows an Executive room free **other than r2**: Executive booking → Check-In → `checkin-upgrade-toggle` ("Show higher categories") → pick Suite → `checkin-upgrade-amount` present, GST 18 % held, `checkin-upgrade-paid`. If none free: write "paid upgrade regression skipped — no free Executive; OG-PMS-038 already closed by smoke". Never free r2.
6. **Toggle cycle**: `/pms/channel-manager` → `channel-manager-tab-4` (Front Desk Rules — index-based!) → `toggle-allow-early-checkin` ON → `frontdesk-rules-save-btn` → back to Front Desk → tomorrow-booking `fd-row-<id>-checkin-btn` no longer greyed / `checkin-early-tooltip` gone → back → OFF → save. `extend-rate-mode` radios stay "Rate table" (`radio-extend-rate-mode-calendar`).
7. **Bill (Cash)**: In-House `fd-row-<id>-bill-btn` → `bill-panel-<id>` → `.frontdesk-bill` box 440×560 → `bill-room-sgst` + `bill-room-cgst` two lines → RIGHT `bill-right`: `checkout-room-booking-toggle` / `checkout-transferred-toggle` / `checkout-room-service-toggle` **not visible**, `payment-split-btn` **not visible** (D88), `bill-stack-room-balance` = LEFT `bill-room-total` balance = row `fd-row-<id>-balance` → Cash → `cash-received-input` full → `complete-payment-btn` → toast "Checked out · Room rX" → row gone → Rooms tab `fd-room-tile-<id>` shows Needs-cleaning.
8. **Cleanup in `finally`**: any QA stay still in-house → Bill → Cash full; any QA booking left (incl. "tomorrow" row) → `fd-row-<id>-cancel-btn` → confirm; Rules OFF + Rate table. Rooms r4/r5/r1 back to free/HK.
Matrix rows covered: 10 (live 422 optional), 11, 12, 15, 16, 17, 18, 23, 24, 25, 27, 31, 32.

### 5.2 Session B (mutating — extend / shorten / Bill shapes / TAB)
Reference recipe = smoke rows **M3-S01…S05, S07…S09, M4-S01…S06**.
1. Fresh Suite booking (no advance) → Check-In r4/r5 with ₹0 collect (setup).
2. Optional paise case (BUG-433): from POS `/dashboard`, add a room-service order with an add-on to that room (M3-S02) → Front Desk `fd-refresh-btn` → row balance moves by the same amount as POS grand total. If skipped, write "integer case only".
3. **Extend +1** `fd-row-<id>-extend-btn` → `extend-form` → `extend-checkout` +1 → `extend-reason` "p5" → `extend-confirm-btn` → `extend-result` → `nights-lines-*` each night with source chip ("rate table"); `extend-bill-sgst`/`-cgst` two lines. Body must NOT carry `new_room_price`.
4. **Extend again with collect-now**: +1, `extend-collect-toggle` ON, `extend-collect-amount` 500, `extend-pay-cash` (`extend-pay-cash|card|upi`) → confirm → `extend-bill-balance` drops by ₹500.
5. **Shorten −1**: `extend-checkout` earlier → confirm text "Shorten to <date>" → confirm → totals drop to the sold nights (D15 re-price). 
6. Rooms tile `fd-room-action-extend-<tableId>` → jumps to the In-House row expanded as Extend (M3-S07); Esc closes.
7. `fd-row-<id>-hk-btn` Request HK → Rooms tile turns Needs-cleaning → `fd-room-action-clean-<tableId>` → Clean (M3-S08).
8. Departures tab chips (`fd-chip-departures-<overdue|today|tomorrow|upcoming>`): Today lists only today's departures; r2/r3 sit under `fd-chip-departures-overdue` with "Overdue N d" (M3-S09). In-House chips are `fd-chip-inhouse-<all|arrived|leaving|stayover>` ("Leaving today" = `leaving`). **Look only.**
9. **Bill (TAB)**: `fd-row-<id>-bill-btn` → LEFT sections ROOM (`bill-room-toggle` open/close), ROOM ORDERS (or `bill-orders-empty`), TRANSFERRED (or `bill-transferred-empty`) → `bill-stack-room-balance` == LEFT == row → Credit/TAB tile → `tab-customer-section` visible **and prefilled** (BUG-448, class `fd-bill-tab-prefilled`) → `complete-payment-btn` → toast → row gone → tile HK. Then re-submit the same payment via API (or re-open if still reachable) → `200 {status:"already_paid"}` no second charge (M4-S06, matrix row 28).
10. Cleanup in `finally` as in Session A.
Matrix rows covered: 20 (live), 21, 23, 24, 27, 28.

### 5.3 Session C (POS F&B regression + legacy + exit read-back)
Reference = smoke rows **M4-S04, M4-S07 (Split NOT shown — already covered in A), M4-S08, M2-S12, M3-S10**.
1. `/dashboard` → dine-in → add **one PRICED item** (grand total > ₹0; a ₹0 order never renders the Split tile — it.26 F-6) → Collect Payment: `collect-payment-panel` → **`payment-split-btn` visible** → `checkout-room-booking-toggle` / `checkout-transferred-toggle` / `checkout-room-service-toggle` **visible** on POS → `split-bill-btn` flow: Cash ₹100 + Card remainder → sum == `bill-grand-total` → `complete-payment-btn` → receipt.
2. Legacy pages load unchanged: `/pms/new-booking`, `/pms/check-in`, `/pms/departures` (open the checkout drawer on any remaining stay — **look only, close without paying**; legacy TAB is disabled until name+phone typed = BUG-449 → never use it). `/pms/front-desk` (old page) still renders.
3. Console sweep: 0 errors at **1920×800** and **1366×768** on `/pms/front-desk-v2` (all 4 tabs) and `/dashboard`; ignore socket/firebase/messaging lines. Unique data-testids on the page (X-10).
4. After the browser call: **exit read-back** → `t9_readback.json` (same 3 GETs as t0): r4/r5/r1 free or HK, only 155/174 in-house, settings default, no QA rows left.
Output: `session_c_pos_regression.json` + `t9_readback.json`.
Matrix rows: 29, 33.

### 5.4 Probe pack re-run (API, QA_TGK, after Session C, sandbox quiet)
Run each script from `evidence/CR-385/` with output into `probes_2026_09_23_release/`; re-point any literal credential to `memory/test_credentials.md` first:
- `probes_2026_09_20_gate4/run_gate4.py` — booking/check-in/extend wire + `charge{}` read-back (matrix 11, 18, 21)
- `probes_2026_09_20_n7n8/run_n7n8.py` — N7 early check-in guard → 422 when `allow_early_checkin=false`; N8 `extend_rate_mode` (16 live, 32)
- `probes_2026_09_20_n11/run_n11.py` + `run_d14.py` — per-night GST slab, collect-now echoed in response (20)
- `probes_2026_09_20_d1516/` — shorten re-price D15, move keeps price D16 (20)
- `probes_2026_09_21_held_fallback/` — **needs the backend to wipe a rate (D68 recipe)**; if the backend team is not available write "skipped — no recipe" (same wording as M3-S06)
- D17 already produced in Session A (`d17_reverify.json`)
Each script settles/cancels what it creates. Write `PROBE_REPORT.md`: per script → endpoint · HTTP · key figures · **forbidden-key grep** over every captured request body: `grep -E "rate_per_night|room_price|amount_after_tax|new_room_price"` → must be empty.

### 5.5 Guards on the final build (repeat Session 0; all six must PASS — plan note §7)
1. Money grep → exactly 2 lines (`frontDeskService.js` L70 comment, L101 `fd.append('balance_payment', '0')`).
2. Room-type grep → 0 lines.
3. Hotspots → `642ccb8` (on origin `21implement`; the `/app` git is the platform repo — clone origin with `--filter=blob:none`, check, delete).
4. `sha256sum frontend/public/cr385-frontdesk-mockup.html` → `12fd0f4a343fc89d…`.
5. `CI=true yarn test --watchAll=false --testPathPattern "cr385|bug450"` → 128 passed.
6. `yarn build` (plain) → exit 0.
Record the actual outputs in the QA report.

### 5.6 QA report (Role 4, independent) — `test_reports/QA_REPORT_<date>_CR385_P5_ROLE4.md`
Per matrix row 1…34: PASS / FAIL / N/A (with evidence path, iteration file, severity for FAIL). Include: Session A/B/C results, D17 re-verify, probe pack summary, 6 guards with outputs, entry + exit read-back comparison (r2/r3 untouched, r4/r5/r1 restored, settings default), console sweep, known-ignore list applied (2026-09-22 handover §7). **Any FAIL → STOP**: intake (`change_requests/BUG-<n>_*_INTAKE.md`, BUG_TRACKER, registry) → owner routing → "Phase 5.5 GO" → fix → QA re-test of that row → resume. No sign-off with an open FAIL.

### 5.7 Registry closure (plan note §7 — do all, tick each)
- `control/FILE_OWNERSHIP.md`: add the owed block (plan note §7 "FILE_OWNERSHIP entries owed") — `FolioCheckoutPanel.jsx` (M6 + BUG-448), `frontdesk.css` D88 line, `tests/cr385/phase2/3/4.cr385.test.jsx`, `hideSectionRows.cr385.test.js`, `RatesTab.jsx` + `ChannelManagerPage.jsx` + `RatesTab.bug450.test.jsx` (BUG-450). Verify every §6 file of the 2026-09-22 handover has a line; add missing ones with "CR-385 M<n> IMPL 2026-09-2x".
- `control/registry.json` CR-385: `files[]` = complete actual list; `status_history` entries for M6, BUG-448, BUG-450, "P5 regression PASSED <date>", then final `CLOSED` quoting the owner's sign-off word verbatim; BUG-418 → "FIXED + QA-VERIFIED (Beta) via CR-385 M6 2026-09-22 — legacy path → FU-385-C"; BUG-448 → "FIXED + QA-VERIFIED via CR-385 P4.5 2026-09-22"; BUG-450 → "FIXED + QA-VERIFIED (mini-gate it.27) via CR-385 P4.5b 2026-09-22"; BUG-412 → "re-verified P5 <date> (D17)"; BUG-431/432/433(legacy)/443/444/446/449 → "DEFERRED-TO-FU-385-C" with the owner sentence. Keep the file's formatting: `json.dumps(indent=2, ensure_ascii=True)`, no trailing newline.
- `control/BUG_TRACKER.md`, `control/CR_REGISTRY.md` (CR-385 row → CLOSED + FU-385-C / FU-385-D rows), `control/CONTROL_DASHBOARD.md`, `control/OPEN_GAPS_REGISTER.md` (042 → CLOSED if your Departures recipe worked, else keep; 048 stays OPEN → FU-385-D; 049 TRIAGED stays), `PRD.md`, `control/SPRINT_STATUS.md` line: "CR-385 CLOSED <date> — Gate 5 closed; FU-385-C: <owner words>; FU-385-D: <owner words>".
- Master checklist mirror `frontend/public/cr385-master-checklist.html` rows M0-01…M7-04, X-01…X-15, R-01…R-08 ticked (mirror only; the batch/registry files are the record). This is a `public/` HTML edit, not `src` — still only after GO and only ticks.
- Code markers spot-check (R18): `grep -rn "CR-385" frontend/src --include=*.jsx --include=*.js -l | wc -l` and copy headers on `RoomTile.jsx` / `CheckInForm.jsx`.

### 5.8 Sign-off and close (plan note §8 steps 11–14)
Ask the owner for the sign-off in one message and record **verbatim, no paraphrase**:
- the CR-385 close word (e.g. "CR-385 closed")
- the FU-385-C sentence: "BUG-431/432/443/444/446/449, X-06 and legacy rounding stay DEFERRED-TO-FU-385-C" (already given 2026-09-23 — quote it again in the sign-off record)
- FU-385-D: "D88 stays; OG-PMS-048 stays OPEN pending FU-385-D" (given 2026-09-23)
- if ambiguous, ask once for clarification before touching the registry.
Then: `registry.json` CR-385 → `CLOSED` (quote) → Gate 5 closed → SPRINT_STATUS line → D90 in DESIGN_DECISIONS ("CR-385 CLOSED by owner word …") → SESSION_HANDOVER with self-assessment → "Save to GitHub" (docs + evidence + master-checklist ticks only; **`frontend/src` diff must be empty** unless a Phase 5.5 fix was owner-approved).

---

## 6. Required artifacts at close (all must exist)

| Artifact | Path |
|---|---|
| Session 0 guards | `evidence/CR-385/probes_2026_09_23_release/SESSION0_GUARDS.md` ✅ exists |
| Entry read-back | `evidence/CR-385/probes_2026_09_23_release/t0_entry_readback.json` |
| Session A/B/C testing_agent results | `test_reports/iteration_<n>.json` (one per session) |
| D17 re-verify | `evidence/CR-385/probes_2026_09_23_release/d17_reverify.json` |
| POS regression | `evidence/CR-385/probes_2026_09_23_release/session_c_pos_regression.json` |
| Exit read-back | `evidence/CR-385/probes_2026_09_23_release/t9_readback.json` |
| Probe report | `evidence/CR-385/probes_2026_09_23_release/PROBE_REPORT.md` (+ per-script JSON) |
| QA report | `test_reports/QA_REPORT_<date>_CR385_P5_ROLE4.md` |
| Registry / docs | registry.json · CR_REGISTRY · BUG_TRACKER · FILE_OWNERSHIP · OPEN_GAPS_REGISTER · CONTROL_DASHBOARD · SPRINT_STATUS · PRD · DESIGN_DECISIONS D90 |
| Session handover | `handover/SESSION_HANDOVER_<date>_CR385_P5_CLOSED.md` |

---

## 7. testing_agent brief template (fill per session; one call = one session)

```
original_problem_statement: CR-385 Front Desk (Beta) Phase 5 closure regression on preprod sandbox. Session <A|B|C> per handover §5.<1|2|3>. QA_TGK only, single login at top, ALL cleanup in finally. Never touch rooms r2/r3 (owner stays 174/155). Never confirm No-Show. Never click rt-inv-push-btn / rt-rr-push-btn / rt-bulk-btn. Business date = header fd-header-date, not the clock.
features_or_bugs_to_test: [row-by-row list from §5.x with data-testids and expected texts]
files_of_reference: [plans/CR-385_P5_PLAN_NOTE_2026_09_23.md §4; control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md L89–150; handover/CR-385_PHASE5_HANDOVER_2026_09_22.md §6 testids + §7 known-ignore]
required_credentials: QA_TGK from /app/memory/test_credentials.md (do not print)
testing_type: frontend only
agent_to_agent_context_note: login page is `/`, wait for `/loading` redirect (≤15 s); use domcontentloaded + selector waits (networkidle never settles); Arrivals lands on the first non-empty chip (order late/today/tomorrow/upcoming) → click fd-chip-arrivals-today; row actions: fd-row-<id>-<checkin|bill|extend|cancel|hk|modify|noshow>-btn (expansion drawer variant: fd-row-<id>-exp-…); payment method testids: booking-pay-<cash|card|upi>, checkin-pay-<cash|card|upi>, extend-pay-<cash|card|upi>; channel-manager tabs are index-based (tab-4 = Front Desk Rules); capture all POST/PUT bodies and report any of rate_per_night/room_price/amount_after_tax/new_room_price; on any failure still run cleanup.
mocked_api: none
```

---

## 8. Pitfalls (additions to the 2026-09-22 handover §9)

- **The `/app` git is NOT the origin repo.** `git log -1 -- <hotspot>` in `/app` shows the platform import hash (`78f4197`), not `642ccb8`. For Guard 3 clone origin (`git clone --filter=blob:none --single-branch -b 21implement https://github.com/Abhi-mygenie/core-pos-front-end- <tmp>`), run the log there, sha256-compare blobs to the workspace, delete the clone.
- **`memory/test_credentials.md` was empty in this workspace** — the memory sync from the repo does not carry credentials. Get them from the owner, write the file, never commit literals elsewhere.
- **D17 probe pack is mutating** — it was once mis-planned as read-only; the owner corrected it. Session A only.
- **API login for read-backs kicks a live QA_TGK browser session** (single-session accounts). Sequence: read-back → browser session → read-back. Never overlap.
- **Optional smoke rows M2-S11 / M3-S06 are the OWNER's rows**, skipped by the owner ("skip will check later"). They are not P5 work; do not re-file them as gaps.
- **`held_fallback` probe needs backend cooperation** (rate wipe). Without it write "skipped — no recipe"; D68 already proved it live on 2026-09-21.
- **registry.json formatting**: `indent=2`, `ensure_ascii=True`, no trailing newline — otherwise the diff is 4,000 lines and the owner's tracker flags it.
- **Do not create planning documents or new plan notes** — the plan note exists; append to §10 if the owner adds decisions, or write D90+ in DESIGN_DECISIONS.

---

## 9. Ready-to-paste agent prompt (owner gives this to the next agent)

```
You are the CR-385 Phase 5 (Closure) execution agent — AGENT_PROMPT_ALPHA v0.7 Role 11 with Role 4 QA discipline.
Boot: read /app/memory/handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md fully, then the files in its §2 in order.
State: Gate 6 CLOSED ("all smoke test passed"), EC-1/EC-3 met, OG-PMS-038 CLOSED, Session 0 guards PASS. EC-4: I will give you the QA_TGK credentials now — write them into /app/memory/test_credentials.md (§3 format) and never echo them. EC-5: "Phase 5 GO" has NOT been given yet.
Before GO you may only: write the credentials file, run the read-only entry read-back (t0_entry_readback.json), and report. No code, no sandbox mutation, no testing_agent browser session that books/pays/toggles.
After I write "Phase 5 GO": execute handover §5.1 → §5.8 exactly (Session A → B → C → probe pack → guards → QA report → registry closure → ask me for the sign-off words and record them verbatim). Rooms r2/r3 are mine — never touch. QA check-ins only r4/r5/r1. Cleanup in finally. Any FAIL → stop and intake; do not fix without "Phase 5.5 GO".
No feature code. frontend/src diff must stay empty. Hotspots byte-identical (642ccb8). Push only via Save to GitHub to origin/21implement.
End every session with a SESSION_HANDOVER including the self-assessment. Respond in English.
```

---

## 10. Self-assessment of this preparation session

- Registry synced: **YES** (`registry.json` CR-385 status_history has 5 entries dated 2026-09-23; CR_REGISTRY / CONTROL_DASHBOARD / OPEN_GAPS_REGISTER / PRD / DESIGN_DECISIONS D89 updated).
- Scope drift: **NONE** — zero changes in `frontend/src`; only docs, evidence (`SESSION0_GUARDS.md`, jest/build logs) and registry.
- Artifacts present: plan note (corrected 3×: A-5 d17 path, A-7 session split + r2 precondition, D17 mutating), Session 0 evidence, smoke Result block, D89 (+2 addenda).
- Open for the next agent: EC-4 credentials from owner → entry read-back → "Phase 5 GO" → §5.
- Credentials: none written anywhere in this session (file still header-only); no literal in any evidence file created today.
