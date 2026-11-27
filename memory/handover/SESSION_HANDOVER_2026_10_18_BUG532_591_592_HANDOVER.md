# Session Handover — 2026-10-18 — BUG-532 / BUG-591 / BUG-592

**Role:** CLOSURE / HANDOVER
**Date:** 2026-10-18
**Next agent role:** PLANNING (for each bug, in order)
**Code changed this session:** CR-422 (LM preset, 13 pages) · CR-435 (Sidebar) · CR-164 (Pay Link) · BUG-463 (Active menu from API)

---

## Bug Map — Where Each Bug Lives

---

### BUG-532 — Dashboard Room Tile Shows Wrong Amount (SC Gap)

**Where:** `src/pages/DashboardPage.jsx` — **R5 hotspot**
**Line:** L49 inside `computeRoomCardAmount()`

**What's wrong:**
The room tile on the dashboard shows a lower amount than what the payment screen (CPP) shows. Gap = the Service Charge on the food order. Example: tile shows ₹827, CPP shows ₹848, gap = ₹21 = SC.

**Why:**
```js
// L49 — CURRENT (wrong):
const food = Number(order?.amount) || 0;
// order.amount = food subtotal WITHOUT service charge

// L49 — FIX (1 line):
const food = (Number(order?.amount) || 0) + (Number(order?.serviceTax) || 0);
// order.serviceTax already on every order from orderTransform L225
```

**Status:** `GATE_3_PLAN_COMPLETE` — implementation plan already written and verified.
**Plan:** `/app/memory/plans/BUG-532_IMPLEMENTATION_PLAN_2026_10_10.md`
**Awaiting:** `"BUG-532 Gate 4 GO"` — then 1 line change in R5 file.

---

### BUG-591 — Status View Cards Sorted by Table Number Not Time

**Where:** `src/components/dashboard/ChannelColumn.jsx` — **NOT R5**
**Lines:** L117–123 — `groupingMode === 'status'` branch

**What's wrong:**
In the Status View (YTC / Preparing / Ready / Served columns), cards appear in the wrong order. Walk-In orders always float to the top, high-numbered tables sink to the bottom — regardless of when orders were placed. A 51-day-old uncollected bill sits at the bottom hidden; a 5-day-old already-paid Walk-In sits at the top.

**Why:**
The Status View branch calls `sortByActiveFirst()` which uses label-as-number as the tie-break. Walk-In label = "WAL" → parseInt("") = NaN → 0. Table 2 → 2. Table 14 → 14. So Walk-Ins (0) always come before Table 2 (2), Table 14 (14). Nothing to do with time.

**Fix:**
Replace `sortByActiveFirst()` in the status branch with `createdAt` ascending sort — oldest order first, newest last, no distinction by table type.
`sortByActiveFirst` in `statusHelpers.js` must NOT change — it is correct for the Channel View.

**Status:** `GATE_1_INTAKE_COMPLETE`
**Investigation:** `/app/memory/investigations/BUG-591_STATUS_VIEW_SORT_INVESTIGATION_2026_10_18.md`
**Intake doc:** `/app/memory/change_requests/BUG-591_STATUS_VIEW_SORT_INTAKE_2026_10_18.md`
**Fast Lane eligible:** YES — ~5 lines, 1 non-R5 file, no financial logic. Owner must say "BUG-591 Fast Lane GO" to skip Gates 2-3.

---

### BUG-592 — Manual Bill Prints "Discount: 50" Instead of "Discount: ₹180.96"

**Where:** Two-part — FE + Backend

**FE file:** `src/api/transforms/orderTransform.js` L234

**What's wrong:**
When a prepaid order has a 50% discount and staff manually reprints the bill before the order is served, the bill shows the percentage number ("50") instead of the actual rupee amount ("₹180.96").

**Why — full chain:**
1. When order is placed, FE sends `discount_value = 50` (raw percentage, by design — comment says "raw input, not resolved ₹")
2. Backend stores `discount_value = 50`
3. For prepaid/unserved orders, backend does NOT yet populate `restaurant_discount_amount` (the resolved ₹ amount) — only fills it at settlement
4. FE reads order back at L234: `discount: parseFloat(api.restaurant_discount_amount || api.discount_value || 0)` → `restaurant_discount_amount` is null → falls back to `discount_value = 50`
5. Manual reprint uses `order.discount = 50` → sends `discount_amount = 50` to order-temp-store → bill prints "Discount: 50"

**Two-part fix needed:**
- **Backend (primary):** Populate `restaurant_discount_amount` at order creation time (not only at settlement) so the resolved ₹ amount is always available
- **FE safety net (secondary):** In `fromAPI.order` L234, add a guard so it doesn't fall back to `discount_value` when that field contains a raw percentage

**Status:** `GATE_1_INTAKE_COMPLETE`
**Intake doc:** `/app/memory/change_requests/BUG-592_MANUAL_PRINT_DISCOUNT_PERCENTAGE_INSTEAD_AMOUNT_INTAKE_2026_10_18.md`
**Evidence:** Bill photos provided by owner (Bill No. 000524, Krunch N Grill Ruby Zap, 2026-10-18)
**Note:** Gate 2 can start for FE safety net. Backend part needs a brief to the backend team.

---

## Recommended Execution Order

| # | Bug | Gate | Next action |
|---|---|---|---|
| 1 | **BUG-532** | GATE_3 COMPLETE | Say `"BUG-532 Gate 4 GO"` → 1 line change in R5 |
| 2 | **BUG-591** | GATE_1 COMPLETE | Say `"BUG-591 Fast Lane GO"` → ~5 lines, non-R5, fast |
| 3 | **BUG-592** | GATE_1 COMPLETE | Gate 2 IA → backend brief → FE safety net fix |

BUG-532 is the simplest — plan is done, 1 line, just needs Gate 4 GO.
BUG-591 is the cleanest — ~5 lines, non-R5, fully investigated, Fast Lane eligible.
BUG-592 is the most complex — needs backend change + FE safety net.

---

## Test Accounts

| Account | Use for |
|---|---|
| `owner@palmhouse.com / Qplazm@10` | BUG-591 Status View, BUG-532 Dashboard tile |
| `owner@thegoankitchen.com / Qplazm@10` | BUG-532 (has SC), BUG-592 |
| `owner@cafe103.com / Qplazm@10` | General FE testing |

---

## Key Files Reference

| Bug | File | Line | Note |
|---|---|---|---|
| BUG-532 | `src/pages/DashboardPage.jsx` | L49 | R5 — `computeRoomCardAmount` — add `+ order.serviceTax` |
| BUG-591 | `src/components/dashboard/ChannelColumn.jsx` | L117-123 | Not R5 — replace `sortByActiveFirst` in status branch |
| BUG-591 | `src/utils/statusHelpers.js` | L148-165 | `sortByActiveFirst` — DO NOT CHANGE (correct for Channel View) |
| BUG-592 | `src/api/transforms/orderTransform.js` | L234 | FE safety net — `fromAPI.order` discount fallback |
| BUG-592 | Backend | order creation API | Backend to populate `restaurant_discount_amount` at creation |

---

## DO NOT TOUCH

- `statusHelpers.js` `sortByActiveFirst` — correct for Channel View, do not modify
- `collectBillExisting` payment path — BUG-592 discount issue is only in manual reprint path
- `orderTransform.js` L1418-1424 `discount_value` assignment — by design (raw %, backend contract)
- Any `memory/final/` files
