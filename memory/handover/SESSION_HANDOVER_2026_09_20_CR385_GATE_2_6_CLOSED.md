# CR-385 handover — 2026-09-20 (evening): HARD GATE 2.6 CLOSED by owner → Gate 3 OPEN

```
Item:      CR-385 PMS Front Desk — Unified Tabbed Workstation (P1 · HIGH · code_reality NONE · blast LARGE)
Gate:      2.6 CLOSED 2026-09-20 → 3 OPEN (Implementation Plan). registry.json gate=3, gate_2_6_closed=2026-09-20.
Owner quote: "08 a 04 ok 05 yes 06 ok update docs and decision and close gate 2.6 follow agent promot and rules"
Role next: PLANNING (Gate 3). No src/ code until owner says "close Gate 3" AND "Gate 4 GO".
```

## 1. What happened this session (chronological)
1. Owner decided **N7 = b** (block early check-in), **N8 = b** (rate-table pricing on extend), **N9 = allow** ("check-in can happen while housekeeping") → D52; BQ-385-17 opened for N8.
2. Backend replied the same day (`evidence/CR-385/backend_replies/n7_n8_2026_09_20.md`): N7/N8 shipped as **property settings** `allow_early_checkin` (default false → 422) and `extend_rate_mode` (`calendar` default | `held`). Independently verified (`evidence/CR-385/probes_2026_09_20_n7n8/PROBE_REPORT.md`, bookings 175/176): calendar 17,500 / held 18,700, 422 messages, `data.charge` shape, multipart-only settings write. → D53; **BQ-385-17 + BQ-385-18 DELIVERED · VERIFIED**; MASTER v1.8; no open backend ask.
3. New backend money question **N11**: GST slab is computed on the blended `rate_per_night` in calendar mode — a cheap added night could flip the whole stay 18 % → 5 % (D10 class). Non-blocking; OG-PMS-025.
4. Owner answered the remaining registry decisions and **closed Gate 2.6** → D54: **O-4** BUG-384/404/413 closed by decision · **O-5** BUG-418 folded into M6 · **O-6** transform-field ack (OD-385-12 exception) · **O-8 = (a)** settings toggles on the **existing PMS settings page** → new module **M7**.

## 2. State of the record (all synced)
| Record | State |
|---|---|
| `control/registry.json` | CR-385 gate 3, status_history entry, owner_decisions_locked (N7/N8/N9, O-4..O-8, gate_2_6 quote), owner_decisions_open []; BUG-404/413 CLOSED; BUG-384 re-confirmed; BUG-418 FOLDED INTO CR-385 M6; meta updated |
| `control/CR_REGISTRY.md` · `BUG_TRACKER.md` · `CONTROL_DASHBOARD.md` | header lines + rows updated |
| `plans/CR-385_DESIGN_DECISIONS.md` | D52 (N7/N8/N9), D53 (backend settings + FE rules), D54 (gate close + O-4..O-8) |
| `impact/CR-385_IMPACT_ANALYSIS_REV4_GATE_2_6_FINAL.md` | closure evidence; header "2.6 CLOSED"; §7 + O-8 scope note |
| `backend_briefs/BACKEND_BRIEF_CR-385_MASTER.md` v1.8 | BQ-17/18 verified; N11 open; `public/backend-briefs.html` mirrored |
| `control/OPEN_GAPS_REGISTER.md` | OG-PMS-023/024 closed; OG-PMS-025 = N11 |
| `public/cr385-master-checklist.html` | P-01, S-384/404/413, O-1..O-8 ticked with evidence; **new §M7 Settings** (M7-01..04); loader honours HTML default ticks |
| `public/cr385-impact-questions.html` | banner "2.6 CLOSED → Gate 3", §B7 N7/N8 verification, B-9 card closed, §D marked HISTORY |
| Intake doc footer | updated |

