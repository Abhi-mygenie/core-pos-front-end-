# Impact Analysis — CR-389
## Registry Excel Export: All CRs + BUGs with Status, Description & Tracking Columns

**Date:** 2026-09-26
**Role:** PLANNING (Gate 2)
**Code Reality:** NONE — zero `src/` change
**Conflict Pre-check:** CLEAN — no other open item touches `memory/reports/`
**Risk:** LOW
**Status:** GATE_2_IMPACT_ANALYSIS

---

## 1. Owner Decisions — LOCKED (2026-09-26)

| # | Decision | Locked Value |
|---|---|---|
| OD-389-01 | Area value set | **(b) POS / PMS / INV / CRM / SHARED** |
| OD-389-02 | Columns | **(a) All 21 columns** |
| OD-389-03 | Include non-CR/BUG IDs | **(a) Include all 731 items with Type column** |
| OD-389-04 | Description depth | **(b) 3–5 lines for OPEN items, 1 line for CLOSED** |

---

## 2. Source Data Audit (Live — 2026-09-26)

| Metric | Value |
|---|---|
| **Total registry items** | **731** (updated from intake estimate of 728) |
| Type breakdown | BUG 470 (446 uppercase + 24 lowercase) · CR 251 (220 + 31 lowercase) · INVESTIGATION 5 · GAP 1 · unknown 4 |
| CLOSED items | ~236 → 1-line description only (OD-389-04) |
| OPEN / active items | ~495 → 3–5 line description mined from intake docs |
| Intake docs on disk | 149 files in `memory/change_requests/` |
| Registry items with intake doc match | 148 / 731 (~20%) |
| `priority`/`severity` present | 581 / 731 (79%) — remainder inferred from title |
| `risk` present | 477 / 731 (65%) |
| `area` present | 234 / 731 (32%) — remainder inferred (see §4) |
| `registered` / `created` / `created_at` | 351 / 731 (48%) |
| Sprint keys (top) | pos_5_0 (265) · none (134) · pos_5_1 (83) · pos_pms_1 (59) · pos_4_0 (49) |

---

## 3. Data Flow

```
registry.json (731 items)
    ↓  primary source
memory/change_requests/*.md
    ↓  description mining (148 files matched)
memory/control/BUG_TRACKER.md + CR_REGISTRY.md
    ↓  fallback description (title + tracker row text)
registry_export.py
    ↓  builds rows, normalises fields, infers area, mines descriptions
REGISTRY_EXPORT_YYYY_MM_DD.xlsx
    → Sheet: All Items   (731 rows, 21 columns)
    → Sheet: Open Only   (filtered: status ≠ CLOSED/DUPLICATE/WONT-FIX/PARKED)
    → Sheet: Summary     (pivot: Type×Status, Area, Sprint)
```

**BREAK POINT / risk:** None — read-only over memory files. No API call, no `src/` touch.

---

## 4. Area Inference Logic (OD-389-01 b)

For items without an explicit `area` field, the script infers from title keywords:

| Area | Keywords (case-insensitive) |
|---|---|
| **PMS** | pms, room, checkin, check-in, checkout, check-out, frontdesk, front-desk, folio, housekeeping, booking, reservation, arrival, departure, laundry, night audit |
| **INV** | inventor, stock, purchase, ingredient, recipe, smart purchase, wastage, vendor |
| **CRM** | crm, customer, loyalty, wallet, coupon, credit |
| **SHARED** | sidebar, printer, printing, auth, login, permission, deploy, security, env, settings, notification, socket, firebase |
| **POS** | everything else (default) |

If `area` is already set in registry, use it as-is.

---

## 5. Description Mining Strategy (OD-389-04 b)

| Item state | Source | Format |
|---|---|---|
| OPEN (status ≠ CLOSED/DUP/WONT/PARKED) | Intake doc §Summary or first paragraph | 3–5 lines: symptom · root cause (if known) · fix shape · blast radius |
| CLOSED / DUPLICATE / WONT-FIX / PARKED | Registry `title` + `notes` field | 1 line |
| No intake doc + OPEN | Registry `title` + `notes` field | 1–2 lines |

---

## 6. Files Affected

| Action | Path | Notes |
|---|---|---|
| **CREATE** | `memory/reports/registry_export.py` | Generator script, re-runnable |
| **CREATE** | `memory/reports/REGISTRY_EXPORT_<YYYY_MM_DD>.xlsx` | Output — regenerated on each run |
| **READ** | `memory/control/registry.json` | Source of truth |
| **READ** | `memory/change_requests/*.md` | Description mining |
| **NO CHANGE** | `frontend/src/**` | Zero app code |
| **NO CHANGE** | `memory/control/registry.json` | Read-only |

---

## 7. Dependencies

| Dependency | Type | Notes |
|---|---|---|
| `openpyxl` | Python package | Local tooling only — NOT added to `frontend/package.json` or `backend/requirements.txt` |
| Python 3.x | Runtime | Already available in environment |

Install command (local only): `pip install openpyxl`

---

## 8. Verification Matrix (seeds QA handover)

| # | Check | How to verify |
|---|---|---|
| V-1 | Script runs without error | `python3 memory/reports/registry_export.py` → exit 0 |
| V-2 | Row count = 731 on "All Items" sheet | Open xlsx, check row count (excluding header) |
| V-3 | "Open Only" sheet has fewer rows than "All Items" | Filter validation |
| V-4 | "Summary" sheet has pivot tables | Verify Type×Status, Area, Sprint tabs present |
| V-5 | Spot-check 5 OPEN items: description is 3–5 lines | Manual review |
| V-6 | Spot-check 5 CLOSED items: description is 1 line | Manual review |
| V-7 | All 21 columns present in header row | Column count check |
| V-8 | No `None` or `null` literals in ID column | Visual scan |
| V-9 | Type column normalised (no lowercase `cr`/`bug`) | Filter Type column |
| V-10 | Re-run produces fresh-dated file without error | Run again, check new date stamp |

---

## 9. Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: CR-389 → status: IMPLEMENTED, sprint_key: sep_bug_closure
- [ ] CR_REGISTRY.md: row updated
- [ ] FILE_OWNERSHIP.md: memory/reports/registry_export.py added
- [ ] Code markers: # CR-389 comment in registry_export.py
```

---

```
Gate 2 complete: CR-389
Code reality: NONE
Conflict pre-check: CLEAN
Risk: LOW
Files WILL change: memory/reports/registry_export.py (NEW) + REGISTRY_EXPORT_*.xlsx (NEW)
Files WILL NOT touch: frontend/src/**, memory/control/registry.json, backend/**
Owner decisions: OD-389-01..04 ALL LOCKED
Next: Gate 3 Implementation Plan
```
