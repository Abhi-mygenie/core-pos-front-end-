# BUG-049 — Intake

> **Sprint:** pos_final_1.0
> **Bug ID:** BUG-049
> **Title:** PayLater payment leaves "NA" on available table card
> **Status:** Open — Intake Created
> **Priority:** P2
> **Owner:** Intake created this session (2026-05-12). Awaiting Bug Impact Analysis Agent.
> **Tracker:** Row added at line 52 + full block appended in `/app/memory/BUG_TEMPLATE.md`.

---

## 1. Source

Owner screenshot / Manual validation (sprint `pos_final_1.0` bug list).

---

## 2. Raw Input Summary

Owner observed that after collecting payment by **PayLater**, the table is cleared / becomes available, but the table card on the dashboard tables grid still displays **"NA"** instead of the standard **Available** chip. This creates a stale or confusing UI state for the next order on that table.

---

## 3. Affected Area

- **Module:** Dashboard / Tables grid.
- **Screen / Flow:** Dashboard tables view (Dine-In section) immediately after a PayLater collect-bill completion.
- **Likely surfaces** (to be confirmed by Impact Analysis):
  - Table-card render path (customer-name / order-summary fallback).
  - `TableContext` state cleanup after socket-driven `update-order-paid` (status 9) for PayLater payments.
  - Possibly `OrderContext` residue still being looked up by `TableCard` after the order is removed.

---

## 4. Steps to Reproduce

1. Open a running Dine-In table with an existing order (e.g. Dine-In table "1" in the evidence screenshot).
2. Open the order → Collect Payment → select **PayLater** → confirm payment.
3. Observe the "Payment Collected — Bill cleared via PayLater" toast.
4. Return to the Dashboard tables grid (or remain on it; do not refresh).
5. Observe the table card for the just-paid table.

---

## 5. Expected Behavior

After PayLater payment clears the table:

- Table card renders the standard **Available** chip exactly like other free tables in the same grid (e.g. Dine-In "1" in column 2, Room "r1", Dine-In "2" / "3" / "e3" / "e4" in the same screenshot).
- No **"NA"** text appears.
- No stale customer name / order placeholder remains.
- The card is immediately ready to start a fresh order (tap → new order entry).

---

## 6. Actual Behavior

After PayLater payment is collected and the order is removed from running:

- Table card transitions to a "cleared" visual but the text **"NA"** is shown where the customer / order summary used to be (top-left card in the evidence screenshot — Dine-In "1").
- All other tables on the same grid render correctly as **Available**.
- Defect persists until the user refreshes the page or triggers another state update on that card.

---

## 7. Evidence

### 7.1 Screenshot
- One owner-provided screenshot from `2026-05-12 19:44`.
- Filename to be saved under `/app/memory/attachments/bug_049/` (intake placeholder — exact filename to be normalized when the attachment is copied into the repo).
- Visible state:
  - Dashboard tables grid — Dine-In column (count badge: 1 active).
  - First Dine-In card (top-left): icon `🍴 1` plus the stale string **"NA"** rendered where the Available chip would normally sit.
  - Adjacent Dine-In cards (1, 2, 3, e3, e4) and Room cards (r1) all render the standard **Available** chip with the orange "+" tap-target.
  - Toast at the bottom: "Payment Collected — Bill cleared via PayLater".

### 7.2 Console evidence (DevTools panel, same screenshot)

Chronological order of relevant log lines:

```
[OrderContext]    waitForOrderEngaged: Order 825899 engaged
[Socket][19:44:16][DEBUG] Event received: new_order_478
                  (5) ['update-order-paid', 825899, 478, 9, {…}]
[useSocketEvents] Order channel event: update-order-paid
                  (5) ['update-order-paid', 825899, 478, 9, {…}]
[SocketHandler][19:44:16][INFO] update-order-paid received: 825899
[SocketHandler][19:44:16][INFO] update-order-paid: Transformed order 825899
[TableContext]    updateTableStatus: 3237 → occupied
[SocketHandler][19:44:16][INFO] Table 3237 → "occupied" (derived from order 825899)
[OrderContext]    removeOrder: Removing order 825899
[SocketHandler][19:44:16][INFO] update-order-paid: Order 825899 is pendingPayment (fOrderStatus=9), removed
[TableContext]    updateTableStatus: 3237 → occupied         ← SECOND EMIT, after removeOrder
[OrderContext]    removeOrder: Removing order 825899          ← SECOND EMIT
```

### 7.3 Interpretation hint (not analysis — to be verified by Impact Analysis)

The console shows `TableContext` updating table `3237 → occupied` **twice** around the same socket event, with `removeOrder` happening between the two emits. The **second** `occupied` write may be applying stale state **after** the order has already been removed, leaving the card in a transitional state where:

