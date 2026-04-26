# VALIDATION_REPORT

## Overall validation summary
- Validation scope completed against the **actual current codebase at `main` / commit `b1ebb9e`**, not the older commit references embedded in the docs.
- The documentation set is **partially reliable for code structure**, but **not fully reliable as an execution-planning source of truth** without cleanup.
- Strongest areas: module inventory, context hierarchy, route map, major socket/order/payment flow descriptions.
- Weakest areas: architecture decisions marked as final without code proof, runtime/business claims presented as verified, outdated commit references, and several open questions that are already answerable from code.

## Step-by-step validation plan executed
1. Sync repository to GitHub `main` in `/app` and verify current HEAD.
2. Read all 7 target docs fully from `/app/memory`.
3. Build cross-document map of claimed architecture, decisions, risks, module boundaries, and open questions.
4. Inspect current codebase module-by-module:
   - app shell, routing, providers
   - API layer, socket layer, transforms, contexts
   - order/payment/printing flows
   - notifications, tests, plugin files, backend stub
5. Compare docs vs code and classify findings by:
   - confirmed from code
   - documented but not found in code
   - found in code but missing in docs
   - decided but not implemented
   - open question already answerable from code
   - still open / needs business decision
   - risk / dependency / side effect
6. Produce this report and `DOC_VS_CODE_GAP.md`.
7. Apply **conservative doc-only corrections** where confidence is high.

## Repository baseline actually validated
- Branch: `main`
- Commit validated: `b1ebb9e96c630a1181ba12d40c678f1691b80e8a`
- Default branch: `main`
- Validation method: static code inspection only

## Confidence by document
| Document | Confidence | Notes |
|---|---|---|
| `ARCHITECTURE_CURRENT_STATE.md` | Medium | Many structural/code claims hold, but commit reference is outdated and some claims overstate certainty. |
| `ARCHITECTURE_DECISIONS_FINAL.md` | Low | Many entries are decisions/business clarifications, not code-validated facts; several are not implemented or contradicted by code. |
| `MODULE_MAP.md` | High | Mostly aligned with current code structure; a few items required correction/validation tagging. |
| `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` | Low-Medium | Several “Frozen” items are not actually resolved by code; some “Parked/Open” items are already code-answerable. |
| `OPEN_QUESTIONS_FROM_CODE.md` | Medium | Good issue inventory, but some statuses are outdated or too conservative; several questions are answerable from code now. |
| `PROJECT_INVENTORY.md` | High | Broadly accurate structurally, but commit/default-branch references were stale and some assertions exceeded direct evidence. |
| `RISK_REGISTER.md` | Medium | Many risks hold, but some include implementation recommendations or certainty levels beyond static proof; one material missing risk was identified. |

## Major contradictions found
1. **Current repo commit mismatch across docs**
   - Docs repeatedly cite commit `7f87721`.
   - Actual validated code is commit `b1ebb9e`.
   - Impact: all “v3 re-validation” claims are tied to the wrong code snapshot.

2. **AD-111A / notification source-of-truth conflicts with code**
   - Decision doc says notifications must originate only from socket-driven events.
   - Code uses **Firebase/FCM** foreground/background notifications via `NotificationContext`, plus a local `NotificationTester` simulation path.
   - Impact: decision doc is not aligned with actual implementation.

3. **Decision doc contains business/runtime confirmations not provable from code**
   - Multiple decisions say “validated business clarification”, “confirmed backend behavior”, or “runtime clarification”.
   - Static code alone cannot verify those claims.
   - Impact: execution planning could incorrectly treat assumptions as facts.

4. **Open question statuses are stale in several places**
   - `OQ-205` (health-check plugin purpose) is answerable from code.
   - `OQ-601` (`setupTests.polyfills.js`) is answerable from code.
   - `OQ-603` has partial test evidence directly in repo.
   - Impact: unresolved-question backlog is noisier than necessary.

5. **Decision/frozen status does not imply implementation**
   - Example: service charge post-discount decision (AD-101) is **not implemented** in current code; panel still calculates service charge from `itemTotal` pre-discount.
   - Example: serviceChargeEnabled default applicability decision (AD-502) is **not implemented**; code still has `useState(true)`.
   - Example: print consistency decisions (AD-105 / AD-302 / AD-401 / AD-402 family) are only partially reflected in code.

