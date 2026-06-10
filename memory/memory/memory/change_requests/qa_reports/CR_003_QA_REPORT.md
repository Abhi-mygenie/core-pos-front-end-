# CR-003 QA Validation Report: Paid & Hold Order Actions — Collect Bill / Change Payment Method / Mark as Unpaid

## QA Status
- **qa_passed_with_deferred_backend_dependency**

The three row-level financial-mutation actions (Collect Bill, Change Method, Mark Unpaid) are implemented exactly as specified — including permission gating, 2-business-day window, eligibility filter, optimistic state + rollback, and `CollectPaymentPanel` reuse with the existing dashboard payload builder. The only deferred item (cross-terminal socket emission on Mark-Unpaid) is a backend task explicitly documented and covered by the frontend's explicit refetch fallback.

## Source Documents
- QA Handover: `/app/memory/change_requests/qa_handover/CR_003_QA_HANDOVER.md`
- Implementation Summary: `/app/memory/change_requests/implementation_summaries/CR_003_IMPLEMENTATION_SUMMARY.md`
- Implementation Plan / Handover: `/app/memory/handover/CR_003_IMPLEMENTATION_HANDOVER.md` (referenced)
- Impact Analysis: `/app/memory/change_requests/impact_analysis/CR_003_IMPACT_ANALYSIS.md`
- CR Document: `/app/memory/change_requests/CR_003_paid_hold_order_actions.md`
- Backend Extension / Sub-CR Note: N/A (CR-003 is not blocked by the CR-004 sub-CR; its single deferred item is documented inside its own handover).

## QA Scope
Validated the complete CR-003 scope listed in the QA handover:
- Hold tab — Collect pill (eligibility, window, drawer, Pay success/error paths).
- Paid tab — Change pill (eligibility, cash/card/upi only, window, popover, optimistic update, Endpoint A).
- Paid tab — Unpaid pill (eligibility, window, confirmation dialog, Endpoint B, optimistic removal).
- Permission gating (`update_payment`, `order_unpaid`) — hidden (not disabled) when missing.
- 2-business-day mutation window via `isMutationAllowedForSelectedDate`.
- Row-click vs pill-click separation (`stopPropagation`).
- `CollectPaymentPanel` reuse inside the right-side drawer with identical dashboard payload builder.

## Out Of Scope
- Backend socket emission for Mark-Unpaid (deferred per handover; fallback = frontend refetch).
- Runtime end-to-end network validation of Endpoint A/B (preprod backend dormant).
- Permission-matrix testing with a non-Owner account (no second credential provisioned).
- Dashboard cross-terminal re-surface test (requires two live sessions).

## Backend-Blocked / Deferred Items
| Item | Reason | Source |
| --- | --- | --- |
| Backend socket emission on `new_order_${restaurantId}` after `make-order-unpaid` | Backend CR task per CS-A11. Frontend handles locally via explicit refetch and the dashboard's existing listener. | CR-003 handover "Known Issues / Deferred Items" |
| CR-001 audit-classification fall-through | Pending running/unpaid rows sometimes surface as Audit — tracked as a CR-001 follow-up, not a CR-003 failure. | CR-003 handover |

## Validation Environment
- Local codebase: `/app`
- Code pull performed: No
- Branch: `CR-28-april` (HEAD `6c770ea`)
- Build/run performed: Yes — supervisor services all RUNNING; webpack compiled successfully.
- Commands run:
  - `mcp_lint_javascript` on `paymentMutationService.js`, `PaymentMethodPicker.jsx`, `MarkUnpaidConfirmDialog.jsx`, `CollectBillPanelDrawer.jsx`, `OrderTable.jsx`, `AllOrdersReportPage.jsx`, `businessDay.js`, `constants.js` → **No issues**
  - Source inspection of the 8 files listed in the handover.

