# NS-3C T3 Test Fixture & Barrel Fixes — Implementation Summary

**Agent:** NS-3C Test Cleanup Implementation Agent — T3
**Date:** 2026-05-04
**Branch:** `5may`
**Scope:** T3 batch from `/app/memory/change_requests/impact_analysis/NS_3C_TEST_FAILURE_TRIAGE_PLAN.md` — 4 newly-surfaced failures (NS-3C-5, NS-3C-6, NS-3C-7, NS-3C-9) closed via test fixture rewrites + 2 owner-approved barrel additions.
**Owner approval:** Choice 1 = 1.A (barrel additions), Choice 2 = 2.A (reverse 2 obsolete cancel-split assertions), Choice 3 = 3.A (rewrite v2 socket contract).
**Predecessors:**
- Triage plan: `/app/memory/change_requests/impact_analysis/NS_3C_TEST_FAILURE_TRIAGE_PLAN.md`
- T1 summary: `/app/memory/change_requests/implementation_summaries/NS_3C_T1_TEST_ONLY_FIXES_SUMMARY.md`
- T2 summary: `/app/memory/change_requests/implementation_summaries/NS_3C_T2_JSX_FIXTURE_FIXES_SUMMARY.md`
- Batch 3C: `/app/memory/change_requests/implementation_summaries/COMBINED_HYGIENE_BATCH_3C_TEST_INFRA_SUMMARY.md`

## Status
- **NS-3C-5:** ✅ RESOLVED 2026-05-04 via T3
- **NS-3C-6:** ✅ RESOLVED 2026-05-04 via T3
- **NS-3C-7:** ✅ RESOLVED 2026-05-04 via T3
- **NS-3C-9:** ✅ RESOLVED 2026-05-04 via T3

## Tests-pass tally (T3 net delta)

| Suite | Before T3 | After T3 |
|---|---|---|
| `barrelExports.test.js` | ~24/26 | **26/26** ✅ |
| `updateOrderStatus.test.js` | 0/~11 | **11/11** ✅ |
| `cancelItemPayload.test.js` | 0/~30 | **32/32** ✅ |
| `updateOrderPayload.test.js` | ~3/17 | **17/17** ✅ |

**Cumulative project tally projection** (after T1 + T2 + T3): suites 9→**18 pass / 1 fail**, tests 127→**~199 pass / ~2 fail** — only NS-3C-4 (`_raw` policy decision, T4-gated) remains.

---

## 1. Exact changes landed

### 1.1 Files MODIFIED (7 — 4 test files + 2 barrel files + 1 tracker)

| Path | Change | Net delta |
|---|---|---|
| `/app/frontend/src/components/reports/index.js` | Owner-approved (Choice 1.A): added 4 missing exports (`CollectBillPanelDrawer`, `MarkUnpaidConfirmDialog`, `PaymentMethodPicker`, `RoomRowCard`) with NS-3C-5 comment marker. Barrel is non-runtime scaffolding; live app uses direct named imports. | +6 / -0 |
| `/app/frontend/src/pages/index.js` | Owner-approved: added 2 missing exports (`RoomOrdersReportPage`, `StatusConfigPage`) with NS-3C-5 comment marker. | +4 / -0 |
| `/app/frontend/src/__tests__/api/socket/updateOrderStatus.test.js` | Full rewrite in place (no file deletion) to assert BUG-107 v2 contract: `parseMessage`-driven 5-element message; `orderFromAPI.order` mock; ~6 tests covering cancelled/paid → remove, other statuses → update, invalid/empty payload → early return, transform throw handled gracefully. Outer `describe('BUG-107v2: …')` shell preserved; historical note added at top of file. | full rewrite (~245 / -245 lines) |
| `/app/frontend/src/__tests__/api/transforms/cancelItemPayload.test.js` | Full rewrite in place (no file deletion). Replaced `toAPI.cancelItemFull`/`toAPI.cancelItemPartial` calls with unified `toAPI.cancelItem(table, item, reason, qty)`. Two assertions reversed per owner approval 2.A: `cancel_qty` is now ALWAYS expected (= `item.qty` for full; = partial qty otherwise). Describe blocks renamed to "BUG-106 (unified): cancelItem with full/partial quantity". Historical note added at top. | full rewrite (~395 / -395 lines) |
| `/app/frontend/src/__tests__/api/transforms/updateOrderPayload.test.js` | Full rewrite in place (no file deletion) to current `toAPI.updateOrder` shape: string-typed `gst_amount`/`vat_amount` (`'5.00'`); per-item `tax_amount`/`total_price` removed and order-level `tax_amount`/`order_amount` asserted instead; `order_id: '999'` (String); `order_type: 'takeaway'` per OLD_POS_NORMALIZE Task 3; `cust_name` only (no `cust_mobile`/`cust_email` on update path); Test 5 repurposed to order_amount; Test 12 narrowed to addons (selectedSize is not part of current contract); Test 14 repurposed to cust_name-only. | full rewrite (~325 / -354 lines) |
| `/app/memory/change_requests/FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md` | §7 rows 28, 29, 30, 32 marked **RESOLVED 2026-05-04 via T3** with full rationale + per-suite pass evidence | +4 / -4 |

