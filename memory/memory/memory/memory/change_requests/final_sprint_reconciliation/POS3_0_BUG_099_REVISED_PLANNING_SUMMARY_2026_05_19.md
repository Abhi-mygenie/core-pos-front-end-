# BUG-099 — QSR Mode Quick Billing — Revised Planning Summary — 2026-05-19

## 1. Scope Change (Owner Directive)

| Original Plan | Revised Plan (Owner 2026-05-19) |
|---|---|
| Part 1: One-step quick billing (Place+Pay) | **IN SCOPE** — QSR mode: Place+Pay in one shot from CartPanel |
| Part 2: Compact Collect Payment screen redesign | **OUT OF SCOPE** — No changes to CollectPaymentPanel.jsx |

**Owner rationale:** In QSR mode, payment completes at Place Order time — the cashier never sees Collect Payment. Therefore compact layout is unnecessary.

---

## 2. Owner Decisions (Frozen)

| Q-ID | Question | Owner Decision |
|---|---|---|
| OQ-CR-01 | Toggle mechanism | **Visibility Settings toggle** (StatusConfigPage.jsx) — same pattern as "Order Taking", "Stay on Order Entry After Collect Bill" |
| OQ-CR-02 | Collect Payment changes? | **No** — a new mechanism will be built for QSR mode in the order screen. Collect Payment screen is untouched |
| OQ-CR-03 | Reuse existing `placeOrderWithPayment` API? | **Yes** — reuse the existing `PLACE_ORDER` endpoint with `placeOrderWithPayment` transformer |

---

## 3. Existing Patterns to Reuse

### 3a. Toggle Pattern (StatusConfigPage.jsx)
The Visibility Settings page already has 2 toggles in the "UI Elements" section:
1. **Order Taking** — `mygenie_order_taking_enabled` (localStorage JSON `{ enabled: true/false }`)
2. **Stay on Order Entry After Collect Bill** — `mygenie_stay_on_order_after_bill` (localStorage `'true'/'false'`)

Both use the same UI pattern: toggle card with ON/OFF badge + description text + switch button.

**QSR Mode toggle will follow the same pattern:**
- localStorage key: `mygenie_qsr_mode_enabled`
- Default: OFF (preserves current 3-step flow for all restaurants)
- Utility: new file `utils/qsrModePrefs.js` (mirrors `orderEntryPrefs.js` pattern)
- Persist on Save Configuration (same as other toggles)

### 3b. Place+Pay Flow (OrderEntry.jsx L1498–L1631)
The prepaid "Scenario 2" flow at `OrderEntry.jsx:1498` already does Place+Pay in one shot:
1. Builds payload via `orderToAPI.placeOrderWithPayment()`
2. POSTs to `API_ENDPOINTS.PLACE_ORDER` as FormData
3. Waits for table engage + order response
4. Auto-prints if configured
5. Navigates away (dashboard or fresh cart per "Stay on Order Entry" toggle)

This flow is triggered from `CollectPaymentPanel` when `!placedOrderId` (fresh order) and cashier clicks "Pay". In QSR mode, this same flow will be triggered **directly from CartPanel** — bypassing CollectPaymentPanel entirely.

### 3c. Payment Data Shape
The `placeOrderWithPayment` transformer expects `paymentData`:
```js
{
  paymentMode: 'Cash' | 'Card' | 'UPI' | etc.,
  paymentAmount: <grand total>,
  paymentStatus: 'paid',
  // + optional: cashReceived, changeAmount (for cash)
}
```
For QSR mode, the simplest path is: cashier selects payment method pill → system assembles `paymentData` with `paymentAmount = total` + `paymentStatus = 'paid'` → fires `placeOrderWithPayment`.

---

## 4. What Changes

### 4a. New Files

| # | File | Purpose |
|---|---|---|
| 1 | `src/utils/qsrModePrefs.js` | Read/write QSR mode toggle from localStorage (mirrors `orderEntryPrefs.js`) |

### 4b. Modified Files

