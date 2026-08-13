# POS_FINAL_1_0 — Bug Implementation Plan — Bucket 1

| Field | Value |
| --- | --- |
| Sprint | `pos_final_1.0` |
| Bucket | 1 — Ready FE-only bugs |
| Bugs Covered | **BUG-044, BUG-045, BUG-046** |
| Planning Date / Time (UTC) | 2026-05-11 16:35 |
| Repo / Branch | `core-pos-front-end-` / `12-may-bugs` (HEAD `22bedc3`) |
| Analysis Source | `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` |
| Code Changes Made | **NONE** — planning-only |
| `/app/memory/final/` Updated | **NO** |
| `BUG_TEMPLATE.md` Updated | **NO** |

---

## 1. Docs Read (in mandatory order)

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md`
- `ARCHITECTURE_DECISIONS_FINAL.md` — Socket-driven realtime, CR-008 delivery-charge capture, CR-013 delivery GST encoding.
- `MODULE_DECISIONS_FINAL.md` — Dashboard YTC, Scan Pop-out (POS2-002 Phase 4), Billing / Collect Bill, Reports.
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md`
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md`
- `FINAL_DOCS_SUMMARY.md`

### Accepted Overlay Docs (`/app/memory/change_requests/`)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### Analysis & Intake
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` (full)
- `/app/memory/BUG_TEMPLATE.md` lines 3643–3704 (BUG-044), 3708–3778 (BUG-045), 3781–3845 (BUG-046)

### Code Re-inspected (for plan-fidelity)
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (handlers L244–275, item render L397–421, backdrop L298–303 `z-[9999]`)
- `frontend/src/pages/DashboardPage.jsx` (`handleTableClick` L1267–1302, `handleCancelOrderFromCard` L1429–1439, pop-out wiring L1463–1471)
- `frontend/src/components/order-entry/OrderEntry.jsx` (overlay L1013 `z-50`, `total` derivation L644–698, deliveryCharge state L165)
- `frontend/src/components/order-entry/CancelOrderModal.jsx` (overlay L27 `z-[100]`)
- `frontend/src/components/order-entry/CartPanel.jsx` (delivery input L711–742, Collect Bill button L850–869)
- `frontend/src/components/order-entry/CollectPaymentPanel.jsx` (`deliveryChargeInput` L162–166, totals L350–432)
- `frontend/src/api/transforms/orderTransform.js` (`fromAPI.orderItem` L106–148 — confirms `qty` / `price` / `unitPrice`, **no `total` / `amount` / `quantity`** keys)
- `frontend/src/api/socket/socketHandlers.js` (`handleUpdateOrder` L229–305, `handleUpdateTable` L512–540, `syncTableStatus` L113–131)
- `frontend/src/contexts/OrderContext.jsx` (`orderItemsByTableId` L295–330)

---

## 2. Baseline Conflict Check

**No conflict.** Both BUG-046 and BUG-044 intersect with established CRs but the planned changes are surgical and stay within the spirit of:
- CR-008 D1-Cap (delivery-charge capture) — unchanged by BUG-046 plan; we only fix the visual lag on placed-branch `total`.
- BUG-019 readOnly lock — unchanged; the readOnly predicate at `CollectPaymentPanel.jsx:938` is preserved.
- POS2-002 Phase 4 (Scan Popup) — BUG-045 plan keeps the "reuse existing handlers verbatim" rule; we only fix z-index and item-key mapping.
- Socket-driven realtime contract — BUG-044 adds a derived FE safety-net keyed to `t.isOccupied` becoming false; it does **not** introduce a new socket event or change the terminal-status removal predicate.

---

# 3. Per-Bug Plans

## ──────────────────────────────────────────────────────────────
## BUG-045 — Scan / Web Pop-up: Comprehensive Refresh (45a–45n)
## ──────────────────────────────────────────────────────────────

> This section was **refreshed on 2026-05-11** to widen the scope from the
> original 45a / 45b / 45c (View / Reject / ₹0.00) to the owner-confirmed
> full set **45a–45n** per Impact Analysis Addendums 1 & 2
> (`POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md` lines 937–1116). The earlier 3-defect
> plan is fully subsumed by this refresh; the BUG-045 Test Plan and
> Owner-Friendly explanation lower in this file are superseded by the
> **Validation Plan** and **Recommended Final UI** sections inside this
> refreshed block.

# BUG-045 Implementation Plan

## Sprint
`pos_final_1.0`

## Planning Status
**Planning complete — waiting for owner approval before implementation.**

## Source Documents Read

### Baseline (`/app/memory/final/`)
- `FINAL_DOCS_APPROVAL_STATUS.md` (approval gate + reading order)
- `ARCHITECTURE_DECISIONS_FINAL.md` (socket-driven realtime, hotspot rules)
- `MODULE_DECISIONS_FINAL.md` (POS2-002 Phase 4 Scan Pop-out module)
- `CHANGE_REQUEST_PLAYBOOK.md`
- `IMPLEMENTATION_AGENT_RULES.md` (high-risk-area guardrails — `DashboardPage.jsx` listed)
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` (no open question intersects BUG-045)
- `FINAL_DOCS_SUMMARY.md`

### Accepted Overlay Docs (`/app/memory/change_requests/`)
- `BASELINE_RECONCILIATION_REPORT_2026_05_04.md`
- `FINAL_ACCEPTANCE_AND_DOC_SWEEP_2026_05_04.md`
- `PENDING_TASK_REGISTER_2026_05_04.md`
- `PENDING_WORK_BUCKETING_AND_NEXT_ACTIONS_2026_05_06.md`
- `BACKEND_FIELD_UNPARK_DECISION_2026_05_06.md`
- `LAST_SPRINT_CODE_FIX_VALIDATION_2026_05_06.md`

### BUG-045 Specific
- `/app/memory/BUG_TEMPLATE.md` (BUG-045 intake lines 3708–3778)
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPACT_ANALYSIS.md`
  - **Base Analysis** lines 837–934
  - **Addendum 1 (2026-05-11)** lines 937–1046 — widened scope, owner-confirmed per-type field list, PAID badge
  - **Addendum 2 (2026-05-11)** lines 1049–1116 — Reuse Map + final field confirmations, 45n added
- `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md` (this file, prior BUG-045 section now superseded)

### Code Re-inspected (current truth — `12-may-bugs @ cf36343`)
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (full file 1–513)
  - Backdrop L298–303 `z-[9999] bg-black/60 backdrop-blur-sm`
  - `formatChannelLabel` L90–105 (reusable)
  - `formatLocation` L107–116 (hard-codes `'Delivery address on file'` placeholder → 45h root)
  - `formatItemCount` L118–123 (uses wrong key `it?.quantity`; canonical is `qty`)
  - Customer line L381–395 (already shows name + phone — 45k already partially OK)
  - Item list L397–421 (reads `it?.quantity`, `it?.total ?? it?.amount` — 45c + 45m roots; **does not render** variation / addOns / notes — 45d + 45e + 45f roots)
  - Buttons: View L473–483, Reject L484–494, Accept L495–505
- `frontend/src/pages/DashboardPage.jsx`
  - `<ScanOrderPopOut/>` wiring L1463–1471
  - `orderEntryType` state L411, `cancelOrderEntry` state L427
  - `handleTableClick` L1267–1302 — works for delivery / takeAway / walkIn (no early return on missing `tableId`)
  - `handleCancelOrderFromCard` L1429+ — works for web orders
- `frontend/src/components/reports/OrderDetailSheet.jsx` L325–400 (`OrderItemCard` — exact JSX pattern for item rows: qty / unit price / variations / add-ons / italic notes)
- `frontend/src/components/cards/OrderCard.jsx` L328–331 (PAID badge JSX + predicate `order.paymentType === 'prepaid' && order.fOrderStatus !== 8`)
- `frontend/src/components/order-entry/AddressPickerModal.jsx` L70 (address join one-liner `[addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')`)
- `frontend/src/api/transforms/orderTransform.js`
  - `fromAPI.orderItem` L106–148 — emits `qty`, `unitPrice`, `price`, `variation` (singular array), `addOns`, `notes`, `isComplementary`, `isComplementaryRuntime`
  - `fromAPI.order` L153–295 — emits `tableNumber` (L195), `tableSectionName` (L196), `customerName` / `phone` (L202–203), `paymentType` / `paymentMethod` (L214–215), `orderNote` (L272), `deliveryAddress` raw passthrough (L279), `deliveryCharge` (L280), `fOrderStatus` (L189)

## Baseline Conflict Check

**No baseline conflict found.**
- POS2-002 Phase 4 contract ("pop-out reuses existing YTC handlers verbatim, no new business workflow, no API/socket/payload change") is preserved — we only fix presentation/wiring inside the same single file plus one prop on DashboardPage.
- `IMPLEMENTATION_AGENT_RULES.md` high-risk hotspots list `DashboardPage.jsx`; the change to it is a **single new prop wiring** (`suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}`) — no logic, no handler, no state change.
- `OPEN_QUESTIONS_FINAL_RESOLUTION.md` open items (OQ-07 reports, OQ-12 room billing) do not intersect this bug.
- `orderTransform.js` is on the hotspot list but **planning explicitly avoids any change to it** — every field listed under "Data Mapping Plan" is already produced by the current transform (Addendum 2 § "Confirmed: every needed field is already mapped").