### 1.2 Files NOT TOUCHED

- ❌ Production transform / handler logic (`orderTransform.js`, `socketHandlers.js`, etc.) — UNTOUCHED
- ❌ Backend (`/app/backend/**`) — UNTOUCHED
- ❌ `/app/memory/final/*` — UNTOUCHED
- ❌ Other test files (NS-3C-1, NS-3C-2, NS-3C-3, NS-3C-4, NS-3C-8, NS-3C-10) — UNTOUCHED
- ❌ No file deletions, no test deletions, no import/export deletions
- ✅ Barrel files (`reports/index.js`, `pages/index.js`) — additions only, no removals
- ✅ All test outer describe shells preserved across rewrites

### 1.3 Diff statistics
- **6 source files modified** (2 production barrels + 4 test files)
- **1 tracker doc modified**
- Production lines changed: **+10 / -0** (barrel additions only)
- Test lines changed: **~+965 / -~994** (3 full rewrites; mechanical mass-replace)
- **0 deletions of files / tests / imports / exports**

---

## 2. Per-failure detail

### 2.1 NS-3C-5 — `barrelExports.test.js` (Owner Choice 1.A: barrel additions)

**Root cause:** Iterate-all-files test scans `src/components/reports/*.jsx` and `src/pages/*.jsx` and asserts each file has a corresponding export in the barrel. New components added under CR-005 (`CollectBillPanelDrawer`, `PaymentMethodPicker`), A0a (`MarkUnpaidConfirmDialog`), CR-004 (`RoomRowCard`) and pages added under CR-004 (`RoomOrdersReportPage`) and CR-006 (`StatusConfigPage`) were not back-filled into the barrels.

**Fix (production-side, owner-approved):**
- `src/components/reports/index.js`: +4 lines (CollectBillPanelDrawer, MarkUnpaidConfirmDialog, PaymentMethodPicker, RoomRowCard) with NS-3C-5 comment block.
- `src/pages/index.js`: +2 lines (RoomOrdersReportPage, StatusConfigPage) with NS-3C-5 comment block.

**Why safe:** Barrels are non-runtime scaffolding. Live app code uses direct named imports throughout (`import X from '@/components/reports/X'`). Barrels exist only to satisfy this hygiene-enforcement test.

**Validation:** `yarn test src/__tests__/structure/barrelExports.test.js` → **26/26 PASS** in 1.44s.

### 2.2 NS-3C-6 — `updateOrderStatus.test.js` (rewrite to BUG-107 v2)

**Root cause:** Pre-v2 `handleUpdateOrderStatus` called `fetchSingleOrderForSocket(orderId)` and inspected per-item status to decide remove vs update on a single-item cancel. The current v2 implementation (April 2026, `socketHandlers.js:375-421`) trusts the socket payload entirely: parses via `parseMessage(message)`, transforms via `orderFromAPI.order(payload.orders[0])`, removes if `order.status` ∈ `{cancelled, paid}`, otherwise updates.

