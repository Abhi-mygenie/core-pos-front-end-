# QA Handover — BUG-398
## CR-163 Move Items: Path B "Create Room" row hidden — fixed

**Date:** 2026-09-13
**Implementation agent:** ROLE 3 (ALPHA v0.7)
**Item:** BUG-398 | **Gate:** 5a → QA (Gate 5b) | **Risk:** HIGH (R5)

---

## §1 Registry Sync Confirmation

```
Registry synced:  YES
Item:             BUG-398
Status:           GATE_5A_IMPLEMENTED
Sprint:           pos_pms_1
EXIT GATE:        5/5 PASS
  □1 registry.json     PASS
  □2 BUG_TRACKER.md    PASS
  □3 FILE_OWNERSHIP.md PASS
  □4 Code marker       PASS — // BUG-398 at OrderEntry.jsx:2798
  □5 Compile           PASS — 0 new warnings
```

---

## §2 Change Made

| File | Line | Before | After |
|---|---|---|---|
| `OrderEntry.jsx` | L2798-2799 | `roomNo={orderData?.roomInfo?.roomNo}` | `roomNo={orderData?.roomInfo?.roomNo \|\| table?.tableNumber}` |

---

## §3 Test Cases

**Credentials:** owner@thegoankitchen.com / Q***@10
**Path:** Login → Dashboard → open any active room order → click "Move Items"

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-01** | Open room order → click Move Items | Modal opens → "or" divider visible below free table cards → Path B row visible: orange dashed border, PlusCircle icon, `Create "Room r5" table` (or current room number) | BLOCKER |
| **TC-02** | Same modal — Path B row appearance | `Create "Room {roomNo}" table` label + `Auto-creates a dine-in table on the board` subtitle + `Dynamic` badge | MAJOR |
| **TC-03** | Click the Path B row | Row turns green (selected), button label changes to `Create & Move N Item(s)` | MAJOR |
| **TC-04** | Select a food item + select Path B → confirm | DevTools: `table-config/store` fires OR existing table reused + `order-table-room-switch` fires. New order visible on Dine-In board. | BLOCKER |
| **TC-05** | Regression: Path A cards still visible | Free dine-in tables (Table 1, 2, 3) still show as cards above the "or" divider | MAJOR |
| **TC-06** | Regression: selecting Path A table still works | Pick Table 1 → confirm → items move to Table 1 on Dine-In board | MAJOR |

---

## §4 Coverage

| File changed | Tests covering it |
|---|---|
| `OrderEntry.jsx` L2799 | TC-01 (roomNo non-null → Create row renders) |

Coverage: **1/1 changed file has ≥1 test.**

---

## §5 Report Path

Write to: `/app/memory/test_reports/QA_REPORT_BUG398_<DATE>.md`