## Bug Summary

The web/scan incoming-order pop-up does not give the cashier enough information to confidently Accept or Reject. Today it (a) appears unresponsive on View / Reject clicks because the underlying screens open behind the pop-up's `z-[9999]` backdrop, (b) renders every item line as `₹0.00` and omits the qty prefix because it reads wrong field keys (`it.quantity` / `it.total` / `it.amount` vs canonical `qty` / `unitPrice`), and (c) is missing structural information that already exists in `orderTransform` — variations, add-ons, item notes, order note, real delivery address, payment status, PAID badge, delivery charge, delivery instructions, dine-in section + table number. Sub-defects 45a–45n consolidate the full owner-confirmed scope. All fixes are FE-only and localised to one component plus a single prop wiring on the dashboard.

---

## Recommended Final UI

> Reuses existing app patterns (Item row from `OrderDetailSheet.jsx`,
> PAID badge from `OrderCard.jsx`, address-join from `AddressPickerModal.jsx`,
> `formatChannelLabel` from `ScanOrderPopOut.jsx`). No new components,
> no new helper files, no new CSS modules. Field reads come from the
> existing `orderTransform.js` output — see Data Mapping Plan.

### Dine-In QR Popup UI
- **Header:** `Dine-In · {tableSectionName} · {tableNumber}` (existing `formatChannelLabel(orderType)` for the `Dine-In` token; `·`-join the rest).
- **Sub-header:** Customer name + phone if `order.customerName` truthy — existing customer block already in `ScanOrderPopOut.jsx` L381–395 stays as-is.
- **Badges:** none specific to Dine-In QR (no PAID badge unless `paymentType === 'prepaid' && fOrderStatus !== 8` — typically not for QR dine-in).
- **Order note:** if `order.orderNote` truthy, render one italic line above the items list: `Order Note: "{orderNote}"` (italic, small, neutral grayText).
- **Items:** reuse the OrderDetailSheet item-card pattern (see "Items (all order types)" below).
- **Fallbacks:**
  - If both `tableSectionName` and `tableNumber` are blank → header renders `Dine-In · —` (single em-dash; do **not** show "Dine-In · ·").
  - If only one of section / table is present → show only the populated one.

### Delivery Popup UI
- **Header:** `Delivery · {addr.address}, {addr.city}, {addr.pincode}` (join with `, ` filtering blanks — exact `AddressPickerModal.jsx:70` one-liner). When `deliveryAddress` is `null` / empty → header degrades to `Delivery · —` (no more `Delivery address on file` placeholder).
- **Sub-header:** Customer name + phone (existing customer block already shows this).
- **Badges:**
  - `PAID` badge when `order.paymentType === 'prepaid' && order.fOrderStatus !== 8` (exact JSX from `OrderCard.jsx:329–330`: green pill, `#E8F5E9` bg, `COLORS.primaryGreen` text, 10px font, `data-testid="popout-paid-badge-{orderId}"`).
- **Delivery info:** italic helper row under header: `Payment: {paymentLabel}` where `paymentLabel = order.paymentType === 'prepaid' ? 'Prepaid' : (order.paymentMethod === 'cash_on_delivery' ? 'COD' : order.paymentMethod || '—')`.
- **Payment info:** `Delivery Charge: ₹{deliveryCharge.toFixed(2)}` rendered only when `Number(order.deliveryCharge) > 0`.
- **Delivery instructions:** if `order.deliveryAddress?.delivery_instructions` truthy → italic small line `Instructions: "{delivery_instructions}"` placed immediately under the address line. Hidden when blank.
- **Order note:** if `order.orderNote` truthy → italic line `Order Note: "{orderNote}"` above the items list.
- **Items:** see "Items (all order types)".
- **Fallbacks:**
  - `deliveryAddress` null → header `Delivery · —`; payment / delivery-charge / instructions all hidden.
  - `deliveryCharge` is `0` → row hidden (Delivery orders frequently use a flat zero charge — do not show `Delivery Charge: ₹0.00`).
  - `paymentType` blank → hide the Payment helper row entirely.

### Takeaway Popup UI
- **Header:** `Takeaway` (existing `formatChannelLabel('takeAway')`).
- **Sub-header:** Customer name + phone if present (existing block).
- **Badges:** PAID badge if prepaid (same predicate as Delivery) — keep visually consistent for cashiers who pre-pay take-away.
- **Order note:** italic line above items when `order.orderNote` present.
- **Items:** see "Items (all order types)".
- **Fallbacks:**
  - No customer name / phone → sub-header customer block hidden (existing behaviour — already conditional on `activeOrder.customerName`).

### Walk-In Popup UI
- **Header:** `Walk-In` (existing `formatChannelLabel('walkIn')`).
- **Sub-header:** Customer name + phone if present.
- **Badges:** none (walk-in is rarely prepaid in web/scan flow, but still show PAID badge if predicate matches — keeps logic uniform).
- **Order note:** italic line above items when `order.orderNote` present.
- **Items:** see "Items (all order types)".
- **Fallbacks:** same as Takeaway.

### Items (all order types — shared layout, reused from `OrderDetailSheet.jsx` L328–400)

Each item `<li>` renders:

```
[ qty× ItemName ]                                      ₹{lineTotal}
  variation: VariationName (+₹nn)         ← when variation array non-empty
  + AddOnName (+₹nn)                      ← when addOns array non-empty
  "Item note text"                        ← italic, gray, when notes truthy
  Comp                                    ← small badge when isComplementary / isComplementaryRuntime true
```

- `qty = Number(it.qty ?? it.quantity) || 1` (canonical: `qty`).
- `lineTotal = Number(it.unitPrice ?? it.price) * qty` (per-unit × qty — matches `OrderDetailSheet.jsx` math).
- Variation: iterate `it.variation || []` (singular array per `orderTransform.js:128`; each entry has `name` + optional `price`). Reuse the `pl-2 border-l-2 border-zinc-200` style from `OrderDetailSheet.jsx:370–377`, adapted to popup's color palette (`COLORS.borderGray`).
- Add-ons: iterate `it.addOns || []`. Reuse the `pl-2 border-l-2 border-amber-200` style.
- Notes: when `it.notes` truthy, render `italic` line `bg-zinc-50 px-2 py-1 rounded` with quoted text.
- **Comp tag**: `(it.isComplementary || it.isComplementaryRuntime) === true` → small pill `Comp` (10px font, neutral bg) placed inline after item name. The price column still shows `₹0.00` (legitimate) — the Comp tag distinguishes intentional zero from mapping bug.

### Complementary Item UI
- **Display rule:** Render item normally (name + qty prefix + variations + add-ons + notes).
- **Price rule:** Show `₹0.00` (the real unitPrice for comp items, per `orderTransform`).
- **Tag rule:** Render small `Comp` pill (text `Comp`, neutral bg `#F1F5F9`, dark text, 10px font, `data-testid="popout-item-comp-tag-{idx}"`) inline immediately after the item name, before the variations sub-line.
- **Fallbacks:** If `isComplementary === false && isComplementaryRuntime === false` but `unitPrice === 0` → still show `₹0.00` but **no** Comp tag (this is the diagnostic visual signal that something upstream is wrong; the cashier sees ₹0.00 without Comp and can flag it).

### Missing Data / Graceful Degrade UI
- **Table missing (`tableNumber` blank):** show only section if present, else `—`. Never show `Dine-In · undefined`.
- **Section missing (`tableSectionName` blank):** show only table number if present, else `—`.
- **Address missing (`deliveryAddress` null/empty):** header renders `Delivery · —`. Payment helper row + delivery charge + instructions all hidden.
- **Phone missing:** drop the `· {phone}` segment from the customer block (existing behaviour at L389–393 — already conditional).
- **Customer name missing:** the entire customer block stays hidden (existing behaviour at L381 — already conditional).
- **Delivery charge missing or 0:** hide the "Delivery Charge" row entirely (do not render `₹0.00`).
- **Notes missing:** hide the `Order Note:` italic line entirely; per-item notes block hidden per item when `it.notes` blank.
- **Variation / add-ons empty arrays:** sub-lines hidden per item (no empty containers).
- **`paymentType` blank:** hide the Payment helper row.
- **`paymentMethod` blank but prepaid:** show `Payment: Prepaid` (predicate already covers).

---

## Confirmed Root Cause From Analysis

