# POS3.0 Bug-Fix Planning Closure Addendum — 2026-05-18

**Companion to:** `/app/memory/change_requests/final_sprint_reconciliation/POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md`

**Purpose:** Final planning-closure pass before any implementation begins. This addendum freezes the ready list, the blocked list, the dependency list, the backend question packet, and the explicit do-not-implement list for the first implementation agent.

**Constraint:** Planning only. No code changed. No baseline updated. No QA executed.

---

## 1. Final List of Bugs READY for Implementation NOW

These are frontend-only items with no backend dependency, no owner clarification needed, and no inter-bug sequencing required. They live in **Bucket A** of the master plan.

| # | Bug | Priority | Owner | One-line scope | Primary file(s) |
|---|---|---|---|---|---|
| 1 | BUG-102 | P0 | Frontend | Replace hardcoded 8s `setTimeout` on Mark Ready / Mark Served with socket-response-driven reset + ~2s fallback safety net | `OrderCard.jsx`, `DashboardPage.jsx` |
| 2 | BUG-089 | P1 | Frontend | Stop the redundant `get-single-order-new` API call inside `handleUpdateFoodStatus` for item-status events (keep room-transfer path until BUG-088 ships) | `socketHandlers.js`, `socketEvents.js`, `useSocketEvents.js`, `orderService.js` |
| 3 | BUG-100 | P1 | Frontend | Build notification source map; remove/suppress local toasts that duplicate socket/FCM events; document missing socket coverage | `NotificationContext.jsx`, `OrderEntry.jsx`, `CollectPaymentPanel.jsx` (cross-cutting) |
| 4 | BUG-103 | P2 | Frontend | Hide native ▲▼ spinner on all `input[type=number]` (preferred: one global CSS rule in `index.css`) | `index.css` (preferred) or 6 inputs in `CollectPaymentPanel.jsx` |

**Total ready now: 4 bugs** — all in Bucket A.

Recommended implementation order: **BUG-102 → BUG-089 → BUG-103 → BUG-100**.

---

## 2. Final List of Backend-BLOCKED Bugs

These cannot ship until backend responds to the specific questions in §4. They live in **Bucket B** (critical) and **Bucket C** (normal/low) of the master plan.

### Bucket B — Backend-blocked critical (2 bugs)

| # | Bug | Priority | Owner | Blocking question IDs | Scope (after unblock) |
|---|---|---|---|---|---|
| 1 | BUG-087 | P0 | Joint | Q-087-1, Q-087-2 | Trace `paymentMethod` end-to-end; finalize PayLater PAID-badge exclusion |
| 2 | BUG-088 | P1 | Joint | Q-088-1, Q-088-2, Q-088-3 | Switch room-transfer endpoint v1 → v2, adjust payload, consume v2 socket event, then remove optimistic clearing |

### Bucket C — Backend-owned / backend-first (6 bugs)

| # | Bug | Priority | Owner | Blocking question / status | Scope (after unblock) |
|---|---|---|---|---|---|
| 3 | BUG-090 | P2 | Backend → FE | Q-090-1 | Send `customer_id` in room check-in payload after backend accepts the field |
| 4 | BUG-091 | P2 | Backend (CRM) | None — CRM team owns dedup; FE optional client-side dedup | None on FE unless CRM cannot ship |
| 5 | BUG-092 | P2 | Backend → FE | Q-092-1 | Align phone formatting consistently after backend confirms `+91` vs raw 10 digits |
| 6 | BUG-093 | P3 | Backend → FE | None — backend ships `room_info.checkin_date`; FE prefers it over `createdAt` | FE consumes the new field |
| 7 | BUG-094 | P3 | Backend → FE | Q-094-1 | Switch `handleDeliveryAssignOrder` to payload-driven pattern after backend adds payload |
| 8 | BUG-101 | P3 | Backend only | Q-101-1 | None on FE (FE already sends `delivery_charge_gst_amount`) |

**Total backend-blocked: 8 bugs** (2 critical + 6 normal/low).

---

## 3. Final List of Sequential / Dependency Bugs

These bugs **cannot start** until specific other bugs are implemented AND QA-verified. They live in **Bucket D** of the master plan.

