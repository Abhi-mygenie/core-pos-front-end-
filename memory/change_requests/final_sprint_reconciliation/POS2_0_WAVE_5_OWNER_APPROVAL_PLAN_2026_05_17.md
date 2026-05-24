# POS2.0 Wave 5 Owner Approval Plan — Dashboard Presentation — 2026-05-17

## 1. Sprint scope

Wave 5 closes two long-standing dashboard-presentation bugs:

| Bug | Priority | Theme |
|-----|----------|-------|
| **BUG-071** | P1 | UI and bills should show user-facing order ID, not DB order ID |
| **BUG-070** | P2 | Area-wise segregation missing in Table View and Channel View |

Per owner directive 2026-05-17, BUG-071 ships **first** (mechanical, low risk). BUG-070 ships **second** (structural).

---

## 2. Owner decisions captured 2026-05-17

| Q / Cx | Decision | Locked-in rule |
|---|---|---|
| Q1 | (a) Yes | Channel View Room column also segregates by area |
| Q2 | (a) Plain | Section headers are plain text bands, no sticky / no collapse |
| Q3 | As they come in API | No client-side sort; preserve API order |
| Q4 | Show un-segregated like today | Items without `sectionName` render at top of their view/column with no header band |
| Q5 | (c) | No order ID displayed when `orderNumber` is missing — chip/toast/label hidden entirely (no fallback to DB id, no placeholder text) |
| Q6 | (b) | BUG-071 first, BUG-070 second |
| Cx1 | (a) | Drop `isDineInOnly` narrow gate in Table View — section headers render whenever `hasAreas`, regardless of channel filter |
| Cx2 | Confirmed | Order View / List View stays flat |
| (Status View) | Confirmed | Status View also stays flat |

---

## 3. BUG-071 — UI and bills should show user-facing order ID, not DB order ID

### 3.1 Issue restatement
Multiple UI surfaces display `order.orderId` (DB id, e.g. `886544`) where they should display `order.orderNumber` (user-facing id, e.g. `000059`). BUG-032 (closed 2026-05-12) was a partial fix that covered only the OrderEntry header and CollectPaymentPanel.

### 3.2 Display vs identifier distinction (no-touch rules)
| Surface usage | Stay on `orderId` (DB id) | Switch to `orderNumber` |
|---|---|---|
| `data-testid` attributes | ✅ Yes | ❌ No |
| React `key={...}` props | ✅ Yes | ❌ No |
| API call args (`printOrder`, `completePrepaidOrder`, etc.) | ✅ Yes | ❌ No |
| Print payload `order_id` / `restaurant_order_id` | ✅ Yes | ❌ No |
| Visible chip text | ❌ | ✅ Yes |
| Toast `description` strings | ❌ | ✅ Yes |
| Dialog / drawer titles | ❌ | ✅ Yes |

### 3.3 Q5 fallback rule (locked)
```js
// Display surface pattern (chip, toast, title):
{order.orderNumber && <span>#{order.orderNumber}</span>}
{order.orderNumber && toast({ description: `Order #${order.orderNumber}` })}
// NO fallback to orderId, NO placeholder text. Chip/toast/title hidden entirely.
```

### 3.4 Code touchpoints (10 files)
| # | File | Lines | Change type |
|---|------|-------|-------------|
| 1 | `frontend/src/components/cards/OrderCard.jsx` | L74 (add `orderNumber`), L138 (toast), L157 (toast), L312-320 (chip + guard) | Chip + 2 toasts |
| 2 | `frontend/src/components/cards/TableCard.jsx` | L132, L162, L180 (toasts) | 3 toasts |
| 3 | `frontend/src/components/order-entry/OrderEntry.jsx` | L1117-1124 (chip visible text) | Chip visible text |
| 4 | `frontend/src/components/cards/DeliveryCard.jsx` | L9 (drop `\|\| order.id` fallback), L43 (guard) | Drop ID fallback + guard |
| 5 | `frontend/src/components/reports/MarkUnpaidConfirmDialog.jsx` | L72 (orderLabel source), L74-76 (title) | Dialog label |
| 6 | `frontend/src/components/order-entry/RePrintButton.jsx` | L116 (toast) | Toast |
| 7 | `frontend/src/components/reports/CollectBillPanelDrawer.jsx` | L223 (title) | Drawer title |
| 8 | `frontend/src/components/reports/OrderDetailSheet.jsx` | L433 (missing-order copy) | Strip DB id from copy |
| 9 | `frontend/src/components/reports/OrderTable.jsx` | L452 (fallback chain) | Drop `orderId` fallback |
| 10 | `frontend/src/components/reports/ExportButtons.jsx` | L199 (export cell) | Drop `orderId` / `id` fallback |

Net delta: ~+45 / -25 lines across 10 files. No new files.

### 3.5 Tests impact
- `OrderCard`-related render snapshots: none currently exist for the chip line. Existing tests assert behaviour, not chip text.
- `OrderTable.holdDisable.test.jsx`: unaffected (Hold branch unchanged).
- New jest test recommended (P2, defer to next sprint): assert chip is hidden when `orderNumber` is empty.

Expected post-apply: **498/498 passed** (unchanged count).

### 3.6 Validation plan
1. ESLint clean on all 10 files
2. `yarn test --watchAll=false` → 498/498
3. Webpack hot-reload green
4. Owner smoke (4 scenarios):
   - Dashboard OrderCard chip → shows `#orderNumber` (e.g., `#000059`), not DB id
   - Bill print toast → shows `#orderNumber`
   - Mark Unpaid dialog → title shows `#orderNumber`
   - Brand-new pre-engage order (no `orderNumber` yet) → chip / toast / title hidden entirely (no DB-id leak)