| Sub-defect | Root cause type | Mechanism |
| --- | --- | --- |
| **45a — View no-op** | Presentation (z-index stacking) | `OrderEntry` overlay mounts at `z-50` (OrderEntry.jsx:1013); popup backdrop sits at `z-[9999]` and dims everything below → cashier sees no new screen. Handler **does** fire. |
| **45b — Reject no-op** | Presentation (z-index stacking) | `CancelOrderModal` mounts at `z-[100]` (CancelOrderModal.jsx:27); popup at `z-[9999]` covers it. Handler **does** fire. |
| **45c — ₹0.00 price** | Mapping (wrong key) | Popup reads `it?.total ?? it?.amount`; transform emits `unitPrice` + `qty`. Both nullish → `Number(undefined||undefined||0) = 0`. |
| **45d — Add-ons not shown** | Feature gap | Popup never reads `it.addOns`. Data is present on every YTC item (`orderTransform.js:129`). |
| **45e — Variations not shown** | Feature gap | Popup never reads `it.variation`. Data is present (`orderTransform.js:128`; **note singular key**). |
| **45f — Item notes not shown** | Feature gap | Popup never reads `it.notes` (`orderTransform.js:130` ← `detail.food_level_notes`). |
| **45g — Order note not shown** | Feature gap | Popup never reads `order.orderNote` (`orderTransform.js:272`). |
| **45h — Delivery address placeholder** | Feature gap | `formatLocation` (ScanOrderPopOut.jsx:113) hard-codes `'Delivery address on file'`. Real `order.deliveryAddress` object is fully populated. |
| **45i — Delivery charge + payment status missing** | Feature gap | Popup never reads `order.deliveryCharge` / `order.paymentType` / `order.paymentMethod`. |
| **45j — Section + Table for QR Dine-In** | Feature gap (graceful) | `formatLocation` does handle `tableSectionName + tableNumber` for non-blank case (L109–112); the broken case is when transform produces blanks for a walk-in (correctly), but for a real QR dine-in YTC, the existing branch already renders correctly. **No code change needed for the happy path** — explicit graceful degrade for `—` is the only ask. |
| **45k — Customer + phone for Take-away** | Already correct | Customer block at L381–395 already renders `customerName` + `phone` when present. **Verify on real take-away order** — no code change expected. |
| **45l — PAID badge missing** | Feature gap | Popup has no PAID badge. Pattern exists at `OrderCard.jsx:329–330` and predicate already encoded. |
| **45m — Quantity prefix missing** | Mapping (wrong key) | Popup reads `it?.quantity`; canonical is `it.qty` (transform `orderTransform.js:119`). |
| **45n — Delivery instructions not shown** | Feature gap | Popup never reads `order.deliveryAddress?.delivery_instructions`. Raw field flows through `orderTransform.js:279` passthrough. |

Net classification: **frontend feature gap + presentation bug** — single component (`ScanOrderPopOut.jsx`) plus one prop on `DashboardPage.jsx`. No backend, no API, no socket, no payload, no `orderTransform.js` change required.

---

## Strict Scope

### Allowed files
- `frontend/src/components/dashboard/ScanOrderPopOut.jsx` — primary file for all 45a–45n fixes.
- `frontend/src/pages/DashboardPage.jsx` — one prop wiring only (`suppressed={Boolean(orderEntryType) || Boolean(cancelOrderEntry)}`) at the `<ScanOrderPopOut/>` site (~L1463–1471). No handler / no state / no logic change.

### Allowed pattern references (READ-ONLY — lift JSX/predicate verbatim where possible)
- `frontend/src/components/reports/OrderDetailSheet.jsx` (item row layout with variations / add-ons / notes — L328–400)
- `frontend/src/components/cards/OrderCard.jsx` (PAID badge JSX + predicate — L329–330)
- `frontend/src/components/order-entry/AddressPickerModal.jsx` (address join — L70)
- `ScanOrderPopOut.jsx` itself (`formatChannelLabel` — L90; reused as-is)

### Not allowed
- No backend changes
- No API changes
- No `orderTransform.js` changes (code inspection proves every required field is already mapped — Addendum 2 § "Confirmed")
- No new helper files / utility modules
- No new components
- No CSS module changes
- No refactor of dashboard / order card / OrderEntry architecture
- No changes to unrelated modals (CancelOrderModal, OrderEntry, CollectPaymentPanel)
- No changes to reports, sockets, sounds, payments, print, KOT
- No changes to the Accept (`handleConfirmOrder`) flow — that is BUG-037 (separate ticket, currently blocked on backend)
- No changes to `buildTableEntryFromOrder`, `isUnconfirmedScanOrder`, `POPOUT_SNOOZE_MS`, snooze logic, or queue ordering

---

## File-Level Plan

| File | Planned Change | Reason | Risk |
| --- | --- | --- | --- |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (component signature, ~L136–144) | Add optional prop `suppressed` (boolean, default `false`). At the top of render (before the existing `if (queue.length === 0) return null;` check at L285), return `null` when `suppressed === true`. | Hide the pop-up while OrderEntry or CancelOrderModal is open → fixes 45a + 45b user-perceived no-op. | Low |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (backdrop className, L303) | Replace `z-[9999]` with `z-30`. Keep everything else (`bg-black/60 backdrop-blur-sm` etc.). | Defence-in-depth: `OrderEntry` (z-50) and `CancelOrderModal` (z-[100]) sit above the popup even if `suppressed` is missed in any future call-site. | Low |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (`formatLocation`, L107–116) | Rewrite per the per-order-type matrix in "Recommended Final UI": Dine-In uses section+table with `—` fallback; Delivery uses `[addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')` (or `—` if address null); Takeaway/Walk-In keep their existing labels; remove the `'Delivery address on file'` placeholder string. | Fixes 45h + 45j header rendering. | Low |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (`formatItemCount`, L118–123) | Replace `Number(it?.quantity)` with `Number(it?.qty ?? it?.quantity)`. | Fixes the silent "— items" / wrong-count fallback (canonical key is `qty`). | Low |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (header sub-block, between L379 customer block and L397 items block) | Insert (in this order, each conditional on data presence): (1) PAID badge — same JSX as `OrderCard.jsx:329–330`, predicate `activeOrder.paymentType === 'prepaid' && activeOrder.fOrderStatus !== 8`; (2) Payment helper row `Payment: {Prepaid \| COD \| paymentMethod}` when `paymentType` truthy; (3) `Delivery Charge: ₹{n.toFixed(2)}` when `Number(deliveryCharge) > 0`; (4) `Instructions: "{...}"` italic when `deliveryAddress?.delivery_instructions` truthy; (5) `Order Note: "{...}"` italic when `orderNote` truthy. All hidden when blank. | Fixes 45i (delivery charge + payment), 45l (PAID badge), 45n (delivery instructions), 45g (order note). | Medium (layout change) |
| `frontend/src/components/dashboard/ScanOrderPopOut.jsx` (item `<li>`, L404–417) | Rewrite the `<li>` body to use the `OrderDetailSheet.jsx:328–400` layout (adapted): qty prefix from `it.qty`, line total `Number(it.unitPrice ?? it.price) * qty`, variation sub-list from `it.variation || []`, add-ons sub-list from `it.addOns || []`, italic notes line from `it.notes`, `Comp` tag from `it.isComplementary \|\| it.isComplementaryRuntime`. Color tokens stay on the existing pop-up palette (`COLORS.darkText`, `COLORS.grayText`, `COLORS.borderGray`). | Fixes 45c (line price), 45d (add-ons), 45e (variations), 45f (item notes), 45m (qty prefix), complementary tag rule. | Medium |
| `frontend/src/pages/DashboardPage.jsx` (`<ScanOrderPopOut/>` props, L1463–1471) | Add one new prop: `suppressed={Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)}`. Both state variables already exist (L411, L427); no new state. | Hides the pop-up while OrderEntry / CancelOrderModal is open → fixes 45a + 45b. | Low |

**Lines-touched estimate**: ~80 lines net change in `ScanOrderPopOut.jsx`, ~1 line in `DashboardPage.jsx`.

---

## Sub-Defect Mapping

