# SESSION HANDOVER — 2026-10-12 — CR-411 GATE_5A_IMPLEMENTED

## 1. Summary
**Role:** IMPLEMENTATION → QA (automated)
**Item:** CR-411 — Cart Persists on Type/Table Switch, Clears Only on Dashboard Return
**Outcome:** GATE_5A_IMPLEMENTED. 8/8 automated checks PASS. 15/15 Jest structural tests PASS.

## 2. What Was Done

| Edit | File | Change |
|------|------|--------|
| E-1 | `DashboardPage.jsx` `handleTableClick` | Removed nonce bump + BUG-452 comments; added CR-411 comment; kept modal resets |
| E-2 | `DashboardPage.jsx` `handleOrderTypeChange` | Same |
| E-3 | `DashboardPage.jsx` `handleCloseOrderEntry` | Added `cartsByTable[cartKey]=[]` clear before state nulling |
| E-4 | `OrderEntry.jsx` useEffect | `onCartChange?.(oldKey,[])` — clears old slot, never saves stale data |
| E-5 | `OrderEntry.jsx` carry-forward branch | Comment restored: "CR-411: cart carries forward" |
| E-6 | `DashboardPage.bug452.test.jsx` | Full rewrite — 5 describe blocks, 15/15 PASS |

## 3. EXIT GATE: 5/5 PASS

## 4. Remaining Browser QA (V-8..V-12)

| Test | Steps |
|------|-------|
| V-8 Type switch | Add items → switch to TakeAway → items stay |
| V-9 Table switch | Add items → pick different table → items stay |
| V-10 Cancel → re-open | Add items → Cancel → re-open → empty cart |
| V-11 Stay-on-order | Collect bill stay-on-order → new session empty |
| V-12 Re-engage placed | Click occupied table → placed items restored |

## 5. Key Invariant

Exactly **1** nonce bump remains: `handleCollectBillStayOnOrder` (L1560) — stay-on-order correctly resets after collect-bill. Type/table switch paths have zero nonce bumps.
