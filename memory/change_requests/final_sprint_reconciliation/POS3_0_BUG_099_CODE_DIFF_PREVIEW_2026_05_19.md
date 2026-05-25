# POS3.0 BUG-099 QSR Quick Billing — Code Diff Preview — 2026-05-19

## 1. Purpose

This is the exact code-change preview before source files are modified. Owner approval required before any code is written.

## 2. Approved Bug

BUG-099 — QSR / Cafe Quick Billing (pending owner approval of this diff)

---

## 3. File 1 — NEW: `src/utils/qsrModePrefs.js`

### Purpose
localStorage read/write utility for QSR mode toggles. Mirrors `orderEntryPrefs.js` pattern.

### Full File Content (New)

```js
// QSR Mode preferences — browser-local toggles for QSR quick billing.
//
// BUG-099 (May-2026): QSR Quick Billing mode. When ON, the order screen
// shows inline billing/payment after Place Order instead of navigating
// to the full Collect Bill screen.
//
// Storage scope: browser-global. Same convention as mygenie_order_taking_enabled,
// mygenie_stay_on_order_after_bill, etc.
//
// Read site:  components/order-entry/CartPanel.jsx (QSR billing section)
//             components/order-entry/OrderEntry.jsx (QSR collect bill handler)
// Write site: pages/StatusConfigPage.jsx (UI Elements section)

export const QSR_MODE_KEY = 'mygenie_qsr_mode_enabled';
export const QSR_DISCOUNT_KEY = 'mygenie_qsr_discount_enabled';

export const getQsrModeEnabled = () => {
  try {
    return localStorage.getItem(QSR_MODE_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

export const setQsrModeEnabled = (value) => {
  try {
    localStorage.setItem(QSR_MODE_KEY, value ? 'true' : 'false');
  } catch (_) {}
};

export const getQsrDiscountEnabled = () => {
  try {
    return localStorage.getItem(QSR_DISCOUNT_KEY) === 'true';
  } catch (_) {
    return false;
  }
};

export const setQsrDiscountEnabled = (value) => {
  try {
    localStorage.setItem(QSR_DISCOUNT_KEY, value ? 'true' : 'false');
  } catch (_) {}
};
```

---

## 4. File 2 — MODIFIED: `src/pages/StatusConfigPage.jsx`

### Change 1: Add constants (after ORDER_TAKING_KEY line ~61)

**Current:**
```js
const ORDER_TAKING_KEY = 'mygenie_order_taking_enabled';
const ORDER_TAKING_FACTORY = true;
```

**After:**
```js
const ORDER_TAKING_KEY = 'mygenie_order_taking_enabled';
const ORDER_TAKING_FACTORY = true;

// BUG-099 (May-2026): QSR Quick Billing mode toggle.
const QSR_MODE_KEY = 'mygenie_qsr_mode_enabled';
const QSR_MODE_FACTORY = false;
const QSR_DISCOUNT_KEY = 'mygenie_qsr_discount_enabled';
const QSR_DISCOUNT_FACTORY = false;
```

### Change 2: Add state variables (after stayOnOrderAfterBill state ~L170)

**Current:**
```js
  const [stayOnOrderAfterBill, setStayOnOrderAfterBillState] = useState(false);
```

**After:**
```js
  const [stayOnOrderAfterBill, setStayOnOrderAfterBillState] = useState(false);

  // BUG-099 (May-2026): QSR Quick Billing toggles.
  const [qsrModeEnabled, setQsrModeEnabled] = useState(QSR_MODE_FACTORY);
  const [qsrDiscountEnabled, setQsrDiscountEnabled] = useState(QSR_DISCOUNT_FACTORY);
```

### Change 3: Hydrate on mount (after stayOnOrderAfterBill hydration ~L278-282)

**Current:**
```js
    try {
      setStayOnOrderAfterBillState(getStayOnOrderAfterBill());
    } catch (e) {
      console.error('Failed to read stay-on-order-after-bill flag:', e);
    }
  }, []);
```

**After:**
```js
    try {
      setStayOnOrderAfterBillState(getStayOnOrderAfterBill());
    } catch (e) {
      console.error('Failed to read stay-on-order-after-bill flag:', e);
    }

    // BUG-099 (May-2026): hydrate QSR toggles
    try {
      const storedQsr = localStorage.getItem(QSR_MODE_KEY);
      if (storedQsr === 'true') setQsrModeEnabled(true);
      const storedQsrDiscount = localStorage.getItem(QSR_DISCOUNT_KEY);
      if (storedQsrDiscount === 'true') setQsrDiscountEnabled(true);
    } catch (e) {
      console.error('Failed to read QSR mode flags:', e);
    }
  }, []);
```

