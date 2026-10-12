# CR-360 — INTAKE
## S6 In-House Guests — Phase 1 Completion: KPI Tiles + View Bill Wiring

**ID:** CR-360
**Date:** 2026-09-03
**Registered by:** Planning agent
**Source:** OWNER-REPORTED (screenshot 2026-09-03 — KPI tiles showing "—", View Bill not clickable)
**Related:** CR-358-P1 (Phase 1 implementation), BUG-378 (data now available from local-res join)
**Type:** CR (scope addition — intentional Phase 1 placeholders now completable)

---

## Classification

| Field | Value |
|---|---|
| Type | CR |
| Area | PMS → S6 In-House Guests |
| Priority | **P2** |
| Risk | **LOW** |
| Sprint | pos_pms_1 |
| Fast Lane eligible | YES — 1 file, display-only, no new API/service, no hotspot |
| Duplicate check | **DISTINCT** |
| Code reality | **PARTIAL** — page exists, tiles + button are hardcoded placeholders |
| Blast radius | SMALL — 1 file (InHouseGuestsPage.jsx) |

---

## What's Missing

### Gap 1 — KPI Tiles (lines 82–84 hardcoded "—")

Three tiles are hardcoded placeholder dashes:
- **Checkout Today** — count of guests whose checkout date = today
- **Outstanding Balance** — sum of all guest balances
- **Avg Nights** — average stay length (checkout − checkin in days)

**Data status:** ✅ ALL available now. BUG-378 (fixed 2026-09-03) added `checkoutDate`, `checkinDate`, and `balance` to every row via the local-reservations join. No new API call needed — computed from `rows[]` already in state.

### Gap 2 — View Bill button (line 152–154, no onClick)

The "View Bill" button is rendered but has no handler. It should give hotel staff quick access to the guest's active bill.

**Data status:** ✅ `row.parentOrderId` available for all rows. The existing room orders flow uses this ID.

**Phase 1 scope decision:**
- Full bill checkout (CollectPaymentPanel) is **Phase 3 scope** (Departures → checkout — OD-01 co-exist rule)
- Phase 1 approach: navigate to existing **Room Orders Report** (`/reports/room-orders`) — staff can find the order there. Non-destructive, respects OD-01.
- Phase 3 will properly link to CollectPaymentPanel checkout flow.

---

## Files to Change

| File | Change | Lines est. |
|---|---|---|
| `pages/pms/InHouseGuestsPage.jsx` | Derive KPI values from `rows[]` state; wire View Bill → navigate to `/reports/room-orders` | ~20 |

**No other files affected.** No new API calls. No new imports beyond `useNavigate` (already available via react-router-dom in this project).

---

*Intake: 2026-09-03 | Planning agent | Code reality: PARTIAL | Risk: LOW | Fast Lane eligible*
