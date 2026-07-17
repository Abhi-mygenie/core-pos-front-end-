# Owner Smoke Test Batch — POS 5.0 (43 Items)

**Date:** 2026-07-11
**Gate:** 6 (Owner Smoke)
**Preprod:** https://preprod.mygenie.online
**Account:** owner@cafe103.com
**Restaurant:** CAFE 103 (id=644)

**Instructions:** For each test, perform the steps on preprod. Mark PASS/FAIL. Attach screenshot where requested. Return this document with results.

---

## S-1: Order Financial Payloads (P0)
**Covers:** BUG-138, BUG-VQTY, BUG-168, BUG-ROOM-PAIDROOM

1. Place a dine-in order with:
   - 1 item with **variation** (qty 2+)
   - 1 item with **addon** (qty 2+)
   - Apply a **manual discount**
2. Collect bill → pay
3. Open browser **Network tab** → filter `order-temp-store`

**Screenshot needed:** Network tab showing the `order-temp-store` request payload — confirm these fields:
- `self_discount` and `order_discount` = manual discount amount (not 0)
- `variation_amount` = variation price × qty (not flat)
- `addon_amount` = addon price × qty (not flat)
- `billFoodList` items show addon line totals

**Result:** PASS / FAIL

---

## S-2: Token Number (P1)
**Covers:** BUG-144

> ⚠️ Requires `use_token = Yes` on the restaurant. If cafe103 has `No`, test on a restaurant with `Yes`.

1. Login to restaurant with `use_token = Yes`
2. View dashboard — order cards should show **T{number}** alongside #{orderNumber}
3. Print KOT → check `daily_token` in Network payload
4. Print Bill → check `daily_token` in Network payload

**Screenshot needed:**
- Dashboard showing token on an order card
- Network tab: KOT payload with `daily_token`
- Network tab: Bill payload with `daily_token`

**Result:** PASS / FAIL

---

## S-3: Socket & Realtime (P1)
**Covers:** BUG-167, BUG-096, BUG-130

1. Login → navigate to **any non-dashboard page** (e.g. Expenses, Settings)
2. Place an order from another device/tab
3. Navigate back to dashboard → **new order should appear** (socket works app-wide, not just dashboard)
4. Delete a menu item from Menu Management
5. Go to Order Entry → that item should **not appear** in menu

**Screenshot needed:** Dashboard showing the new order that arrived while on a different page

**Result:** PASS / FAIL

---

## S-4: Expense Module — Entry Flow (P1)
**Covers:** CR-059, BUG-151, BUG-152, BUG-153, BUG-154, BUG-155, BUG-156, BUG-175, BUG-176, BUG-177, BUG-178, BUG-181

1. Go to `/expenses`
2. **Add expense — priced item:** Pick an item that has a unit price → qty input should appear, amount auto-calculates
3. **Add expense — free-text item:** Type a new item name (not in master) → optional category dropdown should appear, default payment = "Cash Draw"
4. Fill notes field → save
5. Verify table shows: item, amount, payment method, **Added By** column, **notes**
6. **Edit** a row → item name should be **read-only** (not editable)
7. **Delete** a row → should succeed (not 405 error)

**Screenshot needed:** Expense entry table showing Added By column + notes column + a row with auto-calculated amount

**Result:** PASS / FAIL

---

## S-5: Expense Module — Setup (P0+P1)
**Covers:** BUG-158, BUG-159, BUG-160, BUG-161, BUG-163, BUG-164, BUG-165, BUG-157

1. Go to `/expense-setup`
2. **Add category** → type a name → should create successfully (not silently fail)
3. **Add duplicate category** → should show error toast
4. **Rename category** → should succeed
5. **Add item** to category → should succeed
6. **Add duplicate item** in same category → should show error
7. **Delete category** → should succeed
8. **Export** stock master → should download (not empty/error)

**Screenshot needed:** Expense Setup showing categories with items + any error toast for duplicate

**Result:** PASS / FAIL

---

## S-6: Expense — Unit Prices + Bulk Editor + Report (P1-P2)
**Covers:** CR-066, CR-067, CR-061, BUG-179, BUG-180

1. `/expense-setup` → click **Unit Prices** tab
2. Set a price on an unpriced item → save
3. Edit that price → save
4. Switch to **Stock Master** tab → click **Bulk Edit** → verify spreadsheet editor opens
5. Go to Insights → **Expense Report**
6. Select date range → verify KPIs + chart render
7. Click **Excel export** → file downloads (not empty)
8. Click **PDF export** → opens print window (no error)

**Screenshot needed:** Unit Prices tab with at least 1 priced item + Expense Report page with KPIs

**Result:** PASS / FAIL

---

## S-7: Sidebar & Navigation (P2)
**Covers:** CR-041, CR-052, BUG-136

1. Dashboard → sidebar should be **collapsed** by default
2. **Hover** over a sidebar icon with children → flyout popover should appear
3. Click into an Insights report → scroll sidebar down
4. Navigate to a different Insights report → sidebar scroll position should be **preserved** (not jump to top)
5. Click **Menu** in sidebar → full-page Menu Management opens (not a panel)
6. Click **Day Closure** → full-page settlement opens
7. Click **Settings** → full-page settings opens

**Screenshot needed:** Collapsed sidebar with flyout popover visible

**Result:** PASS / FAIL

---

## S-8: Customer Field Mandatoriness (P2)
**Covers:** CR-051

1. Go to Settings → **Visibility** section
2. Enable **Walk-in Name Required** toggle → save
3. Go to Order Entry → Walk-in → try to place order **without** customer name → should be **blocked**
4. Add customer name → order places successfully
5. Disable the toggle → save → place walk-in order without name → should be **allowed**

**Screenshot needed:** Settings page showing the 6 customer field toggles

**Result:** PASS / FAIL

---

## S-9: Expense Entry — Form Details (P2)
**Covers:** BUG-175, BUG-176, BUG-177, BUG-178, BUG-181

Already covered in S-4. Mark same result.

**Result:** PASS / FAIL (same as S-4)

---

## S-10: Insights Backend Migration (P1)
**Covers:** CR-049

1. Go to Insights → **Dashboard** report
2. Select a date range → data should load from backend (not FE aggregation)
3. Check **Sales**, **Item Sales**, **Cancellations** reports → all should render

**Screenshot needed:** Any Insights report page with data loaded

**Result:** PASS / FAIL

---

## S-11: Dev Tooling (P1) — OPTIONAL
**Covers:** CR-046, CR-048, CR-045

These are dev-only tools (not user-facing). Mark PASS if no regressions observed on the main app.

**Result:** PASS / SKIP

---

## Summary Table

| # | Test | Covers | Result |
|---|------|--------|--------|
| S-1 | Order Financial Payloads | BUG-138, VQTY, 168, ROOM-PAIDROOM | |
| S-2 | Token Number | BUG-144 | |
| S-3 | Socket & Realtime | BUG-167, 096, 130 | |
| S-4 | Expense Entry Flow | CR-059 + 10 BUGs | |
| S-5 | Expense Setup | BUG-158,159,160,161,163,164,165,157 | |
| S-6 | Unit Prices + Bulk + Report | CR-066, 067, 061, BUG-179, 180 | |
| S-7 | Sidebar & Navigation | CR-041, 052, BUG-136 | |
| S-8 | Customer Field Mandatoriness | CR-051 | |
| S-9 | Expense Form Details | BUG-175,176,177,178,181 | |
| S-10 | Insights Backend Migration | CR-049 | |
| S-11 | Dev Tooling (optional) | CR-046, 048, 045 | |
