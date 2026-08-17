# POS3.0 BUG-097 Bucket 1 OrderCard/TableCard Corrective Approval Plan — 2026-05-20

## 1. Purpose

This document corrects delivery action button placement after discovering that `DeliveryCard.jsx` is **not the active rendered component** for delivery orders on the dashboard. Delivery orders render through `OrderCard` (order/list view) and `TableCard` (table/grid view).

No code changed. No `/app/memory/final/` updated.

---

## 2. Runtime Finding

**Dashboard rendering path for delivery orders:**

```
DashboardPage → ChannelColumnsLayout → ChannelColumn
  ├── viewType === 'table' → TableCard (grid view)
  └── viewType === 'order' → OrderCard (list view) ← active in screenshot
```

Both `USE_CHANNEL_LAYOUT` and `USE_STATUS_VIEW` are `true` (featureFlags.js).

The old non-channel layout path (DashboardPage L1643+) also uses `OrderCard` for delivery (L1810) and `TableCard` for grid (L1722).

**`DeliveryCard.jsx` is imported in DashboardPage (L7) but never rendered.** It is legacy/unused.

---

## 3. Active Component Map

| Component | Active? | Renders Delivery Orders? | Where Used | Has Rider Section? | Has Dispatch/Assign? |
|---|---|---|---|---|---|
| **OrderCard** | **Yes** | **Yes** — order/list view | ChannelColumn L319, DashboardPage L1810 | **Yes** — L727-751, but only for `!isOwn` | **No** — needs addition |
| **TableCard** | **Yes** | **Yes** — table/grid view | ChannelColumn L297, DashboardPage L1722 | **No** | **No** — needs addition if grid view shows delivery |
| **DeliveryCard** | **No** — imported but never rendered | **No** | Only in import (DashboardPage L7) | Yes | Yes (Bucket 1 fix applied, but invisible) |

---

## 4. Key Finding: OrderCard Rider Section is `!isOwn` Only

**OrderCard L727-751:**
```jsx
{isDelivery && !isOwn && (
  <div> ... rider section ... </div>
)}
```

This means:
- **Own delivery orders (`source === "own"`)** → NO rider section shown (correct — own = no delivery boys)
- **Non-own delivery orders** → rider section shown with "Awaiting Runner" or rider name

This is consistent with the business rules. Own orders use Dispatch (no rider), non-own use Assign Rider.

---

## 5. Proposed Corrective Change

### 5.1 OrderCard — Add Dispatch/Assign Buttons

**Where:** In the footer actions area (L819-866), alongside existing Ready/Serve/Bill buttons.

**Logic:**
```
Delivery + Ready (fOrderStatus === 2) + no rider assigned:
  - source === "own" → Dispatch button (placeholder console.log)
  - source !== "own" → Assign Rider button (placeholder console.log)

Delivery + rider assigned (deliveryManId exists):
  - No Dispatch/Assign button (rider info shown in rider section instead)
```

**Note on fOrderStatus:** Currently the Ready button shows at `fOrderStatus === 1` and Serve at `fOrderStatus === 2`. For delivery orders, Dispatch/Assign should show when the order is ready for handoff. Based on the analysis doc, this is when `status === "ready"` which maps to `fOrderStatus === 2`. The Dispatch/Assign replaces or supplements the Serve button for delivery orders.

**What remains:** `console.log` placeholders only. No API wiring (Bucket 2).

### 5.2 TableCard — Assessment

TableCard is a compact grid card (160px wide). It shows: table/order label, status, amount, and a single action button (Ready/Serve/Bill). It does **not** have space for a full rider section or separate Dispatch/Assign buttons.

**Recommendation:** Do NOT add Dispatch/Assign to TableCard in this corrective step. The compact grid view is not the primary interaction surface for delivery actions. Delivery dispatch/assign actions are better suited for the order/list view (OrderCard) where there's more UI space.

**Rationale:**
- TableCard has 160px width — no room for "Assign Rider" text
- The table view is primarily for dine-in table management
- Delivery actions are operationally done in the order/list view

### 5.3 DeliveryCard — No Further Changes

`DeliveryCard.jsx` already has the corrected Bucket 1 logic (button fix, uses `order.deliveryManId`). It remains unused in dashboard rendering. Do not delete. Record as technical debt / possible future use.

---

## 6. Business Rule Protection

| Rule | How Protected |
|---|---|
| Dispatch only when no rider + own delivery | `isDelivery && !order.deliveryManId && isOwn` |
| Assign only when no rider + non-own | `isDelivery && !order.deliveryManId && !isOwn` |
| No buttons when rider exists | `!order.deliveryManId` gate on both buttons |
| No new card UI | Changes only to existing OrderCard footer |
| No API wiring | `console.log` placeholders only |
| No socket changes | No socket files touched |
| No non-delivery impact | All new code gated behind `isDelivery` |

---

## 7. Files Expected To Change

| File | Planned Change | Reason |
|---|---|---|
| `components/cards/OrderCard.jsx` | Add Dispatch/Assign button blocks in footer actions (L819-866 area) | Delivery orders render through OrderCard; buttons needed here |
| No other files | — | Transform, constants, statusHelpers already done in Bucket 1 |

**Files NOT changed:**
- `TableCard.jsx` — no change (compact grid, not suited for delivery actions)
- `DeliveryCard.jsx` — already has Bucket 1 fix, remains unused
- `DashboardPage.jsx` — no change
- `ChannelColumn.jsx` — no change
- Socket handlers — no change
- `CollectPaymentPanel.jsx` — no change

---

## 8. Risk

**LOW**

- Change is additive (new conditional block inside existing footer)
- Gated behind `isDelivery` — zero impact on dine-in/takeaway/room orders
- Gated behind `!order.deliveryManId` — zero impact when rider is already assigned
- No API calls — `console.log` only
- No socket changes
- Existing Ready/Serve/Bill buttons remain untouched for non-delivery flows

---

## 9. Approval Request

**A.** Approve corrective patch for **OrderCard only** — add Dispatch/Assign buttons in footer. No TableCard change. `console.log` placeholders.

**B.** Approve corrective patch for **OrderCard + TableCard** — add to both.

**C.** Do not change cards now — keep for Bucket 2 when API calls are wired.

**D.** Request more detail / exact code diff preview first.

**E.** Stop — reconsider approach.

**Recommendation: Option A** — OrderCard-only is the correct placement. It's where delivery orders are actively managed. TableCard is too compact.

---

## 10. Final Status

**bug_097_bucket_1_corrective_plan_pending_owner_approval**

| Metric | Value |
|---|---|
| Active delivery rendering paths | OrderCard (order view) + TableCard (table view) |
| DeliveryCard status | Imported but never rendered — legacy/unused |
| OrderCard needs Dispatch/Assign? | **Yes** |
| TableCard needs Dispatch/Assign? | **No** (too compact, not primary delivery interaction surface) |
| Files to change | 1 — `OrderCard.jsx` only |
| API wiring | None — `console.log` placeholders |
| Socket changes | None |
| Code changed so far | **No** (this is planning/approval only) |
| `/app/memory/final/` updated | **No** |

---

*— POS3.0 BUG-097 Bucket 1 OrderCard/TableCard Corrective Approval Plan — 2026-05-20 —*