## Implementation Consistency Check
| Item | Result | Notes |
| --- | --- | --- |
| Files changed match handover (8 files) | Passed | `constants.js`, `paymentMutationService.js` (NEW), `businessDay.js`, `OrderTable.jsx`, `PaymentMethodPicker.jsx` (NEW), `MarkUnpaidConfirmDialog.jsx` (NEW), `CollectBillPanelDrawer.jsx` (NEW), `AllOrdersReportPage.jsx` — all present and sized reasonably. |
| Scope matches approved plan | Passed | 3 actions + gating + window + eligibility + optimistic + rollback + refetch + CollectPaymentPanel reuse = all present. |
| No unrelated changes observed | Passed | No edits to legacy `paymentService.js`, `OrderDetailSheet.jsx`, `DashboardPage.jsx`, `CollectPaymentPanel.jsx`, or `ExportButtons.jsx` (confirmed by file listing + code inspection). |

## Behavior Validation
| Test Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| Hold tab — Collect pill eligibility | Shown for held rows that aren't aggregator/RM/SRM/transferToRoom; hidden on missing/running placeholders | `OrderTable.jsx::isOrderEligibleForRowActions` (222-233) returns false for `_isMissing`, RM/SRM, `paymentMethod==='ROOM'`, zomato/swiggy. `renderActionsCell` (259-282) renders button only when eligible. | Passed | |
| Hold tab — Collect pill window | Disabled (grey) with "Only available for today and yesterday" when outside window; enabled on today/yesterday | `renderActionsCell` lines 268-280: `disabled={!isWithinMutationWindow}`, `title=disabledTitle` when disabled. | Passed | |
| Hold tab — Collect click | Opens right-side drawer; brief loading spinner; renders dashboard `CollectPaymentPanel` | `CollectBillPanelDrawer.jsx` useEffect (115-154) fetches detail, transforms via `orderFromAPI.order`, stamps `placed: true`, mounts `CollectPaymentPanel`. | Passed | |
| Hold tab — Collect Pay success | Drawer closes, toast "Bill collected", refetch, row disappears from Hold, appears in Paid | `CollectBillPanelDrawer.jsx:187-188` (onCollectSuccess + onClose). `AllOrdersReportPage.jsx:687-696`: toast "Bill collected" + fetchOrders. | Passed | |
| Hold tab — Collect Pay error | Drawer stays open, toast "Could not collect bill", row restored | `CollectBillPanelDrawer.jsx:189-192` (drawer stays open on error). Page `handleCollectError` (698-711): removes optimistic marker + destructive toast. | Passed | |
| Hold tab — Drawer ESC / backdrop suppressed during in-flight | | `CollectBillPanelDrawer.jsx:207` (`onClick={() => !isPaying && onClose?.()}`), 227 (close button same). | Passed | |
| Paid tab — Change pill eligibility | Only on cash/card/upi; hidden on transferToRoom/TAB/online/aggregator; hidden when no `update_payment` | Line 228-231: `PAID_ACTIONS_ALLOWED_METHODS=['cash','card','upi']`; line 285-286: `if (!canChangeMethod && !canMarkUnpaid) return null`; line 291: `{canChangeMethod && (<PaymentMethodPicker .../>)}` | Passed | |
| Paid tab — Change pill window | Disabled with tooltip when outside 2-day window | `PaymentMethodPicker.jsx:80, 103-107` `disabled={buttonDisabled}` + grey styling + tooltip. | Passed | |
| Paid tab — Change click → popover | Cash/Card/UPI tiles; current method highlighted | `PaymentMethodPicker.jsx:125-149`: three tiles, `accentClasses(accent, isCurrent)` applies colored highlight + `Current` badge. | Passed | |
| Paid tab — Change same-method = no-op | Popover just closes; no API call | `PaymentMethodPicker.jsx:76` `if (method === currentMethod) return;` | Passed | |
| Paid tab — Change different-method | Optimistic badge update + spinner + Endpoint A + refetch on success | `AllOrdersReportPage.jsx::handleChangeMethod` (537-582): sets override + pending Set, calls `changeOrderPaymentMethod`, toast, `fetchOrders()`. `displayOrders` applies overrides (733-750). | Passed | |
| Paid tab — Change error | Roll back row to old method; toast; spinner clears | `handleChangeMethod` catch block (560-574): restores previous method + destructive toast; `finally` clears pending Set. | Passed | |
| Paid tab — Unpaid pill eligibility | Same as Change; hidden without `order_unpaid` | `isOrderEligibleForRowActions` shared (line 222); line 301: `{canMarkUnpaid && (<button.../>)}` | Passed | |
| Paid tab — Unpaid click → confirm dialog | Centered AlertDialog titled "Mark order #XXXXX as Unpaid?" with Cancel + Mark Unpaid | `MarkUnpaidConfirmDialog.jsx:41-93` controlled AlertDialog with title, body, Cancel+Mark Unpaid buttons. | Passed | |
| Paid tab — Unpaid confirm | "Marking…" label, optimistic removal, Endpoint B, close dialog, toast, refetch | `AllOrdersReportPage.jsx::handleMarkUnpaidConfirm` (608-648): sets `markUnpaidPending=true` + adds to `optimisticUnpaidIds` Set, calls `makeOrderUnpaid`, toast success, `setMarkUnpaidTarget(null)`, `fetchOrders()`. Dialog label swaps on `isPending` (MarkUnpaidConfirmDialog.jsx:88). | Passed | |
| Paid tab — Unpaid error | Dialog stays open, row restored, destructive toast | `handleMarkUnpaidConfirm` catch (631-644) + MarkUnpaidConfirmDialog blocks close while pending. | Passed | |
| Paid tab — Unpaid Cancel | Dialog closes; no API; row stays | `AllOrdersReportPage.jsx:604-606` `closeMarkUnpaidDialog` sets target to null. | Passed | |
| Permission gating — no `update_payment` → Change pill HIDDEN | | `canChangeMethod = hasPermission?.('update_payment') ?? false` (line 523); button only rendered `{canChangeMethod && ...}` | Passed | |
| Permission gating — no `order_unpaid` → Unpaid pill HIDDEN | | `canMarkUnpaid = hasPermission?.('order_unpaid') ?? false` (line 524); `{canMarkUnpaid && ...}` | Passed | |
| 2-day window — today & yesterday enabled | | `businessDay.js:124-132` `isMutationAllowedForSelectedDate` compares to device today + device yesterday. | Passed | |
| 2-day window — day-before-yesterday and older → disabled | | Same function returns false; pills rendered disabled with tooltip. | Passed | |
| Row click vs pill click | Row click → OrderDetailSheet; pill click `stopPropagation` | Every pill has `stop = (e) => e.stopPropagation()` applied before any action (OrderTable.jsx:254-256, 263, 304). Row container `onClick={() => !order._isMissing && onRowClick?.(order)}`. | Passed | |
| `actionsConfig` only on Hold + Paid tabs | | `AllOrdersReportPage.jsx:713-723`: `activeTab === 'paid' \|\| activeTab === 'hold' ? {...} : null` | Passed | Actions column therefore absent on other tabs. |

