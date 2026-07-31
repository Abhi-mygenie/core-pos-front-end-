# POS2-003-REOPEN-B — `place-order` v1 → v2 Endpoint Revert Implementation Summary

> **Sprint:** pos2.0
> **CR ID:** POS2-003-REOPEN-B (place-order only — PROFILE deferred per owner clarification 2026-05-09)
> **Date:** 2026-05-09
> **Owner directive:** "change for place order only `https://preprod.mygenie.online/api/v2/vendoremployee/order/place-order`"
> **Predecessors:**
> - POS2-003 main implementation (2026-05-08) — original v2 → v1 switch
> - POS2-003-REOPEN impact analysis (2026-05-09) — BC-5 + BC-6 captured
> - POS2-003-REOPEN-A implementation + wire-level QA (2026-05-09)
> - POS2.0 sprint consolidation + owner decisions amendment (2026-05-09)

---

## 1. Pre-flip validation

### 1.1 Endpoint live probe

| URL | HTTP (GET, unauthenticated) | Verdict |
|---|---|---|
| `https://preprod.mygenie.online/api/v2/vendoremployee/order/place-order` | **405** (`MethodNotAllowedHttpException` — "GET method is not supported for this route. Supported methods: POST.") | ✅ deployed; route exists; POST-only (correct for place-order) |
| `https://preprod.mygenie.online/api/v1/vendoremployee/order/place-order` | 405 (identical Laravel error shape) | ✅ deployed; same route shape as v2 |

Both v1 and v2 emit the same Laravel `MethodNotAllowedHttpException`, indicating identical routing-layer registration. The v2 endpoint is confirmed live.

### 1.2 PROFILE not flipped (deferred)

The owner-stated path `/api/v1/vendoremployee/vendor-profile/profile` returned **HTTP 404** (the MyGenie 404 HTML page) — it does not exist on v1. The closest deployed match is `/api/v2/vendoremployee/vendor-profile/profile` (HTTP 401 — auth-required, deployed). Per owner clarification *"change for place order only"*, **PROFILE remains at `/api/v1/vendoremployee/profile`**. Profile flip is out of scope for this CR.

---

## 2. Files changed

| # | File | Change | Lines net |
|---|---|---|---:|
| 1 | `frontend/src/api/constants.js` | Line 41: `PLACE_ORDER` flipped from `'/api/v1/vendoremployee/order/place-order'` → `'/api/v2/vendoremployee/order/place-order'`; comment updated to record the REOPEN-B revert with date + validation note | 1/1 |
| 2 | `frontend/src/__tests__/integration/POS2_003_REOPEN_A_wire.test.js` | Line 377: endpoint-sanity assertion `'/api/v1/...'` → `'/api/v2/...'`; test title updated from "REOPEN-B not started" → "REOPEN-B applied 2026-05-09" | 2/2 |
| 3 | `frontend/src/__tests__/integration/POS2_003_REOPEN_A_wire.test.js` | Line 474: endpoint-contract sanity assertion (the global §6 sanity block) `'/api/v1/...'` → `'/api/v2/...'`; comment updated | 1/1 |

**Total LOC delta:** +4 / -4 (literal swaps + comment updates only).

**No other files touched.** No edits to:
- `orderTransform.js` (line 748 + 957 already documented v2 in their inline endpoint comments — those comments are now consistent with the constant again)
- `OrderEntry.jsx` (uses `API_ENDPOINTS.PLACE_ORDER` constant — no hardcoded path; flip transparent)
- `printerAgentSelector.js`, `profileTransform.js`, `RestaurantContext.jsx`
- Any other test file (no other test asserts the literal v1 path)
- `/app/memory/final/*` (untouched per playbook)
- `PROFILE`, `UPDATE_ORDER`, `CANCEL_ITEM`, `ORDER_STATUS_UPDATE`, or any other endpoint constant

---

## 3. Exact diffs

### 3.1 `frontend/src/api/constants.js:41`

```diff
- PLACE_ORDER:       '/api/v1/vendoremployee/order/place-order',          // CR-POS2-003 (May-2026): switched v2 → v1; multipart shape unchanged. New order (unpaid + prepaid via payment_status=paid)
+ PLACE_ORDER:       '/api/v2/vendoremployee/order/place-order',          // CR-POS2-003-REOPEN-B (May-2026): reverted v1 → v2 per owner directive 2026-05-09. v2 confirmed deployed (HTTP 405 for GET, identical Laravel route shape as v1). Multipart shape unchanged. New order (unpaid + prepaid via payment_status=paid)
```

### 3.2 `frontend/src/__tests__/integration/POS2_003_REOPEN_A_wire.test.js:376-378`

