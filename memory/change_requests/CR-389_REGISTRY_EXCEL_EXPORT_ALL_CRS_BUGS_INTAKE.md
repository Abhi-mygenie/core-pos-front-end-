# Intake — CR-389
## Registry Excel Export: All CRs + BUGs with Status, Description & Tracking Columns

**Date:** 2026-09-25
**Registered by:** PLANNING agent (ALPHA v0.7) acting in INTAKE capacity
**Source:** OWNER-REQUESTED (chat, 2026-09-25 — "list down all CRs and bugs with status and 3-5 lines of desc … we will create excel for it")
**Sprint:** `sep_bug_closure` (proposed)
**Type:** CR — tooling / documentation (NO app code, NO `src/` change)

---

## Header (INTAKE mandatory fields)

| Field | Value |
|---|---|
| **Code Reality** | NONE — no export script exists. `control/registry.json` (728 items) is the single machine-readable source; `CR_REGISTRY.md` (211 rows) and `BUG_TRACKER.md` (354 rows) are hand-maintained mirrors. `dev-dashboard/` renders JSON but has no xlsx export. |
| **Duplicate check** | DISTINCT — `DEV-DASHBOARD-001` (HTML dashboard) and `CONTROL_DASHBOARD.md` are views, not a spreadsheet export with per-item descriptions. No prior xlsx request. |
| **Blast radius** | ZERO app code. New files only: `memory/reports/registry_export.py` (generator) + `memory/reports/REGISTRY_EXPORT_<date>.xlsx` (output). |
| **Risk** | LOW — read-only over registry/docs. |
| **Fast Lane eligible** | YES (doc/tooling, no `src/`), but owner asked for structure approval first → Gate 2-lite (this doc) → owner GO → build. |

---

## Classification

| Field | Value |
|---|---|
| **Type** | CR — tooling |
| **Severity** | P2 — owner reporting/visibility need; not customer-facing |
| **Area** | SHARED (control layer) |
| **Blocked by** | Owner decisions OD-389-01…04 (below) |

---

## Source Data Audit (2026-09-25)

| Fact | Value |
|---|---|
| Total registry items | **728** — BUG 469 · CR 249 · INVESTIGATION 5 · GAP 1 · misc IDs (POS2-*, PROD-*, PROD-HOTFIX-*, INV-*, DEV-DASHBOARD-001, UX-LOADING-02) |
| `priority`/`severity` present | ~65% of items |
| `risk` present | ~65% |
| `area` present | ~32% → must be **inferred** from files/title for the rest |
| `registered`/`created`/`created_at` present | ~50% → back-fill from intake doc header date |
| `implemented` present | few → back-fill from `status_history` / `FILE_OWNERSHIP.md` |
| Intake docs available | ~190 items → 3–5 line description feasible; remainder derive from title + tracker row |
| Sprint keys | pos_5_0 (265), pos_5_1 (83), pos_pms_1 (59), pos_4_0 (49), pos_pms_2 (28), pos_5_x (24), sep_bug_closure (19), pos_6_0, pos_7_0, pos_2_0, crm_2_0, none (134) |

---

## Proposed Sheet Structure (PENDING OWNER APPROVAL)

**Workbook:** `memory/reports/REGISTRY_EXPORT_<YYYY_MM_DD>.xlsx`
**Tabs:** `All Items` · `Open Only` (status ≠ CLOSED/DUPLICATE/WONT-FIX) · `Summary` (pivots: Type×Status, Area, Sprint)

### Columns — `All Items` / `Open Only`

