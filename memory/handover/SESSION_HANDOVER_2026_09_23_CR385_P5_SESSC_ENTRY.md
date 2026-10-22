# SESSION HANDOVER — CR-385 Phase 5 · Session C ENTRY (for the Session C agent)
**Date:** 2026-09-23
**Written by:** P5 Session B closure agent (AGENT_PROMPT_ALPHA v0.7 Role 11 CLOSURE + Role 4 QA)
**For:** the next agent executing **Session C → probe pack → guards → QA report → registry closure → sign-off**
**Owner monitoring:** the owner will check every step of yours against this document and `handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md` §5.3–§5.8. Deviations must be declared, not silently absorbed.

---

## 0. Ten rules you cannot break (read twice)

1. **Zero code.** `frontend/src` diff vs origin `21implement` must stay **empty**. Phase 5 has no feature code. The only exception is a Phase 5.5 bug fix, and only after an intake + owner word **"Phase 5.5 GO"**. If Session C finds a FAIL → STOP, intake, ask. Do not fix.
2. **Hotspots byte-identical to `642ccb8`**: `order-entry/CollectPaymentPanel.jsx`, `api/transforms/orderTransform.js`, `api/services/pmsService.js`, `components/pms/PmsCheckoutDrawer.jsx`.
3. **Gate words are literal.** "Phase 5 GO" was given (2026-09-23, verbatim). The final close word is the owner's own phrase — quote it verbatim, never paraphrase, never infer.
4. **QA_TGK only** (`/app/memory/test_credentials.md` §QA_TGK). Single-session account: **one login per browser call**; API read-back and browser session must never overlap (API login kicks the browser session). Never echo credentials in chat, reports, scripts, JSON, or commits.
5. **r1 = owner stay #256 "coke" (order 1232674, `occupied_hk`) — UNTOUCHABLE.** Never check out, pay, extend, cancel, HK it. r2/r3 are currently free (`hk`) — use them only if r4/r5 are both busy with QA stays.
6. **Never confirm No-Show.** Never click `rt-inv-push-btn` / `rt-rr-push-btn` / `rt-bulk-btn` (channel-manager pushes).
7. **Business date = header `fd-header-date` / `meta.business_date`**, never the PC clock (sandbox date is 2026-09-23).
8. **Cleanup in `finally`** for every mutating browser call: settle QA orders/stays, cancel leftover QA bookings, rules → `allow_early_checkin=false`, `extend_rate_mode=calendar`, `auto_print_checkin_receipt=false`.
9. **One testing_agent call = one session.** Provide the full brief (§4 below). Read the returned `test_reports/iteration_<n>.json` and act on every item; do not declare PASS from your own code reading.
10. **Ask the owner "Are you off the sandbox?"** before the Session C browser call, and again before the probe pack. Wait for "yes".

---

## 1. Where Phase 5 stands (state at handover)

| Step | Handover §ref | Status | Evidence |
|---|---|---|---|
| Session 0 guards (6) | §5.0 | ✅ PASS 2026-09-23 | `evidence/CR-385/probes_2026_09_23_release/SESSION0_GUARDS.md`, `s0_guard5_jest.log`, `s0_guard6_build.log` |
| Entry read-back | §5.0 | ✅ | `t0_entry_readback.json` (+ `t0c_entry_p5cont_readback.json` re-entry) |
| D17 / BUG-412 re-verify (API, mutating) | §5.1 | ✅ PASS | `d17_reverify.json` (legs A/B/C, forbidden-key grep empty) |
| Session A′ (browser) | §5.1 | ✅ CLOSED | `test_reports/iteration_30/31/32.json`; `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSA_CLOSED.md`; rows 11/12/15/16/17/18/23/24/25/27/31/32 |
| Session B (browser) | §5.2 | ✅ CLOSED | `test_reports/iteration_33.json`; `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSB_CLOSED.md`; rows 11/21/23/24/27/28 |
| **Session C** (POS F&B + legacy + console + exit read-back) | §5.3 | ⏳ **YOU START HERE** | → `iteration_34.json`, `session_c_pos_regression.json`, `t9_readback.json` |
| Probe pack re-run | §5.4 | ⏳ | → `PROBE_REPORT.md` + per-script JSON |
| Guards repeat (6) | §5.5 | ⏳ | → recorded in QA report |
| QA report | §5.6 | ⏳ | → `test_reports/QA_REPORT_2026_09_23_CR385_P5_ROLE4.md` |
| Registry closure | §5.7 | ⏳ | registry.json · CR_REGISTRY · BUG_TRACKER · FILE_OWNERSHIP · OPEN_GAPS_REGISTER · CONTROL_DASHBOARD · SPRINT_STATUS · PRD · DESIGN_DECISIONS D90 · master-checklist ticks |
| Sign-off | §5.8 | ⏳ | owner's verbatim words |

