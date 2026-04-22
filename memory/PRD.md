# PRD / Audit Handoff

## Original Problem Statement
Finalize v3 documentation for the React frontend codebase using current code as the only source of truth. Do not modify code or run testing agent. Build/run the project, read memory/v1/v2 docs, inspect code, and create v3 versions of the required documents without overwriting originals.

## Architecture Decisions
- Current checkout: remote branch available/used was `piyush_QA` at commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179`; requested casing `Piyush_QA` was not present remotely.
- React frontend only; production build succeeded with one `LoadingPage.jsx` hook dependency warning.
- Code was treated as source of truth; backend/product assumptions were explicitly marked as not confirmed.

## Implemented Documentation Output
- Created `/app/v3/ARCHITECTURE_DECISIONS_FINAL.md`.
- Created `/app/v3/DOC_VS_CODE_GAP.md`.
- Created `/app/v3/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md`.
- Created `/app/v3/RISK_REGISTER.md`.
- Created `/app/v3/DOCUMENTATION_AUDIT_SUMMARY.md`.
- Created `/app/v3/COMPARISON_SUMMARY.md`.

## Prioritized Backlog
### P0
- Backend clarification: websocket auth/security model, settlement authority, delivery-address persistence.
- Address critical frontend latent risk: undefined `API_ENDPOINTS.CLEAR_BILL` in `paymentService.collectPayment()`.

### P1
- Align `OrderEntry.applyRoundOff()` with canonical fractional `> 0.10` rounding rule.
- Update stale socket comments/tests around `update-table` and `update-order-status`.
- Resolve missing health-check plugin files or remove conditional config.

### P2
- Add/maintain `.env.example` for required frontend environment variables.
- Reduce oversized hotspot files and centralize billing calculations.
- Confirm prepaid runtime complimentary auto-print parity and service-charge default policy.

## Next Tasks
- Review `/app/v3/*` with product/backend owners for items marked Not Confirmed or Needs Clarification.
- Use v3 docs as the trusted documentation baseline for future engineering/AI-agent work.

## Owner Review Packet Added
- Created `/app/v3/OWNER_REVIEW_PACKET.md` to support backend/product owner review of all v3 Needs Clarification / Not Confirmed items.
- Packet groups questions by Backend, Product, and Documentation/Repository owners with decision options and target docs to update after answers.
