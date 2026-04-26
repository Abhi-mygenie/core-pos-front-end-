# OPEN_QUESTIONS_FINAL_RESOLUTION

## Review scope
- Source questions: `/app/memory/analysis/OPEN_QUESTIONS_FROM_CODE.md`
- Allowed evidence used for this document:
  - `/app/memory/current-state/*`
  - `/app/memory/analysis/*`
  - current code in `/app`
- Explicitly **not used**: `/app/v3/*` and any other memory paths outside the two allowed folders above
- Source-of-truth rule applied: code > current-state docs > analysis docs

## Resolution summary
- Total questions reviewed: 12
- ANSWERED_IN_V3: 0
- PARTIALLY_ANSWERED_IN_V3: 0
- NOT_ANSWERED: 3
- CONFLICTING_WITH_CODE: 0
- NEEDS_OWNER_DECISION: 9

---

## OQ-01
- **Question ID:** OQ-01
- **Original question:** What is the canonical frontend environment contract?
- **Area/module:** App bootstrap / configuration / deployment
- **Why it matters:** Deployment/setup will remain fragile unless the required env names and ownership are explicitly defined.
- **Recommended owner:** Tech / API
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/axios.js:5-8`, `/app/frontend/src/api/socket/socketEvents.js`, `/app/frontend/src/api/crmAxios.js:8-20`, `/app/frontend/src/config/firebase.js:5-15`, `/app/frontend/src/components/order-entry/AddressFormModal.jsx:5`, `/app/frontend/craco.config.js:11`
- **Conflict note, if any:** None carried from excluded sources. The code clearly uses multiple env variables, but no owner-approved canonical contract is documented in allowed sources.
- **Whether it can be included in final architecture docs:** Yes, as current implementation truth plus unresolved policy.
- **What future agents should do:** Use current code-level env names as implementation truth. Do not rename or consolidate env variables without explicit owner approval.

---

## OQ-02
- **Question ID:** OQ-02
- **Original question:** What is the intended source of truth for table status: socket table channel or derived order state?
- **Area/module:** Realtime / tables / orders
- **Why it matters:** Future bug fixes and refactors depend on whether table occupancy is authoritative from table events, order events, or both.
- **Recommended owner:** Tech / API
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/socket/useSocketEvents.js:143-179`, `/app/frontend/src/api/socket/socketHandlers.js:123-132,266-272,466-502`
- **Conflict note, if any:** Current code uses both table-channel updates and order-derived table updates. Allowed docs identify the ambiguity but do not resolve precedence.
- **Whether it can be included in final architecture docs:** Yes, as a current implementation warning and unresolved decision.
- **What future agents should do:** Treat both paths as live implementation. Do not remove either path without full socket/order/table contract review.

---

## OQ-03
- **Question ID:** OQ-03
- **Original question:** Which local settings should remain device-local versus move to user-level or restaurant-level persistence?
- **Area/module:** Status config / dashboard preferences / station config
- **Why it matters:** Settings scope affects operational consistency and future admin governance.
- **Recommended owner:** Product / Tech / Business
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/pages/StatusConfigPage.jsx`, `/app/frontend/src/pages/DashboardPage.jsx`, `/app/frontend/src/contexts/StationContext.jsx`, `/app/frontend/src/contexts/SettingsContext.jsx`
- **Conflict note, if any:** None.
- **Whether it can be included in final architecture docs:** Yes, as current-state device-local behavior plus unresolved future scope.
- **What future agents should do:** Preserve device-local behavior unless Product/Tech/Business define a different persistence model.

---

## OQ-04
- **Question ID:** OQ-04
- **Original question:** Is the backend scaffold in this repo meant to be used, ignored, or replaced?
- **Area/module:** Repo architecture / backend boundary
- **Why it matters:** Repo-boundary decisions affect architecture ownership, deployment assumptions, and future documentation.
- **Recommended owner:** Tech / Business
- **Resolution status:** `NOT_ANSWERED`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/backend/server.py`, `/app/backend/requirements.txt`
- **Conflict note, if any:** None. Allowed sources confirm the backend folder exists but do not define intent.
- **Whether it can be included in final architecture docs:** Yes, with explicit limitation language.
- **What future agents should do:** Treat `/app/backend` as present-in-repo but not confirmed product backend. Do not assume ownership or production relevance.

---

## OQ-05
- **Question ID:** OQ-05
- **Original question:** What is the official payment integration surface in the frontend?
- **Area/module:** Payment / billing / order entry
- **Why it matters:** Revenue-critical changes need a single canonical entry point.
- **Recommended owner:** Tech / API
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/constants.js:43-46`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`, `/app/frontend/src/api/transforms/orderTransform.js:813-968`, `/app/frontend/src/api/services/paymentService.js:12-14`
- **Conflict note, if any:** Code strongly suggests OrderEntry/CollectPaymentPanel is the active path and `paymentService.collectPayment()` is stale, but allowed sources do not provide an owner-approved canonical declaration.
- **Whether it can be included in final architecture docs:** Yes, as implementation guardrail.
- **What future agents should do:** Treat OrderEntry/CollectPaymentPanel flows as the active implementation surface and avoid reusing `paymentService.collectPayment()` unless deliberately repaired and approved.

---

