# BUG-042-C — Implementation Status Check

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-042-C
> **Check type:** Post-gate implementation verification (read-only)
> **Date:** 2026-02 (current session)
> **Verdict:** `not_implemented`

---

## 1. Docs Read

### `/app/memory/final/` (baseline rules — read-only)
- `IMPLEMENTATION_AGENT_RULES.md`
- `ARCHITECTURE_DECISIONS_FINAL.md`
- `MODULE_DECISIONS_FINAL.md`
- `CHANGE_REQUEST_PLAYBOOK.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `FINAL_DOCS_SUMMARY.md`

### BUG-042 family
- `/app/memory/bugs/BUG_042_OWNER_DECISION_AND_PAYLOAD_AUDIT.md` (audit v3, Section 5 = BUG-042-C source of truth)
- `/app/memory/bugs/BUG_042_C_PRE_IMPLEMENTATION_CODE_GATE.md` (approved gate)
- `/app/memory/bugs/BUG_042_B_SMOKE_SIGNOFF.md` (confirms BUG-042-B remains closed and is independent of BUG-042-C)
- `/app/memory/bugs/BUG_042_B_PRE_IMPLEMENTATION_CODE_GATE.md`
- `/app/memory/bugs/BUG_042_B_IMPLEMENTATION_SUMMARY.md`
- `/app/memory/bugs/BUG_042_B_QA_REPORT.md`

### BUG-042-C implementation artifacts (existence check)
| Artifact | Exists? |
|---|---|
| `BUG_042_C_IMPLEMENTATION_SUMMARY.md` | ❌ NOT FOUND |
| `BUG_042_C_QA_REPORT.md` | ❌ NOT FOUND |
| `BUG_042_C_SMOKE_SIGNOFF.md` | ❌ NOT FOUND |

→ **No implementation or QA artifacts exist for BUG-042-C.**

---

## 2. Code Files Inspected

| File | Reason |
|---|---|
| `/app/frontend/src/api/socket/socketHandlers.js` | Primary file under gate (4 target sites). |
| `/app/frontend/src/api/constants.js` | Verify `F_ORDER_STATUS[9]='pendingPayment'`, `ORDER_TO_TABLE_STATUS.pendingPayment='occupied'`, and that no new `TERMINAL_*` constants were added. |
| `/app/frontend/src/api/services/orderService.js` | Verify owner directive: initial-load fetch untouched. |
| `/app/frontend/src/__tests__/api/socket/*` | Look for any new status-9 test coverage. |
| Backend root `/app/backend` | Confirm forbidden-surface untouched (directory absent in this repo). |

### 2.1 Grep — Status-9 / terminal predicate footprint in `socketHandlers.js`
```
$ grep -n "fOrderStatus === 9\|fOrderStatus === 8\|=== 'pendingPayment'\|=== 'cancelled'\|=== 'paid'" \
        /app/frontend/src/api/socket/socketHandlers.js
184:      if (transformedOrder.fOrderStatus === 8) {
278:  const isTerminal   = (order.status === 'cancelled' || order.status === 'paid');
409:  if (order.status === 'cancelled' || order.status === 'paid') {
455:    if (order.fOrderStatus === 8) {
```
→ Zero hits for `fOrderStatus === 9` or `'pendingPayment'`. All four target sites are at their **pre-gate** state.

### 2.2 Grep — Status-9 footprint in handler tests
```
$ grep -rn "fOrderStatus.*9\|f_order_status.*9\|pendingPayment" /app/frontend/src/__tests__/
(no output)
```
→ No status-9 test coverage was added.

---

## 3. Whether Implementation / QA Docs Exist
- **Implementation Summary:** NOT FOUND.
- **QA Report:** NOT FOUND.
- **Smoke Sign-off:** NOT FOUND.

The only BUG-042-C artifact present is the **approved Pre-Implementation Code Gate** doc itself.

---

## 4. Approved Gate Checklist Result

The gate's locked-scope items (gate §4 and §5 pseudo-diff) were:

| # | Gate-approved change | Target line | Code state | Result |
|---|---|---|---|---|
| 1 | Extend `handleNewOrder` insertion guard to also skip `fOrderStatus === 9` (alongside existing 8) | `socketHandlers.js:184` | Still `=== 8` only | ❌ NOT DONE |
| 2 | Extend `handleScanNewOrder` insertion guard to also skip `fOrderStatus === 9` | `socketHandlers.js:455` | Still `=== 8` only | ❌ NOT DONE |
| 3 | Extend `handleOrderDataEvent` terminal predicate to include status-9 (with no-force-clear `syncTableStatus` special-case) | `socketHandlers.js:278–283` | Predicate still `'cancelled' \|\| 'paid'`; `syncTableStatus(..., 'available')` unconditional | ❌ NOT DONE |
| 4 | Extend `handleUpdateOrderStatus` terminal predicate to include status-9 (with no-force-clear `syncTableStatus` special-case) | `socketHandlers.js:409–412` | Predicate still `'cancelled' \|\| 'paid'`; `syncTableStatus(..., 'available')` unconditional | ❌ NOT DONE |

→ **0 / 4 gate sites implemented.**

---

## 5. Code Behavior Checklist Result

| Required behavior (per gate) | Current code behavior | Match? |
|---|---|---|
| `fOrderStatus === 9` skipped from `new-order` insertion | Not skipped — would be added to OrderContext | ❌ |
| `fOrderStatus === 9` skipped from `scan-new-order` insertion | Not skipped — would be added | ❌ |
| `fOrderStatus === 9` removes order from running OrderContext on update-order-style events (`update-order`, `update-order-target`, `update-order-source`, `update-order-paid`, `update-item-status`) | `handleOrderDataEvent` calls `updateOrder` (NOT `removeOrder`) for status-9 | ❌ |
| `fOrderStatus === 9` removes order from running OrderContext on `update-order-status` | `handleUpdateOrderStatus` calls `updateOrder` (NOT `removeOrder`) for status-9 | ❌ |
| Status 3 (cancelled) still force-frees table | Yes — `syncTableStatus(..., 'available')` on L282 and L411 unchanged | ✅ |
| Status 6 (paid) still force-frees table | Yes — same paths unchanged | ✅ |
| Status 9 does NOT force-free table (table stays derived/`'occupied'`) | N/A — status-9 branch does not exist yet | ❌ (because branch missing) |
| Status 7 (Yet-to-Confirm) NOT cleared | ✅ Preserved — predicates do not include 7 | ✅ |
| Status 8 behavior unchanged (POS2-005) | ✅ L184 and L455 still skip 8 verbatim; no update-order* path touches 8 | ✅ |
| No table-id force-clear cleanup introduced | ✅ No such code added | ✅ |
| Initial-load API / running order fetch untouched | ✅ `orderService.getRunningOrders` unchanged; no status-9 filter introduced | ✅ |
| Audit → Hold report path untouched | ✅ `reportService.getHoldOrders` / `reportTransform.holdOrder` unchanged | ✅ |
| Room / To Room path untouched | ✅ `transferToRoom` / `/order-shifted-room` unchanged | ✅ |
| Payment payload code untouched | ✅ `orderTransform.collectBillExisting` unchanged (BUG-042-B remains closed at `grant_amount`) | ✅ |
| Hold payment rail UI untouched (BUG-042-A out of scope) | ✅ `CollectPaymentPanel` / `CollectBillPanelDrawer` / `OrderTable` not changed under this gate | ✅ |

**Summary:** 4 behavior expectations driven by the gate are missing because the 4 code edits were never applied. All other "do-not-change" surfaces remain intact.

---

## 6. Forbidden-File Check

| Forbidden surface | State |
|---|---|
| `/app/memory/final/*` updated? | ❌ No — read-only; unchanged. |
| `BUG_TEMPLATE.md` updated? | ❌ No — unchanged. |
| Backend changes? | ❌ No — `/app/backend` directory does not exist in this repo (frontend-only). |
| Payment payload changes? | ❌ No — `collectBillExisting` (L1219 `payment_status`, L1234 `grant_amount`) unchanged. |
| Report-path changes? | ❌ No — `reportTransform.holdOrder` / `reportService.getHoldOrders` unchanged. |
| Room / To Room changes? | ❌ No — `transferToRoom` builder unchanged. |
| Initial-load FE filter introduced? | ❌ No — `orderService.getRunningOrders` and `fromAPI.orderList` unchanged. |
| Hold rail UI (BUG-042-A) changes? | ❌ No — UI files unchanged. |

→ **All forbidden surfaces are clean.**

---

## 7. Remaining Gaps

To bring the code into alignment with the approved BUG-042-C gate, the following four edits remain (per gate §5 pseudo-diff):

1. **`socketHandlers.js:184–187`** (`handleNewOrder`) — extend the existing `=== 8` skip to `=== 8 || === 9` and update the log message accordingly.
2. **`socketHandlers.js:268–289`** (`handleOrderDataEvent`) — add `isHoldClear = (order.fOrderStatus === 9)`; set `shouldRemove = isTerminal || isHoldClear`; inside the remove branch, call `syncTableStatus(order, updateTableStatus)` WITHOUT the `'available'` override when `isHoldClear` is true (keep table `'occupied'`); update log.
3. **`socketHandlers.js:408–417`** (`handleUpdateOrderStatus`) — same predicate + same `syncTableStatus` special-case as #2; update log.
4. **`socketHandlers.js:455–458`** (`handleScanNewOrder`) — extend the existing `=== 8` skip to `=== 8 || === 9` and update the log message.

Optional (raised in the gate as **non-mandatory**, owner discretion only):
- Factor the duplicated terminal predicates at L278 / L409 into a shared constant (e.g., `TERMINAL_ORDER_STATUSES = ['cancelled','paid']`) in `constants.js`. Gate §5.5 — NOT required.

Test surface gaps:
- 15 unit tests scoped in gate §8.1 (U-1 … U-15) — none added.
- 11 functional / preprod tests scoped in gate §8.3 (F-1 … F-11) — none run.
- `getRunningOrders` "do-no-harm" assertion (gate §8.2 L-1) — not added.
- Static checks per gate §8.4 (`grep "fOrderStatus === 9"` should return 4 lines; currently 0) — fail until edits land.

Documentation gaps (after implementation):
- `BUG_042_C_IMPLEMENTATION_SUMMARY.md` must be created post-implementation.
- `BUG_042_C_QA_REPORT.md` must be created post-implementation.
- `BUG_042_C_SMOKE_SIGNOFF.md` must be created post owner smoke.

---

## 8. Recommended Next Step

1. **Owner confirms** intent to proceed with implementation against the already-approved gate.
2. Implementing agent applies the four in-place edits exactly as scoped in `BUG_042_C_PRE_IMPLEMENTATION_CODE_GATE.md` §5, with no scope drift.
3. Extend `/app/frontend/src/__tests__/api/socket/updateOrderStatus.test.js` (and add a parallel test file for `handleOrderDataEvent`, `handleNewOrder`, `handleScanNewOrder` status-9 cases) per gate §8.1.
4. Run `yarn lint` (target file) and `yarn test` (targeted + full repo) and capture results in a new `BUG_042_C_IMPLEMENTATION_SUMMARY.md` + `BUG_042_C_QA_REPORT.md`.
5. Owner preprod smoke per gate §8.3 F-1 … F-11 → `BUG_042_C_SMOKE_SIGNOFF.md`.

This status-check task does NOT include implementation. **No code change has been made during this check.**

---

## 9. Final Verdict

**`not_implemented`** ❌

- The Pre-Implementation Code Gate (`BUG_042_C_PRE_IMPLEMENTATION_CODE_GATE.md`) exists and is approved.
- No code edits have been applied at any of the four target sites in `frontend/src/api/socket/socketHandlers.js`.
- No status-9 test coverage exists.
- No implementation summary, QA report, or smoke sign-off doc has been created.
- All forbidden surfaces (final docs, template, backend, payment payload, report path, Room, initial-load filter, Hold rail UI) remain untouched — meaning there is no out-of-scope drift either.
- BUG-042-B remains independently closed; this check did not affect it.

### Confirmation: No code changed during this check
- ❌ No edits to `socketHandlers.js`.
- ❌ No edits to `constants.js`, `orderService.js`, `orderTransform.js`, `reportTransform.js`, or any test file.
- ❌ No edits to `/app/memory/final/`.
- ❌ No edits to `BUG_TEMPLATE.md`.
- ✅ This status report created at `/app/memory/bugs/BUG_042_C_IMPLEMENTATION_STATUS_CHECK.md`.

---

*End of BUG-042-C Implementation Status Check.*
