# BUG-591 — Investigation Report
## Status View: Cards Sort by Label/Table Number Not by createdAt

**Date:** 2026-10-18
**Role:** INVESTIGATION
**Steps used:** 6/10
**Confidence:** HIGH — root cause confirmed in code + live data

---

## 1. Summary

- **Root cause:** `ChannelColumn.jsx` Status View branch calls `sortByActiveFirst()` which uses **label numeric** as the tie-break when two cards share the same `fOrderStatus`. Walk-In orders have label `"WAL"` → numeric 0. Named tables (Table 2, Table 14) have numeric 2, 14. This causes older Walk-In orders to always float to the TOP and older high-numbered tables to sink to the BOTTOM regardless of when the order was placed.
- **Classification:** FE_BUG — CODE_ERROR
- **Confidence:** HIGH — traced in code, confirmed with live PalmHouse data
- **Reported by owner:** Two screenshots confirmed — Preparing column and Served column both exhibit this issue.

---

## 2. Bug Evidence

### Screenshot 1 — Preparing column
| Row | Card | Age | Why wrong |
|-----|------|-----|-----------|
| 1–2 | Walk-In orders | 1d | Numeric 0 → floated to top |
| 3 | Walk-In ₹746 × 2 | **0m (today)** | Newest Walk-Ins, but still before tables |
| 4 | Table 2 ₹546, Table 10 ₹554 | 1d | Numeric 2 and 10 → sunk to bottom |

Today's newest Walk-In orders (0m) appear ABOVE yesterday's table orders (1d) — because `WAL=0 < 2, 10`.

### Screenshot 2 — Served column
| Row | Card | Age | Why wrong |
|-----|------|-----|-----------|
| 1 | Walk-In × 2 (PAID) | 5d | Numeric 0 → floated to top |
| 2 | Walk-In × 2 | 25d | Numeric 0 |
| 3 | C2 ₹13,934 | 15d | Numeric 2 |
| 4 | Table 14 ₹693, C1 × 2 | **51d** | Numeric 14, 1 → sunk to bottom |

A 51-day-old bill that urgently needs to be collected sits at the **bottom**. A 5-day-old Walk-In (PAID, less urgent) sits at the **top**.

---

## 3. Hypotheses Tested

| # | Hypothesis | Test | Result |
|---|---|---|---|
| H1 | Sort is by label numeric (table number) | Code trace `sortByActiveFirst` L148-165 in `statusHelpers.js` | CONFIRMED |
| H2 | Walk-In label = "WAL" → numeric 0, lowest | `adaptOrderForStatus` L946: `label: order.customer \|\| order.tableNumber \|\| orderType.toUpperCase().slice(0,3)` → "WAL" for walkIn with no customer name | CONFIRMED |
| H3 | Sort should be by createdAt ascending within same fOrderStatus | Owner stated: "chronological logic doesn't have anything to do with table numbers" | CONFIRMED — expected behaviour |

---

## 4. Data Flow Trace

```
STATUS VIEW data build (DashboardPage.jsx):
  statusGroups[col.id].items = allOrders.filter(o => o.fOrderStatus === col.fOrderStatus)
  → No sort applied here. Items in API insertion order.
                    ↓
Passed to ChannelColumn with groupingMode='status'
                    ↓
ChannelColumn.jsx:117-123 — sortedGroups useMemo:
  if (groupingMode === 'status') {
    items: sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY)
  }
                    ↓
sortByActiveFirst (statusHelpers.js:148-165):
  Step 1: sort by TABLE_STATUS_PRIORITY[a.status] → all cards in same column
          have the same fOrderStatus → ALL EQUAL (same priority)
  Step 2: tie-break = label numeric:
    label = a.label || a.tableNumber || a.id
    Walk-In: label="WAL" → parseInt("WAL".replace(/\D/,'')) = parseInt("") = NaN → 0
    Table 2: label="2"   → 2
    Table 14: label="14" → 14
  Result: Walk-Ins (0) < Table 2 (2) < Table 14 (14)
          Walk-Ins always float to top, high-number tables always sink

CORRECT behaviour:
  Step 2 should use createdAt ascending:
    oldest order FIRST → newest order LAST
    No distinction by Walk-In / Table / Room / type
```

---

## 5. Live Data Confirmation (PalmHouse, Oct 18 2026)

Probed `employee-orders-list` (GET `/api/v1/vendoremployee/pos/employee-orders-list?role_name=Manager`):

All 8 Preparing orders have `table_number = ''` and `customer = ''`.
Dine-In table entries carry `label` from `allTablesList` physical table setup.

**Current sort result vs expected:**

| Current (label numeric) | | Expected (createdAt asc) | |
|---|---|---|---|
| Walk-In ₹260 (Oct 16 20:22) | 0 | Walk-In ₹260 (Oct 16 20:22) | oldest |
| Walk-In ₹546 (Oct 16 21:17) | 0 | Walk-In ₹546 (Oct 16 21:17) | |
| Walk-In ₹2129 (Oct 16 21:17) | 0 | Walk-In ₹2129 (Oct 16 21:17) | |
| Walk-In ₹389 (Oct 16 21:17) | 0 | Walk-In ₹389 (Oct 16 21:17) | |
| Walk-In ₹746 (Oct 18 11:17) | 0 | **Table 2 ₹546 (Oct 17 09:27)** | |
| Walk-In ₹746 (Oct 18 11:18) | 0 | **Table 10 ₹554 (Oct 17 09:28)** | |
| Table 2 ₹546 (Oct 17 09:27) | **2** | Walk-In ₹746 (Oct 18 11:17) | |
| Table 10 ₹554 (Oct 17 09:28) | **10** | Walk-In ₹746 (Oct 18 11:18) | newest |

---

## 6. Exact Fix Location

**File:** `src/components/dashboard/ChannelColumn.jsx`
**Lines:** 117–123 (the `groupingMode === 'status'` branch)

**Current:**
```js
if (groupingMode === 'status') {
  return [{
    key: '__no_section__',
    name: null,
    items: sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY),  // ← uses label numeric
  }];
}
```

**Fix:** Replace `sortByActiveFirst` call in this branch with a custom comparator that:
1. Sorts by `fOrderStatus` priority (same as now) ✅
2. Tie-break: `createdAt` ascending — oldest first, newest last ✅ (not label numeric)

`sortByActiveFirst` in `statusHelpers.js` **must NOT be changed** — it is correct for Channel View table mode where label-numeric ordering is intentional.

---

## 7. Scope

| | |
|---|---|
| **File** | `src/components/dashboard/ChannelColumn.jsx` |
| **Lines** | ~5 lines in the `groupingMode === 'status'` branch (L117-123) |
| **Hotspot (R5)** | NO — ChannelColumn is not in the R5 list |
| **`sortByActiveFirst`** | NOT changed — correct for Channel View |
| **Risk** | LOW — isolated to Status View columns only |
| **Fast Lane** | NO — needs regression verification across all status columns |

---

## 8. Retroactive candidates

None.

---

## 9. Recommendations

- **Classification:** FE_FIX — CODE_ERROR
- **Planning skip eligible:** YES — ≤10 lines, 1 file, not R5, not financial. **Owner must approve.**
- **Registry action:** BUG-591 → `GATE_1_INTAKE_COMPLETE` (ready for Planning Gate 2, or Fast Lane with owner GO)
- **Note:** The same comparator change fixes ALL status columns simultaneously (Preparing, Ready, Served, YTC). One fix, complete correction.
