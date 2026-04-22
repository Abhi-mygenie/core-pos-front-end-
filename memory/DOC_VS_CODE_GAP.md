# DOC_VS_CODE_GAP

## Finding ID: GAP-001
Document: ARCHITECTURE_CURRENT_STATE.md
Section / Topic: Header / source commit reference
Classification: B. DOCUMENTED BUT NOT FOUND IN CODE
Severity: High
What the doc says: Validation source commit is `7f87721`.
What code shows: Current validated repository HEAD is `b1ebb9e` on `main`.
Evidence: `git rev-parse HEAD` → `b1ebb9e96c630a1181ba12d40c678f1691b80e8a`
Impact: All “re-validated” claims are tied to the wrong baseline snapshot.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-002
Document: MODULE_MAP.md
Section / Topic: Header / source commit reference
Classification: B. DOCUMENTED BUT NOT FOUND IN CODE
Severity: High
What the doc says: Source commit is `7f87721`.
What code shows: Current validated repository HEAD is `b1ebb9e`.
Evidence: `git rev-parse HEAD`
Impact: Module validation traceability is inaccurate.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-003
Document: PROJECT_INVENTORY.md
Section / Topic: Project identity / analyzed commit
Classification: B. DOCUMENTED BUT NOT FOUND IN CODE
Severity: High
What the doc says: Analyzed commit is `7f87721`.
What code shows: Current validated repository HEAD is `b1ebb9e`.
Evidence: `git rev-parse HEAD`
Impact: Inventory is anchored to an outdated snapshot.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-004
Document: OPEN_QUESTIONS_FROM_CODE.md
Section / Topic: Header / source commit reference
Classification: B. DOCUMENTED BUT NOT FOUND IN CODE
Severity: Medium
What the doc says: v3 re-validation source commit is `7f87721`.
What code shows: Current validated repository HEAD is `b1ebb9e`.
Evidence: `git rev-parse HEAD`
Impact: Question status audit is tied to stale repo state.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-005
Document: RISK_REGISTER.md
Section / Topic: Header / source commit reference
Classification: B. DOCUMENTED BUT NOT FOUND IN CODE
Severity: Medium
What the doc says: Risks were re-validated against commit `7f87721`.
What code shows: Current validated repository HEAD is `b1ebb9e`.
Evidence: `git rev-parse HEAD`
Impact: Risk traceability is stale.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-006
Document: ARCHITECTURE_DECISIONS_FINAL.md
Section / Topic: AD-111A Notification source-of-truth
Classification: B. DOCUMENTED BUT NOT FOUND IN CODE
Severity: High
What the doc says: Notifications must originate only from socket-driven events; local/manual notification generation should not exist.
What code shows: Notifications are driven by Firebase/FCM in `NotificationContext`, and a local `NotificationTester` component can manually simulate notifications.
Evidence: `frontend/src/contexts/NotificationContext.jsx`, `frontend/src/config/firebase.js`, `frontend/src/components/layout/NotificationTester.jsx`
Impact: Decision doc is materially misaligned with implementation; could mislead planning around notifications.
Recommended documentation action: needs decision
Confidence: High

## Finding ID: GAP-007
Document: ARCHITECTURE_DECISIONS_FINAL.md
Section / Topic: AD-101 Service charge application point
Classification: D. DECIDED BUT NOT YET IMPLEMENTED
Severity: High
What the doc says: Service charge must be calculated on post-discount subtotal.
What code shows: `CollectPaymentPanel` still calculates service charge from `itemTotal` (pre-discount).
Evidence: `frontend/src/components/order-entry/CollectPaymentPanel.jsx:209-212`
Impact: Decision and implementation diverge on financial logic.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-008
Document: ARCHITECTURE_DECISIONS_FINAL.md
Section / Topic: AD-502 serviceChargeEnabled default behavior
Classification: D. DECIDED BUT NOT YET IMPLEMENTED
Severity: Medium
What the doc says: Toggle should reflect applicability and should not blindly default ON.
What code shows: `serviceChargeEnabled` still initializes as `useState(true)`.
Evidence: `frontend/src/components/order-entry/CollectPaymentPanel.jsx:139-140`
Impact: Decision is not implemented; UX behavior still follows old logic.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-009
Document: ARCHITECTURE_DECISIONS_FINAL.md
Section / Topic: Multiple entries citing validated runtime/business clarification
Classification: F. STILL OPEN / NEEDS BUSINESS DECISION
Severity: Medium
What the doc says: Many decisions cite “confirmed business clarification”, “runtime validation”, or backend contract confirmation.
What code shows: Static code cannot verify those external clarifications.
Evidence: Decision text in AD-002, AD-003, AD-007, AD-008, AD-101, AD-102, AD-105, AD-107, AD-202, AD-302, AD-401, AD-402, etc.
Impact: Docs blur code truth with external decisions; unsafe for execution planning if treated as implemented fact.
Recommended documentation action: keep open
Confidence: High

