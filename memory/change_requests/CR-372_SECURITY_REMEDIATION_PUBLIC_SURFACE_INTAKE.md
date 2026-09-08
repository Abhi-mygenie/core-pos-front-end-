# CR-372 — Security Remediation: Remove Internal Files from Public Surface

**ID:** CR-372  
**Type:** CR  
**Date:** 2026-09-08  
**Registered by:** INTAKE agent (AUDIT track)  
**Sprint:** pos_audit_1  

---

## 1. Summary

The production origin currently serves internal files that should never be publicly accessible: the internal dev control dashboard (`public/__dev/`), 96 HTML design briefs (8.7 MB), and live API keys in `.env`. Additionally, 22 internal preview/comparison routes have no `ProtectedRoute`. These are S1-severity findings from `PROJECT_BASELINE_2026_09.md`.

---

## 2. Scope — 4 Fixes

### F-SEC-01: Move `frontend/public/__dev/` out of public/
**Current:** `public/__dev/` (internal control dashboard) is served at `<origin>/__dev/` — accessible to anyone with the URL. Protected only by client-side SHA-256 (bypassable).  
**Fix:** Move to `/app/memory/dev-dashboard/` (or equivalent outside `public/`). Update any references in `index.html`.  
**Risk:** MEDIUM — touches `public/` and `index.html`.

### F-SEC-02: Move 96 HTML design briefs out of public/
**Current:** 96 `.html` files (mockups, briefs, comparisons, 8.7 MB total) live in `public/` and are served at the production origin URL.  
**Fix:** Move to `/app/memory/design_briefs/` (outside `public/`). Not needed at runtime by the React app.  
**Risk:** LOW — static files only, no app logic.

### F-SEC-03: Add `ProtectedRoute` to 22 internal preview routes
**Current:** Routes like `/compare/*`, `/preview/*`, `/*-mockup`, `/*-beta` have no auth guard — any unauthenticated user can access them.  
**Fix:** Wrap with `<ProtectedRoute>` or gate behind a `PUBLIC_ROUTES.md` justification list.  
**Risk:** MEDIUM — touches App.js routing.

### F-SEC-07: Remove `REACT_APP_CRM_API_KEYS` + `CORS_ORIGINS` from frontend/.env
**Current:** `REACT_APP_CRM_API_KEYS` contains live production API keys in JSON; `CORS_ORIGINS=*` — both are in `frontend/.env` and bundled into the client-side build.  
**Fix:** Remove both vars from `.env`. Confirm whether `REACT_APP_CRM_API_KEYS` is actually consumed by any `src/` code (if yes, move to backend proxy; if no, simply remove).  
**Risk:** HIGH — removing env var could break CRM functionality if consumed in `src/`.

---

## 3. Classification

- **Type:** CR
- **Area:** Security
- **Priority:** P1
- **Risk:** HIGH
- **Risk reason:** F-SEC-07 touches env vars that may affect CRM integration. F-SEC-03 touches App.js routing. Must verify CRM usage before removing key.
- **Fast Lane eligible:** NO

---

## 4. Evidence

- **Source:** AUDIT-DISCOVERED — `PROJECT_BASELINE_2026_09.md` findings F-SEC-01, F-SEC-02, F-SEC-03, F-SEC-07
- **__dev confirmed:** `ls /app/frontend/public/__dev/` → `README.md`, `auth.js`, `backend-brief.html` present
- **HTML count confirmed:** `find /app/frontend/public -name "*.html"` → 96 files
- **CRM key confirmed:** `grep REACT_APP_CRM_API_KEYS /app/frontend/.env` → live keys present
- **Confidence:** CONFIRMED

---

## 5. Duplicate Check

- `DEV-DASHBOARD-001` = built the `__dev/` dashboard (CLOSED). This CR *moves* it — different scope. **RELATED to DEV-DASHBOARD-001.**
- No existing CR for the HTML briefs move or route guarding.
- **Result: DISTINCT** (RELATED to DEV-DASHBOARD-001 for F-SEC-01 only)

---

## 6. Code Reality Check

```
ls /app/frontend/public/__dev/     → EXISTS (confirmed)
find /app/frontend/public -name "*.html" → 96 files (confirmed)
grep REACT_APP_CRM_API_KEYS .env  → live keys present (confirmed)
```

- **Code reality: PARTIAL** — the problem exists; no fix has been applied yet.

---

## 7. Blast Radius

- `public/__dev/` → move to outside public (F-SEC-01)
- `public/*.html` (96 files) → move to memory/ (F-SEC-02)
- `App.js` → add ProtectedRoute to ~22 routes (F-SEC-03)
- `frontend/.env` → remove 2 vars (F-SEC-07)
- `src/` → grep to confirm CRM key usage before removing (F-SEC-07 prerequisite)
- Hotspot files: YES — `App.js` is a hotspot-adjacent file (routing)
- Estimated scope: LARGE (multi-folder restructure + App.js + .env)

---

## 8. Owner Decisions Needed

- **OD-CR372-01 (REQUIRED before F-SEC-03):** Provide or confirm the list of 22 routes that should remain public (e.g., `/login`, `/forgot-password`). All others get `ProtectedRoute`.
- **OD-CR372-02 (REQUIRED before F-SEC-07):** Confirm: is `REACT_APP_CRM_API_KEYS` consumed in any `src/` file? If yes → backend proxy needed before removal. If no → safe to remove.
- **OD-CR372-03:** Where should `__dev/` dashboard live post-move? Options: (a) `/app/memory/dev-dashboard/` accessible only from filesystem · (b) separate internal port · (c) retain but add real server-side auth.

---

## 9. Related

- **Related:** DEV-DASHBOARD-001 (F-SEC-01 scope)
- **Source findings:** F-SEC-01, F-SEC-02, F-SEC-03, F-SEC-07 — `control/PROJECT_BASELINE_2026_09.md`
- **Must NOT start F-SEC-07** until OD-CR372-02 answered (CRM usage check)
- **Must NOT start F-SEC-03** until OD-CR372-01 answered (public route list)
