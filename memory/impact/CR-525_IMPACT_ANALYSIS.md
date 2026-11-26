# CR-525: After Bill Print, KOT + Bill → Collect Bill. Impact Analysis (Gate 2), 2026-11-15

## ⚠ REVISION 2026-11-19 — HIDE-ONLY (owner; supersedes the reverse + BD-01 below)

**This revision supersedes every "restore KOT/Bill after edit" statement in the 2026-11-15 body below.**

- **Decision:** After bill print, on table + order cards, replace KOT + Bill (and Ready/Serve) with a single **Collect Bill** button, and route card tap/Enter → Collect Payment. **HIDE-ONLY — do NOT restore KOT/Bill when a printed order is later edited.**
- **BD-01 DROPPED.** No backend `bill_print` reset is needed → **no backend dependency**. CR-525 is **FE-only** and **UNBLOCKED**. `OD-525-E` ("wait for server before go-live") no longer applies; the API contract's BD-01/BD-02/BD-03 are not required for CR-525.
- **Accepted limitation (flag at QA):** if a printed order is edited (items added), the card stays on "Collect Bill" and will NOT bring KOT/Bill back. Staff reprint via the normal order/report route.
- **Scope unchanged:** gated per-restaurant by the `orderEditAccess` setting (CR-489); excludes rooms / prepaid / delivery / aggregator; applies at every stage after print (OD-525-D).
- **Derived flag:** `showCollect = restaurant.settings.orderEditAccess && billPrinted && !isRoom && paymentType!=='prepaid' && !isDelivery && !isAggregator`.
- **Code-reality correction (verified on current `main`):** the plumbing is fully present and wired — `DashboardPage.handleBillClick` (L1604) + `initialShowPayment` exist and `onBillClick` is already passed to every live `<TableCard>`/`<OrderCard>` (L2043/2165/2231/2267/2297). **The cards simply never call `onBillClick`** (declared in props only; buttons call `handlePrintBill`, card tap calls `onOpenModal`/`onEdit`). So the change is pure FE wiring in the two card files.
- **IA "Proposed" item E5 is now a NO-OP:** the old L1835 list-view target `OrderListSection` is dead code (rendered nowhere); all live card render sites already pass `onBillClick`.
- **Verified anchors:** TableCard.jsx — `onBillClick` L55 (unused), `handleCardClick` L300 → `onOpenModal`, bill btn L746 → `handlePrintBill`. OrderCard.jsx — `onBillClick` L53 (unused), tap/Enter L461-462 → `onEdit`, bill btns L1255/L1280 → `handlePrintBill`.
- **Files that WILL change:** `components/cards/TableCard.jsx`, `components/cards/OrderCard.jsx`. **WILL NOT touch:** `DashboardPage.jsx` (plumbing already present), any backend, any transform.
- **Risk:** MEDIUM-HIGH (money-path entry, R5 cards). Regression: CR-489 lock, CR-512 print-confirm, BUG-583/664 colour, card tap/Enter, excluded types untouched.
- **Status:** IA CLOSED (hide-only) → **ready for Gate 3 (implementation plan). Gate 4 GO still required before any coding.**

---


Code Reality: PARTIAL. The plumbing exists: `DashboardPage.handleBillClick` (L1596-1600) opens Order Entry with the Collect Payment panel already open (`initialShowPayment`, L443). It's passed as `onBillClick` to TableCard / OrderCard (Dashboard L1957, L2014, L2045, L2079; channel column L162) **but neither card uses it today** (TableCard L55, OrderCard L53 declared only). The card buttons call `handlePrintBill` (print) instead.
Conflict pre-check: TableCard.jsx (875 lines) / OrderCard.jsx (1335 lines) also carry BUG-583 (5A), BUG-628 (5A), BUG-557 (5A), CR-512 (5A), CR-433 (5B). **CR-521 (this batch) edits the same files: CR-525 first, CR-521 after, same agent.** DashboardPage.jsx: CR-533 (Gate 1, P0) and BUG-570 (5A).
Risk: **MEDIUM-HIGH** (money path entry point, R5 cards, depends on the CR-489 lock semantics). No Fast Lane.
Backend-blocked: **PARTIAL**. The button swap is FE-only. **"Edited after print → KOT + Bill return" needs the backend** (probe P2: the server does NOT clear `bill_print` after items are added). Brief: `backend_briefs/BACKEND_BRIEF_BATCH-D_2026_11_15.md` §1. → **SUPERSEDED (Revision 2026-11-19): HIDE-ONLY, no reverse → BD-01 DROPPED → CR-525 is FE-only and UNBLOCKED.**

## Owner decisions (locked)
- Intake: on table AND order cards, after the bill is printed, the button + card tap → Collect Bill screen directly. Edited after print → KOT + Bill return. **[REVISED 2026-11-19: HIDE-ONLY — the "Edited after print → KOT + Bill return" clause is REMOVED.]**
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

## Open points for Gate 3 — RESOLVED (owner, 2026-11-19; STAY AT GATE 2)
1. **Ready/Serve hiding — RESOLVED by revalidation.** On current `main`: TableCard (fOS 1 L542-569 = KOT+Ready; fOS 2 L570-657 = KOT+Serve; **Bill only at fOS 5 Served**, `collect-btn` L746-755 → `handlePrintBill`) and OrderCard (Bill only at fOS 5, L1237-1285; Preparing/Ready L1136-1213 = KOT+Ready/Serve). **There is NO Bill/print-bill button at Preparing (fOS 1) or Ready (fOS 2)** — so a bill cannot be printed from the card at those stages. CR-525's Collect Bill swap therefore occurs at the **Served (fOS 5)** stage (replacing KOT + Bill); Ready/Serve at fOS 1/2 are untouched. The old "hide Ready/Serve at every stage after print" concern is dropped. OD-525-D revised accordingly.
2. **Aggregator orders — RESOLVED: NO CHANGES** (excluded, locked by owner 2026-11-19).
3. **Walk-in / takeaway / dine-in tables — RESOLVED: INCLUDED** (confirmed by owner 2026-11-19).
4. ~~Backend reset ship-order~~ — **MOOT** (HIDE-ONLY, BD-01 dropped; no backend).

**Gate status: remains GATE_2_IA_CLOSED (HIDE-ONLY). No open owner questions. Gate 4 GO still required before Gate 3 planning/coding.**

## Verification seeds
V1 Setting ON, dine-in, print bill → card shows only Collect Bill. Tap button → Collect Payment opens. Tap card → same.
V2 Setting OFF → unchanged (KOT + Bill).
V3 Room printed → C/Out unchanged. Prepaid → Settle. Delivery → rider buttons.
V4 Back from Collect → order screen. Add item (with edit permission) → after the backend reset, the card shows KOT + Bill again and the colour resets.
V5 Preparing-stage print → Collect Bill only (OD-525-D).
V6 Keyboard Enter on a printed card → Collect Payment.
Regression: BUG-583/664 colour, BUG-628 On The Way, CR-489 lock, CR-512 print confirm, merge/shift/cancel header icons.

## API Contract — FINAL v1 LOCKED 2026-11-15

`contracts/BATCH-D_CR-525_API_CONTRACT_2026_11_15.md`
