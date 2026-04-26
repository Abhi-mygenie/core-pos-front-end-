# OPEN_QUESTIONS_FINAL_RESOLUTION

## Review scope
- Source questions: `/app/memory/analysis/OPEN_QUESTIONS_FROM_CODE.md`
- Code baseline reviewed: current `step2` branch in `/app`
- V3 evidence source actually present in repo: `/app/v3/*`
- Important path note: the task brief references `/app/memory/v3/`, but this checkout contains V3 documents under `/app/v3/`. Future agents should treat `/app/v3/` as the actual V3 source and flag the path mismatch instead of assuming missing docs.
- Source-of-truth rule applied: code > current-state docs > analysis docs > V3 intent/decision docs when they do not conflict with code.

## Resolution summary
- Total questions reviewed: 12
- ANSWERED_IN_V3: 1
- PARTIALLY_ANSWERED_IN_V3: 4
- NOT_ANSWERED: 0
- CONFLICTING_WITH_CODE: 2
- NEEDS_OWNER_DECISION: 5

---

## OQ-01
- **Question ID:** OQ-01
- **Original question:** What is the canonical frontend environment contract?
- **Area/module:** App bootstrap / configuration / deployment
- **Why it matters:** Deployment and local setup are unreliable unless the actual required env names and ownership are clear.
- **Recommended owner:** Tech / API
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** V3 confirms there is no `.env.example`, and that code requires `REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`, Firebase vars, CRM vars, optional Google Maps key, and optional `ENABLE_HEALTH_CHECK`. V3 does not settle the canonical contract against ops guidance.
- **V3 document reference:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md:378-394`, `/app/v3/OWNER_REVIEW_PACKET.md:197-215`, `/app/v3/DOC_VS_CODE_GAP.md:137-153`
- **Code reference, if applicable:** `/app/frontend/src/api/axios.js:5-8`, `/app/frontend/src/api/socket/socketEvents.js:8-12`, `/app/frontend/src/api/crmAxios.js:8-20`, `/app/frontend/src/config/firebase.js:5-15`, `/app/frontend/src/components/order-entry/AddressFormModal.jsx:5`, `/app/frontend/craco.config.js:11`
- **Conflict note, if any:** Environment/setup instructions in task mention `REACT_APP_BACKEND_URL`, but code does not use it. Current code requires split envs instead.
- **Can be included in final architecture docs?** Yes, as a documented current-state contract plus an unresolved owner decision.
- **What future agents should do:** Use the code-level env names above as implementation truth for this branch; do not rename envs or “simplify” them unless a Tech/API owner explicitly approves a canonical contract.

---

## OQ-02
- **Question ID:** OQ-02
- **Original question:** What is the intended source of truth for table status: socket table channel or derived order state?
- **Area/module:** Realtime / tables / orders
- **Why it matters:** This determines how future bug fixes and refactors should model table occupancy and locking.
- **Recommended owner:** Tech / API
- **Resolution status:** `PARTIALLY_ANSWERED_IN_V3`
- **Answer found in V3, if any:** V3 correctly notes stale comments and confirms the `update-table` channel is active in the audited branch. It does not fully settle architectural precedence between table events and order-derived state for all future changes.
- **V3 document reference:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md:26-29,271-289,407-408`, `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md:33,47-53`
- **Code reference, if applicable:** `/app/frontend/src/api/socket/useSocketEvents.js:143-179`, `/app/frontend/src/api/socket/socketHandlers.js:466-502`, `/app/frontend/src/api/socket/socketHandlers.js:123-132,266-272`
- **Conflict note, if any:** Code and comments conflict. Comments say table channel was removed, but code still subscribes to it and also derives table status from order flows.
- **Can be included in final architecture docs?** Yes, but only as “current implementation uses both paths; comments are stale; precedence is not formally finalized.”
- **What future agents should do:** Treat current implementation as dual-path: keep `update-table` subscription behavior intact and avoid removing either path without validating order/table event sequencing and backend contract.

---

