# BUG-097 — Delivery Dispatch + Assign Rider — Analysis — 2026-05-19

## 1. Bug Summary

| Field | Value |
|---|---|
| Bug | BUG-097 |
| Priority | P1 |
| Sprint | POS3.0 |
| Title | Delivery Dispatch + Assign Delivery Boy |
| Status | **Analysis complete** — ready for planning |
| Scope | Own orders only. Aggregator orders (Swiggy/Zomato) out of scope. |

---

## 2. Problem

DeliveryCard has placeholder buttons (`console.log`) for Dispatch and Assign Rider. No real API integration. Backend APIs are ready.

---

## 3. API Endpoints (Owner-provided)

| # | Action | Endpoint | Payload | Who triggers |
|---|---|---|---|---|
| 1 | List delivery persons | `POST /api/v1/vendoremployee/delivery-employee-list` | `{}` | Cashier (POS) |
| 2 | Assign rider to order | `POST /api/v1/vendoremployee/delivery-order-assign` | `{order_id, delivery_man_id}` | Cashier (POS) |
| 3 | Dispatch (self-deliver) | `POST /api/v2/vendoremployee/order/order-status-update` | `{order_id, order_status: "serve", order_dispatch_status: "Yes", role_name}` | Cashier (POS) |
| 4 | Rider accepts | `POST /api/v2/vendoremployee/order/order-status-update` | `{order_id, order_status: "serve", delivery_man_status: "Yes", role_name}` | Rider (rider app) |
| 5 | Rider rejects | `POST /api/v1/vendoremployee/delivery-order-cancel` | `{order_id, delivery_man_id}` | Rider (rider app) |

---

## 4. Delivery Flow

### Flow A — Dispatch (no delivery staff, cashier delivers)

```
Order Ready → [Dispatch] → Dispatched → [Delivered] → Done
```

- Cashier clicks Dispatch → API #3 → order moves to dispatched
- Cashier physically delivers, clicks Delivered

### Flow B — Assign Rider (restaurant has delivery staff)

```
Order Ready → [Assign] → Picker modal → Rider selected → Assigned (pending)
                                                              │
                                              ┌───────────────┼───────────────┐
                                              │                               │
                                        Rider ACCEPTS                   Rider REJECTS
                                        (rider app)                     (rider app)
                                              │                               │
                                              ▼                               ▼
                                         Dispatched                      [Reassign]
                                         (handover)                    (pick another)
                                              │
                                              ▼
                                        [Delivered] → Done
```

- Cashier clicks Assign → API #1 (get list) → rider picker modal → API #2 (assign)
- Rider accepts from rider app → API #4 fires (not POS) → POS reflects via socket → order = dispatched
- Rider rejects from rider app → API #5 fires (not POS) → POS reflects via socket → button becomes "Reassign"
- Reassign = same flow as Assign
- Rider accepted = physical handover from kitchen = dispatched
- Multiple orders can be assigned to same rider (single order per API call, same delivery_man_id reusable)

---

## 5. Source Logic

`source` = `order_in` from backend (lowercase):
- `"own"` = POS-placed order, restaurant's own
- `"swiggy"` / `"zomato"` = aggregator (out of scope)

Button logic (corrected — current placeholder code is inverted):
- Has delivery staff → **"Assign"**
- No delivery staff → **"Dispatch"**

---

## 6. DeliveryCard State Machine

| Order Status | Rider State | Button | Action |
|---|---|---|---|
| `ready` | No delivery staff | **Dispatch** | API #3 |
| `ready` | Has delivery staff, unassigned | **Assign** | API #1 → modal → API #2 |
| `ready` | Rider rejected | **Reassign** | API #1 → modal → API #2 |
| any | Rider assigned, pending accept | No button (waiting) | Rider section shows name + "Assigned" pill |
| any | Rider accepted | — | Moves to `dispatched` via socket |
| `dispatched` | — | **Delivered** | Mark complete |
| `delivered` | — | **Done** (label) | Terminal |

---

## 7. Existing Code

| File | What exists | What's missing |
|---|---|---|
| `DeliveryCard.jsx` L190-196 | Placeholder button with `console.log` | Real API calls |
| `DeliveryCard.jsx` L102-135 | Rider section — renders `order.rider`, `order.riderPhone`, `riderStatus` pill | Already works if data is present |
| `DeliveryCard.jsx` L200-210 | Dispatched → Delivered → Done button chain | Placeholder `console.log` |
| `statusHelpers.js` L129 | `RIDER_STATUS_CONFIG`: lookingForRider, riderAssigned, riderReached | May need "rejected" status |
| `socketHandlers.js` L593 | `handleDeliveryAssignOrder` — fetches order via API | Works but redundant API call (BUG-094) |
| `api/constants.js` | — | Missing endpoint constants for all 5 APIs |
| `orderService.js` | — | Missing service functions for dispatch/assign/list |

---

## 8. Accept/Reject are NOT POS actions

- Accept and reject happen on the **rider app** (separate application)
- POS receives the outcome via **socket events** (order status update)
- POS only needs to **reflect** the updated state — no accept/reject buttons on POS
- Reject → POS shows "Reassign" button (cashier picks another rider)

---

## 9. Open Questions

| # | Question | Status |
|---|---|---|
| 1 | How does POS know if restaurant has delivery staff? Is it `delivery-employee-list` returning empty = no staff? Or a profile flag? | **Unanswered** |
| 2 | What socket event fires when rider accepts/rejects? Is it `update-order-status` or `delivery-assign-order`? | **Unanswered** |
| 3 | What does `delivery-employee-list` response look like? (field names: id, name, phone, status) | **Unanswered** |
| 4 | "Delivered" button — which API endpoint marks delivery complete? | **Unanswered** |

---

## 10. Stages

| Stage | Status |
|---|---|
| Impact Analysis | **DONE** |
| API Documentation | **DONE** (5 endpoints collected) |
| Flow Analysis | **DONE** |
| Open Questions | 4 unanswered |
| Planning | **NOT STARTED** |
| Owner Approval | **NOT STARTED** |
| Implementation | **NOT STARTED** |

---

*— End of BUG-097 Analysis — 2026-05-19 —*
