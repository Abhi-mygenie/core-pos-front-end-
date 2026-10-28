# IMPACT ANALYSIS — QA Batch Bugs (BUG-623 through BUG-627)

**Date:** 2026-10-28
**Stage:** Gate 2 — Impact Analysis (batch)
**Agent role:** PLANNING

---

## BUG-623 — Null Variation Crashes orderTransform.reduce

**Code Reality:** PARTIAL — CollectPaymentPanel has guards (L259,261), orderTransform does NOT
**Conflict Pre-Check:** orderTransform.js last touched CR-170/BUG-170 (2026-08-20, different lines). No conflict.

### Root Cause
`orderTransform.js:722` — `item.variation.reduce((sum, v) => { if (v.price) ... })` assumes every element in the variation array is non-null. When aggregator/scan socket re-hydration inserts null entries, `v.price` throws `TypeError: Cannot read properties of null`.

There are **3 vulnerable sites** in orderTransform.js:

| Site | Line | Code | Null-safe? |
|---|---|---|---|
| buildCartItem `.map()` | L706 | `item.variation.map(v => { if (v?.values ...) })` | **Partial** — uses `v?.values` but `v?.name` only in fallback |
| buildCartItem `.reduce()` | L722 | `item.variation.reduce((sum, v) => { if (v.price) ... })` | **NO** — `v.price` on null crashes |
| collectBillExisting `.reduce()` | L1552 | `item.variation.reduce((sum, v) => { if (v.price) ... })` | **NO** — same pattern |

Plus marker fix: `CollectPaymentPanel.jsx:259,261` — `// BUG-NEW` → `// BUG-618`

### Data Flow
```
Socket event → order hydration → item.variation = [null, {name, values}]
→ orderTransform buildCartItem L706 .map() → partial crash (v?.values saves it BUT v?.name fallback reached on null)
→ L722 .reduce() → v.price on null → TypeError → ErrorBoundary
```

### Risk: MEDIUM
- Crash on real data path (aggregator orders, scan re-hydration)
- No financial logic, no API contract change
- Fix is defensive `.filter(Boolean)` before `.map()` and `.reduce()`

### Exact Fix (Gate 3)

| Edit | File | Line | Change |
|---|---|---|---|
| E1 | orderTransform.js | L706 | `item.variation.map(` → `item.variation.filter(Boolean).map(` |
| E2 | orderTransform.js | L722 | `item.variation.reduce(` → `item.variation.filter(Boolean).reduce(` |
| E3 | orderTransform.js | L1552 | `item.variation.reduce(` → `item.variation.filter(Boolean).reduce(` |
| E4 | CollectPaymentPanel.jsx | L259 | `// BUG-NEW:` → `// BUG-618:` |
| E5 | CollectPaymentPanel.jsx | L261 | `// BUG-NEW:` → `// BUG-618:` |

### Verification Matrix
| # | Check | How |
|---|---|---|
| 1 | `.filter(Boolean)` before all 3 variation array operations | grep confirm |
| 2 | BUG-618 markers replace BUG-NEW (2 occurrences) | grep confirm |
| 3 | Webpack compiles clean | tail log |
| REG | Existing variation handling unchanged for non-null entries | Code review |

### Post-Code Registry Checklist
```
- [ ] registry.json: BUG-623 → GATE_5A_IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: orderTransform.js + CollectPaymentPanel.jsx
- [ ] Code markers: // BUG-623 on E1-E3, // BUG-618 on E4-E5
```

---

## BUG-624 — CR-430 OFF Badge Unreadable Contrast

**Code Reality:** NONE (bug exists as-is)
**Conflict Pre-Check:** StatusConfigPage.jsx last touched CR-376 (2026-09-25). No conflict — different section.

