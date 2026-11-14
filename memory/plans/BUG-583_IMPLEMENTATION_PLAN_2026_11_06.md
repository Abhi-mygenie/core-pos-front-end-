# BUG-583 — Implementation Plan (Gate 3)

**Gate:** 3 — Implementation Plan
**Role:** PLANNING (stage = implementation_plan)
**Date:** 2026-11-06
**IA verified:** All 5 target lines confirmed accurate at current HEAD.
**Design Lock:** Owner-approved 2026-11-06 — green border `#329937` + light green background `#E8F5E9`

---

## Scope Lock

**Files WILL change (5):**
1. `src/constants/colors.js`
2. `src/api/transforms/orderTransform.js`
3. `src/pages/DashboardPage.jsx`
4. `src/components/cards/OrderCard.jsx`
5. `src/components/cards/TableCard.jsx`

**Files will NOT touch:**
- `CollectPaymentPanel.jsx` · `OrderEntry.jsx` · `profileTransform.js` · `Sidebar.jsx`
- Any API service · Any print/payment/tax logic · `TableCard.styles.js`
- No new files created

---

## Execution Sequence

Edits MUST be applied in this order. E-1 and E-2 are foundation; E-3 unblocks E-5; E-4 and E-5 are the visual changes.

```
E-1 (colors.js)         — add billPrintedBg constant
E-2 (orderTransform.js) — fix bill_print field mapping
E-3 (DashboardPage.jsx) — thread billPrinted to enriched table
E-4 (OrderCard.jsx)     — conditional bg + border
E-5 (TableCard.jsx)     — conditional bg + border
── webpack compile check ──
```

---

## E-1 — Add `billPrintedBg` constant to COLORS

**File:** `src/constants/colors.js`
**Line:** 16 (after `errorText` line)
**Type:** Additive (1 new line)

**Current (L15-17):**
```javascript
  errorBg: "#FEE2E2",     // Light red background
  errorText: "#EF4444",   // Red text
};
```

**After:**
```javascript
  errorBg: "#FEE2E2",     // Light red background
  errorText: "#EF4444",   // Red text
  billPrintedBg: "#E8F5E9", // BUG-583: light green background when bill is printed
};
```

**Verification:** `grep billPrintedBg src/constants/colors.js` → 1 match.

---

## E-2 — Fix `billPrinted` field mapping in orderTransform

**File:** `src/api/transforms/orderTransform.js`
**Line:** 310
**Type:** Modify (1 line)
**Risk:** R5 hotspot — change is isolated to a single boolean mapping, no downstream payload impact.

**Current (L310):**
```javascript
      billPrinted: api.print_bill_status === 'Yes',
```

**After (L310):**
```javascript
      billPrinted: api.bill_print === 'Yes' || api.print_bill_status === 'Yes', // BUG-583: bill_print is the new field; print_bill_status kept as fallback
```

**Why fallback:** Printing handover states `print_bill_status` is a "separate legacy field, not synchronized." Using `||` ensures both old and new backend versions work. `bill_print` takes precedence (listed first in `||`).

**Verification:** Unit test — mock `{ bill_print: "Yes" }` → `billPrinted === true`. Mock `{ print_bill_status: "Yes" }` → `billPrinted === true`. Mock `{}` → `billPrinted === false`.

---

## E-3 — Thread `billPrinted` into DashboardPage enriched table object

**File:** `src/pages/DashboardPage.jsx`
**Line:** 1214 (inside the `enrichedTables` map return)
**Type:** Additive (1 new line)
**Risk:** R5 hotspot — change is a single additive field in a spread object. No logic altered.

**Current (L1209-1216):**
```javascript
        return {
          ...table,
          customer: orderData.customer || "", // BUG-589: removed || table.label fallback — available tables should show "Available" not the table label as customer
          phone: orderData.phone || "",
          status: orderData.status || table.status || "available",
          amount: orderData.amount || table.amount,
          fOrderStatus: orderData.fOrderStatus || table.fOrderStatus
        };
```