## OQ-03
- **Question ID:** OQ-03
- **Original question:** Which local settings should remain device-local versus move to user-level or restaurant-level persistence?
- **Area/module:** Status config / dashboard preferences / station config
- **Why it matters:** This affects operational consistency across terminals and future admin-governed rollout.
- **Recommended owner:** Product / Tech / Business
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** V3 confirms current implementation is heavily localStorage-based and raises owner review items, but does not define the future scope split.
- **V3 document reference:** `/app/v3/OWNER_REVIEW_PACKET.md` (related governance framing), `/app/v3/RISK_REGISTER.md:43-49`
- **Code reference, if applicable:** `/app/frontend/src/pages/StatusConfigPage.jsx:10-53,403-417`, `/app/frontend/src/pages/DashboardPage.jsx:219-304,421-472`, `/app/frontend/src/components/layout/Header.jsx`, `/app/frontend/src/contexts/StationContext.jsx`, `/app/frontend/src/contexts/SettingsContext.jsx:4-26`
- **Conflict note, if any:** None.
- **Can be included in final architecture docs?** Yes, as a current-state rule: these settings are currently device-local; future persistence scope is unresolved.
- **What future agents should do:** Preserve localStorage behavior unless a Product/Tech decision defines which keys move to user/admin/server scope. Any migration must include backward compatibility and conflict-resolution rules.

---

## OQ-04
- **Question ID:** OQ-04
- **Original question:** Is the backend scaffold in this repo meant to be used, ignored, or replaced?
- **Area/module:** Repo architecture / backend boundary
- **Why it matters:** This changes how future agents document ownership, dependencies, and deployment assumptions.
- **Recommended owner:** Tech / Business
- **Resolution status:** `PARTIALLY_ANSWERED_IN_V3`
- **Answer found in V3, if any:** V3 acknowledges a backend scaffold exists but says intent is not provable from code.
- **V3 document reference:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md:39-40`, `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md:61`, `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md:85-92`
- **Code reference, if applicable:** `/app/backend/server.py:1-89`, `/app/backend/requirements.txt`
- **Conflict note, if any:** None. The scaffold exists, but it is generic and not evidence of the real POS backend.
- **Can be included in final architecture docs?** Yes, with explicit limitation language.
- **What future agents should do:** Treat `/app/backend` as a repo artifact present in this branch, not as the authoritative POS backend, unless an owner explicitly confirms it is in scope.

---

## OQ-05
- **Question ID:** OQ-05
- **Original question:** What is the official payment integration surface in the frontend?
- **Area/module:** Payment / billing / order entry
- **Why it matters:** Revenue-critical changes need one canonical entry point; stale services are dangerous.
- **Recommended owner:** Tech / API
- **Resolution status:** `ANSWERED_IN_V3`
- **Answer found in V3, if any:** V3 consistently identifies the canonical active payment path as the order-entry-driven bill/payment flow and flags `paymentService.collectPayment()` as stale because it references missing `CLEAR_BILL`.
- **V3 document reference:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md:398-416`, `/app/v3/RISK_REGISTER.md:31-32,71-88`, `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md:21-41`
- **Code reference, if applicable:** `/app/frontend/src/api/constants.js:43-46`, `/app/frontend/src/components/order-entry/OrderEntry.jsx` (collect bill and place+pay branches), `/app/frontend/src/api/transforms/orderTransform.js:813-968`, `/app/frontend/src/api/services/paymentService.js:12-14`
- **Conflict note, if any:** None in current branch.
- **Can be included in final architecture docs?** Yes.
- **What future agents should do:** Use the OrderEntry/CollectPaymentPanel → `BILL_PAYMENT` / prepaid order paths as canonical. Do not reuse `paymentService.collectPayment()` unless it is deliberately repaired and re-approved.

---

## OQ-06
- **Question ID:** OQ-06
- **Original question:** Should CRM be considered required, optional, or per-restaurant capability?
- **Area/module:** CRM / customer / delivery address
- **Why it matters:** This affects UX exposure, fallback behavior, onboarding, and support expectations.
- **Recommended owner:** Product / API / Business
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** V3 confirms current soft-fail behavior and owner review need, but does not settle capability policy.
- **V3 document reference:** `/app/v3/RISK_REGISTER.md:75-81`, `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md:89-91`
- **Code reference, if applicable:** `/app/frontend/src/api/crmAxios.js:18-20,55-60`, `/app/frontend/src/api/services/customerService.js`, `/app/frontend/src/components/order-entry/OrderEntry.jsx:127-169`
- **Conflict note, if any:** None.
- **Can be included in final architecture docs?** Yes, as “currently optional/degraded in code, but policy unresolved.”
- **What future agents should do:** Assume CRM is an optional runtime dependency in current code and preserve degraded-mode handling unless a Product/API owner defines mandatory or tiered capability behavior.

