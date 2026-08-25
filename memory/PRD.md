# MyGenie POS — Project Memory

**Last updated:** 2026-08-24

---

## Architecture

- **Frontend:** React 19, CRACO, Tailwind CSS, shadcn/Radix UI
- **Backend API:** Laravel at `preprod.mygenie.online` (external)
- **Socket:** Socket.io at `presocket.mygenie.online`
- **Firebase:** Auth + notifications (mygenie-restaurant project)
- **CRM:** `crm.mygenie.online/api` (X-API-Key auth, per-restaurant key)
- **Deployment:** This pod runs the FE only. Backend is external preprod.

---

## What's been implemented (this session — 2026-08-24)

### CR-163 — Move Items from Room Order to Table (Split Room Order)
**Status:** FE IMPLEMENTED. **BACKEND BLOCKED** on 2 gaps.

**Files changed:**
- `src/api/constants.js` — `+SPLIT_ROOM_ORDER` endpoint constant
- `src/api/services/roomService.js` — `+splitRoomOrder()` function
- `src/components/order-entry/SplitRoomItemsModal.jsx` — NEW (199 lines)
- `src/components/order-entry/CartPanel.jsx` — `+onSplitItems` prop + "Move Items" trigger button
- `src/components/order-entry/OrderEntry.jsx` — `+showSplitModal state`, `+handleSplitRoomItems`, `+prop`, `+modal render`
- `src/components/order-entry/OrderEntry.jsx line 509` — guard fix for empty-items socket sync

**API contract confirmed:**
```
POST /api/v2/vendoremployee/order/split-room-order
{ order_id, order_detail_ids: [id,id], customer_name: "Room {N}", remark }
```

**Backend gaps blocking full E2E:**
1. Items not removed from source order (copy not move)
2. New order created as room sub-card (not walk-in table)
→ Backend brief: `/app/memory/backend_briefs/BACKEND_BRIEF_CR163_SPLIT_ROOM_ORDER_2026_08_24.md`

**Pending FE (1 line — after backend fixes GAP 2):**
Add `order_in: 'WalkIn'` to `splitRoomOrder` payload in `roomService.js`

---

### CR-165 — Razorpay Cancel and Refund
**Status:** Gate 3 complete. Awaiting Gate 4 GO + backend adds `razorpay_order_id` to running orders + socket payloads.

**Docs:**
- Impact Analysis: `/app/memory/impact/CR-165_IMPACT_ANALYSIS.md`
- Implementation Plan: `/app/memory/plans/CR-165_IMPLEMENTATION_PLAN.md`

**Key API:**
```
POST /api/v2/vendoremployee/order/cancel-and-refund-order
Authorization: Bearer <token>
{ order_id, cancellation_reason, cancellation_note }
```

---

### CR-162 — Mid-Stay Partial Payment for Room Orders
**Status:** GATE 2 COMPLETE — Waiting on backend to nest `room_payment_summary` inside `room_info`. Gate 3 ready immediately after.

**Validated APIs:**
- `POST /api/v2/vendoremployee/pos/room-payment` — works ✅ (cash/upi/card/online/razorpay/neft)
- `room_payment_summary` now in running orders ✅ — but at top level, not inside `room_info`
- `balance_payment` in `room_info` is static (check-in snapshot). Live balance = `remaining_room_balance`

**Decision:** Asked backend to move `room_payment_summary` inside `room_info`. Waiting confirmation.

**Impact Analysis:** `/app/memory/impact/CR-162_IMPACT_ANALYSIS.md`

---

### Deployment (2026-08-24)
- Cloned `core-pos-front-end-` repo → `/app/frontend/`
- All env vars written to `/app/frontend/.env`
- App compiles, HTTP 200 on port 3000
- Login page live: `https://core-pos-deploy-12.preview.emergentagent.com`

---

## Prioritised Backlog

### P0 — Blocking (backend must fix first)
- **CR-163 GAP1:** Backend must remove split items from source room order (COPY → MOVE)
- **CR-163 GAP2:** Backend must create split order as `table_id:0` + `order_in:'WalkIn'`

### P1 — Ready to implement after backend
- **CR-165 Gate 4 GO:** Razorpay cancel+refund — 7 files, plan complete
- **CR-163 FE final:** Add `order_in:'WalkIn'` to payload (1 line) after backend confirms

### P2 — Gate 3 needed
- **CR-162:** Mid-stay partial payment — backend endpoint confirm needed

---

## Test credentials
- `owner@18march.com / Qplazm@10` — Razorpay orders, preprod restaurant 478
- Active room orders needed: hotel/resort account (18march has no rooms currently)

---

## Key file locations
| Artifact | Path |
|---|---|
| CR-163 Impact Analysis | `/app/memory/impact/CR-163_IMPACT_ANALYSIS.md` |
| CR-163 Implementation Plan | `/app/memory/plans/CR-163_IMPLEMENTATION_PLAN.md` |
| CR-163 Backend Brief | `/app/memory/backend_briefs/BACKEND_BRIEF_CR163_SPLIT_ROOM_ORDER_2026_08_24.md` |
| CR-165 Impact Analysis | `/app/memory/impact/CR-165_IMPACT_ANALYSIS.md` |
| CR-165 Implementation Plan | `/app/memory/plans/CR-165_IMPLEMENTATION_PLAN.md` |
| Session close handover | `/app/memory/handover/SESSION_HANDOVER_2026_08_24_CR163_SESSION_CLOSE.md` |
| Design mockup (CR-163) | `https://core-pos-deploy-12.preview.emergentagent.com/cr163-mockup.html` |
