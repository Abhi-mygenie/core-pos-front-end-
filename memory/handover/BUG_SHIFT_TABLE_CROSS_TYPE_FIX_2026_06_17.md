# BUG — Shift Table Modal Shows Cross-Type Targets (Table↔Room)

**Status:** IMPLEMENTED — awaiting owner smoke test
**Priority:** P1
**Sprint:** POS 5.0
**Date:** 2026-06-17
**Reporter:** Owner
**Related:** ShiftTableModal, OrderEntry

---

## 1. Problem Statement (Owner Verbatim)

> When transferring one table to another, the option of room is also coming. I should be able to transfer only from table to table and room to room. Not from table to room or room to table.

**Evidence:** Room `r1` → Shift Table modal showed tables (Te4, T1, T2, T3, T5, T6, T7, T101, out-T1) instead of rooms. Screenshot provided by owner.

---

## 2. Root Cause

**`ShiftTableModal.jsx:27-28`** — The filter always excluded rooms with `!t.isRoom`:

```js
const free = tables.filter(
  (t) => t.status === TABLE_STATUS.FREE && t.tableId !== currentTable?.tableId && !t.isRoom
);
```

This means:
- **Table → Table:** ✅ Correct (rooms filtered out)
- **Room → Room:** ❌ WRONG (rooms filtered out, tables shown instead)

---

## 3. Fix Applied

### File: `src/components/order-entry/ShiftTableModal.jsx`

**Change 1 — Filter logic (L27-29):**
```js
// BEFORE:
const free = tables.filter(
  (t) => t.status === TABLE_STATUS.FREE && t.tableId !== currentTable?.tableId && !t.isRoom
);

// AFTER:
const isSourceRoom = currentTable?.isRoom;
const free = tables.filter(
  (t) => t.status === TABLE_STATUS.FREE && t.tableId !== currentTable?.tableId && (isSourceRoom ? t.isRoom : !t.isRoom)
);
```

**Change 2 — Header text (L96-99):**
- `"Shift Table"` → `"Shift Table"` or `"Shift Room"` based on `currentTable?.isRoom`
- `"Select a free table to shift to"` → `"Select a free table/room to shift to"` based on source type

**Change 3 — Footer helper text (L251):**
- Same dynamic text based on source type

**Change 4 — useEffect dependency (L42):**
- Added `currentTable?.isRoom` to dependency array to satisfy lint

---

## 4. Behavior After Fix

| Source | Target List Shows | Status |
|--------|-------------------|--------|
| Table → | Tables only (rooms excluded) | ✅ |
| Room → | Rooms only (tables excluded) | ✅ |
| Table → Room | Not possible | ✅ Blocked |
| Room → Table | Not possible | ✅ Blocked |

---

## 5. Files Changed

| File | Change | Lines |
|------|--------|-------|
| `src/components/order-entry/ShiftTableModal.jsx` | Filter logic + dynamic header/footer text + useEffect dep | ~8 |

**Total: 1 file, ~8 lines changed.**

---

## 6. Risk Assessment

- **Risk:** LOW
- No financial logic touched
- No API contract change (same `getTables` API, same `onShift` callback)
- No new dependencies
- Backward compatible — table-to-table flow unchanged
- `isRoom` field already exists on all table objects from `tableTransform.js`

---

## 7. Validation Plan

| # | Test Case | Method |
|---|-----------|--------|
| V1 | Open table order → Shift → only tables shown (no rooms) | Visual |
| V2 | Open room order → Shift → only rooms shown (no tables) | Visual |
| V3 | Header says "Shift Table" for table source, "Shift Room" for room source | Visual |
| V4 | Shift table-to-table works end-to-end | Functional |
| V5 | Shift room-to-room works end-to-end | Functional |

---

*BUG — Shift Table Cross-Type Fix — 2026-06-17. 1 file, ~8 lines.*
