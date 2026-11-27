# CR-552 — Impact Analysis (Gate 2)

**Item:** CR-552 · Per-item approval for web-order items (item-level Yet-to-Confirm) — **WEB ORDERS ONLY**
**Date:** 2026-11-18 · **Role:** PLANNING (Gate 2 only — Impact Analysis; Implementation Plan NOT written, per owner request)
**Severity:** P1 · **Risk:** HIGH (multiple R5 hotspots + socket-driven order state + likely backend dependency)

---

## Header — Code Reality + Conflict Pre-Check

**Code Reality: PARTIAL.**
- EXISTS (order-level, web-scoped): `OrderCard.jsx:1003` `isWebYetToConfirm` → Accept/Reject footer; `ScanOrderPopOut.jsx` popup for whole web order at `fOrderStatus===7`; CR-545 per-item **cancel** (CancelFoodModal) inside the scan popup; `TableCard.jsx:379` web-only snooze.
- MISSING (this CR): item-level not-confirmed **render + label + discovery** and per-item **approve** for items added by a **web edit** to an already-confirmed order (order stays `f_order_status=2`, line is `food_status=7`).

**Conflict Pre-Check (FILE_OWNERSHIP + registry):**
| Target file | Status | Note |
|---|---|---|
| `api/transforms/orderTransform.js` | **R5 HOTSPOT** | Repeatedly "NOT touched (R5)"; owned by BUG-664/538/536, CR-409/412. High regression surface. |
| `components/order-entry/CartPanel.jsx` | **R5 HOTSPOT** | CR-482 P10, BUG-527 F2/F3/F4. High-traffic cart renderer. |
| `components/cards/OrderCard.jsx` | ACTIVE | BUG-573/576/584/585/586, CR-430 (Oct-2026). |
| `components/cards/ScanOrderPopOut.jsx` | **ACTIVE CONFLICT** | CR-545 IMPLEMENTED 2026-11-17 (per-item cancel); CR-533 + CR-534 at Gate 1 pending. Any popup change must sequence AFTER CR-545 and coordinate with CR-533/534. |
| `api/transforms/reportTransform.js` | moderate | `getFoodStatusLabel` map. |
| `api/constants.js` | moderate | BUG-599 (API_LOADING_ORDER). `F_ORDER_STATUS` is order-level. |

**Execution-order declaration:** CR-552 touches `ScanOrderPopOut.jsx` only IF OD-552-03 includes the popup → then **CR-552 AFTER CR-545**, and coordinate with CR-533/CR-534 (same file, Gate 1). Non-popup edits (orderTransform/CartPanel/OrderCard item rows/reportTransform/constants) are parallel-safe with current open items (no open item edits those lines).

---

## 1. Data flow (API/socket → transform → component → UI)

```
Customer web-edits order (adds item)
   │
   ├─ FCM push  → title "Please confirm this order", data.sound=forty_five_sec_buzzer,
   │              NO data.type, fcmOptions.link=/dashboard  → plays buzzer, lands on dashboard (no deep-link)
   │              (POS2-007 confirm override does NOT fire — see OD-552-05)
   │
   └─ Socket  new_order_672 → "update-order", args[3] f_order_status = 2 (UNCHANGED),
              args[4].orders[].orderDetails[].food_status = 7  (+ args[4].newly_added_items, currently ignored)
                 │
                 ▼
      orderTransform.orderItem (L112-166):  status = mapOrderStatus(detail.food_status)
                 │                                 = F_ORDER_STATUS[7] = 'pending'   ← COLLISION (item reuses order token)
                 ▼
      CartPanel.getItemStatusIcon(item.status)  (L43):  no 'pending'/'notConfirmed' case → default → orange CookingPot
      OrderCard item rows:  render same, no per-item action
      reportTransform.getFoodStatusLabel(7):  map has {1,2,3,5,6}, no 7 → 'Unknown'
```

**Root of invisibility:** three independent break points — (a) transform collapses item 7 into order-level `'pending'`; (b) item icon renderer has no not-confirmed branch; (c) report label map lacks key 7. None expose the state; no approve/reject action exists at item level for edits.

---

## 2. Affected files & lines

