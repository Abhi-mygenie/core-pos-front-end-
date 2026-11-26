# Implementation Plan — CR-433
## Order + Table Card Visual Redesign

**Role:** PLANNING (Gate 3 — Implementation Plan)
**Date:** 2026-10-16
**Based on:** `impact/CR-433_IMPACT_ANALYSIS_2026_10_16.md` (Gate 2 CLOSED)
**Code Reality:** NONE — 0 existing CR-433 markers, all anchors verified at HEAD
**Risk:** MEDIUM · 3 files · OrderCard.jsx = R5 · CSS/color changes only
**Conflict:** BUG-575 (L468), BUG-557 (L1206) — CLEAN (different lines)

---

## Scope Lock

**WILL change (3 files):**
- `src/constants/colors.js` — add `getStatusColor` helper (5 lines)
- `src/components/cards/OrderCard.jsx` — 6 edits (E-OC0 to E-OC5) — **R5**
- `src/components/cards/TableCard.jsx` — 4 edits (E-TC0 to E-TC3)

**WILL NOT touch:**
- Buttons, icons, placement, layout — confirmed no change
- `DashboardPage.jsx`, `ChannelColumn.jsx`, `orderTransform.js` — no change
- Item variant/addon text — stays gray/italic
- `getHeaderBgColor()` header background — stays `#F5F5F5`
- Reserved/Hold/YTC badges — existing special-case styling untouched

---

## Step 0 — Entry Verification

```bash
# Confirm 0 existing CR-433 markers
grep -c "CR-433" \
  /app/frontend/src/constants/colors.js \
  /app/frontend/src/components/cards/OrderCard.jsx \
  /app/frontend/src/components/cards/TableCard.jsx
# Expected: 0 for all three

# E-OC1 anchor
sed -n '455p' /app/frontend/src/components/cards/OrderCard.jsx
# Expected: style={{ backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.borderGray}`, breakInside: 'avoid' }}

# E-OC4 anchor
sed -n '747p' /app/frontend/src/components/cards/OrderCard.jsx
# Expected: <span className="text-[11px]" style={{ color: COLORS.grayText }}>

# E-TC1 anchor
sed -n '282p' /app/frontend/src/components/cards/TableCard.jsx
# Expected: border: `3px solid #E5E5E5`,
```

---

## The Helper Function — `getStatusColor(fOs, fallback)`

Defined ONCE in `colors.js`, imported by both cards. Takes a fallback so each use-site
gets the right "default" colour (border→borderGray, amount→grayText, label→darkText).

```js
// CR-433: status-based colour for card border, amount, and table/order label
export const getStatusColor = (fOs, fallback = COLORS.darkText) => {
  if (fOs === 1)                        return '#F59E0B';           // Preparing → Yellow
  if (fOs === 2)                        return COLORS.primaryOrange; // Ready     → Orange
  if (fOs === 5 || fOs === 6)           return COLORS.primaryGreen;  // Served/Billed → Green
  return fallback; // Hold(8),YTC(7),PayLater(9),Agg(0) → caller's fallback
};
```

---

## FILE 1 — `src/constants/colors.js`

### E-1: Add `getStatusColor` at end of file

```js
// BEFORE (last 2 lines of file):
  "direct": { label: "D", color: COLORS.primaryOrange },
};

// AFTER:
  "direct": { label: "D", color: COLORS.primaryOrange },
};

// CR-433: status-based colour for card border, amount, and table/order label
export const getStatusColor = (fOs, fallback = COLORS.darkText) => {
  if (fOs === 1)                  return '#F59E0B';
  if (fOs === 2)                  return COLORS.primaryOrange;
  if (fOs === 5 || fOs === 6)     return COLORS.primaryGreen;
  return fallback;
};
```

---

## FILE 2 — `src/components/cards/OrderCard.jsx` ⚠️ R5

### E-OC0: Add `getStatusColor` to import

```js
// BEFORE:
import { COLORS, SOURCE_COLORS } from "../../constants";

// AFTER:
import { COLORS, SOURCE_COLORS, getStatusColor } from "../../constants"; // CR-433
```

### E-OC1: Card root border — L455

```js
// BEFORE:
      style={{ backgroundColor: COLORS.lightBg, border: `1px solid ${COLORS.borderGray}`, breakInside: 'avoid' }}

// AFTER:
      style={{ backgroundColor: COLORS.lightBg, border: `2px solid ${getStatusColor(fOrderStatus, COLORS.borderGray)}`, breakInside: 'avoid' }} // CR-433
```

### E-OC2: Table/order number color — L481

```jsx
// BEFORE:
            <span className={`${(isRoom || isDineIn) ? 'font-extrabold text-lg' : 'text-xs font-medium'} truncate`} style={{ color: COLORS.darkText }}>

// AFTER:
            <span className={`${(isRoom || isDineIn) ? 'font-extrabold text-lg' : 'text-xs font-medium'} truncate`} style={{ color: getStatusColor(fOrderStatus, COLORS.darkText) }}> {/* CR-433 */}
```

### E-OC3: Amount color — L517

```jsx
// BEFORE:
        <span className="font-extrabold text-lg flex-shrink-0 ml-2" style={{ color: COLORS.grayText }}>

// AFTER:
        <span className="font-extrabold text-lg flex-shrink-0 ml-2" style={{ color: getStatusColor(fOrderStatus, COLORS.grayText) }}> {/* CR-433 */}
```

### E-OC4: Item name — L747

```jsx
// BEFORE:
                    <span className="text-[11px]" style={{ color: COLORS.grayText }}>