---

## OQ-07
- **Question ID:** OQ-07
- **Original question:** What is the long-term strategy for reporting logic: frontend-composed or backend-aggregated?
- **Area/module:** Reports / audit / summary
- **Why it matters:** Reporting complexity, performance, and ownership depend on where aggregation logic lives.
- **Recommended owner:** Tech / API / Business
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** V3 documents the current frontend-heavy implementation and the risk, but does not define the long-term strategy.
- **V3 document reference:** `/app/v3/RISK_REGISTER.md:67-73`, `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md:93-97`
- **Code reference, if applicable:** `/app/frontend/src/api/services/reportService.js`, `/app/frontend/src/pages/AllOrdersReportPage.jsx`, `/app/frontend/src/pages/OrderSummaryPage.jsx`
- **Conflict note, if any:** None.
- **Can be included in final architecture docs?** Yes, as “current implementation” and “future strategy unresolved.”
- **What future agents should do:** Treat `reportService.js` as the current orchestration surface and avoid moving aggregation boundaries without an explicit Tech/API/Business decision.

---

## OQ-08
- **Question ID:** OQ-08
- **Original question:** Are station fetch failures acceptable as empty-state UX, or should they be explicit operational failures?
- **Area/module:** Station / kitchen panel
- **Why it matters:** Silent failure can hide operational issues in a kitchen-facing surface.
- **Recommended owner:** Product / Tech
- **Resolution status:** `PARTIALLY_ANSWERED_IN_V3`
- **Answer found in V3, if any:** V3 clearly identifies the soft-failure pattern as a risk, but does not choose the desired UX/telemetry behavior.
- **V3 document reference:** `/app/v3/RISK_REGISTER.md:51-57,99-105`, `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md:93-97`
- **Code reference, if applicable:** `/app/frontend/src/api/services/stationService.js:201-209`, `/app/frontend/src/components/station-view/StationPanel.jsx:224-247`
- **Conflict note, if any:** None.
- **Can be included in final architecture docs?** Yes, as a warning/guardrail.
- **What future agents should do:** Preserve the current error-return shape unless owner-approved UX changes are made; do not reinterpret empty station data as confirmed success during incident analysis.

---