```diff
- test('Endpoint UNCHANGED at v1 place-order (REOPEN-B not started)', () => {
-   expect(API_ENDPOINTS.PLACE_ORDER).toBe('/api/v1/vendoremployee/order/place-order');
- });
+ test('Endpoint UNCHANGED at v2 place-order (REOPEN-B applied 2026-05-09)', () => {
+   expect(API_ENDPOINTS.PLACE_ORDER).toBe('/api/v2/vendoremployee/order/place-order');
+ });
```

### 3.3 `frontend/src/__tests__/integration/POS2_003_REOPEN_A_wire.test.js:474` (§6 endpoint-contract sanity)

```diff
- expect(API_ENDPOINTS.PLACE_ORDER).toBe('/api/v1/vendoremployee/order/place-order'); // REOPEN-B not started
+ expect(API_ENDPOINTS.PLACE_ORDER).toBe('/api/v2/vendoremployee/order/place-order'); // REOPEN-B applied 2026-05-09
```

---

## 4. Validation results

| # | Gate | Command | Result |
|---|---|---|---|
| 1 | v2 endpoint live | `curl https://preprod.mygenie.online/api/v2/vendoremployee/order/place-order` (GET) | HTTP 405 — POST-only route exists ✅ |
| 2 | v1 / v2 routing parity | identical Laravel error shape on both | ✅ confirms route registration is symmetric |
| 3 | Full unit test suite | `yarn test --watchAll=false` | **23/23 suites · 291/291 tests pass** ✅ |
| 4 | Production build | `yarn build` | **`Compiled successfully`** in 26.69s; bundle 434.04 kB (no change vs pre-flip — flip is constant-only) ✅ |
| 5 | Lint | (no separate lint run; flip introduces no syntactic change) | ✅ no warnings introduced |
| 6 | Endpoint constants integrity | `grep -nE "PLACE_ORDER:|PROFILE:" constants.js` | Both constants unique; `PLACE_ORDER` on v2; `PROFILE` on v1 (unchanged) ✅ |
| 7 | Other 3 v2 endpoints (REOPEN-A scope) unchanged | `UPDATE_ORDER`, `CANCEL_ITEM`, `ORDER_STATUS_UPDATE` all at v2 | ✅ unchanged |

### 4.1 Test suites confirming the new contract

