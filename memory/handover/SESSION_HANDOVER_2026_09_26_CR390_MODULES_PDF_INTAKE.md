# SESSION HANDOVER — 2026-09-26 — CR-390 INTAKE (sprint `modules_pdf`) — BRAINSTORM OPEN

**Role this session:** INTAKE (Role 1) · **Sprint:** `modules_pdf` (NEW) · **Code changed:** NONE (`frontend/src` untouched) · **Registry:** 726 items (CR-390 added)

## 1. Summary
Owner asked to (1) pull out the earlier PMS "dummy-data screenshots + PDF" deliverable and (2) register a CR so the plan to repeat it for all modules is not lost, then brainstorm point-by-point. Registered **CR-390** (P2 / LOW, DISTINCT, code reality PARTIAL) under new sprint `modules_pdf`.

**ID collision resolved:** originally registered as CR-389; remote `21implement` (HEAD `0b4d3a6`) already had CR-389 = Registry Excel Export (2026-09-25). Owner instructed renumber → **CR-390** (done; OD IDs → OD-390-xx). Remote CR-389 intake file pulled locally on owner instruction (single file, sha-verified). **Local workspace is otherwise still behind remote** (12 other new memory files: BUG-462/463/464 intakes, CR-376-FU-A/B docs, QA reports, updated control docs) — owner declined a full re-pull this session; next agent should offer it before any control-doc edits.

## 2. What was found (pull-out)
- `frontend/public/MyGenie_PMS_Screen_Reference.pdf` — **v2.0, 16 Sep 2026, 38 pp, 36 screens / 5 sections**, real React routes with dummy data, owner-approved template.
- `frontend/public/MyGenie_PMS_Screen_Reference_v1_2026-09-05.pdf` — v1.0, 13 screens (history).
- `frontend/public/pms/*.html` (13) + `pms-mockup.html` + `cr358-p4-pms-mockup.html` — static design mockups (not the PDF source).
- **Generator scripts LOST** (`/app/pms_dummy_data.py`, `/app/generate_pms_pdf_v2.py` — container root, never committed). Pipeline must be rebuilt and committed.

## 3. Docs written / updated
| Doc | Change |
|---|---|
| `change_requests/CR-390_MODULES_SCREEN_REFERENCE_PDF_ALL_MODULES_INTAKE.md` | NEW — classification, code reality, module/screen inventory M1–M6, blast radius, **OD-390-01…08 brainstorm agenda**, open questions |
| `evidence/CR-390/EVIDENCE_POINTER.md` | NEW |
| `control/registry.json` | CR-390 added, `sprint_key: modules_pdf`, meta updated (726) |
| `control/CR_REGISTRY.md` | Last Updated line + new dated section/row |
| `control/SPRINT_STATUS.md` | Last Updated + new `## modules_pdf` sprint section with brainstorm log |
| `control/CONTROL_DASHBOARD.md` | Last Updated line |

## 4. Brainstorm agenda (owner decisions — lock in order)
**Full option analysis (pros/cons/recommendation per OD) is in the intake doc § "Brainstorm — option analysis per decision". Owner asked for it to be written up so they can read and decide next session.**

### Session 2 (2026-09-26, owner walkthrough of CR-390) — outcome
- **Modules redefined by owner** (one PDF + one approval cycle each): **MM Menu Management · EM Expenses Management · IM Inventory Management · DC Day Closure & Settlement · DR Daily Report (contents to discuss) · Insights Basic · Insights Advanced · PMS redo** (module changed since v2.0). Agent's M1–M6 draft superseded.
- **OD-390-04 LOCKED:** perfect user journey per module; **each module's journey must be owner-approved before generation** (sub-gate G-journey).
- **Audience LOCKED: for clients** → scrub rules / footer proposed (OD-390-14).
- **OD-390-08 DEFERRED** ("later"); PMS v2.0 template interim default.
- **Doubts re-asked at Intake gate → OD-390-09…14** (module list/exclusions · DC contents · DR contents · Insights Basic/Advanced allocation — agent draft in intake · PMS redo scope · client scrub rules).
- OD-01/02/03/05/06/07 not addressed → still OPEN (owner may say "all recommended").
- Owner decision log rows appended in `SPRINT_STATUS.md`.

### Standing agenda (recommendations)

| OD | Topic | Agent recommendation |
|---|---|---|
| OD-390-01 | Data strategy | (b) Playwright `/api/*` interception + per-module fixture JSON — real logic/charts, 0 app code; (c) demo-mode later as own CR |
| OD-390-02 | Shared persona | one business ("Sharma Hotel & Restaurant"), report fixtures generated from one synthetic order set so totals reconcile |
| OD-390-03 | Screen granularity | primary view + 1–2 key interaction states, cap 3 pages/route |
| OD-390-04 | Ordering | (c) hybrid — journey for POS/Inventory/PMS, sidebar-derived for Menu & Settings/Insights |
| OD-390-05 | Packaging | (c) master + per-module PDFs + PNG packs; modules M1 POS Core · M2 Menu & Settings · M3 Inventory · M4 Expenses & Daily Report · M5a/b/c Insights · M6 PMS |
| OD-390-06 | Output location | `memory/design_briefs/downloads/screen_reference/` (CR-372 `PUBLIC_ROUTES.md` already treats `public/` PDFs as temporary carve-outs); move PMS PDFs out of `public/` in M6 |
| OD-390-07 | Sequencing | pilot M4 → M3 → M1 → M2 → M5a/b/c → M6 PMS regen |
| OD-390-08 | Template | PMS v2.0 template as standard, parameterised; edition rule vMAJOR.MINOR |

Open questions (non-blocking): audience (internal vs client-facing) · regeneration cadence · screenshot change-diff for CLOSURE.

## 5. Next session
1. Read this handover + intake doc (§ "Owner direction 2026-09-26 (session 2)" first).
2. Get owner answers to **OD-390-09…14** (module list · DC contents · DR contents · Insights split · PMS redo scope · client scrub rules) and lock **OD-01/02/03/05/06/07** (or "all recommended"). Record each in the intake tables + `SPRINT_STATUS.md` decision log.
3. When all locked → owner verbatim "Gate 2 GO" → PLANNING Gate 2 (pipeline design + endpoint inventory + **per-module journey drafts for owner approval**). **No code / no screenshots before that.**
4. Offer the owner a full re-pull of `memory/` from remote before Gate 2 (local behind by 12 files).

## 6. Rules observed
R0 (registered ID before work) · R3 (no policy invented — all choices tabled as ODs) · R19/R20 (no secrets printed) · zero `frontend/src` changes.
