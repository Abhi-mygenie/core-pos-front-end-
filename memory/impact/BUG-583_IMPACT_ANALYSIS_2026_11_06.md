# BUG-583 — Impact Analysis (FINAL — Design Locked 2026-11-06)

**Gate:** 2 — Impact Analysis
**Role:** PLANNING (stage = impact_analysis)
**Date:** 2026-11-06
**Design Lock:** Owner-approved 2026-11-06 — Option B (green border + green background)

---

## Code Reality: PARTIAL

| What exists | Where | Status |
|---|---|---|
| `billPrinted` field mapping | `orderTransform.js:310` | EXISTS but reads wrong field (`print_bill_status` instead of `bill_print`) |
| `getStatusColor()` helper | `colors.js:51` | EXISTS — drives border. No `billPrinted` check. |
| `billPrinted` in card rendering | OrderCard / TableCard | NONE — neither card references `billPrinted` for border or background |
| `billPrinted` in table enrichment | `DashboardPage.jsx:1214` | NONE — not threaded from order to enriched table object |

---

## Conflict Pre-Check

| Target File | Last Modified By | Conflict? |
|---|---|---|
| `orderTransform.js` (R5) | CR-482 (L14 area, not L310) | **No conflict** — L310 untouched |
| `OrderCard.jsx` (R5) | CR-482 (P10), CR-433 (border), BUG-573 (variants) | **Parallel-safe** — our change is on L456 `style` prop (border+bg), different concern |
| `TableCard.jsx` | CR-433 (border L282) | **Parallel-safe** — same line but additive condition |
| `TableCard.styles.js` | Original author | **No conflict** — additive |
| `DashboardPage.jsx` (R5) | BUG-589 (L1210), BUG-599 (aggregator) | **Parallel-safe** — our change is L1214 enrichment, one new field |
| `colors.js` | CR-433 | **No conflict** — additive constant only |

---

## Data Flow Trace

### Path 1: Order → OrderCard (Channel View)

```
API: GET employee-orders-list → orders[i].bill_print = "Yes"/"No"
  ↓
Transform: orderTransform.js:310
  CURRENT:  billPrinted: api.print_bill_status === 'Yes'    ← WRONG FIELD
  FIX:      billPrinted: api.bill_print === 'Yes' || api.print_bill_status === 'Yes'
  ↓
State: order.billPrinted = true
  ↓
Component: OrderCard.jsx:456
  CURRENT:  style={{ backgroundColor: COLORS.lightBg, border: `2px solid ${getStatusColor(fOrderStatus, ...)}` }}
  FIX:      style={{ backgroundColor: order.billPrinted ? '#E8F5E9' : COLORS.lightBg,
                     border: `2px solid ${order.billPrinted ? COLORS.primaryGreen : getStatusColor(fOrderStatus, ...)}` }}
  ↓
UI: Card turns light green background + green border when bill is printed
```

### Path 2: Order → DashboardPage enrichment → TableCard (Table View)

```
API: Same orders[i].bill_print as above
  ↓
Transform: orderTransform.js:310 → order.billPrinted
  ↓
DashboardPage.jsx:1214 — enrichedTables builder
  CURRENT:  { ...table, customer, phone, status, amount, fOrderStatus }
  FIX:      { ...table, customer, phone, status, amount, fOrderStatus, billPrinted: orderData.billPrinted || false }
  ↓
Component: TableCard.jsx — cardStyle useMemo (L281)
  CURRENT:  { ...CARD_BASE_STYLE, border: `2px solid ${getStatusColor(...)}`, minHeight: ... }
  FIX:      { ...CARD_BASE_STYLE,
              backgroundColor: table.billPrinted ? '#E8F5E9' : COLORS.lightBg,
              border: `2px solid ${table.billPrinted ? COLORS.primaryGreen : getStatusColor(...)}`,
              minHeight: ... }
  ↓
UI: Table card turns light green background + green border when bill is printed
```

### Path 3: Socket update (real-time)

```
Socket: update-order event → order_details.orders[].bill_print = "Yes"
  ↓
Transform: same orderTransform.fromAPI → order.billPrinted = true
  ↓
State update: OrderContext re-renders → cards pick up new billPrinted value
  ↓
UI: Card transitions to green in real-time after print confirmation
```

---

## Risk Classification: LOW-MEDIUM

| Factor | Assessment |
|---|---|
| Financial impact | NONE — no payment, tax, or order logic touched |
| Data flow | Read-only — `billPrinted` is display flag, not sent in any payload |
| R5 hotspots | YES — OrderCard.jsx, orderTransform.js, DashboardPage.jsx |
| Regression surface | LOW — purely visual change, all existing logic paths unchanged |
| Fast Lane eligible | NO — touches R5 hotspots |

---

## Affected Files + Lines (5 files, 5 edits)

| # | File | Line | Current | Change |
|---|------|------|---------|--------|
| **E-1** | `orderTransform.js` | L310 | `billPrinted: api.print_bill_status === 'Yes'` | Read `api.bill_print` with fallback to `api.print_bill_status` |
| **E-2** | `colors.js` | After L57 | (nothing) | Add `billPrintedBg: '#E8F5E9'` to COLORS export |
| **E-3** | `DashboardPage.jsx` | L1214 | `fOrderStatus: orderData.fOrderStatus \|\| table.fOrderStatus` | Add `billPrinted: orderData.billPrinted \|\| false` to enrichment |
| **E-4** | `OrderCard.jsx` | L456 | `style={{ backgroundColor: COLORS.lightBg, border: \`2px solid ${getStatusColor(...)}\` }}` | Conditional: `billPrinted ? '#E8F5E9' : COLORS.lightBg` for bg, `billPrinted ? COLORS.primaryGreen : getStatusColor(...)` for border |
| **E-5** | `TableCard.jsx` — `cardStyle` useMemo | L281-284 | `{ ...CARD_BASE_STYLE, border: \`2px solid ${getStatusColor(...)}\` }` | Add `backgroundColor` conditional + border conditional for `table.billPrinted`. Add `table.billPrinted` to deps array. |

