# CR-385 · PLANNING handover — Implementation Plan written, Gate 3 still OPEN (2026-09-20)

```
Item:        CR-385 PMS Front Desk — Unified Tabbed Workstation · P1 · HIGH (CRITICAL modules M3/M4/M6/M7) · code_reality NONE · sprint_key pos_pms_2
Gate:        3 OPEN — milestone A spike DONE (D57/D58) · milestone B **plan DONE** (this session) · milestone C = owner says "close Gate 3" (PENDING)
Deliverable: plans/CR-385_IMPLEMENTATION_PLAN.md  ← owner reviews this
Rule:        agent never flips a gate (R4/D58). Nothing in frontend/src/ before owner "Gate 4 GO" (G4-10). `git status` shows 0 src/ changes.
Supersedes:  handover/SESSION_HANDOVER_2026_09_20_CR385_PLANNING_GATE_3.md as entry point (still accurate for boot order §0 and data facts §4).
```

## 1. What this session did (PLANNING, stage implementation_plan — Step 3/4/5)
| Step | Result | Evidence |
|---|---|---|
| Boot §0 rows 1–12 incl. 10b | read | — |
| Step 0 Code Reality | **NONE** — `grep -rn "CR-385" src/` 0 · `grep -rn "spike-cr385\|SpikeCr385" src/` 0 · no `src/spike/` | plan §0.1 |
| Step 1 Conflict Pre-Check | no code-level conflict; ordering only (M3←S-411/410, M4←S-402, M5←S-421/426/429/430, M6←S-425/428, P-11 CR-368 before M5/M6) | plan §0.2 |
| G4-09 probe (read-only GETs) | board: **no `sections[]`**; Area = room `title`; raw titles `ground floor` · `first  floor` (double space) · `2nd floor` · `3rd floor` · `patal lok`. LR `view=all` **422 without dates**. `payment_status` = per room line `rooms[].order_payment_status`. Sandbox settings at defaults (`allow_early_checkin=false`, `extend_rate_mode=calendar`, `auto_print_checkin_receipt=false`) — nothing changed by this session | `evidence/CR-385/probes_2026_09_20_g4_09/PROBE_REPORT.md` + 3 JSON |
| P-04 plan | M0–M7, E1–E10 exact edits, 26 new files, §3 data contract (C1–C12 + FORBIDDEN + D-rules), §5 G/AC mapping, §6 matrix 34 rows, §7 registry checklist, §8 risks R15–R30, §9 owner decisions, §10 order, §11 gate status | `plans/CR-385_IMPLEMENTATION_PLAN.md` |
| Checklist | ticked **P-04, P-05, P-06, P-07, P-08, P-09, G4-08, G4-09** with evidence (HTML `checked` defaults) | `public/cr385-master-checklist.html` |
| Sync (R17) | registry.json (implementation_plan path, status, status_history, files, owner_decisions_open, gate_3_milestones) · CR_REGISTRY (header + row) · CONTROL_DASHBOARD (header) · PRD · DESIGN_DECISIONS **D59** · OPEN_GAPS **OG-PMS-028/029** · `test_credentials.md` restored (was empty) | — |

## 2. Owner decisions raised (plan §9) — answer with letters
| # | Question | Rec. |
|---|---|---|
| **OD-385-16** | Extend Stay + Modify Booking: (a) new Front-Desk forms, legacy dialogs untouched · (b) `inline` + logic edits inside the legacy dialogs (old pages change). Reason: legacy dialogs do client rate maths and send `new_room_price` / `amount_after_tax` — against D50/G-02/G-03. Cancel/No-Show stay D2 `inline`. | **a** |
| **OD-385-17** | M7 toggles in Step 8 "Room & Hospitality" (a) vs Step 2 (b). | **a** |
| **OD-385-18** | Split at advance points (D47-h): (a) probe; if unsupported ship single-method advance, park Split-at-advance · (b) block M1/M3/M4. | **a** |
| G4-07 | Accept the FE fallback for BQ-385-19 (room total + nights + "avg. rate / night" after reload)? yes/no | yes |

