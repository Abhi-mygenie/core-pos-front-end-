# CR-525: After Bill Print, KOT + Bill → Collect Bill. Impact Analysis (Gate 2), 2026-11-15

Code Reality: PARTIAL. The plumbing exists: `DashboardPage.handleBillClick` (L1596-1600) opens Order Entry with the Collect Payment panel already open (`initialShowPayment`, L443). It's passed as `onBillClick` to TableCard / OrderCard (Dashboard L1957, L2014, L2045, L2079; channel column L162) **but neither card uses it today** (TableCard L55, OrderCard L53 declared only). The card buttons call `handlePrintBill` (print) instead.
Conflict pre-check: TableCard.jsx (875 lines) / OrderCard.jsx (1335 lines) also carry BUG-583 (5A), BUG-628 (5A), BUG-557 (5A), CR-512 (5A), CR-433 (5B). **CR-521 (this batch) edits the same files: CR-525 first, CR-521 after, same agent.** DashboardPage.jsx: CR-533 (Gate 1, P0) and BUG-570 (5A).
Risk: **MEDIUM-HIGH** (money path entry point, R5 cards, depends on the CR-489 lock semantics). No Fast Lane.
Backend-blocked: **PARTIAL**. The button swap is FE-only. **"Edited after print → KOT + Bill return" needs the backend** (probe P2: the server does NOT clear `bill_print` after items are added). Brief: `backend_briefs/BACKEND_BRIEF_BATCH-D_2026_11_15.md` §1.

## Owner decisions (locked)
- Intake: on table AND order cards, after the bill is printed, the button + card tap → Collect Bill screen directly. Edited after print → KOT + Bill return.
- OD-525-A (R4/R5): **only when the outlet setting "Lock order after bill print" (`order_edit_access`, CR-489) is ON.** OFF → today's cards are unchanged.
- OD-525-D (R5): applies at **every stage after print** (Preparing / Ready / Served).
- OD-525-B: **rooms keep C/Out** (excluded).
- OD-525-C: **prepaid (Settle) and delivery (Assign / Dispatch / On The Way) unchanged** (excluded). Conflict explained to the owner: prepaid → double collection; delivery → `On The Way` is the bill-print step (BUG-628), and Collect would skip the rider flow.

## Probe P2 (2026-11-15, cafe103, test takeaway order #021544 / id 1578761, cancelled after)
| Step | bill_print | order_edit_count |
|---|---|---|
| placed | No | 0 |
| `print/update-print-status` bill_print=Yes (CR-512 confirm) | **Yes** | 0 |
| `update-place-order` +1 item | **Yes (not reset)** | 1 |
| `update-place-order` customer only (empty cart) | Yes | 2 |
Evidence: `evidence/BATCH-D-IA/probes_2026_11_15/P_P2_*`, `P2_0*.json`.
→ The FE can't tell "edited after print" from the flag. `order_edit_count` also increases on customer-only updates (and the FE doesn't know the count at print time across devices) → not a usable signal. **The backend must reset `bill_print='No'` when NEW items are added (non-empty `cart-update`) and emit the order socket.** This automatically restores KOT + Bill and the normal card colour (CR-521 / BUG-583).

## Current button matrix (non-aggregator)
| fOS | TableCard | OrderCard |
|---|---|---|
| 1 Preparing | L541-567 KOT + Ready | ~L1059 KOT + L1138 Ready |
| 2 Ready | L569-655 KOT + Serve / rider buttons | Serve L1201 / rider L1153-1188 |
| 5 Served | L657-757: KOT L663 + (delivery rider L679-730 \| prepaid Settle L731-742 \| **Bill/C-Out L743-755 `collect-btn-*` → handlePrintBill**) | L1217-1285: rider, Settle L1265, **Bill L1277** |
| card tap | L300-312 `handleCardClick` → `onOpenModal(table)` → Dashboard `handleTableClick` (Order Entry) | L461 `onEdit()` → `handleTableClick` |

## Proposed (Gate 3 detail)
New derived flag per card: `showCollect = restaurant.settings.orderEditAccess && billPrinted && !isRoom && paymentType !== 'prepaid' && !isDelivery && !isAggregator`.
| # | Where | Change |
|---|---|---|
| E1 | TableCard fOS 1 / 2 / 5 rows | when `showCollect` → render ONE full-width green **Collect Bill** button (`collect-bill-btn-*`) → `onBillClick(table)`. KOT, Ready/Serve and Bill are hidden |
| E2 | TableCard L300 `handleCardClick` | `showCollect` → `onBillClick(table)` instead of `onOpenModal` |
| E3 | OrderCard same rows (L1059-1285) | same as E1 |
| E4 | OrderCard L461/L462 click + Enter key | `showCollect` → `onBillClick()` |
| E5 | DashboardPage | none needed (`handleBillClick` + `initialShowPayment` exist). Verify `onBillClick` reaches every card render site (L1835 list view passes only `onEdit` → **add `onBillClick` there**) |
Editing after print: the Collect Payment panel has Back (`OrderEntry` L2157 `onBack → setShowPaymentPanel(false)`) → Order screen. Edit rules stay as CR-489/BUG-656: users with `order_edit_access` can add items; others can't.

## Open points for Gate 3 (recommendations; confirm at plan review)
1. "At every stage": a printed order at Preparing/Ready loses its Ready/Serve buttons on the card. Staff mark Ready/Served from the KDS or by opening the order. Owner chose this explicitly (R5). Flag it in the plan.
2. Aggregator orders: treated as prepaid/platform → excluded (recommendation).
3. Walk-in / takeaway / dine-in tables: included.
4. Until the backend reset (brief §1) ships: an edit after print keeps the Collect Bill + orange card. Ship order: backend first, or FE ships with a known limitation, owner's choice at Gate 3.

## Verification seeds
V1 Setting ON, dine-in, print bill → card shows only Collect Bill. Tap button → Collect Payment opens. Tap card → same.
V2 Setting OFF → unchanged (KOT + Bill).
V3 Room printed → C/Out unchanged. Prepaid → Settle. Delivery → rider buttons.
V4 Back from Collect → order screen. Add item (with edit permission) → after the backend reset, the card shows KOT + Bill again and the colour resets.
V5 Preparing-stage print → Collect Bill only (OD-525-D).
V6 Keyboard Enter on a printed card → Collect Payment.
Regression: BUG-583/664 colour, BUG-628 On The Way, CR-489 lock, CR-512 print confirm, merge/shift/cancel header icons.