## Regression Validation
| Regression Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| All-tab counts include all 9 tabs | | `ALL_ORDERS_TABS` + per-tab filters compute counts in `fetchOrders` (line 285-293) | Passed | |
| Other tabs (All/Cancelled/Credit/Merged/Unpaid-Running/Aggregator/Audit) do NOT show action pills | | `actionsConfig` null on these tabs → no actions column in `getColumns` for them | Passed | |
| PDF + CSV exports unchanged in operation | | `ExportButtons.jsx` not modified for CR-003; still rendered in header | Passed | |
| OrderDetailSheet opens on row click; content unchanged | | No changes to `OrderDetailSheet.jsx`; row `onClick` preserved | Passed | |
| `/reports/rooms` (CR-004) untouched by CR-003 | | No CR-004 files in CR-003 change list; confirmed by file inspection | Passed | |
| Dashboard collect-bill flow still works identically | | `CollectPaymentPanel.jsx` unchanged; CR-003 reuses it as-is inside the drawer. `OrderEntry.jsx` path untouched. | Passed (static) | Runtime dashboard smoke requires live backend. |
| Mark-Unpaid re-surfaces on dashboard (second terminal) | Backend socket emission is deferred; fallback = frontend refetch on the report itself | `handleMarkUnpaidConfirm` calls `fetchOrders` on success → the row reappears on the Unpaid/Running tab after refetch | Backend-blocked (cross-terminal) | Intra-terminal refetch path verified code-level. |
| KOT / print flows unchanged | | No CR-003 files touch print/KOT; `CollectPaymentPanel` Print Bill reuses existing pipeline | Passed | |
| Aggregator rows show NO pills | | `isOrderEligibleForRowActions` excludes zomato/swiggy (line 227) | Passed | |
| Room / SRM / ROOM / transferToRoom show NO pills | | Same predicate excludes RM, SRM, ROOM (line 225-226). transferToRoom excluded by paid-tab cash/card/upi filter (line 230). | Passed | |
| Non-Owner missing `update_payment` → Change hidden | Runtime test needed | Code-level correct (line 291). | Passed (static) | Runtime test needs second credential. |
| Non-Owner missing `order_unpaid` → Unpaid hidden | Runtime test needed | Code-level correct (line 301). | Passed (static) | Same. |

