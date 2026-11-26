# BUG-589 — Impact Analysis (Gate 2)
## Search dropdown: available dine-in table shows label twice ("109 109")

**ID:** BUG-589 | **Stage:** Gate 2 | **Date:** 2026-10-17
**Risk:** LOW | **Priority:** P2

---

## Code Reality: NONE
`grep -rn "BUG-589"` → 0 matches in `src/`. No fix code exists.

---

## Conflict Pre-Check

| Open item | File conflict | Lines affected | Conflict? |
|---|---|---|---|
| BUG-452 | DashboardPage.jsx | handleOrderTypeChange / handleTableClick | NO — different function |
| BUG-453 | DashboardPage.jsx | toggleSnooze | NO — different function |
| BUG-590 | Header.jsx | L494 (tables header text) | NO — different line |

**Result: NO CONFLICT.** Target line L1221 not touched by any other open item.

---

## Data Flow Trace

```
searchResults useMemo (DashboardPage.jsx L1213-1235):
  enrichedTables = allTablesList.filter(!isWalkIn).map(table => ({
    ...table,
    customer: orderData.customer || table.label || "",  ← L1221
    //         ↑ for available tables: orderData = {} → customer = table.label = "109"
  }))
  → allSearchableTables = [...enrichedTables, ...walkIns]
  → results.tables = searchItems(allSearchableTables, ...)

Header.jsx getTableDisplayText(item) L162:
  if (item.customer) return item.customer;      ← "109" is truthy → returns "109"
  if (item.status === "available") return "Available"  ← NEVER REACHED

Display result:
  orange span: item.label = "109"
  display text: getTableDisplayText = "109"  ← should be "Available"
  → shows "109  109" instead of "109  Available"

Also affected:
  Header.jsx L506 + L548: `item.customer ? darkText : grayText`
  → customer = "109" (truthy) → uses darkText for available tables
  → should use grayText (available = no active order = lighter text)
```

---

## Root Cause: Single line — L1221

```javascript
// CURRENT (wrong for available tables):
customer: orderData.customer || table.label || "",

// The || table.label fallback incorrectly treats the table number
// as a customer name when no order is present.
```

For tables with no order (`orderData = {}`):
- `orderData.customer = undefined` → falls to `table.label`
- Result: `customer = "109"` for an available table

The correct value for available tables is `""` (empty). `getTableDisplayText` already handles empty customer correctly — it falls through to `if (item.status === "available") return "Available"`.

---

## Fix

**Remove `|| table.label` from customer fallback at DashboardPage.jsx L1221:**
```javascript
// BEFORE:
customer: orderData.customer || table.label || "",

// AFTER:
customer: orderData.customer || "", // BUG-589: don't use label as customer fallback — available tables should show "Available" not label
```

**Downstream effect (all positive):**
- `getTableDisplayText` → `item.customer = ""` → falsy → falls to `item.status === "available"` → returns `"Available"` ✅
- `item.customer ? darkText : grayText` → `""` is falsy → uses `grayText` ✅ (correct for no-order tables)
- Customer name search (all[]) → `""` filtered out → available tables not searchable by customer name ✅ (correct — no customer to search)

**No change needed to Header.jsx** — source fix cascades correctly.

---

## Scope Lock
**WILL change:** `src/pages/DashboardPage.jsx` — L1221 only (remove `|| table.label`)
**WILL NOT touch:** `Header.jsx` · any service · any API · financial logic

---

## Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | Search "109" — available dine-in table "109" | Shows "109  Available" (not "109  109") |
| V2 | Search any table with active order + customer | Customer name still shows correctly |
| V3 | Search table name — available table label in display text | "Available" in gray |
| V4 | Search table with order but no customer | Shows "Walk-in" (existing fallback unchanged) |

---

## Post-Code Registry Checklist
```
- [ ] registry.json: BUG-589 → IMPLEMENTED
- [ ] BUG_TRACKER.md: row updated
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx + BUG-589 + date
- [ ] Code marker: // BUG-589 on edited line
- [ ] Compile: 0 new warnings
```
*Gate 2 complete — 2026-10-17. Fast Lane eligible (1 file, 1 line, LOW risk, non-hotspot logic — DashboardPage.jsx is R5 but change is in searchResults useMemo, not order/financial logic). Awaiting owner Fast Lane APPROVED or Gate 3.*
