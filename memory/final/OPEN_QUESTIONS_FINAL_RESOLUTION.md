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
- NOT_ANSWERED: 1
- CONFLICTING_WITH_CODE: 0
- NEEDS_OWNER_DECISION: 1
- OWNER_CLARIFIED_OR_FROZEN: 10

---

## OQ-01
- **Question ID:** OQ-01
- **Original question:** What is the canonical frontend environment contract?
- **Area/module:** App bootstrap / configuration / deployment
- **Why it matters:** Deployment/setup will remain fragile unless the required env names and ownership are explicitly defined.
- **Recommended owner:** Tech / API
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/axios.js:5-8`, `/app/frontend/src/api/socket/socketEvents.js`, `/app/frontend/src/api/crmAxios.js:8-20`, `/app/frontend/src/config/firebase.js:5-15`, `/app/frontend/src/components/order-entry/AddressFormModal.jsx:5`, `/app/frontend/craco.config.js:11`
- **Conflict note, if any:** Owner supplied the approved frontend environment contract for this baseline.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat the owner-provided env variable set as the canonical frontend env contract. Do not rename, consolidate, or deprecate env variables without explicit owner approval. Highlight any code deviation from the approved env contract.

---

## OQ-02
- **Question ID:** OQ-02
- **Original question:** What is the intended source of truth for table status: socket table channel or derived order state?
- **Area/module:** Realtime / tables / orders
- **Why it matters:** Future bug fixes and refactors depend on whether table occupancy is authoritative from table events, order events, or both.
- **Recommended owner:** Tech / API
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/socket/useSocketEvents.js:143-179`, `/app/frontend/src/api/socket/socketHandlers.js:123-132,266-272,466-502`
- **Conflict note, if any:** Owner clarified that the source-of-truth option is the order socket path.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat table status as derived from `f_order_status`, with `f_order_status` coming from the order socket. Future agents may validate this behavior in code and must explicitly highlight any deviation.

---

## OQ-03
- **Question ID:** OQ-03
- **Original question:** Which local settings should remain device-local versus move to user-level or restaurant-level persistence?
- **Area/module:** Status config / dashboard preferences / station config
- **Why it matters:** Settings scope affects operational consistency and future admin governance.
- **Recommended owner:** Product / Tech / Business
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/pages/StatusConfigPage.jsx`, `/app/frontend/src/pages/DashboardPage.jsx`, `/app/frontend/src/contexts/StationContext.jsx`, `/app/frontend/src/contexts/SettingsContext.jsx`
- **Conflict note, if any:** Owner clarified a phased model: Phase 1 remains localStorage/device-local; Phase 2 may convert these settings into role-based behavior.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Preserve localStorage/device-local behavior in the current baseline. Do not convert to role-based persistence unless explicit Phase 2 work is requested.

---

## OQ-04
- **Question ID:** OQ-04
- **Original question:** Is the backend scaffold in this repo meant to be used, ignored, or replaced?
- **Area/module:** Repo architecture / backend boundary
- **Why it matters:** Repo-boundary decisions affect architecture ownership, deployment assumptions, and future documentation.
- **Recommended owner:** Tech / Business
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/backend/server.py`, `/app/backend/requirements.txt`
- **Conflict note, if any:** Owner clarified that this repo backend is not used for the app and next deployment agents should not use it.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat `/app/backend` as present in the repo but not part of the active deployment/runtime path. Do not deploy or rely on it unless explicitly instructed.

---

## OQ-05
- **Question ID:** OQ-05
- **Original question:** What is the official payment integration surface in the frontend?
- **Area/module:** Payment / billing / order entry
- **Why it matters:** Revenue-critical changes need a single canonical entry point.
- **Recommended owner:** Tech / API
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/constants.js:43-46`, `/app/frontend/src/components/order-entry/OrderEntry.jsx`, `/app/frontend/src/api/transforms/orderTransform.js:813-968`, `/app/frontend/src/api/services/paymentService.js:12-14`
- **Conflict note, if any:** Owner clarified the workflow split: order entry belongs in OrderEntry; final settlement/payment belongs in Collect Bill.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat `OrderEntry` as the order composition/update workflow surface and `CollectPaymentPanel` / collect-bill flow as the final settlement/payment surface. Avoid reusing `paymentService.collectPayment()` as a canonical new-work entry point.

---

## OQ-06
- **Question ID:** OQ-06
- **Original question:** Should CRM be considered required, optional, or per-restaurant capability?
- **Area/module:** CRM / customer / delivery address
- **Why it matters:** This affects UX exposure, onboarding, and degraded-mode expectations.
- **Recommended owner:** Product / API / Business
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/crmAxios.js:18-20,55-60`, `/app/frontend/src/api/services/customerService.js`, `/app/frontend/src/components/order-entry/OrderEntry.jsx:127-169`
- **Conflict note, if any:** Owner clarified CRM is required for all restaurants except where the restaurant does not take any customer details.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat CRM as required by default. Only apply exception handling where a restaurant genuinely does not use customer-detail workflows.

