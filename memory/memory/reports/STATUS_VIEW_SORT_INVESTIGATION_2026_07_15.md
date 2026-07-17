# Investigation Report: Status View Card Queue Ordering Bug

**Date:** 2026-07-15
**Role:** INVESTIGATION
**Restaurant:** vishal@pav.com (primary), owner@palmhouse.com (secondary)
**Status:** COMPLETE — Bug confirmed with live evidence on 2 restaurants

---

## 1. SUMMARY

**Root cause:** `sortByActiveFirst()` in `/app/frontend/src/utils/statusHelpers.js` uses **table number** as the tiebreaker when sorting cards within a Status View column. Since all cards in a same-status column share the same `fOrderStatus`, the tiebreaker IS the effective sort. Cards appear ordered by table number instead of by the relevant timestamp (when they entered that status).

**Impact:** When a user marks an order Ready or Served, the card jumps to a position based on its table number — potentially the middle or top of the column — instead of appearing at the bottom (most recent). Users cannot find the card they just moved.

**Classification:** FE_BUG
**Confidence:** HIGH — reproduced with live data
**Steps used:** 8/10

---

## 2. HYPOTHESES TESTED

| # | Hypothesis | Test Method | Steps | Result | Evidence |
|---|---|---|---|---|---|
| 1 | Sort uses table number as tiebreaker | Code trace of `sortByActiveFirst()` | 1 | CONFIRMED | `statusHelpers.js:158-162` — `parseInt(label.replace(/\D/g,''))` |
| 2 | Status View calls `sortByActiveFirst` exclusively | Code trace of ChannelColumn.jsx | 1 | CONFIRMED | Line 109-113: `groupingMode === 'status'` → `sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY)` |
| 3 | Channel View has its own sort (not affected) | Code trace | 1 | CONFIRMED | ChannelColumn.jsx lines 141-152: separate `orderCompare` (createdAt FIFO) and `tableCompare` (table number) — only used when `groupingMode !== 'status'` |
| 4 | Timestamps (readyAt, servedAt) exist on order objects | Live API probe (vishal@pav.com) | 2 | CONFIRMED | `ready_at` populated on items at fOS=2; `serve_at` populated on items at fOS=5 (partial) |
| 5 | `updatedAt` is reliable universal fallback | Live API probe (2 restaurants) | 1 | CONFIRMED | Always populated, stamped on every status change |
| 6 | Live card order matches bug hypothesis | Data comparison | 2 | CONFIRMED | Ready column: 3 cards in wrong order. Served column: 5 cards in wrong order. |

---

## 3. DATA FLOW TRACE

```
Socket event (new-order / update-order-paid)
  → socketHandlers.js: addOrder() / updateOrder()
    → OrderContext: orders array updated (append / in-place replace)
      → DashboardPage.jsx useMemo(statusData):
        → allOrders.filter(o => o.fOrderStatus === col.fOrderStatus)
        → Items grouped into status columns (no sort applied here)
          → ChannelColumnsLayout receives { items } per column
            → ChannelColumn.jsx useMemo(sortedGroups):
              → groupingMode === 'status'
                → sortByActiveFirst(filteredItems, TABLE_STATUS_PRIORITY)
                  → Primary: fOrderStatus priority (ALL TIE within same column)
                  → TIEBREAKER: parseInt(label) → TABLE NUMBER  ← BUG IS HERE
```

**BREAK POINT:** `statusHelpers.js:157-162` — tiebreaker sorts by table number instead of timestamp.

---

## 4. LIVE EVIDENCE

### Restaurant: vishal@pav.com (10 running orders, probed 2026-07-15)

#### READY column (3 cards) — WRONG ORDER

| Current # (table sort) | Order | Table | readyAt |
|---|---|---|---|
| 1 | 1070856 | 0 | 13:55:09 |
| 2 | 1070857 | 0 | 13:55:37 |
| 3 | 1070860 | 7550 | **13:55:34** |

Order 1070860 was ready at 13:55:34 (BEFORE 1070857 at 13:55:37) but sorts last because Table 7550 > Table 0. **The order that should be served first is shown last.**

Correct order: 1070856 → 1070860 → 1070857

#### SERVED column (5 cards) — WRONG ORDER

| Current # (table sort) | Order | Table | servedAt/updatedAt |
|---|---|---|---|
| 1 | 1059827 | 0 | Jul 06 16:46 |
| 2 | 1070600 | 1582 | **Jul 09 18:55** |
| 3 | 1065738 | 2968 | Jul 08 17:27 |
| 4 | 1059750 | 2971 | Jul 08 11:04 |
| 5 | 1048317 | 7900 | Jul 09 16:49 |

Order 1070600 (most recently served, Jul 09 18:55) sits at position #2 instead of #5. When you just served this order, it jumped to the middle of the queue.

Correct order: 1059827 → 1059750 → 1065738 → 1048317 → 1070600