| Sub-defect | Planned Fix | File | Validation |
| --- | --- | --- | --- |
| **45a** — View Order does nothing | Add `suppressed` prop + wire `Boolean(orderEntryType) \|\| Boolean(cancelOrderEntry)` from DashboardPage; defence-in-depth lower backdrop to `z-30` | `ScanOrderPopOut.jsx` + `DashboardPage.jsx` | Click View → popup hides → OrderEntry visible at z-50 → close OrderEntry → popup re-appears with remaining YTC orders. |
| **45b** — Reject does nothing | Same as 45a — `suppressed` covers `cancelOrderEntry` too | `ScanOrderPopOut.jsx` + `DashboardPage.jsx` | Click Reject → popup hides → CancelOrderModal visible at z-[100] → choose reason → modal closes → popup re-appears. |
| **45c** — Item line ₹0.00 | Item `<li>` reads `Number(it.unitPrice ?? it.price) * Number(it.qty ?? it.quantity \|\| 1)` | `ScanOrderPopOut.jsx` | Seed item `{name:'Burger', qty:2, unitPrice:75}` → popup shows `₹150.00`. |
| **45d** — Add-ons not shown | New sub-block iterating `it.addOns \|\| []` | `ScanOrderPopOut.jsx` | Seed item with `addOns:[{name:'Cheese', price:20}]` → popup shows `+ Cheese (+₹20.00)`. |
| **45e** — Variations not shown | New sub-block iterating `it.variation \|\| []` (singular key) | `ScanOrderPopOut.jsx` | Seed item with `variation:[{name:'Large', price:30}]` → popup shows `Large (+₹30.00)`. |
| **45f** — Item notes not shown | Italic line under item when `it.notes` truthy | `ScanOrderPopOut.jsx` | Seed item with `notes:'No onion'` → popup shows `"No onion"` italic. |
| **45g** — Order note not shown | Italic header line above items when `order.orderNote` truthy | `ScanOrderPopOut.jsx` | Seed order with `orderNote:'Pack neatly'` → popup shows `Order Note: "Pack neatly"`. |
| **45h** — Delivery placeholder | Rewrite `formatLocation` delivery branch to use `[addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')` (fallback `—`) | `ScanOrderPopOut.jsx` | Seed delivery order with `deliveryAddress:{address:'12 Main St',city:'Mumbai',pincode:'400001'}` → header reads `Delivery · 12 Main St, Mumbai, 400001`. |
| **45i** — Delivery charge + payment missing | Insert `Payment: {label}` row + `Delivery Charge: ₹{n}` row in header sub-block | `ScanOrderPopOut.jsx` | Seed delivery order with `paymentType:'prepaid'`, `deliveryCharge:50` → popup shows both rows. |
| **45j** — Section + Table for Dine-In QR | `formatLocation` Dine-In branch already correct; verify graceful fallback to `—` when both blank | `ScanOrderPopOut.jsx` | Seed QR dine-in order with `tableSectionName:'Garden'`, `tableNumber:'T3'` → header reads `Dine-In · Garden · T3`. |
| **45k** — Customer + phone for Takeaway | Existing customer block at L381–395 already renders both | `ScanOrderPopOut.jsx` (no code change — verification only) | Seed take-away order with `customerName:'Asha'`, `phone:'+91 98xxxxxx10'` → popup shows `Customer: Asha · +91 98xxxxxx10`. |
| **45l** — PAID badge missing | Lift `OrderCard.jsx:329–330` JSX into header sub-block with predicate `paymentType === 'prepaid' && fOrderStatus !== 8` | `ScanOrderPopOut.jsx` | Seed prepaid order → green `PAID` pill visible near header. |
| **45m** — Quantity prefix missing | Read `it.qty ?? it.quantity` in item `<li>` and in `formatItemCount` | `ScanOrderPopOut.jsx` | Seed item `qty:3` → item line starts with `3× `; item count row reads `3 items`. |
| **45n** — Delivery instructions missing | Italic line `Instructions: "{...}"` under address line when `deliveryAddress.delivery_instructions` truthy | `ScanOrderPopOut.jsx` | Seed delivery order with `deliveryAddress.delivery_instructions:'Leave at gate'` → popup shows `Instructions: "Leave at gate"`. |

---

## Reuse Map

| Need | Reuse From | Planned Usage |
| --- | --- | --- |
| Item row with qty / unit price / variations / add-ons / italic notes | `frontend/src/components/reports/OrderDetailSheet.jsx` L328–400 (`OrderItemCard`) | Lift the JSX skeleton verbatim into the popup's items `<li>`. Adapt only: (a) field key `item.variations` → `item.variation` (singular, matching `orderTransform.js:128`); (b) `item.price` → `Number(it.unitPrice ?? it.price) * qty`; (c) color tokens to popup palette (`COLORS.darkText` / `COLORS.grayText` / `COLORS.borderGray`); (d) drop the cancellation / station / VegIndicator branches (not relevant for YTC web orders). |
| PAID badge | `frontend/src/components/cards/OrderCard.jsx` L329–330 | Lift JSX verbatim including predicate `order.paymentType === 'prepaid' && order.fOrderStatus !== 8`. Only change: `data-testid={`prepaid-badge-${orderId}`}` becomes `data-testid={`popout-paid-badge-${orderId}`}` (popup-scoped namespace). |
| Address line ("street, city, pincode") | `frontend/src/components/order-entry/AddressPickerModal.jsx` L70 | Lift the one-liner `[addr.address, addr.city, addr.pincode].filter(Boolean).join(', ')`. No new utility. |
| Order-type label (`Dine-In` / `Delivery` / `Takeaway` / `Walk-In`) | `ScanOrderPopOut.jsx` L90–105 (`formatChannelLabel`) | Reuse as-is. |
| Currency formatting | Existing `currencySymbol` prop already in popup signature (default `'₹'`) + `Number(...).toFixed(2)` shape already used at L370 | No new helper; match the existing in-component pattern. |
| Suppress while another modal open | Existing dashboard state `orderEntryType` (L411) + `cancelOrderEntry` (L427) | No new state. Just pass `suppressed` boolean derived from these. |
| Complementary tag predicate | `it.isComplementary \|\| it.isComplementaryRuntime` (both set by `orderTransform.js:140 / 146`) | Use as-is to render the `Comp` pill. |
| Snooze / Prev / Next / Accept handlers | Existing `handleSnoozeClick`, `goPrev`, `goNext`, `handleAcceptClick`, `handleRejectClick`, `handleViewClick` | **Untouched.** No logic change. |

---

## Data Mapping Plan

All reads come from the **existing** `orderTransform.fromAPI.order` / `fromAPI.orderItem` output. No transform change, no new field.

- **Item quantity:** `Number(it.qty ?? it.quantity) || 1` (canonical `qty`, per `orderTransform.js:119`)
- **Item unit price / total fallback:** `Number(it.unitPrice ?? it.price) || 0` (unit) × qty (line total) — per `orderTransform.js:123–124`
- **Variations:** `Array.isArray(it.variation) ? it.variation : []` (singular array key — per `orderTransform.js:128`); each entry has `name` (or `label`) + optional `price`
- **Add-ons:** `Array.isArray(it.addOns) ? it.addOns : []` (per `orderTransform.js:129`); each entry has `name` + optional `price`
- **Item notes:** `it.notes` (per `orderTransform.js:130` ← `detail.food_level_notes`)
- **Order note:** `order.orderNote` (per `orderTransform.js:272`)
- **Delivery address line:** `[order.deliveryAddress?.address, order.deliveryAddress?.city, order.deliveryAddress?.pincode].filter(Boolean).join(', ')`; `deliveryAddress` is raw `api.delivery_address` passthrough (`orderTransform.js:279`)
- **Delivery instructions:** `order.deliveryAddress?.delivery_instructions` (raw passthrough field on the same delivery-address object)
- **Delivery charge:** `Number(order.deliveryCharge) || 0` (per `orderTransform.js:280`); render row only when `> 0`
- **Payment label:** `order.paymentType === 'prepaid' ? 'Prepaid' : (order.paymentMethod === 'cash_on_delivery' ? 'COD' : (order.paymentMethod || ''))` (per `orderTransform.js:214–215`); hide row when both blank
- **PAID badge predicate:** `order.paymentType === 'prepaid' && order.fOrderStatus !== 8` (matches `OrderCard.jsx:329` — identical to dashboard cards)
- **Table number:** `order.tableNumber` (per `orderTransform.js:195` ← `restaurantTable.table_no`)
- **Section name:** `order.tableSectionName` (per `orderTransform.js:196` ← `restaurantTable.title`)
- **Customer name:** `order.customerName` (per `orderTransform.js:202`)
- **Customer phone:** `order.phone` (per `orderTransform.js:203`)
- **Complimentary tag predicate:** `Boolean(it.isComplementary || it.isComplementaryRuntime)` (per `orderTransform.js:140 / 146`)

**Confirmation:** No new field invented; no transform change planned; every key above already exists on the live YTC order object as confirmed by code inspection of `orderTransform.js` lines 100–295.

---

## Validation Plan

Each scenario assumes a seeded YTC web order arriving via socket → `OrderContext` → `<ScanOrderPopOut/>` queue. Use the same data-shape `orderTransform.fromAPI.order` produces today.

