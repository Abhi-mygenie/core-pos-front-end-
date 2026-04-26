# Document Audit Status
- Source File: v2/DOC_VS_CODE_GAP.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Partially Finalized
- Confidence: High for static frontend gaps; Medium for runtime/backend-dependent gaps
- Code Areas Reviewed: `frontend/src/api/socket/*`, `frontend/src/components/order-entry/*`, `frontend/src/components/modals/SplitBillModal.jsx`, `frontend/src/api/transforms/orderTransform.js`, `frontend/src/contexts/*`, `frontend/src/config/firebase.js`, `frontend/public/firebase-messaging-sw.js`, `frontend/craco.config.js`, `frontend/src/pages/LoadingPage.jsx`, `frontend/src/__tests__/api/socket/updateOrderStatus.test.js`, `memory/BUG_TEMPLATE.md`, `v1/AD_UPDATES_PENDING.md`
- Notes: v3 re-validates v2 gaps against current commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179`. Build succeeded with one hook dependency warning. Port 3000 was already occupied during run attempt.

# DOC_VS_CODE_GAP — v3

## Resolved Gaps

### GAP-R1 — AD-101 service charge implementation gap remains resolved

**Previous Documented Understanding**
- V2 marked post-discount service charge as resolved.

**What Code Actually Does**
- `CollectPaymentPanel.jsx` computes service charge from `subtotalAfterDiscount`.
- `calcOrderTotals()` computes service charge from `postDiscount`.
- `buildBillPrintPayload()` applies discount-aware fallback service-charge math when no override is supplied.

**Status**
- Verified in code

**Impact on Final Documentation**
- No unresolved implementation gap for the primary service-charge base rule.

**Required V3 Update**
- Keep AD-101 verified.

---

### GAP-R2 — Discount precision gap is resolved in collect-bill UI

**Previous Documented Understanding**
- `AD_UPDATES_PENDING.md` Entry #9 said percent discounts had been changed from integer rounding to 2-decimal precision.

**What Code Actually Does**
- Preset, manual percent, and coupon percent discount expressions in `CollectPaymentPanel.jsx` retain 2-decimal precision.
- Final grand-total round-off remains separate.

**Status**
- Resolved / Verified

**Impact on Final Documentation**
- Requires a new billing decision or addendum; not a doc/code mismatch anymore.

**Required V3 Update**
- Add AD-001A or equivalent.

---

### GAP-R3 — Postpaid collect-bill auto-print is now implemented

**Previous Documented Understanding**
- Older notes said existing-order collect-bill did not call `order-temp-store` automatically.

**What Code Actually Does**
- `OrderEntry.jsx` Scenario 1 now calls `printOrder()` after successful collect-bill when `settings.autoBill` is ON.
- It passes live collect-bill overrides including discount, service charge, delivery, tax, tip, and runtime complimentary IDs.

**Status**
- Resolved for frontend path

**Impact on Final Documentation**
- V3 must supersede older “new-order only” auto-print wording.

**Required V3 Update**
- Document postpaid collect-bill auto-print as implemented, backend printer-side behavior still external.

---

### GAP-R4 — Split bill display now uses collect-bill final total

**Previous Documented Understanding**
- Older bug documentation said split bill used item subtotal instead of grand total.

**What Code Actually Does**
- `CollectPaymentPanel` passes live final total to `onOpenSplitBill()`.
- `OrderEntry` stores `splitGrandTotal`.
- `SplitBillModal` prefers `grandTotal` and proportionally scales per-person totals from item subtotal.

**Status**
- Resolved for display math

**Impact on Final Documentation**
- The original display-only gap is no longer current.

**Required V3 Update**
- Mark as implementation learning, not an open gap.

---

## Gaps Still Open

### GAP-O1 — WebSocket authentication intent remains unclear

**Previous Documented Understanding**
- V2 separated implementation fact from security intent.

**What Code Actually Does**
- Client sends no auth token/query/header in socket connection.

**Status**
- Still open

**Impact on Final Documentation**
- Frontend implementation is known; backend/security intent is not.

**Required V3 Update**
- Keep as needs backend/security clarification.

---

### GAP-O2 — Backend authority and persistence semantics remain unverified

**Previous Documented Understanding**
- Frontend payload construction is observable, backend persistence is not.

**What Code Actually Does**
- Frontend sends settlement values, `delivery_address`, complimentary flags, print overrides, and payment totals.
- Static frontend code cannot confirm backend acceptance, validation, or persistence semantics.

**Status**
- Still open

**Impact on Final Documentation**
- Do not document backend authority claims as code-verified.

**Required V3 Update**
- Keep backend clarification markers for settlement and delivery-address persistence.

---

### GAP-O3 — `.env.example` and setup contract remain absent

**Previous Documented Understanding**
- Repo should expose required environment variables.

**What Code Actually Does**
- No `.env.example` found.
- Build succeeds only because env values are available in environment; key variables are referenced directly in code.

**Status**
- Still open

**Impact on Final Documentation**
- Onboarding/setup remains underspecified.

**Required V3 Update**
- Keep setup documentation gap open.

---

## Wrong Earlier Assumptions

### GAP-W1 — Health-check plugin was over-confirmed in v2

**Previous Documented Understanding**
- V2 said health-check plugin files existed and the question was resolved.

**What Code Actually Does**
- `frontend/plugins/health-check/*` is absent.
- `craco.config.js` still conditionally requires those missing files when `ENABLE_HEALTH_CHECK === "true"`.

**Status**
- Wrong earlier assumption / Contradicted by code tree

**Impact on Final Documentation**
- Health-check cannot be documented as implemented.

**Required V3 Update**
- Mark as stale config risk; if enabled, dev server/build path may fail.

---

### GAP-W2 — Notification source-of-truth was documented incorrectly in older docs

**Previous Documented Understanding**
- Socket-only notification source was previously asserted.

**What Code Actually Does**
- Notifications arrive through Firebase foreground messages and service-worker forwarded background messages.
- Settings includes `NotificationTester` simulation.

**Status**
- Wrong earlier assumption, already corrected in v2 and retained in v3

**Impact on Final Documentation**
- Keep FCM/service-worker wording.

**Required V3 Update**
- Do not restore socket-only notification wording.

---

### GAP-W3 — `handleUpdateOrder` is not fully dead

**Previous Documented Understanding**
- Older docs over-classified it as dead.

**What Code Actually Does**
- It is registered in `getHandler()` and delegates to `handleOrderDataEvent()`.
- `useSocketEvents()` bypasses the wrapper and calls `handleOrderDataEvent()` directly.

**Status**
- Wrong earlier assumption / Superseded

**Impact on Final Documentation**
- It is legacy wrapper code, not safely removable without checking registry consumers.

**Required V3 Update**
- Keep precise wording.

---

## New Gaps Discovered From Current Implementation

### GAP-N1 — Health-check conditional config points to missing files

**Previous Documented Understanding**
- Not listed as a v2 new gap because v2 believed files existed.

**What Code Actually Does**
- Conditional `require("./plugins/health-check/...")` remains in `craco.config.js`, but no plugin folder exists.

**Status**
- New current-code gap

**Impact on Final Documentation**
- Enabling health checks is unsafe without restoring/removing plugin files.

**Required V3 Update**
- Add to risk register.

---

### GAP-N2 — Runtime complimentary override parity is not universal

**Previous Documented Understanding**
- `AD_UPDATES_PENDING.md` Entry #10 says manual and postpaid collect-bill auto-print forward runtime complimentary IDs.

**What Code Actually Does**
- Manual print and postpaid collect-bill auto-print forward `runtimeComplimentaryFoodIds`.
- Prepaid new-order auto-print override does not include that list.

**Status**
- New partial gap

**Impact on Final Documentation**
- Runtime complimentary print support is strong in two paths but not globally proven.

**Required V3 Update**
- Mark AD-021 as partial for prepaid auto-print parity.

---

### GAP-N3 — Room-with-associated-orders service-charge UI guard differs from default branch

**Previous Documented Understanding**
- V2 documented SC gating as dine-in/walk-in/room.

**What Code Actually Does**
- Default collect-bill branch guards service-charge UI with `scApplicable`.
- Room-with-associated-orders branch renders service-charge toggle when `serviceChargePercentage > 0`; it is inherently room-specific but does not use the same `scApplicable` guard in JSX.

**Status**
- New nuance / Partial gap

**Impact on Final Documentation**
- Gating decision is verified for normal branches; room checkout branch should be documented as a separate UI path.

**Required V3 Update**
- Keep SC order-type gating verified but mention room checkout branch nuance.

---

### GAP-N4 — Build/run verification differs from v2 traceability

**Previous Documented Understanding**
- V2 referenced commit `19fc8ff...` and successful build/run.

**What Code Actually Does**
- Current commit is `32d91748...`.
- `yarn build` succeeded with `LoadingPage.jsx` missing dependency warning.
- `yarn start` attempt found port 3000 already in use.

**Status**
- New traceability update

**Impact on Final Documentation**
- Headers must be re-anchored to current commit and build/run facts.

**Required V3 Update**
- Update all v3 headers and summary.

---

## Code / Document Mismatches Still Remaining

### GAP-M1 — Final-total rounding remains duplicated and inconsistent

**Previous Documented Understanding**
- V2 already marked this partial.

**What Code Actually Does**
- `CollectPaymentPanel` and `calcOrderTotals` use fractional `> 0.10`.
- `OrderEntry.applyRoundOff()` still uses distance-to-ceiling `>= 0.10`.

**Status**
- Mismatch still remaining

**Impact on Final Documentation**
- AD-001 cannot be marked globally verified.

**Required V3 Update**
- Keep partial status and risk.

---

### GAP-M2 — Stale socket comments still contradict live subscriptions

**Previous Documented Understanding**
- V2 noted stale comments.

**What Code Actually Does**
- `useSocketEvents.js` comments say table channel removed, but code subscribes to `getTableChannel()`.
- `socketHandlers.js` comments also say update-table channel is no longer subscribed.

**Status**
- Mismatch still remaining

**Impact on Final Documentation**
- Inline comments are unreliable for this area.

**Required V3 Update**
- Keep highlighted.

---

### GAP-M3 — Stale socket handler tests remain misleading

**Previous Documented Understanding**
- V2 called out `updateOrderStatus.test.js` drift.

**What Code Actually Does**
- Test expects `fetchSingleOrderForSocket()` fallback behavior.
- Handler now fails fast when `payload.orders` is absent.

**Status**
- Mismatch still remaining

**Impact on Final Documentation**
- Tests are not reliable evidence for current handler behavior.

**Required V3 Update**
- Keep as risk and doc gap.

---

### GAP-M4 — Broken `paymentService.collectPayment()` remains in tree

**Previous Documented Understanding**
- V2 flagged undefined `CLEAR_BILL`.

**What Code Actually Does**
- `paymentService.collectPayment()` posts to `API_ENDPOINTS.CLEAR_BILL`.
- `CLEAR_BILL` is absent from `API_ENDPOINTS`.

**Status**
- Mismatch still remaining

**Impact on Final Documentation**
- Dead/broken service remains a critical latent risk.

**Required V3 Update**
- Keep in risk register.

---

## Final Gap Summary

### Gaps now resolved or newly verified
- Service charge post-discount implementation
- Discount 2-decimal precision in collect-bill UI
- Postpaid collect-bill auto-print from frontend when `settings.autoBill` is ON
- Split bill display total alignment with collect-bill final total
- Cancelled item display parity in collect-bill item lists

### Gaps still open
- Socket authentication/security intent
- Backend persistence/authority semantics for settlement and delivery address
- `.env.example`/setup contract

### Wrong earlier assumptions
- Health-check plugin files are not present in current tree
- Socket-only notification source
- `handleUpdateOrder` as fully dead

### New/current gaps
- Missing health-check plugin files behind enabled config
- Runtime complimentary override not visible in prepaid auto-print override object
- Current commit/build/run traceability differs from v2

## What Changed From v2
- Reclassified health-check plugin from resolved to contradicted/missing.
- Added BUG-020/021/022 and postpaid auto-print learnings.
- Preserved persistent mismatches: rounding duplication, stale socket comments, stale socket tests, undefined `CLEAR_BILL`.