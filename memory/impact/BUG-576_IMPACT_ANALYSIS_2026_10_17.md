# BUG-576 — Impact Analysis (Gate 2)
## Room number search by label, not DB ID

**ID:** BUG-576
**Stage:** Gate 2 — Impact Analysis
**Date:** 2026-10-17
**Risk:** LOW
**Priority:** P2
**Sprint:** nov_cr_batch

---

## Code Reality: NONE

No fix code exists in any source file. `grep -rn "BUG-576"` returns zero matches in `src/`. Proceeding with full plan.

---

## Conflict Pre-Check

Two open items list `DashboardPage.jsx` in their files_affected:

| ID | Status | Lines touched | Conflict? |
|---|---|---|---|
| BUG-452 | GATE_5B_QA_CONDITIONAL_PASS | L173/L176/L266/L313 (stale cart restore) | NO — different lines, no overlap |
| BUG-453 | GATE_5A_IMPLEMENTED | soundManager/mute race (via DashboardPage) | NO — different concern, different lines |

**Result: NO CONFLICT.** Execution order: BUG-576 independently safe.

---

## Data Flow Trace

### Step 1 — Room display number origin

```
GET /api/tables
  → tableTransform.js:L54
      tableNumber: api.table_no       // "106", "107", "108"
  → apiTables (in DashboardPage state)
```

### Step 2 — allRoomsList item shape (DashboardPage.jsx L694-748)

```javascript
// No-order room:
{ id: String(t.tableId),        // "1842"  ← internal DB ID
  label: t.tableNumber,          // "106"   ← display number
  status: 'available', ... }

// Occupied room (single order):
{ id: String(t.tableId),        // "1842"
  label: t.tableNumber,          // "106"
  orderId, fOrderStatus, customer, items, ... }

// Occupied room (multiple orders):
{ id: `${t.tableId}-${orderId}`,   // "1842-9931"
  label: `${t.tableNumber} (1/2)`, // "106 (1/2)"
  ... }
```

**`item.label` is the room's display number on every code path.**

### Step 3 — enrichedRooms (DashboardPage.jsx L1253-1255)

```javascript
const enrichedRooms = allRoomsList.map(room => ({
  ...room,                                  // ← spreads item.label ✅
  guest: room.customer || room.guestName || ''
}));
```

`item.label` is available on every `enrichedRooms` item via the spread.

### Step 4 — Search (the bug — DashboardPage.jsx L1257-1261)

```javascript
// TABLES (working correctly — L1233):
all: [opts.includes('table no') && (item.label || item.id), ...]
//                                  ^^^^^^^^^^^ display name used ✅

// ROOMS (broken — L1259):
all: [opts.includes('table no') && item.id, ...]
//                                 ^^^^^^^ DB ID used ❌
// item.id = "1842" — typing "106" never matches
```

### Step 5 — Break point

```
User types "106"
  → searchItems() checks item.id = "1842" → NO MATCH → "No orders"

Expected:
  → searchItems() checks item.label = "106" → MATCH ✅
```

---

## Intake Correction (OD-576-01 update)

The intake doc stated: `"room display number = item.roomNumber (from t.table_no via roomListTransform.js:L45)"`.

**This is incorrect.** `roomListTransform.js` is the PMS room-list service transform (used for check-in/check-out data). `DashboardPage.allRoomsList` is built inline from `apiTables` via `tableTransform.js`, where the display number lands in `item.label = t.tableNumber`.

**Corrected root cause:** `item.id` (DB ID) used in room search instead of `item.label` (display number). No `item.roomNumber` field exists on `allRoomsList` items.

---

## Risk Classification

| Dimension | Assessment |
|---|---|
| **Risk level** | LOW |
| **Financial logic** | NOT touched |
| **API contract** | NOT touched |
| **State management** | NOT touched — read-only useMemo |
| **Order/billing flow** | NOT touched |
| **Hotspot file** | YES — `DashboardPage.jsx` is R5 |
| **Auth/permissions** | NOT touched |

Risk remains **LOW** despite R5 hotspot. The change is inside a `useMemo` with no side-effects — purely a search field addition.

---

## Exact Change Required

**File:** `src/pages/DashboardPage.jsx`
**Line:** 1259 (single line)

```javascript
// BEFORE (broken):
all: [opts.includes('table no') && item.id, opts.includes('user id') && (item.guestName || item.guest || '')].filter(Boolean) // BUG-332

// AFTER (fix):
all: [opts.includes('table no') && (item.label || item.id), opts.includes('user id') && (item.guestName || item.guest || '')].filter(Boolean) // BUG-332 BUG-576
```

**What changes:** `item.id` → `item.label || item.id`
- `item.label` = room display number e.g. "106" — primary search target
- `|| item.id` = DB ID fallback (parity with table search pattern; safe)

**Multi-order rooms:** `item.label` = "106 (1/2)", "106 (2/2)" — typing "106" matches both. Correct behaviour.

---

## Verification Matrix

| # | What | How to verify |
|---|---|---|
| V1 | Searching "106" returns Room 106 | Login palmhouse → type "106" in search → Room 106 card appears |
| V2 | Guest name search still works | Type guest name → still returns correct rooms |
| V3 | Table search unaffected | Type table number → tables still found |
| V4 | Multi-order room searchable | If a room has 2 orders, both appear when searching by room number |
| V5 | No regression on order/delivery search | Search by order ID and phone — still works |

---

## Scope Lock

**Files WILL change:**
- `src/pages/DashboardPage.jsx` — line 1259 only (1 word change + comment update)

**Files WILL NOT touch:**
- `roomListTransform.js` — NOT the data source for dashboard rooms
- `tableTransform.js` — upstream, no change needed
- `TableCard.jsx`, `OrderCard.jsx` — render only, not involved
- Any service, context, or API file

---

## Post-Code Registry Checklist (for Implementation agent)

```
- [ ] registry.json: BUG-576 → status: IMPLEMENTED, sprint_key: nov_cr_batch
- [ ] BUG_TRACKER.md: row updated with IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: DashboardPage.jsx row updated with BUG-576 + date
- [ ] Code marker: // BUG-576 comment on edited line
- [ ] Compile check: webpack 0 new warnings
```

---

## Downstream Risk

**NONE.** `searchResults.rooms` feeds only `matchingRoomIds` (line 1267), which is used to filter the room grid display. No impact on orders, APIs, financial logic, or other features.

---
*Gate 2 complete — 2026-10-17. Ready for Gate 3 (Implementation Plan) on owner GO.*
