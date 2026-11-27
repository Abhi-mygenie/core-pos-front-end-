# BUG-701 — Room edit-confirm popup (ScanOrderPopOut) disappears on item-cancel

**Type:** BUG · **Priority:** P0 · **Risk:** HIGH
**Status:** GATE_1_INTAKE_COMPLETE
**Registered:** 2026-11-18 · **Target release:** 2026-11-17 (owner-specified)
**Sprint:** nov_cr_batch · **Area:** Dashboard / Sockets / Order flow
**Client:** ALL (discovered on `macha`, restaurant_id 69) · **Assignee:** Abhishek
**Source:** INVESTIGATION (INV-ROOM-CANCEL-POPUP, 2026-11-18) · **Confidence:** CONFIRMED (live preprod probe + authorized mutation)

---

## Summary
In the web edit-confirm popup (`ScanOrderPopOut`), cancelling a newly-added item behaves differently by order type:
- **Table (dine-in) order** → popup stays open ✅ (correct)
- **Room order** → popup disappears entirely ❌ (bug)

## Root cause (HIGH confidence — proven)
The popup keeps an order visible only while `hasUnconfirmedWebEditItems(order)` is true, and that helper is **first-gated on `order.isWebOrder`**. For **room orders the backend returns `order_from` as `"pos"` or `null` — never `"web"`**. Every post-cancel refresh (socket frame, `get-single-order-new`, 60s reconciliation poll) re-transforms the order and recomputes `isWebOrder = false`, so the order drops out of the popup queue and the popup unmounts. Table web orders carry `order_from="web"` and survive.

The same web-origin loss is already defended against in **one** path (`useOrderPollingReconciliation.js` L170-177, BUG-082) but **not** in the socket update handlers or the single-order transform.

## Evidence
- Live room order `1578881` (room a1, `rtype=RM`, `order_edit_count=12`, 5× `food_status=7` web-edit lines).
- `get-single-order-new(1578881)` → `order_from=null`, `order_in=null`.
- RAW socket frame on `new_order_69` during live cancel → `order_from="pos"`, `restaurantTable.rtype="RM"`.
- Evidence dir: `/app/memory/evidence/BUG-701/` (running_orders.json, single_order_1578881.json, raw_socket_frame_cancel.json, boot_socket_log.txt, screenshots, console logs).
- Source reports: `memory/investigations/INV-ROOM-CANCEL-POPUP_INVESTIGATION_REPORT_2026-11-18.md` + `..._API_BRIEF.md`.

## Steps to reproduce
1. Log in (RID 69). Open a **room** order that has an unconfirmed web-edit line (food_status=7).
2. In the edit-confirm popup (`ScanOrderPopOut`), cancel one newly-added item.
3. Observe popup disappears (for a table order the popup would remain).

## Blast radius
- Candidate files: `src/api/socket/socketHandlers.js` (handleUpdateFoodStatus / handleOrderDataEvent / handleUpdateOrderStatus), `src/api/transforms/orderTransform.js` (L265-266), `src/contexts/OrderContext.jsx` (updateOrder merge), `src/components/dashboard/ScanOrderPopOut.jsx` (L63-66), `src/hooks/useOrderPollingReconciliation.js` (reference guard L170-177).
- Scope: **MEDIUM** (3-5 files). Hotspot files: **YES** (sockets + order flow — R5).

## Risk & process
- **Risk: HIGH** (socket + order-flow hotspots, multi-file).
- Planning-skip: **NOT eligible**. Full Planning gate (Gate 2-3) required.

## Classification / routing
- Duplicate check: **DISTINCT**. Related: BUG-082 (prior web-origin preservation guard), BUG-122 (fOrderStatus=7 popup gating).
- Assignee routing: frontend work, not backend-blocked → **Abhishek**.

## Open questions (for Planning / owner)
- OD-701-01: Fix FE-only (preserve prior `isWebOrder`/`orderFrom` on re-transform) vs also raise backend ask to return `order_from="web"` for web-edited room orders? (FE guard recommended as the robust fix regardless.)
- OD-701-02: Centralise preservation in `OrderContext.updateOrder` merge, or patch each socket handler + single-order transform?

## Secondary finding (separate — already tracked)
Transient empty poll (`server=0`, `REMOVAL_MISS_THRESHOLD=1`) evicted active room order 1578881 at boot. Overlaps existing **BUG-686** (dashboard drops running orders after login). No new filing — cross-linked to BUG-686.
