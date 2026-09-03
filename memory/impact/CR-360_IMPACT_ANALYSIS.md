# CR-360 — Gate 2: Impact Analysis
## S6 In-House Guests — Phase 1 Completion: KPI Tiles + View Bill

**Doc:** `memory/impact/CR-360_IMPACT_ANALYSIS.md`
**Date:** 2026-09-03
**Risk:** LOW | **Code Reality:** PARTIAL | **Conflict:** CLEAN

---

## §0 — Code Reality Check

```
grep -n "Checkout Today\|Outstanding Balance\|Avg Nights\|View Bill\|onClick" InHouseGuestsPage.jsx
→ lines 82-84: hardcoded '—' values
→ line 152-154: View Bill button, no onClick
```

**Code Reality: PARTIAL** — page exists, tiles and button are visual stubs only.

---

## §1 — Conflict Pre-Check

| File | Last Modified | Conflict? |
|---|---|---|
| `pages/pms/InHouseGuestsPage.jsx` | BUG-378 (2026-09-03) | **NONE** — additive changes only |

**CLEAN.**

---

## §2 — Risk: LOW

- 1 file, display-only
- No API calls, no new services, no hotspot files (R5)
- No financial write logic — KPIs are read-only derived values
- `useNavigate` already available in project (react-router-dom)

---

## §3 — Data Flow Trace

### KPI Tiles
```
rows[] (already in InHouseGuestsPage state, populated by pmsService.getInHouseGuests())
  → rows[*].checkoutDate  → count where .slice(0,10) === today  → "Checkout Today"
  → rows[*].balance       → sum of non-null values               → "Outstanding Balance"
  → rows[*].checkinDate + .checkoutDate → avg diff in days       → "Avg Nights"
```
**Zero new API calls. All data already in memory.**

### View Bill
```
row.parentOrderId  (already in each row from roomListTransform)
  → useNavigate('/reports/room-orders')
  → Existing RoomOrdersReportPage loads — staff finds order there
```
**Note:** Full CollectPaymentPanel link deferred to Phase 3 (Departures screen, OD-01 scope).

---

## §4 — Affected Files

| # | File | Type | Change | Risk |
|---|---|---|---|---|
| 1 | `pages/pms/InHouseGuestsPage.jsx` | MODIFY | Add `useNavigate` import + derive KPI values from rows + wire View Bill onClick | LOW |

**Files NOT to touch:** `pmsService.js`, `aiosellService.js`, `roomListTransform.js`, `CollectPaymentPanel.jsx`, `DashboardPage.jsx`, `App.js`, `Sidebar.jsx`

---

## §5 — Verification Matrix

| # | Test | Expected |
|---|---|---|
| V1 | "Checkout Today" tile | Shows count of guests with checkoutDate = today |
| V2 | "Outstanding Balance" tile | Shows ₹ sum of non-null balances |
| V3 | "Avg Nights" tile | Shows avg days between checkin–checkout for matched guests |
| V4 | Walk-in guest (no dates) | Excluded from Avg Nights calc; balance=0 in sum |
| V5 | View Bill click | Navigates to `/reports/room-orders` |
| V6 | Compile | 0 new warnings |

---

*Planning agent | CR-360 Gate 2 | 2026-09-03 | Code reality: PARTIAL | Risk: LOW | Ready for Gate 3*