## OQ-09
- **Question ID:** OQ-09
- **Original question:** Is Firebase push intended to remain on mixed SDK versions?
- **Area/module:** Notifications / Firebase
- **Why it matters:** Version divergence affects maintenance and future push reliability.
- **Recommended owner:** Tech
- **Resolution status:** `CONFLICTING_WITH_CODE`
- **Answer found in V3, if any:** V3 states mixed versions in the audited branch: app runtime on Firebase 12.x and service worker on compat CDN 10.14.1.
- **V3 document reference:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md:29-31,417-422`, `/app/v3/RISK_REGISTER.md:83-89`
- **Code reference, if applicable:** `/app/frontend/package.json` (Firebase runtime dependency), `/app/frontend/public/firebase-messaging-sw.js:7-8`
- **Conflict note, if any:** The architectural concern remains valid, but the exact “intended long-term strategy” is not answered by V3; it only documents the implementation risk. This is therefore a code-backed risk, not a resolved decision.
- **Can be included in final architecture docs?** Yes, as a current implementation conflict/risk, not a settled policy.
- **What future agents should do:** Document current mixed-version implementation accurately; do not claim version strategy is approved or final without a Tech owner decision.

---

## OQ-10
- **Question ID:** OQ-10
- **Original question:** Which sidebar sections are real near-term modules versus placeholders?
- **Area/module:** Navigation / module surface / information architecture
- **Why it matters:** Architecture planning and permission boundaries depend on whether nav items are real modules, panels, or placeholders.
- **Recommended owner:** Product / Business / Tech
- **Resolution status:** `PARTIALLY_ANSWERED_IN_V3`
- **Answer found in V3, if any:** V3 documents that many items are placeholders/panel-only and that the route tree is narrower than the sidebar surface, but it does not classify roadmap intent.
- **V3 document reference:** `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md:73-83`, `/app/v3/RISK_REGISTER.md:107-113`
- **Code reference, if applicable:** `/app/frontend/src/components/layout/Sidebar.jsx:31-109,151-231`, `/app/frontend/src/App.js:31-41`
- **Conflict note, if any:** None.
- **Can be included in final architecture docs?** Yes.
- **What future agents should do:** Treat only routed pages and explicitly opened panels as implemented modules; treat other nav entries as placeholders unless product owners promote them to active scope.

---

## OQ-11
- **Question ID:** OQ-11
- **Original question:** Should view-mode/order-taking/status-config settings be auditable administrative controls?
- **Area/module:** Device controls / permissions / governance
- **Why it matters:** These controls materially change cashier workflow but are currently local-only and unaudited.
- **Recommended owner:** Product / Business / Tech
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** V3 highlights the governance gap and owner questions, but does not settle it.
- **V3 document reference:** `/app/v3/OWNER_REVIEW_PACKET.md` (related product/doc owner questions), `/app/v3/RISK_REGISTER.md:43-49`
- **Code reference, if applicable:** `/app/frontend/src/pages/StatusConfigPage.jsx:47-53,147-157,403-417`, `/app/frontend/src/pages/DashboardPage.jsx:421-472`, `/app/frontend/src/components/layout/Header.jsx`
- **Conflict note, if any:** None.
- **Can be included in final architecture docs?** Yes, as an unresolved governance decision.
- **What future agents should do:** Treat these controls as local terminal/device settings in current implementation; do not present them as centrally governed admin settings unless explicitly changed.

---

## OQ-12
- **Question ID:** OQ-12
- **Original question:** What is the intended lifecycle of room billing rules and print semantics?
- **Area/module:** Room billing / room print / order transforms
- **Why it matters:** Room financial and print behavior is spread across transforms and payment flow; changes here are high-risk.
- **Recommended owner:** Product / API / Business
- **Resolution status:** `CONFLICTING_WITH_CODE`
- **Answer found in V3, if any:** V3 contains room-billing and print decisions from another audited branch, but those exact branch-level findings cannot be treated as final for current `step2` without re-validating every referenced path and bug note in this branch.
- **V3 document reference:** `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md:24-35,271-289,357-375`, `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md:50-58`
- **Code reference, if applicable:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`, `/app/frontend/src/api/transforms/orderTransform.js`, `/app/frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js`, `/app/frontend/src/pages/DashboardPage.jsx:26-39,632-649`
- **Conflict note, if any:** V3 is branch/commit-specific and mixes prior-owner decisions with code audit from a different branch. Current code supports room-specific behavior, but lifecycle/policy ownership is still not centralized in code and not safely finalized by V3 alone.
- **Can be included in final architecture docs?** Yes, only as “current implementation constraints and guardrails,” not as a fully settled product policy.
- **What future agents should do:** Preserve current room billing/print behavior unless product/API owners explicitly redefine it. Any room-related change requires impact analysis across dashboard cards, collect payment, print payloads, and room transfer flows.

---

## Cross-cutting conflicts to carry into final docs
1. **V3 path mismatch**
   - Brief expects `/app/memory/v3/`; actual repo contains `/app/v3/`.
2. **Environment contract mismatch**
   - Task/setup guidance mentions `REACT_APP_BACKEND_URL`; current code requires `REACT_APP_API_BASE_URL` and `REACT_APP_SOCKET_URL` plus other envs.
3. **Health-check plugin drift across document generations**
   - Current `step2` branch contains `frontend/plugins/health-check/*`, while `/app/v3/` documents from another branch say those plugin files are absent.
4. **Branch/commit traceability drift in prior docs**
   - Current-state and V3 docs were produced against other branches/commits and must be used carefully.

## Usage rule for future agents
- Use this file first when a question appears “already answered” in old docs.
- If a question is marked `NEEDS_OWNER_DECISION`, do not silently invent policy.
- If a question is marked `CONFLICTING_WITH_CODE`, prefer current code and carry the conflict note into planning/handover.
- If a question is `PARTIALLY_ANSWERED_IN_V3`, use only the code-backed portion and explicitly call out the remaining unresolved scope.
