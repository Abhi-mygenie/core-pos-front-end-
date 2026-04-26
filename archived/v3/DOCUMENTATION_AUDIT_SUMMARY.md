# Document Audit Status
- Source File: v2/DOCUMENTATION_AUDIT_SUMMARY.md
- Reviewed By: Senior Software Architect and Documentation Audit Agent
- Review Type: Code-verified finalization audit
- Status: Partially Finalized
- Confidence: High for frontend/code-observed facts; Medium for backend/product-dependent conclusions
- Code Areas Reviewed: `frontend/src/**/*`, `frontend/public/firebase-messaging-sw.js`, `frontend/craco.config.js`, `memory/BUG_TEMPLATE.md`, `v1/AD_UPDATES_PENDING.md`, `v2/*`
- Notes: v3 reconciles the v2 documentation set against current branch checkout `piyush_QA` at commit `32d91748ff963c7ecb8b9c98c102f1280a2fc179`. Requested branch name was `Piyush_QA`; remote branch available was lowercase `piyush_QA`.

# DOCUMENTATION_AUDIT_SUMMARY — v3

## Documents Reviewed
- `v2/ARCHITECTURE_DECISIONS_FINAL.md`
- `v2/DOC_VS_CODE_GAP.md`
- `v2/OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md`
- `v2/RISK_REGISTER.md`
- `v2/DOCUMENTATION_AUDIT_SUMMARY.md`
- Supporting: `v1/AD_UPDATES_PENDING.md`
- Supporting: `memory/BUG_TEMPLATE.md`
- Current React frontend source under `frontend/src`, `frontend/public`, and `frontend/craco.config.js`

