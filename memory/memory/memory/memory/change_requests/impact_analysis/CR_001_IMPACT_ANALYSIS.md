# CR-001 Impact Analysis: Fix Status Derivation + Filter Structure in All Orders Report (Hold misclassification, fallback, Channel/Platform/Status filter correction, Room-orders removal, Razorpay PG filter)

## Status
- impact_approved_for_planning

## Revision Note
- 2026-04-28 rev-1 — All 7 clarification questions (Q-A through Q-G) answered by user. Status promoted from `impact_needs_info` → `impact_ready_for_approval`. Decisions consolidated below in "Clarification Questions" + "Assumptions" sections. No structural rewrite of the analysis; only the open items table updated and a new "Confirmed Decisions From Clarification Round" section added.
- 2026-04-28 rev-2 — User explicitly approved ("approve all"). Status promoted from `impact_ready_for_approval` → `impact_approved_for_planning`. Document is handed off to the Change Request Implementation Planning Agent.

## Source CR
- CR ID: CR-001
- CR Title: Fix Status Derivation + Filter Structure in All Orders Report (Paylater/Hold misclassification, wrong fallback, and Channel/Platform/Status filter correction)
- CR Doc Path: `/app/memory/change_requests/CR_001_all_orders_status_derivation.md`
- CR Status: `cr_approved_for_planning` (approved 2026-04-28)

## Setup Context
- Selected codebase mode: existing `/app` checkout (frontend monorepo on `CR-28-april`)
- Repo: https://github.com/Abhi-mygenie/core-pos-front-end-.git
- Branch: `CR-28-april` (verified)
- Pull status: Performed (Step 1)
- Build/compile performed: No

## Impact Analysis Summary
CR-001 is a frontend-only behavior + structural change to the Audit Report (`/reports/audit`) covering five interlocking concerns:
1. Add a `hold` rule to the status-derivation pipeline (`getOrderLogsReport`) keyed on `f_order_status === 9` OR `payment_method.toLowerCase() === 'paylater'`.
2. Replace the silent `paid` fallback with `audit`; route unmatched real orders to the Audit tab in addition to existing missing-ID placeholders.
3. Restructure the filter bar — Status (add `On Hold`), Channel (rebuild list, source from new `order_type` field), Platform (enable, source from `order_from`).
4. Globally exclude room orders (`order_in ∈ {RM, SRM}` or `payment_method === 'ROOM'`) from every tab of the Audit Report; remove the `Transferred` tab; remove `roomTransfer` from `statusBreakdown`; ensure room IDs are filtered out before gap detection.
5. Add a tri-state Payment Gateway filter (All / Gateway / Non-Gateway) driven by `razorpay_order_id`.

The change touches one architectural hotspot (`reportService.js::getOrderLogsReport`) and several reports-module presentation files, with no backend, socket, or print contract changes.

## Requirement Understanding
- The Audit Report's STATUS column and tab routing currently run in two parallel logics that have drifted: paylater orders end up under both Hold and Unpaid tabs; unmatched orders fall through to a silent `paid` default; room orders pollute every tab and break gap detection; the filter bar mixes Channel and Platform semantics; Razorpay PG status is not surfaced.
- CR-001 corrects these as a frontend-only fix, deferring the deeper unification refactor to CR-002 and the new Room PMS view to CR-004.
- Approved by user on 2026-04-28 ("approved / freeze all"); 2 non-blocking OQs remain open (OQ-Room-1 with recommended default, OQ-Room-2 nice-to-have backend flag).

## Confirmed Scope From CR
Drawn verbatim (CS-1 → CS-28):
- **Status derivation (CS-1, CS-2):** Add `f_order_status === 9 || paymentMethod === 'paylater' (case-insensitive) → 'hold'` rule before the `unpaid` rule; replace silent `paid` fallback with `audit`.
- **Tab filters (CS-3, CS-4, CS-5):** `unpaid` filter excludes paylater/`fOrderStatus === 9`; `audit` filter additionally includes orders with `status === 'audit'`; Audit tab count = `missingCount + unmatchedOrdersCount`; red/green indicator behavior preserved.
- **statusBreakdown (CS-6):** Add `hold` and `audit` so totals reconcile.
- **Status badge (CS-7):** Add `audit` entry in `OrderTable.jsx::getStatusBadgeStyle`/`getStatusLabel` (suggested amber/yellow tone, distinct from red `missing` and yellow `running`).
- **Edge case (CS-9):** `paylater + payment_status === 'paid'` → still Hold (method-first).
- **Filter bar (CS-10, CS-11, CS-12, CS-13, CS-14, CS-15):** Status adds `On Hold`; Channel rebuilt; Platform enabled; channel = `order_type` normalized to `dinein/takeaway/delivery`; platform = `order_from` (`pos`/`web`); Channel and Platform are independent and AND-able.
- **Room removal (CS-16 → CS-22):** Pre-filter `allOrders` to exclude room orders before tab filters and before gap detection; remove `Transferred` tab and `transferred` key from `TAB_FILTERS` and `STATUS_FILTER_OPTIONS`; remove `Room` from `CHANNEL_OPTIONS`; remove `roomTransfer` from `statusBreakdown` + `STATUS_CONFIG`. `ORDER_LOGS_REPORT` payload unchanged (frontend-only exclusion).
- **PG filter (CS-23 → CS-28):** Tri-state pill control (All / Gateway / Non-Gateway) with label "Payment Gateway"; data plumbing surfaces `razorpayOrderId` + derived `isPaymentGateway` boolean from `getOrderLogsReport`; filter applied at the same layer as channel/platform filters; combinable with tab + other filters; PDF/CSV honor it; no status-derivation or column changes.