## Finding ID: GAP-010
Document: OPEN_QUESTIONS_FROM_CODE.md
Section / Topic: OQ-205 health-check plugin purpose
Classification: E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
Severity: Low
What the doc says: Status open; not inspected in v3.
What code shows: Plugin adds dev-server `/health*` endpoints and tracks webpack compilation health.
Evidence: `frontend/plugins/health-check/health-endpoints.js`, `frontend/plugins/health-check/webpack-health-plugin.js`
Impact: Open-question backlog contains an already-answerable item.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-011
Document: OPEN_QUESTIONS_FROM_CODE.md
Section / Topic: OQ-601 setupTests.polyfills
Classification: E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
Severity: Low
What the doc says: Not audited; still open.
What code shows: File polyfills `TextEncoder` and `TextDecoder` for Jest/React Router compatibility.
Evidence: `frontend/src/setupTests.polyfills.js`
Impact: Documentation understates available code evidence.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-012
Document: OPEN_QUESTIONS_FROM_CODE.md
Section / Topic: OQ-603 socket handler test coverage
Classification: E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
Severity: Medium
What the doc says: Open; relevant test files exist but not audited.
What code shows: There is direct test coverage for `handleUpdateOrderStatus`, plus config/dev-guard socket tests. Coverage exists but includes stale expectations.
Evidence: `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`, `socketEvents.test.js`, `socketServiceGlobal.test.js`
Impact: Test coverage should be documented as partial and stale in places, not fully open/unknown.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-013
Document: OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md
Section / Topic: OQ-205 status
Classification: E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
Severity: Low
What the doc says: Parked for later.
What code shows: Answerable directly from plugin files.
Evidence: `frontend/plugins/health-check/health-endpoints.js`, `webpack-health-plugin.js`
Impact: Status summary is outdated.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-014
Document: OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md
Section / Topic: OQ-601 status
Classification: E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
Severity: Low
What the doc says: Parked as low priority.
What code shows: Answerable directly from `setupTests.polyfills.js`.
Evidence: `frontend/src/setupTests.polyfills.js`
Impact: Status summary is outdated.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-015
Document: OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md
Section / Topic: OQ-603 status
Classification: E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
Severity: Medium
What the doc says: Frozen via AD-603.
What code shows: There is some coverage, but tests are partial and at least one direct handler test is stale against current implementation.
Evidence: `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`
Impact: Summary overstates the stability of the test evidence.
Recommended documentation action: update doc
Confidence: Medium

## Finding ID: GAP-016
Document: RISK_REGISTER.md
Section / Topic: Missing risk — stale tests vs current implementation
Classification: C. FOUND IN CODE BUT MISSING IN DOCS
Severity: Medium
What the doc says: Notes broken `paymentService.test.js`, but does not capture stale `updateOrderStatus.test.js` expectations vs current handler design.
What code shows: `updateOrderStatus.test.js` expects GET fallback behavior for status codes, while current handler requires `payload.orders` and does not call GET fallback.
Evidence: `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`, `frontend/src/api/socket/socketHandlers.js:366-411`
Impact: Test suite may give false signals or fail for reasons not represented in docs.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-017
Document: ARCHITECTURE_CURRENT_STATE.md
Section / Topic: Notification pipeline certainty
Classification: A. CONFIRMED FROM CODE
Severity: Low
What the doc says: Notification pipeline is FCM-based and foreground/background handled through NotificationContext.
What code shows: This is correct.
Evidence: `frontend/src/contexts/NotificationContext.jsx`, `frontend/src/config/firebase.js`, `frontend/public/firebase-messaging-sw.js`
Impact: Positive confirmation; this area is reliable.
Recommended documentation action: none / keep
Confidence: High

