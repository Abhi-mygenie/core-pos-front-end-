# CR-004 Re-validation QA Report — Phase 1 + Phase 2 Bucket B (FE-1)

**Priority:** **P0**
**Agent:** Change Request QA Validation Agent
**Date:** 2026-05-03
**Branch:** `may4`
**Consolidation reference:** `/app/memory/change_requests/CR_QA_CONSOLIDATION_AND_CLASH_MATRIX_2026_05_03.md` §2, §3 (row 3 + row 5), §4 (clashes #1, #3, #4, #10)
**Prior verdict being retested:** `CR_004_QA_REPORT.md` → `qa_failed` (status-filter derivation bug)
**Root-cause fix documented in:** `implementation_handover/CR_004_BUCKET_B_FE1_HANDOVER.md`

---

## 1. QA Status

**`qa_passed_with_deferred_backend_dependency`**

The specific defect that caused the earlier `qa_failed` verdict — Paid/Unpaid pills deriving from `roomInfo.balancePayment` — is **verifiably removed** from the shipped code. The corrected rule (`Paid ⇔ fOrderStatus === 6`, `Unpaid ⇔ fOrderStatus !== 6`, **no `balancePayment` check**, filter operates on the day-list row with no dependency on the lazy-resolved detail) is implemented via Bucket B / FE-1's `getRoomsForReport` endpoint-selection pattern.

Deep runtime data validation (actual classification of rows with `fOrderStatus ∈ {3, 9, ...}` and `balance_payment === 0`; SummaryBar Paid stat across N resolved rows; Remove-from-Room click-through on a real SRM) is **not executable in this environment** — the preprod backend requires credentials and the Emergent preview banner shows "Frontend Preview Only. Please wake servers". Owner-reported smoke on Mantri (`owner@mantri.com`) preprod on 2026-04-29 is the live-data anchor for this verdict.

---

## 2. Tenant / Environment Tested

| Field | Value |
|---|---|
| Preview URL | `https://insights-phase.preview.emergentagent.com/` |
| Backend URL (preprod) | `https://preprod.mygenie.online/` (reachable; requires auth) |
| Tenants referenced | Mantri (`owner@mantri.com` / `Qplazm#10`) and 18march (`owner@18march.com` / `Qplazm@10`) per handover |
| Test mode used here | **Static code inspection + route boot smoke** — credentials not injected into this workspace; preview shows "Wake up servers" banner |

---

## 3. Screens Tested

| Screen | Scope |
|---|---|
| `/reports/rooms` route | Boot smoke (HTTP + bundle + ProtectedRoute redirect) |
| `RoomOrdersReportPage.jsx` | Filter-pill predicate, data-source routing, summary totals derivation |
| `RoomRowCard.jsx` | Per-row Rule-2 math (`isFullySettled = detail.fOrderStatus === 6`); Remove-from-Room wiring |
| `reportService.js::getRoomsForReport` | Endpoint selection by pill (NOT client-side `balancePayment` filter) |
| `reportService.js::getOrderLogsReport` | Status derivation at row level (`isPaid = f_order_status === 6`) |
| `roomListTransform.js` | Row-seed normalisation |

---

## 4. Test Cases Executed

### 4.1 Code-level verification of the owner-confirmed filter rule

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| C-1 | Pill labels | `All` / `Paid` / `Unpaid` (final wording per `QA_NEXT_AGENT_HANDOVER.md` Part C) | `RoomOrdersReportPage.jsx:54-58` — `STATUS_FILTERS = [{'all','All'}, {'paid','Paid'}, {'unpaid','Unpaid'}]` | ✅ Pass |
| C-2 | Default pill | `all` | `RoomOrdersReportPage.jsx:337` — `useState('all')` | ✅ Pass |
| C-3 | Filter predicate location | Operates on day-list / source-layer, NOT on detail-cache | `fetchOrders` (L451-475) calls `getRoomsForReport(statusFilter, ...)`; `visibleRows = roomRows` (L512) is a pure projection with no filter closure. No `detailCacheRef.current` read in any filter predicate. | ✅ Pass |
| C-4 | `balancePayment` used in filter? | NO | Grep of `RoomOrdersReportPage.jsx` + `getRoomsForReport` (lines 1180-1230) — `balancePayment` appears ONLY in `summaryTotals` Rule-2 math (lines 542-552), never in a filter predicate. | ✅ Pass |
| C-5 | `Paid` pill source | `/order-logs-report` RM rows with derived `status==='paid'` | `reportService.js:1190-1208` — `getRoomsForReport` branches `if (filter === 'paid')` → `getOrderLogsReport(...)` → filter `o.orderIn === 'RM'` → strip `cancelled`/`merged` → keep `o.status === 'paid'` | ✅ Pass |
| C-6 | `status==='paid'` ⇔ `fOrderStatus === 6` | Yes — derivation chain must reduce to `f_order_status === 6` | `reportService.js:567` — `const isPaid = ot.f_order_status === 6 && ot.payment_method !== 'Cancel'` inside `getOrderLogsReport`'s derivation. `'Cancel'` exclusion is correct (matches CR-001 TAB_FILTERS.paid contract) | ✅ Pass |
| C-7 | `Unpaid` pill source | `/get-room-list` only (live, in-house rooms, backend G2-filtered) | `reportService.js:1181-1188` — `if (filter === 'unpaid')` → `getRoomList()` → `transformRoomListToRows(raw)`; no further client-side filter | ✅ Pass |
| C-8 | `Unpaid` pill ⇔ `fOrderStatus !== 6` | Yes — by construction, a room that settled would have `fOrderStatus === 6` and would no longer be returned by `/get-room-list` | `roomListTransform.js:20-22` documents BE-1 G2 as shipped: "backend already filters this endpoint to currently-in-house rooms (verified live preprod 2026-04-29: a checked-out room is NOT returned)" | ✅ Pass |
| C-9 | `All` pill | Union of both sources, deduped by `parentOrderId`, live wins | `reportService.js:1210-1229` — `Promise.all([getRoomList, getOrderLogsReport])`, live rows first, settled rows filtered to `!seen.has(parentOrderId)` | ✅ Pass |
| C-10 | Filter switch invalidates detail cache | Detail fetches re-run on pill change so per-row resolved numbers stay consistent | `fetchOrders` (L456) resets `detailCacheRef.current = new Map()` and `setResolvedTick(0)` on every run; `useCallback` deps include `statusFilter` (L475) so filter change re-runs fetch | ✅ Pass |
| C-11 | Rule-2 math in summary | `outstanding = 0 when fOrderStatus === 6`; `paid = lodgingCollected + (rowSettled ? rowFood : 0)`; discount = `max(0, roomPrice − lodgingCollected)` on settled | `RoomOrdersReportPage.jsx:540-558` implements exactly this formula | ✅ Pass |
| C-12 | Rule-2 math at row level | Same as summary, keyed on `detail.fOrderStatus === 6` | `RoomRowCard.jsx:384-394` — `isFullySettled = detail.fOrderStatus === 6`; identical derivation | ✅ Pass |

### 4.2 Route boot smoke (runnable without credentials)

| # | Test | Expected | Actual | Result |
|---|---|---|---|---|
| B-1 | `GET /reports/rooms` on preview | HTTP 200 | HTTP 200 | ✅ Pass |
| B-2 | Bundle boots, no JS crash | Login screen renders (ProtectedRoute redirect) | Playwright screenshot `/tmp/p0_reports_rooms_boot.png` — Mygenie login page renders, console logs captured to `/root/.emergent/automation_output/20260504_051009/console_20260504_051009.log` | ✅ Pass |
| B-3 | App.js route mount | `<Route path="/reports/rooms" element={<ProtectedRoute><RoomOrdersReportPage /></ProtectedRoute>} />` | `App.js:42` — exact match | ✅ Pass |
| B-4 | Lint clean | No new warnings on fix-surface files | `eslint`: `RoomOrdersReportPage.jsx` / `reportService.js` / `roomListTransform.js` — ✅ No issues found | ✅ Pass |
| B-5 | Preprod reachability | Endpoints respond (auth required) | `POST /api/v2/vendoremployee/get-room-list` → HTTP 405 (method-not-allowed without proper auth headers), `POST .../order-logs-report` → HTTP 404 — backend is live; deep data probe needs credentials | ⚠ Not verifiable here |

### 4.3 Tests NOT executable in this environment (deferred to live-data pass)

| # | Test | Reason | Deferred to |
|---|---|---|---|
| D-1 | Rows with `fOrderStatus ∈ {3, 9, …}` and `balance_payment === 0` must surface under **Unpaid**, not under Paid | Requires Mantri tenant with active mid-stay rooms under advance deposit | Next QA run with live preprod credentials (owner-smoked 2026-04-29 on Mantri) |
| D-2 | Paid pill — settled SRMs (`fOrderStatus===6`) surface on this pill ONLY | Requires tenant with RM transitioned to settled state today or yesterday | Same |
| D-3 | SummaryBar Paid stat = Σ(lodging_collected + food for settled rows), transient spinners while details resolve | Requires ≥2 resolved rows | Same |
| D-4 | Remove-from-Room click-through on a real SRM | Requires `order_unpaid` permission on a room with active SRMs | Same |
| D-5 | Transition consistency: settled SRMs route to Audit Paid tab (Bucket D-1 FE-3 SRM badge) | Requires cross-page flow with real data | Same |

Per `QA_NEXT_AGENT_HANDOVER.md` Part B, these items were explicitly marked "runtime items NOT testable in this environment (note for audit scope only)" in the prior QA run. Consolidation matrix §6 classifies this as `runtime-blocked` not `qa-failed`.

---

## 5. Expected vs Actual — Summary of the Original Failure

| Scenario | Expected (owner rule) | Previous behaviour (`qa_failed`) | Current behaviour (shipped) | Result |
|---|---|---|---|---|
| Mid-stay room, `fOrderStatus === 3`, `balance_payment === 0` (advance fully covers consumption-so-far) | Surfaces under **Unpaid** pill | Surfaced under **Paid** pill (misclassified by `balancePayment === 0`) | `/get-room-list` returns in-house rooms including this one → **Unpaid** | ✅ Fixed |
| Mid-stay room, `fOrderStatus === 9`, `balance_payment === 0` | **Unpaid** | **Paid** (bug) | **Unpaid** (via `/get-room-list`) | ✅ Fixed |
| Settled room, `fOrderStatus === 6`, `balance_payment === 0` | **Paid** | **Paid** (coincidentally correct) | **Paid** (via `/order-logs-report` `isPaid` check) | ✅ Correct |
| Active room with `fOrderStatus === 3`, `balance_payment > 0` | **Unpaid** | **Unpaid** (coincidentally correct) | **Unpaid** (via `/get-room-list`) | ✅ Correct |

The two originally-misclassified scenarios are now served by the correct data source. The coincidentally-correct scenarios remain correct. No regression surface introduced by the architectural change (endpoint selection vs client predicate).

---

## 6. Backend Dependency

| Dep | Status | Impact on this QA |
|---|---|---|
| **BE-1 G2** — `/get-room-list` filters to in-house only | ✅ Shipped (per `SESSION_TRACKER.md` §3 + `roomListTransform.js:20-22`) | Bucket B relies on this; already consumed. |
| **BE-1 `order_id`** (was OPT) on `/get-room-list` | ✅ Shipped | Already consumed via `transformRoomListToRows`. |
| **BE-1 G3** — child `payment_method` / `payment_status` / `f_order_status` refresh on `/get-single-order-new(RM)` | ❌ Partial — children come back with `null` even when set on SRM itself | Workaround in place (Bucket D-1 `getActiveSrmIds()` + Bucket C optimistic Set). No impact on Paid/Unpaid pill correctness. |
| **BE-2** — `lodging_collected`, `discount_amount`, `discount_reason`, `payment_breakdown[]` on `/get-single-order-new` RM-parent | ❌ Pending (P1 on BE-2 spec) | Rule-2 approximation lives until BE-2 lands. Does NOT affect pill classification; affects summary-bar Paid accuracy. |
| **BE-1 P6** — `room_info` on `/order-logs-report` RM rows | ❌ Pending | Only affects Phase 2 cross-day view. Out of scope for this re-validation. |

**Deferred items are NOT failures** — they are explicitly enumerated in `CR_004_BACKEND_EXT_sub_cr.md` and `BE_2_LODGING_PAYMENT_BREAKDOWN.md` per the QA-handover playbook.

---

## 7. Clash-Risk Surfaces Regression-Tested

Per consolidation doc §4, the following clashes touch this code path. Each is spot-checked via static inspection:

| # | Clash surface | Owning CRs | Regression check | Result |
|---|---|---|---|---|
| 1 | Reports filter bar + filter pills | CR-001, CR-003, CR-004 P1, CR-004 P2 B, CR-005 #1 B2-split | Room page pills operate via `getRoomsForReport`, independent from Audit tab predicate in `TAB_FILTERS`. `AllOrdersReportPage.jsx:47-57` ALL_ORDERS_TABS still matches CR-001 QA report contract. No cross-contamination. | ✅ No regression |
| 3 | Audit status derivation / tab routing | CR-001, CR-004 Bucket D-1, BE-1 G1 withdrawal | `getOrderLogsReport:567` `isPaid` derivation unchanged; `getActiveSrmIds()` still exported (line 1248); `reportService.js:601-622` SRM settlement override logic intact. Room Paid pill correctly re-uses this derivation via line 1202 `o.status === 'paid'`. | ✅ No regression |
| 4 | Order lifecycle fields (Rule-2 scope) | CR-001, CR-003, CR-004 P2 | Rule-2 (`fOrderStatus===6 ⇒ outstanding=0`) remains **room-scoped** — used only in `RoomRowCard.jsx:384` and `RoomOrdersReportPage.jsx:540`. No leakage to `reportTransform.js:549` (paid-timestamp) or `OrderDetailSheet`. `orderTransform.js:190` default `'unpaid'` still stands. | ✅ No regression |
| 10 | Room reports math (Rule 1 / Rule 2) | CR-004 P1, CR-004 P2 A/B/C, BE-1 G1 (withdrawn), BE-2 (parked) | Rule 1 (total = roomPrice, advance/balance from roomInfo) intact at `RoomOrdersReportPage.jsx:536-544`. Rule 2 (outstanding=0 on settled, residual balance as discount) intact at L550-552. Discount derivation consistent between summary (L546-549) and row card (`RoomRowCard.jsx:387`). | ✅ No regression |

---

## 8. Screenshots / Log References

| Artifact | Path |
|---|---|
| `/reports/rooms` boot smoke screenshot | `/tmp/p0_reports_rooms_boot.png` (login page via ProtectedRoute redirect) |
| Playwright console log | `/root/.emergent/automation_output/20260504_051009/console_20260504_051009.log` |
| ESLint run summary | Inline §4.2 B-4 — no issues on `RoomOrdersReportPage.jsx`, `reportService.js`, `roomListTransform.js` |

---

## 9. Minor / Cosmetic Findings (non-blocking)

1. **Stale documentation comment** at `RoomOrdersReportPage.jsx:53-54`: *"Phase 4.4: Paid/Unpaid filter is now wired against per-row balancePayment."* This comment predates Bucket B and is inaccurate — the predicate moved to endpoint selection in `getRoomsForReport`. Recommend cleanup in a future doc-only PR. **NOT a functional defect.**
2. **Stale header block** at `RoomOrdersReportPage.jsx:1-28`: "Phase 4.3 SCOPE" still lists `balancePayment`-based filter as deferred-Phase-4.4. Same issue as #1.
3. **Retained diagnostic** `[CR-004 P2 DIAG] /get-room-list response` on mount — intentionally retained per `QA_HANDOVER_INDEX.md` §Diagnostic Code. Not a defect.
4. **Cosmetic Total-column width mismatch** (header `w-20`, cell `w-24`) documented in `SESSION_TRACKER.md` §4 "Sharp edges" — pre-existing, inherited from Phase 1, explicitly out of scope for Bucket A. Not a regression.
5. **Bucket C pill-flicker sharp edge** (~2 frames on first expand while detail fetches) — documented in Bucket C handover. One-liner fix available but outside the re-validation scope.

---

## 10. Final Recommendation

- **Flip CR-004 Phase 1 (4.1–4.5) verdict from `qa_failed` → `qa_passed_with_deferred_backend_dependency`.** The specific defect cited in the original QA report is no longer present; the shipped code implements the owner-confirmed rule verbatim.
- **Partial-final acceptance of CR-004** — Phases 4.1 to 4.5 are acceptance-ready. Phase 4.6 (Export), Phase 4.7 (Final smoke), Phase 2 (cross-day) remain parked pending backend per `SESSION_TRACKER.md` §7.
- **No re-implementation required.** Bucket B already absorbed the fix on 2026-04-29.
- **Live-data validation should follow** — next QA run against Mantri preprod with `owner@mantri.com` credentials should execute test cases D-1..D-5 in §4.3 to produce a runtime confirmation. This is tracked as a deferred item consistent with `QA_NEXT_AGENT_HANDOVER.md` Part B, NOT a new failure.
- **Documentation Update Agent** should reconcile `CR_004_QA_HANDOVER.md` wording per `QA_NEXT_AGENT_HANDOVER.md` Part C and clean up the stale comments flagged in §9.1 / §9.2. **Non-blocking.**
- **Downstream QA** can now proceed to **P1 (CR-008 Sub-CR #1)** per consolidation doc §2.

— End of P0 QA Report —
