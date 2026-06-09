# NS-3C T1 Test-Only Fixes — Implementation Summary

**Agent:** NS-3C Test Cleanup Implementation Agent — T1
**Date:** 2026-05-04
**Branch:** `5may`
**Scope:** T1 batch from `/app/memory/change_requests/impact_analysis/NS_3C_TEST_FAILURE_TRIAGE_PLAN.md` — 3 newly-surfaced test failures (NS-3C-3, NS-3C-8, NS-3C-10) closed via test-only edits.
**Owner approval:** Choice A = A.1 (clean rename), Choice B = B.1 (explanatory comments).
**Predecessors:**
- Triage plan: `/app/memory/change_requests/impact_analysis/NS_3C_TEST_FAILURE_TRIAGE_PLAN.md`
- Batch 3C: `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3C_TEST_INFRA_SUMMARY.md`

## Status
- **NS-3C-3:** ✅ RESOLVED 2026-05-04 via T1
- **NS-3C-8:** ✅ RESOLVED 2026-05-04 via T1
- **NS-3C-10:** ✅ RESOLVED 2026-05-04 via T1

## Tests-pass tally (T1 net delta)

| Suite | Before T1 | After T1 |
|---|---|---|
| `constants.test.js` | 3/4 | **4/4** ✅ |
| `orderTransformFinancials.test.js` | 15/18 | **18/18** ✅ |
| `orderTransform.roomInfo.test.js` | 5/7 | **7/7** ✅ |

**Cumulative project tally projection** (full `yarn test` not re-run, but additive math): suites 9→**12 pass**, tests 127→**134 pass**.

---

## 1. Exact changes landed

### 1.1 Files MODIFIED (3 — all test files)

| Path | Change | Net delta |
|---|---|---|
| `/app/frontend/src/__tests__/api/constants.test.js` | T-08 T3 — broadened valid-prefix rule from `/api/` ∪ `TBD` to `/api/` ∪ `/pos/` ∪ `TBD` (CRM endpoints legitimate). Added explanatory comment block referencing `constants.js:34-40 // CRM:` markers. | +5 / -1 lines |
| `/app/frontend/src/__tests__/api/transforms/orderTransformFinancials.test.js` | 3 stale-fallback tests rewritten: (a) Test 6 "should fallback subtotalBeforeTax to order_amount …" → "should keep subtotalBeforeTax as 0 when order_sub_total_without_tax is missing (consumer-layer applies fallback)"; (b) Test 7 same pattern for `subtotalAmount`; (c) Test 12 "should handle null values for financial fields" → same with parenthetical clarifier. Each test now expects `toBe(0)` and carries an inline comment referencing `orderTransform.js:183` ("No fallback") and L1360 (consumer-layer fallback). | +21 / -10 lines |
| `/app/frontend/src/api/transforms/__tests__/orderTransform.roomInfo.test.js` | 2 strict `toEqual` assertions changed to `toMatchObject` (Test 1 + Test 3); explanatory inline comments added referencing CR-004 Phase 4.1 ADDITIVE EXTENSION + BE-2 §4.1 wired-2026-05-01 schema expansion to 13 keys. | +12 / -2 lines |

### 1.2 Files NOT TOUCHED

- ❌ Production source code (`src/api/transforms/orderTransform.js`, `src/api/constants.js`, etc.) — UNTOUCHED
- ❌ Backend (`/app/backend/**`) — UNTOUCHED
- ❌ `/app/memory/final/*` — UNTOUCHED
- ❌ Other test files (NS-3C-1, NS-3C-2, NS-3C-4, NS-3C-5, NS-3C-6, NS-3C-7, NS-3C-9 suites) — UNTOUCHED
- ❌ No file deletions; no import/export deletions

### 1.3 Diff statistics
- **3 files modified**, all under `src/__tests__/` or `src/api/transforms/__tests__/`
- **+38 lines / −13 lines** (net +25)
- **0 production-code edits**
- **0 deletions**

---

## 2. Per-failure detail

### 2.1 NS-3C-3 — `constants.test.js` T-08 T3

**Before:**
```js
test('T3: All API_ENDPOINTS values are valid URL paths (/api/...) or TBD', () => {
  for (const [key, value] of Object.entries(API_ENDPOINTS)) {
    const isValidPath = value.startsWith('/api/');
    const isTBD = value === 'TBD';
    expect(isValidPath || isTBD).toBe(true);
  }
});
```

