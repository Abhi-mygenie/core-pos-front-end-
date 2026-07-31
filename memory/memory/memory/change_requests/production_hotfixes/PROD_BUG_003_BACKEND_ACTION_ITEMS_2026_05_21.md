# PROD-BUG-003 — Backend Action Items — 2026-05-21

## Context

PROD-BUG-003 (PayLater table not clearing after settle) has been fixed on the frontend with a workaround. The root cause is a backend socket channel mismatch. Two items remain for backend team.

---

## Item 1 — PayLater settle socket channel alignment

**Priority:** P1

**Current behavior:** After `POST /api/v2/vendoremployee/order/paid-prepaid-order` with `payment_status: 'sucess'` (PayLater), the backend emits the socket event on `update-order` channel.

**Expected behavior:** PayLater settle should emit on `update-order-paid` channel — same as regular prepaid settle and bill-payment flows.

**Why it matters:** The frontend socket handler uses the event channel to distinguish PayLater settle (free table) from Hold/Park (keep table occupied). Both arrive as `f_order_status: 9`. The channel is the discriminator. When it arrives on `update-order`, the frontend falls into the Hold/Park path and keeps the table occupied.

**Frontend workaround in place:** `socketHandlers.js` now checks PayLater fields (`prepaid` + `paylater` + `sucess/success`) inside the Hold path to distinguish the two. This works but is fragile — the proper fix is backend emitting on the correct channel.

---

## Item 2 — Polling reconciliation fOS=9 safety net

**Priority:** P2 (frontend-side, noting here for awareness)

**Current behavior:** `useOrderPollingReconciliation.js` line 194 skips ALL `f_order_status: 9` orders from removal — designed for Hold/Park retention. But settled PayLater orders also have fOS=9, so they're never cleaned up by polling if the socket fix misses.

**Recommended:** Frontend will add PayLater detection to the polling skip logic (same `prepaid + paylater + sucess/success` check) so settled PayLater orders can be cleaned up by the 60-second poll as a fallback. No backend action needed for this item — noted for awareness only.

---

## Evidence

- Socket event captured: `['update-order', 868809, 478, 9, {orders: Array(1)...}]`
- Order payload: `payment_status: "success"`, `payment_type: "prepaid"`, `payment_method: "PayLater"`, `f_order_status: 9`
- Frontend fix verified working by owner on 2026-05-21
- Analysis doc: `/app/memory/change_requests/production_hotfixes/PROD_BUG_003_PAYLATER_TABLE_CLEAR_BASELINE_REANALYSIS_2026_05_20.md`