| # | Bug | Priority | Owner | Pre-conditions | Scope |
|---|---|---|---|---|---|
| 1 | BUG-095 | P2 | Frontend | **Both** BUG-088 (Bucket B) **and** BUG-089 (Bucket A) must be implemented AND QA-green | Delete `handleUpdateFoodStatus`, remove `UPDATE_FOOD_STATUS` event wiring, delete `fetchSingleOrderForSocket` (only after grep confirms no other consumer), update stale comments |

**Total sequential: 1 bug.**

Additionally, **within BUG-088** there is an internal sequencing rule: removal of the optimistic-clearing block at `OrderEntry.jsx` L1469-1483 happens **only after** the v2 socket event has been observed live in QA. This is a same-bug follow-up commit, not a separate bug.

---

## 4. Backend Question Packet (Ready to Copy)

Copy the block below verbatim to backend.

```
POS3.0 Bug-Fix Sprint — Backend Clarification Packet
====================================================

Sprint: pos3.0
Branch: 18-may-pos3.0
Planning Commit: 0e0bf0a
Date: 2026-05-18

We have 9 questions blocking 7 bugs. Please answer each by Q-ID.

---

BUG-087 — PayLater "PAID" badge shows incorrectly on dashboard
--------------------------------------------------------------

Q-087-1
What is the canonical `payment_type` value sent by backend for
PayLater orders — `'prepaid'` or `'postpaid'`?

Q-087-2
Does the socket order payload (`new-order`, `update-order`,
`update-order-paid`, `update-order-status`) include the
`payment_method` field for PayLater orders, and what exact string
value does it carry (e.g., `'paylater'`, `'PayLater'`,
`'pay_later'`)?

---

BUG-088 — Room transfer v1 → v2 endpoint + socket migration
-----------------------------------------------------------

Q-088-1
Is the endpoint `POST /api/v2/vendoremployee/order/order-shifted-room`
live on backend today? If not, ETA?

Q-088-2
Does the v2 endpoint accept the same payload keys as v1, i.e.:
{ order_id, payment_mode, payment_amount,
  payment_status: 'paid', room_id, order_discount, self_discount,
  comm_discount, tip_amount, vat_tax, gst_tax, service_tax,
  service_gst_tax_amount, tip_tax_amount }
or a different shape? If different, please share the v2 payload
spec.

Q-088-3
Which v2 socket event does backend emit after a successful room
transfer — `update-order-paid`, `update-order`, or a new event
name? Will it carry the full order payload (`{ orders: [...] }`)
like other v2 events?

---

BUG-090 — Store CRM customer_id on room orders
----------------------------------------------

Q-090-1
Does `POST /api/v1/vendoremployee/pos/user-group-check-in`
already accept a `customer_id` field?
- If yes, what is the exact field name and where in the payload
  does it sit?
- If no, can backend add it this sprint and confirm the field name?

---

BUG-092 — Phone format contract for room check-in
-------------------------------------------------

Q-092-1
What phone format does backend expect / store for room check-in
and CRM search — `+91XXXXXXXXXX` (E.164) or raw `XXXXXXXXXX`
(10 digits)?
Please confirm the format is identical across:
  - room check-in storage,
  - CRM search query parameter,
  - CRM-returned customer records.

---

BUG-094 — delivery-assign-order socket missing payload
------------------------------------------------------

Q-094-1
Can backend include the full order payload in the
`delivery-assign-order` socket event (same shape as v2
`update-order-paid`)? If yes, ETA?

---

BUG-101 — Print template GST display slot
-----------------------------------------

Q-101-1
Does the bill print template currently have a display slot for
`delivery_charge_gst_amount` (added to the FE payload in POS2.0
BUG-083)?
- If yes, no further work needed; please confirm and close.
- If no, can the print template be updated this sprint?

---

Backend-only items (no FE blocker; please ship as ready)
--------------------------------------------------------

BUG-091  — CRM team to deduplicate `GET /pos/customers?search=<phone>`
           results before returning.
BUG-093  — Add `room_info.checkin_date` to the response of
           `POST /api/v2/vendoremployee/get-single-order-new`
           for in-house rooms.

---

End of packet. Please respond per Q-ID.
```

**Questions count:** 9 backend questions covering 7 of the 8 backend-blocked bugs. BUG-091 and BUG-093 are backend-only deliveries that require no answer back to FE (notify when shipped).

---

## 5. Owner Question Status

**Owner questions remaining: 0.**

