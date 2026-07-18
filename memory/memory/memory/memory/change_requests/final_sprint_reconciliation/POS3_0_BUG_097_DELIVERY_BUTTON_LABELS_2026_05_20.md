# POS3.0 BUG-097 — Delivery Button Label Reference — 2026-05-21 (REVISED)

> **Revision**: 2026-05-21 — Owner corrections applied. "Handover" reverted to "Bill" on cards. "Delivered" → "Collect Bill" in CartPanel approved but not yet applied.

## Delivery Order Button Labels (Owner-Confirmed, REVISED)

| Location | Order State | Button Label | Action | Non-Delivery Label |
|---|---|---|---|---|
| **Card** (OrderCard/TableCard) | fOrderStatus=1 (Preparing) | **Ready** | Mark food ready | Ready (same) |
| **Card** (OrderCard/TableCard) | fOrderStatus=2 (Ready), no rider, `deliveryAssign=false` | **Dispatch** | Call dispatch API | Serve |
| **Card** (OrderCard/TableCard) | fOrderStatus=2 (Ready), no rider, `deliveryAssign=true` | **Assign Rider** | Open rider picker | Serve |
| **Card** (OrderCard/TableCard) | fOrderStatus=2 (Ready), rider assigned, pending accept | **Waiting for Rider** (disabled) | No action — waiting | Serve |
| **Card** (OrderCard/TableCard) | fOrderStatus=2 (Ready), rider accepted | **Reassign** (clickable) | Open rider picker to reassign | Serve |
| **Card** (OrderCard/TableCard) | fOrderStatus=5 (Served/Dispatched) | **Bill** | Print bill (same as non-delivery) | Bill / C/Out |
| **Order Entry** (CartPanel) | Settlement screen | **Collect Bill** | Collect payment | Collect Bill / Checkout |

## Key Rules (REVISED)
- **Card button at fOS=5 is "Bill"** for ALL order types including delivery — prints the bill. No special "Handover" label.
- **Order Entry button is "Collect Bill"** for ALL non-room orders including delivery — not "Delivered".
- `delivery_assign` from restaurant profile decides Dispatch vs Assign Rider at fOS=2.
- Rider status section ("Awaiting Runner", status pill, "Change" link) is separate from the action buttons.
- Non-delivery orders: all existing labels unchanged (Ready/Serve/Bill/Collect Bill/Checkout).
- This app manages cashier actions only. Rider acceptance/tracking is a separate app.

## Rider Status Labels (Owner Corrections 2026-05-21)

| Current Label | Correction | Status |
|---|---|---|
| "Reached" pill | Should be **"Order Accepted"** | NOT YET APPLIED |

## Implementation Status

| Component | Label | Status |
|---|---|---|
| OrderCard fOrderStatus=5 | ~~"Handover"~~ → **"Bill"** | ✅ Reverted 2026-05-21 |
| TableCard fOrderStatus=5 | ~~"Handover"~~ → **"Bill"** | ✅ Reverted 2026-05-21 |
| CartPanel (Collect Bill button) | ~~"Delivered"~~ → **"Collect Bill"** | PENDING (Item 4A from handover) |
| OrderCard fOrderStatus=2 Dispatch | "Dispatch" (API wired) | ✅ Applied |
| OrderCard fOrderStatus=2 Assign | "Assign Rider" | ✅ Applied |
| TableCard fOrderStatus=2 Dispatch | "Dispatch" (API wired) | ✅ Applied |
| TableCard fOrderStatus=2 Assign | "Assign" | ✅ Applied |
| OrderCard/TableCard fOS=2 Waiting/Reassign branching | Pending (Item 4B from handover) | PENDING |
| Rider status "Reached" → "Order Accepted" | Pending (new owner correction) | PENDING |

## Change Log

| Date | Change | By |
|---|---|---|
| 2026-05-20 | Initial label reference created | Planning Agent |
| 2026-05-21 | "Handover" reverted to "Bill" on OrderCard + TableCard (owner correction) | Implementation Agent |
| 2026-05-21 | "Delivered" → "Collect Bill" confirmed pending (owner approved, not yet applied) | Owner |
| 2026-05-21 | "Reached" → "Order Accepted" noted as new owner correction (not yet applied) | Owner |

---

*— POS3.0 BUG-097 Delivery Button Label Reference — 2026-05-21 (REVISED) —*
