# CR-372-A — Security: File Moves + .env Cleanup (Zero src/ changes)

**ID:** CR-372-A  
**Type:** CR  
**Parent:** CR-372 (SPLIT 2026-09-08)  
**Date:** 2026-09-08  
**Registered by:** INTAKE agent (AUDIT track)  
**Sprint:** pos_audit_1  

---

## 1. Summary

Three security fixes from CR-372 that require **zero `frontend/src/` code changes**. Pure file moves + one `.env` line removal. Can be executed in a single session without a Gate 4 GO approval for code.

---

## 2. Scope — 3 Fixes

### F-SEC-01: Move `public/__dev/` → `/app/memory/dev-dashboard/`
- Move entire `public/__dev/` directory to `/app/memory/dev-dashboard/`
- `index.html` has zero references (confirmed) — no edits needed
- Result: internal dashboard no longer served from production origin URL

### F-SEC-02: Move ~91 HTML briefs → `/app/memory/design_briefs/`
- Move all `.html` files from `public/` **except** the 5 PMS carve-outs:
  - KEEP: `cr358-p2-v3-mockup.html`, `cr358-p3-design-comparison.html`, `cr358-p4-pms-mockup.html`, `comparison_room_ui.html`, `MyGenie_PMS_Screen_Reference.pdf`
- 2 `src/` files have comment-only references (`// Design frozen: /public/...`) — these are doc comments only, not imports. No src/ edit needed.
- Result: ~91 internal design briefs no longer served from production origin

### F-SEC-07: Remove `REACT_APP_CRM_API_KEYS` + `CORS_ORIGINS` from `frontend/.env`
- Remove 2 lines from `frontend/.env`
- `crmAxios.js` confirmed: key already removed from active use (comment only)
- No `src/` file consumes these vars (confirmed by grep)
- Result: live API keys no longer bundled into client-side build

---

## 3. Classification

- **Type:** CR
- **Area:** Security / File Structure
- **Priority:** P1
- **Risk:** LOW
- **Risk reason:** Zero `frontend/src/` changes. File moves + 2-line `.env` edit only.
- **Fast Lane eligible:** NO (multi-file, structural)

---

## 4. Evidence

- **Source:** Split from CR-372 (2026-09-08)
- `index.html` grep for `__dev`: NONE — confirmed
- `crmAxios.js` CRM key usage: comment only — confirmed
- **Confidence:** CONFIRMED

---

## 5. Duplicate Check

- Split from CR-372. RELATED to DEV-DASHBOARD-001 (F-SEC-01 scope).
- **Result: DISTINCT** (sub-scope of split parent)

---

## 6. Code Reality Check

- `public/__dev/` EXISTS (to be moved)
- HTML briefs in `public/`: 96 files (91 to move, 5 PMS carve-outs)
- `.env` CRM_API_KEYS + CORS_ORIGINS: PRESENT (to be removed)
- **Code reality: PARTIAL** — problem exists, no fix applied

---

## 7. Blast Radius

- `public/__dev/` (directory move)
- `public/*.html` (~91 files moved)
- `frontend/.env` (2 lines removed)
- `frontend/src/`: **ZERO changes**
- Hotspot files: NO
- Scope: MEDIUM (file moves)

---

## 8. Owner Decisions

All answered via CR-372 OD-CR372-01/02/03. No new decisions needed.

---

## 9. Related

- **Parent:** CR-372 (SPLIT)
- **Sibling:** CR-372-B (App.js route guarding — separate gate cycle)
- **Related:** DEV-DASHBOARD-001
- **PMS carve-out:** revisit at PMS sprint `pos_pms_1` closure
