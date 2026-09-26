# SESSION HANDOVER — 2026-09-26 — CR-389 INTAKE (sprint `modules_pdf`) — BRAINSTORM OPEN

**Role this session:** INTAKE (Role 1) · **Sprint:** `modules_pdf` (NEW) · **Code changed:** NONE (`frontend/src` untouched) · **Registry:** 726 items (CR-389 added)

## 1. Summary
Owner asked to (1) pull out the earlier PMS "dummy-data screenshots + PDF" deliverable and (2) register a CR so the plan to repeat it for all modules is not lost, then brainstorm point-by-point. Registered **CR-389** (P2 / LOW, DISTINCT, code reality PARTIAL) under new sprint `modules_pdf`.

## 2. What was found (pull-out)
- `frontend/public/MyGenie_PMS_Screen_Reference.pdf` — **v2.0, 16 Sep 2026, 38 pp, 36 screens / 5 sections**, real React routes with dummy data, owner-approved template.
- `frontend/public/MyGenie_PMS_Screen_Reference_v1_2026-09-05.pdf` — v1.0, 13 screens (history).
- `frontend/public/pms/*.html` (13) + `pms-mockup.html` + `cr358-p4-pms-mockup.html` — static design mockups (not the PDF source).
- **Generator scripts LOST** (`/app/pms_dummy_data.py`, `/app/generate_pms_pdf_v2.py` — container root, never committed). Pipeline must be rebuilt and committed.

## 3. Docs written / updated
| Doc | Change |
|---|---|
| `change_requests/CR-389_MODULES_SCREEN_REFERENCE_PDF_ALL_MODULES_INTAKE.md` | NEW — classification, code reality, module/screen inventory M1–M6, blast radius, **OD-389-01…08 brainstorm agenda**, open questions |
| `evidence/CR-389/EVIDENCE_POINTER.md` | NEW |
| `control/registry.json` | CR-389 added, `sprint_key: modules_pdf`, meta updated (726) |
| `control/CR_REGISTRY.md` | Last Updated line + new dated section/row |
| `control/SPRINT_STATUS.md` | Last Updated + new `## modules_pdf` sprint section with brainstorm log |
| `control/CONTROL_DASHBOARD.md` | Last Updated line |

## 4. Brainstorm agenda (owner decisions — lock in order)
**Full option analysis (pros/cons/recommendation per OD) is in the intake doc § "Brainstorm — option analysis per decision". Owner asked for it to be written up so they can read and decide next session.**

| OD | Topic | Agent recommendation |
|---|---|---|
| OD-389-01 | Data strategy | (b) Playwright `/api/*` interception + per-module fixture JSON — real logic/charts, 0 app code; (c) demo-mode later as own CR |
| OD-389-02 | Shared persona | one business ("Sharma Hotel & Restaurant"), report fixtures generated from one synthetic order set so totals reconcile |
| OD-389-03 | Screen granularity | primary view + 1–2 key interaction states, cap 3 pages/route |
| OD-389-04 | Ordering | (c) hybrid — journey for POS/Inventory/PMS, sidebar-derived for Menu & Settings/Insights |
| OD-389-05 | Packaging | (c) master + per-module PDFs + PNG packs; modules M1 POS Core · M2 Menu & Settings · M3 Inventory · M4 Expenses & Daily Report · M5a/b/c Insights · M6 PMS |
| OD-389-06 | Output location | `memory/design_briefs/downloads/screen_reference/` (CR-372 `PUBLIC_ROUTES.md` already treats `public/` PDFs as temporary carve-outs); move PMS PDFs out of `public/` in M6 |
| OD-389-07 | Sequencing | pilot M4 → M3 → M1 → M2 → M5a/b/c → M6 PMS regen |
| OD-389-08 | Template | PMS v2.0 template as standard, parameterised; edition rule vMAJOR.MINOR |

Open questions (non-blocking): audience (internal vs client-facing) · regeneration cadence · screenshot change-diff for CLOSURE.

## 5. Next session
1. Read this handover + intake doc.
2. Continue brainstorm: **OD-389-01 first**, then 02…08. Record each lock in the intake doc table + `SPRINT_STATUS.md` Owner Decision Log.
3. When all locked → owner verbatim "Gate 2 GO" → PLANNING Gate 2 (pipeline design + per-module screen manifests). **No code / no screenshots before that.**

## 6. Rules observed
R0 (registered ID before work) · R3 (no policy invented — all choices tabled as ODs) · R19/R20 (no secrets printed) · zero `frontend/src` changes.
