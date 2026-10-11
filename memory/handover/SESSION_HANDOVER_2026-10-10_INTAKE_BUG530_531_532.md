# SESSION HANDOVER — 2026-10-10 (INTAKE: BUG-530, BUG-531, BUG-532)

**Date:** 2026-10-10
**Role:** INTAKE
**Items registered:** BUG-530, BUG-531, BUG-532 (bundled with BUG-529)

---

## 1. WHAT WAS DONE THIS SESSION

Owner instruction: "bundle Issues A + C + D into BUG-529 as formal intake."

Three new bugs registered — BUG-530, BUG-531, BUG-532.  
All marked RELATED to BUG-529. All in sprint `oct_bug_batch`.  
Registry: 816 total items. Tracker table rows added.

---

## 2. INTAKE SUMMARY

### BUG-530 — CPP Split Auto-fill Overfills UPI (Issue A)
- **Status:** GATE_1_INTAKE
- **Priority:** P1 / HIGH / R5
- **File:** `CollectPaymentPanel.jsx` (R5)
- **Root cause:** `onBlur` auto-fill (`maxForThisRow` + `remaining`) uses raw `effectiveTotal` (food+room). BUG-527 E3 fixed split *threshold* but NOT auto-fill. For room orders: cap/fill should be `effectiveTotal − roomBalance` (food-only).
- **Fix:** ~3 lines in `onBlur` handler — `isRoom ? effectiveTotal-roomBalance : effectiveTotal`
- **OD-530-01 OPEN:** onBlur only OR also onChange clamp?
- **Fast Lane:** NO (R5 file — full gate required)
- **Next:** Gate 2 Impact Analysis (PLANNING role)
- Intake doc: `change_requests/BUG-530_CPP_SPLIT_AUTOFILL_OVERFILLS_ROOM_INTAKE.md`

### BUG-531 — InHouse/Departures Balance Shows Rack Rate After Refresh (Issue C)
- **Status:** GATE_1_INTAKE
- **Priority:** P1 / HIGH / NOT R5
- **File:** `FrontDeskWorkstationPage.jsx` (NOT R5)
- **Root cause:** `useRowBalances` L36 `setBalances(undefined)` eager reset on every `loadedAt` change → flicker + fallback to `charge.balance_due=1650` on fetch failure
- **Fix:** 1 line — remove `setBalances(undefined)` from L36 useEffect
- **OD-531-01 OPEN:** Fast Lane approval?
- **Fast Lane:** YES eligible — 1 file, 1 line, NOT R5, NOT financial payload
- **Next:** Can bundle directly into BUG-529 Gate 4 GO same implementation session (owner Fast Lane approval)
- Intake doc: `change_requests/BUG-531_INHOUSE_BALANCE_RACK_RATE_AFTER_REFRESH_INTAKE.md`

### BUG-532 — Dashboard Room Tile SC Gap: order.amount Excludes Service Charge (Issue D)
- **Status:** GATE_1_INTAKE (backend-blocked)
- **Priority:** P2 / MEDIUM / R5
- **File:** `DashboardPage.jsx` (R5)
- **Root cause:** `computeRoomCardAmount` L49 `food=order.amount` (no SC = ₹227) vs CPP `finalTotal=₹248` (with SC). Gap = ₹21. PRE-EXISTING gap.
- **Fix:** 1 line — `order.finalTotal ?? order.amount` (pending backend field availability confirmation)
- **OD-532-01 OPEN:** FE fix now (R5) OR wait for backend to include SC in `order.amount`?
- **Fast Lane:** NO (R5 file)
- **Backend-blocked:** Brief already filed at `backend_briefs/BACKEND_BRIEF_DASHBOARD_BALANCE_SC_GAP_2026_10_10.md`
- **Next:** Owner answers OD-532-01. If wait = YES → deferred until backend ships.
- Intake doc: `change_requests/BUG-532_DASHBOARD_TILE_SC_GAP_ORDER_AMOUNT_VS_FINALTOTAL_INTAKE.md`

---

## 3. BUNDLE PLAN — BUG-529 + BUG-530 + BUG-531 + BUG-532

| Bug | Gate | File | Lines | R5? | Can go in same pass as BUG-529? |
|---|---|---|---|---|---|
| BUG-529 | Gate 3 COMPLETE | `frontDeskService.js` | 1 | NO | — (anchor) |
| BUG-531 | Gate 1 → Fast Lane | `FrontDeskWorkstationPage.jsx` | 1 | NO | **YES** — bundle with BUG-529 Gate 4 |
| BUG-530 | Gate 1 → Gate 2 needed | `CollectPaymentPanel.jsx` | ~3 | **YES (R5)** | After Gate 2+3 planning |
| BUG-532 | Gate 1 → backend-blocked | `DashboardPage.jsx` | 1 | **YES (R5)** | After backend ships + OD-532-01 |

**Recommended sequence:**
1. Owner: "GO BUG-529 + BUG-531" → IMPLEMENTATION (2 x 1 line, both NOT R5, Fast Lane approved)
2. Owner: "Gate 2 GO BUG-530" → PLANNING (R5, Impact Analysis + Plan)
3. Owner: "Gate 4 GO BUG-530" → IMPLEMENTATION (after plan)
4. BUG-532: deferred until backend ships

---

## 4. OPEN OWNER DECISIONS

```
OD-529: Gate 4 GO — "GO BUG-529" (folio CPP fix, frontDeskService.js 1 line)
OD-531-01: Fast Lane approval — "Fast Lane OK BUG-531" (balance reset, FrontDeskWorkstationPage.jsx 1 line)
OD-530-01: onBlur only or also onChange? → then "Gate 2 GO BUG-530"
OD-532-01: FE fix now (R5) or wait for backend?
```

Shortest path to fix the most P0/P1 bugs:
> "GO BUG-529 + Fast Lane BUG-531"

---

## 5. ARTIFACTS CREATED

| Type | Path |
|---|---|
| Intake docs | `change_requests/BUG-530_CPP_SPLIT_AUTOFILL_OVERFILLS_ROOM_INTAKE.md` |
| | `change_requests/BUG-531_INHOUSE_BALANCE_RACK_RATE_AFTER_REFRESH_INTAKE.md` |
| | `change_requests/BUG-532_DASHBOARD_TILE_SC_GAP_ORDER_AMOUNT_VS_FINALTOTAL_INTAKE.md` |
| Registry | `control/registry.json` — BUG-530, BUG-531, BUG-532 added (816 total) |
| Tracker | `control/BUG_TRACKER.md` — 3 header entries + 4 table rows (BUG-529…532) |

---

## 6. NEXT AGENT BOOT

```
Last session (2026-10-10 INTAKE): registered BUG-530 (CPP split auto-fill, R5, Gate 1),
BUG-531 (balance rack rate refresh, NOT R5, Gate 1, Fast Lane eligible),
BUG-532 (dashboard tile SC gap, R5, Gate 1, backend-blocked),
all bundled with BUG-529 (folio CPP double-discount, Gate 3 COMPLETE).

Owner decisions pending:
  a) "GO BUG-529 + Fast Lane BUG-531" → IMPLEMENTATION role (2 files, 2 lines, both NOT R5)
  b) "Gate 2 GO BUG-530" → PLANNING role
  c) "OD-532-01: wait backend" → defer BUG-532
```
