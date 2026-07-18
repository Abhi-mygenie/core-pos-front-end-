# QA Handover — Cash Received: Underpayment Block (Strict mode)

**Status:** ✅ Implemented, awaiting QA
**Type:** Bug fix
**Severity:** High — silent cash leak (cashier collected ₹X but bill closed for full ₹Y)
**Branch:** `CR-28-april`
**Build:** Hot-reloaded; refresh the browser to pick up

---

## 1. What was broken

**Symptom:** On the **Collect Payment** screen with payment method **Cash**, the Pay button activated and the bill closed even when "Cash Received" was less than the Grand Total. Backend recorded the bill at full amount; cashier had only collected the typed (lesser) amount → end-of-day cash short with no audit signal.

**Reproduction recipe (before fix):**
1. Open any open order → Collect Payment.
2. Select **Cash**.
3. Type any amount **less than** Grand Total in *Cash Received* (or leave blank).
4. Click **Pay** → goes to "Processing…" → bill closes at full Grand Total.

**Affected order types:** All — dine-in, takeaway, delivery, room. Not method-specific to room. The bug lived in the validation layer, not the total computation.

---

## 2. What was fixed

Three layered guards were added to `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`:

| Layer | Behaviour |
|---|---|
| **A — Pay button stays disabled** | When `paymentMethod === 'cash'` (non-split mode) and `parseFloat(amountReceived) < effectiveTotal`, the Pay button remains greyed out. Cashier physically cannot trigger checkout. |
| **B — Visual feedback on the input** | Red border + light-red background on the Cash Received input. Inline warning under the input: *"Need at least ₹X — short by ₹Y"* (red text). |
| **C — Defence-in-depth handler guard** | `handlePayment` itself short-circuits with a `console.warn` early return if cash < grand total. Catches any programmatic invocation (keyboard shortcuts, future test harness) that might bypass the disabled state. |

**Mode shipped:** Strict block — no manager override. (See Section 6 if you want this revisited.)

---

## 3. Test environment

- **Tenant:** Any (test on Mantri / 18march / preprod as available).
- **Roles to test:** Owner / Manager / Cashier / Waiter — guard is purely UI-side, so behaviour should be identical across roles.
- **Devices:** Desktop browser (primary) + tablet (preview URL).
- **Build:** Live on the preview URL — hard refresh once before testing (`Cmd/Ctrl + Shift + R`).
- **Test data:** Need at least one open postpaid order in any state; ideally also one room order with associated transfers + room balance for the room scenario.

---

## 4. Test cases

### TC-1 — Cash, less than total → blocked (PRIMARY)

**Steps:**
1. Open an order with Grand Total ₹390.
2. Click *Collect Payment* → select **Cash**.
3. Type `200` in Cash Received.

**Expected:**
- Cash Received input shows **red border + light-red background**.
- Below the input, red warning: *"Need at least ₹390 — short by ₹190"*.
- Pay button is **disabled** (greyed out, opacity 50%).
- DevTools network tab: no API call.
- DevTools console: clean (no warnings — that path triggers only via Edit C).

### TC-2 — Cash, exact amount → allowed

**Steps:**
1. Same order. Cash method.
2. Type `390` (or tap the ₹390 quick-pill).

**Expected:**
- Input border returns to neutral grey, background white.
- Warning text disappears.
- Pay button is **enabled** (full green).
- Click Pay → "Processing…" → bill closes normally.
- Backend `/order-bill-payment` request body: `payment_amount: 390`.

### TC-3 — Cash, over amount + Change → allowed

**Steps:**
1. Same order. Cash method. Type `500`.

**Expected:**
- Input neutral, no warning.
- "Change: ₹110" appears below pills (orange text).
- Pay enables → Pay → bill closes.

### TC-4 — Cash, blank input → blocked

**Steps:**
1. Same order. Cash method. Leave Cash Received empty.

**Expected:**
- No red styling (because input is blank — warning only triggers when amount is typed AND short).
- Pay button **disabled** (because the disabled-clause treats blank as `parseFloat('') || 0 = 0 < effectiveTotal`).
- Cannot proceed.

### TC-5 — Cash quick-pills (regression of earlier fix)

**Steps:**
1. Order with Grand Total ₹390.
2. Tap each pill in turn: `₹390` → `₹400` → `₹500`.

**Expected:**
- After each tap, input populates with the pill amount.
- Pay button enables for all three.
- Change displays: 0, ₹10, ₹110 respectively.
- For a **room order** with food=₹594 + transfers=₹3,288 + roomBalance=₹300, pills should be ₹4,182 / ₹4,200 / ₹4,500 (NOT ₹594/600/1000).

### TC-6 — UPI → unaffected

**Steps:**
1. Same order. Select **UPI**. (No Cash Received input shown.)

**Expected:**
- Pay button enables instantly (no validation gate).
- Click → bill closes.

### TC-7 — Card → unaffected

**Steps:**
1. Same order. Select **Card**. Type 4-digit transaction ID `1234`.

