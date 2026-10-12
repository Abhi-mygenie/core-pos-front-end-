# CR-163 — Impact Analysis (Gate 2)
## PMS — Room-to-Table Food Transfer: Wire `target_table_id`

**ID:** CR-163
**IA Date:** 2026-09-13
**Planning Agent:** ROLE 2 (AGENT_PROMPT_ALPHA v0.7)
**Sprint:** pos_pms_1
**Risk:** MEDIUM — API contract addition on `splitRoomOrder()` + item qty mutation on source order (backend-owned). No financial calculation. No R5 hotspot.
**Stage dispatched:** Gate 2 — Impact Analysis. **GATE 2 CLOSED — DESIGN APPROVED 2026-09-13.**

**Design Mockup:** `public/cr163-design-comparison.html` — owner approved side-by-side before/after comparison.

**All Owner Decisions locked:**
- OD-163-03: ✅ Option A — mandatory destination (Move disabled until picked)
- OD-163-05: ✅ Option A — reuse existing "Room r2" table
- OD-163-06: ✅ CLOSED — NOT NEEDED. Split order is independent; table lifecycle managed by normal dine-in settlement. Zero deferred decisions.

---

## Code Reality: PARTIAL

| Scope | Status | Location |
|---|---|---|
| Base split flow (item select + submit) | FULL — ships today | `SplitRoomItemsModal.jsx` (236 lines), `OrderEntry.jsx` L1205+L2762, `roomService.js` L152 |
| `target_table_id` picker in modal | NONE | Not present |
| `target_table_id` in `splitRoomOrder()` payload | NONE | Payload has `order_id`, `order_detail_ids`, `customer_name`, `remark` only |
| `handleSplitRoomItems` passes targetTableId | NONE | Signature: `(selectedIds, remark)` only |
| GAP1 smoke (source qty drops) | VERIFICATION ONLY — no code | Backend fixed 2026-09-10 |
| GAP2 smoke (new order on Dine-In) | BLOCKED without `target_table_id` wire | Cannot test until E1–E3 done |

**Planning scope: REMAINING scope only (E1–E3 below). Existing base split is NOT re-planned.**

---

## Conflict Pre-Check

| File | Last Modifier | Date | Overlap Risk |
|---|---|---|---|
| `api/services/roomService.js` | CR-162 (L173 — `recordPartialPayment` payload) | 2026-09-11 | NONE — edit is at L152–160, different function, parallel-safe |
| `components/order-entry/SplitRoomItemsModal.jsx` | CR-163 original (pre-2026-09) | — | NONE — no recent entry in FILE_OWNERSHIP |
| `components/order-entry/OrderEntry.jsx` | BUG-374/369/372/371 (multiple locations) | 2026-09-01 | LOW — edits at L1205–1220 and L2762–2768; BUG-374 edits at different locations. Verify no line drift before implementing. |

**CONFLICT: NONE. Parallel-safe on all 3 files.**

---

---

## REVISION NOTE — 2026-09-13 (post-probe investigation)

Original IA proposed a simple `<select>` dropdown for free tables only.
After owner clarification + live API probes, the design is:

**Modal shows TWO options:**
1. **Existing dine-in tables** — list of free TB tables → staff picks one → split order lands on that table via `target_table_id`
2. **"Create Room r2 table"** — auto-creates a dynamic dine-in table named "Room {roomNo}" → split order switched to it

This changes the modal scope (SplitRoomItemsModal DOES need UI changes) and the service layer (both `target_table_id` path AND create+switch path needed).

Both paths confirmed live by probe:
- `TABLE_CONFIG_STORE` with `{table_no: "Room r2", rtype: "TB"}` → `success: true` ✅
- `getTables()` → find new table by `table_no` → get ID ✅
- `ORDER_TABLE_SWITCH {order_id, old_table_id: 0, new_table_id}` → `"Table ID updated successfully"` ✅
- `split-room-order` with `target_table_id` → accepted (optional field confirmed) ✅

---


## Data Flow Trace

### Path A — Staff picks an existing free dine-in table
```
SplitRoomItemsModal: user selects items + picks existing table from list
  → onSplit([...selectedIds], remark, { type: 'existing', tableId, label })

OrderEntry.handleSplitRoomItems(selectedIds, remark, destination)
  → splitRoomOrder({ orderId, orderDetailIds, customerName, remark,
                     targetTableId: destination.tableId })
  → order created directly on chosen table via target_table_id ✅
  → Toast: "Items moved to Table {label}"
```

