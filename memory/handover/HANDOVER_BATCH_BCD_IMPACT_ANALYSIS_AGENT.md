# Handover — Batch B / C / D Impact Analysis Agent

**For:** Agent doing Gate 2 (Impact Analysis) for Batches B, C, and D
**From:** Merge/docs session 2026-11-14
**Repo:** `https://github.com/Abhi-mygenie/core-pos-front-end-.git` · branch `main` · app `/app/frontend`, docs `/app/memory`
**Code changes: NONE.** Gate 2 = documents only. No coding until owner gives Gate 4 GO.

---

## 1. Where things stand

| Batch | Gate | Status | P0 items ready for IA | Decisions doc |
|---|---|---|---|---|
| **A** | Gate 2 | **CLOSED** 2026-11-14, Gate 2.5 CLOSED, Gate 3 not started | — | (done) |
| **B** | Gate 1 | **INTAKE CLOSED** (P0 only) | 9 items | `change_requests/BATCH_B_OWNER_DECISIONS_2026_11_14.md` |
| **C** | Gate 1 | **INTAKE CLOSED** (P0 only) | 4 items (+2 investigations) | `change_requests/BATCH_C_OWNER_DECISIONS_2026_11_14.md` |
| **D** | Gate 1 | **INTAKE CLOSED** (P0 only) | 6 items | `change_requests/BATCH_D_OWNER_DECISIONS_2026_11_14.md` |
| **E–J** | Gate 0 | NOT STARTED — intake questions not asked | — | — |

The owner's instruction at intake close: "stay in intake" (don't jump to IA). That instruction was for the previous agent. **You** should ask the owner which batch to start IA on — B, C, or D — and get explicit "Gate 2 GO" before writing any impact doc.

---

## 2. Read first (in this order)

1. `control/AGENT_PROMPT_ALPHA.md` — ROLE 2 PLANNING, Gate 2 Impact Analysis steps (Step 0 Code Reality, Step 1 Conflict pre-check, Step 2 Impact Analysis). Also RISK CLASSIFICATION (L56), OWNER APPROVAL MATRIX (L101).
2. `handover/SESSION_HANDOVER_2026_11_14_INTAKE_BATCH_A.md` — §7/§7b/§7c for Batch B, C, D status and open questions.
3. The relevant batch decisions doc (see table above).
4. `change_requests/INTAKE_REQUIREMENT_BRIEFS_2026_11_14.md` — full requirement brief for all 112 items, grouped by batch. Line ranges:
   - Batch B: lines 532–1048
   - Batch C: lines 1049–1823
   - Batch D: lines 1824–2309
   - Batch E: lines 2310–2557
   - Batch F: lines 2558–2863
   - Batch G: lines 2864–3170
   - Batch H: lines 3171–3337
   - Batch I: lines 3338–3675
   - Batch J: lines 3676–3742
5. `impact/BATCH-A_IMPACT_ANALYSIS_SUMMARY_2026_11_14.md` — reference for how Batch A IA was structured (follow same format).
6. `control/CR_REGISTRY.md` — Batch A table at top shows the GATE_2_IA_CLOSED format to follow.
7. `control/CONTROL_DASHBOARD.md`, `control/FILE_OWNERSHIP.md`, `control/OPEN_GAPS_REGISTER.md`.

---

## 3. Batch B — Payments, Credit & GST

**P0 items ready for IA (9):**

| ID | Title | Notes |
|---|---|---|
| BUG-671 | Payment panel bug | |
| BUG-672 | Payment panel bug | |
| CR-514 | Payment panel feature | |
| CR-522 | Payment panel feature | |
| CR-526 | Credit/settlement | |
| CR-527 | Credit/settlement | |
| CR-536 | Credit/settlement (Prana removed from title) | |
| BUG-607 | Backend (Gyan) | |
| CR-394 | Payment | |

**New items (from intake):**
- CR-541 — reference-box settings in POS Settings, P1
- CR-542 — reason mandatory on every Make Unpaid, priority TBD

**Draft execution order (owner to confirm):** bugs first (671/672) → 526/542 → 514 then 522 (after Batch A PIN) → 536/527 → 607/394

**Open owner questions (must answer before closing IA):**
- CR-542 priority
- Merge CR-522 phase 2 into CR-541?
- Confirm impact order above
- Items deferred to IA discussion: 514-05, 527, 536-05 (entry point / UPI owner), 607-04, CR-394 inclusive vs exclusive

