# SESSION HANDOVER — CR-385 Phase 5 · §5.6 ENTRY (QA report → registry closure → sign-off)
**Date written:** 2026-09-24 (sandbox business_date 2026-09-24)
**Written by:** P5 execution agent after §5.4 probe pack + §5.5 final guards (AGENT_PROMPT_ALPHA v0.7 Role 11 CLOSURE + Role 4 QA)
**For:** the agent who starts at **§5.6 QA report**, then §5.7 registry closure, then §5.8 sign-off
**Language:** owner communicates in English — respond in English only

---

## SELF-ASSESSMENT (mandatory header)

| Dimension | Score | Notes |
|---|:---:|---|
| **Registry synced?** | ✅ | `control/registry.json` CR-385 `status_history` has entries "Session C CLOSED 2026-09-23", "§5.4 probe pack re-run DONE" (2026-09-24), "§5.5 FINAL GUARDS 6/6 PASS" (2026-09-24); JSON validated |
| **Scope drift?** | ✅ None | Zero edits in `frontend/src` (git status clean); `diff -rq` vs fresh origin clone = 0; all 4 hotspot blob sha256 == Session 0 record |
| **Outputs complete?** | ✅ | `PROBE_REPORT.md`, `FINAL_GUARDS.md`, 5 runners + `_probe_common.py`, 5 logs, ~100 raw response JSONs, `t0e_entry_probepack_readback.json`, `t9_exit_probepack_readback.json`, jest + build logs, PRD.md, this handover |
| **Credentials scrubbed?** | ✅ | QA_TGK only in `/app/memory/test_credentials.md`; scripts read by pattern; the 6 saved `/v1/profile` responses had the account email scrubbed to `<QA_TGK email scrubbed>`; password never written anywhere |

---

## 0. Where Phase 5 stands — one-line status for the owner (STEP -1)

> "Phase 5: Sessions A′/B/C PASS (it.30–34), probe pack 5/5 PASS + held_fallback skipped-no-recipe, final guards 6/6 PASS, zero code changes, sandbox clean. No FAIL anywhere → Phase 5.5 not triggered. Next: §5.6 QA report → §5.7 registry closure → §5.8 your sign-off word."

---

## 1. YOUR ROLE AND THE RULES (unchanged — re-stated in full so nothing is inferred)

