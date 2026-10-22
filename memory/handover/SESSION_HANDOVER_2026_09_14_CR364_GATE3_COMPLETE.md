# Session Handover — CR-364 (Gate 3 COMPLETE)

```
Written:         2026-09-14
Status at close: GATE 3 COMPLETE. Implementation Plan written for CR-364 (data path only).
                 Awaiting Gate 4 GO.
Next agent role: IMPLEMENTATION (after Gate 4 GO)
Plan doc:        /app/memory/plans/CR-364_IMPLEMENTATION_PLAN.md
Design:          /app/frontend/public/cr364-folio-design.html (Option Set C)
Workspace:       /app  (branch 14sep, frontend-only)
```

---

## 1. Gate 3 summary — 7 edits

| # | File | Type | Key |
|---|---|---|---|
| 1 | `src/api/transforms/folioTransform.js` | NEW | Pure transform, pass-through money (R6), calcNights (date only) |
| 2 | `src/api/services/pmsService.js` | MOD +12L EOF | `getGuestFolio(orderId)` — same unwrap as PmsCheckoutDrawer |
| 3 | `src/pages/pms/GuestFolioPage.jsx` | NEW | Dual-column (Option Set C), Check Out + disabled Print Folio |
| 4 | `src/App.js` | MOD +2L | import + `/pms/folio/:orderId` route after L108/L268 |
| 5 | `src/pages/pms/InHouseGuestsPage.jsx` | MOD L169 1L | View Bill → `/pms/folio/${row.parentOrderId}` |
| 6 | `src/pages/pms/DeparturesPage.jsx` | MOD L240 1L | → `/pms/folio/${row.orderId}` |
| 7 | `src/pages/pms/ReservationsPage.jsx` | MOD L361 1L | → `/pms/folio/${line.orderId}` (already gated) |

---

## 2. All decisions locked

| OD | Decision |
|---|---|
| OD-364-C1 | Record Payment **PARKED** — not rendered in v1 |
| OD-364-C2 | F&B Posted section **KEPT** |
| OD-364-C3 | **Option Set C** (dual column, split balance) |
| OD-364-C4 | Meal plan in header — shows "—" (BN-364-MEAL pending BE) |

---

## 3. Key design rules for impl agent

- **R6:** All money figures pass-through. Only `calcNights` is derived (date math).
- **Split balance:** Room Balance = `remainingRoomBalance` (backend). F&B Posted = Σ`associatedOrders[].amount` (display aggregation, labeled "F&B Posted Total", NOT used in any formula).
- **Departed guest** (`isCheckedOut === true`): hide Actions card entirely.
- **PmsCheckoutDrawer:** embed as-is, props: `{ open, orderId, roomNo, guestName, onClose, onSuccess }`. `onSuccess` → `navigate(-1)`.
- **Print Folio:** disabled button with tooltip "Print folio — coming soon" (CR-364-PRINT).
- **Record Payment:** NOT rendered (OD-364-C1).

---

## 4. Blocked CRs next

CR-357 (Room Advance `+ Pay`) · BUG-193 (Room Transfer Trail)

*Handover written 2026-09-14 · Planning agent (ALPHA v0.7)*
