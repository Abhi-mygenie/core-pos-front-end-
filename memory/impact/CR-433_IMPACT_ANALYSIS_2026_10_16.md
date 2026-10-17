# Impact Analysis — CR-433
## Order + Table Card Visual Redesign: status-based border, amount, table number, item names

**Role:** PLANNING (Gate 2 — Impact Analysis)
**Date:** 2026-10-16
**Code Reality:** PARTIAL — both cards exist; all visual changes are purely CSS/color, no logic or layout changes
**Conflict Pre-Check:** BUG-575 (OrderCard.jsx L468 stopPropagation) — CLEAN, different line. BUG-557 (OrderCard.jsx L1206 Assign block) — CLEAN, different line. CR-432 (ChannelColumn.jsx) — CLEAN, different file.

---

## 1. Summary of All Confirmed Changes

| # | Element | Current | New | Scope |
|---|---|---|---|---|
| 1 | Card border | `1px solid borderGray` | `2px solid statusColor` (yellow/orange/green) | OrderCard + TableCard |
| 2 | Amount ₹ | `color: COLORS.grayText` | `color: statusColor` | OrderCard |
| 3 | Table/order number | `color: COLORS.darkText` | `color: statusColor` | OrderCard |
| 4 | Amount in TableCard | `text-xs font-semibold` (no color) | add `statusColor` | TableCard |
| 5 | Item names (active) | `text-xs` 12px normal | `text-[13px] font-semibold` | OrderCard only |
| 6 | Item row spacing | `py-1.5` / `py-1` (spread out) | tighter `py-1` uniform | OrderCard only |
| 7 | Customer name | `color: COLORS.darkText` | **UNCHANGED** — Bold dark stays | — |
| 8 | Buttons/icons/placement | any | **NO CHANGE** (owner confirmed) | — |

**Edge case statuses (fOrderStatus 7, 8, 9, 0):** Default stays → `border: 1px solid COLORS.borderGray` (owner confirmed: no change)

---

## 2. Status Color Mapping (shared logic, both cards)

```js
// getStatusBorderColor(fOrderStatus) — to be defined in both cards
const getStatusBorderColor = (fOs) => {
  if (fOs === 1)          return '#F59E0B'; // Preparing → Yellow
  if (fOs === 2)          return '#F26B33'; // Ready/Serving → Orange (COLORS.primaryOrange)
  if (fOs === 5 || fOs === 6) return '#329937'; // Served/Billed → Green (COLORS.primaryGreen)
  return COLORS.borderGray; // Hold(8), YTC(7), PayLater(9), Agg(0), Cancelled(3) → default gray
};
```

---

## 3. Code Reality — OrderCard.jsx (R5 HOTSPOT)

| Edit | Line | Current | Change |
|---|---|---|---|
| E-OC1 | **L455** | `border: 1px solid ${COLORS.borderGray}` | `border: 2px solid ${getStatusBorderColor(fOrderStatus)}` |
| E-OC2 | **L481** | `style={{ color: COLORS.darkText }}` (table/order number) | `style={{ color: getStatusBorderColor(fOrderStatus) }}` |
| E-OC3 | **L517** | `style={{ color: COLORS.grayText }}` (amount) | `style={{ color: getStatusBorderColor(fOrderStatus) }}` |
| E-OC4 | **L688+** | Item name `className` with `text-xs` (12px) normal weight | `text-[13px] font-semibold` |
| E-OC5 | **L687** | `py-1.5` (dineIn) / `py-1` spacing | `py-1` uniform tighter spacing |

**+ Add helper const before L451 (return statement):**
```js
const getStatusBorderColor = (fOs) => {
  if (fOs === 1) return '#F59E0B';
  if (fOs === 2) return '#F26B33';
  if (fOs === 5 || fOs === 6) return '#329937';
  return COLORS.borderGray;
}; // CR-433
```

---

## 4. Code Reality — TableCard.jsx (NOT R5)

**TableCard HAS `table.fOrderStatus`** — confirmed at L39, L42, L477-479. Same helper logic applies.

| Edit | Line | Current | Change |
|---|---|---|---|
| E-TC1 | **L282** | `border: 3px solid #E5E5E5` (in `useMemo`) | `border: 2px solid ${getStatusBorderColor(table.fOrderStatus)}` + add `table.fOrderStatus` to `useMemo` deps |
| E-TC2 | **L365-367** | Amount `<span className="text-xs font-semibold">` no color | Add `style={{ color: getStatusBorderColor(table.fOrderStatus) }}` |
| E-TC3 | **L426** | Table name/number `color: COLORS.darkText` | Add `color: getStatusBorderColor(table.fOrderStatus)` |

**+ Add helper const before L62 (`const statusConfig = ...`):**
```js
const getStatusBorderColor = (fOs) => {
  if (fOs === 1) return '#F59E0B';
  if (fOs === 2) return '#F26B33';
  if (fOs === 5 || fOs === 6) return '#329937';
  return COLORS.borderGray;
}; // CR-433
```