- `POS2_003_REOPEN_A_wire.test.js` §1 (UPDATE_ORDER endpoint), §2 (CANCEL_ITEM endpoint), §3 (ORDER_STATUS_UPDATE endpoint), §4 (place-order regression — now asserts v2), §5 (PRINT_ORDER), §6 (global endpoint sanity block — now expects v2).
- `placeOrderPayload.test.js` (POS2-003 unit — payload shape unchanged; doesn't assert URL).
- `printerAgentSelector.test.js`, `profileTransform.test.js`, `cancelAndUpdatePayload.test.js`, `cancelItemPayload.test.js`, `role-name-wire-contract.test.js` — all unaffected.

### 4.2 No payload/contract delta

- `orderTransform.placeOrder` builder is unchanged; payload shape (multipart `payload` field, `printer_agent`, `cart`, `cust_*`, payment fields, etc.) is identical to what worked on v1 yesterday and identical to what FE used to ship pre-May-08 to v2. POS2-003 implementation summary §1.4 documents *"multipart shape unchanged"*; that statement remains true after this revert.
- The additive `printer_agent` field flows over v2 the same way it flows over v1 (BE-PA3 owner closure 2026-05-09 confirms v2 accepts the additive).

---

## 5. Cross-impact check

| Area | Impact | Status |
|---|---|---|
| **POS2-003 main** (printer_agent on place-order payload) | None — payload shape unchanged; v2 route accepts same multipart contract per BE-PA3 | ✅ no regression |
| **POS2-003-FU-02** (printer_agent on `order-temp-store`) | None — `PRINT_ORDER` endpoint untouched | ✅ no regression |
| **POS2-003-REOPEN-A** (printer_agent on update / cancel / cancel-order) | None — all 3 v2 endpoints in REOPEN-A unchanged | ✅ no regression |
| **CR-007 prepaid place-order auto-print** | Same multipart payload on v2; auto-print pathway downstream of `api.post(API_ENDPOINTS.PLACE_ORDER, ...)` is endpoint-agnostic | ✅ no regression expected |
| **OrderEntry / TableCard place-order call sites** | Both reference `API_ENDPOINTS.PLACE_ORDER` (no hardcoded paths); flip is transparent to caller | ✅ no code change needed |
| **Socket emissions / FCM YTC tone / audit log** (BC-6) | Unverified by FE; this is the residual BC-6 risk — backend wire-diff between v1 and v2 not yet provided | ⚠ recommend live one-order smoke (see §7) |
| **/app/memory/final/*** | Untouched | ✅ |

---

## 6. PROFILE endpoint — explicit out-of-scope note

Owner asked initially to also flip `PROFILE` to `/api/v1/vendoremployee/vendor-profile/profile`. Pre-flip validation showed:

- That exact path returns **HTTP 404** on `preprod.mygenie.online` (deployment doesn't exist).
- The closest deployed match is `/api/v2/vendoremployee/vendor-profile/profile` (the path FE used pre-May-08).
- The May-08 owner override comment recorded a schema delta between the two paths: `print_agent` was at TOP LEVEL on the new v1 path vs nested under `restaurants[0]` on the v2 vendor-profile path.

Owner clarified *"change for place order only"* — PROFILE remains at `/api/v1/vendoremployee/profile`. If the owner later wants to flip PROFILE, that's a **separate CR** because:

1. The new path on v1 needs to be deployed by the backend first (404 today).
2. The schema delta (`print_agent` top-level vs nested) requires a coordinated `profileTransform.js` change that may ripple back into POS2-003 / FU-02 / REOPEN-A printer_agent selection.
3. A live response-shape comparison (with auth) is required before the flip — we cannot validate a 404 endpoint.

PROFILE flip is therefore **NOT** part of this CR. Recommended to spawn a follow-up `POS2-003-REOPEN-B-PROFILE` if/when backend deploys the path.

---

## 7. Recommended live smoke (BC-6 surrogate)

Per the impact analysis BC-6 ("backend behavioural-parity confirmation between v1 and v2 place-order endpoints — socket emissions, FCM YTC tone, audit log"), the cheapest closure is a **one-order live smoke** on a real tenant:

1. Place a single test order (postpaid dineIn, simple cart, low value) via the running app at `https://insights-phase.preview.emergentagent.com`.
2. Inspect via DevTools / browser network tab:
   - URL targets `…/api/v2/vendoremployee/order/place-order` (✓ visible immediately).
   - HTTP 200 response with normal place-order JSON shape (orderId, etc.).
   - Socket emissions `new-order` / `order-engage` arrive on the dashboard (kitchen + audit listeners).
   - YTC tone fires if applicable (Phase 1 override now exercised on v2 path).
   - Audit log row appears under Audit Report → Audit tab for the new order.
3. If all 4 emissions match the pre-revert v1 behaviour → **REOPEN-B closed at `parity_confirmed`**.
4. If any emission is missing/different → backend bug surfaced; raise ticket; consider rollback to v1 in `constants.js` until backend resolves.

This live smoke is **not blocking the merge** — code is safe; smoke is BC-6 confirmation only.

---

## 8. Risks / follow-ups

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R-1 | v2 emits a different socket event vocabulary than v1 (BC-6 unverified) | Medium | Live one-order smoke (§7). Rollback is 1-line if observed. |
| R-2 | v2 multipart contract drift (e.g. v2 expects an additional field v1 didn't) | Low | BE-PA3 closure 2026-05-09 confirms v2 accepts the existing payload + the additive `printer_agent`. POS2-003 implementation summary §1.4 documents the v2 shape was historically identical to v1. |
| R-3 | CR-013 Bean Me Up double-count interaction (independent track) | None | Bean Me Up is on a separate Razorpay-paid pathway via `BILL_PAYMENT`; place-order endpoint flip does not touch the printed-bill template payload. |
| R-4 | Future agent missing the inline comment and re-flipping it back | Low | Comment on line 41 explicitly references "REOPEN-B (May-2026)" + date + owner directive. Test assertion at `POS2_003_REOPEN_A_wire.test.js:377` would fail loudly on any accidental revert. |
| R-5 | PROFILE path 404 leaves owner without the originally-requested change | Owner-driven | Documented in §6; spawn `POS2-003-REOPEN-B-PROFILE` follow-up if/when backend deploys the v1 vendor-profile path. |

---

## 9. Final verdict

> ## `implementation_complete_ready_for_QA`

- 1 production constant flipped + 2 test assertions updated. Total LOC delta: 4/4.
- 23/23 suites · 291/291 tests pass.
- Production build clean; bundle size unchanged.
- Live preprod probe confirms v2 endpoint deployed.
- PROFILE flip explicitly deferred (path 404 on v1; owner clarified "place order only").
- BC-5 (owner reason) closed by directive 2026-05-09. BC-6 (BE wire-diff) — recommended one-order live smoke for confirmation; non-blocking.

### Next action items

- **Owner / QA:** run the §7 one-order live smoke at convenience; capture network + socket evidence.
- **Backend (parallel):** if the owner still wants the PROFILE path flipped to `vendor-profile`, deploy `/api/v1/vendoremployee/vendor-profile/profile` first; then a follow-up CR can validate shape parity and flip FE.
- **No FE work pending** for REOPEN-B place-order portion.

---

— End of POS2-003-REOPEN-B place-order Implementation Summary 2026-05-09 —