## Out of Scope From CR
- Backend API changes (`payment_method`, `payment_status`, `f_order_status`, `order_type`, `order_from`, `razorpay_order_id` are read as-is).
- Aggregator dedicated status badge (deferred via OQ-3).
- Unifying status derivation and tab filtering into a single classifier — tracked in CR-002.
- Endpoint-level changes to On-Hold report (ISSUE-001 noted in `reportTransform.js` not addressed).
- Gap-detection (Running / Missing) algorithmic changes — only its input list changes (room exclusion).
- Running-order, aggregator routing, KOT/print, payment, and room-billing flows.
- Reports aggregation ownership change (Rule MC-06 / OD-01 unchanged).

## Codebase Review Summary
- Source files inspected:
  - `/app/frontend/src/api/services/reportService.js` (lines 380–491 — `getOrderLogsReport`)
  - `/app/frontend/src/pages/AllOrdersReportPage.jsx` (full file, 485 lines)
  - `/app/frontend/src/components/reports/FilterBar.jsx` (full file, 290 lines)
  - `/app/frontend/src/components/reports/OrderTable.jsx` (lines 50–100, 167–220, 338–443)
  - `/app/frontend/src/components/reports/FilterTags.jsx` (full file)
  - `/app/frontend/src/components/reports/ExportButtons.jsx` (top section + grep on channel/platform/razorpay/order_type)
  - `/app/frontend/src/components/reports/OrderDetailSheet.jsx` (top section)
  - `/app/frontend/src/api/transforms/reportTransform.js` (lines 100–220, 397–402, 533)
  - `/app/frontend/src/api/constants.js` (lines 73, 124–170 — endpoints + status maps)
  - `/app/frontend/src/utils/statusHelpers.js` (lines 75–90)
- Why these files were inspected: CR-001 names them as the affected/reference set. Code inspection confirmed (a) the priority rules and silent-paid fallback in `getOrderLogsReport`, (b) the parallel `TAB_FILTERS` logic with its own room/aggregator routing, (c) absence of `hold`/`audit` filter values and absence of `razorpay_order_id` plumbing, (d) `Platform` filter currently disabled, (e) `STATUS_CONFIG` containing `roomTransfer`. Transform and detail-sheet files were sampled to confirm nothing downstream silently relies on `transferred` tab content or on the silent `paid` default.

## Final Docs Reviewed
- /app/memory/final/CHANGE_REQUEST_PLAYBOOK.md
- /app/memory/final/FINAL_DOCS_APPROVAL_STATUS.md
- /app/memory/final/ARCHITECTURE_DECISIONS_FINAL.md
- /app/memory/final/MODULE_DECISIONS_FINAL.md
- /app/memory/final/OPEN_QUESTIONS_FINAL_RESOLUTION.md
- /app/memory/final/IMPLEMENTATION_AGENT_RULES.md

## Affected Modules / Areas
| Area | Impact Level | Notes |
| --- | --- | --- |
| Reports / Audit / Summary Module (Section 10) | High | Primary module — status derivation, filters, tabs, statusBreakdown, gap detection input. |
| Order Entry / Cart / Payment Workflow | Not confirmed | No code change expected. Verify that nothing else depends on the silent-`paid` default of `getOrderLogsReport` (none found in inspected files). |
| Realtime Socket | Low / None | CR-001 is HTTP-fetched report scope. No socket subscription changes. |
| Visibility Settings / Device Configuration | Low / None | No localStorage keys touched. |
| Rooms module | Low (presentation only) | Audit Report no longer shows room orders, but Room data flow itself is unchanged. CR-004 handles the new PMS view. |

