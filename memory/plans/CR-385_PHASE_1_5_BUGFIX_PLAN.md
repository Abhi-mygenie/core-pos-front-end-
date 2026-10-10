# CR-385 · Phase 1.5 — Bug-fix plan note (Planning-lite, LOW risk) — 2026-09-22

```
Items:     BUG-441 (P1, BLOCKER on legacy pages) · BUG-442 (P2, MINOR) — both RELATED CR-362 + CR-385, no hotspots · sprint_key pos_pms_2
Owner GO:  "OWNER ROUTING + PHASE 1.5 GO — CR-385" (2026-09-22): BUG-441 → P1.5 · BUG-442 → P1.5 · BQ-385-23/24 → OPEN_GAP, no FE workaround, "known, ignore" in the smoke batch
Role:      BUG FIX (Role 5) then QA (Role 4, re-test protocol). Files WILL change: pages/pms/ArrivalsPage.jsx · pages/pms/ReservationsPage.jsx · pages/pms/FrontDeskWorkstationPage.jsx · NEW tests/cr385/phase1_5.cr385.test.jsx
Will NOT touch: every other file (CancelBookingDialog/ModifyBookingDialog, services, transforms, contexts, backend, .env, App.js, Sidebar). Another 500 on the legacy page after the fix → STOP + intake (owner hard rule).
Repro method: failing RTL test written BEFORE each fix (Step 0) → fix → green (Step 3). Live repro already on file: iteration_14 R-LEGACY (POST …/MG-69-…/cancel → 500), R-M2-02 (cancelled_by "staff" as Owner).
```

## 1. Entry Verification (run 2026-09-22 before editing)
| Anchor | Expected | Found |
|---|---|---|
| `ArrivalsPage.jsx` L11 | `import { useRestaurant } from '@/contexts/RestaurantContext'; // CR-362: for cancelledBy staff name` | ✓ |
| `ArrivalsPage.jsx` L55 | `const { restaurant } = useRestaurant();` | ✓ |
| `ArrivalsPage.jsx` L272 | `onModify={() => setModifyTarget({ reservationId: row.bookingId, …` | ✓ |
| `ArrivalsPage.jsx` L273 | `onCancel={() => setCancelTarget({ reservationId: row.bookingId, … cancelledBy: restaurant?.profile?.fullName ?? 'staff' })}` | ✓ |
| `ReservationsPage.jsx` L370 / L375 | `onModify({ reservationId: res.bookingId, …` / `onCancel({ reservationId: res.bookingId, … cancelledBy: 'staff' })` | ✓ |
| `FrontDeskWorkstationPage.jsx` | `cancelledBy={restaurant?.profile?.fullName}` on `<ArrivalsPanel>`; `useRestaurant` import + hook (CR-385 M2) | ✓ |
| Numeric id availability | Arrivals rows: `aiosellTransform.reservationOps` → `id: r.id` (L131); Reservations blocks: same transform (`res.id`) | ✓ |
| `grep BUG-441\|BUG-442 src/` | 0 | ✓ |

## 2. Fix skeleton
| Bug | Where | Change | Marker |
|---|---|---|---|
| 441 | `ArrivalsPage.jsx` L272–273 | `reservationId: row.id` (both targets) | `// CR-385 M2 BUG-441` |
| 441 | `ReservationsPage.jsx` L370, L375 | `reservationId: res.id` (both) | `// CR-385 M2 BUG-441` |
| 442 | `ArrivalsPage.jsx` L11 → `import { useAuth } from '@/contexts/AuthContext'`; L55 → `const { user } = useAuth();`; L273 `cancelledBy: user?.fullName || 'staff'` | `// CR-385 M2 BUG-442` |
| 442 | `ReservationsPage.jsx` — `BlockPopover` receives `cancelledBy` prop from the page (`useAuth().user.fullName || 'staff'`); L375 uses it | `// CR-385 M2 BUG-442` |
| 442 | `FrontDeskWorkstationPage.jsx` — `cancelledBy={user?.fullName || 'staff'}` (`user` already from `useAuth`); remove `useRestaurant` import + hook (only consumer was the wrong field) | `// CR-385 M2 BUG-442` |
`ReservationsPage.jsx` keeps `useRestaurant` (still used for `restaurant?.name` in the header L101).

## 3. Tests — `frontend/src/tests/cr385/phase1_5.cr385.test.jsx` (new)
(a) legacy `/pms/arrivals` Cancel → `cancelReservation` called with numeric `15` (never the `MG-…` string) · (b) payload `cancelledBy` === logged-in `user.fullName` on ArrivalsPage and on the Front Desk ArrivalsPanel target (`cancelTargetOf`) · (c) fallback `'staff'` when `useAuth().user` is null / `fullName` empty · (d) ReservationsPage `BlockPopover` Cancel target uses `res.id` + user name. Existing cr385 suite must stay green (before: 58).

## 4. QA re-test scope (Role 4, re-test protocol)
All 33 P1 Role-4 cases (31 PASS + REG-LEGACY FAIL + NOTE) re-run fresh at 1920×800 + 1366×768 **plus**: legacy `/pms/arrivals` Cancel on a real `MG-` test booking → `POST /local-reservations/<numeric>/cancel` 200 → row leaves the list → appears under Cancelled; legacy `/pms/reservations` Cancel same; `cancelled_by` in the cancel payload == owner's name (both legacy and new panel); legacy Modify PATCH targets the numeric id. Sandbox: Suite-type test bookings only, cancelled by the end, settings at defaults, no No-Show confirmed. Output `iteration_15.json` + `test_reports/QA_REPORT_<date>_CR385_P1_5_ROLE4.md`.

## 5. Smoke additions (append to `control/POS_PMS_2_OWNER_SMOKE_BATCH_2026_09_21.md`)
S-21 old `/pms/arrivals` ⋮ → Cancel a Smoke booking → 200, card moves to Cancelled · S-22 old `/pms/reservations` block → Cancel → 200 · S-23 F12 Network on any cancel: `cancelled_by` shows your name (not "staff") · S-24 after a Modify the row shows "SR ●" with text "| MODIFY: …" → **known BQ-385-23/24, ignore**.

Exit: cr385 green (state count) · guards empty · `yarn build` 0 · QA ≥ 33/33 + new cases · Bug Fix report · registry `GATE_5B_QA_PASSED (P1+P1.5)` · smoke S-21…S-24 · push (platform "Save to GitHub").