1. **Dine-In QR order popup with section + table** — Seed `{orderType:'dineIn', tableSectionName:'Garden', tableNumber:'T3', customerName:'Asha', phone:'9100000000'}`. Header reads `Dine-In · Garden · T3`. Customer block visible.
2. **Delivery order popup — full data** — Seed `{orderType:'delivery', deliveryAddress:{address:'12 Main St', city:'Mumbai', pincode:'400001', delivery_instructions:'Leave at gate'}, customerName:'Riya', phone:'9111111111', paymentType:'prepaid', fOrderStatus:7, deliveryCharge:50, orderNote:'Pack neatly'}`. Assert: header `Delivery · 12 Main St, Mumbai, 400001`; customer block visible; green `PAID` pill; `Payment: Prepaid` row; `Delivery Charge: ₹50.00` row; `Instructions: "Leave at gate"` italic line; `Order Note: "Pack neatly"` italic line above items.
3. **Takeaway order popup** — Seed `{orderType:'takeAway', customerName:'Vikram', phone:'9222222222'}`. Header `Takeaway`. Customer block visible.
4. **Walk-In order popup** — Seed `{orderType:'walkIn'}`. Header `Walk-In`. Customer block hidden if name absent.
5. **Item with variations** — Seed item `{name:'Pizza', qty:1, unitPrice:300, variation:[{name:'Large', price:50}]}`. Render shows `Pizza   ₹300.00` and sub-line `Large (+₹50.00)`.
6. **Item with add-ons** — Seed item `{name:'Burger', qty:2, unitPrice:75, addOns:[{name:'Cheese', price:20}]}`. Render shows `2× Burger   ₹150.00` and sub-line `+ Cheese (+₹20.00)`.
7. **Item with item-level note** — Seed item `{name:'Pasta', qty:1, unitPrice:200, notes:'No garlic'}`. Render shows italic `"No garlic"`.
8. **Order-level note** — Seed `order.orderNote = 'Birthday — handle gently'`. Italic line above items: `Order Note: "Birthday — handle gently"`.
9. **Complimentary item showing ₹0.00 with `Comp` tag** — Seed item `{name:'Welcome Drink', qty:1, unitPrice:0, isComplementary:true}`. Render shows `1× Welcome Drink  ₹0.00` with `Comp` pill next to name.
10. **Non-complimentary item — ₹0.00 should not appear unless real** — Seed item `{name:'Fries', qty:1, unitPrice:60, isComplementary:false}`. Render shows `1× Fries   ₹60.00`. Diagnostic: if upstream ever sends `unitPrice:0` without comp flag → popup shows `₹0.00` **without** Comp pill (intentional diagnostic signal).
11. **View Order action** — Click View → assert `setOrderEntryTable` is called with `{id:'del-{orderId}', orderId, tableId:0, orderType:'delivery'}`; popup hides (`suppressed === true`); OrderEntry visible at z-50.
12. **Reject action** — Click Reject → assert `setCancelOrderEntry` called; popup hides; CancelOrderModal visible at z-[100]; choose reason → cancel API fires; modal closes → popup re-appears if remaining YTC.
13. **Popup is hidden when another modal is active** — With `orderEntryType !== null` OR `cancelOrderEntry !== null`, popup returns `null` (no backdrop, no z-index stacking concern).
14. **No regressions** —
    - `OrderCard.jsx` PAID badge unchanged (lifted, not modified).
    - `OrderDetailSheet.jsx` item row layout unchanged (lifted, not modified).
    - `AddressPickerModal.jsx` address line unchanged (lifted, not modified).
    - `DashboardPage.jsx`: only one additional prop on `<ScanOrderPopOut/>`; no new state, no handler change, no logic change.
    - Snooze / Prev / Next / Accept behaviours unchanged.
    - `orderTransform.js` unchanged.
    - `currencySymbol` prop default `'₹'` preserved.

---

## Regression Risk Areas

- **Dashboard incoming web/scan order popup** — primary surface; expect visible UI change. Verify with at least one order per type (Dine-In QR, Delivery, Takeaway, Walk-In) and with comp + non-comp items.
- **Order detail modal/sheet** — pattern lifted from `OrderDetailSheet.jsx`; file itself not modified; verify the dashboard "Order Details" sheet still renders identically.
- **Reject / cancel flow** — handler unchanged; verify `CancelOrderModal` opens correctly after popup hides.
- **Dine-in / table display on dashboard tiles** — no shared code with popup beyond `formatChannelLabel`; verify Dine-In QR cards still render their existing badge unchanged.
- **Delivery financial display** — `CartPanel` / `CollectPaymentPanel` delivery-charge UI is independent and untouched; verify a placed delivery order's Cart Panel still shows delivery charge correctly (sanity).
- **Complimentary item display** — Cart Panel comp-tag rendering untouched; verify `Comp` pill in popup does not clash with the existing dashboard / OrderEntry comp rendering.
- **Existing dashboard modals** (OrderEntry, CancelOrderModal, CheckIn modal, etc.) — popup now hides under `suppressed`; verify all modals open / close cleanly with no leftover popup overlay.
- **Popup height growth** — More content per order (variations, add-ons, notes, address, payment, delivery charge, instructions). Existing `lg:max-h-[85vh]` on the panel + `max-h-[28vh]` on the items list should accommodate; if any tablet viewport overflow appears in QA, minor class tweaks acceptable inside the same file. **Not a separate ticket.**

---

## Implementation Guardrails

The future Implementation Agent **must**:
- Apply minimal diff only (~80 lines in `ScanOrderPopOut.jsx`, ~1 line in `DashboardPage.jsx`).
- Reuse JSX / predicates from the three reference files **verbatim** wherever possible; adapt only the field-key differences noted in the Reuse Map.
- Avoid creating new utility files / helper modules / sub-components — any helper required must stay as an inline `const` inside `ScanOrderPopOut.jsx`.
- Avoid backend / API / `orderTransform.js` changes. Every field listed in the Data Mapping Plan is already present on the live YTC order object — confirmed by code inspection.
- Keep changes scoped to BUG-045. Do not refactor `formatChannelLabel`, `formatItemCount`, `buildTableEntryFromOrder`, `isUnconfirmedScanOrder`, snooze logic, or the queue ordering.
- Preserve all existing `data-testid` values; add new ones only for newly inserted elements, namespaced under `popout-*-{orderId}` (e.g., `popout-paid-badge-{orderId}`, `popout-order-note-{orderId}`, `popout-delivery-charge-{orderId}`, `popout-delivery-instructions-{orderId}`, `popout-item-comp-tag-{idx}`, `popout-item-variation-{idx}-{vIdx}`, `popout-item-addon-{idx}-{aIdx}`, `popout-item-note-{idx}`).
- Stop and escalate if code differs from analysis in a way that changes scope (e.g., if `orderTransform.js` does **not** currently emit one of the fields listed in Data Mapping Plan — currently confirmed it does).
- Preserve the existing top-level header strip ("Web · Scan & Order" + "Order N of M") unchanged.
- Do **not** change the Accept button handler / styling (BUG-037 is separate and blocked on backend).

---

## Owner Approval Gate

**Implementation is NOT approved yet.**
**Owner must explicitly say "approved" or "start implementation" before any code changes are made.**

---

## ──────────────────────────────────────────────────────────────
## BUG-044 — Free Table Still Shows Old Order Items Until Refresh
## ──────────────────────────────────────────────────────────────

> ## ⚠ SUPERSEDED — DO NOT IMPLEMENT THIS SECTION
>
> **Status (2026-05-11, post BUG-045 sign-off):** The BUG-044 plan below is
> **superseded** by the runtime scenario investigation at
> `/app/memory/bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`.
>
> **Why:** Code-truth investigation against current v2 code (HEAD `3944a0a`)
> proved the proposed `removeOrdersByTableId(tableId)` hook into
> `handleUpdateTable` targets a code surface that **does not produce the bug**:
> - `update-table 'free'` is explicitly ignored (`socketHandlers.js` L533–536,
>   since BUG-203 / Apr-2026).
> - `update-table 'available'` only mutates `TableContext`; it never touches
>   `OrderContext`, so it cannot cause stale orders by itself.
> - `DashboardPage.tables` memo renders order items keyed on
>   `getOrdersByTableId(t.tableId)`, **not** on `t.isOccupied`.
>
> **Risk of implementing as written:** A `removeOrdersByTableId` hook would
> introduce a real race-condition risk of wiping mid-transaction dine-in /
> room orders when backend emits a table-status frame ahead of the order's
> HTTP round-trip.
>
> **Owner decision (2026-05-11):** _"BUG-044 is not ready for implementation.
> Reproduce the exact stale-table/order scenario and capture user action,
> order_id, table_id, socket event names + payloads, f_order_status,
> payment_status, table status, OrderContext before/after, and whether
> refresh clears it. No FE implementation until the failing socket/event
> path is proven."_
>
> **Source of truth for BUG-044 is now:**
> `/app/memory/bugs/BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`
>
> **Status pull addendum (also superseded):**
> `/app/memory/bugs/BUG_044_STATUS_PULL_AND_NEXT_STEP.md`
>
> The verdict row for BUG-044 in §13 of this plan
> (`ready_for_implementation`) is **also stale** — treat it as superseded.
>
> The historical plan content below is retained for traceability only.

### Objective
Add a minimal frontend safety-net so that when a table transitions to `available` (via any closure path), residual orders for that table are dropped from `OrderContext` and the dashboard tile renders empty immediately — without waiting for a page refresh.

### Files / Functions Likely To Change
| File | Function / Region | Change |
| --- | --- | --- |
| `frontend/src/api/socket/socketHandlers.js` | `handleUpdateTable` (L512–540) | When the incoming socket sets `status === 'available'`, call a new `removeOrdersByTableId(tableId)` from `OrderContext` to clear residual non-terminal orders that backend forgot to terminate. Guarded by `tableId > 0` (skip walk-in/no-table). |
| `frontend/src/contexts/OrderContext.jsx` | Provider value | Add a new action `removeOrdersByTableId(tableId)` that removes from `orders` any order with that `tableId` (regardless of status) **except** orders whose `isWalkIn` is true. Expose via context value + memo deps. |
| `frontend/src/api/socket/socketHandlers.js` | `handleUpdateTable` invocation contract (L43–45 calling site, or wherever the handler dispatcher passes `context`) | Pass `removeOrdersByTableId` alongside `updateTableStatus` / `setTableEngaged` so the handler has access. Done via the existing `context` plumbing — no new socket event registered. |

### Current Behavior
- Terminal-status removal is keyed on `order.status === 'cancelled' \|\| 'paid'` inside `handleUpdateOrder` / `handleUpdateOrderStatus`.
- `handleUpdateTable` only updates table status — it does **not** clear residual orders.
- If backend frees a table without (or before) emitting a matching terminal order frame, `orderItemsByTableId[tableId]` still contains the stale order → `DineInCard` renders its items.