---

## 5. Data Flow Trace

```
ORDERCARD:
  fOrderStatus = order.fOrderStatus || 1  (L133)
  getStatusBorderColor(fOrderStatus)
    → Card root border (L455)
    → Table/order number color (L481)
    → Amount color (L517)

TABLECARD:
  table.fOrderStatus  (received as prop from DashboardPage)
  getStatusBorderColor(table.fOrderStatus)
    → cardStyle.border (L282 memoized)  ← must add fOrderStatus to deps
    → Amount color (L365-367)
    → Table number color (L426)

Items section (OrderCard ONLY):
  item.name displayed at L710+ → font-size 12px → 13px, weight normal → semibold
  item row wrapper L687 → tighter padding
```

---

## 6. Edge Cases Confirmed

| fOrderStatus | State | Border color |
|---|---|---|
| 1 | Preparing | 🟡 `#F59E0B` Yellow |
| 2 | Ready/Serving | 🟠 `#F26B33` Orange |
| 5 | Served | 🟢 `#329937` Green |
| 6 | Paid/Billed | 🟢 `#329937` Green |
| 7 (YTC Web) | Pending confirm | ⬜ Default gray **no change** |
| 8 (Hold) | On hold | ⬜ Default gray **no change** |
| 9 (PayLater) | Pending pay | ⬜ Default gray **no change** |
| 0 (Aggregator) | New agg order | ⬜ Default gray **no change** |
| 3 (Cancelled) | Cancelled | ⬜ Default gray (cards usually hidden) **no change** |

---

## 7. Risk Classification

**Risk: MEDIUM**
- OrderCard.jsx IS R5 (hotspot) → full gate + regression checklist required
- TableCard.jsx NOT R5 → normal risk
- All changes are pure CSS/color — no logic, no layout, no financial, no data change
- `useMemo` deps in TableCard must be updated carefully (add `table.fOrderStatus`)
- No buttons, placement, icons changed (owner confirmed)

**Fast Lane:** NOT eligible (R5 file + multi-file)

---

## 8. Conflict Pre-Check

| Item | File | Lines | Status | Interaction |
|---|---|---|---|---|
| BUG-575 | OrderCard.jsx L468 | GATE_5B_QA_PASSED | CLEAN — different line |
| BUG-557 | OrderCard.jsx L1206 | GATE_5B_QA_CONDITIONAL_PASS | CLEAN — different line |
| CR-432 | ChannelColumn.jsx | GATE_5B_QA_PASSED | CLEAN — different file |

---

## 9. Verification Matrix

| # | Check | Method |
|---|---|---|
| V1 | Preparing card → yellow `#F59E0B` border + amount + table number | Browser |
| V2 | Ready card → orange `#F26B33` border + amount + table number | Browser |
| V3 | Served card → green `#329937` border + amount + table number | Browser |
| V4 | Hold / YTC / PayLater → default gray border (unchanged) | Browser |
| V5 | Item names: 13px, font-semibold, visually stand out | Browser |
| V6 | Item rows: tighter spacing, compact | Browser |
| V7 | TableCard status view: same 3 colors per column | Browser |
| V8 | Buttons, icons, placement: unchanged | Browser |
| V9 | Aggregator cards: no color change (fOrderStatus=0 → gray) | Browser |
| V10 | Compile: webpack clean | CLI |

---

## 10. Open Decisions

**OD-433-04 — LOCKED 2026-10-16**
Approach: **(b) Shared constant in `src/constants/colors.js`**

```js
// CR-433: add at end of src/constants/colors.js
export const getStatusBorderColor = (fOrderStatus) => {
  if (fOrderStatus === 1)                       return '#F59E0B';           // Preparing → Yellow
  if (fOrderStatus === 2)                       return COLORS.primaryOrange; // Ready → Orange
  if (fOrderStatus === 5 || fOrderStatus === 6) return COLORS.primaryGreen;  // Served/Billed → Green
  return COLORS.borderGray;                                                   // Others → default gray
}; // CR-433
```

- `colors.js` already owns `primaryOrange`, `primaryGreen`, `borderGray` — natural home
- Auto-exports through `index.js` (`export * from './colors'`) — no change to `index.js`
- Both cards already import from `"../../constants"` — just add `getStatusBorderColor` to import list
- **Total files: 3** (`colors.js` + `OrderCard.jsx` + `TableCard.jsx`)

**OD-433-05 (NOTE):** Header background (`getHeaderBgColor = #F5F5F5`) — LEFT UNCHANGED per owner (not in stated requirements).

---

## Gate 2 Status: CLOSED — 2026-10-16
All ODs locked. No open questions. Gate 3 plan can proceed.

---

## Artifacts
- IA: `/app/memory/impact/CR-433_IMPACT_ANALYSIS_2026_10_16.md`
- Intake: `change_requests/CR-433_ORDER_CARD_VISUAL_REDESIGN_ORANGE_BORDER_INTAKE.md`