**Dependency:** payment-panel items (CR-514, CR-522) wait for Batch A PIN (CR-494).

**P1 (not in scope):** CR-517, BUG-475, BUG-118, CR-425, CR-520
**P2:** CR-126, CR-438
**Parked:** CR-447

---

## 4. Batch C — Order Beta Report & Reports

**P0 items ready for IA (4):**

| ID | Title | Notes |
|---|---|---|
| CR-503 | Collect pop-up + Print Bill | Overlaps CR-515 rights |
| CR-528 | In Audit report | |
| CR-524 | Punch time = item added, duration minutes | |
| BUG-675 | Remove "Total sale: ₹X" subtitle under Cash Collected | |

**Investigation (validate with code, kept open):**
- CR-505 — likely covered by BUG-645
- CR-510 — variations/add-ons already rendered; check a real aggregator order

**Merged:** BUG-605 → CR-526 (Batch B)
**P1:** CR-504, 506, 507, 508, 509, 511, 532, 444, 497, 537, 539, 138, BUG-192

---

## 5. Batch D — Dashboard, Order Entry & Order Cards

**P0 items ready for IA (6):**

| ID | Title | Notes |
|---|---|---|
| BUG-667 | Sidebar name wraps 2 lines | |
| BUG-669 | ₹0 add-ons + variations | |
| BUG-673 | Enter re-adds default item → selection back to search box | |
| CR-525 | Collect Bill replaces KOT+Bill after print | |
| CR-521 | Orange background, green border — design agent picks shade | |
| CR-523 | Link customer without update | |

**P1:** CR-518, CR-516, CR-437, CR-404
**Open:** CR-376-FU-C priority; BUG-667 screen confirmation at impact

---

## 6. Batches E–J — NOT STARTED

Intake questions have NOT been asked for these batches. If the owner wants to continue intake before IA, use `change_requests/INTAKE_REQUIREMENT_BRIEFS_2026_11_14.md` at the line ranges listed in §2 above.

| Batch | Theme | Items | Briefs lines |
|---|---|---|---|
| E | Scan Order & Aggregator / Sockets | 6 | 2310–2557 |
| F | Inventory & Recipes | 10 | 2558–2863 |
| G | PMS / Rooms | 7 | 2864–3170 |
| H | Backend-Blocked Performance & Data | 6 | 3171–3337 |
| I | Printer Agent (Piyush / PA team) | 12 | 3338–3675 |
| J | Tooling | 1 | 3676–3742 |

---

## 7. How to run IA (follow Batch A's pattern)

1. Ask owner: "Gate 2 GO for Batch [X]?" and whether all P0 items or a subset.
2. Read the batch decisions doc + relevant intake briefs.
3. For each item: run code probes (read-only unless owner approves write), document findings in `impact/<ID>_IMPACT_ANALYSIS.md`.
4. Ask owner questions in rounds of max 5. Log answers in a batch decisions doc and in the item IA doc.
5. Write a batch summary: `impact/BATCH-<X>_IMPACT_ANALYSIS_SUMMARY_<date>.md`.
6. If backend work is needed: write a backend brief at `backend_briefs/BACKEND_BRIEF_BATCH-<X>_<date>.md`.
7. Update `control/CR_REGISTRY.md` and `control/registry.json` → `GATE_2_IA_CLOSED` for completed items.
8. Handover: update this doc or write a new one.

**Evidence:** save probe results to `evidence/BATCH-<X>-IA/probes_<date>/`. Mask all tokens, phone numbers, emails with `***`.

---

## 8. Registry state

- `control/CR_REGISTRY.md` — Batch A table at top (reference format). B/C/D items are at `GATE_1_INTAKE_COMPLETE` or equivalent.
- `control/registry.json` — same; use `GATE_2_IA_CLOSED` format when closing.
- Total items in registry: ~1096.

---

## 9. Housekeeping

- Local `memory/` synced and merged. Not pushed — owner pushes via Save to GitHub.
- Never print tokens/keys; probe evidence stays masked.
- Credentials: session-only; ask owner before any probe.
- Scripts in `reports/` (apply_batch_b/c/d_decisions.py) have ALREADY BEEN RUN. Do NOT re-run them.

---

## 10. Owner working style

- "Don't assume anything." Ask every open point; owner answers in short form.
- Summarise understanding back before writing to registry.
- Max 5 questions per round, explain plainly.
- Approval needed before destructive steps.
- Owner wants zip downloads of changed docs on request.
- No testing agent calls; no code changes outside an approved Gate 4 GO.
