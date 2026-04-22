# OPEN_QUESTIONS_DECISION_STATUS_SUMMARY

> Validation note (2026-04-19): reviewed against current codebase at `main` / `b1ebb9e`.
> Statuses below include both decision-log state and code-validation state; some previously parked/open items are now code-answerable.

Status categories used:
- Frozen
- Covered
- Partial
- Parked
- Open
- Skipped

## Frozen

| Question ID | Topic | Decision assistant status | Notes |
|---|---|---|---|
| OQ-001 | Canonical rounding rule for order totals | Frozen | AD-001 |
| OQ-002 | When should orders be REMOVED vs UPDATED on socket events? | Frozen | AD-002 |
| OQ-003 | What counts as a "Walk-In" order? | Frozen | AD-003 |
| OQ-006 | What is `def_ord_status` / `defaultOrderStatus`'s business rule? | Frozen | AD-006 |
| OQ-007 | Which orderStatus counts as "terminal"? | Frozen | AD-007 |
| OQ-008 | What is the actual role string `getOrderRoleParam` expects? | Frozen | AD-008 |
| OQ-009 | What permissions exist? | Frozen | AD-009 |
| OQ-101 | Service charge application point — pre-discount or post-discount? | Frozen | AD-101 |
| OQ-102 | What happens when a v2 data event arrives with no `payload.orders`? | Frozen | AD-102 |
| OQ-103 | `update-item-status` vs `update-food-status` — which authoritative? | Frozen | AD-103 |
| OQ-105 | Bill print `gst_tax` discount-adjusted mismatch | Frozen | AD-105 |
| OQ-106 | Is the `update_table` channel still used, or was it removed? | Frozen | AD-106 |
| OQ-107 | How does the WebSocket authenticate? | Frozen | AD-107 |
| OQ-108 | How are engage locks recovered on disconnect? | Frozen | AD-108 |
| OQ-201 | Which toast system is canonical: shadcn Toaster or Sonner? | Frozen | AD-201 |
| OQ-202 | Expected shape of `place-order` response for `order_id` capture | Frozen | AD-202 |
| OQ-204 | Are the `src/data/mock*` files used at runtime or only in tests? | Frozen | AD-204 |
| OQ-206 | Do any flows still use legacy `handleUpdateOrder`? | Frozen | AD-206 |
| OQ-302 | Who validates that the printer is online / bill printed successfully? | Frozen | AD-302 reflects decided print consistency/ownership rule for collect-bill edits |
| OQ-303 | Auto-print on new-order only or also on update? | Frozen | AD-303 captures prepaid collect-bill print availability gap/requirement |
| OQ-401 | How does the business-day range handle DST transitions? | Frozen | AD-401 captured phase-based financial ownership per user clarification on source doc numbering conflict |
| OQ-402 | Are "merged orders" distinct from "transferred orders"? | Frozen | AD-402 captured settlement ownership per user clarification on source doc numbering conflict |
| OQ-502 | Why does `serviceChargeEnabled` default to ON on every render of CollectPaymentPanel? | Frozen | AD-502 |
| OQ-503 | Mobile / touch UX? | Frozen | AD-503 |
| OQ-603 | Do any tests cover the v2 socket event handlers? | Partial | [OPEN - CODE partially resolved] Direct handler coverage exists for `handleUpdateOrderStatus`, plus socket config/dev-guard tests; coverage is partial and at least one test file is stale vs current implementation |
| OQ-701 | Are all required env vars surfaced in a `.env.example`? | Frozen | AD-701 |
| OQ-703 | Why does `backend/server.py` exist in this frontend-focused repo at all? | Frozen | AD-703 |
| OQ-801 | Why does the current commit history lack v2's reference commit `b32dec9`? | Frozen | AD-801 |

## Covered

| Question ID | Topic | Decision assistant status | Notes |
|---|---|---|---|
| OQ-203 | Can the CRM API key rotate mid-session? | Covered | Covered by AD-203, AD-203A, AD-203B, AD-203C |
| OQ-802 | Is the dead `orderData = mockOrderItems[table.id]` in `TableCard.jsx` truly unused, or a placeholder? | Covered | Covered by AD-204 mock-data removal direction |

## Partial

| Question ID | Topic | Decision assistant status | Notes |
|---|---|---|---|
| OQ-111 | Why is `NotificationContext` above `RestaurantContext`? | Partial | Notification-source rule frozen as AD-111A; provider-order question parked separately |

## Parked

| Question ID | Topic | Decision assistant status | Notes |
|---|---|---|---|
| OQ-004 | Rooms vs Tables: what are the differences in flow? | Parked | Parked by user |
| OQ-005 | What are all possible values of `order_in`? | Parked | Needs runtime validation |
| OQ-104 | Which bill-payment endpoint is canonical: `BILL_PAYMENT` or `CLEAR_BILL`? | Parked | User requested to park despite strong code evidence |
| OQ-109 | Why does `handleUpdateFoodStatus` still engage the table as a workaround? | Parked | Must be runtime-validated; expected direction is workaround should not remain |
| OQ-110 | What is the contract for `order-engage` message format? | Parked | Needs runtime validation |
| OQ-205 | What is the `plugins/health-check` CRACO plugin for? | Covered | [OPEN - CODE resolved] Answerable from `frontend/plugins/health-check/*`: dev-server health endpoints + webpack compilation health tracking |
| OQ-504 | Why two `useEffect` in OrderEntry for syncing from OrderContext? | Parked | Parked for later runtime validation |
| OQ-601 | What is `setupTests.polyfills.js`? | Covered | [OPEN - CODE resolved] File polyfills `TextEncoder` and `TextDecoder` for Jest/runtime compatibility |
| OQ-602 | Is the `paymentService.test.js` test currently passing? | Parked | Needs runtime/CI validation |
| OQ-702 | Why does `backend/requirements.txt` declare many unused deps? | Parked | Parked until audit |

## Open

| Question ID | Topic | Decision assistant status | Notes |
|---|---|---|---|
| OQ-501 | `USE_CHANNEL_LAYOUT` and `USE_STATUS_VIEW` — are they permanent? | Open | Code-level source doc says answered, but not frozen in final decisions during consultation |

## Skipped

| Question ID | Topic | Decision assistant status | Notes |
|---|---|---|---|
| OQ-301 | Why does `printOrder('bill', null, order, ...)` take `stationKot=null` when print_type is bill? | Skipped | User explicitly parked/low-priority print-path detail |

## Notes
- "Frozen" means a decision was finalized in conversation and recorded in `ARCHITECTURE_DECISIONS_FINAL.md`.
- "Covered" means no separate freeze was necessary because another frozen decision already covers the concern.
- "Partial" means part of the topic was frozen, but a related sub-question remains unresolved.
- "Parked" means intentionally deferred for runtime validation, audit, or later review.
- "Open" means not yet frozen, parked, or fully covered.
- "Skipped" means explicitly not pursued as a separate decision.
- OQ numbering in `OPEN_QUESTIONS_FROM_CODE.md` for the 302/303/401/402 areas does not perfectly match the topics we froze during consultation; statuses above reflect the decisions actually made in conversation.