### Required Behavior
- The instant a table flips to `available`, any non-walk-in order on that table that has not already been removed by the terminal-status path must be dropped from `OrderContext`.
- The dashboard `tables` memo re-derives → tile shows the empty available state.

### Minimal Implementation Approach
1. Add `removeOrdersByTableId` to `OrderContext.jsx` near `removeOrder`:
   ```
   const removeOrdersByTableId = useCallback((tableId) => {
     if (!tableId || tableId === 0) return;
     setOrders(prev => prev.filter(o => o.isWalkIn || o.tableId !== tableId));
   }, []);
   ```
   Add to the provider value memo + deps array.
2. Thread it through the socket handler dispatcher (whatever currently passes `{updateOrder, removeOrder, updateTableStatus, ...}` into `handleUpdateTable`).
3. Inside `handleUpdateTable`, after `updateTableStatus(tableId, status)`:
   ```
   if (status === 'available' && tableId > 0 && removeOrdersByTableId) {
     removeOrdersByTableId(tableId);
   }
   ```

### What Not To Touch
- Terminal-status predicate in `handleUpdateOrder` / `handleUpdateOrderStatus` (still primary cleanup; safety-net is purely additive).
- Walk-in orders (excluded from removal — `o.isWalkIn` guard).
- Room orders — they use the same `tableId` channel; if the room becomes `available`, residual room orders should also be cleared (the same `tableId !== 0` rule applies). Verify in QA that an in-progress room order is not wrongly cleared if a stray `available` table-status arrives mid-flow; the safety-net only fires when backend says the table is available, which is a valid signal.
- Split-orders — by design, when a table becomes `available`, all its split orders are concluded; clearing them all is correct.
- Re-engage flow — re-engage uses `addOrder` / `updateOrder` which re-introduce the order regardless.

### Edge / Risk Notes (carried to QA)
- If a split-order pair has one order paid (already removed by terminal handler) and one still active, backend should not be emitting `available` until both are concluded. If it does, we will clear the active sibling — which matches the user-reported "free table" expectation. Owner can revisit if this turns out to be incorrect in production.

---

## ──────────────────────────────────────────────────────────────
## BUG-046 — Editable Delivery Charge Not Reflected in Order Total
## ──────────────────────────────────────────────────────────────

### Objective
Make the inline Cart-Panel delivery-charge edit re-flow into the OrderEntry `total` (Collect Bill button label) **after the order is placed** — without firing an `updateOrder` backend round-trip and without regressing BUG-019 / CR-008 / CR-013.

### Files / Functions Likely To Change
| File | Function / Region | Change |
| --- | --- | --- |
| `frontend/src/components/order-entry/OrderEntry.jsx` | `total` derivation (L687–698) | In the placed branch, replace `(orderFinancials.amount \|\| 0)` with `(orderFinancials.amount \|\| 0) + Math.max(0, deliveryAddOn - (orderFinancials.deliveryCharge \|\| 0))`. This re-adds only the *delta* between the live `deliveryCharge` state and the backend-echoed `orderFinancials.deliveryCharge`, so the placed-branch total moves with the cashier's edits while the backend echo stays the source of truth for everything else (items, tax, SC, etc.). Pre-place branch is unchanged. |

### Current Behavior
- Pre-place: `total = applyRoundOff(rawLocalTotal) + deliveryAddOn` — works.
- Placed: `total = orderFinancials.amount + applyRoundOff(rawUnplacedTotal)` — backend echo only; inline delivery edits do **not** move `total`.
- CollectPaymentPanel: its own `deliveryChargeInput` (lazy-init from prop) does recompute `rawFinalTotal` live — so the bug is only on the Cart-Panel side (Collect Bill button label).

### Required Behavior
- Cashier types `100` in the Cart-Panel inline delivery field (placed delivery order, non-prepaid, non-web).
- Collect Bill button label updates immediately to reflect the new delivery charge.
- Open Collect Bill panel → grand-total inside the panel matches the button label (the panel already reads `initialDeliveryCharge = orderFinancials.deliveryCharge \|\| Number(deliveryCharge) \|\| 0` per OrderEntry L1221, so this stays consistent).
- Outgoing BILL_PAYMENT payload carries the entered value (already works via `collectBillExisting` payload builder reading live `deliveryCharge`).

### Minimal Implementation Approach
Single-line change inside the placed branch ternary at `OrderEntry.jsx:696–698`:

```
const placedBaseDelivery = Number(orderFinancials.deliveryCharge) || 0;
const placedDeliveryDelta = orderType === 'delivery'
  ? (Number(deliveryCharge) || 0) - placedBaseDelivery
  : 0;
const total = hasPlacedItems
  ? (orderFinancials.amount || 0) + (unplacedSubtotal > 0 ? applyRoundOff(rawUnplacedTotal) : 0) + placedDeliveryDelta
  : applyRoundOff(rawLocalTotal) + deliveryAddOn;
```

(Implementation may inline these names; the calculation is what matters.)

This:
- Keeps the backend echo (`orderFinancials.amount`) authoritative for items / tax / SC / GST.
- Adds the *delta* between the live `deliveryCharge` state and what the backend echoed → live edits move `total` 1-for-1 with the input.
- Resolves to **zero adjustment** when there is no edit (live state matches echo) → no visual jitter.
- Does **not** apply to non-delivery orders (`orderType === 'delivery'` gate already used by `deliveryAddOn`).
- Does **not** fire an extra backend call — purely a render-time correction.

### What Not To Touch
- CollectPaymentPanel `readOnly` predicate (BUG-019 + POS2-002 Phase 2 web-order lock) — preserved.
- `initialDeliveryCharge` prop wiring (OrderEntry L1221) — preserved.
- `placeOrder` / `updateOrder` payload builders — unchanged.
- CR-013 delivery GST recomputation inside CollectPaymentPanel — already keyed off live `deliveryCharge`, so it stays in sync.
- Pre-place branch math — already correct.
- Re-engage flow seeding (`orderFinancials.deliveryCharge` from socket) — unchanged.

---

# 9. Cross-Impact Between BUG-044, BUG-045, BUG-046

| | BUG-044 | BUG-045 | BUG-046 |
| --- | --- | --- | --- |
| **BUG-044** | — | No file overlap | No file overlap |
| **BUG-045** | No file overlap | — | No file overlap |
| **BUG-046** | No file overlap | No file overlap | — |

- **No shared files.** BUG-044 → `socketHandlers.js` + `OrderContext.jsx`. BUG-045 → `ScanOrderPopOut.jsx` + `DashboardPage.jsx`. BUG-046 → `OrderEntry.jsx`.
- **One shared concept** between BUG-044 and BUG-045: both touch dashboard / order-context state. BUG-044's `removeOrdersByTableId` does not affect the popup (popup filters on `orderFrom === 'web' && fOrderStatus === 7`; a freed table's residual would already be a dine-in `running` order, not a YTC web order).
- **One shared concept** between BUG-045 and BUG-046: both can be reproduced on the same delivery flow (scan delivery order → popup → Accept → placed → edit delivery charge). They do not collide because they live in different components.

---

# 10. Test Plan Per Bug

## BUG-045 Test Plan

### 45a — View Order
1. Seed a `yetToConfirm` web/scan delivery order in OrderContext (socket-mock or running backend).
2. Verify popup renders with `View Order` button.
3. Click `View Order` → assert `setOrderEntryTable` is called with the synthetic delivery entry shape (`{id: 'del-<orderId>', orderId, tableId: 0, orderType: 'delivery'}`).
4. Assert popup is hidden (returns `null` due to `suppressed`).
5. Assert OrderEntry overlay (`z-50`) is the topmost interactive layer.
6. Close OrderEntry → assert popup reappears with the still-pending order.

### 45b — Reject
1. Same seed as 45a.
2. Click `Reject` → assert `setCancelOrderEntry` is called.
3. Assert popup is hidden (`suppressed === true` because `cancelOrderEntry` truthy).
4. Assert CancelOrderModal is the topmost interactive layer.
5. Confirm cancel reason → assert `cancelOrder` API fired, OrderContext removes the order, popup remains hidden (no YTC orders left).

### 45c — ₹0.00 / quantity prefix
1. Seed a YTC web order with items shaped as `{qty: 2, unitPrice: 75, name: 'Burger'}`.
2. Pop-out renders `2× Burger    ₹150.00` (qty prefix + computed line total).
3. Seed an item with `qty: 1, unitPrice: 0, complementaryPrice: 50` (catalog comp): pop-out renders `₹0.00` (matches design — comp items have unitPrice 0).
4. Seed an item with only `price: 99, qty: 3`: pop-out renders `3× Item ₹297.00` (price fallback path).

### Regression Tests (BUG-045)
- Accept (`handleConfirmOrder`) still fires on click (popup hides → Accept handler runs as before).
- Snooze button still adds to pop-out-local hide-set + the existing dashboard snooze set.
- Prev / Next navigation still works.
- Pop-out reappears after OrderEntry / CancelOrderModal close.