## Major uncovered or underrepresented code areas
- `frontend/plugins/health-check/*` dev-server health plugin and endpoints are barely represented and were left parked/open despite being code-answerable.
- `frontend/src/setupTests.polyfills.js` was left open even though it is a 10-line file and directly answerable.
- `NotificationTester.jsx` introduces a **non-socket local notification simulation path** not represented in decisions.
- Current test suite mismatch is underrepresented:
  - `paymentService.test.js` is clearly broken against current constants.
  - `updateOrderStatus.test.js` asserts old GET-based behavior that no longer matches handler implementation.

## Readiness assessment for execution planning
**Status: NOT READY without documentation cleanup.**

Why:
- Code-structure docs are fairly usable.
- But the decision layer mixes:
  - code-backed facts
  - intended business rules
  - runtime clarifications
  - unverified assumptions
- Several “final” decisions are not implemented.
- Several open questions are already answerable from code but not marked as such.
- Current-commit traceability is wrong in multiple docs.

## What is reliable right now
- Route map
- Provider hierarchy
- Major module inventory and file census
- Core socket channel wiring
- Order/payment/printing flow descriptions at code level
- Several risk themes (`CLEAR_BILL`, localStorage token, sequential loading, direct axios in UI, dead aggregator path, StationContext non-memoized)

## What should be treated as assumptions or decision-only items
- Most entries in `ARCHITECTURE_DECISIONS_FINAL.md` that cite business/runtime clarification
- Any statement that claims backend contract validation without corresponding code evidence
- Any statement that says “confirmed in production/runtime” unless backed by test/runtime artifacts

## High-confidence findings summary
### A. CONFIRMED FROM CODE
- 9-provider hierarchy in `AppProviders`
- auth-gated socket connection
- three subscribed socket channels: `new_order_*`, `update_table_*`, `order-engage_*`
- stale BUG-203 comments vs live table-channel subscription
- localStorage bearer token + 401 hard redirect
- single print endpoint `PRINT_ORDER`
- `paymentService.collectPayment` references missing `CLEAR_BILL`
- `EDIT_ORDER_ITEM` and `EDIT_ORDER_ITEM_QTY` are literal `TBD`
- `StationContext` value is not memoized
- Sonner is dead in runtime imports; shadcn Toaster is mounted
- `TableCard` imports `mockOrderItems` into a dead variable

### B. DOCUMENTED BUT NOT FOUND IN CODE
- AD-111A socket-only notification ownership
- multiple “validated business clarification” statements presented as code-backed
- several frozen decisions whose behavior is not implemented in current code

### C. FOUND IN CODE BUT MISSING IN DOCS
- `NotificationTester.jsx` local simulated notification path
- `updateOrderStatus.test.js` is stale against current handler logic
- health-check plugin purpose is directly inspectable and should no longer remain open/parked

### D. DECIDED BUT NOT YET IMPLEMENTED
- AD-101 post-discount service charge
- AD-502 serviceChargeEnabled should reflect applicability instead of hardcoded ON
- parts of AD-105 / AD-302 print-vs-UI consistency remain partial at best

### E. OPEN QUESTION ALREADY ANSWERABLE FROM CODE
- OQ-205 health-check plugin purpose
- OQ-601 setupTests.polyfills purpose
- OQ-603 partial test coverage presence
- OQ-106 code-side portion: table channel is definitely subscribed

### F. STILL OPEN / NEEDS BUSINESS DECISION
- canonical service charge/tax rule
- socket auth intent/trust boundary
- backend event semantics and terminal status contract
- CRM key rotation policy
- print/settlement authority where docs currently cite business clarification

### G. RISK / DEPENDENCY / SIDE EFFECT
- broken/dead `paymentService` path and failing related test
- stale tests can create false confidence
- doc decision layer can mislead implementation agents into assuming missing features already exist

## Recommended cleanup before implementation agents start
- Treat `ARCHITECTURE_DECISIONS_FINAL.md` as **decision log, not implementation truth**.
- Use `MODULE_MAP.md` + `PROJECT_INVENTORY.md` as the safer codebase map.
- Reclassify answered open questions and separate “decision-only” items from “implemented”.
- Rebaseline all current-state docs to commit `b1ebb9e` or later.

## Final validation verdict
The documentation set is **useful but not yet safe as a sole execution-planning source of truth**. It needs one more cleanup pass focused on:
- current-commit alignment
- decision-vs-implementation labeling
- removal of unverifiable certainty
- answered-open-question cleanup
- explicit contradiction tagging where docs conflict with code