| # | Column | Owner-requested? | Source | Rule |
|---|---|:---:|---|---|
| 1 | **S.No** | ✅ | generated | 1…N |
| 2 | **ID** | ✅ | registry `id` | `BUG-462`, `CR-376`, `CR-376-FU-B`, `INV-…` |
| 3 | **Type** | added | registry `type` | BUG / CR / INVESTIGATION / GAP |
| 4 | **Title** | ✅ | registry `title` | one line |
| 5 | **Description** | ✅ (3–5 lines) | intake doc → tracker row → title | symptom · root cause (if known) · fix shape · follow-ups |
| 6 | **Area** | ✅ (POS/PMS) | registry `area` → inferred | **OD-389-01** decides value set |
| 7 | **Module** | added (optional) | inferred | Order Entry, Room Check-in, Stock Audit, Reports, Printing, Settings… |
| 8 | **Priority** | ✅ | registry `priority`/`severity` | P0–P3 |
| 9 | **Risk** | ✅ | registry `risk` | LOW / MEDIUM / HIGH / CRITICAL |
| 10 | **Gate** | added | registry `gate` / parsed status | 1 Intake · 2 Impact · 3 Plan · 4 GO · 5A Impl · 5B QA · 6 Owner Smoke · CLOSED |
| 11 | **Status** | ✅ | registry `status`, normalised | INTAKE / PLANNING / IMPLEMENTED / QA PASS / AWAITING SMOKE / CLOSED / BLOCKED / DUPLICATE / WONT-FIX |
| 12 | **Status Detail** | added | registry `status` raw | long free-text string kept verbatim (audit trail) |
| 13 | **Date Registered** | ✅ | registry → intake doc date | YYYY-MM-DD or `—` |
| 14 | **Date Implemented** | ✅ | registry → status_history → FILE_OWNERSHIP | YYYY-MM-DD or `—` |
| 15 | **Sprint** | ✅ | registry `sprint_key` | as-is |
| 16 | **Blocked** | ✅ | derived from status/notes | YES / NO |
| 17 | **Blocked On** | added | status/notes | credentials · backend · parent CR · owner decision |
| 18 | **Files** | added | registry `files` | comma list |
| 19 | **Related** | added | registry `related` | parent / duplicate / follow-up IDs |
| 20 | **Notes** | ✅ | registry `notes` | free text |
| 21 | **Docs** | added | registry `artifact_refs` | intake / impact / plan / QA report paths |

Owner's original 12 columns = #1, 2, 4, 5, 6, 8, 9, 11, 13, 14, 15, 16, 20 (all present). Columns marked **added** are agent proposals — removable per OD-389-02.

---

## Owner Decisions (OPEN)

| # | Question | Options | Agent recommendation |
|---|---|---|---|
| **OD-389-01** | Area value set | (a) POS / PMS only — fold INV, CRM, shared into POS · (b) POS / PMS / INV / CRM / SHARED | **(b)** — inventory (BUG-459, CR-387, CR-388) and CRM items are distinct workstreams; folding hides them |
| **OD-389-02** | Extra columns | (a) keep all 21 · (b) strictly owner's 12 · (c) owner's 12 + pick from: Type, Module, Gate, Status Detail, Blocked On, Files, Related, Docs | **(a)** or at minimum (c) with Type + Gate + Blocked On |
| **OD-389-03** | Include non-CR/BUG IDs (5 Investigations, 1 GAP, POS2-*, PROD-*, PROD-HOTFIX-*) | (a) include all 728 with Type column · (b) CR + BUG only (~718) | **(a)** — complete picture; filter by Type in Excel |
| **OD-389-04** | Description depth | (a) 3–5 lines for all rows (mined from ~190 intake docs; rest 1–2 lines from title + tracker) · (b) 3–5 lines for OPEN items only, 1 line for CLOSED | **(b)** — faster, keeps sheet readable; closed items rarely need re-reading |

---

## Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | OWNER-REQUESTED (chat 2026-09-25) |
| **Confidence** | CONFIRMED — source data audit run this session against `control/registry.json` |
| **Steps** | N/A (tooling request) |

---

## Step 3 — Blast Radius

| Metric | Value |
|---|---|
| Files to change (app) | **0** |
| New files | `memory/reports/registry_export.py`, `memory/reports/REGISTRY_EXPORT_<date>.xlsx` |
| Hotspot files | NO |
| Dependencies | `openpyxl` (python, local tooling only — not added to frontend) |

---

## Gate Plan

1. **Gate 2-lite** = this doc (structure + source audit) — DONE, awaiting owner answers to OD-389-01…04.
2. Owner replies with choices + **"GO"** → build script, generate xlsx, spot-check 10 rows against tracker MDs, hand file path to owner.
3. Re-runnable: any future session can regenerate with `python3 memory/reports/registry_export.py`.

---

```
Intake complete: CR-389
Classification: CR (tooling/doc), Severity: P2, Risk: LOW
Duplicate check: DISTINCT
Blast radius: ZERO app code — 2 new files under memory/reports/
Open: OD-389-01..04 (Area set · extra columns · include non-CR/BUG · description depth)
Next: owner answers ODs + "GO" → generate xlsx
```
