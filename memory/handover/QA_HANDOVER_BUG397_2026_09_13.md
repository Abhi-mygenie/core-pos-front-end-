# QA Handover — BUG-397
## Room Status Board: `occupied_hk` tile fixed — no longer falls to Available

**Date:** 2026-09-13  
**Implementation:** BUG FIX agent (ALPHA v0.7)  
**Risk:** HIGH — operational display (R5-adjacent: RoomStatusPage)

---

## §1 Registry Sync Confirmation

```
Registry synced:  YES
Item:             BUG-397
Status:           GATE_5A_IMPLEMENTED
Sprint:           pos_pms_1
EXIT GATE:        5/5 PASS
  □1 registry.json     PASS — gate=5, GATE_5A_IMPLEMENTED
  □2 BUG_TRACKER.md    PASS (intake doc gate status updated)
  □3 FILE_OWNERSHIP.MD update needed (QA agent records below)
  □4 Code markers      PASS — 2× BUG-397 in roomStatusTransform.js, 6× in RoomStatusPage.jsx
  □5 Compile           PASS — webpack compiled successfully, 0 new warnings
```

---

## §2 Files Changed

| File | Edits | Lines |
|---|---|---|
| `src/api/transforms/roomStatusTransform.js` | E1 (L4 DISPLAY_STATUSES), E2 (L21 canToggle) | +1 value, +1 condition |
| `src/pages/pms/RoomStatusPage.jsx` | E3 (L25 STATUS_BAR), E4 (L26 STATUS_LABELS), E5 (L81-82 bulkClean), E6 (tile content), E7 (action buttons) | ~18 lines |

---

## §3 Test Cases

**Credentials:** owner@thegoankitchen.com / Q***@10  
**Path:** PMS → Room Status Board  
**Setup note:** Backend must return `display_status: "occupied_hk"` for at least one room. If no room has this status on preprod, verify via code trace only.

### BLOCK 1 — Tile rendering (when occupied_hk room exists)

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-01** | Open Room Status Board | Any `occupied_hk` room shows **orange** top bar (same as occupied) — NOT green | BLOCKER |
| **TC-02** | Check badge on occupied_hk tile | Badge reads **"Occupied · HK"** (not "Available", not "occupied_hk") | BLOCKER |
| **TC-03** | Check tile body content | Shows guest name + booking ID + amber "Housekeeping in progress" line with Clock icon | MAJOR |
| **TC-04** | Check action buttons | Shows **"HK In Progress"** (disabled, amber) + **"OOO"** (disabled) + **"View Folio"** if orderId present | MAJOR |
| **TC-05** | Regression: pure `occupied` tile unchanged | `occupied` tile still shows orange bar, "Occupied" badge, "HK" + "OOO" disabled buttons | MAJOR |
| **TC-06** | Regression: vacant `hk` tile unchanged | `hk` tile still shows amber bar, "Housekeeping" badge, "Mark Clean" + "Mark OOO" buttons | MAJOR |

### BLOCK 2 — Bulk Mark All Clean safety

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-07** | If occupied_hk rooms exist: click "Mark All Clean" | Toast warns about occupied rooms. `occupied_hk` rooms are NOT cleaned. Only vacant HK rooms get Mark Clean | BLOCKER |
| **TC-08** | Code trace: cleanableIds excludes occupied_hk | `cleanableIds` filter: `displayStatus !== 'occupied' && displayStatus !== 'occupied_hk'` confirmed | BLOCKER |

### BLOCK 3 — HK filter tab

| TC | Steps | Expected | Severity |
|---|---|---|---|
| **TC-09** | Click HK filter chip | Both vacant HK rooms AND occupied_hk rooms appear (filter uses `manualStatus === 'hk'` — unchanged) | MAJOR |

---

## §4 Coverage

| File | Tests |
|---|---|
| `roomStatusTransform.js` E1+E2 | TC-01 (displayStatus resolved), TC-08 (canToggle) |
| `RoomStatusPage.jsx` E3+E4 | TC-01, TC-02 |
| `RoomStatusPage.jsx` E5 | TC-07, TC-08 |
| `RoomStatusPage.jsx` E6 | TC-03 |
| `RoomStatusPage.jsx` E7 | TC-04 |

**Coverage: 2/2 changed files have ≥1 test.**

---

## §5 Design Reference

Design comparison page: `public/bug397-design-comparison.html`  
Option A approved 2026-09-13. Colour: `#F26B33` (occupied orange).

## §6 Report Path

Write to: `/app/memory/test_reports/QA_REPORT_BUG397_<DATE>.md`