### Path B — Staff picks "Create Room r2 table"
```
SplitRoomItemsModal: user selects items + picks "Create Room r2" row
  → onSplit([...selectedIds], remark, { type: 'create', roomNo: 'r2' })

OrderEntry.handleSplitRoomItems(selectedIds, remark, destination)
  Step 1: splitRoomOrder({ orderId, orderDetailIds, customerName: "Room r2", remark })
          → new_order_id (table_id: 0)
  Step 2: Check allTables for existing table_no === "Room r2"
          If found → use existing tableId (skip creation)
          If not found → storeTable({ tableNo: "Room r2", rtype: "TB", title: "Room r2" })
                         → getTables() → find by table_no → tableId
  Step 3: switchOrderTable({ orderId: new_order_id, oldTableId: 0, newTableId })
          → "Table ID updated successfully" ✅
  → Toast: "Items moved — Room r2 table opened on Dine-In"
```

---

## Free Dine-In Table Source

`allTables` prop already available in `OrderEntry` (L55: `allTables = []`).

**Filter for Path A list (free TB tables):**
```js
const freeDineInTables = useMemo(
  () => allTables.filter(t => !t.isRoom && !t.isWalkIn && t.status === 'available'),
  [allTables]
);
```

**Path B "Create" row:** Derived from `orderData?.roomInfo?.roomNo` (already available). Hidden if `roomNo` is null.

**Live API all confirmed:**
- `TABLE_CONFIG_STORE` `{table_no, rtype: "TB"}` → `success: true` (no ID returned — needs re-fetch) ✅
- `getTables()` → filter by `table_no` → get numeric `id` ✅
- `ORDER_TABLE_SWITCH` `{order_id, old_table_id: 0, new_table_id}` → `"Table ID updated successfully"` ✅
- `split-room-order` `{target_table_id}` → accepted as optional field ✅

---

## Affected Files

### Files WILL change

| File | Lines est. | Change summary |
|---|---|---|
| `src/components/order-entry/SplitRoomItemsModal.jsx` | +25 lines | Add `freeTables` + `roomNo` props; `destination` state; picker section (table list + "Create Room r2" row); pass `destination` as 3rd arg to `onSplit`; disable confirm until destination picked (OD-163-03) |
| `src/components/order-entry/OrderEntry.jsx` | +20 lines | Add `freeDineInTables` memo; update `handleSplitRoomItems` to dispatch Path A vs Path B; pass `freeTables` + `roomNo` props to modal |
| `src/api/services/roomService.js` | +8 lines | Add `switchOrderTable({ orderId, oldTableId, newTableId })` wrapping `ORDER_TABLE_SWITCH`; add `targetTableId = null` param + payload field to `splitRoomOrder` |

**Total: ~53 lines, 3 files.**

### Files WILL NOT touch
- `tableService.js` — `storeTable()` + `getTables()` already exist, used as-is from Path B
- `DashboardPage.jsx`, `TablesContext.jsx` — allTables already supplied; no change
- `RoomCheckInModal.jsx`, `pmsService.js`, `CheckInPage.jsx`, `NewBookingPage.jsx` — scope-locked

---

## Edit Site Map (for Gate 3 Implementation Plan)

| # | File | Location | Change |
|---|---|---|---|
| **E1a** | `SplitRoomItemsModal.jsx` | L8 props | Add `freeTables = []`, `roomNo = null` |
| **E1b** | `SplitRoomItemsModal.jsx` | After L11 (state block) | Add `const [destination, setDestination] = useState(null)` |
| **E1c** | `SplitRoomItemsModal.jsx` | After remark section (~L192) | Add destination picker: "Create Room {roomNo}" special row + free table list rows; highlight selected |
| **E1d** | `SplitRoomItemsModal.jsx` | L44 handleConfirm | `await onSplit([...selectedIds], remark, destination)` |
| **E1e** | `SplitRoomItemsModal.jsx` | Confirm button disabled | Add `!destination` condition |
| **E2a** | `OrderEntry.jsx` | After L317 | Add `freeDineInTables` memo |
| **E2b** | `OrderEntry.jsx` | L1205 signature | `async (selectedIds, remark, destination)` |
| **E2c** | `OrderEntry.jsx` | L1205–1220 body | Path A / Path B dispatch based on `destination.type` |
| **E2d** | `OrderEntry.jsx` | L2762–2768 modal | Add `freeTables={freeDineInTables}` + `roomNo={orderData?.roomInfo?.roomNo}` |
| **E3a** | `roomService.js` | After `splitRoomOrder` | Add `switchOrderTable({ orderId, oldTableId, newTableId })` function |
| **E3b** | `roomService.js` | L152 signature | Add `targetTableId = null` param |
| **E3c** | `roomService.js` | L155–159 payload | Add `...(targetTableId ? { target_table_id: targetTableId } : {})` |

