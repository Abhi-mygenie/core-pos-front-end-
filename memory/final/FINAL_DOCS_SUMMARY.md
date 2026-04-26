# FINAL_DOCS_SUMMARY

## Final documents created
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `FINAL_DOCS_SUMMARY.md`

## What each document is used for
- **OPEN_QUESTIONS_FINAL_RESOLUTION.md**
  - final status of each open question from Step 2 analysis inputs plus owner clarifications
  - tells future agents what is frozen, deferred, or verification-sensitive
- **ARCHITECTURE_DECISIONS_FINAL.md**
  - final architecture rules and guardrails
- **MODULE_DECISIONS_FINAL.md**
  - module boundaries, responsibilities, dependencies, and change rules
- **CHANGE_REQUEST_PLAYBOOK.md**
  - step-by-step workflow for analyzing bugs/features/changes
- **IMPLEMENTATION_AGENT_RULES.md**
  - mandatory pre-coding, planning, testing, handover, and doc-update rules
- **FINAL_DOCS_SUMMARY.md**
  - short review summary for team handoff

## Confirmed architecture decisions
- app shell remains `ErrorBoundary -> AppProviders -> BrowserRouter -> Routes -> Toaster`
- React Context is the primary shared-state pattern
- dashboard/order entry/payment/report/socket files are current architecture hotspots
- approved env contract remains multi-variable and should not be renamed casually
- table status is derived from order-socket `f_order_status`
- localStorage is the current Phase 1 settings/runtime dependency
- socket + context mutation remains the live runtime model
- CRM is required by default except for restaurants that do not capture customer details
- backend APIs own report aggregation; frontend reporting is presentation/representation
- station failures should be explicit, not silently treated as normal empty state
- Firebase is the canonical notifications platform
- repo `/app/backend` is not part of the active deployment/runtime path
- room, print, financial, and bootstrap behavior remain high-risk change surfaces
- room check-in now includes advance-payment method capture when advance > 0
- station aggregation now distinguishes variant/add-on/note signatures in current implementation

## Confirmed module decisions
- authentication/session remains separate from loading/bootstrap
- loading/bootstrap is the startup hydration boundary
- dashboard is the operational orchestration boundary
- order entry owns order composition/update workflow
- collect bill owns final settlement/payment workflow
- rooms are a cross-cutting specialized domain, not just another table type
- CRM is a required capability for customer-detail workflows
- realtime socket handling is its own cross-cutting runtime module
- station/kitchen panel is a distinct embedded module with service + config coupling
- only routed pages and explicit runtime panels count as implemented modules
- visibility settings remain temporary phase-1 device configuration behavior

## Deferred or verification-sensitive items
- report wording implying frontend aggregation ownership should be highlighted and verified during the next report-related work
- room billing/print lifecycle ownership is deferred until the next room billing / room print related change

## High-risk areas for future change requests
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/components/order-entry/OrderEntry.jsx`
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- `frontend/src/components/modals/RoomCheckInModal.jsx`
- `frontend/src/pages/StatusConfigPage.jsx`
- `frontend/src/api/transforms/orderTransform.js`
- `frontend/src/api/services/reportService.js`
- `frontend/src/api/socket/socketHandlers.js`
- `frontend/src/api/socket/useSocketEvents.js`
- room billing / room print / room transfer behavior
- localStorage configuration keys
- startup bootstrap in `LoadingPage.jsx`

## Recommended usage flow for future agents
1. Read `FINAL_DOCS_APPROVAL_STATUS.md`
2. Read `ARCHITECTURE_DECISIONS_FINAL.md`
3. Read `MODULE_DECISIONS_FINAL.md`
4. Check `OPEN_QUESTIONS_FINAL_RESOLUTION.md` whenever the request may touch deferred or verification-sensitive behavior/policy
5. Use `CHANGE_REQUEST_PLAYBOOK.md` to analyze the request
6. Follow `IMPLEMENTATION_AGENT_RULES.md` before coding
7. Use `/app/memory/BUG_TEMPLATE.md` when documenting bugs
8. Inspect actual code files for final confirmation

## Review note
These final docs were rebuilt using only `/app/memory/current-state/*`, `/app/memory/analysis/*`, and current code in `/app`. No `/app/v3/*` documents were used in this final pass.

## Baseline identity note
- The approved working code baseline for this documentation set is `/app` on branch `step3`.
- Some analysis inputs originated during Step 2 work, but the baseline identity for future agents is `step3`.
- Archived materials are historical only and are not part of the mandatory future-agent reading path unless a future request explicitly asks for historical comparison.

## Historical delta note
A targeted delta refresh was previously applied for three localized bug-fix areas now reflected in the current code baseline:
- BUG-025: cancelled items visible in card dropdowns
- BUG-026: station aggregation/detail split by variant/add-on/note signature
- BUG-027: room check-in advance-payment method capture and payload support
Only the architecture, module, and summary final docs were refreshed for that delta.