**After:**
```js
test('T3: All API_ENDPOINTS values are valid URL paths (/api/..., /pos/...) or TBD', () => {
  // CRM customer/address endpoints intentionally use the `/pos/...` prefix
  // (mounted on the CRM base URL — see constants.js L34-40 // CRM: comments).
  // Valid prefixes are therefore `/api/` (main POS app) or `/pos/` (CRM).
  for (const [key, value] of Object.entries(API_ENDPOINTS)) {
    const isValidPath = value.startsWith('/api/') || value.startsWith('/pos/');
    const isTBD = value === 'TBD';
    expect(isValidPath || isTBD).toBe(true);
  }
});
```

**Why safe:** No production change. The 7 CRM endpoints (`CUSTOMER_SEARCH`, `CUSTOMER_LOOKUP`, `CUSTOMER_DETAIL`, `CUSTOMER_CREATE`, `CUSTOMER_UPDATE`, `ADDRESS_LOOKUP`, `CUSTOMER_ADDRESSES`) keep their `/pos/...` prefix exactly as designed; the test now correctly recognises this is valid.

**Validation:** `yarn test src/__tests__/api/constants.test.js` → 4/4 PASS in 1.21s.

### 2.2 NS-3C-8 — `orderTransformFinancials.test.js` Tests 6, 7, 12

**Before (Test 6 representative):**
```js
test('should fallback subtotalBeforeTax to order_amount when order_sub_total_without_tax is missing', () => {
  const apiResponse = createMockOrderResponse({
    order_amount: 100,
    order_sub_total_without_tax: undefined,
  });
  const result = fromAPI.order(apiResponse);
  expect(result.subtotalBeforeTax).toBe(100);
});
```

**After (Test 6 representative):**
```js
test('should keep subtotalBeforeTax as 0 when order_sub_total_without_tax is missing (consumer-layer applies fallback)', () => {
  const apiResponse = createMockOrderResponse({
    order_amount: 100,
    order_sub_total_without_tax: undefined,
  });
  const result = fromAPI.order(apiResponse);
  // Transform layer is intentionally fallback-free per orderTransform.js:183;
  // the order_amount → subtotalBeforeTax fallback is applied at the consumer
  // layer (orderTransform.js:1360) so the bill-render path stays correct.
  expect(result.subtotalBeforeTax).toBe(0);
});
```

