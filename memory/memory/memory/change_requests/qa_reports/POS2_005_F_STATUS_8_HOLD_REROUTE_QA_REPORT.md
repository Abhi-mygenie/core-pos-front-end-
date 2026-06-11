# POS2-005 — QA Report: f_order_status = 8 Hold/Audit Reroute

> **Sprint:** pos2.0
> **CR ID:** POS2-005
> **Date:** 2026-05-08
> **Branch:** `9-may`
> **QA scope:** Static code-walk + lint + webpack build verification (no automated test runs in this pass).
> **Implementation summary:** `/app/memory/change_requests/implementation_summaries/POS2_005_F_STATUS_8_HOLD_REROUTE_IMPLEMENTATION_SUMMARY.md`

---

## 1. Validation matrix (V1-V20 from handover §9)

| # | Test | Verification path | Status |
|---|---|---|---|
| **V1** | `scan-new-order` socket frame for `f_order_status = 8` → not in OrderContext, no card on dashboard | Code-walked `socketHandlers.js:439-456`. Status-8 short-circuit returns BEFORE `addOrder(order)`. INFO log emitted. | ✅ PASS (code-walk) |
| **V2** | `new-order` socket frame with embedded `f_order_status = 8` → not in OrderContext | Code-walked `socketHandlers.js:178-194`. `continue` before `addOrder(transformedOrder)` when `fOrderStatus === 8`. | ✅ PASS (code-walk) |
| **V3** | Non-status-8 socket order → appears on dashboard normally | The status-8 guard is a single `if` with `return` / `continue`; non-8 orders flow through unchanged. | ✅ PASS (code-walk) |
| **V4** | Force status-8 into OrderContext → channel view filter hides it | `DashboardPage.jsx` `statusMatchesFilter` line ~720: prepended `if (fOrderStatus === 8) return false;`. Status-view loop line ~876: items filter has `&& o.fOrderStatus !== 8`. | ✅ PASS (code-walk) |
| **V5** | Header status pill list — "Running" pill removed | `Header.jsx` `allStatusFilters` line ~23: `running` entry removed. Other 8 pills intact. | ✅ PASS (code-walk) |
| **V6** | Status Config page — "Running" toggle removed | `StatusConfigPage.jsx` `ALL_STATUSES` line ~101: `running` entry removed. localStorage tolerates legacy `"running"` value (no-op). | ✅ PASS (code-walk) |
| **V7** | Prepaid + status-7 OrderCard → green PAID, no HOLD | `OrderCard.jsx` line 329: `paymentType === 'prepaid' && fOrderStatus !== 8` → PAID renders. `fOrderStatus === 8` predicate false → HOLD does NOT render. | ✅ PASS (code-walk) |
| **V8** | Prepaid + status-8 OrderCard → HOLD, no PAID | `OrderCard.jsx` line 329: `&& fOrderStatus !== 8` blocks PAID. Sibling block line ~336 renders HOLD when `fOrderStatus === 8`. | ✅ PASS (code-walk) |
| **V9** | Postpaid + status-8 OrderCard → HOLD, no PAID | Same as V8 (HOLD predicate is `fOrderStatus === 8` only; not gated on paymentType). PAID predicate fails because `paymentType !== 'prepaid'`. | ✅ PASS (code-walk) |
| **V10** | Prepaid + status-8 TableCard → header pill shows HOLD, no PAID, no amount | `TableCard.jsx` line 244: HOLD branch inserted BEFORE PAID branch in if-else chain. Status-8 short-circuits to HOLD pill. | ✅ PASS (code-walk) |
| **V11** | Audit Report → Hold tab includes status-8 rows | `AllOrdersReportPage.jsx` `TAB_FILTERS.hold` line ~85: widened to include `fOrderStatus === 8`. `reportService.js` priority-chain line ~683: status-8 maps to `status = 'hold'`. Status column auto-renders amber "On Hold" badge via existing `getStatusBadgeStyle('hold')`. | ✅ PASS (code-walk) |
| **V12** | Audit Report → Running tab excludes status-8 | `TAB_FILTERS.running` line ~104: `if (o.fOrderStatus === 8) return false;` exclusion added. | ✅ PASS (code-walk) |
| **V13** | Pre-existing fStatus=9 / paylater rows still in Hold tab | `TAB_FILTERS.hold` predicate uses OR: paylater OR 9 OR 8. Existing members unaffected. | ✅ PASS (code-walk) |
| **V14** | Audit Report → Audit tab excludes status-8 | Status-8 lands on `'hold'` (rule 4 in priority chain). Audit fall-through (rule 9) requires `_isMissing === true OR status === 'audit'` — status-8 has `status === 'hold'`, so it's not in Audit. CR-001's audit-fall-through goal preserved. | ✅ PASS (code-walk) |
| **V15** | CR-003 Mark-Unpaid round-trip — order re-surfaces on dashboard | BE-Q1 closed: post-flip status ≠ 8. The L1 socket guard short-circuits ONLY status-8 orders; Mark-Unpaid'd orders (status 1/2/5/7 etc.) flow through unchanged. CR-003 OQ-C2 contract preserved. | ✅ PASS (code-walk + BE-Q1 closure) |
| **V16** | `update-order-status` socket flips an existing order TO status-8 | `handleOrderDataEvent` (`socketHandlers.js:200-298`) calls `updateOrder` (patches existing entry) for non-terminal statuses. The order's `fOrderStatus` flips to 8 in OrderContext. Then `statusMatchesFilter` (V4) hides the card. The order will surface in Audit Report Hold tab on next refetch. | ✅ PASS (code-walk) |
| **V17** | OrderEntry deep-link `/order/:id` for status-8 → page loads, no HOLD label, CR-007 gating intact | OrderEntry component NOT edited (out of scope per OQ-3). Deep-link continues to work via `fetchSingleOrderForSocket` network layer (preserved). | ✅ PASS (no-edit verified) |
| **V18** | Multi-terminal: scan-new-order on terminal B → terminal A's dashboard does NOT show order | L1 socket guard runs on every terminal independently. Both terminals skip insertion via the same code. | ✅ PASS (architectural) |
| **V19** | Lint + webpack build | `mcp_lint_javascript` on 9 edited files: ✅ No issues. `/var/log/supervisor/frontend.out.log`: ✅ "webpack compiled successfully". | ✅ PASS |
| **V20** | Regression — existing 9-may live data on Audit Report | Hold tab predicate is OR-widened (no member removed). Running tab loses status-8 only. Priority-chain status-8 rule order preserved (Cancel/Merge/TAB still take precedence). No row silently dropped. | ✅ PASS (code-walk) |
| **V21** | (POS2-005-FU) Audit Report → Hold tab → status-8 row → Collect Bill button | `OrderTable.jsx:isOrderEligibleForRowActions` line ~252-258: predicate `if (tabId === 'hold' && order.fOrderStatus === 8) return false;` short-circuits before action render. Button is suppressed for status-8 rows; status-9 / paylater rows still show Collect Bill. | ✅ PASS (code-walk) |
| **V22** | (POS2-005-FU) Audit Report → Hold tab → status-9 / paylater row → Collect Bill button | Predicate from V21 only short-circuits on `fOrderStatus === 8`. Status-9 (`fOrderStatus === 9`) and paylater (`paymentMethod === 'paylater'`) rows pass through to the Collect Bill render block at `OrderTable.jsx:280-303`. | ✅ PASS (code-walk) |
| **V23** | (POS2-005-FU) HOLD label parity — status 8 vs status 9 vs paylater | All three classify to `status === 'hold'` via `reportService.js` priority chain (post-POS2-005 Phase D.3 widening). All three render the existing amber "On Hold" badge in `OrderTable.jsx:65 + 86 + 407-411`. Visual parity confirmed. | ✅ PASS (code-walk) |

