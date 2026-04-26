# Document Audit Status
- Source File: memory/DOC_VS_CODE_GAP.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Finalized
- Confidence: High
- Code Areas Reviewed: `frontend/src/api/socket/*`, `frontend/src/components/order-entry/*`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/contexts/*`, `frontend/src/config/firebase.js`, `frontend/public/firebase-messaging-sw.js`, `frontend/src/components/layout/NotificationTester.jsx`, `frontend/plugins/health-check/*`, `frontend/src/setupTests.polyfills.js`, `frontend/src/__tests__/api/socket/*`, `frontend/src/components/cards/TableCard.jsx`
- Notes: Earlier gap tracking was anchored to a different commit and mixed code facts with external/runtime assumptions. This v2 file is re-based on current branch `Piyush_QA` commit `19fc8ff05506057b6fab89a6201162fa34baedf2`.

# DOC_VS_CODE_GAP — v2

## Resolved Gaps

### GAP-R1 — AD-101 service charge implementation gap is now resolved

**Previous Documented Understanding**
- Service charge was documented as a post-discount rule but not implemented.

**What Code Actually Does**
- `CollectPaymentPanel.jsx` computes service charge from `subtotalAfterDiscount`.
- `orderTransform.js` `calcOrderTotals()` does the same.

**Status**
- Resolved

**Impact on Final Documentation**
- Earlier “decision only” wording is outdated.

**Required V2 Update**
- Mark AD-101 as verified.

---

### GAP-R2 — Health-check plugin question is answerable from code

**Previous Documented Understanding**
- Plugin purpose was still open/parked.

**What Code Actually Does**
- `plugins/health-check/health-endpoints.js` adds dev-server `/health*` endpoints.
- `webpack-health-plugin.js` tracks compilation state, errors, warnings, and readiness/liveness status.

**Status**
- Resolved

**Impact on Final Documentation**
- This should no longer appear as an unresolved open question.

**Required V2 Update**
- Reclassify as answered from code.

---

### GAP-R3 — `setupTests.polyfills.js` question is answerable from code

**Previous Documented Understanding**
- Polyfill purpose was still open/parked.

**What Code Actually Does**
- File polyfills `TextEncoder` and `TextDecoder` from Node `util` for test/runtime compatibility.

**Status**
- Resolved

**Impact on Final Documentation**
- No longer needs to sit in open-question backlog.

**Required V2 Update**
- Mark as answered from code.

---

## Gaps Still Open

### GAP-O1 — WebSocket authentication intent remains unclear

**Previous Documented Understanding**
- Older docs implied client-side unauthenticated socket was an intentional architecture decision.

**What Code Actually Does**
- Client sends no auth/query/header handshake data.
- Intent and backend enforcement are not visible from frontend code.

**Status**
- Still open

**Impact on Final Documentation**
- Must distinguish implementation fact from security design intent.

**Required V2 Update**
- Keep as needs backend/security clarification.

---

### GAP-O2 — Phase ownership statements exceed what frontend can prove

**Previous Documented Understanding**
- Older docs asserted backend authority and persistence semantics in settlement phases.

**What Code Actually Does**
- Frontend constructs and submits settlement payloads and print overrides.
- Backend persistence semantics cannot be proven here.

**Status**
- Still open

**Impact on Final Documentation**
- Documentation must stop presenting backend-authority claims as code-verified frontend facts.

**Required V2 Update**
- Keep only payload/flow observations from frontend.

---

## Wrong Earlier Assumptions

### GAP-W1 — Notification source-of-truth was documented incorrectly

**Previous Documented Understanding**
- Notifications were said to be socket-driven only and manual generation should not exist.

**What Code Actually Does**
- Notifications are FCM-driven via `NotificationContext` and service worker forwarding.
- `NotificationTester` provides manual simulation through settings.

**Status**
- Wrong earlier assumption

**Impact on Final Documentation**
- This was one of the largest architecture mismatches.

**Required V2 Update**
- Rewrite notification architecture sections around FCM + local test simulation.

---

### GAP-W2 — `handleUpdateOrder` was over-classified as dead

**Previous Documented Understanding**
- Legacy handler was described as dead code.

**What Code Actually Does**
- It is still registered for `UPDATE_ORDER`, but delegates immediately to `handleOrderDataEvent()`.

**Status**
- Wrong earlier assumption

**Impact on Final Documentation**
- “Dead” should become “legacy wrapper still wired in”.

**Required V2 Update**
- Correct the wording.

---

### GAP-W3 — Prepaid collect-bill print-button claim is not supported by current static code

**Previous Documented Understanding**
- Older notes treated missing prepaid print button on collect-bill page as a current architecture gap.

**What Code Actually Does**
- `CollectPaymentPanel` shows `Print Bill` whenever `hasPlacedItems && onPrintBill`.
- No prepaid exclusion is present in component logic.

**Status**
- Wrong earlier assumption unless runtime proves otherwise

**Impact on Final Documentation**
- The bug may have existed in another state or time, but current static code does not support the claim.

**Required V2 Update**
- Move this to “not confirmed from code”.

---

## New Gaps Discovered From Current Implementation

### GAP-N1 — Rounding rule documentation and code are only partially aligned

**Previous Documented Understanding**
- Documentation was updated via pending notes to the fractional-part rule.

**What Code Actually Does**
- `CollectPaymentPanel.jsx` and `orderTransform.js` use the new rule.
- `OrderEntry.jsx` local `applyRoundOff()` still uses the older inverse-style logic.

**Status**
- New gap discovered

**Impact on Final Documentation**
- Canonical rule and actual implementations are not fully unified.

**Required V2 Update**
- Add to architecture and risk docs as remaining inconsistency.

---

### GAP-N2 — Tax consistency is improved but not globally absolute

**Previous Documented Understanding**
- Pending notes suggested UI tax was now the single source of truth for payment and printing.

**What Code Actually Does**
- Collect-bill print/payment paths now reuse UI tax values via overrides.
- `buildBillPrintPayload()` still contains fallback tax/service-charge recomputation when overrides are absent.

**Status**
- New gap discovered

**Impact on Final Documentation**
- Full “single source of truth everywhere” wording would still be too strong.

**Required V2 Update**
- Mark as partial alignment, not full elimination of separate calculation paths.

---

### GAP-N3 — Stale socket tests are now a documented code/doc mismatch

**Previous Documented Understanding**
- Socket-handler coverage was described as partial, but stale expectations were underemphasized.

**What Code Actually Does**
- `updateOrderStatus.test.js` expects GET fallback-style behavior.
- Current `handleUpdateOrderStatus()` requires `payload.orders` and does not fetch from API.

**Status**
- New gap discovered

**Impact on Final Documentation**
- Test evidence is weaker than older summary implied.

**Required V2 Update**
- Add this mismatch to gap and risk tracking.

---

### GAP-N4 — Stale comments still contradict live socket behavior

**Previous Documented Understanding**
- Some docs already noted this, but current code makes it especially clear.

**What Code Actually Does**
- `useSocketEvents.js` and `socketHandlers.js` comments still say update-table channel was removed.
- Actual code subscribes to and handles `update-table`.

**Status**
- New gap discovered / ongoing mismatch

**Impact on Final Documentation**
- Inline code comments themselves are currently misleading.

**Required V2 Update**
- Keep highlighted as a source-of-confusion gap.

---

### GAP-N5 — “Mock data removal” is over-broad as a blanket statement

**Previous Documented Understanding**
- Mock files were treated as removable dead artifacts.

**What Code Actually Does**
- `TableCard.jsx` still has dead `mockOrderItems` usage.
- `notePresets` are active runtime reference data and should not be misclassified as dead mock content.

**Status**
- New gap discovered

**Impact on Final Documentation**
- Cleanup direction needs finer granularity.

**Required V2 Update**
- Split active reference data from dead mock remnants.

---

## Code / Document Mismatches Still Remaining

### GAP-M1 — AD-105 full verification claim would overstate current code

**Previous Documented Understanding**
- Pending notes suggested the gap was fully closed.

**What Code Actually Does**
- Alignment is strong in collect-bill flow, but fallback recomputation remains elsewhere.

**Status**
- Mismatch still remaining

**Impact on Final Documentation**
- AD-105 should remain partial, not fully verified.

**Required V2 Update**
- Do not over-absorb pending note language.

---

### GAP-M2 — AD-502 remains unimplemented despite adjacent service-charge fixes

**Previous Documented Understanding**
- Service-charge behavior changed significantly, so there was risk of assuming all SC-related issues were fixed.

**What Code Actually Does**
- Toggle still defaults to `true`.

**Status**
- Mismatch still remaining

**Impact on Final Documentation**
- Must preserve this unresolved UX/business-alignment gap.

**Required V2 Update**
- Keep AD-502 open/partial.

---

### GAP-M3 — Repo/branch/commit references in older memory docs are stale

**Previous Documented Understanding**
- Several memory docs referenced earlier commits/branches.

**What Code Actually Does**
- Current audited branch is `Piyush_QA`, commit `19fc8ff05506057b6fab89a6201162fa34baedf2`.

**Status**
- Mismatch still remaining

**Impact on Final Documentation**
- Traceability headers must be refreshed in v2 docs.

**Required V2 Update**
- Re-anchor all v2 docs to current audit baseline.

---

## Final Gap Summary

### Gaps now resolved
- Service charge post-discount implementation gap
- Health-check plugin open question
- `setupTests.polyfills.js` open question

### Gaps still open
- Socket authentication intent
- Backend persistence/authority assumptions that frontend cannot prove

### Wrong earlier assumptions
- Socket-driven notification source-of-truth
- `handleUpdateOrder` as fully dead
- Prepaid print-button absence as a current static-code fact

### New gaps discovered
- Rounding logic inconsistency across code paths
- Tax consistency is improved but not universal
- Stale socket tests vs current handlers
- Stale inline socket comments vs live subscriptions
- Over-broad “remove all mock data” guidance
