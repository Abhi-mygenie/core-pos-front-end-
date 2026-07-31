# Reports — QA Validation Report (2026-05-01)

## 1. QA Verdict
**PASS WITH WARNING** — Implementation aligns with handover; code-level validation passes for all 12 items. **Documentation update required** to reflect route additions, derived-math approach, and OQ-12 partial closure. Doc-update handover prepared at `/app/memory/handover/REPORTS_DOC_UPDATE_HANDOVER_2026-05-01.md`.

Manual browser QA per QA handover §3 still required (this report covers static + code validation only — no browser tests run).

---

## 2. Documents reviewed
| Doc | Read | Notes |
|---|---|---|
| `/app/memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md` | ✓ | Primary input |
| `/app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md` | ✓ | Reading order + open decisions register |
| `/app/memory/final/FINAL_DOCS_SUMMARY.md` | ✓ | High-risk surface list |
| `/app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md` (Rule MC-06, deferred items) | ✓ | Aggregation ownership rule |
| `/app/memory/final/MODULE_DECISIONS_FINAL.md` (§10 Reports, §14 Printing) | ✓ | Module boundary check |
| `/app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md` (OQ-07, OQ-12) | ✓ | Deferred-decision check |
| `/app/memory/final/IMPLEMENTATION_AGENT_RULES.md` | ✓ | High-risk file list |
| `/app/memory/final/CHANGE_REQUEST_PLAYBOOK.md` | ✓ | Module-mapping reference |
| `/app/memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md` | ✓ | Live-payload evidence |
| `/app/memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` | ✓ | Implementation rationale |
| `/app/memory/change_requests/REPORTS_FIELD_MAPPING_TRACKER.md` | ✓ | Source tracker |
| `/app/memory/handover/REPORTS_BACKEND_NOTE_2026-05-01.md` | ✓ | Backend-blocked register |

**Missing files:** None of the docs flagged in the approval status as required were missing.

---

## 3. Files inspected
| File | Inspected | Lines reviewed |
|---|---|---|
| `frontend/src/api/services/reportService.js` | ✓ | full diff: `getOrderLogsReport` + INVARIANT/PENDING blocks + actionedBy resolver |
| `frontend/src/api/transforms/reportTransform.js` | ✓ | `CANCEL_TYPE_LABELS`, `extractLocation`, paid/cancel/hold transforms |
| `frontend/src/api/transforms/orderTransform.js` | ✓ | `roomInfo` map, `buildBillPrintPayload` predicate |
| `frontend/src/components/reports/OrderTable.jsx` | ✓ | Cancelled tab Status column + actionedBy renderer |
| `frontend/src/components/reports/ExportButtons.jsx` | ✓ | CSV column add |
| `frontend/src/components/reports/RoomRowCard.jsx` | ✓ | `numbers` memo + Discount strip cell + optimistic-Set removal |
| `frontend/src/pages/RoomOrdersReportPage.jsx` | ✓ | SummaryBar, summaryTotals, optimistic-Set removal |
| `/app/memory/handover/*` (4 docs created this session) | ✓ | content review |

---

## 4. Scope validation

### Expected changed files (from handover §6)
1. `frontend/src/api/services/reportService.js`
2. `frontend/src/api/transforms/reportTransform.js`
3. `frontend/src/api/transforms/orderTransform.js`
4. `frontend/src/components/reports/OrderTable.jsx`
5. `frontend/src/components/reports/ExportButtons.jsx`
6. `frontend/src/components/reports/RoomRowCard.jsx`
7. `frontend/src/pages/RoomOrdersReportPage.jsx`

### Actual changed files (`git diff 107192c HEAD --stat`)
All 7 frontend files match. Plus 4 markdown handover docs:
- `memory/change_requests/REPORTS_FIELD_MAPPING_TRACKER.md` (existing — change log appended)
- `memory/handover/REPORTS_BACKEND_NOTE_2026-05-01.md` (new)
- `memory/handover/REPORTS_FIELD_MAPPING_IMPLEMENTATION_HANDOVER.md` (new)
- `memory/handover/REPORTS_FIELD_MAPPING_LIVE_AUDIT_2026-05-01.md` (new)
- `memory/handover/REPORTS_QA_HANDOVER_2026-05-01.md` (new)
- `.emergent/emergent.yml` + `.gitignore` (auto-platform — unrelated to reports)

**Unexpected/unrelated drift:** None within reports scope. The two `.emergent/*` and `.gitignore` lines are environment-setup artefacts, not implementation drift.

---

## 5. Requirement-by-requirement validation