## Finding ID: GAP-018
Document: ARCHITECTURE_CURRENT_STATE.md
Section / Topic: Sonner dead code
Classification: A. CONFIRMED FROM CODE
Severity: Low
What the doc says: shadcn toaster is mounted and Sonner is unused.
What code shows: Correct.
Evidence: `frontend/src/App.js`, grep for `sonner` imports, `frontend/src/components/ui/sonner.jsx`
Impact: Reliable documentation point.
Recommended documentation action: none / keep
Confidence: High

## Finding ID: GAP-019
Document: MODULE_MAP.md
Section / Topic: RePrintButton default export hollow
Classification: A. CONFIRMED FROM CODE
Severity: Low
What the doc says: Default export is hollow; real work is in `RePrintOnlyButton`.
What code shows: Correct.
Evidence: `frontend/src/components/order-entry/RePrintButton.jsx`
Impact: Reliable documentation point.
Recommended documentation action: none / keep
Confidence: High

## Finding ID: GAP-020
Document: OPEN_QUESTIONS_FROM_CODE.md
Section / Topic: OQ-106 update_table channel
Classification: E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
Severity: Medium
What the doc says: Partial answered; code observation is unambiguous but intent remains open.
What code shows: That is correct; code portion is answerable, intent is not.
Evidence: `frontend/src/api/socket/useSocketEvents.js:143-179`
Impact: Reliable split classification; should be kept explicit.
Recommended documentation action: keep open
Confidence: High

## Finding ID: GAP-021
Document: PROJECT_INVENTORY.md
Section / Topic: Backend env dependency wording
Classification: C. FOUND IN CODE BUT MISSING IN DOCS
Severity: Low
What the doc says: Backend is a stub and uses env files preserved locally.
What code shows: Backend also depends on `DB_NAME` in addition to `MONGO_URL`.
Evidence: `backend/server.py:18-20`
Impact: Hidden config dependency in backend stub documentation.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-022
Document: ARCHITECTURE_DECISIONS_FINAL.md
Section / Topic: AD-106 update-table channel active
Classification: A. CONFIRMED FROM CODE
Severity: Medium
What the doc says: `update-table` channel is active; stale comments claim removal.
What code shows: Correct from code perspective.
Evidence: `frontend/src/api/socket/useSocketEvents.js:145-154`
Impact: Reliable as code observation, but runtime example quoted in doc is not code-verifiable.
Recommended documentation action: update doc
Confidence: High

## Finding ID: GAP-023
Document: ARCHITECTURE_DECISIONS_FINAL.md
Section / Topic: AD-107 unauthenticated websocket as intended design
Classification: F. STILL OPEN / NEEDS BUSINESS DECISION
Severity: Medium
What the doc says: WebSocket is intentionally unauthenticated.
What code shows: Only that the client sends no auth fields in handshake; intent is not provable.
Evidence: `frontend/src/api/socket/socketService.js:53-66`
Impact: Security posture could be misunderstood as approved design instead of observed implementation.
Recommended documentation action: needs decision
Confidence: High

## Finding ID: GAP-024
Document: OPEN_QUESTIONS_FROM_CODE.md
Section / Topic: OQ-201 Sonner canonicality
Classification: A. CONFIRMED FROM CODE
Severity: Low
What the doc says: Sonner is dead code; shadcn Toaster is canonical.
What code shows: Correct.
Evidence: `frontend/src/App.js`, `frontend/src/components/ui/sonner.jsx`, grep for `sonner`
Impact: Reliable answer.
Recommended documentation action: none / keep
Confidence: High

## Finding ID: GAP-025
Document: RISK_REGISTER.md
Section / Topic: RISK-001 broken payment service
Classification: A. CONFIRMED FROM CODE
Severity: High
What the doc says: `paymentService.collectPayment` references undeclared `CLEAR_BILL` and related test will fail.
What code shows: Correct.
Evidence: `frontend/src/api/services/paymentService.js`, `frontend/src/api/constants.js`, `frontend/src/__tests__/api/paymentService.test.js`
Impact: Reliable high-severity documentation point.
Recommended documentation action: none / keep
Confidence: High
