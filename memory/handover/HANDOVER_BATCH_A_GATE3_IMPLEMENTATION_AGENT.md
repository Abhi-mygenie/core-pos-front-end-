# Handover — Batch A Implementation Planning Agent

**For:** Agent doing Gate 3 (Implementation Planning) for Batch A
**From:** Merge/docs session 2026-11-14
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main` · app `/app/frontend`, docs `/app/memory`
**Code changes for Batch A so far: NONE.** Gate 3 = documents only. No coding until owner gives Gate 4 GO.

---

## 1. Where things stand

| Gate | Status |
|---|---|
| Gate 1 Intake | CLOSED |
| Gate 2 Impact Analysis | **CLOSED 2026-11-14** — owner rounds R1–R12 all answered |
| Gate 2.5 Design Approval | **CLOSED 2026-11-14** — mockups M1–M10 all approved |
| Backend briefs | Written + sent (Gyan BA-01..22 + R-1..3, Parth B-495-1..7). **Reply not received** |
| **Gate 3 Implementation Plan** | **YOUR TASK — NOT STARTED** |
| Gate 4 GO | Owner gives after Gate 3 |

---

## 2. Read first (in this order)

1. `control/AGENT_PROMPT_ALPHA.md` — ROLE 2 PLANNING, stage `implementation_plan` (L515–622). Also RISK CLASSIFICATION (L56) and OWNER APPROVAL MATRIX (L101).
2. `handover/SESSION_HANDOVER_2026_11_14_BATCH_A_GATE3_PLANNING.md` — **the detailed Gate 3 handover with all locked decisions, plan groups G1–G6, conflict pre-check, expected output format, and release checks**. This is your primary reference.
3. `handover/SESSION_HANDOVER_2026_11_14_BATCH_A_GATE2_CLOSED.md` — short Gate 2 close summary.
4. `impact/BATCH-A_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md` — evidence index, write-probe results, decisions log R1–R12 + Gate 2.5.
5. `change_requests/BATCH_A_OWNER_DECISIONS_2026_11_14.md` — final owner decisions R1–R12 + Gate 2.5.
6. Item IA docs: `impact/{BUG-670,BUG-674,CR-493,CR-492,CR-515,CR-494,CR-495,CR-443,CR-372-B,CR-071,CR-445,CR-529,CR-540}_IMPACT_ANALYSIS.md`.
7. `design/BATCH-A_GATE2_5_MOCKUPS_2026_11_14.html` — approved screens M1–M10 (Current vs Proposed). **Every on-screen change must follow the approved mockup.**
8. `backend_briefs/BACKEND_BRIEF_BATCH-A_2026_11_14.md` (Gyan), `backend_briefs/BACKEND_BRIEF_CR-495_ROOM_COMP_MEAL_PACKAGE_2026_11_14.md` (Parth), `backend_briefs/BACKEND_BRIEF_TRACKER.html`.
9. `control/CONTROL_DASHBOARD.md`, `control/FILE_OWNERSHIP.md`, `control/OPEN_GAPS_REGISTER.md`.
10. Check `backend_replies/` for `BACKEND_REPLY_BATCH-A_*` — none at handover time.

---

## 3. Your task

**Owner rules (locked):**
1. Plan ALL P0 items together (not only the ones free of backend).
2. One combined plan per related group (G1–G6).
3. Any screen change must match its approved mockup (M1–M10). Any NEW screen change not in M1–M10 → back to Gate 2.5 (new mockup) before planning.

**Plan groups:**

| Group | Items | Mockups | Backend asks | Can plan FE now? |
|---|---|---|---|---|
| **G1 Cancel** | BUG-674, BUG-670, CR-493, item-cancel right (from CR-515) | M1, M2, M3, M6 | BA-01..BA-06 | YES (dialog UI, payload, gate). Report/Beta display waits on backend |
| **G2 Rights** | CR-492, CR-515 | M5 (part 1), M7 | BA-07..BA-09 | YES (FE gates use existing keys) |
| **G3 PIN & limits** | CR-494 | M1/M2 hooks, M4, M5 | BA-11..BA-15 (all new; 404 today) | PARTIAL (PIN popup + call sites; API contract placeholder) |
| **G4 Room comp** | CR-495 | M5 (room), M8 | B-495-1..7 (Parth) | PARTIAL (check-in fields; contract TBD) |
| **G5 Alerts** | CR-443 | M9 | BA-19..BA-22 | PARTIAL (banner + sidebar + device switch; events from backend) |
| **G6 Routes** | CR-372-B | M10 | none | YES (FE only) |

P1 (NOT in this plan): CR-071 (full wiring HOLD), CR-445 (BA-17/18), CR-529 (OTP phase 2), CR-540, reprint right, separate item-cancel right (phase 2).

**Expected output per group:** `plans/BATCH-A_G<n>_<NAME>_IMPLEMENTATION_PLAN_<date>.md` containing: Code Reality, Conflict pre-check, exact edits (file + line + current → new), scope lock, risk register, execution sequence, Verification Matrix, Post-Code Registry Checklist, backend-dependency markers, mockup links.

---

## 4. Priorities

| Priority | Items |
|---|---|
| P0 | CR-492, CR-515, CR-493, BUG-674, BUG-670, CR-494, CR-495, CR-443, CR-372-B |
| P1 | CR-071, CR-445, CR-529, CR-540 |

---

## 5. Release checks (carry into plans)

- **R-1:** cafe103/Palm House owners lack `complementary_food` right → backend role update before release.
- **R-2:** item cancel switches from `food` → `order_cancel` right (OrderEntry.jsx L353).
- **R-3:** `/local-printer-setup` requires login after CR-372-B.

---

## 6. Open (not blocking Gate 3)

- CR-495 half-board second meal (lunch/dinner); meal-slot rule (time vs cashier) — TBD, mark in plan.
- Gyan: BA-08 (restaurant `complementary` flag meaning), BA-03 (line reason overwrite).
- Backend reply not in yet → mark dependent edits "BLOCKED on BA-xx / B-495-xx".

---

## 7. Registry state

- `control/CR_REGISTRY.md` — Batch A table at top (13 items, all GATE_2_IA_CLOSED). Individual rows updated throughout file.
- `control/registry.json` — all 13 items `GATE_2_IA_CLOSED`, priorities synced.
- After Gate 3: update both registries to `GATE_3_PLAN_READY` for planned items.

---

## 8. Housekeeping

- Local `memory/` was re-synced and merged from main. Not pushed — owner pushes via Save to GitHub.
- Nested duplicate `evidence/BATCH-A-IA/BATCH-A-IA/` deleted locally (held unmasked PII). Still exists on GitHub main.
- Never print tokens/keys; probe evidence stays masked.
- Credentials: session-only; ask owner before any new probe.

---

## 9. Owner working style

- "Don't assume anything." Ask open points in rounds of max 5, explain plainly, summarise answers back.
- Update docs + decisions after every round.
- Approval needed before any destructive step.
- Owner wants zip downloads of changed docs on request.
