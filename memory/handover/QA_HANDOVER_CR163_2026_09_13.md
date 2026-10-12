# QA Handover — CR-163
## PMS Room-to-Table Food Transfer: Destination Picker

**Date:** 2026-09-13
**Implementation agent:** ROLE 3 (AGENT_PROMPT_ALPHA v0.7)
**Sprint:** pos_pms_1
**Risk:** MEDIUM

---

## 1. Registry Sync Confirmation

```
Registry synced:  YES
Item:             CR-163
Status:           GATE_5A_IMPLEMENTED
Sprint:           pos_pms_1
EXIT GATE:        5/5 PASS
  □1 registry.json    PASS
  □2 CR_REGISTRY.md   PASS
  □3 FILE_OWNERSHIP   PASS
  □4 Code markers     PASS (3 files: 3+4+7 markers)
  □5 Compile          PASS (0 new warnings)
```

---

## 2. Files Changed

| File | Edits | Key changes |
|---|---|---|
| `src/components/order-entry/SplitRoomItemsModal.jsx` | E1a–E1i | `PlusCircle` import, `freeTables` prop, `destination` state, destination picker JSX, button disabled/bg/label |
| `src/components/order-entry/OrderEntry.jsx` | E2a–E2d | service imports, `freeDineInTables` memo, Path A/B `handleSplitRoomItems`, `freeTables` modal prop |
| `src/api/services/roomService.js` | E3a–E3c | `switchOrderTable()` NEW, `splitRoomOrder` + `targetTableId` param + payload field |

---

## 3. Verification Matrix (V-01..V-12)

Execute in order. All require live preprod session.

| # | Test | Steps | Expected | Severity if fail |
|---|---|---|---|---|
| **V-01** | Destination picker renders | Login → open room r2 order → click "Move Items" | Section visible with "MANDATORY" badge, table cards, "Create Room r2" row | BLOCKER |
| **V-02** | Free table cards shown | Same modal, Tables 1/2/3 should appear | 3 table cards in grid (dine-in only, no rooms, no walk-ins) | MAJOR |
| **V-03** | Card selection highlight | Click "Table 1" card | Green border + F0FDF4 bg + dot turns green | MINOR |
| **V-04** | Move button disabled without destination | Open modal, select items, do NOT pick destination | Button grey, label "Select Destination" | BLOCKER |
| **V-05** | Move button label — Path A | Select item + pick Table 1 | Label: "Move 1 to Table 1", button green | MINOR |
| **V-06** | Move button label — Path B | Select item + pick "Create Room r2" | Label: "Create & Move 1 Item", button green | MINOR |
| **V-07** | Path A network: `target_table_id` in POST | DevTools Network → filter `split-room-order` | Payload has `target_table_id: 8529` (Table 1 ID) | MAJOR |
| **V-08** | Path A: order on chosen table | Confirm Path A split | Dashboard Dine-In shows new order on Table 1 | MAJOR |
| **V-09** | Path B network: `storeTable` called | DevTools → filter `table-config/store` | POST fired with `table_no: "Room r2", rtype: "TB"` | MAJOR |
| **V-10** | Path B: `switchOrderTable` called | DevTools → filter `order-table-room-switch` | POST fired; `all-table-list` shows "Room r2" `engage=Yes` | MAJOR |
| **V-11** | GAP1: source qty drops | After any split, refresh source room order | Moved item absent OR qty reduced | BLOCKER |
| **V-12** | OD-163-05 A: no duplicate table | "Room r2" table already exists → trigger Path B | No second `table-config/store` call in DevTools | MAJOR |

---

## 4. Regression Tests

| # | What | Why |
|---|---|---|
| R-1 | Open a non-room order (dine-in table) — verify "Move Items" button NOT shown | `onSplitItems={table?.isRoom ? ... : null}` — must remain null for non-room tables |
| R-2 | Per-item "Transfer" button on room order still works | `TransferFoodModal` untouched — verify transfer to occupied walk-in still fires |
| R-3 | CR-162 `recordPartialPayment` on room order still works | `roomService.js` was modified — verify payment still saves with `payment_type: interim` |

---

## 5. Credentials + Environment

```
POS URL:      https://preprod.mygenie.online
Login:        owner@thegoankitchen.com / Qplazm@10
restaurant_id: 69 (The Goan Kitchen)

Room for testing: r2 (table_id: 8526) — engage=Yes (has probe order)
Free dine-in tables:
  Table 1 → id: 8529
  Table 2 → id: 8530
  Table 3 → id: 8531

Local preview: https://pos-frontend-deploy-31.preview.emergentagent.com
```

---

## 6. Known Pre-conditions

- Room r2 order (1232329) currently has only check-in marker items — add a food item via the POS before testing the split
- "Room r2" table (id: 8553) was created during investigation probes — already exists; V-12 should confirm no duplicate created
- All 3 dine-in tables (8529/8530/8531) currently `engage=No` — available for Path A

---

## 7. Design Reference

Approved mockup: `https://pos-frontend-deploy-31.preview.emergentagent.com/cr163-design-comparison.html`
Design tokens: `COLORS.primaryGreen #329937`, `COLORS.primaryOrange #F26B33`