| # | File | Change | Risk |
|---|---|---|---|
| 1 | `StatusConfigPage.jsx` | Add "QSR Mode" toggle in UI Elements section (same pattern as Order Taking / Stay on Order) | LOW — additive UI; no existing behavior touched |
| 2 | `CartPanel.jsx` | When QSR mode ON + fresh order (no placed items): replace "Collect Bill" button area with inline payment method pills (Cash / Card / UPI) + "Place & Pay" button. When QSR mode OFF: no change at all | MEDIUM — conditional rendering in cart bottom area |
| 3 | `OrderEntry.jsx` | Wire the QSR Place+Pay action: when cashier taps "Place & Pay" from CartPanel's QSR pills, execute the same prepaid Scenario 2 flow (L1498–L1631) with assembled `paymentData`. Read QSR mode toggle | MEDIUM — reuses existing flow; new trigger point |

### 4c. Files NOT Modified

| File | Reason |
|---|---|
| `CollectPaymentPanel.jsx` | **Owner directive: no changes** |
| `orderTransform.js` | `placeOrderWithPayment` already handles the payload — no changes |
| `orderService.js` | No changes |
| `socketHandlers.js` | No changes |
| `api/constants.js` | No changes — uses existing `PLACE_ORDER` endpoint |
| `DashboardPage.jsx` | No changes |
| Any card components | No changes |

---

## 5. Detailed Behavior Specification

### 5a. QSR Mode Toggle (StatusConfigPage)
- New toggle in "UI Elements" section, after "Stay on Order Entry After Collect Bill"
- Label: **"QSR Quick Billing"**
- Badge: ON / OFF
- Description: "When ON, fresh orders show inline payment method selection in the cart. Cashier can Place & Pay in one step without opening the Collect Bill screen. Ideal for counter-service / QSR / cafe workflows."
- Default: **OFF**
- Storage: `mygenie_qsr_mode_enabled` → `'true'` / `'false'`

### 5b. CartPanel QSR Mode Behavior

**When QSR mode = OFF (default):**
- No change. Existing "Place Order" + "Collect Bill" buttons render as today.

**When QSR mode = ON:**

For **fresh orders** (no placed items, `!hasPlacedItems`):
- "Place Order" button is **replaced** by the QSR billing area
- QSR billing area shows:
  1. **Payment method pills** — horizontal row of selectable pills showing restaurant's enabled payment methods (Cash, Card, UPI — read from `restaurant.paymentMethods`). Only methods where the restaurant toggle is ON appear.
  2. **"Place & Pay" button** — full-width green button. Enabled only when: cart has items AND a payment method is selected. Disabled during processing.
  3. The "Collect Bill" button is **hidden** in QSR mode for fresh orders (payment happens at place time).

For **existing orders** (has placed items, `hasPlacedItems`):
- QSR mode has **no effect**. Existing "Update Order" + "Collect Bill" buttons render normally. Rationale: existing orders may need the full Collect Bill flow (discount, tip, split, etc.).

### 5c. Place & Pay Action Flow

When cashier taps "Place & Pay":
1. Run same validations as `handlePlaceOrder` (TakeAway name, Delivery name+phone+address)
2. Assemble `paymentData`: `{ paymentMode: selectedMethod, paymentAmount: total, paymentStatus: 'paid' }`
3. Execute the same logic as the existing Scenario 2 prepaid flow (OrderEntry.jsx L1498–L1631):
   - Build payload via `orderToAPI.placeOrderWithPayment()`
   - POST to `PLACE_ORDER` endpoint
   - Wait for table engage
   - Auto-print if configured
   - Navigate (dashboard or fresh cart per "Stay on Order Entry" toggle)
4. Error handling: same toast pattern as existing prepaid flow

### 5d. Payment Method Resolution

Read from `restaurant.paymentMethods` (from profileTransform):
```js
paymentMethods: {
  cash: toBoolean(api.pay_cash),
  upi: toBoolean(api.pay_upi),
  card: toBoolean(api.pay_cc),
  tab: toBoolean(api.pay_tab),  // TAB excluded from QSR — requires customer selection
}
```

QSR mode shows only: **Cash, Card, UPI** (where enabled). TAB/Credit is excluded from QSR quick billing because it requires customer selection and is a deferred-payment method.

Default selection: **Cash** (first enabled method) — cashier can change before pressing "Place & Pay".

---

## 6. What NOT to Touch (Guardrails)