## Affected Screens / Components
| Screen / Component | File Path | Impact | Notes |
| --- | --- | --- | --- |
| Audit Report page | `/app/frontend/src/pages/AllOrdersReportPage.jsx` | High | Tabs list, `TAB_FILTERS`, `statusBreakdown`, channel/platform/PG filter wiring, room pre-filter, audit-tab count, gap-detection input list. |
| FilterBar | `/app/frontend/src/components/reports/FilterBar.jsx` | High | `STATUS_FILTER_OPTIONS`, `CHANNEL_OPTIONS`, `PLATFORM_OPTIONS` enable, `STATUS_CONFIG` (remove `roomTransfer`), new tri-state PG control, label/JSX additions. |
| OrderTable | `/app/frontend/src/components/reports/OrderTable.jsx` | Medium | Add `audit` entry to `getStatusBadgeStyle` + `getStatusLabel`. Existing `hold` styling already present. No column header changes. |
| FilterTags | `/app/frontend/src/components/reports/FilterTags.jsx` | Medium | Add `platform` and PG tag rendering; current label map omits both. Re-export of `CHANNEL_OPTIONS` consumed here — list change must propagate. |
| ExportButtons (CSV/PDF) | `/app/frontend/src/components/reports/ExportButtons.jsx` | Low | No reference to channel/platform/PG today; exports already follow the filtered list. Verify the filtered list reaching it includes the new room-exclusion + PG filter. No new columns required by CR. |
| OrderDetailSheet | `/app/frontend/src/components/reports/OrderDetailSheet.jsx` | Low | No change required; relies on `getSingleOrderNew`. Verify `audit` rows do not break drill-down (audit rows are real orders with regular IDs). |
| StatusConfigPage / Header | `/app/frontend/src/pages/StatusConfigPage.jsx`, `/app/frontend/src/components/layout/Header.jsx` | Read-only | Referenced by CR for `f_order_status === 9` evidence; no code change. |

## Affected APIs
| API / Function | File Path | Impact | Backend Change Needed? | Notes |
| --- | --- | --- | --- | --- |
| `getOrderLogsReport(date, schedules, sortBy)` | `/app/frontend/src/api/services/reportService.js` (389–491) | High | No | Add `hold` rule before `unpaid`; replace silent `paid` default with `audit`; surface `channel` (from `order_type`), `platform` (from `order_from`), `razorpayOrderId`, `isPaymentGateway` on the transformed object. Note: this function does NOT delegate to `reportFromAPI.*` transforms — it has its own inline mapping (lines 403–479). |
| `POST /api/v2/vendoremployee/report/order-logs-report` (`API_ENDPOINTS.ORDER_LOGS_REPORT`) | `/app/frontend/src/api/constants.js` (73) | None | No | Endpoint, request body, and response payload remain unchanged. CR explicitly forbids backend changes. |
| `getRunningOrders` | `/app/frontend/src/api/services/orderService.js` | None | No | Used for gap-detection running map; behavior unchanged. |
| `getSingleOrderNew` | `/app/frontend/src/api/services/reportService.js` | None | No | Drill-down side-sheet path; no behavioral change. |

## Affected Socket Events
| Socket Event | Current Usage | Impact | Backend Change Needed? | Notes |
| --- | --- | --- | --- | --- |
| (none) | Audit Report is a pure HTTP fetch with manual refresh | None | No | CR-001 makes no socket changes. |

## Affected State / Context / Store Logic
| State Area | File Path | Impact | Notes |
| --- | --- | --- | --- |
| `AllOrdersReportPage` local state — `filters` shape | `/app/frontend/src/pages/AllOrdersReportPage.jsx` (100–105, 282–305) | Medium | Add a new key for the PG tri-state (e.g., `paymentGateway`: `null` \| `'gateway'` \| `'nonGateway'`). `platform` filter is currently part of resets but never applied — wiring must be added. |
| `allOrders` / `filteredOrders` derivation | `/app/frontend/src/pages/AllOrdersReportPage.jsx` (122, 202–268) | High | A pre-filter (CS-17) must run on `allOrders` before `TAB_FILTERS` and before gap-detection input. Tab counts (140–150) and `statusBreakdown` (252–264) must be recomputed off the pre-filtered list. |
| `runningOrdersMap` / `missingOrdersList` / `missingCount` | same file (89–95, 152–188) | Medium | Input list to gap detection (line 154) must be the post-room-exclusion list (CS-18). Audit tab count must combine `missing` + `unmatched audit` orders (CS-5). Audit-tab dynamic colour must turn red on either > 0. |
| `STATUS_CONFIG` pills order/array | `/app/frontend/src/components/reports/FilterBar.jsx` (121–130) | Medium | Remove `roomTransfer`, optionally add `hold` and `audit` entries so the pills reconcile with `statusBreakdown`. |
| Restaurant / Auth / Order / Socket contexts | `/app/frontend/src/contexts/*` | None | Read-only access (`useRestaurant().restaurant.schedules`); no shared-state change. |