## 3. Next steps (in order)
1. **Owner reviews the plan** → feedback → agent amends (plan is a living Gate-3 artifact until closed).
2. Owner says **"close Gate 3"** → record quote + date (P-12, G4-06, DESIGN_DECISIONS, registry `gate_3_closed`).
3. Before **"Gate 4 GO"** every G4 row ticked or waived — **still open:** G4-01 (re-run `run_gate4.py` + `run_n7n8.py` + `run_n11.py` → `probes_<date>_final/`), G4-02 (D14 fix or owner waiver; mitigation is matrix #21), G4-03 (N11 boundary probes — ask backend for a < 7,500 sandbox rate), G4-04 (B-7 smoke §S: 402 · 410 · 411 · 421 · 425 · 426 · 428 · 429/430), G4-06, G4-07 (owner accept fallback), G4-10 (owner quote).
4. Then IMPLEMENTATION role starts at M0 (plan §10). Implementation agent: Entry Verification against plan §4 line refs first (AGENT_PROMPT Role 3 Step 0).

## 4. Gotchas for the next agent
- If the owner says "close the gate" **before reviewing** the plan: the plan now exists, so Gate 3 *can* close on the owner's explicit "close Gate 3" — record the quote; do **not** treat it as "Gate 4 GO" (G4 rows still open, D56).
- Handover §4 "payment_status == 'paid'" → field lives at `rooms[0].order_payment_status` (OG-PMS-028). Money contract unchanged.
- Handover §5/M7 "Step 2 → basic tab" → `basic` is the API payload key; UI home is Step 8 (OD-385-17).
- `test_credentials.md` was empty after the memory sync; restored this session (alias OWNER_TGK). Never print the password.
- Preview URL = `frontend/.env` `REACT_APP_BACKEND_URL` only. `git diff` unavailable — use `git status` / `git log`.
- Sandbox shared: rooms 8524/8526 held by other testers; 2 stays in-house on 2026-09-20 (rooms r2/r3). Read-only unless you settle; restore settings after any write.

## 5. Update 22:00 — owner round-1 answers + final regression pack
- OD-385-16 = **a**, OD-385-17 = **Channel Manager page, 5th tab "Front Desk Rules"** (plan M7 rewritten: `ChannelManagerPage.jsx` +3 lines, new `pages/pms/FrontDeskRulesTab.jsx`, `restaurantSettingsService.updateFrontDeskRules`; `RestaurantSettingsPage` untouched). D60.
- Final pack `evidence/CR-385/probes_2026_09_20_final/PROBE_REPORT.md`: **G4-01 ✓, G4-02 ✓ (D14 fixed)**. New backend money defects **D15** (shorten re-prices at blended rate) and **D16** (room move flattens GST) → `backend_briefs/BACKEND_BRIEF_CR-385_2026-09-20_FINAL_PACK.md`; **BQ-385-20** split advance legs not stored. Second TAB = 200 `already_paid` (plan #28 updated). D61, OG-PMS-030/031/032. Sandbox restored (settings defaults, stays settled, reservations cancelled).
- **G4 still open:** G4-03 (held_fallback unreachable + D15/D16 fix or owner waiver), G4-04 (B-7 smoke), G4-06 (owner "close Gate 3"), G4-07 (owner accept BQ-19 fallback), G4-10. Owner still to answer OD-385-18 (a/b) after the probe result.

## 6. Update 22:45 — BE reply validated
- `backend_replies/d15-16_reply_2026-09-20.md` → all claims reproduced (`probes_2026_09_20_d1516/PROBE_REPORT.md`): **D15 CLOSED, D16 CLOSED**, BQ-385-20 confirmed (single-method advance; bad sum → 422). D63. M4 shorten/move unblocked; `nights_detail` now on extend/shorten/move responses (still not on LR list — BQ-19 / G4-07).
- **G4 still open:** G4-03(b) `held_fallback` only, G4-04 B-7 smoke, G4-06 owner "close Gate 3", G4-07 owner accept BQ-19 fallback, G4-10. Owner answers still needed: OD-385-18 (a/b), G4-04 runner, G4-07 yes/no, plan review → "close Gate 3".

## 7. Update 00:10 — round 3 answers + B-7 smoke
- OD-385-18 = **a** LOCKED (D64). BQ-385-21 (held_fallback sandbox date) asked in the FINAL_PACK brief.
- **G4-04 B-7 smoke (QA agent, 3 iterations):** PASS S-410 · S-402 · S-421/426 · S-429/430 · S-425/428; **S-411 FAIL → backend D17** (check-in advance dropped; curl repro `probes_2026_09_20_b7smoke/c2_*`); S-418 N/A (M6). D65. Checklist §S ticked accordingly.
- **Open before Gate 4 GO:** G4-03(b) (BQ-385-21), **G4-04 (D17 fix + S-411 re-smoke, or owner waiver)**, G4-06 (owner "close Gate 3"), G4-07 (owner yes/no on BQ-19 fallback), G4-10.
- Sandbox: all QA stays settled; rooms r1/r4/r5 at HK/available; settings at defaults (verified 22:45; untouched since).

## 8. Update 2026-09-21 — BQ-385-19 validated
- `backend_replies/bq385-19_reply_2026-09-21.md` reproduced live (`probes_2026_09_21_bq19/`): LR rows carry `charge.nights_detail` for calendar stays; absent for held / never-extended; money unchanged. **OG-PMS-027 CLOSED, G4-07 ✓** — owner yes/no no longer required. D66. Plan §3/M4/M6/#20 updated (renderer fed from row on reload).
- **Open before Gate 4 GO:** G4-03(b) BQ-385-21 (held_fallback sandbox date — backend), **G4-04 (D17 check-in advance dropped — backend fix + S-411 re-smoke, or owner waiver)**, G4-06 (owner "close Gate 3"), G4-10 (owner "Gate 4 GO").
- Owner decisions all locked (OD-385-16 a · 17 Channel Manager tab · 18 a). No open owner decision except the two gate words + the D17 wait/waive call.

## 9. Update 2026-09-21 (later) — D17 validated, B-7 smoke complete
- D17 FIXED + validated (API 3 cases, UI QA `test_reports/iteration_4.json` S-411 PASS ×2) → **G4-04 ✓**. BQ-385-21: no empty CM night exists → `held_fallback` chip on enum only; **G4-03(b) needs owner waiver**. D67.
- QA agent left orders 1232643/44/45 in-house → FE settled by TAB (`probes_2026_09_21_d17/log_cleanup_qa4.txt`); rooms → hk; settings at defaults.
- **Before Gate 4 GO only owner words remain:** G4-03(b) "waive held_fallback live demo" · G4-06 "close Gate 3" · G4-10 "Gate 4 GO". No backend item open for CR-385.

## 10. Update 2026-09-21 — held_fallback live (G4-03 ✓)
- Owner scenario (`backend_replies/held_fallback_probe_2026-09-21.md`): extend order 1232648 into the wiped night → `held_fallback` @ 36,800 observed in the response and on the LR row (`probes_2026_09_21_held_fallback/`). Stay settled; rates restored 31,500/7,400 and verified; settings defaults. D68. OG-PMS-033 closed.
- **All G4 evidence rows ticked (01·02·03·04·07·08·09).** Remaining = owner words only: **G4-06 "close Gate 3"**, **G4-10 "Gate 4 GO"**. Then IMPLEMENTATION role starts at M0 (plan §10) with Entry Verification.
- BE's separate "FE open stay" (order 1232647 / res 220) was left for the UI demo by BE — check its status before using; settle when done.