- **Role:** AGENT_PROMPT_ALPHA v0.7 **Role 11 CLOSURE** (`control/AGENT_PROMPT_ALPHA.md` L1281) for the paperwork + **Role 4 QA** (L714) independence for the report. You are **not** an Implementation agent. **Phase 5 has no feature code.** The only code you may ever touch is a Phase 5.5 bug fix, and only after intake + the owner's literal words **"Phase 5.5 GO"**. No P5 row FAILed → you will not touch code.
- **`frontend/src` diff must stay EMPTY.** Guard: `cd /app && git status --short frontend/src | wc -l` → `0`. Check before every "Save to GitHub".
- **Hotspots byte-identical forever in this CR:** `components/order-entry/CollectPaymentPanel.jsx`, `api/transforms/orderTransform.js`, `api/services/pmsService.js`, `components/pms/PmsCheckoutDrawer.jsx`, legacy `pages/pms/NewBookingPage.jsx` / `CheckInPage.jsx` / `GuestFolioPage.jsx`, `OrderEntry.jsx`, `DashboardPage.jsx`, `LoadingPage.jsx`, shared round-off helper. **Reference is now the 4 blob hashes, not commit `642ccb8` (see §3.4 — origin history was re-imported).**
- **Frozen money rules:** D50/G-02 (FE never computes or submits `rate_per_night`, `room_price`, `amount_after_tax`, `order_amount`, `new_room_price`) · D85 (M5 row balance = FE sum + shared round-off, temporary) · D87 (M6 checkout body = unchanged POS `collectBillExisting` + `room_gst_tax` passthrough) · D88 (Split hidden in Front Desk Bill by `.frontdesk-bill` CSS → FU-385-D).
- **Gate words are literal, never inferred:** "Phase 5 GO" (received 2026-09-23, plan note §10b) · "Phase 5.5 GO" (only if a row FAILs — none did) · **final sign-off word = the owner's own phrase, quoted verbatim** (e.g. "CR-385 closed"). Your summary sentence never substitutes for the owner's word. If ambiguous, ask once.
- **Branch / push:** `origin/21implement` ONLY, via the platform **"Save to GitHub"** button. Never `git push`, never another branch, never force. Push content = docs + evidence + master-checklist ticks only.
- **Sandbox (preprod RID 69 `sandbox-pms`):** business date = API `meta.business_date` / header `fd-header-date`, never the PC clock. **Current state (t9_exit_probepack 2026-09-24): in-house = only #256 r1 "coke" (order 1232674) = OWNER'S LIVE STAY — NEVER check out / pay / extend / cancel / touch. r2/r3/r4/r5 all `hk`. `departures_today=1` = that r1 stay — leave it.** r2 (8526) / r3 (8524) are the owner's rooms by rule even when empty. QA rooms = r4 (8525) / r5 (8527) only (r1 8528 is occupied by the owner now). Never confirm No-Show. Settings must end `allow_early_checkin=false`, `extend_rate_mode=calendar`, `auto_print_checkin_receipt=false` (they do now).
- **§5.6–§5.8 need NO sandbox mutation.** You should make zero mutating API calls and zero testing_agent browser sessions. Read-only GETs (settings-list, local-reservations, room-status-board) are allowed if you want a fresh read-back for the report — use `probes_2026_09_23_release/run_readback.py <name>` (3 GETs, credential-by-pattern). Do not overlap an API login with a live QA_TGK browser (single-session account) — irrelevant now unless the owner is testing.
- **Credentials:** `/app/memory/test_credentials.md` has `## QA_TGK` **today**. It is wiped on every memory re-sync from the repo (happened 3× in P5). If it is missing when you boot, ask the owner for QA_TGK again (never guess, never paste into files other than that one). Never echo values in chat, reports, scripts, evidence JSON, or commit messages. OWNER_TGK is never used by agents.
- **Known-ignore list (2026-09-22 handover §7) — do NOT re-file any of these as findings:** OG-PMS-043 `fd-header-date` "—" before hydrate · BQ-385-23 "SR ●" on every modified row · BQ-385-25 occupancy % excludes overdue · BQ-385-26 empty booking → red error from a 200 "skipped" · ₹0 rate cards for unpriced type/plan · Rates & Restrictions labels show room **code** until Room Mapping tab opened · balance cell "…" for a few seconds after check-in / Bill open (OG-PMS-047, D85) · POS Split tile absent on a ₹0 order (it.26 F-6) · console lines from socket / firebase messaging · hard reload of a deep link passes through `/loading` · OG-PMS-046 new Today booking visible only after clicking the Today chip (D70) · legacy Departures TAB disabled until name+phone typed (BUG-449 → Cash) · room discount greyed "needs BQ-385-07" · React key warnings in legacy pages outside CR-385.
- **Optional smoke rows M2-S11 / M3-S06 are the OWNER's rows** ("skip will check later") — not P5 work, not gaps.
- **Do not create new plan notes or planning documents.** Append to plan note §10 if the owner adds a decision; new decisions go to `plans/CR-385_DESIGN_DECISIONS.md` as **D90** (the closure decision) — D89 is the last one written.
- **`registry.json` formatting:** edit with `search_replace` on the exact text, or `json.dumps(indent=2, ensure_ascii=True)`, no trailing newline. Any other dump → 4,000-line diff → owner's tracker flags it. Validate with `python3 -c "import json;json.load(open('/app/memory/control/registry.json'))"` after every edit.
- **Every session ends with a SESSION_HANDOVER** (`handover/SESSION_HANDOVER_<date>_CR385_P5_<state>.md`) with the self-assessment table (registry synced? scope drift? outputs complete? credentials scrubbed?).
- **Testing-agent rule (if you ever need one, you shouldn't):** keep the brief minimal and single-purpose — two wide briefs timed out in Session C; the narrow one passed.

---

## 2. BOOT SEQUENCE (≈20 min) — read in this order, do not skip

```
1.  handover/SESSION_HANDOVER_2026_09_24_CR385_P5_SEC56_ENTRY.md          ← this file
2.  handover/CR-385_PHASE5_EXECUTION_HANDOVER_2026_09_23.md              ← §1 rules, §5.6 / §5.7 / §5.8 exact text, §6 artifact table, §8 pitfalls, §9 agent prompt
3.  control/AGENT_PROMPT_ALPHA.md  STEP -1 (L255), STEP -1.5 (L337), ROLE 4 (L714), ROLE 11 (L1281), self-assessment rule
4.  plans/CR-385_P5_PLAN_NOTE_2026_09_23.md  §3 (34-row plan), §5 (artifacts), §7 (registry closure checklist + FILE_OWNERSHIP owed block, verbatim), §8 (closing sequence steps 10–14), §10/10b/10c/10d (owner words verbatim, Phase 5 GO record, Session A records)
5.  plans/CR-385_IMPLEMENTATION_PLAN.md §6 (the 34-row matrix — your report's row list) + §7 (registry checklist)
6.  handover/CR-385_PHASE5_HANDOVER_2026_09_22.md §6 (code map/testids), §7 (known-ignore), §8, §9 (pitfalls)
7.  handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESSA_CLOSED.md         ← Session A′ rows + minors (it.30/31/32)
8.  handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESSB_CLOSED.md         ← Session B rows + minors (it.33)
9.  handover/SESSION_HANDOVER_2026_09_23_CR385_P5_SESSC_CLOSED.md         ← Session C rows + notes (it.34)
10. evidence/CR-385/probes_2026_09_23_release/PROBE_REPORT.md            ← §5.4 result (this session)
11. evidence/CR-385/probes_2026_09_23_release/FINAL_GUARDS.md            ← §5.5 result (this session) + the 642ccb8 note
12. evidence/CR-385/probes_2026_09_23_release/SESSION0_GUARDS.md         ← Session 0 baseline (2026-09-23)
13. evidence/CR-385/probes_2026_09_23_release/d17_reverify.json          ← D17/BUG-412 legs A/B/C ALL_PASS (Session A)
14. test_reports/iteration_34.json (Session C) · memory/test_reports/iteration_30_CR385_P5_sessionA_rerun_2026_09_23.json
15. test_reports/QA_REPORT_2026_09_22_CR385_P3_ROLE4.md + P2 + P1_5 ROLE4 reports  ← the Role 4 report house style to mirror
16. control/OPEN_GAPS_REGISTER.md (OG-PMS-020…049), control/BUG_TRACKER.md (BUG-412/418/431/432/433/443/444/446/448/449/450), control/FILE_OWNERSHIP.md (CR-385 lines), control/CR_REGISTRY.md, control/CONTROL_DASHBOARD.md, control/SPRINT_STATUS.md, plans/CR-385_DESIGN_DECISIONS.md D50/D68/D85–D89
17. memory/test_credentials.md ← confirm `## QA_TGK` exists (only needed if you do a read-back)
```

Environment check (STEP -1.5, all read-only): `curl -s -o /dev/null -w "%{http_code}" $(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d= -f2)/` → 200 · `sudo supervisorctl status` → frontend RUNNING · `cd /app && git status --short frontend/src | wc -l` → 0. (jest/build already recorded in FINAL_GUARDS.md — no need to re-run unless you change nothing and want fresh timestamps.)

---

## 3. WHAT HAS HAPPENED IN PHASE 5 — complete record (this is what you summarise for the owner, then cite in the QA report)

### 3.0 Entry conditions & Session 0 (2026-09-23)
- EC-1 Gate 6 owner smoke CLOSED — owner word **"all smoke test passed"**; M2-S08: "1 pass as sign off this was checked in smoke"; M2-S11 + M3-S06: "skip will check later". EC-3 OG-PMS-049 quarantine approved. EC-4 QA_TGK rotated + credentials handed directly to agents (re-supplied 3× after memory wipes). EC-5 **"Phase 5 GO"** received 2026-09-23 (plan note §10b).
- Session 0 guards 1–6 PASS (`SESSION0_GUARDS.md`); origin `21implement` HEAD then = `72037e7`, hotspots `642ccb8`.
- OG-PMS-038 (paid upgrade) CLOSED by M2-S08. FU-385-C / FU-385-D confirmed as separate CRs (owner sentences in §7 below).

### 3.1 Session A′ — CLOSED (it.30 / it.31 / it.32, D17 re-verify) — `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSA_CLOSED.md`
- it.30: CORS blocker (environment), resolved → re-run. it.31: A0–A4 PASS, A5 partial. it.32 (focused A5): 5/6 PASS, 1 MINOR selector-geometry (not a bug).
- **Rows PASS:** 11, 12, 15, 16 (DISABLED gate verified), 17 (1366×768 `checkin-bill` sh=ch=408), 18, 23 ("PAID SO FAR ₹1,000"), 24 (toggle cycle ON→save→OFF→save→reload OFF, BQ-385-30 read-back), 25 (HK badge), 27 (D88 all 4 absent/hidden in Bill), 31 (Rate-table radio unchanged), 32 (calendar confirmed by read-back). Row 10 = N/A (OG-PMS-038 closed by smoke).
- **D17 / BUG-412 re-verify:** `d17_reverify.json` legs A (no advance + ₹500 Card at check-in → 500), B (₹1,000 booking + ₹0), C (₹1,000 + ₹500 UPI → cumulative 1,500) — **ALL_PASS: true**; forbidden-key hits: none.
- MINOR (non-blocking, `retest_needed:false`): A5(a) `.frontdesk-bill` not a DOM child of `bill-right` (selector only); `checkin-early-tooltip` not renderable in headless hover; `fd-row-<id>-paid` briefly empty right after check-in (timing).
- **⚠ Evidence-location note:** `iteration_31.json`, `iteration_32.json`, `session_a_*.json`, `a5_focused_raw.json` are **NOT present in this workspace** (memory re-sync dropped them; only `memory/test_reports/iteration_30_CR385_P5_sessionA_rerun_2026_09_23.json` survived). Cite them via the SESSA handover + `registry.json` status_history entry #55 + plan note §10d. Do not invent paths; write "recorded in SESSA handover §2 / registry #55" as the evidence pointer.

### 3.2 Session B — CLOSED (it.33) — `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSB_CLOSED.md`
- **Rows PASS:** 11 (booking body clean), 21 (extend +1 SGST/CGST two lines, `new_room_price` absent, balance ₹74,340; collect-now ₹500 applied — proven by S5 ₹73,840 = ₹74,340 − ₹500; shorten −1 "Shorten to 25 Sep (−1 night)"), 23 (room-tile extend jump, Esc closes; departures chips today=0/overdue=0), 27 (Bill: SGST/CGST, `bill-room-toggle`, balance equality stack=left=row=₹73,840, D88 all absent/hidden), 28 (TAB settle: toast "Checked out · Room r4", row gone, bill-payment body clean; **double-charge check SKIP "not reproducible — stay departed"** — acceptable per handover §5.2). Row 24 PARTIAL (HK request fired; tile refresh timing MINOR).
- MINOR: S4 test-assertion error (not functional); S7 HK clean button timing; S9 BUG-448 `fd-bill-tab-prefilled` class not captured (checkout succeeded). SKIP: M3-S06 held rate (no recipe — owner's row anyway).
- Testid discoveries recorded in SESSB §2 (`payment-TAB-btn`, `fd-room-tile-<id>` → `fd-room-detail-<id>`, `extend-bill-balance`, `extend-delta`, native `<select>` for room).
- `test_reports/sessb_cleanup_result.json` also not in workspace → cite SESSB §3 (inhouse_p5=0, arrivals_p5=0 row 269 cancelled, toggle=false, cal_radio=true).

### 3.3 Session C — CLOSED (it.34) — `SESSION_HANDOVER_2026_09_23_CR385_P5_SESSC_CLOSED.md` + `/app/test_reports/iteration_34.json`
- **Rows PASS:** 29 (POS F&B: table 1 order #000136 ₹209, `collect-payment-panel` visible, `bill-grand-total` > 0, **D88 scope PASS** = panel NOT inside `.frontdesk-bill`, cash full settle, `order-bill-payment` body clean), 33 (console sweep **0 errors** at 1920×800 and 1366×768 on `/pms/front-desk-v2` all 4 tabs + `/dashboard`). Legacy `/pms/new-booking`, `/pms/check-in`, `/pms/departures` (no rows → drawer not exercised, acceptable per §3.2 of the SESSC entry), `/pms/front-desk` all load.
- NOTES (not bugs): `payment-split-btn` NOT_RENDERED — TGK RID-69 has no `partial` payment type in restaurant config (so the "Split visible on POS" assertion is verified by scope, not by visibility; D88 correct). 3 room toggles NOT_RENDERED on a dine-in order (`isRoom=false`) — expected. **BUG-448 C0b leg UNCONFIRMED**: booking 274 created, check-in step failed because the test script hard-coded 2026-09-23 while `business_date` rolled to 2026-09-24 mid-session (row fell under `arrivals_late`). Booking 274 cancelled via API (HTTP 200). Rows 27/28 BUG-448 re-check: NOT CONFIRMED / NOT RUN in C — **non-blocking per handover §3.5**; BUG-448 final record = "FIXED (P4.5 it.25/26 QA-VERIFIED) — P5 re-check partial (it.33 checkout OK, class not captured; it.34 booking created, check-in not reached)".
- Lesson (testing_agent): two wide briefs timed out; the narrowed brief passed. Read-backs: `t0d_entry_sessc_readback.json`, `t9_readback.json`, `t9_final_sessc_readback.json`.

### 3.4 §5.4 Probe pack re-run — DONE 2026-09-24 — `PROBE_REPORT.md`
- Runners copied into `probes_2026_09_23_release/` (`run_gate4.py`, `run_n7n8.py`, `run_n11.py`, `run_d14.py`, `run_d1516.py` + `_probe_common.py`): credentials read-by-pattern, `REACT_APP_API_BASE_URL` from `frontend/.env`, every request body logged to `<run>_requests.jsonl`, `finally` cleanup (settle in-house QA by TAB at true balance / cancel pending / restore settings). Deviation from the 09-20 originals: gate4 sets `allow_early_checkin=true` before its future-dated check-in (N7 is server-enforced since 09-20) and restores it.
- **gate4 (rows 11/18/21):** BQ-16 omit-rate 201 + unknown-plan 422 "no rate configured"; booking+advance `charge{8600, 774/774, 10148, adv 1000, due 9148}`; check-in paid upgrade **added** `8600+1500=10100`, 909/909, 11918 (D9/D10 hold); **same-room extend 200** (D12 gone) `17500 · 1094/1094 · 19688 · adv 1500 · due 18188` with `nights_detail` on response **and on the LR row** (BQ-385-19 delivered by backend); **move r4→r5 200** (D13 gone), money unchanged; TAB 18,188 → `departed`, `balance_due 0`, ledger row = amount sent (D8 ledger fixed). Residual: folio `remaining_room_balance` / `balance_payment` stay 18,188 after departure = **OG-PMS-022** (P3 info, backend-acknowledged) — not new.
- **n7n8 (rows 16 live / 32):** bogus mode 422; raw-JSON settings write ignored (multipart only); N7 off → **422** "Early check-in is not allowed for this property (stay check-in 2026-10-10 is after business date 2026-09-24)." with `charge` untouched; N7 on → 200; calendar extend 17,500; held extend 18,700 / 1,683; money under `data.charge`; defaults restored and verified on `settings-list` + `profile`.
- **n11 + d14 (row 20):** per-night slab `[10 Oct 8600 held 18 % 1548, 11 Oct 7400 calendar 5 % 370]` + upgrade 270 = 2,188 → sgst/cgst 1,094 **MATCH**; held control 18,700 / no `nights_detail`; **D14**: extend response `advance 1500 / due 18188` == LR == true balance → not stale.
- **d1516 (row 20):** D16 move keeps 17,500 + `nights_detail`; D15 shorten → 10,100 / 909 / 11,918 (1 row); re-extend 17,500 no drift; BQ-385-20 split 201 (lump 1,000, no "split" echo) + bad-sum **422**.
- **held_fallback:** "skipped — no recipe" (needs backend rate wipe, D68; verified LIVE 2026-09-21).
- **Forbidden-key grep:** 64 request bodies; `rate_per_night|amount_after_tax|new_room_price` → **0**; `room_price` only as the frozen literal `"0"` on the 8 legacy multipart `user-group-check-in` forms = exactly what the FE sends (`frontDeskService.js` L99), same treatment as Session A's `run_d17_reverify.py`.
- Disposable rows 275–283 created and disposed. Entry `t0e_entry_probepack_readback.json` == exit `t9_exit_probepack_readback.json` (r4/r5 `hk`, settings default, `qa_rows_left=[]`, owner r1 #256 untouched).

### 3.5 §5.5 Final guards — 6/6 PASS 2026-09-24 — `FINAL_GUARDS.md`
| Guard | Actual |
|---|---|
| 1 money grep | exactly 2 lines: `frontDeskService.js:70` (comment) · `:101` `fd.append('balance_payment', '0');` |
| 2 room-type grep | 0 lines |
| 3 hotspots | fresh `--filter=blob:none` origin clone, `21implement` HEAD **`b2db5a0`**; sha256 identical origin == workspace == Session 0: CollectPaymentPanel `b8c1e91f7a17e5cc…` · orderTransform `065710fa63134dca…` · pmsService `b5f139c7361b0d3b…` · PmsCheckoutDrawer `14a7e12e5a3163dd…`; `diff -rq origin/frontend/src /app/frontend/src` → 0. Clone deleted. |
| 4 mockup sha | `12fd0f4a343fc89d506478db999092d7ca564545b5cb2fc82118ca14c1168b86` |
| 5 jest | `CI=true yarn test --watchAll=false --testPathPattern "cr385\|bug450"` → 16 suites / **128 passed** / 2 snapshots (`final_guard5_jest.log`) |
| 6 build | plain `yarn build` → **exit 0**, 63 s, main 1.32 MB gzip; 24 pre-existing `react-hooks/exhaustive-deps` warnings in 12 non-CR-385 files, **0 in CR-385 files** (`final_guard6_build.log`) |

**⚠ FINDING you must carry into the QA report and registry:** origin `21implement` history was **re-imported on 2026-09-23** (8 commits: `af312cc` "Initial commit" → `24ae8f6` platform import 14:30 UTC → … → `b2db5a0`). **Commit `642ccb8` no longer exists on origin**; `git log -1` on the hotspots now returns `24ae8f6`. Byte-identity is proven by the blob hashes above; the guard PASSES by content. In the QA report, registry and D90 **cite the four sha256 prefixes, not `642ccb8`**. Do not "fix" this — it is a fact about the repo, not a defect.

### 3.6 Findings ledger for the whole of Phase 5 (nothing FAILs)
| # | Finding | Class | Disposition |
|---|---|---|---|
| F1 | A5(a) `.frontdesk-bill` not DOM-child of `bill-right` | MINOR (selector) | note in report, no action |
| F2 | `checkin-early-tooltip` not hoverable headless | MINOR | note |
| F3 | `fd-row-<id>-paid` briefly empty after check-in | MINOR (timing) | note (OG-PMS-047 family) |
| F4 | S4 collect-now assertion wrong in test, payment proven applied | MINOR (test) | note |
| F5 | S7 HK clean button not visible before tile refresh | MINOR (timing) | note; row 24 PARTIAL → report as PASS-with-note or PARTIAL, your Role 4 call, evidence SESSB |
| F6 | BUG-448 `fd-bill-tab-prefilled` not captured (it.33) / C0b not reached (it.34) | NOTE | BUG-448 stays FIXED + QA-VERIFIED (P4.5 it.25/26); record "P5 re-check partial" |
| F7 | `payment-split-btn` absent on POS for TGK (no `partial` payment type configured) | NOTE (config) | D88 scope verified; not a regression |
| F8 | OG-PMS-022 folio `remaining_room_balance` not zeroed after TAB | known residual P3 | already registered; cite |
| F9 | LR `charge` now carries `nights_detail` | improvement | BQ-385-19 → mark delivered/CLOSED in OPEN_GAPS if it has a row (check `OG-PMS-`/`BQ-385-19` in OPEN_GAPS_REGISTER + plan note; if only in plan note, mention in report) |
| F10 | origin history re-imported; `642ccb8` gone | process | cite blob hashes everywhere; note in D90 |
| F11 | 24 pre-existing lint warnings in non-CR-385 files | NOTE | outside scope; optional line in OPEN_GAPS "info", not a P5 gap |
| F12 | `test_credentials.md` wiped on each memory re-sync | process | already in pitfalls; repeat in your handover |
| F13 | iteration_31/32/33 + sessb_cleanup JSONs not in workspace | evidence-location | cite handovers/registry (see §3.1) |

---

## 4. §5.6 — QA REPORT: exactly what to write

**Path:** `/app/memory/test_reports/QA_REPORT_2026_09_24_CR385_P5_ROLE4.md` (date = the day you write it). Mirror the house style of `QA_REPORT_2026_09_22_CR385_P3_ROLE4.md` (header, auth line, tables, "Result" block). Role 4 = independent voice: state what was evidenced, not what was intended.

**Mandatory sections (handover §5.6 verbatim requirements → sections):**
1. **Header:** CR-385 Phase 5 — Role 4 QA Report; account QA_TGK (no values); sandbox RID 69; business dates 2026-09-23 → 2026-09-24; build = origin `21implement` HEAD `b2db5a0`, hotspots by blob hash.
2. **Entry vs exit read-back comparison:** Session 0 baseline (t0_entry) vs `t9_exit_probepack_readback.json`: r2/r3 untouched (owner rule), r4/r5 `hk`, r1 = owner stay #256 untouched throughout (note it replaced the earlier 174/155 stays which the owner checked out himself before Session A′), settings default (3 keys), `qa_rows_left=[]`, `counts.in_house=1`.
3. **34-row matrix table** — one row each, columns: `# · Module · Assertion · Verdict PASS/FAIL/N/A · Evidence (path + iteration/log) · Note`. Verdicts to use (from §3 above; you may tighten wording but not change verdicts without evidence):
   - 1 PASS (route + Beta item; it.31/33/34 login → `/pms/front-desk-v2`) · 2–5 PASS (jest 128, `final_guard5_jest.log`) · 6 PASS (GuestTable keyboard/sticky — P0/P1 QA reports + it.31/33 rows) · 7 PASS (jest) · 8 PASS (Guard 1 = 2 allowed lines) · 9–10 PASS (jest + it.31 booking guards/422) · 11 PASS (it.31, it.33, gate4 §2, d1516 s1) · 12 PASS (it.31 confirmation SGST/CGST/advance; M2 inline dialogs — cite P2 report + smoke) · 13 PASS (PATCH modify; P2 report it.14–16 + smoke M2) · 14 PASS (X-05 zero-night 422 — P2 probe; if you cannot find the evidence file, mark "PASS (P2, `probes_2026_09_22_p2_entry`)" or N/A-carried) · 15 PASS (it.31 check-in body clean; 8 probe check-ins) · 16 PASS (it.31 DISABLED gate + n7n8 s3 422 live) · 17 PASS (it.31 sh=ch=408 @1366×768) · 18 PASS (gate4 §3, n7n8 s4, n11, d14, d1516 s2; 422 verbatim n7n8 s3) · 19 PASS (jest + it.33 body no `new_room_price`) · 20 PASS (n11 + d1516 + d14; `nights_detail` renderer it.33) · 21 PASS (it.33 extend/collect/shorten; gate4 §4/§5; d14 LR == response) · 22 PASS (jest getRowBalance + it.33 balance equality ₹73,840) · 23 PASS (it.32 PAID SO FAR; it.33 tile jump, departures chips) · 24 PASS-with-note or PARTIAL (it.32 HK badge PASS; it.33 HK clean timing MINOR F5) · 25 PASS (it.32 HK badge; hideSectionRows jest) · 26 PASS (jest roomInfo from charge; it.33 panel balance === row) · 27 PASS (it.32 + it.33 SGST/CGST two lines; D88 absent) · 28 PASS (it.33 TAB E2E; `already_paid` idempotency verified 2026-09-20 + jest; P5 double-charge SKIP "stay departed" — say so) · 29 PASS (it.34; note F7) · 30 PASS (jest transform) · 31 PASS (it.31 toggle cycle + Rate-table radio; multipart `data=` write n7n8 s1b) · 32 PASS (n7n8 s6 / n11 s3 restore verified on profile) · 33 PASS (it.34 0 console errors both viewports; X-10 unique testids it.31/33/34) · 34 → **PENDING until §5.7 done**, then PASS (registry checklist executed) — write it as "PASS (this closure, see §5.7 ticks)" only after you actually did §5.7.
4. **Session A/B/C results** (3 sub-tables from §3.1–3.3, with the MINOR/NOTE ledger F1–F7).
5. **D17 / BUG-412 re-verify** table (legs A/B/C figures from `d17_reverify.json`).
6. **Probe pack summary** (table per script from `PROBE_REPORT.md` §1–§5 + the forbidden-key grep block §7 verbatim).
7. **Six guards with actual outputs** (copy the FINAL_GUARDS.md table; include the `642ccb8` note).
8. **Console sweep** (it.34: 0/0/0/0 at both viewports; ignore-list applied).
9. **Known-ignore list applied** — paste the list from §1 and state "none re-filed".
10. **Findings ledger** F1–F13 with class + disposition; explicit sentence: **"No FAIL. Phase 5.5 not triggered."**
11. **Result block:** "Phase 5 regression PASSED 2026-09-2x — ready for owner sign-off (§5.8)". Do **not** write "CR-385 CLOSED" — only the owner's word closes it.

After writing: add a `registry.json` CR-385 `status_history` entry `"P5 regression PASSED 2026-09-2x — QA_REPORT_2026_09_24_CR385_P5_ROLE4.md; 34 rows: 33 PASS / 0 FAIL / 1 pending (row 34 = registry checklist, closes in §5.7)…"` (or 34 PASS once §5.7 is done — keep it truthful at the moment you write it).

**STOP rule:** if while writing you discover a genuine FAIL you cannot classify as MINOR/NOTE with evidence → STOP, intake (`change_requests/BUG-<n>_*_INTAKE.md`, BUG_TRACKER, registry), route to owner, wait for "Phase 5.5 GO". Nothing in §3 suggests this will happen.

---

## 5. §5.7 — REGISTRY CLOSURE: the tick list (do all, in this order, tick each in your handover)

1. **`control/FILE_OWNERSHIP.md`** — append the owed block **verbatim** from plan note §7 "FILE_OWNERSHIP entries owed" (10 lines: `FolioCheckoutPanel.jsx` ×2, `frontdesk.css` D88, `tests/cr385/phase2/3/4.cr385.test.jsx`, `hideSectionRows.cr385.test.js`, `RatesTab.jsx`, `ChannelManagerPage.jsx`, `RatesTab.bug450.test.jsx`). Then verify every file in 2026-09-22 handover §6 code map has a line; add missing as "CR-385 M<n> IMPL 2026-09-2x".
2. **`control/registry.json` CR-385:** `files[]` = complete actual list (cross-check with `grep -rln "CR-385" /app/frontend/src --include=*.js --include=*.jsx`); `status_history` entries for M6, BUG-448, BUG-450 if missing, "P5 regression PASSED <date>". **Do NOT set `CLOSED` yet** — that happens in §5.8 with the owner's quote. Also update items: BUG-418 → "FIXED + QA-VERIFIED (Beta) via CR-385 M6 2026-09-22 — legacy path → FU-385-C"; BUG-448 → "FIXED + QA-VERIFIED via CR-385 P4.5 2026-09-22 (P5 re-check partial it.33/34)"; BUG-450 → "FIXED + QA-VERIFIED (mini-gate it.27) via CR-385 P4.5b 2026-09-22"; BUG-412 → "re-verified P5 2026-09-23 (D17 legs A/B/C ALL_PASS)"; BUG-431/432/433(legacy)/443/444/446/449 → "DEFERRED-TO-FU-385-C" with the owner sentence (§7). Validate JSON after each edit.
3. **`control/BUG_TRACKER.md`** — same status lines as 2 for BUG-412/418/431/432/433/443/444/446/448/449/450.
4. **`control/CR_REGISTRY.md`** — CR-385 row: P5 PASSED, awaiting sign-off (→ CLOSED in §5.8); add FU-385-C and FU-385-D rows (status "PLANNED — separate CR", owner sentences).
5. **`control/OPEN_GAPS_REGISTER.md`** — OG-PMS-042 → CLOSED only if the Departures recipe was evidenced (it.33 S8 today=0/overdue=0 is a "look" — judge; if unsure keep OPEN with note); OG-PMS-048 stays OPEN → FU-385-D; OG-PMS-049 stays TRIAGED; OG-PMS-022 add "re-observed P5 probe pack 2026-09-24, unchanged"; BQ-385-19 (if a row exists) → delivered per gate4/n11 LR `nights_detail`; optionally one "info" line for the 24 pre-existing lint warnings (not a P5 gap).
6. **`control/CONTROL_DASHBOARD.md`** — CR-385 status line.
7. **`/app/memory/PRD.md`** — append P5 QA report + closure entry (a §5.4/§5.5 entry from 2026-09-24 already exists at the end).
8. **`control/SPRINT_STATUS.md`** — line placeholder now "CR-385 P5 regression PASSED <date> — awaiting owner sign-off"; final line in §5.8: "CR-385 CLOSED <date> — Gate 5 closed; FU-385-C: <owner words>; FU-385-D: <owner words>".
9. **Master checklist mirror** `frontend/public/cr385-master-checklist.html` — tick rows M0-01…M7-04, X-01…X-15, R-01…R-08 **only what was evidenced**; ticks only, no other HTML change; `public/`, not `src`.
10. **Code markers spot-check (R18):** `grep -rln "CR-385" /app/frontend/src --include=*.jsx --include=*.js | wc -l` and confirm copy headers on `RoomTile.jsx` / `CheckInForm.jsx`. Record the count in the QA report row 34.
11. Row 34 in the QA report → PASS; registry entry "Step 5 checklist executed".

---

## 6. §5.8 — SIGN-OFF: the one message to send the owner, and what to do with the answer

Send one message (after §5.6 + §5.7 are complete and the QA report path is given):

> "Phase 5 is complete: 34/34 matrix rows PASS (0 FAIL, Phase 5.5 not needed), probe pack 5/5 + held_fallback skipped-no-recipe, guards 6/6, zero code changes, sandbox clean (your r1 #256 stay untouched). QA report: `test_reports/QA_REPORT_2026_09_24_CR385_P5_ROLE4.md`. Registry closure ticks done except the final CLOSED flip. Please give me, in your own words: (1) the CR-385 close word; (2) confirm the FU-385-C sentence stands: "BUG-431/432/443/444/446/449, X-06 and legacy rounding stay DEFERRED-TO-FU-385-C"; (3) confirm FU-385-D: "D88 stays; OG-PMS-048 stays OPEN pending FU-385-D". I will record all three verbatim."

Then, **only after the owner's words arrive**, in this order:
1. `registry.json` CR-385 → `"status": "CLOSED"` + `status_history` entry quoting the owner's phrase **verbatim in quotes** with date; BUG items as in §5.7.
2. Gate 5 closed → `control/SPRINT_STATUS.md` final line with verbatim words.
3. `plans/CR-385_DESIGN_DECISIONS.md` → **D90** "CR-385 CLOSED by owner word "<verbatim>" <date>; Phase 5 evidence …; hotspots byte-identical by blob hash (origin re-imported 2026-09-23, `642ccb8` obsolete); FU-385-C / FU-385-D sentences verbatim".
4. `CR_REGISTRY.md` CR-385 → CLOSED; `CONTROL_DASHBOARD.md`; `PRD.md`.
5. `handover/SESSION_HANDOVER_2026_09_2x_CR385_P5_CLOSED.md` with self-assessment.
6. Confirm `git status --short frontend/src | wc -l` → 0, `python3 -c "import json;json.load(open('/app/memory/control/registry.json'))"` OK, no credential literal anywhere: build the grep pattern **from the file, never by typing it** — `P=$(grep -oP 'password `\K[^`]+' /app/memory/test_credentials.md); E=$(grep -oP 'email `\K[^`]+' /app/memory/test_credentials.md); grep -rlF -e "$P" -e "$E" /app/memory --include=*.md --include=*.json --include=*.py` → only `test_credentials.md` (plus pre-P5 historical files listed in §8 last bullet, which are out of scope).
7. Tell the owner to press **"Save to GitHub"** (docs + evidence + master-checklist ticks; `frontend/src` empty). Do not push yourself.

If the owner's sentence is ambiguous (e.g. "ok looks good"), ask once: "Is that your CR-385 close word? Please type the exact phrase you want recorded."

---

## 7. OWNER WORDS ALREADY ON RECORD (quote, never paraphrase)

- Gate 6: **"all smoke test passed"** · M2-S08: **"1 pass as sign off this was checked in smoke"** · M2-S11/M3-S06: **"skip will check later"**
- EC-4: **"EC4 is fine i will give u next agent"** · **"QA_TGK rotated"**
- FU-385-C: **"separate CR after CR-385 closes. Gate 5 closes without it; BUG-431/432/443/444/446/449, X-06 and legacy rounding stay DEFERRED-TO-FU-385-C with that sentence in the sign-off."**
- FU-385-D: **"separate follow-up CR. D88 stays; `frontdesk.css` + `hideSectionRows` guard unchanged; OG-PMS-048 stays OPEN pending FU-385-D."**
- "Phase 5 GO" — recorded in plan note §10b (2026-09-23).
- Session C start: **"boot ur self as per handover and agent promt and start phase c and stop after phase c"**; §5.4: **"yes proceed for 5.4 and the. stop"**; §5.5: **"Six Guards: Run the §5.5 guard set on the final build, including the hotspot SHA check against a fresh origin clone"**.

---

## 8. PITFALLS (cumulative — all still valid)

- `/app` git ≠ origin. Origin `21implement` HEAD is `b2db5a0`; hotspot commit `24ae8f6`; `642ccb8` is gone. Use blob sha256.
- `memory/test_credentials.md` is wiped on every memory re-sync. Ask the owner; never guess.
- `registry.json`: `search_replace` exact text or `indent=2, ensure_ascii=True`, no trailing newline; validate after each edit.
- API login as QA_TGK kicks a live QA_TGK browser (single-session). Not relevant for §5.6–5.8 unless you run a read-back while the owner tests.
- business_date rolls over at sandbox midnight (it did 23→24 mid-Session C). Any date-sensitive script must read `meta.business_date`.
- testing_agent briefs: narrow and single-purpose, or they time out.
- Don't clone into `/tmp` for anything persistent; clone-check-delete only.
- Don't create plan notes; append §10 / write D90.
- Never write "CLOSED" before the owner's verbatim word.
- **Zero code edits.** If you see a lint warning or a selector oddity you'd like to fix — don't. It goes to a follow-up CR.
- **Credential hygiene inventory (found 2026-09-24, pre-existing, NOT P5 work):** the QA_TGK password string also appears as an old OWNER/other-restaurant password in historical files from 2026-08/09 (e.g. `registry.json` item notes from 2026-08-06, `BUG_TRACKER.md` a 2026-09 investigation line, `AGENT_PROMPT_ALPHA.md` env-leak grep example, the 09-20 probe runners `probes_2026_09_20_*/run_*.py` with literal OWNER credentials, several pre-CR-385 handovers/QA handovers). P5 files are clean (the it.30 report's `test_credentials` field email was scrubbed 2026-09-24). Mention the inventory to the owner in the sign-off message as an "info" line and suggest a hygiene follow-up (rotation + scrub) — do not edit those historical files yourself unless the owner asks.

---

## 9. READY-TO-PASTE AGENT PROMPT (owner gives this to the next agent)

```
You are the CR-385 Phase 5 (Closure) agent for §5.6 → §5.8 — AGENT_PROMPT_ALPHA v0.7 Role 11 CLOSURE with Role 4 QA independence.
Boot: read /app/memory/handover/SESSION_HANDOVER_2026_09_24_CR385_P5_SEC56_ENTRY.md fully, then the files in its §2 in order. Then give me the one-line Phase 5 status from its §0 and a short summary of §3 (Sessions A′/B/C, probe pack, guards, findings ledger).
State: "Phase 5 GO" was given 2026-09-23. Sessions A′/B/C PASS (it.30–34), §5.4 probe pack 5/5 PASS (held_fallback skipped — no recipe), §5.5 guards 6/6 PASS. Zero FAIL → Phase 5.5 is NOT triggered. frontend/src diff is empty and must stay empty. Hotspots byte-identical by blob sha256 (origin history was re-imported 2026-09-23; commit 642ccb8 no longer exists — cite the hashes).
Sandbox: r1 #256 "coke" (order 1232674) is MY live stay — never touch. r2/r3 are mine by rule. r4/r5 are hk. §5.6–§5.8 need no sandbox mutation — make none. Read-only read-backs only, via probes_2026_09_23_release/run_readback.py.
Do, in order: §5.6 write test_reports/QA_REPORT_2026_09_24_CR385_P5_ROLE4.md (34 rows, evidence per row, findings ledger, guards, probe summary, entry/exit read-back, known-ignore applied, "No FAIL") → registry status_history "P5 regression PASSED" → §5.7 registry closure tick list (FILE_OWNERSHIP owed block, registry files[] + BUG statuses, BUG_TRACKER, CR_REGISTRY + FU-385-C/D rows, OPEN_GAPS, CONTROL_DASHBOARD, PRD, SPRINT_STATUS placeholder, master-checklist ticks, R18 marker count) → then STOP and ask me for the sign-off words (close word + FU-385-C + FU-385-D confirmations) in one message. Record my words verbatim; only then flip registry CR-385 to CLOSED, write D90, SPRINT_STATUS final line, SESSION_HANDOVER_<date>_CR385_P5_CLOSED.md with self-assessment, and tell me to press Save to GitHub (docs + evidence only).
No feature code. No new plan documents. Credentials only in /app/memory/test_credentials.md (if missing, ask me). Respond in English.
```

---

## 10. Artifact inventory at this handover (all exist unless marked)

| Artifact | Path | Status |
|---|---|---|
| Session 0 guards | `evidence/CR-385/probes_2026_09_23_release/SESSION0_GUARDS.md` | ✅ |
| Entry read-backs | `…/t0_entry_readback.json`, `t0b_after_it28…`, `t0c_entry_p5cont…`, `t0d_entry_sessc…`, `t0e_entry_probepack…` | ✅ |
| Session A′ results | `memory/test_reports/iteration_30_CR385_P5_sessionA_rerun_2026_09_23.json` ✅ · it.31/32 JSON ❌ not in workspace → SESSA handover + registry #55 | partial |
| D17 re-verify | `…/d17_reverify.json` + `run_d17_reverify.py` | ✅ |
| Session B results | it.33 JSON ❌ not in workspace → SESSB handover + registry #56 | partial |
| Session C results | `/app/test_reports/iteration_34.json` · `…/session_c_pos_regression.json` · `t9_readback.json` · `t9_final_sessc_readback.json` | ✅ |
| Probe pack | `…/PROBE_REPORT.md` + `run_*.py`, `_probe_common.py`, `log_*.txt`, `<run>_*.json`, `<run>_requests.jsonl` | ✅ |
| Exit read-back | `…/t9_exit_probepack_readback.json` | ✅ |
| Final guards | `…/FINAL_GUARDS.md`, `final_guard5_jest.log`, `final_guard6_build.log` | ✅ |
| Session handovers | SESSA_CLOSED, SESSB_CLOSED, SESSC_ENTRY, SESSC_CLOSED, **this file** | ✅ |
| QA report | `test_reports/QA_REPORT_2026_09_24_CR385_P5_ROLE4.md` | ⏳ §5.6 (you) |
| Registry closure | FILE_OWNERSHIP · registry.json · BUG_TRACKER · CR_REGISTRY · OPEN_GAPS · CONTROL_DASHBOARD · PRD · SPRINT_STATUS · master-checklist | ⏳ §5.7 (you) |
| Sign-off | registry CLOSED (verbatim) · D90 · SPRINT_STATUS final · `SESSION_HANDOVER_<date>_CR385_P5_CLOSED.md` | ⏳ §5.8 (you, after owner words) |
