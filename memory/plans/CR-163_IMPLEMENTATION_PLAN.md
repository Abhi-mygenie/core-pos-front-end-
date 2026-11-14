# CR-163 — Implementation Plan (Gate 3)
## PMS Room-to-Table Food Transfer: Destination Picker + Path A/B Dispatch

**ID:** CR-163
**Plan Date:** 2026-09-13
**Planning Agent:** ROLE 2 (AGENT_PROMPT_ALPHA v0.7)
**Sprint:** pos_pms_1
**Risk:** MEDIUM
**Gate:** 3 — COMPLETE. Awaiting Gate 4 GO.

---

## Pre-Implementation Verification (Implementation Agent — MANDATORY)

Before writing any code, verify these lines still match:

| File | Line | Expected content |
|---|---|---|
| `SplitRoomItemsModal.jsx` | 8 | `const SplitRoomItemsModal = ({ cartItems = [], roomNo, onClose, onSplit }) => {` |
| `SplitRoomItemsModal.jsx` | 12 | `const [error, setError] = useState(null);` |
| `SplitRoomItemsModal.jsx` | 40 | `if (selectedIds.size === 0 \|\| submitting) return;` |
| `SplitRoomItemsModal.jsx` | 44 | `await onSplit([...selectedIds], remark);` |
| `SplitRoomItemsModal.jsx` | 164 | `{/* Remark (optional) */}` |
| `SplitRoomItemsModal.jsx` | 210 | `disabled={count === 0 \|\| submitting}` |
| `SplitRoomItemsModal.jsx` | 216 | `{submitting ? 'Moving…' : count === 0 ? 'Select Items' :` |
| `OrderEntry.jsx` | 8 | `import { splitRoomOrder } from "../../api/services/roomService"; // CR-163` |
| `OrderEntry.jsx` | 317 | `}, [allTables, tableSearchQuery]);` |
| `OrderEntry.jsx` | 1205 | `const handleSplitRoomItems = async (selectedIds, remark) => {` |
| `OrderEntry.jsx` | 2762 | `<SplitRoomItemsModal` |
| `roomService.js` | 152 | `export const splitRoomOrder = async ({ orderId, orderDetailIds, customerName, remark = '' }) => {` |
| `roomService.js` | 168 | `export const recordPartialPayment` |

If ANY line differs → **STOP. Return to Planning agent. Do NOT improvise.**

---

## Scope Lock

**Files WILL change:**
- `src/components/order-entry/SplitRoomItemsModal.jsx`
- `src/components/order-entry/OrderEntry.jsx`
- `src/api/services/roomService.js`

**Files WILL NOT touch:**
- `tableService.js` — used as-is (storeTable, getTables, getTableByNumber all exist)
- `DashboardPage.jsx`, `TablesContext.jsx`, `RoomCheckInModal.jsx`
- `pmsService.js`, `CheckInPage.jsx`, `NewBookingPage.jsx`
- Any backend file

---

## Execution Sequence

Execute edits in this exact order to avoid compile errors:

```
1. E3a, E3b, E3c   → roomService.js      (add switchOrderTable + targetTableId)
2. E1a, E1b, E1c   → SplitRoomItemsModal.jsx imports + props + state
3. E1d, E1e        → SplitRoomItemsModal.jsx handleConfirm guard + onSplit call
4. E1f             → SplitRoomItemsModal.jsx destination picker JSX (largest block)
5. E1g, E1h, E1i   → SplitRoomItemsModal.jsx button disabled + bg + label
6. E2a, E2b        → OrderEntry.jsx imports
7. E2c             → OrderEntry.jsx freeDineInTables memo
8. E2d             → OrderEntry.jsx handleSplitRoomItems (Path A/B dispatch)
9. E2e             → OrderEntry.jsx modal render (add freeTables prop)
```

Webpack compile check after step 5 and again after step 9.

---

## Edit Sites — Exact Current → New

---

### roomService.js

#### E3a — Add `switchOrderTable` function (after L167, before `recordPartialPayment`)