- The order is gone (so the card has no customer / order summary to render).
- The table status flag is still flipped to `occupied` (so the card does not fall through to the "Available" branch).
- The render code likely emits the fallback string **"NA"** because `customer?.name` (or `order.user_name` or similar) is unresolvable on a card flagged `occupied` without an associated order.

This is a hypothesis only. Impact Analysis must confirm by:
1. Inspecting the table-card render to locate the exact JSX that emits `"NA"`.
2. Inspecting the final `TableContext` state for table `3237` (occupied vs available) once the socket sequence completes.
3. Inspecting the socket-handler reducer that drives the two `updateTableStatus: 3237 → occupied` emits — is one of them supposed to be `→ available`?

---

## 8. Assumptions / Unknowns

| # | Item | Resolution path |
|---|---|---|
| 1 | **Source of "NA" string** — is it a customer-name fallback, waiter / employee placeholder, order-metadata stale text, or a TableCard guard fallback? | Impact Analysis: locate exact JSX / template literal that emits `"NA"`. |
| 2 | **Rendering-only or stale state?** | If `TableContext.tables[3237].status === 'occupied'` after the sequence: stale state. If `'available'` and "NA" still renders: rendering-only fallback. |
| 3 | **PayLater-specific or all settlement methods?** | Impact Analysis: reproduce with Cash, UPI, Card, Split, Transfer-to-Room. |
| 4 | **Different socket payload shape for PayLater?** | Impact Analysis: capture `update-order-paid` payload for Cash vs PayLater settlement, diff. |
| 5 | **Is the "occupied → occupied" double-emit the root cause or pre-existing socket noise?** | Impact Analysis: trace the socket-handler reducer call stack. |
| 6 | **Overlap with BUG-044?** ("Free / Available Table Still Shows Old Order Items Until Page Refresh") | Impact Analysis must determine merge / supersede / distinct. Both involve stale display on a freed table; BUG-044 reports stale **items**, BUG-049 reports stale **"NA"** string. |
| 7 | **Does the payment write path (`order-bill-payment` with PayLater) return a shape that omits the customer field?** | Impact Analysis: inspect network response for PayLater vs Cash. |

---

## 9. Clarification Required

**No** clarification required for intake. Impact Analysis should answer:

1. Locate the exact JSX / string in the table-card render that emits **"NA"** and the field it falls back from.
2. Verify TableContext state for the affected table id immediately after the second `updateTableStatus: 3237 → occupied` emit — confirm whether the final status is `occupied` or `available` once the dust settles.
3. Reproduce on Cash / Card / UPI / Split / Transfer-to-Room to determine whether the defect is PayLater-specific or a general post-payment table-cleanup gap.
4. Cross-reference BUG-044 — confirm whether they share root cause (single TableContext cleanup gap) or are distinct (BUG-044 = OrderContext residue, BUG-049 = TableContext residue) before proposing a fix.
5. Explicitly separate from BUG-042-B (`grant_amount` payload — closed) and BUG-042-C (status-9 dashboard clearing — closed). The screenshot's `fOrderStatus=9` is the standard PayLater `pendingPayment` status code; it is not a BUG-042-C recurrence.

---

## 10. Explicit Separations

- **NOT BUG-042-B** — `grant_amount` bill-payment payload (closed).
- **NOT BUG-042-C** — status-9 clearing from running dashboard (closed).
- **NOT BUG-044 (yet)** — possibly related stale-display defect on freed tables; Impact Analysis must prove same root cause before merging. At intake, treated as a **distinct** bug.

---

## 11. Frontend vs Backend (intake stance)

**Suspected frontend-only.** Owner observation supports this: "the table is already cleared / available for the next order; this seems like a frontend UI/state cleanup issue."

- Backend `order-bill-payment` response is presumed normal — toast fires, order is removed from `OrderContext`, table status is updated via socket.
- The defect appears to be a post-event UI/state cleanup gap, not a missing or wrong API response.
- Impact Analysis to confirm.

---

## 12. Ready for Next Agent

**Yes.** Ready for **Bug Impact Analysis Agent**.

---

## 13. Confirmation

- ❌ No code modified.
- ❌ No `/app/memory/final/` updates.
- ✅ `/app/memory/BUG_TEMPLATE.md` updated (per task directive — row added at the tracker table; full intake block appended at end of file).
- ✅ Standalone intake doc created at `/app/memory/bugs/BUG_049_INTAKE.md`.
- Scope strictly limited to BUG-049 intake.

---

*End of BUG-049 Intake. Stop after intake — no implementation, no impact analysis.*
