# Intake — CR-376-FU-B
## CategoryPanel: Hide Empty Categories for Active Menu

**Date:** 2026-09-25
**Registered by:** PLANNING agent (ALPHA v0.7) acting in INTAKE capacity — follow-up registered per owner P5 / OD-376-10=(a) decision during CR-376 Gate 3 session.
**Source:** OWNER-REQUESTED (OD-376-10 + P5 decision, 2026-09-25)
**Parent CR:** CR-376 (Menu Switch — must be IMPLEMENTED before this CR starts Gate 2)
**Sprint:** TBD — post CR-376 ship

---

## Header (INTAKE mandatory fields)

| Field | Value |
|---|---|
| **Code Reality** | NONE — `CategoryPanel.jsx` currently renders all categories with no menu-type filter. No `activeMenu`, `activeMenuProducts`, or empty-category guard exists in this file. Grep: `grep -n "activeMenu\|foodFor\|food_for\|itemCount\|empty" src/components/order-entry/CategoryPanel.jsx` → 0 hits. |
| **Duplicate check** | DISTINCT — BUG-134 (`CategoryPanel.jsx` min-h-0 scroll fix) and CR-037 (CategoryPanel in boot product removal) are different issues. No existing CR/BUG covers category visibility filtering per active menu. |
| **Blast radius** | SMALL — 1 file (`CategoryPanel.jsx`), but requires `activeMenuProducts` from context (provided by CR-376 E3). |
| **Risk** | MEDIUM — CategoryPanel is used in every Order Entry flow (dine-in, QSR, takeaway). A filter bug could hide categories incorrectly, blocking item lookup for staff. Needs Gate 2–3. |
| **Fast Lane eligible** | NO — state interaction with category selection, shared context dependency, multi-flow impact. Full gate required. |

---

## Classification

| Field | Value |
|---|---|
| **Type** | CR — UX follow-up |
| **Severity** | P2 — MEDIUM. On a Premium station today (before CR-376), 18 Normal-only categories are visible but empty on click. After CR-376 ships this becomes more noticeable (25 Premium-only cats visible on Normal station and vice versa). Not a blocker — staff can still find items via "All" category — but creates a confusing experience. |
| **Area** | Order Entry > `CategoryPanel.jsx` |
| **Blocked by** | CR-376 NOT IMPLEMENTED — `activeMenuProducts` doesn't exist in context until CR-376 ships. |

---

## Step 0b — Duplicate Detection

| Check | Result |
|---|---|
| Registry keyword: `CategoryPanel`, `empty.*categor`, `hide.*categor`, `activeMenu.*categ` | BUG-134 (scroll, different), CR-037 (boot product removal, different). No match. |
| Codebase grep | `grep -rn "hide.*categ\|empty.*categ\|activeMenu.*filter.*categ" src/` → 0 hits. NONE. |
| Symptom match in handovers | OD-376-10 discussed in CR-376 Gate 3 session — explicitly deferred. No prior fix attempt. DISTINCT. |

**Duplicate check result: DISTINCT**

---

## Step 1b — Risk Classification

- **Risk:** MEDIUM
- **Trigger:** Component state interaction (CategoryPanel selection state + `activeMenuProducts` context), shared across all order types. A filter that incorrectly hides categories would break the UI flow for those stations.
- **Fast Lane:** NOT ELIGIBLE — multi-flow impact, context dependency, full Gate 2–3 needed.

---

## Context (from CR-376 probe, 2026-09-25)

Probe restaurant (QA_OWNER): 45 categories — 25 Premium-only, 18 Normal-only, 2 shared.
Evidence: `evidence/CR-376/CR-376_category_menu_matrix_2026_09_25.json`

On a Normal station today: 25 Premium-only categories list with 0 items on click.
After CR-376 on a Premium station: 18 Normal-only categories list with 0 items on click.
This is a pre-existing pattern, not introduced by CR-376 — but CR-376 makes it symmetrically visible on both sides.

---

## Step 2 — Evidence

| Field | Value |
|---|---|
| **Source** | OWNER-REQUESTED (OD-376-10=(a) + P5 decision, 2026-09-25) |
| **Confidence** | CONFIRMED (agent probe) — category matrix evidence captured at `evidence/CR-376/CR-376_category_menu_matrix_2026_09_25.json`. |
| **Screenshot** | Not taken — standard CategoryPanel visible in every Order Entry session. |
| **Steps to reproduce** | 1. Open Order Entry on any station. 2. Observe left category panel. 3. Click any "wrong menu" category (e.g. Normal cat on Premium station). 4. Item grid shows empty. |
| **Curl output** | Category matrix: `evidence/CR-376/CR-376_category_menu_matrix_2026_09_25.json` |

---

## Step 3 — Blast Radius

```bash
grep -rn "CategoryPanel" /app/frontend/src/ --include="*.js" --include="*.jsx" | wc -l
# Result: 5 references (1 file + 4 import/usage sites)
```

| Metric | Value |
|---|---|
| Files to change | **1** — `CategoryPanel.jsx` |
| Hotspot files | NO — CategoryPanel.jsx is NOT on the R5 list |
| Scope | SMALL (1 file) but MEDIUM complexity (filter logic touches category selection state) |
| Open owner questions | OQ-B1: Should the "All" category always show, or hide when 0 items? OQ-B2: Count source — CR-376 dropped E6/E7 (`calculateItemCounts`), so `CategoryPanel` must derive counts from `activeMenuProducts` directly. Confirm approach at Gate 2. |

---

## Gate 4 Precondition

- **HARD BLOCK:** CR-376 must reach Gate 5b QA pass or higher before this CR can start Gate 2.
- Planning required before implementation (owner confirmed 2026-09-25 P5).

---

```
Intake complete: CR-376-FU-B
Classification: CR, Severity: P2, Risk: MEDIUM
Duplicate check: DISTINCT
Evidence: CONFIRMED via category matrix probe
Blast radius: SMALL (1 file — CategoryPanel.jsx)
Docs updated: change_requests/CR-376-FU-B_CATEGORY_PANEL_EMPTY_CATEGORIES_INTAKE.md · registry.json · CR_REGISTRY.md
Next: Planning Gate 2 — BLOCKED until CR-376 Gate 5b
```