**Insert AFTER line 167** (`return res.data;` — end of splitRoomOrder):

```js

// CR-163: Move a split order (table_id: 0) onto a dynamically created dine-in table.
// Called after storeTable() succeeds on Path B. old_table_id = 0 for newly split orders.
export const switchOrderTable = async ({ orderId, oldTableId, newTableId }) => {
  const res = await api.post(API_ENDPOINTS.ORDER_TABLE_SWITCH, {
    order_id: orderId,
    old_table_id: oldTableId,
    new_table_id: newTableId,
  });
  return res.data;
};
```

---

#### E3b — `splitRoomOrder` signature (L152)

**Current:**
```js
export const splitRoomOrder = async ({ orderId, orderDetailIds, customerName, remark = '' }) => {
```

**New:**
```js
export const splitRoomOrder = async ({ orderId, orderDetailIds, customerName, remark = '', targetTableId = null }) => {
```

---

#### E3c — `splitRoomOrder` payload (L155–161)

**Current:**
```js
  const payload = {
    order_id: orderId,
    order_detail_ids: orderDetailIds,
    ...(customerName ? { customer_name: customerName } : {}),
    remark,
  };
```

**New:**
```js
  const payload = {
    order_id: orderId,
    order_detail_ids: orderDetailIds,
    ...(customerName ? { customer_name: customerName } : {}),
    remark,
    ...(targetTableId ? { target_table_id: targetTableId } : {}), // CR-163: Path A
  };
```

---

### SplitRoomItemsModal.jsx

#### E1a — Add `PlusCircle` to lucide import (L5)

**Current:**
```js
import { X, CheckCircle2, Circle, ArrowRightLeft } from 'lucide-react';
```

**New:**
```js
import { X, CheckCircle2, Circle, ArrowRightLeft, PlusCircle } from 'lucide-react';
```

---

#### E1b — Add `freeTables` prop (L8)

**Current:**
```js
const SplitRoomItemsModal = ({ cartItems = [], roomNo, onClose, onSplit }) => {
```

**New:**
```js
const SplitRoomItemsModal = ({ cartItems = [], roomNo, onClose, onSplit, freeTables = [] }) => {
```

---

#### E1c — Add `destination` state (after L12)

**Insert AFTER line 12** (`const [error, setError] = useState(null);`):

```js
  const [destination, setDestination] = useState(null); // CR-163: { type: 'existing', tableId, label } | { type: 'create', roomNo }
```

---

#### E1d — Update `handleConfirm` guard (L40)

**Current:**
```js
    if (selectedIds.size === 0 || submitting) return;
```

**New:**
```js
    if (selectedIds.size === 0 || !destination || submitting) return;
```

---

#### E1e — Update `onSplit` call (L44)

**Current:**
```js
      await onSplit([...selectedIds], remark);
```

**New:**
```js
      await onSplit([...selectedIds], remark, destination); // CR-163: pass destination as 3rd arg
```

---

#### E1f — Insert destination picker section (before L164 remark section)

**Insert BEFORE line 164** (`{/* Remark (optional) */}`):