## Data / Payload Impact
| Field / Payload Area | Current Behavior | Required Change / Impact | Notes |
| --- | --- | --- | --- |
| Request body for `ORDER_LOGS_REPORT` | `{ sort_by, from_date, to_date }` | None | Unchanged. |
| Response field `f_order_status` (numeric) | Read into `fStatus` and used only for `=== 6` paid | New: read for `=== 9` to trigger `hold`. | Validated against `STATUS_COLUMNS` and `statusHelpers.js`. |
| Response field `payment_method` | Read into `paymentMethod`; lower-case compared in some places, not all | New: case-insensitive check for `'paylater'` to trigger `hold`. | CR EC-4 mandates `.toLowerCase()`. |
| Response field `order_type` (channel) | Currently read in some `reportFromAPI.*` transforms with partial mapping; `getOrderLogsReport`'s own inline transform does NOT read it | New: normalize `take_away → takeaway`, `delivery → delivery`, `dinein → dinein`, attach as `channel`. | OQ-F1 answered. Note `reportTransform.js` line 212 currently mis-uses `order_type === 'pos'` as platform — that is the bug CR-001 is correcting at the wiring layer for `getOrderLogsReport`. |
| Response field `order_from` (platform) | Not read anywhere in the current code | New: read and normalize to `pos` / `web`, attach as `platform`. | OQ-F2 answered (key = `order_from`). Exact case-sensitivity of values is unconfirmed — frontend will lowercase-compare per CR safety note. |
| Response field `razorpay_order_id` | Not read anywhere in `getOrderLogsReport` (verified by grep — zero matches) | New: read and surface as `razorpayOrderId`; derive `isPaymentGateway = Boolean(razorpayOrderId)`. | OQ-PG2 answered: backend already returns this. |
| Response field `order_in`, `parent_order_id` | Used in current `extractLocation` and tab filters | Now used as part of the global pre-filter. No structural change. | Room exclusion is presentation-only; payload still includes room rows. |
| Transformed object `_isMissing` flag on placeholder rows | Set in `useEffect` on Audit tab | Preserved. Audit tab now also includes real `status === 'audit'` rows. | CS-4 + EC-7. |
| Transformed object `status` enum | `'paid' \| 'cancelled' \| 'merged' \| 'credit' \| 'transferred' \| 'unpaid'` (silent paid default) | New values: `'hold'`, `'audit'`. Removal of silent `paid` default. | `'transferred'` value remains derivable but no tab consumes it after CS-19/CS-20; preserve for status backward-compat or remove? — see clarification Q-A. |

## Admin / Settings Impact
- Impact: No
- Existing setting involved: None
- New setting likely required: None (CR-001 is not gated by a restaurant-level toggle).
- Notes: No change to localStorage keys, status-config visibility lists, or device-local settings.

## Order Type / Channel Impact
| Order Type / Channel | Impact | Notes |
| --- | --- | --- |
| Dine-in | Yes | Becomes a first-class Channel filter value (`dinein`). Status derivation rules unchanged for dine-in flows. |
| Takeaway | Yes | New first-class Channel filter value (`takeaway`), mapped from `order_type === 'take_away'`. |
| Delivery | Yes | New first-class Channel filter value (`delivery`). EC for paylater on delivery still unconfirmed (CR Affected Order Types section). |
| Room (RM / SRM) | Yes (excluded) | Globally filtered out of the Audit Report (CS-16 → CS-22). Room flow itself untouched; rows still arrive in payload. CR-004 will surface them. |
| Scan & Order | Not confirmed | Not addressed by CR-001. No code path identified that distinguishes Scan & Order separately in `getOrderLogsReport`. |
| Aggregator (Zomato / Swiggy) | Yes (filter only) | Aggregator tab-routing logic unchanged. Channel filter list **conflicts internally** in CR — see clarification Q-B. Status derivation for aggregator rows still falls through current rules (unpaid/paid), per existing EC-6. |
| Other (Bar / Spa) | Not confirmed | No specific handling in the CR. Treated as `audit` if no rule matches (which is the new desired behavior). |

## Printing / KOT / Bill Impact
- Impact: No
- Files/flows affected: None
- Notes: CR-001 does not touch `OrderEntry.jsx`, `CollectPaymentPanel.jsx`, `orderTransform.js` payment/print builders, or any KOT/print path. Acceptance Criterion #12 explicitly forbids socket/payload change.

