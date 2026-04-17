# OPEN_QUESTIONS_FROM_CODE

## Purpose
These questions arise from gaps, contradictions, or uncertainty in the inspected code. They are intended to support the next review round.

---

## 1. Source control baseline
- **Question:** Why does `git status --short` show the project files as untracked in `/app`?
- **Evidence/files:** git status output.
- **Confidence level:** High
- **Impact:** without a reliable baseline, code history and review provenance are unclear.
- **Recommendation:** confirm whether `/app` is a fresh copy, partial checkout, or intentionally detached workspace.

## 2. Scope mismatch vs requested focus areas
- **Question:** Are socket flow, printing flow, auth/token handling, and order calculation implemented in another repo/service not present here?
- **Evidence/files:** searches over `/app`; `/app/frontend/src/App.js`; `/app/backend/server.py`.
- **Confidence level:** Medium-High
- **Impact:** current repo does not provide evidence for most requested analysis domains.
- **Recommendation:** confirm whether additional code locations should be included in Phase 2.

## 3. Route duplication intent
- **Question:** Is the nested `<Route index element={<Home />} />` inside the `/` route intentional, or leftover starter code?
- **Evidence/files:** `/app/frontend/src/App.js`
- **Confidence level:** High
- **Impact:** route ownership and intended composition are unclear.
- **Recommendation:** confirm intended routing pattern.

## 4. Toast mounting
- **Question:** Is `Toaster` mounted anywhere outside `App.js`, or is toast infrastructure currently dormant?
- **Evidence/files:** `/app/frontend/src/components/ui/toaster.jsx`, `/app/frontend/src/App.js`.
- **Confidence level:** Medium-High
- **Impact:** notification UX readiness is uncertain.
- **Recommendation:** confirm expected toast entrypoint.

## 5. External Emergent script behavior
- **Question:** What runtime behavior is introduced by `https://assets.emergent.sh/scripts/emergent-main.js`?
- **Evidence/files:** `/app/frontend/public/index.html`
- **Confidence level:** High for presence, Low for internal behavior
- **Impact:** external script may affect UI, telemetry, editing overlays, or runtime behavior beyond repo visibility.
- **Recommendation:** confirm whether this script is required in production and what team owns it.

## 6. PostHog ownership and environment strategy
- **Question:** Is the hardcoded PostHog key/host in `public/index.html` intentional for all environments?
- **Evidence/files:** `/app/frontend/public/index.html`
- **Confidence level:** High
- **Impact:** analytics ownership/config strategy is unclear.
- **Recommendation:** confirm whether analytics config is expected to be static or env-driven.

## 7. Backend dependency intent
- **Question:** Are the many unused backend dependencies intentional template carryover, or is code missing from the current snapshot?
- **Evidence/files:** `/app/backend/requirements.txt`, `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** affects understanding of true backend scope and maintenance burden.
- **Recommendation:** confirm which dependencies are required by actual runtime paths.

## 8. Mongo date storage choice
- **Question:** Was storing timestamps as ISO strings a deliberate persistence choice, or a convenience implementation?
- **Evidence/files:** `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** future reporting/sorting/filtering behavior may depend on this answer.
- **Recommendation:** clarify before expanding data access patterns.

## 9. Health-check plugin intent
- **Question:** Are the frontend webpack health endpoints meant only for local development, or part of a broader platform contract?
- **Evidence/files:** `/app/frontend/craco.config.js`, `/app/frontend/plugins/health-check/*`, `/app/frontend/.env`
- **Confidence level:** High
- **Impact:** determines whether these modules should be considered operationally important or just optional tooling.
- **Recommendation:** confirm intended deployment environments for these endpoints.

## 10. Test strategy
- **Question:** Where do meaningful frontend/backend tests live, if not in the visible `/app/tests` tree?
- **Evidence/files:** `/app/tests/__init__.py`, directory listing.
- **Confidence level:** High
- **Impact:** lack of visible tests limits confidence in current behavior claims beyond direct inspection/runtime spot-checks.
- **Recommendation:** confirm whether tests are external, generated, or not yet implemented.

## 11. Backend entrypoint ownership
- **Question:** What exact supervisor command/module launches the backend process?
- **Evidence/files:** supervisor status confirms process exists, but launch config was not part of inspected code snapshot.
- **Confidence level:** Medium
- **Impact:** useful for full deployment/runtime architecture mapping.
- **Recommendation:** inspect supervisor config in a later phase if operational documentation is needed.

## 12. Runtime use of generated UI inventory
- **Question:** Which of the 46 generated UI primitives are intentionally kept for future use versus leftover scaffold?
- **Evidence/files:** `/app/frontend/src/components/ui/*.jsx`, `/app/frontend/src/App.js`
- **Confidence level:** Medium
- **Impact:** affects maintainability and ownership clarity.
- **Recommendation:** confirm whether the UI library is considered part of the baseline platform or app-specific code.