```jsx
          {/* Destination Picker — CR-163 E1f */}
          <div className="p-4 rounded-xl border" style={{ backgroundColor: '#ffffff', borderColor: COLORS.borderGray }}
            data-testid="destination-picker-section">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-xs font-bold uppercase tracking-wider" style={{ color: COLORS.grayText }}>
                Select Destination
              </label>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
              >
                MANDATORY
              </span>
            </div>

            {/* Path A: Free dine-in table cards */}
            {freeTables.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                {freeTables.map(t => {
                  const sel = destination?.type === 'existing' && destination.tableId === t.tableId;
                  return (
                    <button
                      key={t.tableId}
                      onClick={() => setDestination({ type: 'existing', tableId: t.tableId, label: t.label })}
                      className="flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all min-h-[64px]"
                      style={{
                        backgroundColor: sel ? '#F0FDF4' : '#ffffff',
                        borderColor: sel ? COLORS.primaryGreen : COLORS.borderGray,
                        boxShadow: sel ? '0 0 0 3px rgba(50,153,55,.12)' : 'none',
                      }}
                      data-testid={`destination-table-card-${t.tableId}`}
                    >
                      <div className="w-2 h-2 rounded-full mb-1"
                        style={{ backgroundColor: sel ? COLORS.primaryGreen : '#D1D5DB' }} />
                      <span className="text-sm font-bold"
                        style={{ color: sel ? '#16A34A' : COLORS.darkText }}>{t.label}</span>
                      <span className="text-xs"
                        style={{ color: sel ? '#16A34A' : COLORS.grayText }}>Free</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Divider between table cards and create row */}
            {freeTables.length > 0 && roomNo && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px" style={{ backgroundColor: COLORS.borderGray }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: COLORS.borderGray }} />
              </div>
            )}

            {/* Path B: Create Room table row */}
            {roomNo && (() => {
              const sel = destination?.type === 'create';
              return (
                <button
                  onClick={() => setDestination({ type: 'create', roomNo })}
                  className="w-full flex items-center gap-3 p-4 rounded-xl transition-all min-h-[64px]"
                  style={{
                    backgroundColor: sel ? '#ECFDF5' : '#FFF7ED',
                    border: sel
                      ? `2px solid ${COLORS.primaryGreen}`
                      : `2px dashed ${COLORS.primaryOrange}`,
                    boxShadow: sel ? '0 0 0 3px rgba(50,153,55,.15)' : 'none',
                  }}
                  data-testid="destination-create-room-table-row"
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: sel ? '#DCFCE7' : '#FFEDD5' }}
                  >
                    <PlusCircle className="w-4 h-4" style={{ color: sel ? COLORS.primaryGreen : COLORS.primaryOrange }} />
                  </div>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold" style={{ color: sel ? '#15803D' : '#C2410C' }}>
                      Create &quot;Room {roomNo}&quot; table
                    </div>
                    <div className="text-xs" style={{ color: sel ? '#16A34A' : COLORS.primaryOrange }}>
                      Auto-creates a dine-in table on the board
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sel ? '#DCFCE7' : '#FFEDD5', color: sel ? '#15803D' : '#C2410C' }}
                  >
                    Dynamic
                  </span>
                </button>
              );
            })()}

            {/* Empty state */}
            {freeTables.length === 0 && !roomNo && (
              <p className="text-xs text-center py-3" style={{ color: COLORS.grayText }}>
                No destination available
              </p>
            )}
          </div>
```

---

#### E1g — Update confirm button `disabled` condition (L210)

**Current:**
```js
              disabled={count === 0 || submitting}
```

**New:**
```js
              disabled={count === 0 || !destination || submitting}
```

---

#### E1h — Update confirm button background (L210 style)

**Current:**
```js
              style={{ backgroundColor: count > 0 ? COLORS.primaryGreen : '#9ca3af' }}
```

**New:**
```js
              style={{ backgroundColor: count > 0 && destination ? COLORS.primaryGreen : '#9ca3af' }}
```

---

#### E1i — Update confirm button label (L216)

**Current:**
```js
              {submitting ? 'Moving…' : count === 0 ? 'Select Items' : `Move ${count} Item${count > 1 ? 's' : ''}`}
```

**New:**
```js
              {submitting
                ? 'Moving…'
                : count === 0
                  ? 'Select Items'
                  : !destination
                    ? 'Select Destination'
                    : destination.type === 'create'
                      ? `Create & Move ${count} Item${count > 1 ? 's' : ''}`
                      : `Move ${count} to ${destination.label}`}
```

---

### OrderEntry.jsx

#### E2a — Add tableService imports (L8 — after existing roomService import)

**Current L8:**
```js
import { splitRoomOrder } from "../../api/services/roomService"; // CR-163
```

**New L8:**
```js
import { splitRoomOrder, switchOrderTable } from "../../api/services/roomService"; // CR-163
import { storeTable, getTables, getTableByNumber } from "../../api/services/tableService"; // CR-163: Path B dynamic table
```