| # | Item | Code finding | Result | Risk / note |
|---|---|---|---|---|
| 1 | P1 `waiter_name` → PUNCHED BY | `reportService.js:800` `punchedBy = api.waiter_name \|\| ''`. `reportTransform.js` 3 sites all `\|\| ''` (replaceAll). No `Employee #` strings remaining. | PASS | Manual: confirm no `Employee #1476` strings on Audit Paid tab. |
| 2 | P3 `cancellation_reason` → REASON | Inline transform L859: `cancellationReason: api.cancellation_reason \|\| ''`. `reportTransform.js:229,419` updated. No alt-key fallback. | PASS | Known: BE inconsistent — handover §4 covers this. |
| 3 | P4 `cancel_type` → STATUS column | `reportService.js:913` reads raw `orderWrapper.order_details_table?.[0]?.cancel_type` verbatim. Column added in `OrderTable.jsx:166` (Cancelled tab only). CSV column added in `ExportButtons.jsx:67`. | PASS | Manual: confirm column visible on Cancelled tab + CSV. |
| 4 | P5 `table_name` → TABLE NO | `reportTransform.js:121` + `reportService.js:580,749` all read `api.table_name`. No `api.table_no` references in changed files. | PASS | Verified live: `table_name` = "T1", "5", "109" on welcomeresort. |
| 5 | RM `R<room_no>` label | `reportService.js:751-757`: `rmRoomNo = wrapperRoomInfo?.room_no; displayLocationLabel = rmRoomNo ? \`R${rmRoomNo}\` : 'Room'`. | PASS | Verified: rooms `R109`, `R201` etc. on welcomeresort. |
| 6 | P2 paid (`employee_name`) | `reportService.js:826`: `actionedBy = resolveName(api.employee_name \|\| <legacy chain>, api.employee_id \|\| <legacy chain>)`. | PASS | Verified: paid row 824551 → `counter2`. |
| 7 | P2 cancel item-level | `reportService.js:838`: reads `firstItemCancelBy.cancel_by_name` as fallback. | PASS | Verified: cancelled row 822509 → `counter2` (item-level only). |
| 8 | UX prefix removed | `OrderTable.jsx:455-466`: `{order.actionedBy ? <name> : <em-dash>}`. No `actionedByLabel` rendering. | PASS | `actionedByLabel` still computed in service for downstream consumers (correct minimal change). |
| 9 | BE-2 derived math + Discount column | `orderTransform.js:309-329` extends `roomInfo` with `receiveBalance`, `paymentStatus`, `balancePaymentMode`, `roomNo`, `discountAmount`, `discountReason`. `RoomRowCard.jsx::numbers` rewritten with derived formula. Discount cell added in row strip (conditional on `> 0`). `RoomOrdersReportPage.jsx` SummaryBar Discount stat conditional. | PASS | **Doc gap (see §8):** this is frontend derivation; conflicts with Rule MC-06 wording. Handover correctly notes BE-shipped `discount_amount` will take precedence. |
| 10 | G3 cleanup | `optimisticRemovedIds` Set + `setTimeout(1500)` + filter all removed. `RoomRowCard.jsx::TransferredOrdersTable` no longer accepts the prop. JSDoc updated. | PASS | grep confirms no leftover references. |
| 11 | Bill print cancel filter | `orderTransform.js:1110-1118`: `isDetailCancelled` predicate (`food_status === 3 \|\| cancel_at != null \|\| cancel_type != null`). Filter chained at L1119. `[BILL-PRINT]` console log L1140-1145. | PASS | **Doc gap (see §8):** §14 Printing module impact-areas list does not mention this concern yet. |
| 12 | Console diagnostics | `[BE-1 INVARIANT]` (L546-571), `[BE-1 PENDING]` (L585-606), `[BE-2 INVARIANT]` (L608-624), `[BILL-PRINT]` (orderTransform.js:1140). All gated `process.env.NODE_ENV === 'development'`. | PASS | Zero production cost. |

---

## 6. Export/download validation

| Tab | Column added | Verified | Note |
|---|---|---|---|
| Cancelled | "Cancel Reason" | already present (L65 of ExportButtons) | unchanged |
| Cancelled | "Cancel Status" | NEW at `ExportButtons.jsx:67` via `columns.splice(7, 0, …)` | Code-validated; manual export-and-open required |
| Other tabs | No column changes | n/a | Regression-safe |

CSV download flow itself unchanged — only column list extended for Cancelled tab.

---

## 7. Filter/API parameter validation