**After (L1209-1217):**
```javascript
        return {
          ...table,
          customer: orderData.customer || "", // BUG-589: removed || table.label fallback — available tables should show "Available" not the table label as customer
          phone: orderData.phone || "",
          status: orderData.status || table.status || "available",
          amount: orderData.amount || table.amount,
          fOrderStatus: orderData.fOrderStatus || table.fOrderStatus,
          billPrinted: orderData.billPrinted || false, // BUG-583: thread print status to TableCard
        };
```

**Why `|| false`:** Available tables have no `orderData`, so `orderData.billPrinted` is `undefined`. Default to `false` so TableCard always sees a boolean.

**Verification:** After login, inspect enriched table objects in React DevTools — orders with `bill_print: "Yes"` should have `billPrinted: true`.

---

## E-4 — OrderCard: conditional background + border when bill printed

**File:** `src/components/cards/OrderCard.jsx`
**Line:** 456 (`style` prop on the outer card div)
**Type:** Modify (1 line — the `style` attribute)
**Risk:** R5 hotspot — purely visual, no state/logic change. `order.billPrinted` is already in the order model after E-2.

**Current (L456):**
```javascript
      style={{ backgroundColor: COLORS.lightBg, border: `2px solid ${getStatusColor(fOrderStatus, COLORS.borderGray)}`, breakInside: 'avoid' }} // CR-433
```

**After (L456):**
```javascript
      style={{ backgroundColor: order.billPrinted ? COLORS.billPrintedBg : COLORS.lightBg, border: `2px solid ${order.billPrinted ? COLORS.primaryGreen : getStatusColor(fOrderStatus, COLORS.borderGray)}`, breakInside: 'avoid' }} // CR-433 // BUG-583
```

**Breakdown:**
- `backgroundColor`: `order.billPrinted ? '#E8F5E9' : '#FFFFFF'` (via COLORS constants)
- `border`: `order.billPrinted ? '2px solid #329937' : '2px solid <status-color>'`
- `breakInside: 'avoid'` — unchanged
- `order.billPrinted` — accessible because `order` is a prop (L37) and `billPrinted` is mapped in transform (E-2)

**Verification:** Browser — find a printed order in Channel View → card background is light green `#E8F5E9`, border is green `#329937`. Find an unprinted order → white background, status-based border.

---

## E-5 — TableCard: conditional background + border when bill printed

**File:** `src/components/cards/TableCard.jsx`
**Line:** 280-284 (`cardStyle` useMemo)
**Type:** Modify (useMemo body + deps array — 5 lines become 7 lines)
**Risk:** R5-adjacent — purely visual. `table.billPrinted` available after E-3.

**Current (L280-284):**
```javascript
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    border: `2px solid ${getStatusColor(table.fOrderStatus, COLORS.borderGray)}`, // CR-433
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), [table.fOrderStatus]); // CR-433: react to status changes
```

**After (L280-286):**
```javascript
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    backgroundColor: table.billPrinted ? COLORS.billPrintedBg : COLORS.lightBg, // BUG-583: green bg when bill printed
    border: `2px solid ${table.billPrinted ? COLORS.primaryGreen : getStatusColor(table.fOrderStatus, COLORS.borderGray)}`, // CR-433 // BUG-583
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), [table.fOrderStatus, table.billPrinted]); // CR-433 + BUG-583: react to status + print changes
```

**Key detail:** `CARD_BASE_STYLE` already sets `backgroundColor: COLORS.lightBg`. Our explicit `backgroundColor` line comes AFTER the spread, so it overrides it. When `billPrinted` is false, it sets the same `COLORS.lightBg` — no visual difference. When true, it overrides to `COLORS.billPrintedBg`.

**Deps array:** Added `table.billPrinted` so the style re-computes when the print status changes (e.g., via socket update).