---

## OQ-07
- **Question ID:** OQ-07
- **Original question:** What is the long-term strategy for reporting logic: frontend-composed or backend-aggregated?
- **Area/module:** Reports / audit / summary
- **Why it matters:** Reporting scale, performance, and maintainability depend on aggregation ownership.
- **Recommended owner:** Tech / API / Business
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/services/reportService.js`, `/app/frontend/src/pages/AllOrdersReportPage.jsx`, `/app/frontend/src/pages/OrderSummaryPage.jsx`
- **Conflict note, if any:** Owner clarified that aggregation ownership belongs to backend APIs; frontend responsibility is representation/presentation. Any doc wording implying frontend aggregation ownership should be highlighted and verified during the next report-related change.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat backend APIs as the owner of report aggregation. Treat frontend reporting work as representation/presentation unless explicit new requirements say otherwise. During the next report-related change, highlight and verify any contradictory wording in docs.

---

## OQ-08
- **Question ID:** OQ-08
- **Original question:** Are station fetch failures acceptable as empty-state UX, or should they be explicit operational failures?
- **Area/module:** Station / kitchen panel
- **Why it matters:** Silent failure can hide kitchen-facing operational issues.
- **Recommended owner:** Product / Tech
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/api/services/stationService.js:201-209`
- **Conflict note, if any:** Owner clarified that station failures should be explicit so operators know immediately when the system is not performing as expected.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Do not reinterpret station failures as normal empty state. Failure should be explicit and visible.

---

## OQ-09
- **Question ID:** OQ-09
- **Original question:** Is Firebase push intended to remain on mixed SDK versions?
- **Area/module:** Notifications / Firebase
- **Why it matters:** Version divergence increases maintenance and runtime risk.
- **Recommended owner:** Tech
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/package.json`, `/app/frontend/public/firebase-messaging-sw.js:7-8`
- **Conflict note, if any:** Owner clarified that only Firebase should be used for all notifications and any discrepancy should be highlighted and corrected on priority.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat Firebase as the canonical notification platform. Highlight and prioritize correction of any discrepancy.

---

## OQ-10
- **Question ID:** OQ-10
- **Original question:** Which sidebar sections are real near-term modules versus placeholders?
- **Area/module:** Navigation / information architecture / module surface
- **Why it matters:** Planning and permissions depend on whether nav items are real modules, panels, or placeholders.
- **Recommended owner:** Product / Business / Tech
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/components/layout/Sidebar.jsx:31-109,151-231`, `/app/frontend/src/App.js:31-41`
- **Conflict note, if any:** Owner clarified that only routed pages and explicit runtime panels count as implemented modules.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat only routed pages and explicitly opened panels as implemented modules.

---

## OQ-11
- **Question ID:** OQ-11
- **Original question:** Should view-mode/order-taking/status-config settings be auditable administrative controls?
- **Area/module:** Device controls / permissions / governance
- **Why it matters:** These settings affect cashier workflow but are currently local and unaudited.
- **Recommended owner:** Product / Business / Tech
- **Resolution status:** `OWNER_CLARIFIED_OR_FROZEN`
- **Answer found in V3, if any:** Not used by instruction.
- **V3 document reference:** Not applicable.
- **Code reference, if applicable:** `/app/frontend/src/pages/StatusConfigPage.jsx:47-53,147-157,403-417`, `/app/frontend/src/pages/DashboardPage.jsx:421-472`, `/app/frontend/src/components/layout/Header.jsx`
- **Conflict note, if any:** Owner clarified this is temporary Phase 1 behavior and aligns with the earlier phased localStorage answer.
- **Whether it can be included in final architecture docs:** Yes.
- **What future agents should do:** Treat these as temporary Phase 1 local/device-level settings. Do not convert them into centrally governed admin controls unless explicit later-phase work is requested.

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
- **Conflict note, if any:** Owner chose to defer this until the next room billing / room print related change.
- **Whether it can be included in final architecture docs:** Yes, as implementation guardrail plus explicit deferral note.
- **What future agents should do:** Preserve current room billing/print behavior for now. Revisit and verify this area during the next room billing / room print related change. Any room-related change requires cross-flow impact analysis.

---

## Usage rule for future agents
- Use this file first when a request touches unresolved architecture or product behavior.
- `OWNER_CLARIFIED_OR_FROZEN` means the owner has provided enough direction to freeze the current baseline rule.
- `NEEDS_OWNER_DECISION` means implementation may be possible, but policy must not be invented.
- `NOT_ANSWERED` means allowed documentation sources do not settle the question at all, or the owner explicitly deferred the decision.
- Prefer current code for implementation truth, and carry unresolved notes into planning/handover.
