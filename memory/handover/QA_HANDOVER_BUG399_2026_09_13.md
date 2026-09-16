# QA Handover — BUG-399
## CR-163 Path B: split order must stay as Walk-In (no storeTable, no permanent table)

**Date:** 2026-09-13 (QA handover written 2026-09-13 by QA agent — implementation same date)
**Item:** BUG-399 | **Gate:** 5a → QA (Gate 5b) | **Risk:** HIGH (R5 — OrderEntry hotspot)

---

## §1 Registry Sync Confirmation

```
Registry synced:  YES
Item:             BUG-399
Status:           GATE_5A_IMPLEMENTED (2026-09-13)
Sprint:           pos_pms_1
EXIT GATE:        5/5 PASS (inferred from CONTROL_DASHBOARD: 0 new warnings, 1 file, 2 edits)
  □1 registry.json     PASS — gate=5, sprint=pos_pms_1, IMPLEMENTED
  □2 BUG_TRACKER.md    PASS (per dashboard entry)
  □3 FILE_OWNERSHIP.MD PASS (per dashboard entry)
  □4 Code marker       PASS — // CR-163 / BUG-399 comment at OrderEntry.jsx:1231
  □5 Compile           PASS — 0 new warnings (pre-existing 1 warning only)
```

---

## §2 Change Made

| File | Lines | Before (problem) | After (fix) |
|---|---|---|---|
| `OrderEntry.jsx` | 1230-1243 | Path B called `storeTable` → created permanent dine-in table, had area creation side-effects + no auto-refresh | Path B skips `storeTable`/`switchOrderTable` → calls `splitRoomOrder` with `customerName=Room {roomNo}` only; split order stays as walk-in (table_id=0), auto-disappears on payment |

**Code reality (grep confirmed):**
- Line 1231: `// Path B — Option A (CR-163 / BUG-399): split order stays as walk-in (table_id=0).`
- Line 1232: `// No storeTable/switchOrderTable → order auto-disappears after payment like walk-in.`
- Line 1235: `await splitRoomOrder({ orderId, orderDetailIds, customerName: tableName, remark });`
- Line 1242: `toast({ title: 'Items Moved', description: \`${tableName} items moved to Walk-In\` });`

---

## §3 Test Cases

**Credentials:** owner@thegoankitchen.com / Q***@10
**Path:** Login → POS Dashboard → open any active room order → Move Items button

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-01** | Open active room order → click Move Items → select Path B ("Create Room" row) → select ≥1 item → confirm | Toast: `"Items Moved — Room rX items moved to Walk-In"` (NOT "Moved to Table N") | BLOCKER |
| **TC-02** | After TC-01 split: check Dine-In board | Split order appears as **Walk-In** entry on Dine-In board. No new "Room r_" table created permanently in PMS area list. | BLOCKER |
| **TC-03** | Regression — Path A still works | Move Items → select an existing free dine-in table (Table 1/2/3) → confirm → toast shows `"Moved to Table N"`, items appear on Dine-In board | MAJOR |
| **TC-04** | Regression — room order refreshes | After Path B split, the original room order still shows remaining items (selected items removed) | MAJOR |

---

## §4 Coverage

| File | Changed | Tests covering it |
|---|---|---|
| `OrderEntry.jsx` L1230-1243 | ✅ | TC-01 (toast message), TC-02 (walk-in behavior), TC-03 (Path A regression), TC-04 (refresh) |

Coverage: **1/1 changed file has ≥1 test.**

---

## §5 Report Path

Write to: `/app/memory/test_reports/QA_REPORT_BUG399_2026_09_13.md`