No filter or API-parameter changes. Endpoints used unchanged:
- `POST /api/v2/vendoremployee/report/order-logs-report` (Audit + Room reports — payload now consumed at wrapper level for `room_info` + `associated_orders`)
- `POST /api/v2/vendoremployee/get-single-order-new` (Room detail — `room_info` map extended in transform)
- `POST /api/v1/vendoremployee/order-temp-store` (Bill print — payload field list now excludes cancelled items)

Date filters, sort_by, search-by-order-id — not touched. Regression-safe by inspection.

---

## 8. Final docs alignment validation

### 8.1 Docs aligned
- `IMPLEMENTATION_AGENT_RULES.md` — high-risk file list correctly includes `reportService.js`, `orderTransform.js`. Implementation respected high-risk-file caution.
- `CHANGE_REQUEST_PLAYBOOK.md` — request module-mapped to Reports + Printing modules.
- `ARCHITECTURE_DECISIONS_FINAL.md` Rule MC-06 — implementation makes `discount_amount` derivation a *temporary* derivation that prefers BE-shipped explicit field when present (`explicitDiscount > 0 ? explicit : derived`). Defensible under the rule's "verified during the next report-related work" provision.
- `FINAL_DOCS_APPROVAL_STATUS.md` rule 7 — "must update docs if implementation changes architecture, module boundaries, or API behavior" — triggered. See §8.2.

### 8.2 Docs needing update
**Three localised gaps identified.** All are documentation-only — implementation is correct. Doc-update handover created at `/app/memory/handover/REPORTS_DOC_UPDATE_HANDOVER_2026-05-01.md`.

| Doc | Section | Gap |
|---|---|---|
| `MODULE_DECISIONS_FINAL.md` | §10 Reports — "Related routes/screens" | Missing `/reports/rooms` (RoomOrdersReportPage). The Discount column / derived math / G3 cleanup all live here. |
| `MODULE_DECISIONS_FINAL.md` | §10 Reports — "Open decisions" | OQ-07 should be marked "verified during 2026-05-01 reports update — temporary derivation only; preserves BE precedence". |
| `MODULE_DECISIONS_FINAL.md` | §14 Printing — "Common bug/change impact areas" | Should add "cancelled-item exclusion from bill print payload" as a codified concern. |
| `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | OQ-07 | Status update: verified, not promoted to "frontend aggregation ownership". |
| `OPEN_QUESTIONS_FINAL_RESOLUTION.md` | OQ-12 | The 2026-05-01 reports update IS the "next room billing / room print related change". OQ-12 status should reflect partial closure (bill-print payload now sanitises cancelled items; room math now uses derived lodging_collected). |
| `FINAL_DOCS_SUMMARY.md` | "Deferred or verification-sensitive items" | Should reflect OQ-07 verified + OQ-12 partial closure. |

### 8.3 Docs missing/unclear
None at file-presence level. All required-reading docs from `FINAL_DOCS_APPROVAL_STATUS.md §4` exist.

### 8.4 Documentation handover created
**Yes** — at `/app/memory/handover/REPORTS_DOC_UPDATE_HANDOVER_2026-05-01.md`.

---

## 9. Build/compile result

| Check | Result |
|---|---|
| ESLint on 7 changed files | ✅ 0 errors, 0 warnings |
| Webpack compile (`/var/log/supervisor/frontend.out.log`) | ✅ "compiled with 1 warning" — pre-existing `LoadingPage.jsx:111` `react-hooks/exhaustive-deps` warning, unrelated to this change |
| Frontend supervisor status | ✅ RUNNING |
| Hot-reload pickup | ✅ confirmed via tail of out.log |

---

## 10. Manual QA checklist (for human QA — derived from handover §3)

### Audit Report (`/reports/audit`) — welcomeresort 2026-04-29
- [ ] All 4 tabs (All / Paid / Cancelled / Hold) load
- [ ] **TABLE NO** column shows real labels: `T1`, `5`, `R109`, `R201`, `Walk-in`, `Takeaway` — no `—` for rows that have data
- [ ] **PUNCHED BY** column shows `counter2`, `Owner` etc. — zero `Employee #<id>` strings
- [ ] **ACTIONED BY (Paid)** column shows `counter2` etc. — no orphan "Collected by " text on missing-name rows
- [ ] **ACTIONED BY (Cancelled, item-cancel)** shows `counter2` etc.
- [ ] **REASON** populated when BE captured text (test on 18march 2026-04-28 order 819018 → "Hdgshhshs")
- [ ] **STATUS** column visible on Cancelled tab — values: `Pre-Serve`, `Post-Serve`, `Order`, `full`, or blank
- [ ] CSV export of Cancelled tab includes both "Cancel Reason" and "Cancel Status" columns
- [ ] Detail sheet drill-down opens, shows full order info (regression)
- [ ] Date filter and search-by-order-id still work (regression)

