# QA Handover Bundle — Apr-2026 Session Fixes

**Status:** ✅ All three fixes implemented, lint-clean, hot-reloaded
**Branch:** `CR-28-april`
**Tester action required:** Run the 3 sections below; sign off using the checklist at the end.

> Companion doc for OPEN issues (not yet implemented): `/app/memory/bugs/IMPLEMENTATION_HANDOVER_BUNDLE_apr_2026_open_issues.md`

---

## What's covered in this doc

| # | Fix | File(s) modified | Severity |
|---|---|---|---|
| **A** | Prepaid served order persists on dashboard after Settle | `frontend/src/api/socket/socketHandlers.js` | Medium |
| **B** | Room order cash quick-pills + Change use food-only total instead of grand total | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | Medium-High |
| **C** | Cash Received input had no underpayment validation (silent cash leak) | `frontend/src/components/order-entry/CollectPaymentPanel.jsx` | High |

> Detailed per-bug docs (already on disk for reference, but everything you need is in this single doc):
> - `/app/memory/bugs/QUICK_DEBUG_HANDOVER_prepaid_served_order_persists_on_dashboard.md`
> - `/app/memory/bugs/QUICK_DEBUG_HANDOVER_room_order_cash_pills_uses_food_total.md`
> - `/app/memory/bugs/QA_HANDOVER_cash_received_underpayment_block.md`

---

## Test environment setup

- **Tenant:** Mantri / 18march / preprod (any with prepaid + room orders configured).
- **Roles:** Owner / Manager / Cashier — fixes are pure UI/data; behaviour identical across roles.
- **Devices:** Desktop browser (Chrome primary) + tablet preview URL.
- **Build:** Live on preview URL. Hard refresh (`Cmd/Ctrl+Shift+R`) once before starting.
- **Test data needed:**
  - At least 1 dine-in postpaid order
  - At least 1 prepaid order on a dine-in table
  - At least 1 room order with associated transferred orders + outstanding room balance
  - At least 1 takeaway / delivery order

---

# Fix A — Prepaid Served order persists on dashboard

## What was broken
After clicking **Settle** on a prepaid served order, the order card stayed visible on the dashboard with a PAID badge alongside the table's "Available" pill. Order only disappeared on full refresh.

## What was fixed
File: `frontend/src/api/socket/socketHandlers.js` (line 263)

The `shouldRemove` predicate inside `handleOrderDataEvent` is now status-based instead of event-name-gated. Order is dropped from `OrderContext` whenever `order.status` is terminal (`paid` or `cancelled`), regardless of which `update-order*` socket variant carried the news.

## TC-A1 — Prepaid Settle removes the order (PRIMARY)

1. Place a prepaid order on a dine-in table (Pay-and-Place via Cash).
2. Mark the order Ready → mark Served. Order card now shows PAID badge + **Settle** button.
3. Click **Settle**.

**Expected:**
- Toast: "Order settled".
- Order card **disappears** from the dashboard immediately.
- Table cleanly returns to **Available** with no ghost PAID card on top.

## TC-A2 — Postpaid Collect Bill still removes the order (regression)

1. Place a regular postpaid order. Mark Ready → Served.
2. Open Collect Payment → Cash → enter amount → Pay.

**Expected:**
- Order card disappears immediately. (Was using `update-order-paid` channel; still works.)

## TC-A3 — Cancel Order still removes the order (regression)

1. Open any active order → Cancel Order.

**Expected:**
- Order card disappears immediately on cancellation.

## TC-A4 — Switch Table still works (regression)

1. Open any active order → Switch Table → pick another table.

**Expected:**
- Source table cleanly releases the order; target table picks it up. No ghost card on either side.

## TC-A5 — Add item / Mark Ready / Mark Served (regression)

1. Open an active order → add a new item → Update.
2. Mark order Ready, then Served.

**Expected:**
- Order **stays visible** through all these steps (still active).
- Items reflect the latest status.

## TC-A6 — Walk-in / Takeaway / Delivery prepaid Settle

Repeat TC-A1 for each non-dine-in order type.

**Expected:** Order disappears for all. (TableId=0 short-circuits inside `syncTableStatus`, so no table-side effect, but order removal still fires.)

---

# Fix B — Cash quick-pills + Change use Grand Total (not food-only) on room orders

## What was broken
On room orders carrying associated transferred orders + outstanding room balance, the Bill Summary showed:
- Food Total ₹594 + Transferred ₹3,288 + Room Balance ₹300 = **GRAND TOTAL ₹4,182** ✅

But below the Cash Received input:
- Quick-pills: ₹594 / ₹600 / ₹1,000 ❌ (food only)
- Change: `received - 594` instead of `received - 4182` ❌