(Tests 7 and 12 follow the same pattern; Test 12's title becomes `"should handle null values for financial fields (transform-layer keeps 0; consumer-layer fallback covers display)"`.)

**Why safe:** No production change. `orderTransform.js:183` carries the comment `// No fallback — if socket doesn't send subtotal, keep as 0 (GET single order will fill it)` — this is documented design. The order_amount fallback is delivered at the consumer layer (`orderTransform.js:1360`) so bills, drawer drill-downs, and report financials all render correctly. CR-001 / CR-003 / CR-004 / CR-005 sprint acceptance — all unchanged.

**Validation:** `yarn test src/__tests__/api/transforms/orderTransformFinancials.test.js` → 18/18 PASS in 0.99s.

### 2.3 NS-3C-10 — `orderTransform.roomInfo.test.js` Tests 1, 3

**Before (Test 1):**
```js
expect(out.roomInfo).toEqual({ roomPrice: 1500, advancePayment: 500, balancePayment: 1000 });
```

**After (Test 1):**
```js
// toMatchObject (not toEqual) — roomInfo schema was expanded under
// CR-004 Phase 4.1 ADDITIVE EXTENSION + BE-2 §4.1 (wired 2026-05-01) to
// include receiveBalance, paymentStatus, balancePaymentMode, roomNo,
// discountAmount, discountReason, checkInDate, checkOutDate, bookingType,
// and guestName. We assert the original 3 financial fields here; the
// additional fields are covered by their own consumer-layer suites.
expect(out.roomInfo).toMatchObject({ roomPrice: 1500, advancePayment: 500, balancePayment: 1000 });
```

(Test 3 follows the same pattern with a brief inline reference to the comment above.)

**Why safe:** No production change. CR-004 Phase 4.1 + BE-2 §4.1 expansion of `roomInfo` to 13 keys is sprint-accepted; the test now correctly verifies the 3 original financial fields without locking the full schema. Test 2 (`roomInfo null when api.room_info missing`) still uses `toBeNull()` — unchanged.

**Validation:** `yarn test src/api/transforms/__tests__/orderTransform.roomInfo.test.js` → 7/7 PASS in 0.94s.

---

## 3. Why this is safe

### 3.1 Zero production / runtime impact
- All 3 edits are confined to test files under `src/__tests__/` or `src/api/transforms/__tests__/`.
- No transform logic, no API constants, no React components, no contexts, no mocks-of-mocks, no setup files were modified.
- Frontend HTTP unchanged. Backend HTTP unchanged.

### 3.2 Zero baseline rule violation
| Baseline area | Compliance |
|---|---|
| `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` | ✅ untouched |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` | ✅ untouched |
| Any `/app/memory/final/*` doc | ✅ untouched |
| Sprint-accepted CRs (CR-001..CR-008, A0a, A0b) | ✅ behaviour unchanged |
| BE-* parked items | ✅ unchanged |
| `paymentService` / Batch 3B closure | ✅ untouched |

### 3.3 Zero parked-item state change
- All 9 BE-* items still parked.
- All 13 parked CR/bucket items still parked.
- No new CR opened.
- T2/T3/T4 batches NOT started.

### 3.4 Approval scope honoured
- ✅ Test files only.
- ✅ No production source changes.
- ✅ No backend changes.
- ✅ No `/app/memory/final/` changes.
- ✅ No deletions.
- ✅ No import/export deletions.
- ✅ Did not touch NS-3C-1, NS-3C-2, NS-3C-4, NS-3C-5, NS-3C-6, NS-3C-7, NS-3C-9.
- ✅ NS-3C-8 test descriptions renamed and explanatory comments added per Choice A.1 + B.1.

---

## 4. Tracker updates applied

### 4.1 `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- §7 row 26 (NS-3C-3) → **RESOLVED 2026-05-04 via T1** with rationale + 4/4 PASS evidence.
- §7 row 31 (NS-3C-8) → **RESOLVED 2026-05-04 via T1** with rationale + 18/18 PASS evidence.
- §7 row 33 (NS-3C-10) → **RESOLVED 2026-05-04 via T1** with rationale + 7/7 PASS evidence.

### 4.2 `PENDING_TASK_REGISTER_2026_05_04.md`
- No row in the Pending Register §3 master table specifically tracks NS-3C-* (these are sub-rows under Batch 3C in Final Acceptance only). No Pending Register edit required for T1.

### 4.3 New summary file
- `/app/memory/change_requests/implementation_summaries/NS_3C_T1_TEST_ONLY_FIXES_SUMMARY.md` (this file).

---

## 5. Remaining NS-3C backlog (not in T1 scope)

| ID | Suite | Status | Future batch |
|---|---|---|---|
| NS-3C-1 | `ProtectedRoute.test.jsx` | Pending | T2 (JSX mock-context) |
| NS-3C-2 | `App.routing.test.jsx` | Pending | T2 |
| NS-3C-4 | `rawField.test.js` | Pending | T4 (owner G-T4) |
| NS-3C-5 | `barrelExports.test.js` | Pending | T3.4 |
| NS-3C-6 | `updateOrderStatus.test.js` | Pending | T3.3 |
| NS-3C-7 | `cancelItemPayload.test.js` | Pending | T3.1 (owner G-T3.1: delete vs rewrite) |
| NS-3C-9 | `updateOrderPayload.test.js` | Pending | T3.2 |

**T1 closes 3 of 10 NS-3C rows. 7 remain — none started.**

---

## 6. Compliance certification

| Rule | Status |
|---|---|
| Test files only | ✅ |
| No production source changes | ✅ |
| No backend changes | ✅ |
| No `/app/memory/final/` changes | ✅ |
| No deletions | ✅ |
| No import/export deletions | ✅ |
| Did not touch NS-3C-1, NS-3C-2, NS-3C-4, NS-3C-5, NS-3C-6, NS-3C-7, NS-3C-9 | ✅ |
| Test descriptions renamed (Choice A.1) | ✅ |
| Explanatory comments added (Choice B.1) | ✅ |
| Targeted validation runs only | ✅ (3 suites; not full 19-suite tree) |
| Tracker updates limited to Final Acceptance §7 + this summary | ✅ |
| T1 only — did not proceed to T2 | ✅ |

— End of NS-3C T1 Test-Only Fixes Summary —