### Change 4: Reset to default (after stayOnOrderAfterBillState reset ~L334)

**Current:**
```js
    setStayOnOrderAfterBillState(false);
    setHasChanges(true);
  };
```

**After:**
```js
    setStayOnOrderAfterBillState(false);
    // BUG-099: reset QSR toggles
    setQsrModeEnabled(QSR_MODE_FACTORY);
    setQsrDiscountEnabled(QSR_DISCOUNT_FACTORY);
    setHasChanges(true);
  };
```

### Change 5: Save to localStorage (after stayOnOrderAfterBill persist ~L446)

**Current:**
```js
    setStayOnOrderAfterBill(stayOnOrderAfterBill);
```

**After:**
```js
    setStayOnOrderAfterBill(stayOnOrderAfterBill);
    // BUG-099: persist QSR toggles
    localStorage.setItem(QSR_MODE_KEY, qsrModeEnabled ? 'true' : 'false');
    localStorage.setItem(QSR_DISCOUNT_KEY, qsrDiscountEnabled ? 'true' : 'false');
```

### Change 6: Add import (top of file, after orderEntryPrefs import ~L16)

**Current:**
```js
import {
  getStayOnOrderAfterBill,
  setStayOnOrderAfterBill,
} from "../utils/orderEntryPrefs";
```

**After:**
```js
import {
  getStayOnOrderAfterBill,
  setStayOnOrderAfterBill,
} from "../utils/orderEntryPrefs";
import {
  getQsrModeEnabled as readQsrMode,
  getQsrDiscountEnabled as readQsrDiscount,
} from "../utils/qsrModePrefs";
```

Note: `readQsrMode` / `readQsrDiscount` aliases are for mount hydration only — state variables drive the UI.

### Change 7: Add toggle UI (after Stay on Order Entry toggle ~L751, before Station View section ~L754)

Two new toggle cards following the exact same pattern as the "Stay on Order Entry" toggle above:

```jsx
              {/* BUG-099 (May-2026): QSR Quick Billing toggle */}
              <div
                className="rounded-lg p-4 border-2 flex items-start justify-between gap-4 mt-3"
                style={{
                  backgroundColor: qsrModeEnabled ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
                  borderColor: qsrModeEnabled ? COLORS.primaryGreen : COLORS.borderGray,
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium" style={{ color: COLORS.darkText }}>
                      QSR Quick Billing
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: qsrModeEnabled ? COLORS.primaryGreen : COLORS.grayText,
                        color: '#fff',
                      }}
                    >
                      {qsrModeEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: COLORS.grayText }}>
                    When ON, fresh orders show inline payment in the cart. Cashier can
                    Place Order then Collect Bill in one screen without opening the full
                    payment panel. Ideal for counter-service, QSR, and cafe workflows.
                  </p>
                </div>
                <button
                  data-testid="qsr-mode-toggle"
                  onClick={() => { setQsrModeEnabled(v => !v); setHasChanges(true); }}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: qsrModeEnabled ? COLORS.primaryGreen : COLORS.borderGray }}
                  role="switch"
                  aria-checked={qsrModeEnabled}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: qsrModeEnabled ? 'translateX(22px)' : 'translateX(2px)', marginTop: '2px' }}
                  />
                </button>
              </div>

              {/* BUG-099 (May-2026): QSR Discount toggle — only visible when QSR mode is ON */}
              {qsrModeEnabled && (
              <div
                className="rounded-lg p-4 border-2 flex items-start justify-between gap-4 mt-3"
                style={{
                  backgroundColor: qsrDiscountEnabled ? `${COLORS.primaryGreen}05` : COLORS.lightBg,
                  borderColor: qsrDiscountEnabled ? COLORS.primaryGreen : COLORS.borderGray,
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium" style={{ color: COLORS.darkText }}>
                      QSR Discount
                    </span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: qsrDiscountEnabled ? COLORS.primaryGreen : COLORS.grayText,
                        color: '#fff',
                      }}
                    >
                      {qsrDiscountEnabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: COLORS.grayText }}>
                    When ON, the discount field appears in QSR quick billing.
                    Cashier can apply percentage or flat discounts at billing time.
                  </p>
                </div>
                <button
                  data-testid="qsr-discount-toggle"
                  onClick={() => { setQsrDiscountEnabled(v => !v); setHasChanges(true); }}
                  className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none"
                  style={{ backgroundColor: qsrDiscountEnabled ? COLORS.primaryGreen : COLORS.borderGray }}
                  role="switch"
                  aria-checked={qsrDiscountEnabled}
                >
                  <span
                    className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                    style={{ transform: qsrDiscountEnabled ? 'translateX(22px)' : 'translateX(2px)', marginTop: '2px' }}
                  />
                </button>
              </div>
              )}
```