// AFTER:
                    <span className="text-[13px] font-semibold" style={{ color: COLORS.darkText }}> {/* CR-433: bolder, larger, darker so item names stand out */}
```

**Note:** Color changes from `grayText (#666)` to `darkText (#1A1A1A)` to contrast with gray variant/addon text. Font-size `11px → 13px`, added `font-semibold`. Applies to ALL order types (POS + aggregator — both use this same span).

### E-OC5: Item row spacing — L728

```jsx
// BEFORE:
              <div key={item.id} className={isDineIn ? "py-1" : "py-0.5"}>

// AFTER:
              <div key={item.id} className="py-0.5"> {/* CR-433: uniform tighter spacing — was isDineIn?py-1:py-0.5 */}
```

---

## FILE 3 — `src/components/cards/TableCard.jsx`

### E-TC0: Add `getStatusColor` to import

```js
// BEFORE:
import { COLORS, CONFIG } from "../../constants";

// AFTER:
import { COLORS, CONFIG, getStatusColor } from "../../constants"; // CR-433
```

### E-TC1: Card border in useMemo — L280-284

```js
// BEFORE:
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    border: `3px solid #E5E5E5`,
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), []);

// AFTER:
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    border: `2px solid ${getStatusColor(table.fOrderStatus, COLORS.borderGray)}`, // CR-433
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), [table.fOrderStatus]); // CR-433: add fOrderStatus to deps so border reacts to status changes
```

### E-TC2: Amount color — L367

```jsx
// BEFORE:
            <span className="text-xs font-semibold flex-shrink-0">{currencySymbol}{table.amount.toLocaleString()}</span>

// AFTER:
            <span className="text-xs font-semibold flex-shrink-0" style={{ color: getStatusColor(table.fOrderStatus, COLORS.grayText) }}>{currencySymbol}{table.amount.toLocaleString()}</span> {/* CR-433 */}
```

### E-TC3: Table label/number color — L348

```jsx
// BEFORE:
            <span className="text-sm font-bold truncate" title={table.label || table.id}>{table.label || table.id}</span>

// AFTER:
            <span className="text-sm font-bold truncate" style={{ color: getStatusColor(table.fOrderStatus, COLORS.darkText) }} title={table.label || table.id}>{table.label || table.id}</span> {/* CR-433 */}
```

---

## Execution Sequence

```
1. Step 0: Entry verification (3 grep checks)
2. Apply E-1      (colors.js — add helper)
3. Apply E-OC0    (OrderCard import)
4. Apply E-OC1    (OrderCard border)
5. Apply E-OC2    (OrderCard table/order number)
6. Apply E-OC3    (OrderCard amount)
7. Apply E-OC4    (OrderCard item name)
8. Apply E-OC5    (OrderCard item spacing)
9. Apply E-TC0    (TableCard import)
10. Apply E-TC1   (TableCard border + useMemo deps)
11. Apply E-TC2   (TableCard amount)
12. Apply E-TC3   (TableCard table label)
13. Compile check: webpack clean
14. Self-verify: grep -c "CR-433" in all 3 files ≥ expected
15. EXIT GATE (5 checkboxes)
```

**Total: 3 files · 12 edits**

---

## `getStatusColor` Fallback Strategy

| Use site | Fallback | Behaviour for Hold/YTC/PayLater |
|---|---|---|
| Card border (both) | `COLORS.borderGray` | Thin gray border — looks unchanged |
| Amount text (both) | `COLORS.grayText` | Gray amount — same as before |
| Table/order label (both) | `COLORS.darkText` | Dark text — readable |

---

## Risk Register

| Risk | Likelihood | Mitigation |
|---|---|---|
| Desktop regression (OrderCard) | Low | CSS-only; layout/size unchanged |
| Item name color breaks aggregator view | None | Same span used for agg and POS |
| TableCard useMemo re-renders | Very Low | `table.fOrderStatus` changes are infrequent |
| Reserved/Hold badges affected | None | Guarded by their own conditionals before the amount span (L350-364) |
| R5 regression | Low | Only color properties changed; no layout, no logic |

---

## Verification Matrix

| # | Check | Method |
|---|---|---|
| V1 | Preparing card → yellow `#F59E0B` border + amount + label | Browser |
| V2 | Ready card → orange border + amount + label | Browser |
| V3 | Served card → green border + amount + label | Browser |
| V4 | Hold (fOs=8) → default gray border, dark label, gray amount | Browser |
| V5 | Item names: 13px, font-semibold, dark `#1A1A1A`, stand out | Browser |
| V6 | Item row spacing tighter — `py-0.5` uniform | Browser |
| V7 | TableCard same status colors | Browser |
| V8 | Buttons, icons, layout: UNCHANGED | Browser |
| V9 | Reserved/prepaid/HOLD badges: UNCHANGED | Browser |
| V10 | Compile: webpack clean | CLI |

---

## R5 Regression Checklist (OrderCard.jsx)

| # | Test |
|---|---|
| R1 | Place dine-in order, mark ready → card turns orange |
| R2 | Serve order → card turns green |
| R3 | Aggregator card → item names visible, no layout break |
| R4 | Snoozed card (opacity-60) → still shows status color |
| R5 | Print/Serve/Bill buttons → unchanged, no regression |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-433 → GATE_5A_IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: prepend new Last Updated row
- [ ] FILE_OWNERSHIP.md: colors.js + OrderCard.jsx + TableCard.jsx entries updated
- [ ] Code markers: CR-433 at all 12 edit sites
- [ ] Compile: webpack clean
```