**Sandbox now (confirmed by `test_reports/sessb_cleanup_result.json`):** `inhouse_p5=0`, `arrivals_p5=0` (row 269 cancelled), `toggle_allow_early_checkin=false`, `cal_radio=true` (Rate table). r1 #256 "coke" untouched. r4 (table 8525) went to `hk` after the Session B TAB checkout. 11 pre-existing pending bookings (ids 15…235) belong to the owner — never cancel them.

**Registry:** `control/registry.json` CR-385 `status_history` has entries for Session A′ and Session B closure. CR-385 `status` field still reads GATE_5B_QA_PASSED… — that field is only updated at final closure (§5.7).

---

## 2. Boot sequence (in this order)

1. Read this file fully.
2. Read `handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md` §5.3 → §5.8, §6, §7 (brief template), §8 (pitfalls).
3. Read `plans/CR-385_P5_PLAN_NOTE_2026_09_23.md` §4 (Session C), §6 (POS F&B regression), §7 (registry closure + 6 guards), §8 (closing sequence), §10b–§10d (owner verbatim decisions and read-back facts).
4. Read `handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESSB_CLOSED.md` §2 (testid discoveries) and `…SESSA_CLOSED.md`.
5. Confirm `/app/memory/test_credentials.md` §QA_TGK is populated (it is, as of this handover). If it is empty (memory re-sync wipes it) → ask the owner, write it, never echo.
6. Confirm services: `curl -s -o /dev/null -w "%{http_code}" $(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)/` → 200; frontend RUNNING under supervisor.
7. Run the entry read-back for this session (READ-ONLY, 3 GETs): `python3 /app/memory/evidence/CR-385/probes_2026_09_23_release/run_readback.py t0d_entry_sessc` → confirm in-house = only #256 r1; r2/r3/r4/r5 `hk`/`available`; settings `allow_early_checkin=false`, `extend_rate_mode=calendar`; `qa_rows_left=[]`. Any QA leftover → settle/cancel first, record it.
8. Ask the owner: **"Are you off the sandbox? May I start Session C?"** → wait for "yes".

---

## 3. Session C — exact recipe (handover §5.3, plan note §6; smoke refs M4-S04, M4-S07, M4-S08, M2-S12, M3-S10)

Matrix rows covered: **29** (POS F&B unchanged / D88 scope), **33** (0 console errors + unique testids). Also re-verifies **BUG-448** (see §3.5 — Session B left it "unconfirmed").

### 3.1 POS F&B regression on `/dashboard` (mutating: one dine-in order, settled by split)
1. Login at `/` (QA_TGK) → wait for `/loading` redirect (≤15 s) → `/dashboard`.
2. New dine-in order → add **one PRICED item** (grand total > ₹0; a ₹0 order never renders the Split tile — it.26 F-6). Place the order.
3. Open Collect Payment for that order → `[data-testid="collect-payment-panel"]` visible.
4. Assert on POS (outside `.frontdesk-bill`, so D88 must **not** apply):
   - `[data-testid="payment-split-btn"]` **visible** (D88 hides it only inside the Front Desk bill).
   - `[data-testid="checkout-room-booking-toggle"]`, `[data-testid="checkout-transferred-toggle"]`, `[data-testid="checkout-room-service-toggle"]` **visible** (they are hidden only under `.frontdesk-bill`).
   - `[data-testid="bill-grand-total"]` shows the order total (> ₹0).
5. Split flow: click `payment-split-btn` → per-method rows appear (`[data-testid^="split-method-label-"]`, `[data-testid^="split-amount-"]` — discover the exact method suffixes at runtime; do not assume casing) → Cash **₹100** + Card **remainder** → assert Cash + Card == `bill-grand-total` → `[data-testid="complete-payment-btn"]` → success toast / receipt state → order leaves the open list.
   - `[data-testid="split-bill-btn"]` (Scissors "Split Bill" = split by items) is a different feature; do **not** confuse it with the Split payment tile. Presence only, no click required.