## Overall Status by Document
- `ARCHITECTURE_DECISIONS_FINAL.md` → **Finalized in `/v3` with backend/product caveats**
- `DOC_VS_CODE_GAP.md` → **Finalized in `/v3` with updated gap statuses**
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` → **Finalized in `/v3` with new implementation learnings**
- `RISK_REGISTER.md` → **Finalized in `/v3` with current-code risks**
- `COMPARISON_SUMMARY.md` → **Created in `/v3`**

## Build / Run Verification
- Production build command run: `yarn build` in `/app/frontend`.
- Result: **Build succeeded**.
- Build warning observed:
  - `src/pages/LoadingPage.jsx` — missing `loadStationData` dependency in `useEffect`.
- Run attempt command: `yarn start` in `/app/frontend`.
- Result: start did not launch a new process because **port 3000 was already occupied** by an existing frontend process.
- Earlier dependency issue (`firebase/app` missing) was resolved by installed `node_modules`; current build includes `@firebase` packages.

## Decisions Fully Verified From Code
- Service charge is computed on **post-discount subtotal** in collect-bill and core transform math.
- GST calculation includes discounted item GST plus GST on service charge, tip, and delivery charge using average GST rate.
- Percent discounts retain **2-decimal precision** before final total rounding.
- Final total rounding uses fractional `> 0.10` in `CollectPaymentPanel` and `calcOrderTotals`.
- `update-table` socket channel is active despite stale comments.
- v2 payload-driven socket handlers fail fast when `payload.orders` is missing.
- `defaultOrderStatus` from profile is actively used in dashboard confirm-order flow.
- Frontend running-order role normalization is `Waiter` vs `Manager`.
- Notification ingress is Firebase Cloud Messaging/service-worker based.
- shadcn `Toaster` is mounted; Sonner exists but is inactive.
- Split Bill display now receives collect-bill `finalTotal` and apportions by ratio.
- Postpaid collect-bill auto-print is now implemented when `settings.autoBill` is enabled.
- Cancelled items are shown struck-through/gray in collect-bill item lists.
- Delivery order payloads include `delivery_address`; non-delivery place-order paths emit `delivery_address: null`.

## Decisions Changed After Code Audit
- **Health-check plugin**: v2 said plugin files existed; current tree has no `frontend/plugins/health-check/*`, while CRACO still conditionally requires them.
- **AD-001**: remains partial because `OrderEntry.applyRoundOff()` still uses older distance-to-ceiling logic.
- **AD-001A**: new decision added for 2-decimal discount precision.
- **AD-021 / runtime complimentary print**: new implementation learning; manual and postpaid auto-print paths pass runtime IDs, prepaid auto-print parity is not fully visible.
- **AD-302**: improved because postpaid collect-bill auto-print now uses live overrides, but fallback print paths remain.
- **AD-303**: current code confirms fresh prepaid pre-place manual print is unavailable, but memory says BUG-005 is closed as not a business requirement.

## Items Absorbed From `AD_UPDATES_PENDING.md`
- Entry #1 / AD-101 → absorbed and verified.
- Entry #2 / AD-105 → partially absorbed; override paths align, fallback print recomputation remains.
- Entry #3 / AD-302 → partially absorbed; collect-bill print/auto-print improved, not universal.
- Entry #6 / delivery address → absorbed as frontend-verified with backend persistence caveat.
- Entry #7 / AD-001 rounding → absorbed with persistent `OrderEntry` inconsistency.
- Entry #8 / service-charge gating → absorbed with room-checkout UI nuance.
- Entry #9 / discount precision → absorbed as new AD-001A.
- Entry #10 / runtime complimentary print → absorbed as new partial decision.
- Entry #11 / cancelled item display → recorded as verified display-only implementation learning.

## Gaps Still Remaining
- WebSocket authentication intent is not provable from frontend code.
- Backend persistence/authority claims around settlement values are not provable from frontend code.
- Delivery address persistence remains backend-unconfirmed.
- Service-charge toggle still defaults ON.
- Tax consistency is strong in override paths but not absolute in every print path.
- Rounding logic is inconsistent between main billing code and `OrderEntry` local helper.
- Stale inline comments still contradict actual `update-table` subscription behavior.
- Broken dead `paymentService.collectPayment()` remains in tree.
- Stale socket test expectations remain in `updateOrderStatus.test.js`.
- Health-check plugin config references files absent from the current repo.

## Open Questions Still Not Confirmed From Code
- Whether client-side unauthenticated socket handshake is backend-approved.
- Whether backend persists `delivery_address` and returns it consistently via single-order APIs.
- Whether backend treats frontend settlement values as authoritative, advisory, or revalidated.
- Whether fresh prepaid pre-place manual bill printing should remain unavailable.
- Whether mobile/touch/keyboard support meets product expectations.
- Future CRM key sourcing beyond current env JSON map.

## Architecture Risks Still Visible in Implementation
- Auth/session risks: token in localStorage, no refresh flow, hard redirect on 401.
- Billing consistency risks: undefined `CLEAR_BILL`, rounding drift, fallback print recomputation, partial runtime complimentary print parity.
- Operational risks: sequential loading, socket-coupled flow completion, engage-lock staleness.
- Documentation/maintainability risks: stale comments, stale tests, oversized hotspot files, missing health-check plugin files.

## Recommended Next Actions

### Product / Business
- Confirm service-charge default toggle behavior.
- Confirm prepaid pre-place manual print policy.
- Confirm expected behavior for runtime complimentary items in prepaid auto-print.

### Backend
- Confirm websocket auth/security model.
- Confirm settlement value persistence/authority rules.
- Confirm delivery-address persistence and response shape.

### Engineering Documentation
- Treat `/v3` as the trusted current baseline.
- Update any future docs to cite commit `32d91748...` or newer.
- Do not reuse v2 health-check plugin wording unless plugin files are restored.

## Final Trust Statement
The `/v3` documents are safer than v2 because they:
- re-anchor to the current code and build result,
- incorporate post-v2 implementation learnings from memory and source code,
- correct the health-check plugin mismatch,
- separate frontend-verified behavior from backend/product assumptions,
- and clearly mark remaining partial, contradicted, stale, and unverified items.

## What Changed From v2
- Updated branch/commit/build/run traceability.
- Added current BUG-020/021/022, split-bill, delivery-address, and postpaid-auto-print findings.
- Reclassified health-check plugin from resolved to missing/contradicted.
- Preserved unresolved high-priority risks rather than overstating completion.