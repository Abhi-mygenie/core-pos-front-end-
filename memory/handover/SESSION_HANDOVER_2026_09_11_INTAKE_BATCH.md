# Session Handover — Intake Batch (5 items from 2026-09-11 Investigations)

**Date:** 2026-09-11  
**Agent Role:** INTAKE AGENT (Role 1 — AGENT_PROMPT_ALPHA v0.7)  
**Session type:** Intake registration for all gaps investigated in session  
**Source investigations:** 4 separate investigation runs in this session  
**Sprint:** pos_7_0 (suggested for all new items)

---

## Items Registered This Session

| ID | Type | Title | Severity | Risk | Gate | Status |
|----|------|-------|:--------:|:----:|:----:|--------|
| CR-374 | CR | BulkEditor Filter Panel (Status/Type/Category) | P2 | MEDIUM | 1 | INTAKE — Design LOCKED, ready Gate 2 |
| CR-375 | CR | Aggregator Bulk Delete Capability | P2 | MEDIUM | 1 | INTAKE — BLOCKED (backend brief filed) |
| BUG-391 | BUG | Aggregator GST Not Enforced (always 5%) | P1 | HIGH | 1 | INTAKE — 5 owner ODs open (Rule R6) |
| BUG-392 | BUG | Scroll Wheel Changes Number Input Values | P1 | LOW | 1 | INTAKE — Ready Gate 4 GO |
| CR-376 | CR | POS Menu Switch (Normal/Party/Premium in Order Entry) | P2 | MEDIUM | 1 | INTAKE — 4 owner ODs open |

---

## Code Reality Summary

| ID | Code Reality | Evidence |
|----|-------------|---------|
| CR-374 | **NONE** — no `filterStatus`/`filterType`/`filterCategory` exists in BulkEditor.jsx | `grep` 0 results |
| CR-375 | **PARTIAL** — guard `showBulkDelete = menuType !== 'Aggregator'` exists (line 396). This IS the gap (guard blocks feature). No implementation exists. | BulkEditor.jsx:396 |
| BUG-391 | **NONE** — no `Aggregator.*GST`, no unconditional tax enforcement for Aggregator items | `grep` 0 results across ProductForm + BulkEditor |
| BUG-392 | **NONE** — no `onWheel` handlers anywhere in menu components | `grep` 0 results across all 5 files |
| CR-376 | **NONE** — no `selectedMenuType`, `activeMenuType`, or menu switch UI | `grep` 0 results in MenuContext + OrderEntry |

---

## Duplicate Checks (all DISTINCT — confirmed)

| ID | Check | Result |
|----|-------|--------|
| CR-374 | BulkEditor UX (CR-036), Bulk Delete (CR-159) — related but do not cover filter panel | **DISTINCT** |
| CR-375 | CR-159 (bulk delete for Normal) — RELATED (CR-159 is the origin of the guard) | **DISTINCT. Related: CR-159** |
| BUG-391 | BUG-386 (PMS GST hardcoded 0.00) — different module | **DISTINCT** |
| BUG-392 | No existing CR/BUG covers scroll-wheel number inputs | **DISTINCT** |
| CR-376 | No existing CR covers menu switch in OrderEntry | **DISTINCT** |

---

## Owner Decisions Still Open

### BUG-391 (Rule R6 — must not touch tax logic without Gate 4 GO):
- OD-391-01: Lock fields (read-only for Aggregator) OR validate on save?
- OD-391-02: Auto-correct existing items on form open, or preserve?
- OD-391-03: BulkEditor wrong rows — red cell + block, or auto-correct?
- OD-391-04: Exactly 5%, or "at least 5%"?
- OD-391-05: Transform safety net (override at transform level)?

### CR-374 (Design LOCKED — OD-01/02 locked, OD-03 defaulted):
- Design frozen: Option A (always-visible strip) + searchable category dropdown
- OD-374-03 defaulted to YES (reset on menu type switch) — owner may override

### CR-375 (BLOCKED — backend brief filed):
- OD-375-01: Path A (backend extends /delete-bulk) or Path B (FE loop)?
- OD-375-02: Warning on Aggregator delete confirm?

### CR-376 (4 ODs open):
- OD-376-01: Allow mixing menu types in one order?
- OD-376-02: Tab strip or dropdown?
- OD-376-03: Reset category on switch?
- OD-376-04: Raw names or custom labels?

---

## Files Updated This Session

| File | Change |
|------|--------|
| `control/registry.json` | +5 entries (CR-374, CR-375, BUG-391, BUG-392, CR-376). Total: 638 items |
| `control/BUG_TRACKER.md` | BUG-391 + BUG-392 rows appended |
| `control/CR_REGISTRY.md` | CR-373, CR-374, CR-375, CR-376 rows appended |
| `control/CONTROL_DASHBOARD.md` | Last Updated line updated |
| `change_requests/CR-374_BULKEDITOR_FILTER_PANEL_*_INTAKE.md` | Created + design locked |
| `change_requests/CR-375_AGGREGATOR_BULK_DELETE_*_INTAKE.md` | Created |
| `change_requests/BUG-391_AGGREGATOR_GST_NOT_ENFORCED_INTAKE.md` | Created |
| `change_requests/BUG-392_SCROLL_WHEEL_NUMBER_INPUTS_INTAKE.md` | Created |
| `change_requests/CR-376_MENU_SWITCH_ORDER_ENTRY_INTAKE.md` | Created |
| `backend_briefs/BACKEND_BRIEF_CR375_2026_09_11.md` | Created (CR-375 unblock) |
| `investigations/INV-MENU-BULK-FILTER-GAP_*` | Created |
| `investigations/INV-AGGREGATOR-GST-ENFORCEMENT-GAP_*` | Created |
| `investigations/INV-SCROLL-WHEEL-NUMBER-INPUTS_*` | Created |
| `investigations/INV-MENU-SWITCH-ORDER-ENTRY_*` | Created |

---

## Recommended Next Steps (for next agent)

### Immediate (owner decisions needed):
1. **BUG-391**: Get OD-391-01 to 05 answers from owner → Gate 2 → Gate 4 GO → Implementation
2. **CR-376**: Get OD-376-01 to 04 answers → Gate 2 → Gate 4 GO → Implementation  
3. **CR-375**: Await backend brief response → unblock → Gate 2

### Ready now (Gate 4 GO from owner):
4. **BUG-392**: No open ODs. Simple 12-line fix across 5 files. Lowest risk. Ready for Gate 4 GO.
5. **CR-374**: Design locked. Gate 2 (Impact Analysis) → Gate 3 (Plan) → Gate 4 GO → Implementation.

### Still pending from before this session:
6. **BUG-390** (P0): ProductForm.jsx — main image upload hidden in Normal menu. Fast Lane eligible. Owner Fast Lane approval pending.
7. **CR-373** (P2): "Use Item Image for Swiggy" toggle. Depends on BUG-390.

---

*Intake complete. 5 items. All at Gate 1. No code changes this session.*
