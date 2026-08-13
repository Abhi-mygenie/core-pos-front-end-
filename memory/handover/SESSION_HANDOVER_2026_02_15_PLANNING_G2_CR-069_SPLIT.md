# Session Handover — 2026-02-15 (3-Phase Split + Design v2)

**Date:** 2026-02-15 (3rd session same day)
**Role:** PLANNING (continued — Gate 2 refinement)
**Trigger:** Owner supplied 5 old-POS screenshots + directive to split CR-069 into 3 phases.

---

## What changed this session

### 1. CR-069 split into 3 phases

| ID | Title | Status | Risk | Blast Radius |
|---|---|---|---|---|
| **CR-069** | Employee Management (Phase 1) — Employee CRUD only | GATE 2 COMPLETE — awaiting mockup approval | **MEDIUM** (was CRITICAL) | SMALL (~7 files) |
| **CR-070** | Role Management (Phase 2) — Role CRUD + Permission Matrix | INTAKE — awaiting Phase 1 approval | **MEDIUM** | SMALL–MEDIUM (~6 files) |
| **CR-071** | App-Wide Role Gating (Phase 3) | INTAKE — **DEFERRED** post CR-057/058 close | **CRITICAL** (unchanged) | LARGE (~30 files) |

**Cross-refs updated:** CR-068 (Cancellation Role-Gating) `depends_on` moved from `["CR-069"]` → `["CR-071"]` — the actual dependency is the gating infrastructure, not employee CRUD.

### 2. Old POS UX learnings (5 screenshots analyzed)

Saved at `/app/memory/evidence/CR-069/old_pos_reference/`:
1. `01_employee_list.webp`
2. `02_edit_employee.webp`
3. `03_roles_list.webp`
4. `04_edit_role_details.webp`
5. `05_edit_role_permissions.webp`

**Key corrections to initial design (v1 → v2):**

| # | v1 (design_agent) | v2 (revised) |
|---|---|---|
| 1 | 2 sidebar entries | **Single page with tabs** (Employees / Roles) |
| 2 | Lock-icon read-only for system roles | **HIDDEN from table**, shown as chip banner |
| 3 | Permission matrix as TABS (Frontend/Backend/Report) | **3 collapsible ACCORDIONS** (backend-category order) |
| 4 | Role Type = multiselect | **Single-select** with "All Role" first (no template) |
| 5 | Missing Confirm Password field | **Added** — matches old POS form |
| 6 | Missing click-to-call phone icon | **Added** — orange Phone icon on employee rows |
| 7 | Missing Download-CSV button | **Added** — grey icon top-right |
| 8 | Plus Jakarta Sans font | **Keep existing app font** (no new font — migration principle) |
| 9 | Orange primary + Green CTA | **Corrected**: green primary CTA (Save/+), orange = back-arrow + title accent |
| 10 | shadcn Dialog/Sheet for forms | **Pattern B** (list ↔ form in-place swap; matches `settings/ListFormViews.jsx`) |
| 11 | Independent design agent primitives | **MANDATORY reuse of `panels/settings/shared.jsx`**: FormContainer, ListItem, TextInput, SelectInput, ToggleSwitch, BoolBadge |

### 3. Design guidelines revised

- **v1** (`CR-069_DESIGN_GUIDELINES_v1_SUPERSEDED.json`) — from design_agent, retained for audit
- **v2** (`CR-069_DESIGN_GUIDELINES_v2.json`) — authored by PLANNING agent post-owner-screenshots + codebase pattern audit. Aligns to:
  - `/app/frontend/src/constants/colors.js` — COLORS.primaryOrange/primaryGreen/darkText/grayText/borderGray/sectionBg
  - `/app/frontend/src/components/panels/settings/shared.jsx` — primitive reuse mandate
  - Old POS UX 1:1 (tabs, chip banner, accordions, click-to-call, Confirm Password)
  - Owner's 3-phase split

### 4. Owner-flagged sub-tasks/dependencies

| CR | Sub-task | Owner phrase |
|---|---|---|
| **CR-070** | **Role Definitions doc** — canonical default-permissions spec per Role Type | "we will go and work on defination to each role - another sub task and dependency to be noted during CR-069-B" |
| **CR-070** | **Design brainstorm** on Role Type auto-loader UX (how to explain "picking Type pre-fills defaults, you customize on top") | "so we might some info in terms of making it easy for user how it works during design phase we will brianstorm this" — v2 design guidelines list 4 UX options for owner to pick |