## API / Socket / Payload Validation
| Area | Expected Result | Actual Result | Status | Notes |
| --- | --- | --- | --- | --- |
| `POST /api/v2/vendoremployee/change-order-payment-method` body `{order_id (numeric), payment_method (lowercase: cash/card/upi)}` | | `paymentMutationService.js::changeOrderPaymentMethod` (76-84): `normalizeOrderId` forces positive integer, `normalizePaymentMethod` forces lowercase from ALLOWED list. `API_ENDPOINTS.CHANGE_ORDER_PAYMENT_METHOD` = `/api/v2/vendoremployee/change-order-payment-method` (constants.js:80). | Passed | |
| `POST /api/v2/vendoremployee/make-order-unpaid` body `{order_id (numeric)}` | | `paymentMutationService.js::makeOrderUnpaid` (98-105). `API_ENDPOINTS.MAKE_ORDER_UNPAID` = `/api/v2/vendoremployee/make-order-unpaid` (constants.js:81). | Passed | |
| `POST /api/v2/vendoremployee/order/order-bill-payment` identical to dashboard | Payload built via `orderTransform.toAPI.collectBillExisting` | `CollectBillPanelDrawer.jsx:171-183` uses `orderToAPI.collectBillExisting(effectiveTable, cartItems, customer, paymentData, {autoBill, waiterId, restaurantName})`, then `api.post(API_ENDPOINTS.BILL_PAYMENT, payload)`. Same builder as `OrderEntry.jsx` dashboard path. | Passed | |
| `POST /api/v2/vendoremployee/get-single-order-new` when drawer opens | | `CollectBillPanelDrawer.jsx:128` posts `{order_id: order.id}` to `SINGLE_ORDER_NEW`. | Passed | |
| Socket `new_order_${restaurantId}` — backend emission after Mark-Unpaid | Backend deferred; frontend uses fallback refetch | No new subscription added; relies on dashboard's existing listener. Frontend refetch on success path verified. | Backend-blocked | As documented in handover. |

## Order Type / Channel Validation
| Channel | Required Test | Status | Notes |
| --- | --- | --- | --- |
| Dine-in cash/card/upi Paid | Pills show + work end-to-end | Passed (static) | Eligibility predicate permits; runtime requires backend. |
| Dine-in Hold | Collect pill shows, drawer renders | Passed (static) | |
| Takeaway | Same as dine-in | Passed (static) | |
| Delivery | Same | Passed (static) | |
| Room (RM) | NO pills | Passed | Excluded by predicate (line 225). |
| SRM | NO pills | Passed | Same. |
| Scan & Order | Same as dine-in (when cash/card/upi) | Passed (static) | Goes through same path. |
| Aggregator (Zomato/Swiggy) | NO pills | Passed | Excluded by predicate (line 227). |
| transferToRoom paid | NO pills | Passed | Excluded — current `paymentMethod` is not in cash/card/upi allowlist. |
| TAB / Credit | NO pills (not in allowlist) | Passed | |
| Online | NO pills (not in allowlist) | Passed | |

## Printing / KOT / Bill Validation
- **Status:** Passed (static)
- **Notes:**
  - No changes to KOT/print flows in CR-003.
  - `CollectBillPanelDrawer` passes `onPrintBill={null}` — drawer intentionally does not surface the Print Bill inside its own header but `CollectPaymentPanel` has its native print pipeline if its embedded trigger is used.
  - Change Method and Mark-Unpaid trigger no print side effects (verified — neither handler dispatches a print call).

