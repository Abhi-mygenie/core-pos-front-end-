# Impact Analysis — OrderCard Cluster (BUG-146 · BUG-149 · CR-055)

**Document:** ORDERCARD_CLUSTER_IMPACT_ANALYSIS_2026_07_04.md
**Gate:** 2 (Impact Analysis only — no Implementation Plan yet)
**Author:** PLANNING agent (session 2026-07-04)
**Items:** BUG-146 (item-level time on card) · BUG-149 (Order ID hidden on Scan & Delivery) · CR-055 (invert served-items collapse)
**Sprint:** POS 5.0
**Risk (aggregate):** MEDIUM · **Cluster hotspot:** `OrderCard.jsx` (recently touched by CR-017 + BUG-122)

---

## 0. Header

| Item | Code Reality | Conflict Pre-Check |
|---|---|---|
| BUG-146 | PARTIAL — item row renders name/qty/variants/addons/notes/status, **no per-item time field rendered** anywhere | No active item on OrderCard.jsx right now |
| BUG-149 | PARTIAL — chip render logic exists (L426), but gated on `orderNumber` (from `restaurant_order_id`) which may be empty for these channels | No active item on OrderCard.jsx right now |
| CR-055  | PARTIAL — active/served/cancelled tri-section render already exists (L585-779); default states are `showServed=false`, `showCancelled=false`. Invert is a state + block-order change | No active item on OrderCard.jsx right now |

**FILE_OWNERSHIP.md last touchers on `OrderCard.jsx`:** CR-017 (WhatsApp button) + BUG-122 (POS YTC Cancel button). Both closed. No open agent has this file. Safe to plan.

---

## 1. Single Surface — Confirmed via grep

| Component | Imported in | JSX Usage | Status |
|---|---|---|---|
| `components/cards/OrderCard.jsx` (1110 lines) | `pages/DashboardPage.jsx` (4 call sites) + `components/dashboard/ChannelColumn.jsx` (1 call site) | 5 live usages | **HOTSPOT** — R5-adjacent |
| `components/cards/DineInCard.jsx` | Imported in DashboardPage.jsx L7 | **0 JSX usages** | Dead import — do not touch |
| `components/cards/DeliveryCard.jsx` | Imported in DashboardPage.jsx L7 | **0 JSX usages** | Dead import — do not touch |
| `components/cards/TableCard.jsx` | (separate table view surface) | Own path | Out of cluster scope |

**All three items in this cluster touch `OrderCard.jsx` and only `OrderCard.jsx`.** DineIn / TakeAway / Delivery / Room / Scan (post-accept) all render through this one component. This is why the cluster must be planned + coded + QA'd together — 3 concurrent edits to the same 1110-line file cannot be split across agents without high merge/regression risk.

**Note:** Scan orders while still yet-to-confirm (`fOrderStatus === 7 && isWebOrder`) render through `components/dashboard/ScanOrderPopOut.jsx` — a *popup* layer, not a card. Once accepted, they fall into the normal `OrderCard` render path (as TakeAway or Delivery, based on channel). BUG-149's "not visible on scan" therefore refers to accepted scan orders in the normal card grid, not the pop-out.

---

## 2. BUG-146 — Item-level time missing on OrderCard

### 2a. Data flow trace

- **Backend payload:** `/order-logs-report` returns each order with an `items[]` array (structure inspected via `orderTransform.js` L339-L420 region — need Planning to fill in exact field shape via curl-probe). Fields we know are consumed today on the item row: `item.id`, `item.name`, `item.qty`, `item.status`, `item.variation`, `item.addOns`, `item.notes`.
- **What is NOT consumed:** any item-level timestamp. `orderTransform.js` at L140 reads `createdAt: detail.created_at` — this is at the **order-detail** level, not per-item. At L248-249, order-level `time` and `createdAt` are set. There is no `item.createdAt` / `item.scheduleAt` in the transformed item shape.
- **Renderer:** `OrderCard.jsx` L626-687 renders each active item row. The row has 4 zones: (i) food-transfer icon (dine-in only, L631-643), (ii) name + qty + variants + addons + note (L644-664), (iii) status label + action button (L666-685), (iv) served/cancelled items get their own collapsed blocks below (L697-779) with only name + qty + Served/Cancelled label — no time.
- **Conclusion:** the field is a **complete no-op end-to-end**. To render item-level time we must (a) confirm the backend provides a per-item timestamp, (b) map it in the transform, (c) render it in the item row template.

