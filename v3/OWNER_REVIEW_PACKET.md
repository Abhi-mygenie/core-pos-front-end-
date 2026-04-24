# Owner Review Packet — v3 Needs Clarification

## Purpose
This packet converts the v3 “Not Confirmed / Needs Clarification” items into owner-ready questions for backend and product review.

## Audit Baseline
- Repo branch used: `piyush_QA`
- Commit: `32d91748ff963c7ecb8b9c98c102f1280a2fc179`
- Source of truth for this packet: `/app/v3/*`
- Frontend build status: succeeded with one existing `LoadingPage.jsx` hook dependency warning

---

## Backend Owner Review

### B-01 — WebSocket authentication / security model
**Current frontend evidence**
- `socketService.connect()` sends no auth token, query token, auth payload, or extra headers.

**Question for backend/security owner**
- Is the unauthenticated client-side socket handshake intentional and protected by backend-side controls?

**Decision needed**
- a) Approved as-is; backend has sufficient server-side protection.
- b) Frontend must send auth data in the socket handshake.
- c) Backend/socket gateway changes are needed before frontend changes.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-107
- `DOC_VS_CODE_GAP.md` → GAP-O1
- `RISK_REGISTER.md` → RISK-014

---

### B-02 — Settlement value authority
**Current frontend evidence**
- Frontend computes and submits collect-bill values: final total, discounts, service charge, GST/VAT, tip, delivery charge, partial payments, complimentary carve-outs.
- Static frontend code cannot prove whether backend persists, validates, overrides, or recomputes these values.

**Question for backend owner**
- For `order-bill-payment`, `place-order`, room transfer, and print payloads, are frontend-calculated settlement values authoritative, advisory, or revalidated/recomputed by backend?

**Decision needed**
- a) Frontend values are authoritative and persisted as submitted.
- b) Backend recomputes authoritative totals and frontend values are display/request hints.
- c) Hybrid: specify which fields are frontend-authoritative vs backend-authoritative.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-401 / AD-402
- `DOC_VS_CODE_GAP.md` → GAP-O2
- `RISK_REGISTER.md` → RISK-018 / RISK-037 if affected

---

### B-03 — Delivery address persistence
**Current frontend evidence**
- `placeOrder()` and `placeOrderWithPayment()` emit `delivery_address`:
  - full object for delivery orders,
  - `null` for non-delivery orders.
- `fromAPI.order()` reads `api.delivery_address` back into `deliveryAddress`.
- v1 pending notes say backend persistence was previously not confirmed.

**Question for backend owner**
- Does backend persist the submitted `delivery_address` object and return it unchanged/normalized via `get-single-order-new` and running-order APIs?

**Decision needed**
- a) Yes, persistence and response shape are confirmed.
- b) Backend persistence is not implemented yet.
- c) Backend expects a different shape; provide exact contract.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → delivery-address implementation notes
- `DOC_VS_CODE_GAP.md` → GAP-O2 / delivery-address backend caveat
- `RISK_REGISTER.md` → RISK-037

---

### B-04 — Health-check plugin ownership
**Current frontend evidence**
- `craco.config.js` conditionally requires `frontend/plugins/health-check/*` when `ENABLE_HEALTH_CHECK=true`.
- Current repo tree does not contain `frontend/plugins/health-check/*`.

**Question for engineering/platform owner**
- Should health-check support be restored, or should the conditional config be removed/retired?

**Decision needed**
- a) Restore missing plugin files and keep `ENABLE_HEALTH_CHECK` support.
- b) Remove stale health-check config and document it as retired.
- c) Keep disabled only; no immediate action.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-901
- `DOC_VS_CODE_GAP.md` → GAP-N1
- `RISK_REGISTER.md` → RISK-035

---

## Product Owner Review

### P-01 — Fresh prepaid pre-place manual Print Bill policy
**Current frontend evidence**
- `CollectPaymentPanel` shows Print Bill only when `hasPlacedItems && onPrintBill`.
- Fresh prepaid Place+Pay flow reaches Collect Bill before order placement, so `hasPlacedItems` is false.
- `memory/BUG_TEMPLATE.md` marks BUG-005 closed as “not a business requirement.”