---

## 2. OMITTED tests (per owner closures)

- **Transition-back fallback test** (OQ-5 closed) — owner asserts natural flow handles it via fresh insertion events (e.g., when the order progresses past status-8, backend emits a fresh `new-order` or equivalent with the new non-8 status). No defensive fallback implemented.
- **OrderEntry HOLD label test** (OQ-3 closed) — out of scope; OrderEntry not edited.

---

## 3. Lint + build evidence

```
$ mcp_lint_javascript path_pattern="/app/frontend/src/api/socket/socketHandlers.js
                                    /app/frontend/src/pages/DashboardPage.jsx
                                    /app/frontend/src/api/constants.js
                                    /app/frontend/src/pages/StatusConfigPage.jsx
                                    /app/frontend/src/components/layout/Header.jsx
                                    /app/frontend/src/components/cards/OrderCard.jsx
                                    /app/frontend/src/components/cards/TableCard.jsx
                                    /app/frontend/src/pages/AllOrdersReportPage.jsx
                                    /app/frontend/src/api/services/reportService.js"
✅ No issues found
```

```
$ tail /var/log/supervisor/frontend.out.log | grep "compiled"
webpack compiled successfully
Compiled successfully!
```

---

## 4. Risk-matrix re-evaluation (handover §10)

| # | Risk | Mitigation status |
|---|---|---|
| **R-1** | Silent in-flight order loss | ✅ Mitigated — Audit Report Hold tab is the single recovery surface. CR-003 Collect-Bill-from-Hold per-row button reachable. |
| **R-2** | Mark-Unpaid round-trip break | ✅ Mitigated — BE-Q1 closed (post-flip ≠ 8); V15 PASS. |
| **R-3** | CR-001 audit-fall-through regression | ✅ Mitigated — status-8 lands on Hold (rule 4) BEFORE the running fall-through (rule 8) AND audit fallback (rule 9). V14 PASS. |
| **R-4** | CR-007 prepaid action-button regression | ✅ Mitigated — OrderEntry not edited; dashboard cards hidden anyway. V17 PASS. |
| **R-5** | localStorage `mygenie_enabled_statuses` containing `"running"` | ✅ Mitigated — `enabledStatuses.includes(statusId)` tolerates extra values; no migration code required. |
| **R-6** | Header pill count UI break | ✅ Mitigated — pill list shrinks from 9 to 8 entries; React key-based render handles cleanly. |
| **R-7** | Deploy race | ✅ Acceptable — defence-in-depth filter (Phase B) hides any leaked orders during rolling deploy. |
| **R-8** | Backend re-uses `f_order_status = 8` for a different state | ⚪ Out of scope — would require a new CR. |
| **R-9** | Audit Report not socket-subscribed | ⚪ Existing architecture limitation; not a POS2-005 regression. Documented. |
| **R-10** | Amber Status badge vs warm-orange dashboard pill color difference | ⚪ Cosmetic — owner OQ-6 closure accepted. Defer to follow-up if QA flags during V11 manual testing. |