### Root Cause
`StatusConfigPage.jsx:1026` — badge always uses `color: '#fff'` regardless of ON/OFF state. When OFF, background is `COLORS.borderGray` (light grey, ~#E2E8F0) + white text = near-invisible.

### Risk: LOW — CSS only, no logic, no state.

### Exact Fix (Gate 3)
| Edit | File | Line | Change |
|---|---|---|---|
| E1 | StatusConfigPage.jsx | L1026 | `color: '#fff'` → `color: servedAutoExpand ? '#fff' : COLORS.darkText` |

### Verification Matrix
| # | Check | How |
|---|---|---|
| 1 | OFF badge has dark text on grey bg | Browser: toggle OFF, visually confirm |
| 2 | ON badge still white text on green | Browser: toggle ON |

**Fast Lane ELIGIBLE** — 1 file, 1 line, LOW risk, not a hotspot.

---

## BUG-625 — Active First Missing from Tablet Dropdown

**Code Reality:** NONE (feature absent from dropdown)
**Conflict Pre-Check:** Header.jsx last touched BUG-555 WP-C (2026-10-16), CR-414 (2026-10-13). The tablet dropdown section (L357-430) is the target. No conflict — adding a new entry, not modifying existing ones.

### Root Cause
`Header.jsx:339-351` — Active First pill rendered only inside `<nav className="hidden xl:flex ...">`. The tablet filter dropdown (L379-430) has channel filters and status filters but NO Active First toggle.

### Data Flow
```
DashboardPage → channelActiveFirst state + handler
  → Header.jsx (props): activeFirst, onToggleActiveFirst
    → xl nav: renders pill (L339-351) ✅
    → tablet dropdown (L379-430): NO Active First entry ❌
```

### Risk: LOW — Adding a button inside an existing dropdown. No state or API changes.

### Exact Fix (Gate 3)
| Edit | File | Line | Change |
|---|---|---|---|
| E1 | Header.jsx | After L430 (end of channel view status filters in dropdown) | Add Active First toggle button inside the `dashboardView === 'channel'` branch of the tablet dropdown, before the closing `</>`. Same styling as existing dropdown buttons with a Check icon. |

### Verification Matrix
| # | Check | How |
|---|---|---|
| 1 | Active First button visible in tablet dropdown when in Channel View | Browser at <1280px viewport |
| 2 | Toggle ON/OFF works from dropdown | Click, verify tables reorder |
| 3 | xl pills still work unchanged | Browser at ≥1280px |

---

## BUG-626 — getStatusBadge Missing Upi/Card/Room

**Code Reality:** NONE (keys not in map)
**Conflict Pre-Check:** OrderReportBetaPage.jsx last touched BUG-354 (this session). No conflict — adding to same map.

### Root Cause
`getStatusBadge` maps `payment_type` → badge. After BUG-354 added TAB/prepaid/postpaid, these remain unmapped: `Upi`, `Card`, `Room`. They fall through to the grey fallback showing raw strings.

Observed on Palm House (Oct 20-28): ~100 `Upi`, ~44 `Card`, ~4 `Room` rows showing raw text.

Note: `deriveStatus()` (L137-155) is a separate function used for the filter dropdown — it derives from `payment_method` + `f_order_status`, NOT from `payment_type`. These are two different data paths.

### Risk: LOW — Display-only badge label. Same pattern as BUG-354.

### Exact Fix (Gate 3)
| Edit | File | Line | Change |
|---|---|---|---|
| E1 | OrderReportBetaPage.jsx | L57 (after postpaid entry) | Add 3 entries: `Upi`, `Card` → 'Paid' (blue), `Room` → 'Room' (purple) |

```js
Upi:  { label: 'Paid', cls: 'bg-blue-100 text-blue-800' },      // BUG-626
Card: { label: 'Paid', cls: 'bg-blue-100 text-blue-800' },      // BUG-626
Room: { label: 'Room', cls: 'bg-purple-100 text-purple-800' },  // BUG-626
```

### Verification Matrix
| # | Check | How |
|---|---|---|
| 1 | Upi/Card rows show "Paid" blue badge | Browser: Palm House Order Report Beta |
| 2 | Room rows show "Room" purple badge | Browser: same report |
| 3 | Existing 7 entries unchanged | Code review |

**Fast Lane ELIGIBLE** — 1 file, 3 lines, LOW risk.

---

## BUG-627 — CR-449 Banner Shows Item Station as "Category Default"

**Code Reality:** NONE (text is misleading)
**Conflict Pre-Check:** ProductForm.jsx last touched CR-373/BUG-390/BUG-392 (image/input fixes). No conflict — different section.

### Root Cause
`ProductForm.jsx:511` — banner text:
```
Item-level station override active. Category default: {product?.stationName || 'KDS'}
```
`product.stationName` is the **effective** station (from `menuManagementTransform.js:82` — `station_name` field which reflects the resolved station after override). When an item overrides to "BAR", this shows "Category default: BAR" — wrong.

### Risk: LOW — Text label only.

### Exact Fix (Gate 3)
| Edit | File | Line | Change |
|---|---|---|---|
| E1 | ProductForm.jsx | L511 | Reword to: `Item-level station override active. KOTs will route to the selected station.` — remove misleading "Category default" reference |

Alternative (if category station name is available from API): show `Category default: {product?.categoryStationName}`. But this field doesn't exist in the current transform — rewording is simpler.

### Verification Matrix
| # | Check | How |
|---|---|---|
| 1 | Banner text no longer says "Category default: [wrong name]" | Browser: edit item with station override |
| 2 | Banner still appears when override active | Browser: same flow |

**Fast Lane ELIGIBLE** — 1 file, 1 line, LOW risk.

---

## Summary

| ID | Risk | Files | Lines | Fast Lane? | Owner Decisions |
|---|---|---|---|---|---|
| **BUG-623** | MEDIUM | 2 | ~5 | NO (2 files) | None |
| **BUG-624** | LOW | 1 | 1 | YES | None |
| **BUG-625** | LOW | 1 | ~12 | NO (>10 lines) | None |
| **BUG-626** | LOW | 1 | 3 | YES | Confirm Room → 'Room' purple (not 'Paid') |
| **BUG-627** | LOW | 1 | 1 | YES | None |