---

## 4. BUG-070 — Area-wise segregation in Table View and Channel View

### 4.1 Issue restatement (corrected after owner clarification)
Today, area segregation only renders when `isDineInOnly && hasAreas`. By default (all channels active), Table View is flat. Channel View columns are always flat. Rooms never segregate. Owner directive: segregate **Table View + Channel View** by area; **Order View / Status View** stay flat.

### 4.2 Behaviour table
| View | Today | After fix |
|------|-------|-----------|
| Table View — Tables | Flat unless `isDineInOnly && hasAreas` | **Sectioned by `sectionName` whenever `hasAreas`** (Cx1) |
| Table View — Rooms | Always flat | **Sectioned by `sectionName` when room `sectionName` exists** |
| Table View — Walk-In | Pseudo "Walk-In" section | Same — already segregated |
| Channel View — Dine-In column | Flat | **Sectioned by `sectionName` within column** |
| Channel View — Room column | Flat | **Sectioned by `sectionName` within column** |
| Channel View — TakeAway / Delivery | Flat | Flat (no `sectionName` on those orders — unchanged) |
| List View / Order View | Flat | Flat (unchanged) |
| Status View | Flat | Flat (unchanged) |

### 4.3 Section header visual rule
- Reuses existing **Table View section header** style (font, spacing, divider, color) — visual parity across Table View and Channel View
- Plain text band, full column width, secondary-color label
- No icons, no count chips, no badges, no sticky scroll
- Empty sections **hidden per column** in Channel View

### 4.4 Code touchpoints (3 files)
| # | File | Change |
|---|------|--------|
| 1 | `frontend/src/pages/DashboardPage.jsx` | (a) Render gate at L1585: drop `isDineInOnly &&` so headers render whenever `hasAreas`. (b) `allRoomsList` memo at L635: emit a grouped-by-section structure, mirroring the `tables` memo. (c) `channelData` memo at L678: expose `sectionsByChannel` derivation for dineIn + room channels. |
| 2 | `frontend/src/components/dashboard/ChannelColumn.jsx` | Accept optional `sections` prop. When present, render section headers between groups; when absent, fall back to flat list (preserves TakeAway/Delivery behaviour). |
| 3 | `frontend/src/components/dashboard/ChannelColumnsLayout.jsx` | Forward `sections` prop through to `ChannelColumn` for dineIn + room. |

`TableSection.jsx` (existing component) is reused for the Rooms surface — no API changes.

### 4.5 Tests impact
- No existing dashboard render tests assert the flat/sectioned mode.
- Recommended P2 follow-up: add a render-level test asserting headers visible when `hasAreas=true` and hidden when empty.

Expected post-apply: **498/498 passed** (unchanged count).

### 4.6 Validation plan
1. ESLint clean on all 3 files
2. `yarn test --watchAll=false` → 498/498
3. Webpack hot-reload green
4. Owner smoke (8 scenarios):
   - Table View default (all channels) → tables sectioned by area
   - Table View with `isDineInOnly` filter → still sectioned (unchanged)
   - Table View — rooms sectioned by area when API supplies `sectionName`
   - Table View — un-sectioned rooms render at top with no header (Q4 parity)
   - Channel View — Dine-In column sectioned by area
   - Channel View — Room column sectioned by area
   - Channel View — TakeAway / Delivery columns flat (unchanged)
   - List View / Order View / Status View — flat (unchanged)

---

## 5. Sequencing plan

| Step | Artifact | Status |
|---|---|---|
| 1 | **Wave 5 Owner Approval Plan** (this doc) | ✅ Filed |
| 2 | **Gate 7 Code Diff Preview — BUG-071** | ⏳ Filed in parallel for your review |
| 3 | Owner approval on BUG-071 diff → apply (Gate 8) → ESLint + Jest + smoke (Gate 9) | ⏳ Pending |
| 4 | **Gate 7 Code Diff Preview — BUG-070** | ⏳ After BUG-071 smoke pass |
| 5 | Owner approval on BUG-070 diff → apply (Gate 8) → ESLint + Jest + smoke (Gate 9) | ⏳ Pending |
| 6 | **Wave 5 Closure Report** | ⏳ After both smokes pass |

---

## 6. Risks / open items

| Risk | Mitigation |
|------|-----------|
| Removing the `isDineInOnly` gate may surprise operators who never saw sectioned Table View before. | Owner already approved (Cx1=a). Document in closure report so QA expectations align. |
| `DeliveryCard.jsx` L9 fallback `\|\| order.id` would hide the chip if order.orderNumber is missing — confirm aggregator orders (Zomato/Swiggy) always populate `orderNumber` upstream. | Manual smoke check on at least one aggregator order during BUG-071 smoke. |
| `OrderDetailSheet.jsx` L433 "missing order" placeholder currently displays the DB id we couldn't find. Stripping it leaves a less-diagnostic message. | Acceptable per Q5; owner can revisit if support diagnostics demand the DB id back. |

---

## 7. Files NOT touched in Wave 5

- `orderTransform.js`, `reportTransform.js`, `tableTransform.js` — no transform changes
- All print path code (Wave 4 closed)
- `OrderContext`, `TableContext` — no context shape changes
- `paymentMutationService.js` — not a payment-mutation wave

---

## 8. Approval required

- **A.** Approve this Owner Approval Plan + BUG-071 diff preview (filed in parallel) → proceed to Gate 8 for BUG-071
- **B.** Modify the plan (tell me what to change)
- **C.** Pause

Reply **A / B / C**.

---

*— End of Wave 5 Owner Approval Plan — 2026-05-17 —*