---

## Owner Decisions

| OD | Question | Options | Recommendation |
|---|---|---|---|
| **OD-163-03** | Is picking a destination **mandatory** before Move activates? | A) Mandatory — Move disabled until row selected. B) Optional — falls back to old walk-in. | **✅ LOCKED: Option A** — mandatory. Move button disabled until destination selected. Owner confirmed 2026-09-13. |
| **OD-163-05** | If "Room r2" table already exists from a prior session (`engage=No`), should Path B **reuse it** or always create new? | A) Reuse — check `allTables` for `table_no === "Room r2"` first. B) Always create. | **✅ LOCKED: Option A** — reuse existing. Skip `storeTable` if found. Owner confirmed 2026-09-13. |
| **OD-163-06** | Delete the "Room r2" table at checkout? | A) Yes — `deleteTable(id)` at checkout. B) Leave as empty table. | **✅ CLOSED — NOT NEEDED.** Split order is fully independent. Once settled on Dine-In, table returns to `engage=No` naturally via normal order settlement. No special cleanup required. Owner confirmed 2026-09-13. |

---

## Risks

| # | Risk | Level | Mitigation |
|---|---|---|---|
| R1 | `storeTable` returns no ID → extra `getTables()` call needed | LOW | Confirmed pattern: fetch after create, filter by `table_no`. 1 extra call on Path B only. |
| R2 | Path B: split OK but `storeTable` fails → orphan order at `table_id: 0` | MEDIUM | Catch error → toast "Items moved but table creation failed — visible as walk-in". Order not lost. |
| R3 | `freeDineInTables` empty + `roomNo` null → modal has no options | LOW | Show empty-state message + disable confirm. Edge case: walk-in room order only. |
| R4 | Line drift in `OrderEntry.jsx` since BUG-374 (2026-09-01) | LOW | Implementation agent must verify L1205 + L2762 before coding. |

---

## Verification Matrix

| # | Test | How to verify | Auto? |
|---|---|---|---|
| V-01 | Destination picker renders | Browser: Move Items on room order → picker section visible | NO |
| V-02 | Path A: free tables listed, rooms/walk-in absent | Browser: only dine-in free tables in list | NO |
| V-03 | Path A: `target_table_id` in POST body | DevTools Network: `split-room-order` body includes `target_table_id` | NO |
| V-04 | Path A: order on chosen table in Dashboard | Dashboard Dine-In shows new order on picked table | NO |
| V-05 | Path B: "Create Room r2" row visible | Browser: special create row shown with room name | NO |
| V-06 | Path B: `storeTable` called + new table in list | DevTools: POST `table-config/store`; `all-table-list` returns "Room r2" | NO |
| V-07 | Path B: `switchOrderTable` called + table engaged | DevTools: POST `order-table-room-switch`; Dashboard "Room r2" table engaged | NO |
| V-08 | Confirm disabled until destination selected (OD-163-03 A) | Move button greyed until row tapped | NO |
| V-09 | GAP1: source qty drops after split | Refresh source room order → moved item gone/qty reduced | NO |
| V-10 | Path B reuse: no duplicate if "Room r2" exists (OD-163-05 A) | Pre-existing "Room r2" table → split → no second table created | NO |

---

## Post-Code Registry Checklist

```
□ 1. registry.json: CR-163 → IMPLEMENTED, sprint_key: pos_pms_1
□ 2. CR_REGISTRY.md: Gate 5 row
□ 3. FILE_OWNERSHIP.md: 3 entries (SplitRoomItemsModal, OrderEntry, roomService)
□ 4. Code markers: // CR-163 in every modified file
□ 5. Compile: webpack 0 new warnings
```

---

## Summary

```
Planning complete: CR-163 (FINAL — post-probe, post-owner-clarification)
Stage: Impact Analysis Gate 2
Code reality: PARTIAL (base split done; destination picker + both paths = NONE)
Risk: MEDIUM
Files WILL change: SplitRoomItemsModal.jsx (+25L), OrderEntry.jsx (+20L), roomService.js (+8L)
Files WILL NOT touch: tableService.js, DashboardPage.jsx, RoomCheckInModal.jsx, pmsService.js
Owner decisions open: OD-163-03 (mandatory destination), OD-163-05 (reuse existing table)
Owner decisions deferred: OD-163-06 (checkout cleanup — separate CR)
Total: ~53 lines, 3 files, 10 verification checks
API probes: 4/4 live-confirmed (split + storeTable + getTables + switchOrderTable)
Next: Owner confirms OD-163-03 + OD-163-05 → Gate 3 Plan → Gate 4 GO
```