| Area | Reason |
|---|---|
| CollectPaymentPanel.jsx | Owner directive: no changes |
| Financial calculation math (totals, tax, SC, round-off) | Business rules protected |
| Print payload shape | Must remain identical — `placeOrderWithPayment` handles this |
| Payment status semantics (`'paid'`, `'sucess'`) | Frozen rules PAY-004, PAY-007 |
| Existing Collect Bill flow for dine-in / room / split / tab | Untouched for non-QSR and existing orders |
| `/app/memory/final/` baseline docs | Frozen |
| Service charge / tip / discount / delivery charge logic | No change — QSR quick billing uses totals as-is from cart |

---

## 7. Business Rules Protection

| Rule | Impact | Protected? |
|---|---|---|
| PAY-001 (unpaid order payload) | QSR skips unpaid placement entirely | N/A |
| PAY-004 (prepaid order payload) | QSR uses exact same `placeOrderWithPayment` path | YES |
| PAY-007 (PayLater typo) | Not applicable to QSR (PayLater is not a QSR payment method) | N/A |
| PAY-008 (TAB/Credit) | TAB excluded from QSR pills | YES |
| DASH-001/002/003 | Dashboard rendering unchanged | YES |
| TOTALS/TAX/SC/TIP/ROUND rules | Financial math untouched; QSR uses cart total as-is | YES |
| API-03 (OrderEntry for composition, CollectPayment for settlement) | QSR adds a shortcut for simple prepaid cases; full flow preserved for all other cases | YES |

---

## 8. Dependency Chain

```
No backend dependency — FE only.
No inter-bug dependency (BUG-095, BUG-087, BUG-088 are independent).

Implementation order:
1. Create qsrModePrefs.js utility
2. Add QSR Mode toggle to StatusConfigPage.jsx
3. Add QSR payment pills + Place & Pay button to CartPanel.jsx
4. Wire Place & Pay action in OrderEntry.jsx (reuse Scenario 2 flow)
5. yarn build validation
```

---

## 9. QA Checklist

- [ ] QSR mode toggle appears in Visibility Settings → UI Elements section
- [ ] Toggle persists across page reload (localStorage)
- [ ] QSR mode OFF: CartPanel renders exactly as before (no visual change)
- [ ] QSR mode ON + fresh dine-in order: payment pills + Place & Pay button visible; Place Order / Collect Bill hidden
- [ ] QSR mode ON + fresh walk-in order: same behavior
- [ ] QSR mode ON + fresh takeaway order: name validation fires before Place & Pay
- [ ] QSR mode ON + fresh delivery order: name + phone + address validation fires
- [ ] QSR mode ON + existing order (has placed items): normal Update Order + Collect Bill buttons (no QSR pills)
- [ ] Place & Pay with Cash: order placed + paid via `placeOrderWithPayment` → dashboard shows paid order
- [ ] Place & Pay with Card: same
- [ ] Place & Pay with UPI: same
- [ ] Financial totals match between QSR Place & Pay and normal Collect Bill flow for same cart
- [ ] Print payload parity: KOT/Bill print from QSR Place & Pay matches normal prepaid flow
- [ ] "Stay on Order Entry" toggle ON + QSR Place & Pay: stays on OE with fresh cart
- [ ] "Stay on Order Entry" toggle OFF + QSR Place & Pay: navigates to dashboard
- [ ] Auto-print (KOT/Bill) works correctly after QSR Place & Pay
- [ ] `yarn build` passes with zero errors

---

## 10. Risk Assessment

| Risk | Level | Mitigation |
|---|---|---|
| QSR Place & Pay financial totals differ from full flow | LOW | Same `placeOrderWithPayment` transformer + same cart total — bit-identical payload |
| Print behavior differs | LOW | Same auto-print path fires post-place |
| Existing Collect Bill flow broken | NONE | QSR mode only affects fresh orders; Collect Bill code untouched |
| Toggle leaks into non-QSR workflows | LOW | Strict guard: QSR pills only render when `qsrModeEnabled && !hasPlacedItems` |

---

## 11. Estimated Effort

| Task | Effort |
|---|---|
| `qsrModePrefs.js` utility | 15 min |
| StatusConfigPage toggle | 30 min |
| CartPanel QSR pills + Place & Pay UI | 1 hour |
| OrderEntry wiring | 1 hour |
| Build validation | 15 min |
| **Total** | **~3 hours** |

---

## 12. Final Status

`revised_planning_complete_pending_owner_approval`

**No code was changed. No files were modified. This is a planning document only.**

---

*— End of BUG-099 Revised Planning Summary — 2026-05-19 —*