### Room Orders Report (`/reports/rooms`) — welcomeresort
- [ ] Page loads with Rooms / Total / Paid / Outstanding pills
- [ ] Discount pill **hidden** on welcomeresort 2026-04-29 (no actual discount cases — handover §3.2)
- [ ] Each room row shows Total · Advance · Balance · Paid · Outstanding (Discount cell shows `—` since gap is 0)
- [ ] "Paid" pill total = Σ(advance + receive_balance) across visible rooms
- [ ] **Remove-from-Room** flow: SRM disappears in <500ms (no 1.5s flicker, no ghost reappearance)
- [ ] Other rooms unaffected during remove action
- [ ] Outstanding banner appears correctly on in-house rooms (regression)

### Bill print — `/order-temp-store`
- [ ] Cancel one item on a 2-item dine-in order, click "Print Bill"
- [ ] DevTools Network → `/order-temp-store` request body excludes cancelled item
- [ ] Browser console shows `[BILL-PRINT] excluded N cancelled item(s) from /order-temp-store payload for order <id>`
- [ ] Printed receipt does not list cancelled item
- [ ] Computed total / GST / VAT match the uncancelled subtotal
- [ ] All-cancelled order edge case (acceptable empty bill, no crash)
- [ ] Mix of cancelled + complimentary items: cancelled hidden, complimentary at ₹0
- [ ] "Check In" marker still excluded (regression)

### Console diagnostics (DevTools open during all of the above)
- [ ] `[BE-1 INVARIANT]` lines do NOT fire for welcomeresort 2026-04-29 (any such fire = bug to file)
- [ ] `[BE-1 PENDING]` lines fire only for known-pending fields (collect_by_name on tenants without `employee_name`, cancel_by_name on whole-order cancels, merge_by_name on merged rows)
- [ ] `[BE-2 INVARIANT]` lines fire only for actual cash gaps (welcomeresort 7 settled rooms reconcile to ₹0 — no warnings expected)
- [ ] `[BILL-PRINT]` fires every time a print payload is built with a cancelled item

### Regression spot-checks
- [ ] Login on both tenants
- [ ] No console errors (only documented `[BE-1 *]` / `[BE-2 *]` / `[BILL-PRINT]` informational lines)
- [ ] Audit Report search by order id returns matching row
- [ ] Auto-print on bill collection still triggers (manual print button still works)

---

## 11. Blockers / warnings / pending items

### Blockers — NONE
No code blockers. Implementation is consistent with handover and final-docs guardrails.

### Warnings
- ⚠ **Mantri tenant credentials rejected** — `Qplazm#10` returned `auth-001 Unauthorized`. Manual QA on Mantri cannot proceed without updated password from product. (Documented in QA handover §1 already.)
- ⚠ **Documentation update required** — see §8.2. Doc-update handover prepared.
- ⚠ **OQ-12 deferred-decision touched** — bill-print and room-math changes both fall inside the explicitly-deferred OQ-12 area. The implementation preserves financial correctness (cancelled-item filter excludes from BOTH print and aggregation), and the handover explicitly states "computed total / GST / VAT on the print — drops the cancelled-item contribution". This is consistent with Rule MC-04 (collect-bill parity). Acceptable per OQ-12 guidance "Revisit and verify this area during the next room billing / room print related change" — that revisit is exactly this change.

### Pending items
- 5 backend-blocked fields documented in `REPORTS_BACKEND_NOTE_2026-05-01.md` — out of scope for this validation per the QA handover §4 "do NOT flag as bugs" list.
- Manual browser QA per §10 — to be executed by QA owner.

---

## 12. Final recommendation

**Safe for manual QA, but documentation update needed first.**

- Implementation passes static + code-level validation. ✓
- All 12 handover items verified at code level. ✓
- Lint + compile clean. ✓
- No unexpected file drift. ✓
- 4 known-issues are correctly documented in handover §4 and should not block QA. ✓
- 5 backend-pending items have console-driven self-verification mechanism. ✓
- **Documentation must be updated by Documentation Agent before this change is considered fully closed** — see `/app/memory/handover/REPORTS_DOC_UPDATE_HANDOVER_2026-05-01.md`.

### Proposed sequencing for stakeholders
1. Documentation Agent → update final docs per handover (low-risk, doc-only).
2. QA Owner → execute §10 manual checklist on welcomeresort + 18march. Mantri once password recovered.
3. Backend Team → consume `REPORTS_BACKEND_NOTE_2026-05-01.md` for the 5 pending asks.
4. After QA sign-off + doc update → merge to `master`.

---

**End of QA report.**
