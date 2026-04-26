# Req 2 — Order Taking Visibility — Locked Decisions

**Status:** APPROVED for implementation. Decisions locked by Abhishek (current session).
**Companion docs:** `/app/memory/REQ2_ADD_BUTTON_VISIBILITY_DEEPDIVE.md` (analysis — note: scope expanded after Q-2D discussion; see below).

**Important note on naming:** the original "Add Button Visibility" framing was too narrow once owner clarified intent. Final scope is **Order Taking** — block ALL paths that lead to OrderEntry (cart). In-card action buttons (Mark Ready, Mark Served, Print KOT/Bill, Confirm, Cancel) continue working so kitchen-floor staff can still service existing orders.

---

## Locked answers

| Q | Decision | Notes |
|---|---|---|
| Q-2A — Authority | **(a)** Admin-locked | Set in `StatusConfigPage`; cashier cannot toggle live |
| Q-2B — Granularity | **(a)** Single global toggle | One switch governs all 6 paths |
| Q-2C — Factory default | **enabled (order-taking ON)** | Preserves current behavior for tenants who never open Settings |
| Q-2D — Scope (the BIG decision) | **Block all 6 paths to OrderEntry / Check-In modal** | Path 1 (Header Add) → button hidden. Paths 2-6 (card clicks) → silent no-op via early return in `handleTableClick`. Action buttons (Mark Ready/Served, Print, Confirm, Cancel) inside cards continue working. |
| Q-2E — Storage shape | `mygenie_order_taking_enabled = { enabled: true \| false }` JSON object | Mirrors `mygenie_channel_visibility` shape; extensible |
| Q-2F — UI placement | **(b)** New "UI Elements" section card in StatusConfigPage | Placed between "Visibility Settings" (status filter) and "Station View" cards |
| Q-2G — Test-IDs | `order-taking-toggle` | Single test-ID on the master switch |
| Q-2H — Permission gate | **(a)** No additional permission gate | Pure visibility flag |
| Cursor feedback (post-Q-2D follow-up) | **(b)** Silent no-op | Click does nothing; no toast. Cursor change is implementation-detail (see handover §4 — minimum viable + optional polish) |

---

## Effective behavior summary

### Order-Taking ENABLED (default)
- Header `Add` button: visible
- Empty dine-in TableCard click: opens OrderEntry as dine-in
- Available Room card click: opens Room Check-In modal
- Occupied TableCard / DineInCard / DeliveryCard / OrderCard body click: opens OrderEntry to view/edit
- TA / Delivery row click: opens OrderEntry to view/edit
- All in-card action buttons: work as today

### Order-Taking DISABLED
- Header `Add` button: **hidden**
- Empty dine-in TableCard click: **silent no-op**
- Available Room card click: **silent no-op**
- Occupied TableCard / DineInCard / DeliveryCard / OrderCard body click: **silent no-op**
- TA / Delivery row click: **silent no-op**
- In-card action buttons (Mark Ready, Mark Served, Print KOT, Print Bill, Confirm, Cancel): **continue working**
- Header status filters, Sidebar nav, Settings access, Station Panel: **unaffected**

---

## Files to touch

| File | Change |
|---|---|
| `frontend/src/pages/StatusConfigPage.jsx` | New "UI Elements" section card with Order Taking toggle; hydrate (with backfill, Req-4 pattern); persist; extend `resetToDefault` |
| `frontend/src/components/layout/Header.jsx` | Read flag on mount + storage event subscription + conditional render of Add button |
| `frontend/src/pages/DashboardPage.jsx` | At top of `handleTableClick` (line 1069): read flag, early return if disabled. Plus storage-event subscription. |

No other files touched. No backend changes. No new contexts. No new dependencies.

---

## Storage contract (final)

| Key | Allowed values | Factory default | Authority |
|---|---|---|---|
| `mygenie_order_taking_enabled` (NEW) | JSON object `{ enabled: true \| false }` | `{ enabled: true }` | Admin only |

---

## V3 documentation

Per Q-12 convention from Req 4: NOT inline. New entry will be appended to `/app/memory/V3_DOC_UPDATES_PENDING.md` (`AD-Order-Taking-Toggle`) for the V3 validation agent to merge later.

---

_End of locked decisions for Req 2. No code modified yet._
