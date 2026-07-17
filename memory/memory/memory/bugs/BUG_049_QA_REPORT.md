# BUG-049 — QA Report

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-049
> **Title:** PayLater payment leaves "NA" on available table card
> **Date:** 2026-05-12 (current session)
> **QA verdict:** **PASS** — ready for owner smoke
> **Implementation summary:** `/app/memory/bugs/BUG_049_IMPLEMENTATION_SUMMARY.md`
> **Impact analysis:** `/app/memory/bugs/BUG_049_PAYLATER_NA_TABLE_CARD_IMPACT_ANALYSIS.md`

---

## 1. Scope of QA

Verify that the fix:
- Produces the correct table-status write for a PayLater bill-collect (`update-order-paid` + `fOrderStatus===9` → table `'available'`).
- Preserves BUG-042-C's Hold contract for every other status-9 channel (`update-order`, `update-order-target`, `update-order-source`, `update-item-status` → table `'occupied'`).
- Preserves all other status-code regression anchors (status 3 cancelled, 6 paid, 7 yet-to-confirm, 8 paid-out, 9 hold).
- Honours the "do not change" surfaces (TableCard fallback, contexts, transforms, payment panel, status helpers, backend).

---

## 2. Static QA

| Check | Tool | Result |
|---|---|---|
| ESLint on `socketHandlers.js` | `mcp_lint_javascript` | ✅ No issues |
| ESLint on `BUG_042_C_handlers.test.js` | `mcp_lint_javascript` | ✅ No issues |
| No new external imports | manual diff | ✅ None |
| No payload-shape changes | manual diff | ✅ None |
| No new state, no new context | manual diff | ✅ None |
| No backend / API change | manual diff | ✅ None |

---

## 3. Test Suite Run

Command:
```
yarn test --testPathPattern=BUG_042_C_handlers --watchAll=false
```

Result: **15/15 PASS** in 3.482 s.

### 3.1 BUG-042-C Hold-path matrix (4 cases — narrowed to exclude `update-order-paid`)

| # | Event | fOrderStatus | Expected | Result |
|---|---|---|---|---|
| 1 | `update-order` | 9 | removeOrder + table `'occupied'`, NOT `'available'` | ✅ PASS |
| 2 | `update-order-target` | 9 | same | ✅ PASS |
| 3 | `update-order-source` | 9 | same | ✅ PASS |
| 4 | `update-item-status` | 9 | same | ✅ PASS |

### 3.2 BUG-049 explicit cases (2 new tests)

| # | Scenario | Expected | Result |
|---|---|---|---|
| 5 | `update-order-paid` + fOrderStatus=9 (PayLater settle, fixture: order 825899 / table 3237) | removeOrder + table `'available'`, NOT `'occupied'` | ✅ PASS |
| 6 | `update-order` + fOrderStatus=9 (Hold/Park regression on a non-paid channel) | removeOrder + table `'occupied'`, NOT `'available'` | ✅ PASS |

### 3.3 Regression anchors

| # | Scenario | Expected | Result |
|---|---|---|---|
| 7 | `update-order` + fOrderStatus=6 (paid) | removeOrder + table `'available'` | ✅ PASS |
| 8 | `update-order` + fOrderStatus=3 (cancelled) | removeOrder + table `'available'` | ✅ PASS |
| 9 | `update-order` + fOrderStatus=7 (Yet-to-Confirm) | updateOrder, NOT removed | ✅ PASS |
| 10 | `new-order` + fOrderStatus=9 (insertion guard) | NOT addOrder | ✅ PASS |
| 11 | `new-order` + fOrderStatus=8 (POS2-005 insertion guard) | NOT addOrder | ✅ PASS |
| 12 | `new-order` + fOrderStatus=1 (preparing baseline) | addOrder called | ✅ PASS |
| 13 | `scan-new-order` + fOrderStatus=9 (insertion guard) | NOT addOrder | ✅ PASS |
| 14 | `scan-new-order` + fOrderStatus=8 (insertion guard) | NOT addOrder | ✅ PASS |
| 15 | `scan-new-order` + fOrderStatus=1 (preparing baseline) | addOrder called | ✅ PASS |

**Total: 15/15 PASS.**

---

## 4. BUG-049 Fixture — Step-by-Step Trace (Owner's Order 825899 / Table 3237)

Backend payload (per intake §7.2):
```
event: 'update-order-paid'
order_id: 825899
restaurant_id: 478
f_order_status: 9 (pendingPayment)
```

Transformed order (per `orderFromAPI.order`):
```
order.orderId       = 825899
order.fOrderStatus  = 9
order.status        = 'pendingPayment'
order.tableId       = 3237
order.tableStatus   = 'occupied'  (per ORDER_TO_TABLE_STATUS map)
```

New FE flow in `handleOrderDataEvent`:
```
isTerminal       = (status === 'cancelled' || status === 'paid')       = false
isPayLaterSettle = (fOrderStatus === 9) && (eventName === 'update-order-paid') = true
isHoldClear      = (fOrderStatus === 9) && !isPayLaterSettle           = false
shouldRemove     = isTerminal || isHoldClear || isPayLaterSettle       = true

→ syncTableStatus(order, updateTableStatus, 'available')   ← BUG-049 fix path
→ removeOrder(825899)
→ log: 'update-order-paid: Order 825899 is pendingPayment (fOrderStatus=9), removed'
```