**Verification:** Browser — Table View: printed order card has light green background + green border. Available tables stay white + gray border.

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `bill_print` field absent on some backend versions | LOW | Card stays white (fallback safe) | `|| api.print_bill_status` fallback in E-2 |
| `table.billPrinted` undefined for available tables | MEDIUM | `undefined` is falsy → white bg, gray border | `|| false` default in E-3 |
| `CARD_BASE_STYLE` spread overrides our `backgroundColor` | NONE | Our line comes AFTER spread — overrides it | Verified: JS object spread order |
| useMemo deps stale | LOW | Card wouldn't update on print status change | `table.billPrinted` added to deps in E-5 |
| Other items modifying OrderCard L456 concurrently | LOW | Merge conflict | Conflict pre-check: parallel-safe (CR-433 is closed, CR-482 touches different lines) |

---

## Verification Matrix (seeds QA handover)

| # | Edit | File | Change | How to Verify | Auto? |
|---|------|------|--------|---------------|:---:|
| V-1 | E-2 | orderTransform.js:310 | `bill_print` → `billPrinted: true` | Unit test: `{ bill_print: "Yes" }` → `true` | YES |
| V-2 | E-2 | orderTransform.js:310 | Legacy fallback works | Unit test: `{ print_bill_status: "Yes" }` → `true` | YES |
| V-3 | E-2 | orderTransform.js:310 | Both absent → false | Unit test: `{}` → `false` | YES |
| V-4 | E-1 | colors.js | `billPrintedBg` exported | `grep billPrintedBg colors.js` — 1 match | YES |
| V-5 | E-3 | DashboardPage.jsx | `billPrinted` in enriched table | Code inspect / React DevTools | YES |
| V-6 | E-4 | OrderCard.jsx:456 | Printed order → green bg `#E8F5E9` | Browser: Channel View, inspect `background-color` | NO |
| V-7 | E-4 | OrderCard.jsx:456 | Printed order → green border `#329937` | Browser: inspect `border` | NO |
| V-8 | E-4 | OrderCard.jsx:456 | Unprinted order → white bg, status border | Browser: unprinted order | NO |
| V-9 | E-5 | TableCard.jsx:280 | Printed table → green bg `#E8F5E9` | Browser: Table View, inspect | NO |
| V-10 | E-5 | TableCard.jsx:280 | Printed table → green border `#329937` | Browser: inspect `border` | NO |
| V-11 | E-5 | TableCard.jsx:280 | Unprinted table → white bg, status border | Browser: check orange/yellow cards | NO |
| V-12 | E-5 | TableCard.jsx:280 | Available table → unchanged (white + gray) | Browser: available card | NO |
| V-13 | — | All | Socket: card turns green after print event | Browser: print bill → card updates in real-time | NO |
| V-14 | — | All | Compile: 0 new warnings | `webpack` | YES |

---

## Post-Code Registry Checklist

The Implementation agent MUST execute after coding:

```
- [ ] registry.json: BUG-583 → status: GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: BUG-583 row → GATE_5A_IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: add entry for BUG-583 (colors.js, orderTransform.js, DashboardPage.jsx, OrderCard.jsx, TableCard.jsx)
- [ ] Code markers: // BUG-583 comment in every modified file (5 files)
```

---

## Handover

```
Plan ready at /app/memory/plans/BUG-583_IMPLEMENTATION_PLAN_2026_11_06.md
5 edits across 5 files.
Code reality: PARTIAL (billPrinted mapping exists at wrong field; visual rendering = NONE).
Scope: colors.js, orderTransform.js, DashboardPage.jsx, OrderCard.jsx, TableCard.jsx
       / will NOT touch: CPP, OrderEntry, profileTransform, Sidebar, API services, print/payment/tax logic
Verification matrix: 14 checks (5 automated, 9 manual browser).
Owner decisions needed: NONE (all closed, design locked).
Awaiting Gate 4 GO.
```