6. Capture the POST body of the collect-bill call; grep for `rate_per_night|room_price|amount_after_tax|new_room_price` → must be empty (POS body never carries them anyway; record the result).

### 3.2 Legacy pages load unchanged (read-only — look, close, never pay)
- `/pms/new-booking`, `/pms/check-in` open as before (M2-S12; legacy misprice = BUG-431/432 → FU-385-C — do not use them).
- `/pms/departures` → open the checkout drawer on any remaining stay if one exists (**look only, close without paying**; legacy TAB disabled until name+phone = BUG-449 → never use). If no stay is available besides r1 #256 → **do not open r1's drawer**; write "no non-owner stay available — drawer look skipped, page loads PASS".
- `/pms/front-desk` (old page) still renders.

### 3.3 Console sweep (row 33 / X-10)
- Viewports **1920×800** and **1366×768**.
- `/pms/front-desk-v2` all 4 tabs (Arrivals / In-House / Departures / Rooms) + `/dashboard`.
- 0 console errors; **ignore** socket / firebase / messaging lines (known-ignore list: 2026-09-22 handover §7).
- Unique `data-testid` on each page (no duplicates in the DOM snapshot).

### 3.4 Cleanup (in `finally`)
- Settle the QA dine-in order (already settled by the split; if the split failed, settle Cash full).
- Cancel any QA booking created by mistake (none should be).
- Rules stay at defaults (Session C does not touch them; verify anyway).

### 3.5 BUG-448 re-verify — **read the semantics correctly**
Session B (it.33) completed the TAB checkout but the automation did not capture the class before the payment fired, so BUG-448 is marked "unconfirmed". **The Session B handover §2 wording "visible only when prefilled" is wrong — correct semantics from code:**

