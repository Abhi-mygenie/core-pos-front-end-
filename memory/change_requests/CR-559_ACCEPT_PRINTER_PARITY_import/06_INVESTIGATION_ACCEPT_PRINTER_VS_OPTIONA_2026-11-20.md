# CR-559 — INVESTIGATION: Accept-print path vs the Option-A backend reply

**Role:** INVESTIGATION (no code edits)
**Date:** 2026-11-20
**Question (owner):** Is there a CR only for web-order Accept printout that sends a `printer_agent`
block gated by two keys (`print_kot` + `scan_order_auto_print`)? Does the FE send that block or
not? And there should be **no** `order-temp-store` call.
**Confidence:** HIGH (code traced on this branch).

---

## 1. Summary / root finding

**The code shipped on this branch does NOT implement the Option-A "payload parity" reply that was
pasted.** It implements the *later, superseding* CR-559 FINAL direction. Concretely, on Accept the FE:

- **does NOT** put a `printer_agent` block on the confirm payload, and
- **DOES** fire a separate `printOrder(...) → /order-temp-store` call.

That is the opposite of the Option-A reply ("add `printer_agent` to the accept payload … do NOT
also call `printOrder` after accept") and the opposite of the owner's stated expectation
("there should not have order-temp-store call").

Classification: **OWNER_DECISION CONTRADICTION** — two same-day (2026-11-20) owner decisions point
opposite ways. Owner must confirm which is authoritative before any code change.

---

## 2. Does the CR exist, and is it web-only? — YES

- **CR-559** "Web/Scan Accept KOT auto-print" (imported from `CR-554-investigation-to-impact.zip`,
  renumbered). Registry status = **IMPLEMENTED (Gate-4)**, pending QA (`CR_REGISTRY.md` line 3).
- **Web/scan orders only.** Gate is `order.isWebOrder` — aggregator and all other order types are
  untouched (matches backend note "only for web order; nothing touches aggregator").

## 3. Does the FE send a `printer_agent` block on the confirm payload? — NO

- `api/services/orderService.js:70` `confirmOrder(orderId, roleName, orderStatus)` — 3-arg, no agents.
- `api/transforms/orderTransform.js:1842` `toAPI.updateOrderStatus` → `{ order_id, role_name,
  order_status }` only. **No `printer_agent` key.**
- So `PUT CONFIRM_ORDER` (`waiter-dinein-order-status-update`) is sent WITHOUT `printer_agent`.
- This is deliberate: **OD-1 (Option-A payload parity) was SUPERSEDED** — see
  `OWNER_DECISIONS_2026_11_20.md` L48 ("no `printer_agent` on the confirm payload; confirm endpoint
  untouched") and `CR_REGISTRY.md` L3 ("no `printer_agent` on confirm payload (OD-1 superseded)").

## 4. Gating keys — it is NOT `print_kot` + `scan_order_auto_print`

- Actual gate (`pages/DashboardPage.jsx:1379`): `if (order.isWebOrder && settings?.scanOrderAutoPrint)`.
- The only **settings** key is **`scan_order_auto_print`** (`scanOrderAutoPrint`), plus the
  `isWebOrder` flag. `print_kot` is **not** read or sent by the FE here.
- This matches the Option-A reply's own rule: "Do NOT send `print_kot`. The backend ignores it and
  decides itself." So gating "by `print_kot` + `scan_order_auto_print`" is **incorrect** — only
  `scan_order_auto_print` gates on the FE side; `print_kot` is backend-owned.

## 5. Is there an `order-temp-store` call? — YES (contradicts the requirement)

- `pages/DashboardPage.jsx:1386`:
  `await printOrder(order.orderId, 'kot', stationKot, order, 0, {}, printerAgents || [])`.
- `printOrder` → `POST PRINT_ORDER` = **`/api/v1/vendoremployee/order-temp-store`**
  (`api/constants.js:109`), followed by `update-print-status kot_print:'Yes'`
  (`CONFIRM_PRINT_STATUS`, CR-512).
- The `printer_agent` block IS built — but it rides **inside the order-temp-store payload**
  (via `selectAgentsForKot` in `orderService.printOrder`), **not** on the confirm payload.
- Reversal is explicit: `OWNER_DECISIONS_2026_11_20.md` L53 — "Accept reuses the manual-KOT process
  (`printOrder('kot', ...)` → order-temp-store + update-print-status `kot_print:'Yes'`). Prior
  'no printOrder after accept' rule reversed."

## 6. Data-flow trace (current branch)

Accept tile / ScanOrderPopOut `onAccept` → `DashboardPage.handleConfirmOrder` (L1364)
→ `confirmOrder()` → `PUT waiter-dinein-order-status-update` **{order_id, role_name, order_status}**
(no printer_agent) → **IF** `isWebOrder && scanOrderAutoPrint` → `printOrder('kot', …)`
→ `POST /order-temp-store` (carries printer_agent via selectAgentsForKot) → `update-print-status`.
**Break point vs spec:** printer_agent is on `/order-temp-store`, not on confirm; and the
`/order-temp-store` call exists at all.

## 7. Option-A reply (pasted) vs shipped code

| Item | Option-A reply (pasted) | Shipped on this branch |
|---|---|---|
| `printer_agent` on confirm payload | YES | **NO** (OD-1 superseded) |
| `printOrder` / `order-temp-store` after accept | **NO** ("do not") | **YES** (OD-FINAL L53) |
| BILL agent appended | YES (OD-3) | **NO**, KOT only (OD-3 superseded) |
| `print_kot` sent by FE | NO (backend decides) | NO (consistent) |
| Gate | scan_order_auto_print (OD-4) | isWebOrder + scan_order_auto_print (consistent) |
| Scope | web only | web only (consistent) |

## 8. Recommendation (no code — owner decides)

Two shipped owner decisions conflict. Confirm the authoritative one:

- **If Option-A (pasted) is authoritative** (printer_agent on confirm, NO order-temp-store):
  the shipped CR-559 must be reworked — drop the `printOrder → order-temp-store` call in
  `handleConfirmOrder` and thread `printerAgent` into `confirmOrder` → `toAPI.updateOrderStatus`.
  This reverses what is currently in the branch.
- **If CR-559 FINAL (OD-FINAL v3) is authoritative**: current code is correct; the
  order-temp-store call is intentional and the pasted Option-A reply is stale.

Registry note: `CR_REGISTRY.md` L3 (IMPLEMENTED) is current; L5 "Code Reality = NONE" is an older
chronological entry, not live drift.
