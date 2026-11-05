# CR-163 — Intake Addendum
## PMS — Room-to-Table Food Transfer (Move Items / Split Room Order)

**ID:** CR-163
**Original registration:** pre-2026-09
**Addendum date:** 2026-09-11
**Updated by:** INTAKE agent (ALPHA v0.7)
**Sprint:** pos_pms_1

---

## Status at Addendum

| Field | Value |
|---|---|
| **Registry claim (stale)** | IMPLEMENTED — FE complete. BACKEND BLOCKED: GAP1 + GAP2 |
| **Actual status** | **UNBLOCKED — both gaps resolved by backend (2026-09-10)** |
| **FE files (existing)** | `components/modals/SplitRoomItemsModal.jsx`, `components/order-entry/OrderEntry.jsx:1204` (`handleSplitRoomItems()`), `api/services/roomService.js:152` (`splitRoomOrder()`), `api/constants.js:90` (`SPLIT_ROOM_ORDER`) |

---

## What Was Blocked

**GAP1 — Source items not removed (double charge risk)**
- **Was:** After split, source room order kept all original items → potential double charge
- **Resolved (2026-09-10):** Backend fixed. Full-qty split moves the line to the new order; partial-qty reduces source qty and creates target lines. Source is not double-charged.
- **FE action:** Smoke test "Move Items" flow to confirm GAP1 fix — no code change expected.

**GAP2 — New order created as room-type (not visible on Dine-In)**
- **Was:** Split created a new order with `table_id = 0`, typed as room — never appeared in Dine-In dashboard
- **Resolved (2026-09-10):** Backend shipped optional `target_table_id` field on `POST split-room-order`. When FE sends `target_table_id` = a free dine-in `restaurant_table.id`, new order appears on Dine-In board with socket fired.
- **FE action:** Wire `target_table_id` picker in `SplitRoomItemsModal.jsx` (~10-15 lines)

---

## API Contract (backend reply 2026-09-10)

`POST /api/v2/vendoremployee/order/split-room-order`

```json
{
  "order_id": 1232244,
  "items": [{ "id": 111, "qty": 1 }],
  "target_table_id": 4567,
  "customer_name": "optional",
  "remark": "optional"
}
```

| `target_table_id` | Behaviour |
|---|---|
| Omitted / null / 0 | Same as before (may not appear on Dine-In) |
| Free dine-in table | New order `table_id` = target; table engage socket fired ✅ |
| RM table | **422** — must be dine-in |
| Occupied dine-in | **422** — choose another table |

Success response also returns `target_table_id` (null if omitted) and `new_table_id` (0 or assigned table).

---

## FE Work Remaining (Gate 3 mini-plan)

| Task | File | Lines est. |
|---|---|:---:|
| Smoke test GAP1: verify source qty drops on split | `SplitRoomItemsModal.jsx` | 0 lines (verification only) |
| Add free dine-in table picker (dropdown of available tables) | `SplitRoomItemsModal.jsx` | ~10-15 |
| Pass `target_table_id` in `splitRoomOrder()` call body | `api/services/roomService.js` | ~3 |
| Show confirmation: "Moved to Dine-In table #N" | `SplitRoomItemsModal.jsx` | ~3 |
| **Total** | | **~18 lines** |

Risk: **MEDIUM** — touches the split room order flow (financial-adjacent: item qty changes).

---

## Gate Status

- [x] Gate 0/1 — Intake (original + this addendum)
- [x] Gate 2 — Impact Analysis (done earlier, still valid)
- [x] Gate 5a — FE Implementation (partial — base split done; `target_table_id` wire missing)
- [ ] **Gate 3 mini-plan** — wire `target_table_id` + smoke GAP1 (~18 lines, 2 files)
- [ ] Gate 4 GO from owner
- [ ] Gate 5b — QA
- [ ] Gate 6 — Owner Smoke

**Ready for Gate 3 mini-plan + Gate 4 GO.**

---

*Addendum: 2026-09-11 | INTAKE agent | GAP1+GAP2 backend-resolved | Gate 3 mini-plan + Gate 4 GO needed*