All owner-clarification gates for the 13 in-scope bugs were satisfied during the impact-analysis phase:
- BUG-102: Owner already provided the correct behavior (socket-response-driven; ~2s fallback max).
- All remaining BUG-087 → BUG-103 items either have a clear owner-approved scope or fall under backend clarification (handled in §4).

Owner questions for items **outside this plan** (BUG-096, BUG-097, BUG-104–108) are tracked under the separate POS3.0 CR sprint and are explicitly out of scope here.

---

## 6. Should the Implementation Agent Start Only with Bucket A?

**Yes. The first implementation agent must start with Bucket A only.**

Rationale:
- Bucket A has zero backend dependencies and zero inter-bug sequencing.
- Bucket A covers both P0 (BUG-102) and the P1 frontend optimizations (BUG-089, BUG-100), delivering immediate user-visible improvements while backend answers the §4 packet.
- Buckets B, C, D **must not start** until their respective unblock conditions are met.

The recommended Bucket A order remains: **BUG-102 → BUG-089 → BUG-103 → BUG-100**.

---

## 7. Exact Do-Not-Implement List for the First Implementation Agent

The first implementation agent **MUST NOT** touch any of the following until explicitly unblocked.

### Do-not-implement (this sprint — blocked or sequential)

| Bug | Reason |
|---|---|
| BUG-087 | Blocked on Q-087-1, Q-087-2 |
| BUG-088 | Blocked on Q-088-1, Q-088-2, Q-088-3 |
| BUG-090 | Blocked on Q-090-1 |
| BUG-091 | Backend-owned (CRM dedup); FE-side dedup only if CRM cannot ship |
| BUG-092 | Blocked on Q-092-1 |
| BUG-093 | Backend-owned; consume when shipped |
| BUG-094 | Blocked on Q-094-1 |
| BUG-095 | Sequential — requires BUG-088 + BUG-089 implemented AND QA-green |
| BUG-101 | Backend-owned; awaits Q-101-1 |

### Do-not-implement (out of scope of this plan entirely)

| Item | Reason |
|---|---|
| BUG-096 | CR — Realtime FE updates for menu + hold/unpaid orders |
| BUG-097 | CR — Delivery dispatch + assign delivery boy |
| BUG-098 | CR — Use restaurant profile CRM key instead of env keys |
| BUG-099 | CR — QSR/Cafe quick billing UX optimization |
| BUG-104 | CR — Credit / Tab Management new module |
| BUG-105 | CR — Settlement new module |
| BUG-106 | CR — CRM Notes integration |
| BUG-107 | CR — CRM Cross-sell / Upsell insights |
| BUG-108 | CR — CRM Coupon / Loyalty / Wallet integration |

### Do-not-touch (process / artifacts)

| Path / Action | Reason |
|---|---|
| `/app/memory/final/` (any file) | Frozen baseline — modify only after full QA + owner reconfirmation |
| `/app/memory/BUG_TEMPLATE.md` | Source of truth for intake; do not edit |
| `/app/memory/change_requests/final_sprint_reconciliation/BUSINESS_RULES_PENDING_FREEZE_ITEMS_2026_05_15.md` | Pending-freeze list — separate approval cycle |
| Removing optimistic-clearing block in `OrderEntry.jsx` L1469-1483 | Allowed only after BUG-088 ships AND v2 socket observed live in QA |
| Deleting `fetchSingleOrderForSocket` | Allowed only inside BUG-095 (Bucket D), after pre-conditions met |
| Deleting `handleUpdateFoodStatus` | Allowed only inside BUG-095 (Bucket D) — BUG-089 must only no-op it for item-status events |

---

## 8. Final Confirmations

- ✅ **No code was written, modified, or executed** during this planning closure pass.
- ✅ **`/app/memory/final/` was not updated** (frozen baseline preserved).
- ✅ **`/app/memory/BUG_TEMPLATE.md` was not modified.**
- ✅ **No QA was executed.**
- ✅ **The main planning document `POS3_0_BUG_FIX_MASTER_IMPLEMENTATION_PLAN_2026_05_18.md` was not modified** (no clear mistakes detected during this closure pass).
- ✅ **This addendum is the planning-closure freeze** for the POS3.0 Bug-Fix Sprint. The first implementation agent may begin Bucket A on owner go-ahead.

---

*— End of POS3.0 Bug-Fix Planning Closure Addendum — 2026-05-18 —*
