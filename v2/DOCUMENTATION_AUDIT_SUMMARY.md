# Document Audit Status
- Source File: New summary based on primary audit set
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Finalized
- Confidence: High
- Code Areas Reviewed: `frontend/src/**/*`, `frontend/public/firebase-messaging-sw.js`, `frontend/plugins/health-check/*`, `memory/*`
- Notes: This master summary reflects the finalized v2 reconciliation baseline for current branch `Piyush_QA` at commit `19fc8ff05506057b6fab89a6201162fa34baedf2`.

# DOCUMENTATION_AUDIT_SUMMARY

## Documents Reviewed
- `memory/ARCHITECTURE_DECISIONS_FINAL.md`
- `memory/DOC_VS_CODE_GAP.md`
- `memory/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md`
- `memory/RISK_REGISTER.md`
- `memory/AD_UPDATES_PENDING.md`
- Supporting context from other `memory/*` files where needed

## Overall Status by Document
- `ARCHITECTURE_DECISIONS_FINAL.md` → **Finalized in `/v2`**
- `DOC_VS_CODE_GAP.md` → **Finalized in `/v2`**
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` → **Finalized in `/v2`**
- `RISK_REGISTER.md` → **Finalized in `/v2`**

## Build / Run Verification
- Frontend dependencies installed with `yarn install`
- Production build succeeded with provided env values
- Build warning observed:
  - `src/pages/LoadingPage.jsx` — missing `loadStationData` dependency in `useEffect`
- Supervisor status showed `frontend` service running

## Decisions Fully Verified From Code
- Service charge is now computed on **post-discount subtotal** in collect-bill and core transform math
- `update-table` socket channel is **active**, and removal comments are stale
- v2 socket payload handlers **fail fast** when `payload.orders` is missing
- `defaultOrderStatus` from profile is actively used in dashboard confirm-order flow
- Frontend running-order role normalization is `Waiter` vs `Manager`
- Notification ingress is **FCM/service-worker based**
- shadcn `Toaster` is the active action-toast system; Sonner is inactive
- Multiple `order_id` response shapes are intentionally tolerated in code
- Health-check plugin purpose is answerable from code
- `setupTests.polyfills.js` purpose is answerable from code

## Decisions Changed After Code Audit
- **Notification architecture**: older socket-only decision is wrong; current implementation is FCM-based with a manual NotificationTester path
- **AD-101**: moved from “decision only” to **verified**
- **AD-105**: improved significantly, but remains **partial** because fallback print recomputation still exists
- **AD-302**: collect-bill print consistency is implemented for override-based paths, but not all print entry paths
- **AD-206**: `handleUpdateOrder` is not dead; it is a legacy wrapper still wired in
- **AD-303**: prepaid print-button absence is **not confirmed from current static code**
- **AD-204**: “remove all mock files” is too broad; some reference data is active runtime data

## Items Absorbed From `AD_UPDATES_PENDING.md`
- **Entry #1 (AD-101)** → absorbed and verified
- **Entry #2 (AD-105)** → partially absorbed; implementation improvement verified, but full “single source of truth everywhere” claim was too strong
- **Entry #3 (AD-302)** → partially absorbed; collect-bill print consistency improved, but not universal across all print paths
- **Entry #7 (AD-001 rounding)** → absorbed with correction that implementation is still inconsistent because `OrderEntry.jsx` retains older local logic
- **Entry #8 (service-charge order-type gating)** → absorbed as a new verified decision
- **Entry #4 / #5 / #6 notes** → reviewed; backend-only / no-AD-change items were not overstated in v2 docs

## Gaps Still Remaining
- WebSocket authentication intent is not provable from frontend code
- Backend persistence/authority claims around settlement values are not fully provable from frontend code
- Service-charge toggle still defaults ON
- Tax consistency is strong in collect-bill paths but not absolute in every print path
- Rounding logic is inconsistent between main billing code and `OrderEntry` local helper
- Stale inline comments still contradict actual socket subscription behavior
- Broken dead `paymentService.collectPayment()` remains in tree
- Stale socket test expectations remain in `updateOrderStatus.test.js`

## Open Questions Still Not Confirmed From Code
- Whether client-side unauthenticated socket handshake is an intentional backend-approved design
- Whether any prepaid print issue still exists at runtime despite current component logic
- Whether mobile/touch/keyboard support is complete enough to meet product expectations
- Future CRM configuration source-of-truth beyond current env-driven implementation
- Repo governance/history rewrite questions

## Architecture Risks Still Visible in Implementation
- Auth/session risks: token in localStorage, no refresh flow, hard redirect on 401
- Billing consistency risks: broken payment service dead code, rounding drift, fallback print recomputation
- Operational risks: sequential loading, socket-coupled UX completion, engage-lock staleness
- Documentation/maintainability risks: stale comments, stale tests, oversized hotspot files, dead mock remnants

## Recommended Next Actions

### Product / Business
- Confirm intended socket authentication/security model
- Confirm canonical service-charge toggle default behavior
- Confirm whether prepaid collect-bill print issue still exists in runtime, or if earlier report is obsolete

### Backend
- Clarify backend authority/persistence semantics for settlement values vs frontend-calculated values
- Clarify whether websocket auth is enforced out-of-band
- Confirm future CRM key sourcing model if docs need to cover target architecture

### Engineering Documentation
- Retire outdated notification architecture statements
- Stop labeling backend/business clarifications as code-verified facts
- Update any remaining memory docs that still reference older commits/branches
- Explicitly track stale test drift as part of architecture hygiene, not only QA hygiene

## Final Trust Statement
The `/v2` documents now form a safer baseline than the originals because they:
- privilege current code over earlier narrative,
- separate verified implementation from external assumptions,
- absorb validated implementation learnings from pending updates,
- and explicitly mark what still requires backend or product clarification.
