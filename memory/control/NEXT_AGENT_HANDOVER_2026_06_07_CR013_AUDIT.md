# NEXT AGENT — CR-013 Food Court Report + Audit Handover (2026-06-07)

**Created:** 2026-06-07 (session close)
**Branch:** `5-june`
**Preview URL:** https://106387a4-113a-472d-8a75-c96e251cbec0.preview.emergentagent.com
**Test account:** owner@shimlaqohfoodcourt.com / Qplazm@10 (shimla food court — stations: CREAMBELLPARLOUR, GuptaJee, MSB, Zorko)

---

## 0. WHAT WAS DONE THIS SESSION

### CR-013 Main Report — 3 New Columns
- Added Payment Type, Discount, Sub Total to All Orders / Settled tabs
- 12-column layout: Order ID, Date, Time, Items, Items Count, Qty, Payment Type, Item Total, Discount, Sub Total, GST, Total
- TOTALS row dynamic, Excel/PDF exports updated
- 1Y (13 chunks) and FY (3 chunks) batching verified

### CR-013-AUDIT — Registered + Gate ①→④
- Registered in CR_REGISTRY.md + CR_011_SCREEN_FREEZE_LOG.md (S-FC-AUDIT)
- Gate ① seed data mockup → Gate ②+③ owner approved → Gate ④ live API wired
- **Per-order audit grid**: rows = order IDs, columns = stations + TOTAL + DRIFT
- **5 metrics**: Item Total, Discount, Sub Total, Tax (GST), Total
- **Proportional distribution** (same formula in main report + audit):
  ```
  station_itemTotal = Σ item.price WHERE item.station = S
  station_share     = station_itemTotal / Σ all item.price
  station_discount  = order_discount × station_share
  station_subTotal  = station_itemTotal − station_discount
  station_tax       = Σ item.gst+vat WHERE station = S AND food_status ≠ 3
  station_total     = station_subTotal + station_tax
  ```
- **Drift sections**: Orders with drift float to top (red), clean orders below (green)
- **UNASSIGNED column**: Catches items with no station assignment
- All 174 orders ₹0 drift on Jun 1 across all 5 metrics

### Backend Gaps Flagged (OPEN_GAPS_REGISTER.md)
1. **BE-ADDON-001** — `order_sub_total_amount` inconsistent for add-ons between old/new orders (old: addon × qty, new: addon flat). Workaround: use `Σ item.price` as truth instead of `order_sub_total_amount`.
2. **BE-CANCELLED-TAX-001** — Backend sends cancelled item tax in `order_details_table` but removes it from `total_gst_tax_amount`. Workaround: skip `food_status === 3` items when summing tax.
3. **FE-PROPORTIONAL-001** — Proportional discount/subtotal/total distribution implemented in CR-013 only. Other reports (S5, S6, S-ROOM) need cross-audit to verify same logic.

---

## 1. IMMEDIATE NEXT TASK — Align CR-013 to S5 Formula (Owner-approved)

**Priority:** P0 — cross-report consistency

**Context:** Audit found S5 Item Sales uses backend per-line fields (`discount_on_food`, `total_add_on_price`, `total_variation_price`) while CR-013 Food Court uses `item.price` + FE proportional discount. Same order shows different numbers. Full gap analysis in `OPEN_GAPS_REGISTER.md` → `FE-PROPORTIONAL-001`.

**Step 1 — Check if `parseOrderItem` already parses the needed fields:**
```
Look in reportTransform.js → parseOrderItem() for:
  - discount_on_food       (S5 uses as line.discount_on_food)
  - total_add_on_price     (S5 uses as line.total_add_on_price)
  - total_variation_price   (S5 uses as line.total_variation_price)
  - service_charge          (S5 uses as line.service_charge)
```
If missing → add to `parseOrderItem` (with `discountOnFood`, `addonPrice`, `variationPrice`, `serviceCharge` keys).

**Step 2 — Update `foodCourtService.js` → `toStationRow()`:**
```js
// Per item (same formula as S5):
itemTotal = item.unitPrice × item.quantity + item.addonPrice + item.variationPrice
discount  = item.discountOnFood
subTotal  = itemTotal − discount + item.serviceCharge
tax       = item.gstAmount + item.vatAmount (skip food_status === 3)
total     = subTotal + tax

// Per station = Σ of above for items in that station
```

**Step 3 — Update `FoodCourtMockup.jsx` → audit pivot builder:**
Same formula as Step 2. Expected totals = Σ across all items (same formula). Drift should be ₹0.

**Step 4 — Verify:** Run audit on Jun 1 shimla food court. All 5 metrics should show ₹0 drift. Numbers should now match S5 Item Sales for the same orders.

---

## 2. FILES MODIFIED THIS SESSION

| File | Change |
|------|--------|
| `frontend/src/api/services/foodCourtService.js` | `toStationRow()`: proportional discount, derived subtotal/total, cancelled item tax exclusion. `allOrders` added to return. |
| `frontend/src/pages/reports-module/FoodCourtMockup.jsx` | 3 new columns (Payment Type, Discount, Sub Total). Audit tab: per-order pivot, 5 metrics, drift column, drift/clean sections, UNASSIGNED station, proportional distribution. |
| `memory/control/CR_REGISTRY.md` | CR-013-AUDIT registered |
| `memory/control/CR_011_SCREEN_FREEZE_LOG.md` | S-FC-AUDIT row added, updated through Gate ④ |
| `memory/control/CONTROL_DASHBOARD.md` | Updated |
| `memory/control/OPEN_GAPS_REGISTER.md` | 3 gaps flagged: BE-ADDON-001, BE-CANCELLED-TAX-001, FE-PROPORTIONAL-001 |

---

## 3. PENDING GATES

| Screen | Current Gate | Next Step |
|--------|-------------|-----------|
| **S-FC** (main report) | Gate ① + ④ wired | Gate ② owner sign-off on All Orders / Settled tabs |
| **S-FC-AUDIT** | Gate ④ wired | Gate ⑤ owner data validation → Gate ⑥ frozen |

---

## 4. DO NOT TOUCH

- Any FROZEN screen (S0–S9, S-ROOM) in `CR_011_SCREEN_FREEZE_LOG.md`
- `reportTransform.js` — shared transform, not modified
- `auditManifest.js` — S5 audit rules
- Existing routes and sidebar entries

---

## 5. ENV VARIABLES

| Variable | Value |
|----------|-------|
| `REACT_APP_API_BASE_URL` | `https://preprod.mygenie.online/` |
| `REACT_APP_CRM_BASE_URL` | `https://crm-preview-34.preview.emergentagent.com/` |
| `REACT_APP_SHOW_AUDIT_TAB` | Not set (env-gated for S5 audit tab) |

---

*End of session. CR-013 + CR-013-AUDIT delivered. Next agent: cross-report business logic consistency audit.*