---

## 5. File 3 — MODIFIED: `src/components/order-entry/CartPanel.jsx`

### Summary of Changes

CartPanel receives new props. When QSR mode is ON and order has placed items, the bottom section transforms:
- KOT/Bill checkboxes hidden
- Normal Place Order + Collect Bill buttons hidden
- QSR billing section renders: bill calculation, discount (optional), delivery charge (delivery orders), SC (auto from profile), tip (optional from profile), tax, grand total, payment pills, cash/card inputs, Collect Bill CTA, Full Billing link

### Change 1: New props (add to CartPanel function signature ~L240-295)

Add after existing props:

```js
  // BUG-099 (May-2026): QSR Quick Billing mode
  qsrMode = false,
  qsrDiscountEnabled = false,
  onQsrCollectBill,        // (paymentData) => void — triggers collect bill from OrderEntry
  restaurant = null,        // restaurant profile for SC/tip/discount/payment config
  onFullBilling,            // () => void — opens CollectPaymentPanel
```

### Change 2: QSR billing section (replaces bottom buttons when QSR active)

After the existing `{/* Bottom Action Buttons */}` section (~L844-898), add conditional QSR rendering. The full QSR billing component is ~200 lines containing:

1. **Bill calculation** (useMemo): itemTotal, discount, SC (auto from profile), tip, deliveryCharge, tax (SGST+CGST+VAT), roundOff, grandTotal — same formulas as CollectPaymentPanel
2. **Discount section** (conditional on qsrDiscountEnabled): dropdown + input, same as CollectPaymentPanel L894-967
3. **Delivery charge** (conditional on `orderType === 'delivery'`): editable input
4. **SC display** (auto from profile, read-only row): if `autoServiceCharge && scPct > 0 && applicableType`
5. **Tip input** (conditional on `features.tip && applicableType`): optional
6. **Bill summary rows**: Item Total, Discount (if applied), SC (if applied), Delivery (if delivery), Tip (if entered), Tax, Round-off (if non-zero), Grand Total
7. **Payment pills**: Cash/Card/UPI, respecting `restaurant.paymentMethods` config
8. **Cash input** (when cash selected): auto-filled with grandTotal, editable, change display
9. **Card TXN ID** (when card selected): optional input
10. **Collect Bill CTA**: full-width green button
11. **Full Billing link**: small text link calling `onFullBilling`

The exact JSX follows the same styling patterns used throughout the codebase (COLORS constants, Tailwind classes, data-testid attributes).

**Conditional rendering logic:**

```jsx
{/* Bottom Section */}
{qsrMode && hasPlacedItems ? (
  <QsrBillingSection />  // New QSR section (described above)
) : (
  <>
    {/* Existing KOT/Bill checkboxes — hidden when QSR ON */}
    {!qsrMode && (
      // ... existing KOT/Bill checkbox rendering
    )}
    {/* Existing bottom buttons */}
    <div className="p-4 flex gap-3" ...>
      {/* Place Order button — full width when QSR ON + no placed items */}
      {/* Collect Bill button — hidden when QSR ON + no placed items */}
    </div>
  </>
)}
```

---

## 6. File 4 — MODIFIED: `src/components/order-entry/OrderEntry.jsx`

### Change 1: Import qsrModePrefs (after orderEntryPrefs import ~L16)

**Current:**
```js
import { getStayOnOrderAfterBill } from "../../utils/orderEntryPrefs";
```

**After:**
```js
import { getStayOnOrderAfterBill } from "../../utils/orderEntryPrefs";
import { getQsrModeEnabled, getQsrDiscountEnabled } from "../../utils/qsrModePrefs";
```

### Change 2: QSR state (after printAllBill state ~L86)

**Current:**
```js
  const [printAllBill, setPrintAllBill] = useState(() => !!restaurant?.settings?.autoBill);
```

**After:**
```js
  const [printAllBill, setPrintAllBill] = useState(() => !!restaurant?.settings?.autoBill);
  // BUG-099: QSR mode flags — read from localStorage once per mount
  const qsrMode = useMemo(() => getQsrModeEnabled(), []);
  const qsrDiscountEnabled = useMemo(() => getQsrDiscountEnabled(), []);
```

### Change 3: QSR collect bill handler (new function, before the return statement)

New function `handleQsrCollectBill` that reuses the **existing** Scenario 1 collect-bill code path (L1612-1718). It receives assembled `paymentData` from CartPanel's QSR billing section and calls `collectBillExisting` → `api.post(BILL_PAYMENT)` → auto-print → navigate.