## OQ-06
- **Question ID:** OQ-06
- **Original question:** Should CRM be considered required, optional, or per-restaurant capability?
- **Area/module:** CRM / customer / delivery address
- **Why it matters:** This affects UX exposure, onboarding, and degraded-mode expectations.
- **Recommended owner:** Product / API / Business
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/crmAxios.js:18-20,55-60`, `/app/frontend/src/api/services/customerService.js`, `/app/frontend/src/components/order-entry/OrderEntry.jsx:127-169`
- **Conflict note, if any:** None.
- **Whether it can be included in final architecture docs:** Yes, as current soft-optional implementation plus unresolved policy.
- **What future agents should do:** Preserve current degraded-mode handling unless Product/API/Business define capability tiers or mandatory CRM.

---

## OQ-07
- **Question ID:** OQ-07
- **Original question:** What is the long-term strategy for reporting logic: frontend-composed or backend-aggregated?
- **Area/module:** Reports / audit / summary
- **Why it matters:** Reporting scale, performance, and maintainability depend on aggregation ownership.
- **Recommended owner:** Tech / API / Business
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/services/reportService.js`, `/app/frontend/src/pages/AllOrdersReportPage.jsx`, `/app/frontend/src/pages/OrderSummaryPage.jsx`
- **Conflict note, if any:** None.
- **Whether it can be included in final architecture docs:** Yes, as current implementation plus unresolved long-term strategy.
- **What future agents should do:** Treat `reportService.js` as current orchestration surface. Do not move aggregation boundaries without owner decision.

---

## OQ-08
- **Question ID:** OQ-08
- **Original question:** Are station fetch failures acceptable as empty-state UX, or should they be explicit operational failures?
- **Area/module:** Station / kitchen panel
- **Why it matters:** Silent failure can hide kitchen-facing operational issues.
- **Recommended owner:** Product / Tech
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/services/stationService.js:201-209`
- **Conflict note, if any:** None.
- **Whether it can be included in final architecture docs:** Yes, as a risk/guardrail.
- **What future agents should do:** Do not reinterpret station empty data as a confirmed success state during bug analysis.

---

## OQ-09
- **Question ID:** OQ-09
- **Original question:** Is Firebase push intended to remain on mixed SDK versions?
- **Area/module:** Notifications / Firebase
- **Why it matters:** Version divergence increases maintenance and runtime risk.
- **Recommended owner:** Tech
- **Resolution status:** `NOT_ANSWERED`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/package.json`, `/app/frontend/public/firebase-messaging-sw.js:7-8`
- **Conflict note, if any:** None. Allowed sources identify the implementation mismatch but do not document intended long-term strategy.
- **Whether it can be included in final architecture docs:** Yes, as current implementation risk.
- **What future agents should do:** Document current mixed-version implementation accurately and avoid presenting it as an approved long-term strategy.

---

## OQ-10
- **Question ID:** OQ-10
- **Original question:** Which sidebar sections are real near-term modules versus placeholders?
- **Area/module:** Navigation / information architecture / module surface
- **Why it matters:** Planning and permissions depend on whether nav items are real modules, panels, or placeholders.
- **Recommended owner:** Product / Business / Tech
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/components/layout/Sidebar.jsx:31-109,151-231`, `/app/frontend/src/App.js:31-41`
- **Conflict note, if any:** None.
- **Whether it can be included in final architecture docs:** Yes, as a current-state classification warning.
- **What future agents should do:** Treat only routed pages and explicitly opened panels as implemented modules; treat other nav items as placeholders until owner-approved.

---

## OQ-11
- **Question ID:** OQ-11
- **Original question:** Should view-mode/order-taking/status-config settings be auditable administrative controls?
- **Area/module:** Device controls / permissions / governance
- **Why it matters:** These settings affect cashier workflow but are currently local and unaudited.
- **Recommended owner:** Product / Business / Tech
- **Resolution status:** `NEEDS_OWNER_DECISION`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/pages/StatusConfigPage.jsx:47-53,147-157,403-417`, `/app/frontend/src/pages/DashboardPage.jsx:421-472`, `/app/frontend/src/components/layout/Header.jsx`
- **Conflict note, if any:** None.
- **Whether it can be included in final architecture docs:** Yes, as current-state governance gap.
- **What future agents should do:** Treat these as local terminal settings in current implementation; do not present them as centrally governed controls.

---

## OQ-12
- **Question ID:** OQ-12
- **Original question:** What is the intended lifecycle of room billing rules and print semantics?
- **Area/module:** Room billing / room print / order transforms
- **Why it matters:** Room financial/print behavior is cross-cutting and high-risk.
- **Recommended owner:** Product / API / Business
- **Resolution status:** `NOT_ANSWERED`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/components/order-entry/OrderEntry.jsx`, `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`, `/app/frontend/src/api/transforms/orderTransform.js`, `/app/frontend/src/pages/DashboardPage.jsx:26-39,632-649`, `/app/frontend/src/api/transforms/__tests__/req3-room-bill-print.test.js`
- **Conflict note, if any:** None from allowed sources. Current code shows room-specific logic, but allowed sources do not define policy lifecycle or owner-approved semantics.
- **Whether it can be included in final architecture docs:** Yes, as implementation guardrail only.
- **What future agents should do:** Preserve current room billing/print behavior unless Product/API/Business explicitly redefine it. Any room-related change requires cross-flow impact analysis.

---

## Usage rule for future agents
- Use this file first when a request touches unresolved architecture or product behavior.
- `NEEDS_OWNER_DECISION` means implementation may be possible, but policy must not be invented.
- `NOT_ANSWERED` means allowed documentation sources do not settle the question at all.
- Prefer current code for implementation truth, and carry unresolved notes into planning/handover.
