# BUG-583 — Implementation Plan VALIDATION (Gate 3 Revalidation)

**Gate:** 3 — Implementation Plan (Line Number Revalidation)
**Role:** PLANNING (validate implementation plan)
**Date:** 2026-11-06
**Reason:** BUG-652/653/654/655 fixes added lines to DashboardPage.jsx; other edits may have shifted targets.

---

## Validation Summary

| Edit | File | Plan Line | Actual Line | Drift | Content Match |
|------|------|-----------|-------------|-------|:---:|
| **E-1** | `colors.js` | L15-17 | **L16-18** | **+1** | ✅ Content matches |
| **E-2** | `orderTransform.js` | L310 | **L310** | **0** | ✅ Exact match |
| **E-3** | `DashboardPage.jsx` | L1209-1216 | **L1220-1227** | **+11** | ✅ Content matches |
| **E-4** | `OrderCard.jsx` | L456 | **L458** | **+2** | ✅ Content matches |
| **E-5** | `TableCard.jsx` | L280-284 | **L281-285** | **+1** | ✅ Content matches |

**Result: All 5 edit targets have matching content. Only line numbers drifted. No re-planning needed — corrections below.**

---

## E-1 — CORRECTED: `colors.js` insert at L17 (was L16)

**File:** `src/constants/colors.js`
**Actual line range:** L16-18 (not L15-17)

**Current (L16-18):**
```javascript
  errorBg: "#FEE2E2",     // Light red background
  errorText: "#EF4444",   // Red text
};
```

**After (L16-19):**
```javascript
  errorBg: "#FEE2E2",     // Light red background
  errorText: "#EF4444",   // Red text
  billPrintedBg: "#E8F5E9", // BUG-583: light green background when bill is printed
};
```

**Insert after L17** (errorText line).

---

## E-2 — NO CHANGE: `orderTransform.js` L310

**Line 310 matches exactly.**

**Current (L310):**
```javascript
      billPrinted: api.print_bill_status === 'Yes',
```

**After (L310):**
```javascript
      billPrinted: api.bill_print === 'Yes' || api.print_bill_status === 'Yes', // BUG-583: bill_print is the new field; print_bill_status kept as fallback
```

---

## E-3 — CORRECTED: `DashboardPage.jsx` L1220-1227 (was L1209-1216)

**Drift reason:** BUG-652/653/654/655 fixes added ~11 lines earlier in the file (keyboard handler changes at L454, L1699-1731 area).

**Current (L1220-1227):**
```javascript
        return {
          ...table,
          customer: orderData.customer || "", // BUG-589
          phone: orderData.phone || "",
          status: orderData.status || table.status || "available",
          amount: orderData.amount || table.amount,
          fOrderStatus: orderData.fOrderStatus || table.fOrderStatus
        };
```

**After (L1220-1228):**
```javascript
        return {
          ...table,
          customer: orderData.customer || "", // BUG-589
          phone: orderData.phone || "",
          status: orderData.status || table.status || "available",
          amount: orderData.amount || table.amount,
          fOrderStatus: orderData.fOrderStatus || table.fOrderStatus,
          billPrinted: orderData.billPrinted || false, // BUG-583: thread print status to TableCard
        };
```

**Add after L1226** (fOrderStatus line — add comma + new line).

---

## E-4 — CORRECTED: `OrderCard.jsx` L458 (was L456)

**Drift reason:** +2 lines from keyboard attribute additions (L455-456 area).

**Current (L458):**
```javascript
      style={{ backgroundColor: COLORS.lightBg, border: `2px solid ${getStatusColor(fOrderStatus, COLORS.borderGray)}`, breakInside: 'avoid' }} // CR-433
```

**After (L458):**
```javascript
      style={{ backgroundColor: order.billPrinted ? COLORS.billPrintedBg : COLORS.lightBg, border: `2px solid ${order.billPrinted ? COLORS.primaryGreen : getStatusColor(fOrderStatus, COLORS.borderGray)}`, breakInside: 'avoid' }} // CR-433 // BUG-583
```

**`order` prop:** Confirmed at L37 — available in scope. `COLORS.billPrintedBg` will exist after E-1. `COLORS.primaryGreen` exists at colors.js L4.

---

## E-5 — CORRECTED: `TableCard.jsx` L281-285 (was L280-284)

**Current (L281-285):**
```javascript
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    border: `2px solid ${getStatusColor(table.fOrderStatus, COLORS.borderGray)}`, // CR-433
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), [table.fOrderStatus]); // CR-433: react to status changes
```

