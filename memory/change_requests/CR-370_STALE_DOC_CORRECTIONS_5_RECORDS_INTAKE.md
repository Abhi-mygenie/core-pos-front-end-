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
**Add line:** "Source of truth: `pms8sep` branch (OD-CR370-02; intake originally said `PMS1`). Pod = working copy; sync via Save to GitHub after each coding session."

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

- **Screenshot:** not provided (doc corrections — no UI screenshot applicable)
- **Steps to reproduce:** not applicable — stale doc corrections identified in audit; each correction item in §2 is self-describing
- **Curl output:** not applicable (C1 — API probe evidence at `evidence/BASELINE-2026-09/api_probe_v1_v2_2026_09_06.md`)
- **Source:** AGENT-DISCOVERED — `SESSION_HANDOVER_2026_09_06_AUDIT_BASELINE_PROMPT_V08.md` §3; confirmed by grep and doc review 2026-09-08
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
  → **RESOLVED 2026-09-08** — aliases provided; file populated.

### Owner Decisions raised at Gate 2 (PLANNING, 2026-09-08) — ALL LOCKED

| OD | Question | Owner decision |
|---|---|---|
| OD-CR370-02 | C3 source-of-truth branch: intake said `PMS1`, dashboard/deployment say `pms8sep` | **`pms8sep`** — update docs so the audit track states this branch |
| OD-CR370-03 | C4 ENV_REGISTRY lists 2 keys as REMOVED while still in `.env` | **(a)** Reword to "PENDING REMOVAL — CR-372-A"; CR-372-A flips to REMOVED on execution |
| OD-CR370-04 | C5 (i) login path `/api/v1/vendor/login` not in code; (ii) cafe103 RID 103 vs 644 | **(i)** code is truth → `/api/v1/auth/vendoremployee/login` (`constants.js:8`); **(ii)** RID **644** |
| OD-CR370-05 | C2 PRD counts: hard-code actuals or reference CRs | **(a)** actual counts: 96 HTML in `public/` (91 move / 5 keep — CR-372-A); 2 fake tests remain (1 of 3 fixed via BUG-382 — CR-368) |
| OD-CR370-06 | PRD "Upcoming Tasks" item 0 stale — expand scope? | **(a)** leave; observation only (R14) |

**Code-validation note (owner request 2026-09-08):** `src/api/constants.js` declares 35 live v1 endpoints (LOGIN, PROFILE, CATEGORIES, PRODUCTS, TABLES, RUNNING_ORDERS…). Only `get-single-order-new`, `order-logs-report`, `pos/room-payment` moved to v2. "v1 defunct" claim is false — confirmed by code, not just probe.

---

## 9. Related

- **Source:** F-DRIFT-01..07 from `control/PROJECT_BASELINE_2026_09.md`
- **Enables:** CR-369 (ENV_REGISTRY.md is a Boot Preflight requirement in v0.8)
---
## INTAKE HANDOVER

```
Item CR-370 registered. Intake doc at change_requests/CR-370_STALE_DOC_CORRECTIONS_5_RECORDS_INTAKE.md.
Code reality: NONE.
Duplicate check: DISTINCT.
Severity: P2 (agent-classified).
Blast radius: SMALL (~6 doc files; NO hotspots).
Evidence: CONFIRMED — API probe evidence at evidence/BASELINE-2026-09/.
Owner decisions needed: OD-CR370-C5 RESOLVED (aliases provided 2026-09-08).
Next: Planning agent for Gates 2-3.
```

---
## PLANNING HANDOVER (2026-09-08)

```
Plan ready at plans/CR-370_IMPLEMENTATION_PLAN.md. 9 edits across 7 doc files (~15 lines).
Code reality: PARTIAL (C1 NONE · C2 PARTIAL · C3 FULL/wording · C4 FULL/drift · C5 FULL/drift).
Scope: WILL change — INV_CR363…md, OPEN_GAPS_REGISTER.md, PRD.md, this intake, ENV_REGISTRY.md, test_credentials.md, CONTROL_DASHBOARD.md header / WILL NOT touch — frontend/src, public, .env, App.js, craco.config.js, memory/final/*.
Verification matrix: 13 checks (11 grep-automated, 2 script).
Owner decisions needed: none — OD-CR370-01..06 all locked.
Awaiting Gate 4 GO.
```