---

#### E2b — Add `freeDineInTables` memo (after L317)

**Insert AFTER line 317** (`}, [allTables, tableSearchQuery]);`):

```js

  // CR-163: Free dine-in tables for destination picker (Path A)
  const freeDineInTables = useMemo(
    () => allTables.filter(t => !t.isRoom && !t.isWalkIn && t.status === 'available'),
    [allTables]
  );
```

---

#### E2c — Replace `handleSplitRoomItems` (L1205–1217)

**Current:**
```js
  // CR-163: Split selected items from room order to a new walk-in table
  const handleSplitRoomItems = async (selectedIds, remark) => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    const roomNo = orderData?.roomInfo?.roomNo;
    if (!orderId || selectedIds.length === 0) return;
    await splitRoomOrder({
      orderId,
      orderDetailIds: selectedIds,
      customerName: roomNo ? `Room ${roomNo}` : undefined,
      remark,
    });
    toast({ title: 'Items Moved', description: 'Selected items split to a new table.' });
  };
```

**New:**
```js
  // CR-163: Split items from room order — Path A (existing table) or Path B (create "Room r2" table)
  const handleSplitRoomItems = async (selectedIds, remark, destination) => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    const roomNo = orderData?.roomInfo?.roomNo;
    if (!orderId || selectedIds.length === 0 || !destination) return;

    if (destination.type === 'existing') {
      // Path A: split directly onto existing free dine-in table via target_table_id
      await splitRoomOrder({
        orderId,
        orderDetailIds: selectedIds,
        customerName: roomNo ? `Room ${roomNo}` : undefined,
        remark,
        targetTableId: destination.tableId,
      });
      toast({ title: 'Items Moved', description: `Moved to ${destination.label}` });
    } else {
      // Path B: split → create/reuse "Room {roomNo}" table → switch order onto it
      const tableName = `Room ${roomNo}`;
      const res = await splitRoomOrder({
        orderId,
        orderDetailIds: selectedIds,
        customerName: tableName,
        remark,
      });
      const newOrderId = res?.new_order_id;
      // OD-163-05 A: reuse existing table if already in allTables (avoids duplicate tables)
      const existingDynamic = allTables.find(t => !t.isRoom && !t.isWalkIn && t.label === tableName);
      let tableId = existingDynamic?.tableId;
      if (!tableId) {
        await storeTable({ tableNo: tableName, rtype: 'TB', title: tableName });
        const freshTables = await getTables();
        tableId = getTableByNumber(freshTables, tableName)?.tableId;
      }
      if (newOrderId && tableId) {
        await switchOrderTable({ orderId: newOrderId, oldTableId: 0, newTableId: tableId });
      }
      toast({ title: 'Items Moved', description: `"${tableName}" table opened on Dine-In` });
    }
  };
```

---

#### E2d — Add `freeTables` prop to SplitRoomItemsModal render (L2762–2768)

**Current:**
```jsx
        <SplitRoomItemsModal
          cartItems={cartItems}
          roomNo={orderData?.roomInfo?.roomNo}
          onClose={() => setShowSplitModal(false)}
          onSplit={handleSplitRoomItems}
        />
```

**New:**
```jsx
        <SplitRoomItemsModal
          cartItems={cartItems}
          roomNo={orderData?.roomInfo?.roomNo}
          onClose={() => setShowSplitModal(false)}
          onSplit={handleSplitRoomItems}
          freeTables={freeDineInTables}
        />
```

---

## Verification Matrix