## Reporting / Analytics Impact
- Impact: Yes (positive — bucketing accuracy)
- Files/flows affected: `AllOrdersReportPage.jsx` (`statusBreakdown`), `OrderTable.jsx` (badges), `FilterBar.jsx` (pills), CSV/PDF exports inherit corrected classification.
- Notes:
  - Hold rows that were double-counted (Hold tab AND Unpaid tab) move to Hold only. Unpaid tab counts will drop.
  - Audit-tab badge will turn red more often (now reflects missing IDs + unmatched orders).
  - Removing room orders shrinks the All Orders count and removes the empty Transferred tab; this is a deliberate view-scope change. Operators relying on Audit Report to spot room-billing anomalies must move to CR-004 once delivered.
  - PG filter narrows totals when used; default state preserves current totals.

## Backward Compatibility Impact
- Historical data: no migration. Re-render with corrected classification on next fetch.
- Stored values: none — frontend-only.
- API contracts: unchanged.
- localStorage: unchanged.
- Risk to other existing flows: none identified within inspected scope. The `transferred` value will still be derivable on transformed objects (rule #4 in priority chain at line 441–442), but no tab will surface it after CS-19/CS-20. Verify whether any other consumer (export, side-sheet) depends on tab presence — see clarification Q-C.

## Existing Reusable Logic
| Existing Logic | File Path | How It May Help |
| --- | --- | --- |
| `getOrderLogsReport` priority rule chain | `/app/frontend/src/api/services/reportService.js:434–447` | Same rule list extends naturally — insert hold rule before line 443; flip default at line 432/446. |
| `extractLocation` helper | `/app/frontend/src/api/transforms/reportTransform.js:107–141` | Already encodes `order_in === 'RM'/'SRM'` semantics — single source for the room-exclusion predicate (though `getOrderLogsReport` currently inlines its own copy lines 414–426). |
| `OrderTable.getStatusBadgeStyle` / `getStatusLabel` | `/app/frontend/src/components/reports/OrderTable.jsx:56–89` | `hold` already styled; `audit` is the only new entry. |
| `Select` component inside `FilterBar` | `/app/frontend/src/components/reports/FilterBar.jsx:10–79` | Already supports `disabled`, `disabledTooltip`, `placeholder`, `testId`. Re-usable for enabling Platform filter; may need a new pill/radio component for tri-state PG (current `Select` is single-value dropdown). |
| `STATUS_CONFIG` array driving pill rendering | `/app/frontend/src/components/reports/FilterBar.jsx:121–130` | Adding `hold`/`audit` and removing `roomTransfer` is a single-array edit; pill rendering loop is data-driven. |
| `runningOrdersMap` building + gap loop | `/app/frontend/src/pages/AllOrdersReportPage.jsx:132–188` | Algorithm unchanged; the only surgical change is the input list (post-room-exclusion). |
| `getBusinessDayRange` / `isWithinBusinessDay` | `/app/frontend/src/utils/businessDay.js` | Unchanged; reused. |
| `calculateSummary` | `/app/frontend/src/api/transforms/reportTransform.js:672` | Consumes filtered list — automatically reflects the room-exclusion + new filter chain. |

## Likely Files For Future Implementation
| File Path | Reason It May Be Touched | Confidence |
| --- | --- | --- |
| `/app/frontend/src/api/services/reportService.js` | Status derivation update, channel/platform/razorpay plumbing in `getOrderLogsReport` | High |
| `/app/frontend/src/pages/AllOrdersReportPage.jsx` | TAB list (remove `transferred`, add audit handling), TAB_FILTERS (`unpaid` exclusion, `audit` extension), `statusBreakdown`, room pre-filter, gap-detection input, channel/platform/PG filter wiring, audit-tab count + colour logic | High |
| `/app/frontend/src/components/reports/FilterBar.jsx` | `STATUS_FILTER_OPTIONS` (add `On Hold`, remove `transferred`), `CHANNEL_OPTIONS` (rebuild), `PLATFORM_OPTIONS` (enable), `STATUS_CONFIG` (remove `roomTransfer`, add `hold`/`audit` if pills added), new tri-state PG control + JSX | High |
| `/app/frontend/src/components/reports/OrderTable.jsx` | `getStatusBadgeStyle` and `getStatusLabel` (add `audit`) | High |
| `/app/frontend/src/components/reports/FilterTags.jsx` | New label rows for `platform` and `paymentGateway`; consume updated `CHANNEL_OPTIONS` | Medium |
| `/app/frontend/src/components/reports/ExportButtons.jsx` | Verify exports inherit filtered list correctly with new filters; no header changes per CR | Low |
| `/app/frontend/src/api/transforms/reportTransform.js` | Optional: align `paidOrder.platform`, `cancelledOrder.platform`, `dailySalesOrder.platform` mappings to `order_from` if scope expands beyond `getOrderLogsReport`; current CR scope only requires the `getOrderLogsReport` path | Low / Optional |
| `/app/frontend/src/api/transforms/__tests__/*` (existing tests) | Re-run / update if any test asserts the silent-`paid` fallback or the current `Transferred` tab contents | Low (verify) |

## Risks
| Risk | Severity | Notes / Mitigation Needed |
| --- | --- | --- |
| Hotspot edit in `reportService.js` (Rule FA-03 / IMPLEMENTATION_AGENT_RULES) | High | Narrow scope to `getOrderLogsReport` priority chain + new field reads. Do not refactor adjacent functions; CR-002 owns unification. |
| Tab-count reconciliation drift after audit + hold + room exclusion | High | All-tab `counts['all']` formula at line 187 currently `data.orders.length + missing`. Must become `<post-exclusion data>.length + missing` to preserve the AC #9 reconcile rule. Easy to miss. |
| Removing `Transferred` tab and deleting rule #4 (Q-A resolved) | Low | Resolved by Q-A → delete rule #4. Verify no other consumer (export columns, side-sheet, status badge in non-room contexts) reads `status === 'transferred'`. Inspected files show no such consumer. |
| Platform value missing on legacy rows (Q-D + Q-F resolved) | Low | Resolved by Q-D (include rows with missing platform when filter active) and Q-F (hide Platform filter entirely if `order_from` is not consistently returned). Implementation must add a presence check on response data to decide whether to render the Platform dropdown. |
| Channel filter list internal contradiction in CR (Q-B resolved) | Resolved | Final list locked to `[Dine-in, Takeaway, Delivery]`. CS-11/OQ-F4 overridden by Q-B. |
| Aggregator orders in Channel filter — interaction with existing Aggregator tab (Q-C resolved) | Resolved | Aggregator out of CR-001 scope. Existing `Aggregator` tab and `TAB_FILTERS.aggregator` (`order_in ∈ {zomato, swiggy}`) untouched. |
| Audit-tab indicator colour/emptiness | Low | Currently green when `missingCount === 0`. New behavior must keep green only when `missing + unmatched === 0`. Validate with empty-list edge case. |
| Side-sheet drill-down on `_isMissing` placeholders vs new `audit` real orders | Low | Real orders have valid `id` so `getSingleOrderNew` works. Placeholder rows are unchanged. Verify `OrderDetailSheet` does not crash on `status === 'audit'` (no expected branch dependency). |
| CSV/PDF export shape unchanged but content shifts | Low | Acceptance Criterion #11 covers this. No headers added, but row counts move between buckets. |
| Razorpay-only assumption (OQ-PG4) | Low | CR notes other gateways may exist; if so, `isPaymentGateway` will under-count. Documented assumption; non-blocking for v1. |
| Room exclusion before CR-004 ships | Medium | Operators lose the (incorrect, mixed) room visibility in Audit Report before the new PMS view exists. Acceptable per CR (room data still in payload), but timing risk if CR-004 slips. |
| `paymentMethod` empty/undefined edge | Low | Existing line 435 already handles empty string. Hold rule must guard with `?.toLowerCase()`. |

## Dependencies
| Dependency | Owner | Required Before Planning? | Notes |
| --- | --- | --- | --- |
| Backend confirmation that `order_from` field exists on `ORDER_LOGS_REPORT` payload with values `pos` / `web` | Backend | Yes (recommended) | OQ-F2 answered with field name; values reported as `pos` / `web` but exact case + presence on every row not verified by code inspection (field is not currently read anywhere in the frontend). Implementation will fail-soft if missing, but a quick backend payload verification avoids a wasted iteration. |
| Backend confirmation that `razorpay_order_id` is present consistently for gateway orders | Backend | No (OQ-PG2 answered) | User confirmed backend already returns it. Frontend will treat empty/null/missing as Non-Gateway. |
| CR-004 timeline | Product | No (non-blocking) | Operators lose mixed-room visibility in Audit Report once CR-001 ships. Plan rollout coordination if CR-004 not yet ready. |
| OQ-Room-1 final answer (delete `Transferred` tab placeholder vs keep empty) | User | No (recommended default = delete) | CR User Decisions row 251 says "Confirmed (recommendation to proceed)"; treating as approved-to-delete unless user overrides. |
| OQ-Room-2 (`is_room_order` backend flag) | Backend | No (nice-to-have) | Frontend can derive from `order_in` + `payment_method` per CS-16. |
| OQ-PG1 (PG filter label text) | User | No (default = "Payment Gateway") | Cosmetic. |
| OQ-PG4 (other gateways than Razorpay) | Product / Backend | No | Documented assumption: Razorpay-only for v1. |

## Confirmed Decisions From Clarification Round (rev-1, 2026-04-28)
The following decisions are now frozen for this impact analysis. They override the corresponding ambiguities in the source CR text where applicable.

1. **Transferred status rule deleted.** Priority rule #4 in `getOrderLogsReport` (`if paymentMethod === 'ROOM' || orderIn === 'SRM' → 'transferred'`) is removed in full. The `'transferred'` status value is no longer derived. No dead-code path retained. (Q-A → option i)
2. **Channel filter list is `[Dine-in, Takeaway, Delivery]`** — exactly three values. No `Room`, no `Aggregator`. CS-20 wins; CS-11 and OQ-F4 wording in the source CR are overridden. (Q-B + Q-C)
3. **Aggregator is out of CR-001 scope.** The existing `Aggregator` tab and its existing `order_in ∈ {zomato, swiggy}` routing remain unchanged. No Channel filter integration. Aggregator-related work (badge, filter integration, status) stays deferred. (Q-C)
4. **Platform filter is permissive on missing data.** Rows with missing/null `order_from` are included in results regardless of which Platform value (POS / Web) is selected. (Q-D)
5. **Status Breakdown pills (`STATUS_CONFIG`):** only `Rm` (`roomTransfer`) is removed. **No new `Hold` or `Audit` pills are added.** Counts for `hold` and `audit` are still carried in `statusBreakdown` state per CS-6 but are not visualized as pills. (Q-E)
6. **Platform filter graceful-degradation:** if backend `ORDER_LOGS_REPORT` does not consistently return `order_from`, the Platform filter dropdown is **hidden entirely** (not just disabled). Implementation must include a presence check on the response data. (Q-F)
7. **PG filter UX:** rendered as three inline pill/radio buttons (`[ All ] [ Gateway ] [ Non-Gateway ]`) in the filter bar, current selection visually highlighted. Not a Select dropdown. (Q-G)

## Clarification Questions
| Question | Why It Matters | Status | User Answer |
| --- | --- | --- | --- |
| **Q-A** Should the `'transferred'` value still be returned by `getOrderLogsReport` after CS-19 removes the `Transferred` tab? | Without resolution, AC #19 (no room order in any tab) and AC #4 (audit catch-all) may conflict for room orders that survive due to the CS-16 pre-filter not catching them. | Answered | **(i) Delete rule #4** — remove `if (paymentMethod === 'ROOM' \|\| orderIn === 'SRM') → 'transferred'` from the priority chain in `getOrderLogsReport`. Room orders are caught by the CS-16 pre-filter; `'transferred'` value is no longer derived. |
| **Q-B** Final canonical `CHANNEL_OPTIONS` list. | CS-11 and CS-20 disagreed inside the same CR. | Answered | **`[Dine-in, Takeaway, Delivery]`** — no `Aggregator`, no `Room`. CS-20 wins; CS-11 is overridden. OQ-F4 in the source CR is overridden by this answer. |
| **Q-C** When `Channel === 'aggregator'` is selected, should it match by `order_in ∈ {zomato, swiggy}` or by `order_type === 'aggregator'`? | OQ-F1 listed no `aggregator` value for `order_type`. | Answered | **N/A — Aggregator is OUT OF SCOPE for CR-001.** The existing `Aggregator` tab and its existing routing (`order_in ∈ {zomato, swiggy}` per `TAB_FILTERS.aggregator`) stay untouched. The Channel filter does NOT contain `Aggregator`. Aggregator-specific work is deferred to a future phase. |
| **Q-D** When `platform` field is missing/null on an order and the user selects a Platform filter (POS or Web), should that order be excluded, included, or only shown when "All" is selected? | AC #18 left this "TBD". | Answered | **Include all** — rows with missing/null `order_from` are shown regardless of which Platform value is selected (permissive on missing data). Platform filter is non-strict. |
| **Q-E** Should `STATUS_CONFIG` (the All-tab pill bar) gain explicit `hold` and `audit` pills, in addition to `statusBreakdown` carrying the counts (CS-6)? | Without pill entries, counts exist in state but don't render in the breakdown bar. | Answered | **(b) No new pills.** `Rm` (`roomTransfer`) is removed from `STATUS_CONFIG` per CS-21. **Do NOT add Hold or Audit pills** to the breakdown bar. `statusBreakdown` will still carry the counts in state per CS-6, but the visual pill bar stays minimal beyond removing `Rm`. (`On Hold` is added only to the Status DROPDOWN filter per CS-10.) |
| **Q-F** Backend confirmation: does `ORDER_LOGS_REPORT` consistently return `order_from`? | Frontend has never read this field. | Answered | **Graceful degradation: if `order_from` is not consistently returned, hide the Platform filter entirely.** When backend data is missing, the Platform dropdown is not rendered (no "Coming soon" tooltip — fully hidden). |
| **Q-G** Is the new PG control rendered as three pill/radio buttons or as a Select-style dropdown? | UX consistency vs CS-23 directive. | Answered | **(a) Inline pill/radio** — three buttons sitting next to each other in the filter bar (`[ All ] [ Gateway ] [ Non-Gateway ]`), current selection highlighted. Matches CS-23 wording. |

## Docs vs Code Mismatches
| Topic | Docs Say | Code Shows | Impact |
| --- | --- | --- | --- |
| Channel/Platform mapping in `reportTransform.js` | CR-001 CS-13 says channel = `order_type` (`take_away/delivery/dinein`) and platform = `order_from`. | `reportTransform.js:209–213, 397–401` currently maps `order_type === 'pos'` to `platform = 'pos'` (mixing the two). The bug is real and is what CS-13 intends to fix. | Frontend has internalized the wrong mapping in transforms not used by `getOrderLogsReport`. CR-001 only fixes `getOrderLogsReport`'s inline transform, so the buggy mapping in `reportFromAPI.paidOrder/cancelledOrder/dailySalesOrder` will remain unless the implementer extends scope. Flag as a follow-on (CR-002 candidate). |
| `getOrderLogsReport` priority chain location | CR text references "lines ~389–491" and "lines ~428–447". | Code matches: function at 389–491, priority rules at 432–447. | None — references accurate. |
| `TAB_FILTERS.unpaid` lacks `paylater` exclusion | CR text: "current `unpaid` filter does NOT exclude paylater". | `AllOrdersReportPage.jsx:55–61` confirms — only excludes Cancel/Merge. | None — confirms CR analysis. |
| Audit-tab filter scope | CR text: "currently only missing-order-ID placeholders". | `AllOrdersReportPage.jsx:69` confirms `audit: (o) => o._isMissing === true`. | None — confirms CR analysis. |
| `STATUS_FILTER_OPTIONS` content | CR text: missing `On Hold`. | `FilterBar.jsx:84–91` confirms — has `paid/cancelled/merged/credit/unpaid/transferred`, no hold. | None — confirms CR analysis. Note: also has `transferred` which CS-19 removes (CR adds this consequence). |
| `CHANNEL_OPTIONS` content | CR text v1: "current list `[dinein, room]`". | `FilterBar.jsx:105–108` confirms `[dinein, room]`. | None — confirms CR analysis. |
| `PLATFORM_OPTIONS` disabled state | CR text: "`disabled={true}` and `disabledTooltip='Coming soon'`". | `FilterBar.jsx:185–193` confirms. | None — confirms CR analysis. |
| `razorpay_order_id` plumbing | CR text: not currently surfaced. | `grep` across frontend shows zero references to `razorpay`. | None — confirms CR analysis; net-new plumbing required. |
| Reporting ownership (OD-01 / OQ-07) | Architecture rule MC-06: backend owns aggregation; frontend = presentation. | CR-001 is presentation/normalization only — does not move aggregation to frontend. | None — CR is compliant with OD-01. No re-verification trigger. |
| Room billing/print lifecycle (OD-02 / OQ-12) | Deferred. Preserve current behavior. | CR-001 only filters out room orders from a presentation surface. Does not touch room billing, print, or transforms. | None — CR is compliant with OD-02. CR-004 must trigger OD-02 reconsideration when picked up. |

## Impact Conclusion
CR-001 is a frontend-only, presentation-layer change with one architectural hotspot (`reportService.js::getOrderLogsReport`). It has no backend, socket, payment, print, room-billing, or localStorage impact. The change set decomposes cleanly into five independent edit groups (status derivation, tab filters, filter bar, room exclusion, PG filter) and reuses existing helpers and components. Hotspot rule FA-03 applies — edits must remain narrow. All seven open questions (Q-A → Q-G) have been answered in rev-1 and are frozen under "Confirmed Decisions From Clarification Round". No remaining blockers.

## Ready For Implementation Planning?
- Yes — all clarifications resolved; status `impact_ready_for_approval` pending explicit user approval to advance to `impact_approved_for_planning`.

## Next Agent
- Change Request Implementation Planning Agent (only after impact analysis is approved).