## BUG-044 Test Plan
1. Seed a dine-in order on Table 5 with placed items.
2. Verify DineInCard shows the items.
3. Emit `update-table [5, restaurantId, available]` socket frame **without** a matching terminal `update-order-paid`.
4. Assert OrderContext no longer contains the order (`removeOrdersByTableId` fired).
5. Assert DineInCard renders empty available state immediately (no page refresh).
6. **Negative case**: same dine-in seed, emit `update-table [5, restaurantId, engage]` → no removal (only `available` triggers cleanup).
7. **Walk-in protection**: seed a walk-in (`isWalkIn: true`, `tableId: 0`) + a Table 5 order; emit `update-table [5, ..., available]` → walk-in stays, only the Table 5 order is removed.
8. **Split-order check**: seed two split orders on Table 5; emit `update-table [5, ..., available]` → both are removed.

### Regression Tests (BUG-044)
- Terminal-status removal via `update-order-paid` continues to work (still primary path).
- `setTableEngaged` / engage-release timing inside `handleUpdateTable` unchanged.
- `update-order-target` (switch table) still frees the old table without wrongly removing the new-table order (new-table order has the new tableId).

## BUG-046 Test Plan
1. Place a fresh in-POS delivery order with delivery charge `50` → backend echoes `orderFinancials.deliveryCharge = 50` and `orderFinancials.amount` includes it.
2. Inline-edit delivery charge in Cart Panel from `50` to `100`.
3. Assert Collect Bill button label increases by `+50` (the delta), not unchanged and not `+100`.
4. Open Collect Bill panel → assert `deliveryChargeInput` seeded with `100` (from OrderEntry's live `deliveryCharge` state).
5. Assert grand-total inside the panel includes `100` (+ recomputed delivery GST per CR-013 D-GST-2).
6. Pay (UPI or cash) → assert outgoing `BILL_PAYMENT` payload carries `100` as `delivery_charge`.
7. **Pre-place behavior**: before placing, type `50` → Collect Bill button label increases by `+50` (unchanged behavior).
8. **Non-delivery order**: edit in walk-in / dine-in / takeAway / room → `placedDeliveryDelta = 0`; total unchanged. (Not gated by edit field because it isn't rendered for these types, but assert defensively.)
9. **Negative edit**: type `0` over the seeded `50` → button label drops by `50`. **Negative typing**: input is `min="0"` already; defensive — `Math.max(0, delta)` not needed since delta can be negative legitimately. Confirm the formula uses raw delta (live - echo), not clamped. (Revised formula text above is correct — do NOT clamp `placedDeliveryDelta`.)
10. **BUG-019 readOnly path**: scan-order delivery (`isPrepaid = true`) — Cart Panel inline field is editable by current rules in CartPanel (only CollectPaymentPanel's CP-panel input is `readOnly` per L938). If owner expects the Cart-Panel inline edit to also be locked for prepaid scan orders, that is **out of scope** for BUG-046 and should be a separate enhancement.

### Regression Tests (BUG-046)
- BUG-019 (Closed Apr-2026) — CollectPaymentPanel readOnly lock for prepaid + web-with-charge still holds.
- CR-008 D1-Cap — placeOrder/updateOrder payload still carries delivery_charge.
- CR-013 D-GST-2 — delivery GST tracks the live delivery charge in CollectPaymentPanel.
- Walk-in / dine-in / takeAway / room flows — no change in `total`.

---

# 11. QA Checklist (Bucket 1 acceptance)

- [ ] **BUG-045a** — View Order opens OrderEntry overlay over hidden popup.
- [ ] **BUG-045b** — Reject opens CancelOrderModal over hidden popup; cancel flow completes.
- [ ] **BUG-045c** — Item line shows qty prefix + non-zero price for normal items; ₹0.00 only for genuinely-comp items.
- [ ] **BUG-045 Accept** — Still works (regression check, NOT a fix — BUG-037 is separate).
- [ ] **BUG-045 Popup re-appearance** — Closing OrderEntry / CancelOrderModal re-shows the popup for any still-pending YTC.
- [ ] **BUG-044** — Free table tile shows empty state immediately on `update-table available`, no page refresh needed.
- [ ] **BUG-044 Walk-in safe** — Walk-in orders not removed by the safety-net.
- [ ] **BUG-044 Terminal path** — Standard paid/cancelled removal still works first.
- [ ] **BUG-046** — Cart-Panel Collect Bill button label reflects inline delivery-charge edits on placed delivery orders.
- [ ] **BUG-046 Panel parity** — Collect Bill panel grand-total matches button label.
- [ ] **BUG-046 BUG-019 not regressed** — Scan / prepaid / web-with-charge readOnly lock still in effect inside CollectPaymentPanel.
- [ ] **No console errors** during all flows.
- [ ] **data-testid** unchanged for all touched elements (existing testids preserved).
- [ ] **No file outside the ones listed in Section 4** modified.

---

# 12. Recommended Implementation Order

1. **BUG-046** first — single-line localized change in `OrderEntry.jsx`, lowest regression surface, P0.
2. **BUG-045** second — three sub-defects in one component + one prop addition on the dashboard, P0 with high user-visible payoff once the z-index/suppressed fix lands.
3. **BUG-044** third — additive safety-net touching socket plumbing + a new OrderContext action; needs the most regression QA (terminal-path + walk-in + split-order paths), P2 priority.

Each bug is independent and could be shipped in any order; the above sequence minimizes blast radius and matches priority (P0 → P0 → P2).

---

# 13. Final Verdict

| Bug | Verdict |
| --- | --- |
| BUG-044 | `ready_for_implementation` ⚠ **SUPERSEDED** — see top of BUG-044 section + `BUG_044_RUNTIME_SCENARIO_INVESTIGATION.md`. Owner has parked BUG-044 pending runtime reproduction. |
| BUG-045 | `ready_for_implementation` |
| BUG-046 | `ready_for_implementation` |

All three bugs are **ready for the Bug Implementation Agent**. No owner clarification, no backend confirmation, no code conflict, no blocked dependency.

---

# Owner-Friendly Explanation

This section explains each bug in plain English — what the user sees, why it happens, what we will change, what we won't touch, and how to manually verify the fix. No function names or line numbers here, just the behaviour.

---

## BUG-045 — "Scan / Web Order Pop-up: View and Reject do nothing, item shows ₹0.00"

### 1. What is the user-facing problem?
When a new web / scan-and-order arrives, a pop-up appears on the dashboard showing the order. The pop-up has four buttons: Snooze, View Order, Reject, Accept.

- Clicking **View Order** appears to do nothing.
- Clicking **Reject** appears to do nothing.
- Each item line inside the pop-up shows **₹0.00** instead of the real price (and the "2×" / "3×" quantity prefix is also missing).

### 2. Why is it happening technically?
Two independent problems sit inside the same pop-up component:

**(a) View / Reject — the actions ARE firing, but the result is hidden.**
This is a **visual stacking (z-index) problem**, not a broken button.

- When the cashier clicks "View Order", the system correctly opens the Order Entry screen behind the scenes.
- When the cashier clicks "Reject", the system correctly opens the Cancel Order confirmation dialog behind the scenes.
- BUT the pop-up itself sits on a very high visual layer (effectively on top of everything else on the screen). The Order Entry screen and the Cancel dialog sit on lower layers.
- The pop-up's dark dimmed backdrop also covers the layers below.
- Net effect: the cashier sees the same pop-up as before, no new screen comes forward, so it feels like nothing happened. In reality the new screen is right behind the pop-up.

**(b) ₹0.00 item price — the pop-up is reading the wrong field name.**
The order data shipped to the front-end uses keys like `qty` (quantity) and `price` / `unitPrice` (per-item price). But the pop-up was written to look for keys called `quantity`, `total`, and `amount`, which don't exist on the order items. So:

- The quantity prefix never appears (the popup looks for `quantity`, finds nothing).
- The item line price defaults to 0 (the popup looks for `total` or `amount`, finds neither, falls back to 0).

This is a **field-name mismatch in the pop-up's display code**. The data is correct upstream; it's only the display layer that is reading the wrong keys.

### 3. What exact fix is planned?
The fix is **purely presentation / wiring** — we are NOT changing how View, Reject, or Accept work as actions.

- Pass a "should I hide myself right now?" flag into the pop-up. When the cashier clicks View Order or Reject, the pop-up will simply hide itself (return nothing on screen) for as long as the Order Entry screen or the Cancel Order dialog is open. When the cashier closes that screen, the pop-up re-appears automatically with whatever orders are still pending.
- As a defence-in-depth measure, also lower the pop-up's visual layer so it can no longer accidentally cover newer overlays added in the future.
- Change the item-line display to read the correct keys: use the real quantity (`qty`) and compute the line total from the real per-unit price multiplied by the quantity.

### 4. Which files will change?
- The pop-up component file (`ScanOrderPopOut.jsx`) — accepts a new "hide yourself" flag, lowers its visual layer, and reads the correct item-data keys.
- The dashboard page file (`DashboardPage.jsx`) — passes that "hide yourself" flag based on whether Order Entry or the Cancel dialog is currently open. (Both of these dashboard states already exist; we are just wiring them into the pop-up.)

### 5. What will NOT be changed?
- The Accept / Confirm flow — left exactly as it is. (Accept has its own separate sprint bug, BUG-037, which depends on backend confirmation. Bucket 1 does not touch it.)
- The snooze button, the prev/next navigation, the auto-clear 5-minute timer.
- The pop-up's eligibility rule (which orders qualify as "pending scan / web orders").
- The shared dashboard handlers (`handleTableClick`, `handleCancelOrderFromCard`, `handleConfirmOrder`) — they are correctly invoked today; we just stop hiding their results.
- The order data shape / API contract — no transform changes.

### 6. How will owner manually validate it?
1. Generate a fresh web or Scan & Order delivery order.
2. On the dashboard, confirm the pop-up appears with the correct item lines (quantity prefix + non-zero ₹ amount per line). Earlier this would have shown `Burger ₹0.00`; now it should show `2× Burger ₹150.00` (real numbers).
3. Click **View Order** → the pop-up should disappear and the Order Entry screen for that order should appear in front of the dashboard. Close Order Entry → the pop-up should come back if there are still pending orders.
4. Click **Reject** → the pop-up should disappear and the Cancel Order confirmation should appear in front. Pick a reason and confirm. The order should be cancelled (existing behaviour). Pop-up should come back if there are still pending orders.
5. Click **Accept** → existing Accept behaviour should still work (no change). (Where Accept itself fails in the "default config = Delivered" case, that is BUG-037 and is separately tracked.)

### 7. Risk level
**Low.**
- The View / Reject / Accept handlers are not changed at all. We are only un-hiding the screens they already open.
- Item-line display change is read-only and self-contained.
- No API, no socket, no payload, no business-logic change.

### 8. Is it safe to implement now?
**Yes.** No external dependency. No backend confirmation required. Ready for the Implementation Agent.

---

## BUG-046 — "Editing the delivery charge does not update the bill total"

### 1. What is the user-facing problem?
On a delivery order that has already been placed (sent to kitchen), if the cashier opens the Order Entry screen and edits the delivery charge value in the cart panel:
- The number in the delivery charge field updates as you type.
- But the **Collect Bill button at the bottom of the cart panel still shows the OLD grand total.**
- The grand total inside the Collect Bill panel (next screen) updates correctly — only the button label on the cart-panel side is stale.

### 2. Why is it happening technically?
After an order is placed, the backend echoes back an "official total" (everything: items + tax + service charge + delivery + round-off). The Order Entry screen uses that official total directly for the Collect Bill button — it trusts the backend.

When the cashier edits the delivery charge field in the cart, the new value is stored locally on the screen, but the code does NOT add the difference to the displayed total. The button label stays anchored to the original backend echo, which still includes the OLD delivery charge.

So the math problem is subtle:
- Backend echo = items + tax + SC + OLD delivery + round-off.
- Cashier types a NEW delivery value.
- Code shows: backend echo (unchanged) → label looks frozen.
- Code SHOULD show: backend echo MINUS old delivery PLUS new delivery → label tracks the edit live.

This is why the Collect Bill panel itself works (it has its own live recompute) but the cart-panel button label does not.

### 3. What exact fix is planned?
Apply only the **delivery-charge difference** (also called the delta) to the displayed total.

In simple words: "Take the backend's official total, then adjust it by the gap between what the cashier just typed and what the backend originally believed the delivery charge to be." If the cashier doesn't edit anything, the gap is zero and the total is identical to today's behaviour.

Important: we are NOT recomputing items, tax, or service charge. We are NOT firing an extra API call to the backend. The backend's authoritative numbers stay authoritative; we just nudge the displayed total by the user's delivery-charge edit, exactly as much as the user changed.

### 4. Which files will change?
- One file: the Order Entry screen file (`OrderEntry.jsx`) — a single localized change to how the "Collect Bill button total" is computed for already-placed delivery orders.

### 5. What will NOT be changed?
- **Item totals, tax, service charge, GST, round-off math** — all untouched. The backend echo stays the source of truth for everything except the live delivery-charge delta.
- **The Collect Bill panel** — already works correctly; not modified.
- **BUG-019 lock**: scan / web orders that already carry a delivery charge keep their read-only field — this protective lock is preserved.
- **The outgoing payment payload** — already carries the cashier's entered delivery charge; not modified.
- **Pre-place behaviour** — already correct; not modified.
- **CR-013 GST-on-delivery recomputation** — already works correctly off the live value; not modified.
- **Walk-in / dine-in / take-away / room flows** — the fix is gated to delivery orders only.

### 6. How will owner manually validate it?
1. Place a fresh in-POS delivery order with delivery charge set to, say, ₹50. The order is sent to kitchen.
2. Open the order again. Note the Collect Bill button label at the bottom.
3. Change the delivery charge in the cart panel from ₹50 to ₹100.
4. The Collect Bill button label should immediately go up by ₹50 (not by ₹100 — only the change).
5. Open the Collect Bill panel; the grand total there should match the button label.
6. Complete the payment. Confirm that the payment record shows the ₹100 delivery charge in the bill / receipt.
7. Repeat with a decrease (₹50 → ₹0). Button should drop by ₹50.
8. Try the same on a walk-in / dine-in / take-away order: there is no delivery-charge field for those flows, so total should remain unchanged from today.

### 7. Risk level
**Low.**
- Single, localized one-spot change.
- When the cashier doesn't edit, the delta is zero, so behaviour is identical to today.
- All other math (items / tax / SC / GST / round-off) is untouched.

### 8. Is it safe to implement now?
**Yes.** No external dependency. No backend confirmation required. Ready for the Implementation Agent.

---

## BUG-044 — "Free / available table still shows the old order until I refresh"

### 1. What is the user-facing problem?
After an order is completed, cancelled, transferred, or moved off a table, the table becomes "free" — but on the dashboard the table tile keeps showing the old order's items. The only way to clear it is to refresh the browser. This causes confusion: cashiers may think the table is still occupied or, conversely, may try to seat new guests while the old order data still lingers on the tile.

### 2. Why is it happening technically?
The dashboard maintains two pieces of state that come from the backend over real-time sockets:

1. The **table's status** (`available` / `engaged`).
2. The **list of orders** currently active in the system.

Today, an order is cleared from that list only when a specific "order is paid / cancelled" socket message arrives. If, on a particular closure path, the backend instead sends "table is now available" without an accompanying "order is closed" message — or if the two messages arrive in a different order than the front-end expects — the front-end keeps the old order in memory.

The result: the table is marked available, but the old order's items are still in the cache. The dashboard tile, which derives what to show from that cached list, keeps rendering the old items.

In short: **the front-end is missing a "if the table just went free, drop any leftover orders for that table" cleanup step.**

### 3. What exact fix is planned?
Add a small **frontend cleanup safety-net**: whenever a real-time message tells us "table X is now available", also clear any leftover orders for table X from the front-end's in-memory list.

This is purely an additive safety-net. The existing primary cleanup (clear-on-paid / clear-on-cancelled) is unchanged and still does its job first. The new path only catches the edge cases where the primary cleanup did not fire for whatever reason.

Walk-in orders (which never sit on a physical table) are explicitly excluded from this cleanup so they don't get wrongly removed.

### 4. Which files will change?
- The real-time socket handler file (`socketHandlers.js`) — the "table update" handler gets one extra step: when a table flips to available, also call the new cleanup helper.
- The order context file (`OrderContext.jsx`) — gains one small helper to remove any non-walk-in orders for a given table id.

### 5. What will NOT be changed?
- **The terminal-status rule** (clear when order's status is paid or cancelled) — left exactly as it is. The new code is an additional safety-net, not a replacement.
- **Walk-in orders** — they are protected and never removed by this cleanup.
- **Re-engage flow** — if the same table is re-opened later, the order is added back fresh; this fix does not interfere with that.
- **Backend** — no API change, no socket event change, no payload change.
- **Split-order math** or any billing logic.

### 6. How will owner manually validate it?
1. Open a dine-in order on Table 5 with a couple of items.
2. Complete the order (collect bill / cancel / mark paid via any of the closure paths).
3. Without refreshing the browser, look at the dashboard tile for Table 5. It should now show the clean "available" state immediately. Earlier it would have continued showing the old items until a page refresh.
4. Repeat for cancelled, transferred, and merged orders if possible.
5. Verify that a walk-in order on the dashboard is NOT removed when an unrelated dine-in table is freed.
6. Verify that a fresh new order on the same table (Table 5) after closure works exactly as before — re-engage path.

### 7. Risk level
**Low–Medium.**
- The new cleanup is additive and only fires on the specific "table went available" socket message.
- Walk-in orders are explicitly excluded.
- Slight residual risk: if backend ever marks a table available prematurely while an order is genuinely still active, the front-end will clear that order on the dashboard. (However, that scenario would already be a backend bug, and the visible behaviour — table looks free — would still match what the backend told us.)

### 8. Is it safe to implement now?
**Yes.** No external dependency. No backend confirmation required. Slightly more QA than BUG-045 / BUG-046 (walk-in protection + re-engage path + split-order path), but ready for the Implementation Agent.

---

## End of Plan

- **No code was changed.**
- **`/app/memory/final/` was not updated.**
- **`/app/memory/BUG_TEMPLATE.md` was not updated.**
- This plan is at `/app/memory/bugs/POS_FINAL_1_0_BUG_IMPLEMENTATION_PLAN_BUCKET_1.md`.
