# CR-370 — Stale Doc Corrections (5 Records from Audit §3)

**ID:** CR-370  
**Type:** CR  
**Date:** 2026-09-08  
**Registered by:** INTAKE agent (AUDIT track)  
**Sprint:** pos_audit_1  

---

## 1. Summary

Five documentation corrections identified during the 2026-09-06 audit. All are stale or incorrect records in the control layer. No `frontend/src/` changes.

---

## 2. Scope — 5 Corrections

### C1 — Reword "v1 defunct" in INV report + OG-PMS-016
**File:** `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md` — "Critical Change" paragraph  
**File:** `control/OPEN_GAPS_REGISTER.md` — OG-PMS-016  
**Current (wrong):** "All `/api/v1/` order endpoints now 404 — use `/api/v2/`"  
**Correct:** Only order-family endpoints moved to v2; 12/14 probed v1 routes still live; 4 routes are 403 (permission-scoped, not defunct).  
**Evidence:** `evidence/BASELINE-2026-09/api_probe_v1_v2_2026_09_06.md`

### C2 — Update PRD.md open issues
**File:** `PRD.md` — Open Issues section  
**Remove:** "CRM API Keys truncated (P0)" — obsolete; `.env` has valid JSON (confirmed 2026-09-06).  
**Add:** F-SEC-01 (internal files publicly accessible), F-SEC-02 (71 HTML briefs in public/), F-QA-01 (3 fake Jest tests), F-QA-02 (56 failing tests).

### C3 — Add source-of-truth note to CONTROL_DASHBOARD.md
**File:** `control/CONTROL_DASHBOARD.md` — Current Deployment table  
**Add line:** "Source of truth: `PMS1` branch. Pod = working copy; sync via Save to GitHub after each coding session."

### C4 — Create control/ENV_REGISTRY.md
**File:** `control/ENV_REGISTRY.md` (NEW)  
**Content:** Key names + purpose + owner, **never values**. Covers all `REACT_APP_*` vars, Firebase keys, CRM base URL, socket URL, Google Maps key, WDS port.  
**Why:** Boot Preflight in v0.8 fails if this file is missing/empty.

### C5 — Populate test_credentials.md alias mapping
**File:** `/app/memory/test_credentials.md`  
**Content:** Alias → account mapping (values held by owner; agent writes alias names only).  
**Why:** Boot Preflight in v0.8 fails if file is empty.

---

## 3. Classification

- **Type:** CR
- **Area:** Control Layer / Documentation
- **Priority:** P2
- **Risk:** LOW
- **Risk reason:** Doc-only. No `frontend/src/` changes.
- **Fast Lane eligible:** NO (6 files, exceeds 1-file limit)

---

## 4. Evidence

- **Source:** AUDIT-DISCOVERED — `SESSION_HANDOVER_2026_09_06_AUDIT_BASELINE_PROMPT_V08.md` §3
- **Confidence:** CONFIRMED — API probe evidence at `evidence/BASELINE-2026-09/`

---

## 5. Duplicate Check

- No existing CR for these specific doc corrections.
- **Result: DISTINCT**

---

## 6. Code Reality Check

```
ls /app/memory/control/ENV_REGISTRY.md → NOT EXISTS
test_credentials.md → EXISTS but empty
```

- **Code reality: NONE** (no corrections applied yet)

---

## 7. Blast Radius

- Files: `INV_CR363_CR364_CR366_API_IMPACT_ANALYSIS.md`, `control/OPEN_GAPS_REGISTER.md`, `PRD.md`, `control/CONTROL_DASHBOARD.md`, `control/ENV_REGISTRY.md` (NEW), `test_credentials.md`
- Hotspot files: NO
- Scope: SMALL–MEDIUM (6 doc files)

---

## 8. Owner Decisions

- **OD-CR370-01:** C5 (test_credentials.md) — owner to provide alias names in next session so agent can populate without writing real values.

---

## 9. Related

- **Source:** F-DRIFT-01..07 from `control/PROJECT_BASELINE_2026_09.md`
- **Enables:** CR-369 (ENV_REGISTRY.md is a Boot Preflight requirement in v0.8)