| # | Edit | Self-test method | Pass condition |
|---|---|---|---|
| V-01 | E1f: destination picker renders | View modal on a room order | Section visible with "MANDATORY" badge |
| V-02 | E1f: free table cards shown | Open on a room with free dine-in tables | Table 1/2/3 cards appear in 3-col grid |
| V-03 | E1f: "Create Room r2" row shown | Open on room r2 order | Row visible with dashed orange border, "Dynamic" badge |
| V-04 | E1g+E1h: Move disabled until both conditions met | No destination selected | Button grey + "Select Destination" label |
| V-05 | E1i: button label changes correctly | Select Path A (Table 1) | Label shows "Move N to Table 1" |
| V-06 | E1i: button label Path B | Select "Create Room r2" | Label shows "Create & Move N Items" |
| V-07 | E3b+E3c: `target_table_id` in POST body (Path A) | DevTools Network → `split-room-order` | Payload has `target_table_id: <tableId>` |
| V-08 | E2c Path A: order on chosen table | After Path A split → Dashboard | Chosen table shows new order |
| V-09 | E2c Path B: `storeTable` called | DevTools → `table-config/store` | POST fired with `table_no: "Room r2"` |
| V-10 | E2c Path B: `switchOrderTable` called | DevTools → `order-table-room-switch` | POST fired, `engage=Yes` on "Room r2" table |
| V-11 | GAP1: source qty drops | Refresh source room order after split | Moved item absent or qty reduced |
| V-12 | OD-163-05 A: no duplicate table creation | Pre-existing "Room r2" table, trigger Path B | No second `table-config/store` call |

---

## Risk Register

| # | Risk | Level | Mitigation |
|---|---|---|---|
| R1 | Path B: `storeTable` returns no ID → must re-fetch | LOW | `getTables()` + `getTableByNumber(freshTables, tableName)` resolves it. If `getTableByNumber` returns null → toast error, order stays as walk-in (not lost). |
| R2 | Path B: split succeeds but `storeTable` fails | MEDIUM | Catch block shows toast "Items moved — visible as walk-in" — order not lost. |
| R3 | IIFE pattern `{roomNo && (() => {...})()}` in JSX | LOW | Replace with extracted const `createRowSel` before the return if ESLint flags it. |
| R4 | `allTables` does not include freshly created table (OD-163-05 check is before creation) | NONE | By design: if not in `allTables`, we create it. `allTables` will reflect it after the next table refresh (socket or reload). |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: CR-163 → status: GATE_5A_IMPLEMENTED, sprint_key: pos_pms_1
□ 2. CR_REGISTRY.md: CR-163 row updated to Gate 5
□ 3. FILE_OWNERSHIP.md: 3 entries added (SplitRoomItemsModal, OrderEntry, roomService — CR-163, date)
□ 4. Code markers: // CR-163 already present in all 3 files at existing edit sites ✓
□ 5. Compile check: webpack 0 new warnings
```

---

## QA Handover Seed

After implementation, write `handover/QA_HANDOVER_CR163_<DATE>.md` with:
- This Verification Matrix (V-01..V-12)
- Test credentials: `owner@thegoankitchen.com / Qplazm@10`, restaurant_id: 69
- Free rooms for testing: r1 (8528, engage=No — need a check-in first), r2 (8526)
- Free dine-in tables: Table 1 (8529), Table 2 (8530), Table 3 (8531)
- Probe order for Path B smoke: use order 1232329 on r2 (has items after prior session restore, or do a fresh check-in)
- GAP1 verification: compare order_detail qty before/after split
- GAP2 verification (Path B): check `all-table-list` for `table_no: "Room r2"` + `engage: Yes` after split

---

## Summary

```
Planning complete: CR-163
Stage: Implementation Plan (Gate 3) — COMPLETE
Files WILL change: SplitRoomItemsModal.jsx (E1a–E1i, 9 edits), OrderEntry.jsx (E2a–E2d, 5 edits), roomService.js (E3a–E3c, 3 edits)
Total edits: 17 across 3 files (~60 lines)
Files WILL NOT touch: tableService.js, DashboardPage.jsx, RoomCheckInModal.jsx, pmsService.js
Owner decisions: ALL LOCKED (OD-163-03 A, OD-163-05 A, OD-163-06 CLOSED)
Verification: 12 checks (V-01..V-12)
Docs: plans/CR-163_IMPLEMENTATION_PLAN.md
Next: Gate 4 GO from owner → Implementation agent applies E3a first, then E1a–E1i, then E2a–E2d
```
