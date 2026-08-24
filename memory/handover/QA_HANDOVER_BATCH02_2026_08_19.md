# QA Handover — BATCH-02: Settings Gate Sweep + Search + Discount Reason
**Items:** BUG-339 (P1), BUG-329 (P2), BUG-331 (P1), BUG-330 (P1), BUG-332 (P2)
**Date:** 2026-08-19
**Environment:** https://core-pos-deploy-11.preview.emergentagent.com
**Preprod API:** https://preprod.mygenie.online

---

## Registry Sync Confirmation
```
Registry synced: YES
BUG-329/330/331/332/339 → IMPLEMENTED, sprint_key=pos_5_x
EXIT GATE: 5/5 PASSED
  ✅ 1. Registry sync
  ✅ 2. BUG_TRACKER rows (5 added)
  ✅ 3. FILE_OWNERSHIP entries (6 files)
  ✅ 4. Code markers in all 6 files
  ✅ 5. webpack compiled with 1 warning (pre-existing only)
```

---

## Files Changed
1. `src/pages/RestaurantSettingsPage.jsx` — BUG-339
2. `src/pages/reports-module/DiscountReportMockup.jsx` — BUG-329
3. `src/api/transforms/profileTransform.js` — BUG-331a
4. `src/components/order-entry/CartPanel.jsx` — BUG-331b
5. `src/components/order-entry/OrderEntry.jsx` — BUG-330
6. `src/pages/DashboardPage.jsx` — BUG-332

---

## Test Cases

### TC-1 — BUG-339: Food Court option in Restaurant Settings
1. Login → `/restaurant-settings` → Step 1 Basic Settings
2. Find "Restaurant Type" dropdown
3. **Expected:** Options show **Normal | Hotel | Food Court**
4. Select "Food Court" → Save → re-open settings
5. **Expected:** "Food Court" persists as selected value

### TC-2 — BUG-331: Schedule Order hidden when OFF
**Prerequisite:** owner@18march.com — Settings Step 5 → "Schedule Orders" toggle OFF → Save (BUG-337 re-fetches profile)
1. Open Order Entry on a Takeaway order (add items, order type = Takeaway)
2. **Expected:** Schedule checkbox (`data-testid="schedule-order-checkbox"`) is **completely absent**
3. Re-enable Schedule Orders in Settings → Save → reopen Order Entry
4. **Expected:** Schedule checkbox reappears

### TC-3 — BUG-330: Cancel After Serve gated
**Prerequisite:** Settings Step 5 → "Cancel After Serve" OFF → Save
1. Open Order Entry → place an order → mark an item as Ready (status ≠ preparing)
2. **Expected:** Cancel button/icon **hidden** on that served/ready item
3. Unplaced item (still "preparing") → **Expected:** Cancel still visible
4. Re-enable "Cancel After Serve" → Save → served item cancel visible again

### TC-4 — BUG-332: Search respects searchOptions
**Prerequisite:** Settings Step 5 → searchBy = only `['phone no']` → Save
1. Dashboard → type a table number in search bar
2. **Expected:** No results (table no not in searchOptions)
3. Type a customer phone number
4. **Expected:** Matching orders appear
5. Reset searchBy to include all options → verify all search types work

### TC-5 — BUG-329: Discount Orders table in Discount Report
1. Navigate to `/reports-module/discounts`
2. Set date range that includes orders with discounts applied
3. **Expected:** If `orders_table` has rows → "Discount Orders" section visible with columns: Order # | Date | Reason | Discount | Total
4. **Expected:** If no discounts in period → section hidden (gated on `ordersTable.length > 0`)

### TC-6 — Regression: BUG-330 pre-serve items still cancellable
With "Cancel After Serve" OFF:
1. Add item to order (status = preparing/unplaced)
2. **Expected:** Cancel icon still visible for preparing items
3. Confirm cancel works normally

### TC-7 — Regression: BUG-332 empty searchOptions = all results
Settings → searchBy = [] (all unchecked) → Save → Dashboard search
**Expected:** All results still return (empty array = no restriction)

### TC-8 — Regression: BUG-331 undefined safe (old profile)
If `scheduleOrderEnabled` is undefined (very old profile): schedule checkbox should still be visible (`!== false` guard)
This is a code-only check — verify guard is `!== false` not `=== true`

---

## Regression Tests

| # | Test | Why |
|---|---|---|
| R1 | Place order → settle → no errors | OrderEntry + CollectPaymentPanel touched |
| R2 | Walk-in order → cancel items → cancel still works | BUG-330 shouldn't affect walk-in item cancel |
| R3 | Dashboard loads with search empty → no errors | DashboardPage hotspot touched |
| R4 | Takeaway order with schedule ON → schedule checkbox visible | BUG-331 shouldn't hide when enabled |

---

## Credentials + Environment

| Field | Value |
|---|---|
| Regular restaurant | owner@18march.com / Qpl*** (restaurant 478) |
| Preprod API | https://preprod.mygenie.online |
| Preview URL | https://core-pos-deploy-11.preview.emergentagent.com |
| Settings page | /restaurant-settings (Step 5 = Order & Kitchen) |
| Discount Report | /reports-module/discounts |