### Files WILL change:
- `src/api/transforms/orderTransform.js` (1 line)
- `src/constants/colors.js` (1 line)
- `src/pages/DashboardPage.jsx` (1 line)
- `src/components/cards/OrderCard.jsx` (1 line — style prop)
- `src/components/cards/TableCard.jsx` (3 lines — cardStyle useMemo body + deps)

### Files will NOT touch:
- `CollectPaymentPanel.jsx` — no change
- `OrderEntry.jsx` — no change
- `profileTransform.js` — no change
- `Sidebar.jsx` — no change
- Any API service file — no change
- Any print/payment/tax logic — no change

---

## Downstream Consumers

| Consumer | Impact |
|---|---|
| OrderCard header bg (`getHeaderBgColor()`) | NOT affected — header bg is separate from card bg |
| TableCard header pill style | NOT affected — pill bg is `#F5F5F5` hardcoded |
| `getStatusColor()` calls for text color (amount, label) | NOT affected — text colours remain status-based. Only border + card bg change. |
| Search/filter logic | NOT affected — `billPrinted` not used in search |
| Socket handlers | NOT affected — existing `update-order` event already carries `bill_print`; no handler changes |
| Reports / print payload | NOT affected — `billPrinted` is display-only |

---

## Owner Decisions — ALL CLOSED

| OD | Decision | Date |
|---|---|---|
| OD-583-01 | CLOSED — no restaurant-type check needed (applies to ALL restaurants) | 2026-10-17 |
| OD-583-02 | CLOSED — backend field = `bill_print` (printing handover confirmed 2026-11-06) | 2026-11-06 |
| **DESIGN LOCK** | **Option B approved — green border `#329937` + light green background `#E8F5E9`** | **2026-11-06** |

---

## Verification Matrix

| # | Check | File | Method | Automated? |
|---|-------|------|--------|:---:|
| V-1 | `billPrinted` maps correctly from `bill_print` | orderTransform.js | Unit test: mock `{ bill_print: "Yes" }` → expect `billPrinted: true` | YES |
| V-2 | `billPrinted` maps from legacy `print_bill_status` | orderTransform.js | Unit test: mock `{ print_bill_status: "Yes" }` → expect `billPrinted: true` | YES |
| V-3 | `billPrinted: false` when both absent | orderTransform.js | Unit test: mock `{}` → expect `billPrinted: false` | YES |
| V-4 | `billPrinted` threaded in DashboardPage enrichment | DashboardPage.jsx | Code review: field present in enriched table | YES |
| V-5 | OrderCard: green bg `#E8F5E9` when `billPrinted=true` | OrderCard.jsx | Browser: find printed order → inspect background-color | NO |
| V-6 | OrderCard: green border `#329937` when `billPrinted=true` | OrderCard.jsx | Browser: inspect border-color | NO |
| V-7 | OrderCard: white bg + status border when `billPrinted=false` | OrderCard.jsx | Browser: unprinted order → white bg, orange/yellow border | NO |
| V-8 | TableCard: green bg `#E8F5E9` when `billPrinted=true` | TableCard.jsx | Browser: table view → printed order card is green | NO |
| V-9 | TableCard: green border `#329937` when `billPrinted=true` | TableCard.jsx | Browser: inspect border-color | NO |
| V-10 | TableCard: white bg + status border when `billPrinted=false` | TableCard.jsx | Browser: unprinted order → normal colours | NO |
| V-11 | Available table: white bg + gray border (unchanged) | TableCard.jsx | Browser: available table stays white | NO |
| V-12 | Socket update: card transitions to green in real-time | Both cards | Browser: print bill → card bg changes without refresh | NO |
| V-13 | Compile clean | All | `webpack` — 0 new warnings | YES |

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-583 → status: GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: BUG-583 row updated
- [ ] FILE_OWNERSHIP.md: add orderTransform.js, colors.js, DashboardPage.jsx, OrderCard.jsx, TableCard.jsx
- [ ] Code markers: // BUG-583 in every modified file
```

---

## Handover

```
Impact Analysis complete: BUG-583
Stage: Impact Analysis (Gate 2)
Code reality: PARTIAL (billPrinted field exists but reads wrong API key; visual rendering = NONE)
Risk: LOW-MEDIUM
Files WILL change: orderTransform.js, colors.js, DashboardPage.jsx, OrderCard.jsx, TableCard.jsx (5 files, 5 edits)
Files WILL NOT touch: CollectPaymentPanel, OrderEntry, profileTransform, Sidebar, any API/service/payment/print logic
Owner decisions: ALL CLOSED + DESIGN LOCKED (Option B: green border + green background)
Design mockups: 3 images (before table / after table / after order card) — owner-approved 2026-11-06
Doc: /app/memory/impact/BUG-583_IMPACT_ANALYSIS_2026_11_06.md
Next: Gate 3 (Implementation Plan) → Gate 4 GO
```