```js
  // BUG-099: QSR inline collect bill — reuses existing Scenario 1 (collect bill on existing order)
  const handleQsrCollectBill = useCallback(async (paymentData) => {
    if (isProcessingPayment) return;
    setIsProcessingPayment(true);
    setIsPlacingOrder(true);

    try {
      const collectOrderId = effectiveTable?.orderId || placedOrderId;
      const engagePromise = collectOrderId ? waitForOrderEngaged(collectOrderId) : null;

      // BUG-099: In QSR mode, KOT/Bill are auto-handled from profile
      const qsrAutoBill = !!restaurant?.settings?.autoBill;

      const payload = orderToAPI.collectBillExisting(effectiveTable, cartItems, customer, paymentData, {
        autoBill: qsrAutoBill,
        waiterId: user?.employeeId || '',
        restaurantName: restaurant?.name || '',
      });
      console.log('[QSR CollectBill] payload:', JSON.stringify(payload, null, 2));

      let billPaymentFailed = false;
      await api.post(API_ENDPOINTS.BILL_PAYMENT, payload)
        .then(res => console.log('[QSR CollectBill] response:', res.data))
        .catch(err => {
          billPaymentFailed = true;
          console.error('[QSR CollectBill] CRITICAL:', err?.response?.status, err?.response?.data);
          const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Payment failed';
          toast({ title: "Payment Failed", description: msg, variant: "destructive" });
          setIsPlacingOrder(false);
        });

      if (billPaymentFailed) return;

      // Auto-print (reuses existing logic pattern from L1645-1700)
      if (qsrAutoBill && collectOrderId && !effectiveTable?.isRoom) {
        try {
          const orderForPrint = getOrderById(Number(collectOrderId));
          if (orderForPrint?.rawOrderDetails) {
            const discountAmount = Math.round(
              ((paymentData?.discounts?.manual || 0)
                + (paymentData?.discounts?.preset || 0)
                + (paymentData?.discounts?.couponDiscount || 0)) * 100
            ) / 100;
            const overrides = {
              orderItemTotal:      paymentData?.itemTotal,
              orderSubtotal:       paymentData?.subtotal,
              paymentAmount:       paymentData?.finalTotal,
              discountAmount,
              serviceChargeAmount: paymentData?.serviceCharge || 0,
              deliveryCharge:      paymentData?.deliveryCharge || 0,
              gstTax:              paymentData?.printGstTax,
              vatTax:              paymentData?.printVatTax,
              tip:                 paymentData?.tip || 0,
              ...(orderType === 'delivery' && selectedAddress ? { deliveryAddress: selectedAddress } : {}),
            };
            await printOrder(Number(collectOrderId), 'bill', null, orderForPrint, restaurant?.serviceChargePercentage || 0, overrides, printerAgents || []);
          }
        } catch (err) {
          console.error('[QSR AutoPrint] non-blocking error:', err?.message);
        }
      }

      if (engagePromise) await engagePromise;
      // Navigate: respect "Stay on Order Entry" toggle
      if (getStayOnOrderAfterBill() && typeof onCollectBillStayOnOrder === 'function') {
        onCollectBillStayOnOrder();
      } else {
        onClose();
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || 'Payment failed';
      toast({ title: "Payment Failed", description: msg, variant: "destructive" });
      setIsPlacingOrder(false);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [effectiveTable, placedOrderId, cartItems, customer, restaurant, user, orderType, selectedAddress, printerAgents, isProcessingPayment, printAllBill, toast, onClose, onCollectBillStayOnOrder, getOrderById, waitForOrderEngaged]);
```

### Change 4: Pass QSR props to CartPanel (~L1917-1979)

**Add after existing `setPrintAllBill` prop (L1978):**

```jsx
                // BUG-099: QSR mode props
                qsrMode={qsrMode}
                qsrDiscountEnabled={qsrDiscountEnabled}
                onQsrCollectBill={handleQsrCollectBill}
                restaurant={restaurant}
                onFullBilling={() => setShowPaymentPanel(true)}
```

---

## 7. Files NOT Modified

| File | Reason |
|---|---|
| `CollectPaymentPanel.jsx` | Owner directive: no changes |
| `orderTransform.js` | `collectBillExisting` already works |
| `api/constants.js` | Uses existing `BILL_PAYMENT` endpoint |
| `profileTransform.js` | Profile fields already mapped |
| `DashboardPage.jsx` | No changes |
| `socketHandlers.js` | No changes |
| Any other file | QSR is purely additive |

---

## 8. Final Status

`code_diff_preview_created_pending_owner_approval`

No code was changed. No files were modified. This is a preview only.

---

*— End of POS3.0 BUG-099 Code Diff Preview — 2026-05-19 —*