| # | File | Change area | Why | Risk |
|---|------|-------------|-----|------|
| A | `api/transforms/orderTransform.js` (orderItem ~L112-166; `mapOrderStatus` L34) | Emit a **distinct item-level flag** for `food_status===7` on web orders — e.g. `isNotConfirmed: detail.food_status === 7` (NOT by overloading `status`). Keep `status` mapping intact to avoid regressions. | Give the UI a clean, additive signal without disturbing existing status consumers. | **HIGH** (R5; many downstream readers of `status`) |
| B | `components/order-entry/CartPanel.jsx` (`getItemStatusIcon` L43; item row L66+) | Add a **not-confirmed visual** (distinct icon/color/label) + per-item **Approve / Reject** controls on `item.isNotConfirmed`, gated `isWebOrder`. | The cart (open order-entry) must show & action unconfirmed lines. | **HIGH** (R5 renderer) |
| C | `components/cards/OrderCard.jsx` (item list ~L688-900; footer L997+) | Item-row not-confirmed marker + per-item Approve/Reject (web only). Reuse `handleAcceptClick/handleRejectClick` pattern at item granularity. | Dashboard card is the primary at-a-glance surface; edits have no popup. | MEDIUM-HIGH |
| D | `api/transforms/reportTransform.js` (`getFoodStatusLabel` L57-65) | Add `7: 'Yet to Confirm'` (or agreed label). | Stop reports printing 'Unknown' for status-7 lines. | LOW |
| E | `api/constants.js` (near `F_ORDER_STATUS` L366 / `STATUS_COLUMNS`) | Add item-level not-confirmed label/color token (do NOT repurpose order-level `F_ORDER_STATUS[7]`). | Single source for the new item state's label/color. | LOW-MEDIUM |
| F | `components/cards/ScanOrderPopOut.jsx` + `DashboardPage.jsx` | **ONLY IF** OD-552-03 says approval must also show in the scan popup. Mirror CR-545's per-item action slot. | Optional surface. | MEDIUM (conflict w/ CR-545/533/534) |
| G | a service (`orderService.js` / `foodService`) | New call to **approve a single web item** (`food_status 7 → 1`). **No such endpoint found** in `api/services/*`. | Approve must persist to backend. | **BACKEND-BLOCKED** (OD-552-01) |

**Discovery/badge (OD-552-04):** optionally mark the order/table card as "has unconfirmed items" even though `f_order_status=2` — would touch `OrderCard.jsx`/`TableCard.jsx` status derivation. Deferred pending decision.

---

## 3. Downstream consumers / regression surface
- Everything reading `item.status==='pending'` today (from `mapOrderStatus(food_status)`): if we **overload** `status`, these all shift. → **Chosen approach: additive `isNotConfirmed` flag, leave `status` untouched** to contain blast radius. (Edit A must be additive.)
- `soundManager` / `NotificationContext` — unchanged by this CR (tone is OD-552-05).
- KDS/KOT: web-added `food_status=7` lines — do they print on KOT today? (CR-545 handles cancel; approval may need to trigger KOT). Flag for Gate 3.
- `useOrderPollingReconciliation` / `useStationSocketRefresh` preserve `isWebOrder` and gate events — verify the new flag survives socket re-engage + polling (they already special-case web/YTC).

---

## 4. Risk classification
**HIGH.** Touches two R5 hotspots (`orderTransform.js`, `CartPanel.jsx`), realtime socket-driven order state, and an actively-edited file (`ScanOrderPopOut.jsx`, CR-545/533/534). Additive-flag strategy contains most regression risk, but approve-action correctness + backend endpoint are unresolved. **Full gate required; Fast-Lane NOT eligible.**

---

## 5. Owner Decision Queue (Rule R3 — do not guess business rules)
- **OD-552-01 (approve semantics + backend):** Approving a web-added item = set that line `food_status 7→1` individually? Is there/should there be a **single-item approve API**? (None found in `api/services`.) Or does "approve" re-confirm the whole order? — **blocks implementation.**
- **OD-552-02 (reject):** Reject a web-added item = cancel it (`food_status→3`, reuse CR-545 `CancelFoodModal`)? Or a distinct "reject web item" event?
- **OD-552-03 (surfaces):** Where must approval appear — CartPanel (order-entry), OrderCard (dashboard), ScanOrderPopOut (popup), or all? (Edits have **no** popup, so CartPanel + OrderCard are the minimum.)
- **OD-552-04 (discovery):** Should an order/table with unconfirmed items show a badge even though `f_order_status=2`?
- **OD-552-05 (confirm tone):** Investigation proved POS2-007 override is **dead** vs the live push (no `data.type`, explicit `forty_five_sec_buzzer`). Fix tone within CR-552, or keep separate (POS2-008 backend)? Recommend **separate** → out of CR-552 scope.

---

## 6. Handover
Impact Analysis complete for CR-552. **Awaiting owner review → Gate 3 (Implementation Plan).**
Code reality: PARTIAL. Scope: WEB-only, additive `isNotConfirmed` flag strategy. Hotspots: orderTransform.js (R5), CartPanel.jsx (R5), ScanOrderPopOut.jsx (CR-545 active).
Owner decisions needed: **OD-552-01..05** (01 blocks impl — backend endpoint). Backend dependency: LIKELY (single-item approve).
Implementation Plan NOT written (owner asked for Impact Analysis only).