**Expected:**
- Pay enables only after 4 digits entered (existing card-txn validation, unchanged).
- Click → bill closes.

### TC-8 — Credit / TAB → unaffected

**Steps:**
1. Same order. Select **Credit / TAB**. Enter customer name + 10-digit phone.

**Expected:**
- Pay enables only after both fields valid (existing tab validation, unchanged).
- Click → tab created.

### TC-9 — Transfer to Room → unaffected

**Steps:**
1. Same order. Select **Transfer to Room**, pick a destination room.

**Expected:**
- Transfer button enables once room selected.
- Click → order shifts to room.

### TC-10 — Split Bill → unaffected

**Steps:**
1. Same order. Click **Split**. Configure split (item or payment split).

**Expected:**
- Split modal flow uses its own validation (Remaining row + per-row card txn-id check).
- The new cash-underpayment guard does NOT interfere (guard is gated on `!showSplit`).

### TC-11 — Free / fully-complimentary order → allowed empty

**Steps:**
1. Order where Grand Total = ₹0 (e.g. all items marked complimentary).
2. Cash method, leave input blank.

**Expected:**
- `parseFloat('') || 0 = 0`, `effectiveTotal = 0`, `0 < 0` is false → Pay button is **enabled**.
- Click → bill closes at ₹0.

### TC-12 — Room order with transfers + room balance → guard uses combined total

**Steps:**
1. Pick a room with associated dine-in transfers AND/OR an outstanding room booking balance. Bill summary shows e.g. Food ₹594 + Transferred ₹3,288 + Room Balance ₹300 = Grand Total ₹4,182.
2. Cash method, type `4000`.

**Expected:**
- Red border + warning *"Need at least ₹4,182 — short by ₹182"*.
- Pay disabled.
- Bump to `4182` → enables. Backend receives `payment_amount: 4182`.

### TC-13 — Refresh / state recovery

**Steps:**
1. Type an insufficient amount (red state).
2. Hard refresh the page.
3. Re-enter Collect Payment.

**Expected:**
- Input is empty, no red state, Pay disabled (because empty + amount < total).
- No leftover error toast or broken UI.

---

## 5. Regression suites — run these to confirm no collateral damage

| Area | Quick check |
|---|---|
| **Place new order (postpaid)** | Add items → place → succeeds. |
| **Place new order with payment (prepaid)** | Add items → Pay-and-place → succeeds. |
| **Update order — add items** | Open existing order → add item → Update → succeeds. |
| **Update order — qty increase on plain item** | Open → +1 plain item → Update → succeeds. (Note: customised item qty-increase is a separate known bug, see handover doc on `update-place-order` 500.) |
| **Cancel item** | Cancel a single item → succeeds. |
| **Cancel full order** | Cancel order → succeeds. |
| **Switch table** | Move order between tables → both terminals reflect. |
| **Food transfer** | Transfer item across orders → succeeds. |
| **Print KOT / Print Bill (manual)** | Both still print correct totals. |
| **Bill summary card** | Grand Total label, Split Bill modal total, Pay button label all show the same combined value. |
| **Auto-bill print on payment** | Cashier ticks "Auto-print" → after Pay, bill prints with correct totals. |

---

## 6. What to file as a separate ticket if you find it

These are out of scope for this fix:

1. **Manager-override path** for intentional under-collection (loyalty short-pay, owner adjustment). Currently strict block.
2. **Split Bill cash sub-rows** if a sub-row's typed cash amount is less than its slice. Same conceptual gap, different code path.
3. **Cancel/Refund flow** (separate from collect-payment).
4. **Backend `/order-bill-payment`** receiving any payload it shouldn't — the fix is purely client-side; if backend already accepts payloads where the front-end-typed amount differs from `payment_amount`, that's a backend hardening item.

---

## 7. Files touched (single file)

- `/app/frontend/src/components/order-entry/CollectPaymentPanel.jsx`
  - L420–434 — `handlePayment` defensive guard (Edit C)
  - L1855–1866 — Cash input red-state + inline warning (Edit B)
  - L2035 — Pay button disabled-clause (Edit A)
  - L429 (removed) — Local `effectiveTotal` shadow inside `handlePayment` cleaned up (uses top-level constant from earlier `BUG-ROOM-CASH-PILLS` fix)

---

## 8. Reporting back

When raising any bug, please include:
- Tenant + restaurant ID
- Order number / receipt number
- Payment method selected
- Cash Received value typed
- Grand Total displayed
- Browser + version
- Network tab `/order-bill-payment` request body (if Pay was clicked)
- Console output (last 20 lines if anything red/orange)

---

## 9. Sign-off criteria

- [ ] TC-1 to TC-4 pass (cash gating)
- [ ] TC-5 pass (pills work for both non-room and room orders)
- [ ] TC-6 to TC-10 pass (other payment methods unaffected)
- [ ] TC-11 pass (free order edge case)
- [ ] TC-12 pass (room with transfers + balance uses combined total)
- [ ] TC-13 pass (refresh recovery clean)
- [ ] All Section 5 regression spot-checks pass