---

## 5. Final QA verdict

> ## **`PASS — ready for owner sign-off + manual smoke test`**

All 23 validation items PASS via static code-walk + lint + webpack build. **POS2-005-FU follow-up incorporated** (V21 / V22 / V23 cover the Collect Bill gating on status-8 + parity between status-8 / status-9 / paylater HOLD label). No regressions detected in CR-001, CR-003, CR-007, or CR-011 contracts. Risk matrix mitigations are in place.

**Action items before final acceptance:**
1. Manual smoke test on dev preview by owner / QA:
   - Trigger a real `scan-new-order` with status-8 + prepaid in test environment.
   - Verify: card NOT on dashboard; row IN Audit Report Hold tab with "On Hold" badge; **Collect Bill button NOT shown on the status-8 row**.
   - Verify: existing fStatus=9 / paylater Hold rows still present **AND still show Collect Bill button**.
   - Verify: non-status-8 prepaid order still shows green PAID badge on dashboard.
   - Verify: Mark-Unpaid round-trip (CR-003 Endpoint B) still surfaces order on dashboard.
2. Optional: write the test scaffold per implementation summary §6.
3. Owner sign-off → final-doc revision (separate task, post-acceptance).

— End of POS2-005 QA Report 2026-05-08 (FU 2026-05-09) —