---

## Files changed this session

| File | Change |
|---|---|
| `/app/memory/control/registry.json` | CR-069 scope reduced + status updated. CR-070 and CR-071 added. CR-068 `depends_on` retargeted to CR-071. Backup at `registry.json.bak.pre-split-069`. Total items: 298 → 300. |
| `/app/memory/control/CR_REGISTRY.md` | CR-069 row replaced with 3-row split (069/070/071). |
| `/app/memory/evidence/CR-069/old_pos_reference/*.webp` | **NEW** — 5 old-POS screenshots |
| `/app/memory/evidence/CR-069/mockups/CR-069_DESIGN_GUIDELINES_v2.json` | **NEW** — revised design guidelines (this doc = authoritative) |
| `/app/memory/evidence/CR-069/mockups/CR-069_DESIGN_GUIDELINES_v1_SUPERSEDED.json` | Renamed (was `CR-069_DESIGN_GUIDELINES.json`) — retained for audit trail |
| `/app/memory/handover/SESSION_HANDOVER_2026_02_15_PLANNING_G2_CR-069_SPLIT.md` | **NEW** — this handover |

**Zero application code touched.**

---

## Open Owner Decisions (blocking Gate 3 for CR-069)

| # | Question | Status |
|---|---|---|
| **OQ-15** | `bill_user_view` + `mac_ip_kds/bill/bar` fields — hide? send defaults? surface in "Advanced" section? Old POS hides them from the Edit form. Recommend: hide + send `bill_user_view="No"` + empty IPs. | ⏳ Open |
| ~~OQ-6~~ | Password policy — admin-set vs. invite-email vs. OTP | ✅ **Answered** by old POS — direct password + Confirm Password fields in Edit Employee form → admin-set. |
| **OQ-18** ⭐ NEW | v2 design guidelines approval — accept as-is / revise / render visual mockup pages before approval | ⏳ Open |

**CR-070 design brainstorm** (not blocking Gate 3 for CR-069, but blocking Gate 2 for CR-070):
- Which Role-Type auto-loader UX to use (A/B/C/D from v2 §OWNER_BRAINSTORM_REQUIRED)
- Role definitions doc: who authors, when

---

## Next Actions

**Owner:**
1. Review `/app/memory/evidence/CR-069/mockups/CR-069_DESIGN_GUIDELINES_v2.json`. Approve / revise.
2. Answer OQ-15 (hidden fields policy).
3. Confirm route path — `/employees` or `/settings/employees`?

**On approval → PLANNING agent (this or next session):**
4. Gate 3 Implementation Plan for **CR-069 only** — `/app/memory/plans/CR-069_IMPLEMENTATION_PLAN.md` with Verification Matrix + Registry Checklist + file-list + slice strategy (probably one PR since scope is now small).
5. Owner Gate 4 GO → IMPLEMENTATION.

**CR-070 (after CR-069 ships):**
6. Full INTAKE + PLANNING pass, incorporating:
   - Role Definitions sub-task
   - Design brainstorm decision on auto-loader UX
   - Same primitive-reuse mandate

**CR-071 (later — post CR-057/058):**
7. Full INTAKE + PLANNING pass. Coordinate with FILE_OWNERSHIP for merge planning.

---

## Registry Cross-Reference Diagram

```
CR-068 (Cancellation Role-Gating, INTAKE, HIGH)
   └─ depends_on: CR-071

CR-071 (Role Gating Phase 3, INTAKE, CRITICAL, DEFERRED)
   ├─ depends_on: CR-069, CR-070, CR-057, CR-058
   └─ blocks: CR-068

CR-070 (Role Mgmt Phase 2, INTAKE, MEDIUM)
   ├─ depends_on: CR-069
   └─ blocks: CR-071

CR-069 (Employee Mgmt Phase 1, GATE 2 COMPLETE, MEDIUM)
   ├─ depends_on: —
   ├─ subsumes: OG-CR041-EMPLOYEE-MGMT
   └─ blocks: CR-070 (indirect: shared tabs container)
```