**After (L281-287):**
```javascript
  const cardStyle = useMemo(() => ({
    ...CARD_BASE_STYLE,
    backgroundColor: table.billPrinted ? COLORS.billPrintedBg : COLORS.lightBg, // BUG-583: green bg when bill printed
    border: `2px solid ${table.billPrinted ? COLORS.primaryGreen : getStatusColor(table.fOrderStatus, COLORS.borderGray)}`, // CR-433 // BUG-583
    minHeight: CONFIG.CARD_MIN_HEIGHT,
  }), [table.fOrderStatus, table.billPrinted]); // CR-433 + BUG-583: react to status + print changes
```

---

## Dependency & Import Verification

| Check | Result |
|-------|--------|
| `COLORS.primaryGreen` exists | ✅ colors.js L4: `"#329937"` |
| `COLORS.lightBg` exists | ✅ colors.js L7: `"#FFFFFF"` |
| `COLORS.borderGray` exists | ✅ colors.js L10: `"#E5E5E5"` |
| `getStatusColor` imported in OrderCard | ✅ L3 |
| `getStatusColor` imported in TableCard | ✅ L4 |
| `order` prop in OrderCard | ✅ L37 |
| `table` prop in TableCard | ✅ (component param) |
| `CARD_BASE_STYLE` imported in TableCard | ✅ L9 |
| No new imports needed | ✅ All constants already exported from `colors.js` → `index.js` |

---

## Conflict Pre-Check (updated)

| File | Last modifier | Conflict risk |
|------|--------------|---------------|
| `colors.js` | CR-433 (2026-10-16) | NONE — additive line |
| `orderTransform.js` | BUG-556 (2026-10-16) | NONE — different line (L310 vs L2225) |
| `DashboardPage.jsx` | BUG-652/653/654/655 (2026-11-06) | SAFE — different regions (L454/L1699 vs L1220) |
| `OrderCard.jsx` | BUG-652 kbd attrs (2026-11-06) | SAFE — L456 attrs vs L458 style |
| `TableCard.jsx` | CR-433 (2026-10-16) | SAFE — modifying same useMemo (additive change to existing code) |

**All parallel-safe. No blocking conflicts.**

---

## Corrected Verification Matrix

| # | Edit | File | Actual Line | Change | How to Verify | Auto? |
|---|------|------|-------------|--------|---------------|:---:|
| V-1 | E-2 | orderTransform.js:**310** | `bill_print` → `billPrinted: true` | Unit test: `{ bill_print: "Yes" }` → `true` | YES |
| V-2 | E-2 | orderTransform.js:**310** | Legacy fallback works | Unit test: `{ print_bill_status: "Yes" }` → `true` | YES |
| V-3 | E-2 | orderTransform.js:**310** | Both absent → false | Unit test: `{}` → `false` | YES |
| V-4 | E-1 | colors.js:**17→18** | `billPrintedBg` exported | `grep billPrintedBg colors.js` — 1 match | YES |
| V-5 | E-3 | DashboardPage.jsx:**1226→1227** | `billPrinted` in enriched table | Code inspect / React DevTools | YES |
| V-6 | E-4 | OrderCard.jsx:**458** | Printed order → green bg `#E8F5E9` | Browser: Channel View | NO |
| V-7 | E-4 | OrderCard.jsx:**458** | Printed order → green border `#329937` | Browser: inspect `border` | NO |
| V-8 | E-4 | OrderCard.jsx:**458** | Unprinted order → white bg, status border | Browser | NO |
| V-9 | E-5 | TableCard.jsx:**281-285** | Printed table → green bg `#E8F5E9` | Browser: Table View | NO |
| V-10 | E-5 | TableCard.jsx:**281-285** | Printed table → green border `#329937` | Browser: inspect `border` | NO |
| V-11 | E-5 | TableCard.jsx:**281-285** | Unprinted table → white bg, status border | Browser | NO |
| V-12 | E-5 | TableCard.jsx:**281-285** | Available table → unchanged (white + gray) | Browser | NO |
| V-13 | — | All | Socket: card turns green after print | Browser: print bill → live update | NO |
| V-14 | — | All | Compile: 0 new warnings | `webpack` | YES |

---

## Conclusion

**Plan is VALID. Content at all 5 edit sites matches exactly. Only line numbers drifted due to BUG-652/653/654/655 fixes applied earlier in DashboardPage.jsx and OrderCard.jsx.**

**Corrected line numbers:**
- E-1: Insert after **L17** (was L16)
- E-2: **L310** — unchanged
- E-3: Add field after **L1226** (was L1215)
- E-4: Modify **L458** (was L456)
- E-5: Modify **L281-285** (was L280-284)

**All dependencies (imports, constants, props) verified present. No new imports needed. No conflicts.**

**Status: GATE_3_PLAN_COMPLETE (revalidated). Awaiting Gate 4 GO.**