### 2b. Files that WILL change

| # | File | What changes | Est. lines |
|---|---|---|---|
| 1 | `api/transforms/orderTransform.js` | Map new item timestamp field(s) into transformed `item` shape (item mapping region — Planning to locate exact block, ~L339-420) | +2–5 |
| 2 | `components/cards/OrderCard.jsx` | Render time in active-item row (L644-664 zone); optionally in served/cancelled blocks (L715-732, L756-777) | +5–15 |

### 2c. Files that will NOT touch
- `DashboardPage.jsx`, `ChannelColumn.jsx`, `orderService.js`, tests scaffolding.

### 2d. Downstream consumers of the same item shape
- `OrderEntry.jsx` (cart panel — but that's cart items, different shape)
- `CollectPaymentPanel.jsx` (financial layer, R6) — reads item fields for totals. Adding a new prop shouldn't break totals but must be verified.
- `ProductForm.jsx`, `BulkEditor.jsx` — menu items, not order items — no impact.

### 2e. Risks
- **LOW risk overall.** Additive item-shape field.
- **R6 nudge:** confirm the added transform mapping does not overwrite existing item fields used by discount/tax logic. `orderTransform.js` is a hotspot per R5.
- If backend doesn't provide any per-item time, this item is BACKEND-BLOCKED — file a Backend Brief and park.

---

## 3. BUG-149 — Order ID hidden on Scan & Delivery cards

### 3a. Data flow trace

- **Backend field:** `api.restaurant_order_id` → `orderNumber` at `orderTransform.js` L196 and L350. Wave 5 rule (BUG-071, comment L93-96): "no fallback — display hidden when missing."
- **Renderer:** `OrderCard.jsx` L426-434
  ```
  {orderNumber && !isRoom && !isDineIn && (
    <span data-testid={`order-id-chip-${orderId}`} className="text-xs flex-shrink-0" style={{ color: COLORS.grayText }}>
      #{orderNumber}
    </span>
  )}
  ```
  Chip render condition: `orderNumber` truthy **AND** `!isRoom` **AND** `!isDineIn`. So Delivery + TakeAway + Scan-post-accept should all satisfy the condition — chip *should* render.
- **Two competing hypotheses for the reported bug:**
  - **H1 (data):** `restaurant_order_id` is empty (or null) on the API payload for scan and delivery channels. Very common — aggregator (swiggy/zomato) orders don't always carry a merchant-side order id; own-delivery orders may too. If so, the chip is hidden by the Wave-5 "no fallback" rule and the fix is not FE.
  - **H2 (visibility):** chip renders but is too subtle (`text-xs` + gray `COLORS.grayText`) to notice on Scan/Delivery cards where the customer name is missing. Owner may have looked for it as a badge like the SCH/PAID/HOLD ones and missed it.
- **Note:** `DeliveryCard.jsx` (unused dead import) renders `#{orderNumber}` at L45 with `text-sm font-bold` — more prominent. Suggests earlier design used a bolder chip.

### 3b. Files that WILL change (contingent on hypothesis)

| # | File | What changes | Est. lines | Applies when |
|---|---|---|---|---|
| A | `components/cards/OrderCard.jsx` | (i) elevate chip style: font-bold + darker color + own testid variant; (ii) *optionally* add fallback to `orderId` (DB id) with `#` prefix for these channels only | +2–5 | H2 confirmed |
| B | `api/transforms/orderTransform.js` | If backend has a different field carrying the visible id for aggregator/scan orders (e.g. `platform_order_id`), map that to `orderNumber` with priority | +3–5 | H1 partial (data mapping) |
| C | (none — Backend Brief) | If neither field exists on payload | 0 | H1 confirmed as pure backend gap |

**Planning must curl-probe `/order-logs-report` on a scan and delivery order before Gate 3.** Owner needs to provide preprod credentials or approve a workaround (mock).

### 3c. Files that will NOT touch
- Chip's DineIn/Room gating (L426 `!isRoom && !isDineIn`) — these channels intentionally show table label instead. Do not remove the gate.

### 3d. Downstream
- Test files reference `data-testid={`order-id-chip-${orderId}`}` — keep testid stable.
- BUG-071 was the Wave-5 rule that set the current "no fallback" behavior. Revising it (H2 → adding orderId fallback) requires **owner ruling** since BUG-071 is closed with an owner-approved rule.

### 3e. Risks
- **MEDIUM.** Style change: LOW. Adding orderId fallback: touches a locked business rule (Q5). Data-mapping change: safe additive.
- Regression: any test asserting chip absence when `orderNumber` empty would fail if we add fallback → run test suite.

---

## 4. CR-055 — Invert OrderCard served-items collapse

### 4a. Current behavior (verified in code)

Section render order in OrderCard, top-to-bottom, L585-779:

1. **ACTIVE items** (L585-694) — `activeItems = items.filter(i => i.status !== "served" && i.status !== "cancelled")` — rendered inline, always visible.
2. **SERVED items** (L697-736) — `servedItems = items.filter(i => i.status === "served")` — hidden under `▼ Served (N)` toggle, default `showServed=false`.
3. **CANCELLED items** (L738-779) — hidden under `▼ Cancelled (N)` toggle, default `showCancelled=false` (BUG-025).

Also: `activeItems` **includes** `preparing`, `ready`, and any un-labelled statuses. Toggling the collapse behavior is not a simple boolean flip; the semantic question is what "pending" and "done" mean for the operator.

### 4b. What "invert" could mean — 3 candidate readings

| Reading | Default-visible | Behind toggle | Fits owner phrasing? |
|---|---|---|---|
| **R1: strict flip** | Served items | Active (preparing + ready) items | Literal — but hides the items still needing action, which is operationally counter-intuitive |
| **R2: both visible, served first** | Active + Served both visible; Served group listed **first** at the top | Nothing collapsed (except Cancelled) | Fits "opposite" as "reversed order of visibility" |
| **R3: swap toggle labels** | Active AND Served both visible by default; single toggle now collapses Active (into a `▼ Preparing (N)` line) | Preparing/Ready items | Fits "opposite" as "default-visible switched" |

Owner phrasing (verbatim): *"in order cards served item are hidden until expanded before should be opposite."*

I read this most naturally as **R1 (strict flip)** but that's operationally weak (kitchen/waiter loses at-a-glance view of what still needs prep). **R2 is my recommended interpretation** — served items become visible by default *without* hiding pending items. This needs owner confirmation before Gate 3.

### 4c. Files that WILL change

| # | File | What changes | Est. lines |
|---|---|---|---|
| 1 | `components/cards/OrderCard.jsx` | (i) initial state of `showServed` (L54); (ii) either reorder the section blocks OR invert the toggle predicate; (iii) update `▼ Served (N)` label / testid name | +6–20 |

### 4d. Files that will NOT touch
- Cancelled block (L738-779) — CR-055 doesn't mention cancelled behavior; leave BUG-025's collapse intact.
- `activeItems` / `servedItems` filter logic (L254-255) — filter semantics unchanged.
- `OrderTimeline`, footer buttons, header row.

### 4e. Downstream / regression concerns

- **Card height:** with served visible by default, cards get taller (especially for orders with many served items). Dashboard-density regression — verify at 4-cards-per-row breakpoint (280px min-width per JSDoc L17).
- **Item-action buttons** (L666-685, `Ready` / `Serve` buttons on active items) are the primary operator workflow. If R1 is chosen, these move behind a toggle — operational regression. Owner must confirm.
- **Testid selectors:** `served-toggle-${orderId}` (L701) is referenced in tests. Any label/testid change needs test updates.
- **BUG-025 precedent:** owner explicitly wanted cancelled items behind a toggle (2026-05-11). Consider whether CR-055 changes the parallel design principle or is served-only.
- Interaction with **BUG-146** (item time) and **BUG-149** (order id): if served block is expanded by default, per-item time will show more prominently → make sure the render zone in the served block (L715-732, currently only shows name+qty+"Served" label) also picks up any new time field from BUG-146. Batch-plan.

### 4f. Risks
- **MEDIUM.** Layout change on a dashboard-density-sensitive surface; touches an operator's habitual reading pattern.
- If cancelled block behavior is also inverted (owner might imply this), collides with owner-approved BUG-025 pattern → R3 (do not invent policy).

---

## 5. Aggregate Risk & Sequencing

**Combined cluster risk = MEDIUM.** All three items:
- Touch the same 1110-line hotspot (`OrderCard.jsx`)
- Are not financial (no R6), but CR-055 interacts with operator workflow
- Have identifiable rollback paths (each is a small localised edit)

**Recommended sequencing for Gate 3 (Implementation Plan):**

1. **BUG-146 first** — additive transform + render, lowest risk. Establishes the item-time field for CR-055 to inherit in the served block.
2. **BUG-149 second** — style-only (H2) or transform-additive (H1); low risk.
3. **CR-055 last** — layout change, will naturally include the new item-time render in the served block.

All three should be coded in the **same implementation session** since they touch overlapping regions of the same file. No parallel-safe split.

---

## 6. Owner Decisions Required BEFORE Gate 3

Do not proceed to Implementation Plan (Gate 3) until owner rules on these. Rule R3 (do not invent policy) applies to items 6.3 and 6.5.

| # | Item | Question | Options |
|---|---|---|---|
| 6.1 | BUG-146 | Which time — item creation, KOT-print, or scheduled? | (a) `item.created_at` (server-received) · (b) `item.kot_at` (fired-to-kitchen) · (c) `item.schedule_at` (if per-item schedule exists) |
| 6.2 | BUG-146 | Display format? | (a) relative `2m ago` · (b) absolute `HH:mm` · (c) elapsed since previous status change |
| 6.3 | BUG-146 | Which item statuses show it? | (a) active only · (b) active + served · (c) all incl. cancelled |
| 6.4 | BUG-149 | Which hypothesis to pursue? | (a) style change (H2) — quick, no rule bend · (b) add `orderId` fallback (H2 stronger) — revises BUG-071 Q5 rule · (c) map alternative backend field (H1) — needs curl-probe first |
| 6.5 | CR-055 | Which reading — R1 strict flip / R2 both visible served-first / R3 label swap? | **Recommend R2.** Strict flip (R1) hides pending items behind toggle, which is operationally weak. |
| 6.6 | CR-055 | Does inversion also apply to Cancelled items block? | (a) yes — invert both · (b) no — cancelled stays collapsed per BUG-025 owner ruling |
| 6.7 | Cluster | Preprod curl-probe credentials for `/order-logs-report` — needed for BUG-149 hypothesis test and BUG-146 backend-field verification | Owner to provide masked token / test-restaurant account (per R20 secret hygiene) |

---

## 7. Evidence Requested (not blocking, but sharpens Gate 3)

- **BUG-146:** Screenshot showing where owner expects item time to appear (top-right of row? below variants? etc.)
- **BUG-149:** Screenshot of a scan or delivery card where the chip is missing (helps distinguish H1 vs H2)
- **CR-055:** Mockup or annotated screenshot of the desired end state (which reading — R1/R2/R3)

---

## 8. Scope-Lock Declaration

**Files WILL change (all 3 items combined):**
- `components/cards/OrderCard.jsx` (hotspot — plan carefully)
- `api/transforms/orderTransform.js` (contingent on 6.1 and 6.4)

**Files will NOT touch:**
- `DineInCard.jsx`, `DeliveryCard.jsx` (dead imports)
- `TableCard.jsx`, `OrderTimeline.jsx`
- `DashboardPage.jsx`, `ChannelColumn.jsx`, `ScanOrderPopOut.jsx`
- Any service / API caller
- Any financial transform (`orderTransform` item mapping is additive only — no field overwrite)

If Planning discovers scope must expand during Gate 3, STOP and re-declare per R14.

---

## 9. Next

**Blocked on:** Owner rulings 6.1–6.7 (esp. 6.5 CR-055 reading and 6.4 BUG-149 hypothesis) + preprod curl-probe credentials.

**On unblock:** Gate 3 Implementation Plan will produce:
- Exact edit table (file, line, current → new) per item
- Verification Matrix (unit + browser)
- Post-Code Registry Checklist per item
- E2E QA scenarios for the combined batch on Palm House and cafe103

---

**End of Impact Analysis — 2026-07-04**