**Question for product owner**
- Should fresh prepaid orders support manual Print Bill before the place-order call, or is current behavior intended?

**Decision needed**
- a) Current behavior is intended; no pre-place manual print.
- b) Manual print should be supported after placing order only.
- c) Manual pre-place print should be supported from local cart values.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-303
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` → OQ-303

---

### P-02 — Service-charge toggle default
**Current frontend evidence**
- `CollectPaymentPanel` initializes `serviceChargeEnabled` to `true`.
- Service charge is hidden for non-applicable normal order types, but when shown it defaults ON.

**Question for product owner**
- Should service charge default ON whenever applicable, or should it reflect profile/order/customer policy more specifically?

**Decision needed**
- a) Keep default ON.
- b) Default OFF and let cashier enable.
- c) Default based on backend/profile/order metadata.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-502
- `RISK_REGISTER.md` → RISK-030

---

### P-03 — Runtime complimentary parity for prepaid auto-print
**Current frontend evidence**
- Manual print and postpaid collect-bill auto-print pass `runtimeComplimentaryFoodIds`.
- Prepaid new-order auto-print does not visibly pass this override list.

**Question for product owner**
- Must runtime-marked complimentary items print at zero in prepaid auto-print flows with the same guarantee as manual/postpaid print?

**Decision needed**
- a) Yes, prepaid auto-print must have parity.
- b) No, runtime complimentary is only required for manual/postpaid collect-bill print.
- c) Needs QA/runtime validation before deciding.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-021
- `DOC_VS_CODE_GAP.md` → GAP-N2
- `RISK_REGISTER.md` → RISK-036

---

### P-04 — Walk-in business definition
**Current frontend evidence**
- Frontend infers walk-in when `!api.table_id || api.table_id === 0`.
- This is verified as frontend logic but not product-wide business truth.

**Question for product owner**
- Is “walk-in = dine-in style order with `table_id = 0`” the official business definition?

**Decision needed**
- a) Yes, document as official.
- b) No, provide official definition.
- c) Keep documented only as frontend inference.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-003
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` → OQ-003

---

### P-05 — Mobile / touch / keyboard support completeness
**Current frontend evidence**
- Static code contains many clickable controls and some accessibility attributes.
- Static audit cannot certify full mobile/touch/keyboard compliance.

**Question for product owner**
- Is full mobile/touch/keyboard support a required acceptance criterion for this POS frontend?

**Decision needed**
- a) Yes, formal support is required and should be tested/documented.
- b) Desktop/touch-primary use is sufficient for now.
- c) Needs separate UX/accessibility audit.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-503
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` → OQ-503

---

## Documentation / Repository Owner Review

### D-01 — `.env.example` contract
**Current frontend evidence**
- No `.env.example` exists.
- Code depends on `REACT_APP_API_BASE_URL`, `REACT_APP_SOCKET_URL`, Firebase variables, CRM variables, optional Google Maps key, and optional `ENABLE_HEALTH_CHECK`.

**Question for documentation/repo owner**
- Should this repo include a maintained `.env.example` for required frontend configuration?

**Decision needed**
- a) Yes, create and maintain `.env.example`.
- b) No, environment contract is documented elsewhere.
- c) Create a docs-only setup section instead.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-701
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` → OQ-701

---

### D-02 — Repo governance / history rewrite policy
**Current frontend evidence**
- Static code cannot verify repo governance decisions.

**Question for repository owner**
- Should history rewrite / force-push governance remain in architecture docs, or move to a separate repo policy document?

**Decision needed**
- a) Keep in architecture docs as governance note.
- b) Move to repository policy docs.
- c) Remove from code-verified architecture baseline.

**Docs to update after answer**
- `ARCHITECTURE_DECISIONS_FINAL.md` → AD-801
- `OPEN_QUESTIONS_DECISION_STATUS_SUMMARY.md` → OQ-801

---

## Suggested Review Agenda
1. Backend/security: B-01, B-02, B-03.
2. Engineering/platform: B-04.
3. Product: P-01, P-02, P-03, P-04, P-05.
4. Documentation/repo owner: D-01, D-02.

## Suggested Output From Owners
For each item, capture:
- selected decision option,
- owner name/team,
- decision date,
- any implementation ticket/link,
- whether v3 docs need immediate update.