## 3. Frozen rules for Gate 3/4 (do not re-open)
- **Money:** D50/AC-22 — `charge.*` only; cleared ⇔ `payment_status paid && balance_due 0`; never `balance_payment` / folio `remaining_room_balance`; GST two lines from `charge.sgst/cgst`; FE never computes GST or prices.
- **N7:** FE reads `settings.allow_early_checkin` (profile). When false → `Check In` disabled for `checkin > meta.business_date` (server date only) with tooltip "modify the booking dates to check in today"; surface server 422 verbatim.
- **N8:** Extend Stay shows `data.charge`; `rate_per_night` on extended stays is a blend → label "avg. rate / night", never multiply back.
- **N9:** HK rooms selectable in the Check-In picker with HK badge + duration + amber note; Confirm enabled.
- **Settings write:** multipart `data={"basic":{…}}` only (raw JSON silently ignored).
- **OD-385-12 exceptions granted:** `inline` prop on 4 dialogs (Q2(a)) · additive `roomStatusTransform` fields (O-6) · two toggles on the existing PMS settings page (O-8 a, module M7).
- **BUG-418** fixed inside M6; BUG-404/413 need no work (superseded).

## 4. Gate 3 — exact next steps (AGENT_PROMPT Step 3–5)
1. **Ask owner go-ahead to start the spike** (rule: no jumping gates; closing 2.6 opens Gate 3 but the spike is throw-away code on a scratch route).
2. **P-02 D5 spike (½ day, throw-away):** scratch route with a dummy `GuestTable`, one `ExpandableRow`, real `CollectPaymentPanel` (room mode) inside a 560 px box. Measure: collapse/expand, inner scroll, pinned Settle/Checkout visible at 1920×800 + 1366×768, sticky `<th>`, `↑↓ Enter`, Split-state height (v2.27 352–395 px), OG-PMS-021 (Payment Method inside scroll body L1321–3297, only Pay button pinned). Evidence → `evidence/CR-385/spike/` (screenshots + measurements). Delete scratch code; `git status` must show no `src/` change.
3. **P-03 Q6 mechanism** (prop vs CSS to hide the 3 collapsible section rows / reorder settle block) — decide from spike evidence; record in DESIGN_DECISIONS.
4. **P-04 `plans/CR-385_IMPLEMENTATION_PLAN.md`:** modules **M0 shell → M1 Booking → M2 No-Show/Cancel/Modify → M3 Check-In → M4 Extend → M5 In-House/Departures → M6 Bill/Checkout → M7 Settings**; per module: exact edits (file, line, current→new), verification matrix (Step 4), post-code registry checklist (Step 5), risk register (R15–R26), execution sequence, **scope lock** (files WILL change: 13 NEW + App.js +2 + Sidebar +1 + 4 dialogs `inline` wrapper + roomStatusTransform additive + settings component (M7); will NOT touch: CollectPaymentPanel logic, orderTransform, old pages). M3–M6 gated on B-7 smoke (checklist §S). Use `/cr385-master-checklist.html` as the tick-list and `plans/CR-385_IMPLEMENTATION_ACCEPTANCE_CRITERIA.md` AC-01…AC-22.
5. Owner: **"close Gate 3"** → then **"Gate 4 GO"** → IMPLEMENTATION role, module by module, testing agent per module, `run_gate4.py` + `run_n7n8.py` re-run on each backend build (R24).

## 5. Parallel / parked
- **B-7 smoke** (owner/QA, checklist §S): 402 · 410 · 411 · 421 · 425 · 426 · 428 · 429/430 on preprod; CR-368 triage before M5/M6.
- **N11** GST slab on blended rate — await backend; re-verify with `run_n7n8.py` (add a cheap added-night case if the sandbox ever has a < 7,500 date).
- **N10** `received_by null` — backend hygiene.
- Real section `title` list for Rooms › Area — pull from live board during M0.
- Phase 2: BQ-385-02 aggregation, BQ-385-13 refund preview, BQ-385-07 room discount, sockets (BQ-385-01 closed), multi-room check-in (§K ON HOLD), FU-385-A/C/D/E/F/G/H.

## 6. Gotchas for the next agent
- Preprod token is single-session — re-login per run. Sandbox is shared (8524/8526 occupied by other testers on 2026-09-20); pick rooms from the board. Aiosell has a rate for every sandbox date (no < 7,500 date to test N11).
- Preview URL comes from `frontend/.env` `REACT_APP_BACKEND_URL` only (an older URL in PRD is stale).
- `?bill=103` mockup grand total is ₹6,152 since v2.26 (older notes say ₹2,677).
- Checklist ticks persist in localStorage; HTML `checked` attributes are the defaults and are honoured only when no stored state exists.