## What was fixed
File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`
- L373–387 — added top-level `const effectiveTotal = …` (single source of truth for grand total).
- L388 — `change` now uses `effectiveTotal`.
- L1838 — cash quick-pills now use `effectiveTotal`.

Non-room behaviour is unchanged (`effectiveTotal === finalTotal` when no transfers/balance).

## TC-B1 — Room order with transfers + balance (PRIMARY)

1. Pick a room with: ≥1 dine-in/walk-in order transferred to it AND a non-zero outstanding room booking balance.
2. Open Order Entry → Checkout.

**Expected pills (assuming Grand Total ₹4,182):**
- Pill 1 = ₹4,182 (exact)
- Pill 2 = ₹4,200 (next ₹100 multiple)
- Pill 3 = ₹4,500 (next ₹500 multiple)

3. Type ₹5,000 in Cash Received.

**Expected:**
- Change displayed = ₹818 (= 5000 − 4182). NOT ₹4,406.

## TC-B2 — Room order with only transfers, no balance

Setup: Room with associated dine-in orders summing to ₹3,288, food order ₹594, no booking balance.

**Expected:** Pills based on `594 + 3288 = 3882` → 3882 / 3900 / 4000.

## TC-B3 — Room order with only balance, no transfers

Setup: Room with ₹300 booking balance, food order ₹594, no associated transfers.

**Expected:** Pills based on `594 + 300 = 894` → 894 / 900 / 1000.

## TC-B4 — Non-room order (regression)

1. Dine-in / takeaway / delivery order with food = ₹390.

**Expected:** Pills = 390 / 400 / 500. Same as before; no behaviour change.

## TC-B5 — Grand Total label and Pay button (regression)

1. Any room order with the setup from TC-B1.

**Expected:** Grand Total row, Pay button label, and pills all show the same amount (₹4,182).

## TC-B6 — Split Bill totals (regression)

1. Same room order. Click Split.

**Expected:** Split modal still shows the same combined total.

## TC-B7 — Backend payload (regression)

1. Same room order. Pay with cash exact.
2. Inspect network tab `/order-bill-payment` request body.

**Expected:** `payment_amount: 4182` (correct combined amount). Was already correct before this fix; this row confirms the cleanup didn't regress it.

---

# Fix C — Cash Received underpayment block (silent cash leak)

## What was broken
Cashier could enter ANY value in Cash Received (or leave blank) and click **Pay** — the bill closed for the full Grand Total regardless. End-of-day reconciliation showed cash short with no audit signal.

Example: ₹390 bill, cashier types ₹200, clicks Pay → bill records ₹390 collected, cashier physically holds ₹200 → ₹190 cash short.

## What was fixed
File: `frontend/src/components/order-entry/CollectPaymentPanel.jsx`

Three layered guards:
- **Layer A** (L2035) — Pay button stays **disabled** when `paymentMethod === 'cash'` (non-split) and `parseFloat(amountReceived) < effectiveTotal`.
- **Layer B** (L1855–1866) — Cash Received input shows **red border + light-red background** + inline warning *"Need at least ₹X — short by ₹Y"* when amount is short.
- **Layer C** (L420–434) — `handlePayment` early-returns with `console.warn` if cash < grand total. Defence-in-depth for any programmatic bypass.

**Mode shipped:** Strict block — no manager override (yet). See "out of scope" at end.

## TC-C1 — Cash less than total → blocked (PRIMARY)

1. Open an order with Grand Total ₹390. Select Cash. Type `200`.

**Expected:**
- Cash Received input has **red border + light-red background**.
- Below input: red text *"Need at least ₹390 — short by ₹190"*.
- Pay button is **disabled** (greyed, opacity ~50%).
- DevTools network: NO API call.
- DevTools console: clean (Layer C only fires via programmatic call, not from UI click on disabled button).

## TC-C2 — Cash exact → allowed

1. Same order. Cash. Type `390` (or tap the ₹390 quick-pill).

**Expected:**
- Input neutral (grey border, white background).
- Warning text disappears.
- Pay button **enabled** (full green).
- Click Pay → "Processing…" → bill closes normally.
- Network: `payment_amount: 390`.

## TC-C3 — Cash over → allowed with Change

1. Same order. Cash. Type `500`.

**Expected:**
- Input neutral.
- "Change: ₹110" appears (orange text below pills).
- Pay enabled → click Pay → bill closes.

## TC-C4 — Cash blank → blocked

1. Same order. Cash. Leave Cash Received empty.

**Expected:**
- No red styling (warning only triggers when amount is typed AND short).
- Pay button **disabled** (because `parseFloat('') || 0 = 0 < effectiveTotal`).

## TC-C5 — Cash quick-pills (regression of Fix B + C combined)

1. Order with Grand Total ₹390. Tap each pill: ₹390 → ₹400 → ₹500.

**Expected after each tap:**
- Input populates with the pill value.
- Pay button enables for all three.
- Change shown: 0 / ₹10 / ₹110.
- For room with food=₹594 + transfers=₹3,288 + roomBalance=₹300, pills are ₹4,182 / ₹4,200 / ₹4,500. Pay enables for each. Change: 0 / ₹18 / ₹318.

## TC-C6 — UPI → unaffected

1. Same order. Select UPI. (No Cash Received input rendered.)

**Expected:** Pay enables instantly. Bill closes.

## TC-C7 — Card → unaffected

1. Same order. Select Card. Type 4-digit transaction ID `1234`.

**Expected:** Pay enables only after 4 digits entered (existing card-txn validation). Bill closes.

## TC-C8 — Credit / TAB → unaffected

1. Same order. Select Credit/TAB. Enter customer name + 10-digit phone.

**Expected:** Pay enables only after both fields valid (existing validation). Tab created.

## TC-C9 — Transfer to Room → unaffected

1. Same order. Select Transfer to Room. Pick destination room.

**Expected:** Transfer button enables once room selected. Click → order shifts.

## TC-C10 — Split Bill → unaffected

1. Same order. Click Split. Configure split.

**Expected:** Split modal flow uses its own validation (Remaining row + per-row card txn-id check). New cash guard is gated on `!showSplit` so it doesn't interfere.

## TC-C11 — Free / fully-complimentary order → allowed empty

1. Order where Grand Total = ₹0 (e.g. all items marked complimentary).
2. Cash. Leave input blank.

**Expected:** Pay button **enabled** (`0 < 0` is false). Click → bill closes at ₹0.

## TC-C12 — Refresh / state recovery

1. Type insufficient amount (red state).
2. Hard refresh.
3. Re-open Collect Payment.

**Expected:** Input empty, no red state, Pay disabled (because empty + amount < total). No leftover toast or broken UI.

---

# Cross-fix regression suite

Run these once after all three fixes pass individually:

| Area | Quick check |
|---|---|
| **Place new order (postpaid)** | Add items → place → succeeds. Order appears on dashboard. |
| **Place new order with payment (prepaid)** | Add items → Pay-and-place → succeeds. Order appears, marked prepaid. |
| **Update order — add items** | Open existing → add item → Update → succeeds. |
| **Update order — qty increase on PLAIN item** | Open → +1 plain item → Update → succeeds. (Customised qty-increase is a separate known bug, see Implementation Handover doc Issue 5.) |
| **Cancel item** | Cancel a single item → succeeds. |
| **Cancel full order** | Cancel order → order disappears from dashboard. |
| **Switch table** | Move order between tables → both terminals reflect. |
| **Food transfer** | Transfer item across orders → succeeds. |
| **Print KOT (manual Re-Print)** | Click Re-Print KOT → KOT prints. |
| **Print Bill (manual)** | Click Print Bill → bill prints with correct totals. |
| **Auto-bill on payment** | Cashier ticks "Auto-print" → after Pay, bill prints with correct totals. (NOTE: Auto-bill is currently broken per Implementation Handover Issue 3d — this row may fail; that's expected and tracked separately.) |

---

# Reporting bugs found during QA

When raising any new issue, please include:
- Tenant + restaurant ID
- Order number / receipt number
- Payment method selected (and any cash/card/upi sub-state)
- Cash Received value typed (if applicable)
- Grand Total displayed on screen
- Browser + version
- Screenshot of the screen state
- DevTools Network tab `/order-bill-payment` (or relevant endpoint) request body if Pay was clicked
- Last 20 lines of DevTools console output

---

# Sign-off checklist

## Fix A — Prepaid Settle
- [ ] TC-A1 pass (primary)
- [ ] TC-A2, TC-A3, TC-A4, TC-A5 pass (regression)
- [ ] TC-A6 pass (non-dine-in)

## Fix B — Cash pills + Change for room
- [ ] TC-B1 pass (primary, room with transfers + balance)
- [ ] TC-B2, TC-B3 pass (room edge cases)
- [ ] TC-B4 pass (non-room regression)
- [ ] TC-B5, TC-B6, TC-B7 pass (consistency)

## Fix C — Cash underpayment block
- [ ] TC-C1 to TC-C4 pass (cash gating)
- [ ] TC-C5 pass (pills regression with Fix B)
- [ ] TC-C6 to TC-C10 pass (other payment methods unaffected)
- [ ] TC-C11 pass (free order edge case)
- [ ] TC-C12 pass (refresh recovery)

## Cross-fix
- [ ] All 11 cross-fix regression rows pass (except Auto-bill row tracked separately)

---

# Out-of-scope (tracked elsewhere)

| Item | Tracked in |
|---|---|
| Manager-override path for cash short-payment | Implementation Handover Issue 3d (deferred decision) |
| Split Bill cash sub-rows analogous to Fix C | Separate ticket (deferred) |
| Auto-bill never fires | Implementation Handover Issue 3d (blocked on logs) |
| KOT prints on Mark Ready/Served | Implementation Handover Issue 4 (backend ticket) |
| Customised item qty-increase 500 | Implementation Handover Issue 5 (frontend, not yet applied) |
| Dynamic-priced item with variants/addons skips price prompt | Implementation Handover Issue 1 (awaiting Option B/C decision) |
| Browser autofill leakage on address input | Implementation Handover Issue 2 (~5 LOC, ready) |
| SC silently added at place time when auto-SC=No | Implementation Handover Issue 3a (~6 LOC × 3 sites, ready) |
| KOT/Bill checkboxes are dead, settings.autoKot ignored | Implementation Handover Issues 3b + 3c (bundled, ~25 LOC) |