### Restaurant: owner@palmhouse.com (9 running orders) — Same pattern confirmed

---

## 5. TIMESTAMP AVAILABILITY MATRIX

| Timestamp | Source | Available? | Notes |
|---|---|---|---|
| `createdAt` | `order.created_at` | ✅ Always | When order was placed |
| `updatedAt` | `order.updated_at` | ✅ Always | Stamped on every status change — **most reliable** |
| `readyAt` | Computed from items `ready_at` (first item ready) | ⚠️ Sometimes | Populated on vishal@pav.com; NULL on palmhouse. Backend inconsistent. |
| `servedAt` | Computed from items `serve_at` (last item served) | ⚠️ Sometimes | Populated on some items, NULL on others even at fOS=5 |

**Conclusion:** `updatedAt` is the only universally reliable timestamp. Use it as primary sort key with `readyAt`/`servedAt` as preferred-when-available.

---

## 6. RECOMMENDED FIX

### Scope: 1 file, 1 function

**File:** `/app/frontend/src/utils/statusHelpers.js`
**Function:** `sortByActiveFirst()` (lines 148-164)

### What to change

Replace the tiebreaker (lines 157-162) from table-number sort to timestamp sort:

**Current (broken):**
```javascript
// Secondary sort by table/order number
const aStr = a.label || a.tableNumber || a.id || '';
const bStr = b.label || b.tableNumber || b.id || '';
const aNum = parseInt(String(aStr).replace(/\D/g, ''), 10) || 0;
const bNum = parseInt(String(bStr).replace(/\D/g, ''), 10) || 0;
return aNum - bNum;
```

**Should be:**
```javascript
// Secondary sort by timestamp (most relevant time for the status)
// updatedAt = when the order entered its current status (universally reliable)
// readyAt/servedAt preferred when available
const aTime = a.servedAt || a.readyAt || a.updatedAt || a.order?.updatedAt || a.createdAt || '';
const bTime = b.servedAt || b.readyAt || b.updatedAt || b.order?.updatedAt || b.createdAt || '';
if (aTime && bTime && aTime !== bTime) return aTime < bTime ? -1 : 1;
// Final fallback: table number for determinism
const aNum = parseInt(String(a.label || a.tableNumber || a.id || '').replace(/\D/g, ''), 10) || 0;
const bNum = parseInt(String(b.label || b.tableNumber || b.id || '').replace(/\D/g, ''), 10) || 0;
return aNum - bNum;
```

### Sort behavior per column after fix

| Column | Primary sort key | Effect |
|---|---|---|
| **YTC** | `updatedAt` / `createdAt` | Oldest unconfirmed at top — needs attention first |
| **Preparing** | `updatedAt` / `createdAt` | Oldest cooking at top — been waiting longest |
| **Ready** | `readyAt` or `updatedAt` | First ready at top — should be served first |
| **Served** | `servedAt` or `updatedAt` | Most recently served at **bottom** — easy to find |
| **Paid** | `updatedAt` | Most recently paid at bottom |

### Regression risk: NONE

`sortByActiveFirst` is ONLY called when `groupingMode === 'status'` (ChannelColumn.jsx lines 109 and 157). Channel View uses its own independent comparator (`tableCompare` / `orderCompare`). No other code path is affected.

---

## 7. SECONDARY FINDINGS

### 7a. Order 1070600 — Status mismatch
Order at fOS=5 (SERVED) but ALL items at food_status=1 (PREPARING). Order-level and item-level statuses are out of sync. May confuse timeline display and item-level chips.

### 7b. Backend `ready_at` inconsistency
Palm House orders at fOS=2 (Ready) have `ready_at=NULL` on all items. vishal@pav.com orders DO have `ready_at` populated. Backend behavior is inconsistent across restaurants. The fix should NOT rely solely on `readyAt` — must fall back to `updatedAt`.

### 7c. Backend `serve_at` partial population
Some items at fOS=5 have `serve_at=NULL` despite being served. The FE `servedAt` computation (last item's `serve_at`) may return NULL even for served orders. Same fallback to `updatedAt` needed.

---

## 8. EVIDENCE ARTIFACTS

All saved to: `/app/memory/evidence/settlement_investigation/`
- `pav_orders.json` — Full running orders for vishal@pav.com
- `jul14.json` — cafe103 settlement data
- `millbakery2_full.json` — Mill Bakery 2 settlement data
- `raw_multi_day.json` — Multi-day API shape verification

---

## 9. FIX ELIGIBILITY

- **Lines changed:** ~6 (tiebreaker replacement)
- **Files changed:** 1 (`statusHelpers.js`)
- **Hotspot file (R5)?** No
- **Financial logic (R6)?** No
- **Planning skip eligible?** YES — ≤10 lines, 1 file, not hotspot, not financial
- **Requires owner approval for direct fix:** YES (per v0.7 rules)

---

*Investigation Report — 2026-07-15. Investigator: Agent (INVESTIGATION role).*