**Fix (rewrite in place, no deletion):**
- 11 new tests covering the v2 flow: 1 cancelled→remove, 1 paid→remove, 5 statuses → update (parameterised), 1 invalid message → early return, 2 missing/empty payload.orders → early return, 1 transform throw → graceful.
- Helper `createV2Message(orderId, apiOrder)` constructs the canonical 5-element message: `[event, orderId, restaurantId, status, payload]` per `MSG_INDEX` in socketEvents.js.
- Mocks: `parseMessage`, `orderFromAPI.order`, and 6 context callbacks (`updateOrder`, `removeOrder`, `updateTableStatus`, `getOrderById`, `setTableEngaged`, `setOrderEngaged`).
- Outer describe shell preserved as `describe('BUG-107v2: handleUpdateOrderStatus — socket-payload contract', …)`.

**Why safe:** No production change. The v2 flow is sprint-accepted. Test now correctly documents the current contract.

**Validation:** `yarn test src/__tests__/api/socket/updateOrderStatus.test.js` → **11/11 PASS** in 1.04s.

### 2.3 NS-3C-7 — `cancelItemPayload.test.js` (rewrite to unified `toAPI.cancelItem`)

**Root cause:** BUG-106 originally split cancellation into `cancelItemFull` + `cancelItemPartial`. Production was unified into a single `toAPI.cancelItem(currentTable, item, reason, cancelQty)` at `orderTransform.js:645-654`. Cancel payload semantics preserved exactly: `cancel_type`, `order_id`, `item_id`, `order_food_id`, `cancel_qty`, `order_status`, `reason_type`, `reason`. Full cancel = pass `item.qty`; partial = pass partial qty.

**Fix (rewrite in place, no deletion):**
- 32 tests across 3 describe blocks: "cancelItem with full quantity" (12 tests), "cancelItem with partial quantity" (16 tests), "consistency between full-qty and partial-qty" (4 tests).
- All call sites use unified `toAPI.cancelItem(table, item, reason, qty)`.
- **2 assertions reversed per owner approval (Choice 2.A):** Old "fullPayload should NOT have cancel_qty" → New "fullPayload should ALWAYS have cancel_qty (= item.qty)". Old strict `toEqual({...})` complete-payload schemas now include `cancel_qty`.
- Historical note at top of file documents BUG-106 unification.

**Why safe:** No production change. Cancellation contract semantics survive intact (only the function-name split was abandoned). Sprint-accepted CR-001 cancellation acceptance unchanged.

**Validation:** `yarn test src/__tests__/api/transforms/cancelItemPayload.test.js` → **32/32 PASS** in 1.15s.

### 2.4 NS-3C-9 — `updateOrderPayload.test.js` (rewrite to current contract)

**Root cause:** Multiple sprint-accepted refactors evolved `toAPI.updateOrder`'s wire format:
- `gst_amount`/`vat_amount` → 2-decimal strings (`'5.00'`) for stable backend wire shape
- Per-item `tax_amount`/`total_price` removed; aggregated to order-level `tax_amount` and `order_amount`
- `order_id: String(table.orderId)` (`"999"`, not `999`)
- `cust_name` is the only customer field on update path (mobile/email captured at place-order)
- `order_type` mapping per OLD_POS_NORMALIZE Task 3 (Apr-2026, `orderTransform.js:51`): `'takeAway'` input → `'takeaway'` wire form
- `station: item.station.toUpperCase()` (uppercase wire form)

**Fix (rewrite in place, no deletion):**
- 17 tests across 3 describe blocks: "Per-item tax calculation" (8), "Order-level totals" (4), "Other payload fields" (5).
- Test 5 repurposed: per-item `total_price` no longer emitted → asserts order-level `order_amount` instead.
- Test 11 renamed: `order_total_tax_amount` → `tax_amount` (current field name per `calcOrderTotals` return shape).
- Test 12 narrowed: dropped `selectedSize` (not part of current contract — production reads variations from `selectedVariants`/`variantGroups`); now asserts addon-only inclusion in `order_amount`.
- Test 14 repurposed: asserts `cust_name` present + `cust_mobile`/`cust_email` absent.
- Test 15 updated: `order_type` mapping for `'takeAway'` → `'takeaway'` (OLD_POS_NORMALIZE Task 3).
- Tests calling `toAPI.updateOrder` for order-level totals now pass `allCartItems: items` so `combinedTotals` aggregation triggers (production requirement).

**Why safe:** No production change. All wire-format refactors are explicitly documented in `orderTransform.js` (e.g., L51 OLD_POS_NORMALIZE comment). Sprint-accepted CR-005..CR-008 acceptance unchanged.

