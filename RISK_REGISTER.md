# RISK_REGISTER

## Method
Risks below are based on current code evidence. They are not predictions of failure certainty; they are observed implementation conditions that may create operational, maintenance, or security risk.

---

## Risk 1: Working tree / source-control state is unclear
- **Finding:** visible project files appear as untracked in `git status --short`.
- **Evidence/files:** git status output from `/app`.
- **Confidence level:** High
- **Impact:** difficult to determine reviewed baseline, ownership history, or whether current snapshot matches remote source of truth.
- **Recommendation:** confirm whether repo was intentionally copied into `/app` without preserved tracking metadata.

## Risk 2: Backend is monolithic and highly centralized
- **Finding:** environment loading, DB setup, models, routes, and persistence are all inside `/app/backend/server.py`.
- **Evidence/files:** `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** small today, but any new feature work will likely increase coupling and make ownership less clear.
- **Recommendation:** document this as a structural risk in future planning discussions.

## Risk 3: Frontend route definition contains duplicate `Home` mapping
- **Finding:** `/` renders `Home` and also defines nested index route rendering `Home` again.
- **Evidence/files:** `/app/frontend/src/App.js` lines 43-47
- **Confidence level:** High
- **Impact:** route ownership is ambiguous and duplication may confuse future changes.
- **Recommendation:** confirm whether nested route structure is intentional.

## Risk 4: Frontend API call has no user-facing error handling
- **Finding:** backend call result is only logged to console; failures are only logged to console.
- **Evidence/files:** `/app/frontend/src/App.js`
- **Confidence level:** High
- **Impact:** connectivity issues may be invisible to end users and easy to miss in manual testing.
- **Recommendation:** keep in mind during future UX or observability work.

## Risk 5: Frontend has external runtime scripts outside React ownership
- **Finding:** `public/index.html` loads an external Emergent script and initializes PostHog via inline script.
- **Evidence/files:** `/app/frontend/public/index.html`
- **Confidence level:** High
- **Impact:** runtime behavior/privacy/performance issues may originate outside React source control boundaries.
- **Recommendation:** include HTML shell and external scripts in audit scope.

## Risk 6: PostHog configuration is hardcoded in HTML shell
- **Finding:** PostHog key and host are embedded directly in `public/index.html`.
- **Evidence/files:** `/app/frontend/public/index.html` lines around `posthog.init(...)`
- **Confidence level:** High
- **Impact:** configuration is not environment-scoped in the current implementation and may be harder to vary per environment.
- **Recommendation:** document as current implementation detail requiring conscious ownership.

## Risk 7: Toast infrastructure may be partially wired
- **Finding:** toast state/store exists, toaster component exists, but visible app composition does not show `Toaster` mounted.
- **Evidence/files:** `/app/frontend/src/hooks/use-toast.js`, `/app/frontend/src/components/ui/toaster.jsx`, `/app/frontend/src/App.js`
- **Confidence level:** Medium-High
- **Impact:** future developers may assume toast notifications are operational when they may not render.
- **Recommendation:** verify runtime mounting before relying on toast UX.

## Risk 8: Timestamp storage uses ISO strings instead of native MongoDB date values
- **Finding:** `POST /api/status` serializes datetime with `.isoformat()` before insert; `GET /api/status` converts strings back to datetime.
- **Evidence/files:** `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** date querying/sorting/interop behavior may become fragile if future features assume native date storage.
- **Recommendation:** record as current persistence behavior and validate before building date-heavy features.

## Risk 9: Backend startup depends on env and DB setup at import time
- **Finding:** Mongo client and DB selection are created at module import time.
- **Evidence/files:** `/app/backend/server.py` lines 14-20
- **Confidence level:** High
- **Impact:** startup and testing are sensitive to env/database readiness; failure modes happen early in process lifecycle.
- **Recommendation:** include this in operations/debugging notes.

## Risk 10: Requirements file suggests capabilities not present in visible code
- **Finding:** backend dependencies include auth, crypto, data, multipart, AWS-related packages not used in `server.py`.
- **Evidence/files:** `/app/backend/requirements.txt`, `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** maintainers may overestimate implemented features or struggle to identify true runtime dependencies.
- **Recommendation:** distinguish “declared dependency inventory” from “active code usage.”

## Risk 11: Large generated UI surface may obscure actual app complexity
- **Finding:** 46 UI primitive files exist, while current app screen is minimal and does not visibly use them.
- **Evidence/files:** `/app/frontend/src/components/ui/*.jsx`, `/app/frontend/src/App.js`
- **Confidence level:** High
- **Impact:** module count can mislead sizing, review effort, and ownership assumptions.
- **Recommendation:** track generated/shared UI separately from feature modules.

## Risk 12: No visible auth on backend endpoints
- **Finding:** current routes are publicly accessible in visible code and no auth middleware/dependency is applied.
- **Evidence/files:** `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** if these routes were expected to be protected, current implementation does not show that.
- **Recommendation:** confirm intended exposure model.

## Risk 13: Requested focus areas are mostly absent from code
- **Finding:** no visible socket flow, printing flow, auth flow, or order calculation flow was found.
- **Evidence/files:** repository searches plus review of active app files.
- **Confidence level:** Medium-High
- **Impact:** mismatch may exist between stakeholder expectations and current implementation reality.
- **Recommendation:** align stakeholders around what is actually implemented versus expected.

## Risk 14: Test coverage evidence is weak in current snapshot
- **Finding:** visible `/app/tests` content only shows `__init__.py`; runtime verification was mostly manual/basic.
- **Evidence/files:** `/app/tests/__init__.py`, directory listing.
- **Confidence level:** High
- **Impact:** regressions could go undetected as features are added.
- **Recommendation:** confirm whether tests live elsewhere or are externally managed.

## Risk 15: CORS configuration is broad in current env
- **Finding:** backend `.env` sets `CORS_ORIGINS="*"`, and middleware splits env string to configure allowed origins.
- **Evidence/files:** `/app/backend/.env`, `/app/backend/server.py`
- **Confidence level:** High
- **Impact:** broad cross-origin exposure may be acceptable for dev but has security/operational implications if used elsewhere.
- **Recommendation:** document as current environment behavior, not inferred policy.