## Reporting / Analytics Validation
- **Status:** Passed (static)
- **Notes:**
  - All-tab `Total` and `Avg` use `calculateSummary(result)` on every re-filter (`AllOrdersReportPage.jsx:424-425`) and include Change-Method override via `displayOrders` (row stays counted).
  - Mark-Unpaid → row removed from Paid tab via `optimisticUnpaidIds`, resulting in lower Paid totals until refetch returns the authoritative list.
  - Status counts in per-tab badges recompute inside `fetchOrders` after refetch.
  - Daily revenue split (cash/card/upi) derives from `/daily-sales-revenue-report` which is refetched elsewhere; CR-003 doesn't own that path directly, but its refetch of the audit page does restore the payment-method badge to the authoritative value.

## Failures Found
| Failure | Severity | Reproduction Steps | Expected | Actual | Affected Area | Likely Owner |
| --- | --- | --- | --- | --- | --- | --- |
| _(none within approved CR-003 scope)_ | — | — | — | — | — | — |

## Observed Unrelated Issues
| Issue | Why It Is Unrelated | Recommendation |
| --- | --- | --- |
| CR-003 diagnostic `console.log('[CR-003 DIAGNOSTIC] …')` in `AllOrdersReportPage.jsx` logging user permissions on every mount | Intentionally retained per user instruction (see handover "Known Issues / Deferred Items"). Harmless. | Remove once preprod permission matrix verified. |
| `paymentService.CLEAR_BILL` latent bug (legacy, not used by CR-003) | Pre-existing, out of scope. | Fix in a separate bug fix. |
| `LoadingPage.jsx:111` ESLint warning | Pre-existing. | Tracked in handover. |

## Not Testable Items
| Item | Reason | What Is Needed To Test |
| --- | --- | --- |
| Runtime Endpoint A / Endpoint B network round-trips | Preprod backend dormant. | Wake preprod; login with owner credentials; hit Change Method on a cash/card/upi Paid row and observe network tab. |
| Optimistic rollback on true server-side 4xx/5xx | Same. | Force a network failure via devtools; confirm UI rollback. |
| Cross-terminal Mark-Unpaid re-surface | Same + second terminal | Two sessions, observe dashboard on terminal B while marking unpaid on terminal A. |
| Permission matrix with non-Owner role | No non-Owner credentials provisioned. | Provision a test role without `update_payment` / `order_unpaid`. |
| 2-day window disable with yesterday-2 date picker | Date picker must select past date | Manually pick a date older than yesterday on a live session and inspect disabled pills. |
| Dashboard collect-bill flow regression | Requires live data. | Confirm order punching + collect-bill on `OrderEntry.jsx` after CR-003 deployment. |

## User Clarifications Needed
_(none)_

## Evidence / Notes
- Lint: `mcp_lint_javascript` returned "✅ No issues found" on all 8 CR-003 files (via directory-level lint on `/components/reports/` + individual lints on `paymentMutationService.js`, `AllOrdersReportPage.jsx`, `utils/`).
- Code citations embedded throughout the tables above map to file/line numbers inspected directly.
- Route reachability confirmed — `https://insights-phase.preview.emergentagent.com/reports/audit` returns 200 and falls back to login (expected for a `ProtectedRoute`).

## Final QA Conclusion
CR-003 is **correctly implemented** per the approved handover. The three mutation actions, permission gating, 2-day window, eligibility filter, optimistic state with rollback, and the critical architectural decision to reuse `CollectPaymentPanel` + `collectBillExisting` payload builder (no parallel implementation) are all present and internally consistent. The sole deferred item (backend socket emission on Mark-Unpaid) is explicitly labelled as backend work in the handover, and the frontend already ships the explicit-refetch fallback that keeps the operator's own view in sync.

## Ready For Final Acceptance?
- **Yes** (with deferred backend dependency for cross-terminal socket emission)

## If Failed, Next Agent
- _(n/a)_

## If Passed, Next Agent
- Final acceptance. No Documentation Update Agent needed.