**Validation:** `yarn test src/__tests__/api/transforms/updateOrderPayload.test.js` → **17/17 PASS** in 1.12s.

---

## 3. Why this is safe

### 3.1 Zero production / runtime impact
- Production source touched: only 2 barrel files (`reports/index.js`, `pages/index.js`) — non-runtime scaffolding; live code uses direct imports.
- All 4 test rewrites are confined to `src/__tests__/` or `src/api/.../__tests__/`.
- Frontend HTTP unchanged. Backend HTTP unchanged.

### 3.2 Zero baseline rule violation
| Baseline area | Compliance |
|---|---|
| `/app/memory/final/*` | ✅ untouched |
| Sprint-accepted CRs (CR-001..CR-008, A0a, A0b) | ✅ behaviour unchanged; tests now correctly document current shape |
| BE-* parked items | ✅ unchanged |
| BUG-107 v2 socket-payload contract | ✅ correctly tested |
| BUG-106 unified cancel contract | ✅ correctly tested |
| OLD_POS_NORMALIZE Task 3 wire form | ✅ correctly asserted |

### 3.3 Zero parked-item state change
- All 9 BE-* items still parked.
- All 13 parked CR/bucket items still parked.
- No new CR opened.
- T4 batch NOT started.

### 3.4 Approval scope honoured
- ✅ No file deletion. No test deletion. No import/export deletion.
- ✅ No backend changes.
- ✅ No `/app/memory/final/` changes.
- ✅ No parked item unparked.
- ✅ Did not touch NS-3C-1, NS-3C-2, NS-3C-3, NS-3C-4, NS-3C-8, NS-3C-10.
- ✅ Production-side change limited to 2 barrel files (Choice 1.A).
- ✅ Choice 2.A: 2 obsolete cancel-split assertions reversed.
- ✅ Choice 3.A: BUG-107 v2 rewrite delivered.

---

## 4. Tracker updates applied

### 4.1 `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- §7 row 28 (NS-3C-5) → **RESOLVED 2026-05-04 via T3** with rationale + 26/26 PASS evidence
- §7 row 29 (NS-3C-6) → **RESOLVED 2026-05-04 via T3** with rationale + 11/11 PASS evidence
- §7 row 30 (NS-3C-7) → **RESOLVED 2026-05-04 via T3** with rationale + 32/32 PASS evidence
- §7 row 32 (NS-3C-9) → **RESOLVED 2026-05-04 via T3** with rationale + 17/17 PASS evidence

### 4.2 `PENDING_TASK_REGISTER_2026_05_04.md`
- No row in §3 master table specifically tracks NS-3C-5..NS-3C-9 (these live only in Final Acceptance §7). No Pending Register edit needed for T3.

### 4.3 New summary file
- `/app/memory/change_requests/implementation_summaries/NS_3C_T3_TEST_FIXTURE_AND_BARREL_FIXES_SUMMARY.md` (this file).

---

## 5. Remaining NS-3C backlog (T4 only)

| ID | Suite | Status | Future batch |
|---|---|---|---|
| NS-3C-4 | `rawField.test.js` | Pending | **T4** (owner G-T4: relax `_raw` test rule vs remove access) |

**T1 + T2 + T3 closed 9 of 10 NS-3C rows. Only NS-3C-4 remains — owner-gated for T4.**

---

## 6. Compliance certification

| Rule | Status |
|---|---|
| No file deletion | ✅ |
| No test deletion | ✅ |
| No import/export deletion | ✅ |
| No backend changes | ✅ |
| No `/app/memory/final/` changes | ✅ |
| No parked item unparked | ✅ |
| Did not touch NS-3C-1, NS-3C-2, NS-3C-3, NS-3C-4, NS-3C-8, NS-3C-10 | ✅ |
| Production-side change limited to NS-3C-5 barrel additions | ✅ |
| Choice 2.A: cancel_qty assertions reversed | ✅ |
| Choice 3.A: BUG-107 v2 rewrite delivered | ✅ |
| Targeted validation runs only | ✅ (4 suites; no broad sweep) |
| Tracker updates limited to Final Acceptance §7 + this summary | ✅ |
| T3 only — did not proceed to T4 | ✅ |

— End of NS-3C T3 Test Fixture & Barrel Fixes Summary —