- `FolioCheckoutPanel.jsx` L143: `[data-testid="bill-right"]` gets class **`fd-bill-tab-prefilled`** when `tabPrefilled(billCustomer(order,row))` → i.e. host prefilled a **non-empty name AND a 10-digit phone** (OD-385-21).
- `frontdesk.css` L31: `.frontdesk-bill.fd-bill-tab-prefilled [data-testid="tab-customer-section"] { display: none; }` → **when prefilled, the TAB customer block is HIDDEN** (no form; the guest's name/phone already known). When **not** prefilled, no class → block visible for manual entry.
- Session B screenshot `test_reports/s9_tab_no_form.jpeg` (TAB tile selected, no customer form) is therefore **consistent with BUG-448 working** for a guest with name + 10-digit phone.

**Option to close it in Session C (recommended, mutating, cheap):** since Session C is the last browser session, add a short Front-Desk leg *before* the POS leg in the same testing_agent call: New Booking (Suite, today→tomorrow, guest name + 10-digit phone) → check-in **r4** → `fd-row-<id>-bill-btn` → click `payment-TAB-btn` → **assert `[data-testid="bill-right"]` has class `fd-bill-tab-prefilled` AND `[data-testid="tab-customer-section"]` is hidden** → then `complete-payment-btn` → toast "Checked out · Room r4" → row gone. Cleanup as in Session B. If you do this, add rows 27/28 to the coverage list and state "BUG-448 CONFIRMED (Session C leg)". If the owner prefers not to add a stay, record BUG-448 as "FIXED (P4.5 it.25/26 QA-VERIFIED) — P5 re-check partial (it.33 checkout OK, class not captured)" in the QA report — it is **not** a FAIL.

### 3.6 Outputs of Session C
- `test_reports/iteration_34.json` (testing_agent result).
- `evidence/CR-385/probes_2026_09_23_release/session_c_pos_regression.json` — summarise: order id, grand total, split amounts, split-tile visible=true, 3 toggles visible=true, console error counts per page/viewport, legacy pages status, BUG-448 result.
- **Exit read-back** after the browser call: `python3 …/run_readback.py t9` → `t9_readback.json`. Expected: in-house = only #256 r1 (owner); r2/r3/r4/r5 `hk`/`available`; `qa_rows_left=[]`; settings `allow_early_checkin=false`, `extend_rate_mode=calendar` (`auto_print_checkin_receipt` may be absent from settings-list = BQ-385-30 residual, profile holds false — not a FAIL).
- `handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESSC_CLOSED.md` with the self-assessment header (registry synced? scope drift? outputs complete? credentials scrubbed?) + a `registry.json` CR-385 `status_history` entry "Session C CLOSED 2026-09-23 — …".

---

## 4. testing_agent brief for Session C (fill and send as ONE call)

```
original_problem_statement: CR-385 Front Desk (Beta) Phase 5 closure regression on preprod sandbox (RID 69). Session C per handover §5.3: POS F&B regression + legacy pages + console sweep (+ optional BUG-448 TAB prefill leg). QA_TGK only, single login at top, ALL cleanup in finally. Never touch room r1 (owner stay #256 "coke", order 1232674). Never confirm No-Show. Never click rt-inv-push-btn / rt-rr-push-btn / rt-bulk-btn. Business date = header fd-header-date, not the clock. NO code changes are allowed in this phase — report only.
features_or_bugs_to_test:
  C0 Login QA_TGK at / → /loading → /dashboard reachable.
  [optional C0b BUG-448 leg — /pms/front-desk-v2: New Booking Suite today→tomorrow with guest name + 10-digit phone → check-in r4 (native <select>, select_option) → fd-row-<id>-bill-btn → payment-TAB-btn → ASSERT bill-right has class fd-bill-tab-prefilled AND tab-customer-section is hidden (display:none) → complete-payment-btn → toast "Checked out · Room r4" → row gone. Capture bill-payment POST body; forbidden keys absent.]
  C1 /dashboard dine-in order with ONE PRICED item (grand total > 0) → place → Collect Payment → collect-payment-panel visible.
  C2 ASSERT payment-split-btn VISIBLE; checkout-room-booking-toggle, checkout-transferred-toggle, checkout-room-service-toggle VISIBLE; bill-grand-total > 0.
  C3 Split: click payment-split-btn → discover split-amount-* inputs → Cash 100 + Card remainder → sum == bill-grand-total → complete-payment-btn → success toast/receipt → order gone from open list. Capture POST body; grep rate_per_night|room_price|amount_after_tax|new_room_price → empty.
  C4 Legacy: /pms/new-booking, /pms/check-in load; /pms/departures loads (open checkout drawer ONLY on a non-owner stay if one exists, close without paying; never r1 #256); /pms/front-desk (old) renders.
  C5 Console sweep at 1920×800 and 1366×768: /pms/front-desk-v2 (all 4 tabs) + /dashboard → 0 console errors (ignore socket/firebase/messaging); data-testids unique per page.
  C6 Cleanup in finally: settle any open QA order (Cash full) / QA stay (TAB or Cash via Front Desk Bill), cancel QA bookings, rules default. Report inhouse_p5, arrivals_p5, toggle, rate-mode state.
files_of_reference: handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md §5.3 + §7; plans/CR-385_P5_PLAN_NOTE_2026_09_23.md §6; control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md L100, L126, L140–L144 (M2-S12, M3-S10, M4-S04/S07/S08); handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESSB_CLOSED.md §2 (testids); frontend/src/components/order-entry/CollectPaymentPanel.jsx L1253 collect-payment-panel, L1811/1866/1910 toggles, L2670 bill-grand-total, L2740 payment-split-btn, L2851/2897 split-method-label-*/split-amount-*, L3315 complete-payment-btn; frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx L143 fd-bill-tab-prefilled; frontend/src/components/pms/frontdesk/frontdesk.css L31 (prefilled → tab-customer-section hidden), L33 (D88 Split hidden only in .frontdesk-bill).
required_credentials: QA_TGK from /app/memory/test_credentials.md (read by pattern; do not print).
testing_type: frontend only
agent_to_agent_context_note: single-session account — exactly one login; use domcontentloaded + selector waits (networkidle never settles); Arrivals lands on the first non-empty chip → click fd-chip-arrivals-today; room tiles: click fd-room-tile-<table_id> then wait fd-room-detail-<table_id>; TAB tile testid is payment-TAB-btn (dynamic type id); payment tiles on POS are payment-<methodId>-btn; previous sessions: iteration_30–33 (Session A′/B) — do not repeat their rows except the optional BUG-448 leg; write results to /app/test_reports/iteration_34.json; on any failure still run cleanup and report the sandbox state.
prev_test_files_and_folder: /app/test_reports/iteration_30.json … iteration_33.json, /app/tests/cr385_phase5_sessionb_script.py (reusable login/booking/check-in/cleanup helpers), /app/tests/cr385_sessb_cleanup.py
mocked_api: none
```

---

## 5. After Session C — probe pack re-run (§5.4; API, QA_TGK, sandbox quiet, owner off)

Run from `/app/memory/evidence/CR-385/`, outputs into `probes_2026_09_23_release/`:

| Script | Verifies | Rows |
|---|---|---|
| `probes_2026_09_20_gate4/run_gate4.py` | booking/check-in/extend wire + `charge{}` read-back | 11, 18, 21 |
| `probes_2026_09_20_n7n8/run_n7n8.py` | N7 early check-in 422 when `allow_early_checkin=false`; N8 `extend_rate_mode` | 16, 32 |
| `probes_2026_09_20_n11/run_n11.py` + `run_d14.py` | per-night GST slab; collect-now echoed | 20 |
| `probes_2026_09_20_d1516/run_d1516.py` | shorten re-price D15; move keeps price D16 | 20 |
| `probes_2026_09_21_held_fallback/` | needs backend rate wipe (D68) → if no recipe write **"skipped — no recipe"** | 20 |
| D17 | already done in Session A → `d17_reverify.json` (do not re-run) | — |

**⚠ Credential pitfall (verified 2026-09-23):** these scripts still contain a **literal credential** from before the scrub: `probes_2026_09_20_gate4/run_gate4.py`, `…/build3/run_gate4.py`, `probes_2026_09_20_d1516/run_d1516.py`, `probes_2026_09_20_n11/run_n11.py`, `run_d14.py`, `probes_2026_09_20_n7n8/run_n7n8.py`, `probes_2026_09_20_final/run_*.py`. Before running: **copy** each runner into `probes_2026_09_23_release/` and replace the literal with the read-by-pattern block from `run_readback.py` (`sec = open('/app/memory/test_credentials.md').read().split('## QA_TGK')[1] …`). Do not edit the originals (evidence), do not print the values, do not commit new literals. The historical-literal scrub itself is **only on the owner's word** (plan note Q-3) — not P5 work.

Each script settles/cancels what it creates; verify with a read-back after the pack. Write `PROBE_REPORT.md`: per script → endpoint · HTTP · key figures · **forbidden-key grep over every captured request body** (`rate_per_night|room_price|amount_after_tax|new_room_price`) → must be empty. Sequence: probe pack → read-back → never overlap with a browser session.

---

## 6. Final guards (§5.5 / plan note §7) — all six must PASS, record actual outputs

1. Money grep → exactly 2 lines, both `frontDeskService.js` (~L70 comment, ~L101 `fd.append('balance_payment', '0')`).
2. Room-type grep → 0 lines.
3. Hotspots `git log -1` = `642ccb8` — **on a fresh origin clone** (`git clone --filter=blob:none --single-branch -b 21implement https://github.com/Abhi-mygenie/core-pos-front-end- /tmp/pos-origin`), then sha256-compare the 4 workspace files to the clone; delete the clone. The `/app` git is the platform repo — its hashes are meaningless for this guard.
4. `sha256sum frontend/public/cr385-frontdesk-mockup.html` → starts `12fd0f4a343fc89d`.
5. `cd /app/frontend && CI=true yarn test --watchAll=false --testPathPattern "cr385|bug450"` → **128 passed, 0 failed** (run in background, ~2 min).
6. `cd /app/frontend && yarn build` (plain, no `CI=true`) → exit 0 ("Compiled with warnings" is expected — pre-existing eslint hook warnings).
Also: `diff -rq /app/frontend/src <clone>/frontend/src` → empty (scope-drift proof for the self-assessment).

---

## 7. QA report (§5.6) — `test_reports/QA_REPORT_2026_09_23_CR385_P5_ROLE4.md`

Per matrix row 1…34: PASS / FAIL / N/A / SKIP with evidence path + iteration file + severity. Must include:
- Session 0 guards → Session A′ (it.30/31/32) → Session B (it.33) → Session C (it.34) row tables (copy the MINOR findings honestly: it.31 tooltip/paid-badge timing, it.32 geometry selector, it.33 S4 assertion/S7 timing/S9 BUG-448 partial — all "not a functional bug").
- D17 re-verify summary; probe pack summary; 6 guards with outputs; entry (`t0_entry_readback.json`) vs exit (`t9_readback.json`) comparison (r1 #256 untouched, r2/r3/r4/r5 restored, settings default, `qa_rows_left=[]`); console sweep; known-ignore list applied.
- Owner-skipped optional smoke rows M2-S11 / M3-S06 → "skipped by owner — not P5 work". M4-S06 double-charge → "SKIP — stay departed, per handover §5.2".
- **Any FAIL → STOP**: intake `change_requests/BUG-<n>_*_INTAKE.md` + BUG_TRACKER + registry → owner routing → "Phase 5.5 GO" → fix → re-test that row → resume. No sign-off with an open FAIL.

---

## 8. Registry closure (§5.7 / plan note §7) — tick every item

- `control/FILE_OWNERSHIP.md`: add the owed block (plan note §7 "FILE_OWNERSHIP entries owed": `FolioCheckoutPanel.jsx` M6 + BUG-448, `frontdesk.css` D88, `tests/cr385/phase2/3/4.cr385.test.jsx`, `hideSectionRows.cr385.test.js`, `RatesTab.jsx`, `ChannelManagerPage.jsx`, `RatesTab.bug450.test.jsx`). Verify every §6 file of the 2026-09-22 handover has a line.
- `control/registry.json` CR-385: `files[]` complete; `status_history` entries for M6, BUG-448, BUG-450, "Session C CLOSED", "P5 regression PASSED 2026-09-23", then **`CLOSED` quoting the owner's verbatim word**. BUG-418 → "FIXED + QA-VERIFIED (Beta) via CR-385 M6 2026-09-22 — legacy path → FU-385-C"; BUG-448 → "FIXED + QA-VERIFIED via CR-385 P4.5 2026-09-22 (+ P5 re-check result)"; BUG-450 → "FIXED + QA-VERIFIED (mini-gate it.27) via CR-385 P4.5b 2026-09-22"; BUG-412 → "re-verified P5 2026-09-23 (D17)"; BUG-431/432/433(legacy)/443/444/446/449 → "DEFERRED-TO-FU-385-C" with the owner sentence. **Format: `json.dumps(indent=2, ensure_ascii=True)`, no trailing newline** — anything else produces a 4,000-line diff.
- `control/BUG_TRACKER.md`, `control/CR_REGISTRY.md` (CR-385 → CLOSED; FU-385-C / FU-385-D rows), `control/CONTROL_DASHBOARD.md`, `control/OPEN_GAPS_REGISTER.md` (OG-PMS-042 → CLOSED only if the Departures drawer recipe worked, else keep; OG-PMS-048 stays OPEN → FU-385-D; OG-PMS-049 TRIAGED stays; 043/046/047 are NOTEs — do not re-file), `PRD.md`, `control/SPRINT_STATUS.md` line "CR-385 CLOSED <date> — Gate 5 closed; FU-385-C: <owner words>; FU-385-D: <owner words>", `plans/CR-385_DESIGN_DECISIONS.md` D90 ("CR-385 CLOSED by owner word …").
- Master checklist mirror `frontend/public/cr385-master-checklist.html` rows M0-01…M7-04, X-01…X-15, R-01…R-08 ticked — `public/` only, ticks only, no other edit.
- Code-marker spot-check (R18): `grep -rln "CR-385" frontend/src --include=*.jsx --include=*.js | wc -l`; copy headers of `RoomTile.jsx` / `CheckInForm.jsx` into the report.

---

## 9. Sign-off (§5.8 / plan note §8 steps 11–14)

Ask the owner in **one message** and record **verbatim, no paraphrase**:
1. The CR-385 close word (e.g. "CR-385 closed" — whatever the owner actually types).
2. FU-385-C sentence (already given 2026-09-23, quote again): "separate CR after CR-385 closes. Gate 5 closes without it; BUG-431/432/443/444/446/449, X-06 and legacy rounding stay DEFERRED-TO-FU-385-C with that sentence in the sign-off."
3. FU-385-D (given 2026-09-23): "separate follow-up CR. D88 stays; `frontdesk.css` + `hideSectionRows` guard unchanged; OG-PMS-048 stays OPEN pending FU-385-D."
4. OG-PMS-038: **no exception sentence needed** — CLOSED by smoke M2-S08 PASS (owner: "1 pass as sign off this was checked in smoke").
If ambiguous → ask once before touching the registry. Then: registry `CLOSED` → SPRINT_STATUS → D90 → `SESSION_HANDOVER_<date>_CR385_P5_CLOSED.md` with self-assessment → "Save to GitHub" (docs + evidence + master-checklist ticks only; `frontend/src` diff empty).

---

## 10. Testid / behaviour discoveries carried forward (A′ + B)

| Item | Fact |
|---|---|
| TAB / Credit tile | `payment-TAB-btn` (dynamic payment type id; not `payment-credit-btn`) |
| BUG-448 prefill | class `fd-bill-tab-prefilled` on `[data-testid="bill-right"]`; **prefilled ⇒ `tab-customer-section` hidden** (see §3.5) |
| Room tile | click `fd-room-tile-<table_id>` → wait `fd-room-detail-<table_id>` → then actions; r4 = table 8525 |
| Check-in room select | native `<select>` → Playwright `select_option(label=…)` |
| Extend | `extend-bill-balance` shows `balance_due`; `extend-done-btn` closes; `extend-delta` text "Shorten to {date} (−N night)" |
| Geometry selector | `.frontdesk-bill` is **the same element** as `[data-testid="bill-right"]` (not a descendant) — it.32 MINOR was a selector mistake |
| HK clean button | tile status may lag after an HK request from the In-House row — re-open the tile / wait before asserting (it.33 S7 timing) |
| Login | `/` → `/loading` → app; ≤15 s; `domcontentloaded` + selector waits |
| Arrivals | lands on first non-empty chip → click `fd-chip-arrivals-today` |
| Read-back script | `evidence/CR-385/probes_2026_09_23_release/run_readback.py <name>` (3 GETs, reads credentials by pattern) |
| Balance math | Session B: 3-night ₹74,340 → −₹500 collect-now → 2-night ₹73,840; SGST/CGST two lines |

---

## 11. What the owner will check you against (monitoring checklist)

- [ ] You asked "off the sandbox?" before each mutating run and waited for "yes".
- [ ] Exactly one testing_agent call for Session C; `iteration_34.json` exists and was read.
- [ ] `session_c_pos_regression.json` + `t9_readback.json` written under `probes_2026_09_23_release/`.
- [ ] Split tile + 3 toggles proven **visible on POS** (D88 scope intact) with a priced order and a real Cash+Card split.
- [ ] Console sweep at both viewports, both pages, with the known-ignore list stated.
- [ ] BUG-448 handled with the correct semantics (prefilled ⇒ hidden block), result stated explicitly.
- [ ] Probe pack: copies re-pointed to the credentials file; no literal credential added anywhere; `PROBE_REPORT.md` with forbidden-key grep empty; held_fallback "skipped — no recipe" if applicable.
- [ ] All 6 guards with actual outputs; hotspot guard done on an origin clone; `frontend/src` diff empty.
- [ ] QA report per matrix row 1…34, honest MINOR findings carried, no FAIL hidden.
- [ ] Registry closure items all ticked; registry.json formatting preserved; BUG statuses updated exactly as worded.
- [ ] Owner's sign-off words quoted verbatim; FU-385-C / FU-385-D sentences present; OG-PMS-038 no exception sentence.
- [ ] `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSC_CLOSED.md` (and later `…P5_CLOSED.md`) with the 4-line self-assessment header.
- [ ] Zero edits in `frontend/src`; only `public/cr385-master-checklist.html` ticks after sign-off.
- [ ] Responded in English; never echoed credentials.

---

## 12. Files of reference (absolute)

- `/app/memory/handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md` — master execution handover (§5.3–§5.8, §6–§9)
- `/app/memory/plans/CR-385_P5_PLAN_NOTE_2026_09_23.md` — plan note (§4, §6, §7, §8, §10b–d)
- `/app/memory/handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESSA_CLOSED.md`, `…SESSB_CLOSED.md`
- `/app/memory/control/registry.json` (CR-385 item ~L25176; `status_history` ~L25660+)
- `/app/memory/control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md` (M2-S12 L100, M3-S10 L126, M4-S04/S07/S08 L140–144)
- `/app/memory/evidence/CR-385/probes_2026_09_23_release/` (guards, read-backs, D17, `run_readback.py`)
- `/app/test_reports/iteration_30…33.json`, `sessb_cleanup_result.json`, `session_a_final_cleanup.json`
- `/app/tests/cr385_phase5_sessionb_script.py`, `/app/tests/cr385_sessb_cleanup.py` (reusable helpers)
- `/app/memory/test_credentials.md` (§QA_TGK — never echo)
- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx` (hotspot — READ ONLY)
- `/app/frontend/src/components/pms/frontdesk/FolioCheckoutPanel.jsx`, `frontdesk.css` (READ ONLY)