Resulting state:
- `OrderContext.orders` — order 825899 removed ✅
- `TableContext.tables[3237].status` — `'available'` ✅ (was `'occupied'` before fix)
- `TableCard` render — `isActive = isTableActive('available') = false` → enters `!isActive` branch (L272–285) → renders the standard **Available** chip with the `+` icon ✅
- No `'NA'` fallback can fire (the active branch with the `|| 'NA'` is never entered)

---

## 5. Regression Checks

### 5.1 Hold/Park preservation (BUG-042-C contract)

Test cases 1–4 and 6 lock the predicate: any `fOrderStatus===9` arriving on a non-`update-order-paid` channel still produces:
- `removeOrder(orderId)` ✅
- `updateTableStatus(tableId, 'occupied')` ✅
- NOT `updateTableStatus(tableId, 'available')` ✅

Identical behaviour to pre-fix code.

### 5.2 Settle/cancel preservation

Test cases 7–8 lock the `isTerminal` path:
- `fOrderStatus===6` (paid via Cash/UPI/Card) → table `'available'` ✅
- `fOrderStatus===3` (cancelled) → table `'available'` ✅

Identical to pre-fix.

### 5.3 Yet-to-Confirm preservation

Test case 9 locks the non-terminal update path:
- `fOrderStatus===7` → `updateOrder` called; order NOT removed ✅

Identical to pre-fix.

### 5.4 New-order insertion guards (POS2-005 + BUG-042-C)

Tests 10–15 lock insertion-guard behaviour for both `handleNewOrder` and `handleScanNewOrder` on status 1/8/9.

All identical to pre-fix.

### 5.5 `handleUpdateOrderStatus` mirror

Code in this handler is functionally unchanged. Added clarifying comment only. Since `update-order-paid` events never route here, the existing Hold-path write is correct and required. No test changes; no behaviour change.

---

## 6. Honoured "Do Not Change" Scope (Audit)

| Surface | Status |
|---|---|
| `TableCard.jsx` `\|\| 'NA'` fallback (L298–299) | ✅ Not touched — auto-correct via upstream fix |
| `TableContext.updateTableStatus` reducer | ✅ Not touched |
| `OrderContext.removeOrder` | ✅ Not touched |
| `useSocketEvents` dispatcher | ✅ Not touched |
| `statusHelpers.js` (`TABLE_ACTIVE_STATES`, `ORDER_TO_TABLE_STATUS`) | ✅ Not touched |
| `orderTransform.js` | ✅ Not touched |
| `CollectPaymentPanel.jsx` PayLater write path | ✅ Not touched |
| Room / TakeAway / Delivery rendering branches | ✅ Not touched (benefit from upstream fix automatically) |
| Backend / any API / any socket emission | ✅ Not touched |
| `/app/memory/final/*` | ✅ Not touched |
| `BUG_TEMPLATE.md` | ✅ Not touched |
| Other bugs' surfaces (BUG-042-B, BUG-044 modal residue, BUG-038 CRM autofill) | ✅ Not touched |

---

## 7. Known Items / Follow-ups

### 7.1 Test-suite modification disclosure (transparency)

The pre-existing BUG-042-C `test.each` matrix asserted that **all five** status-9 channels (including `update-order-paid`) keep the table `'occupied'`. That assertion was overly broad — it baked in the conflation that BUG-049 was filed to correct.

In this implementation, the matrix has been **narrowed** to four channels (excluding `update-order-paid`), with two new explicit BUG-049 tests added immediately after. The narrowing is intentional and faithful to BUG-042-C's *intent* (PayLater/Hold removal from the running dashboard), while correcting its *over-broad assertion* for the bill-collect channel. A comment in the test file explains the narrowing.

No existing BUG-042-C test was deleted — the matrix's removed entry was a parametrized value, not a standalone assertion, and is replaced by a more precise pair of explicit tests.

### 7.2 Duplicate-invocation hygiene observation (deferred)

The screenshot console showed two copies of the entire status-9 handler sequence for a single socket event. The duplicate-invoke is harmless after the BUG-049 fix (both invocations now produce the correct `'available'` write), but represents wasted work. **Deferred as a hygiene follow-up ticket** — not in BUG-049 scope.

### 7.3 BUG-044 (parked)

BUG-044 is a sibling parked bug about stale order items showing in modals on freed tables. It is a different surface than BUG-049 (modal vs. dashboard card label) and a different artefact (stale items vs. stale `NA`). The runtime investigation in `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md` never observed a stuck `pendingPayment` table status, so BUG-049's fix does not automatically resolve BUG-044. Cross-reference noted; no merge.

---

## 8. QA Verdict

**PASS — ready for owner smoke.**

- ✅ BUG-049 fixture (`update-order-paid` + status 9, order 825899 / table 3237) produces table `'available'` and renders the standard **Available** chip.
- ✅ BUG-042-C Hold contract preserved 1:1 across 4 non-paid status-9 channels.
- ✅ All 6 regression anchors (status 3/6/7/8/9, addOrder guards) green.
- ✅ 15/15 tests pass; lint clean.
- ✅ No backend, no doc-sweep, no `BUG_TEMPLATE.md` updates.
- ⏳ Manual owner smoke (per §6 of implementation summary) is the next step before final sign-off.

---

*End of BUG-049 QA Report.*
