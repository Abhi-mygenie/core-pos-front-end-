# CR-165 — Implementation Plan (Gate 3)
## Razorpay Cancel and Refund Integration

**Date:** 2026-08-24
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Based on:** `/app/memory/impact/CR-165_IMPACT_ANALYSIS.md`
**OQ-5 resolved:** Option B — backend will add `razorpay_order_id` to running orders API

---

## Pre-Implementation Entry Verification

Implementation agent MUST verify these before writing any code:

```
1. constants.js line 86 reads:
   PAYMENT_LINK: '/api/v1/razor-pay/payment-link',
   → Confirm verbatim before inserting below it.

2. orderTransform.js line 237 reads:
   paymentMethod: api.payment_method || api.payment_mode || '',
   → Confirm verbatim before inserting after it.

3. OrderEntry.jsx line 1264 reads:
   const handleCancelOrder = async (reason) => {
   → Confirm verbatim before replacing.

4. OrderEntry.jsx line 2720-2727 reads:
   {showCancelOrderModal && (
     <CancelOrderModal
       table={table}
       ...
       onCancel={handleCancelOrder}
     />
   )}
   → Confirm verbatim before replacing.

5. DashboardPage.jsx line 1332 reads:
   const handleCancelOrderConfirm = useCallback(async (reason) => {
   → Confirm verbatim before replacing.

6. DashboardPage.jsx line 2040-2050 reads the CancelOrderModal block.
   → Confirm verbatim before replacing.

7. razorpayRefundService.js: confirm file does NOT exist.
   ls /app/frontend/src/api/services/razorpayRefundService.js → should 404.
```

---

## Scope Lock

**Files WILL change (7):**
1. `src/api/constants.js`
2. `src/api/services/razorpayRefundService.js` ← NEW FILE
3. `src/api/transforms/orderTransform.js`
4. `src/components/order-entry/CancelOrderModal.jsx`
5. `src/components/order-entry/OrderEntry.jsx`
6. `src/pages/DashboardPage.jsx`
7. `src/pages/reports-module/OrderReportBetaPage.jsx`

**Files will NOT touch:**
- `CollectPaymentPanel.jsx`, `AppProviders.jsx`, `socketHandlers.js`, `reportTransform.js`, `orderLedgerService.js`, `OrderLedgerMockup.jsx`

---

## Edit 1 — `src/api/constants.js`

**Position:** After line 86 (`PAYMENT_LINK`)
**Change:** Add new endpoint constant

```js
  // CR-165: Razorpay cancel-and-refund (v2, Bearer auth, no restaurant_id)
  RAZORPAY_CANCEL_REFUND: '/api/v2/vendoremployee/order/cancel-and-refund-order',
```

**Exact search (insert after):**
```
  // CR-017: WhatsApp Payment Link — generates Razorpay link + sends WhatsApp/SMS
  PAYMENT_LINK:      '/api/v1/razor-pay/payment-link',
```

---

## Edit 2 — `src/api/services/razorpayRefundService.js` (NEW)

**Full file content:**

```js
// CR-165: Razorpay cancel and refund service
import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Calls the backend cancel-and-refund endpoint for Razorpay PG orders.
 * Backend derives restaurant_id from the Bearer token.
 *
 * @param {number} orderId
 * @param {string} cancellationReason - human-readable reason text
 * @param {string} cancellationNote  - additional note for refund
 * @returns {Promise<object>} response.data
 */
export const cancelAndRefund = async (orderId, cancellationReason, cancellationNote) => {
  const response = await api.post(API_ENDPOINTS.RAZORPAY_CANCEL_REFUND, {
    order_id: orderId,
    cancellation_reason: cancellationReason,
    cancellation_note: cancellationNote,
  });
  return response.data;
};
```

---

## Edit 3 — `src/api/transforms/orderTransform.js`

**Position:** After line 237 (`paymentMethod` line)
**Change:** Map `razorpay_order_id` from API response (backend adding this field)

**Exact search:**
```
      paymentMethod: api.payment_method || api.payment_mode || '',
```

**Replace with:**
```
      paymentMethod: api.payment_method || api.payment_mode || '',
      // CR-165: Razorpay PG detection — backend adds razorpay_order_id to running orders
      razorpayOrderId: api.razorpay_order_id || null,
```

---

## Edit 4 — `src/components/order-entry/CancelOrderModal.jsx`

**Full file replacement** (119 lines → ~155 lines):

```jsx
import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { COLORS } from "../../constants";

// CR-165: mode prop — 'cancel' (default) | 'refund'
// In refund mode: title changes, note textarea shown, button text changes,
// onCancel receives (reason, note) — backward-compatible (note='' in cancel mode)
const CancelOrderModal = ({ table, itemCount, reasons = [], onClose, onCancel, mode = 'cancel' }) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [cancellationNote, setCancellationNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const isRefund = mode === 'refund';

  const handleCancel = async () => {
    if (!selectedReason || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onCancel(selectedReason, cancellationNote);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.errors?.[0]?.message || err?.message || "Operation failed. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" data-testid="cancel-order-modal">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                {isRefund ? 'Cancel & Refund' : 'Cancel Order'}
              </h2>
              <p className="text-sm mt-1" style={{ color: COLORS.grayText }}>
                {table?.label || table?.id} · {itemCount} item{itemCount !== 1 ? 's' : ''} will be cancelled
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors" data-testid="cancel-order-close-btn">
              <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Warning */}
          <div className="px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
            {isRefund
              ? 'This will cancel the order and initiate a Razorpay refund. This action cannot be undone.'
              : 'This will cancel ALL items in this order. This action cannot be undone.'}
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
              Cancellation Reason
            </label>
            <div className="relative">
              <div
                className="flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: COLORS.borderGray }}
                onClick={() => setShowDropdown(!showDropdown)}
                data-testid="cancel-order-reason-dropdown"
              >
                <span style={{ color: selectedReason ? COLORS.darkText : COLORS.grayText }}>
                  {selectedReason ? selectedReason.reasonText : "Select reason"}
                </span>
                <ChevronDown className={`w-5 h-5 transition-transform ${showDropdown ? "rotate-180" : ""}`} style={{ color: COLORS.grayText }} />
              </div>

              {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border max-h-48 overflow-y-auto z-10"
                  style={{ borderColor: COLORS.borderGray }}>
                  {reasons.map((reason) => (
                    <button
                      key={reason.reasonId}
                      onClick={() => { setSelectedReason(reason); setShowDropdown(false); }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      style={{
                        color: COLORS.darkText,
                        backgroundColor: selectedReason?.reasonId === reason.reasonId ? `${COLORS.errorText}10` : "transparent",
                      }}
                      data-testid={`cancel-order-reason-${reason.reasonId}`}
                    >
                      {reason.reasonText}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* CR-165: Note textarea — shown only in refund mode */}
          {isRefund && (
            <div>
              <label className="text-sm font-medium mb-2 block" style={{ color: COLORS.grayText }}>
                Refund Note
              </label>
              <textarea
                value={cancellationNote}
                onChange={(e) => setCancellationNote(e.target.value)}
                placeholder="Add a note for the refund (optional)"
                rows={2}
                className="w-full px-4 py-3 rounded-xl border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-200"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                data-testid="cancel-order-refund-note"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}>
          {error && (
            <div className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}>
              {error}
            </div>
          )}
          <button
            onClick={handleCancel}
            disabled={!selectedReason || submitting}
            data-testid="cancel-order-confirm-btn"
            className="w-full py-3.5 font-semibold text-white text-base rounded-xl transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#EF4444' }}
          >
            {submitting
              ? (isRefund ? 'Processing Refund...' : 'Cancelling...')
              : (isRefund ? 'Confirm & Refund via Razorpay' : 'Cancel Order')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelOrderModal;
```

---

## Edit 5 — `src/components/order-entry/OrderEntry.jsx`

### 5a — Add import for `cancelAndRefund` service (top of file, after existing api imports)

**Find (existing import block):**
```
import api from '../../api/axios';
```
**Insert after:**
```
import { cancelAndRefund } from '../../api/services/razorpayRefundService'; // CR-165
```

### 5b — Replace `handleCancelOrder` (line 1264–1290)

**Exact search:**
```
  const handleCancelOrder = async (reason) => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    if (!orderId) return;

    setIsPlacingOrder(true);
    const engagePromise = waitForOrderEngaged(orderId);

    const payload = orderToAPI.cancelOrder(orderId, permissions?.[0] || 'Manager', reason, {
      // CR-POS2-003-REOPEN-A (May-2026): printer agents + cart for all-stations rule.
      printerAgents: printerAgents || [],
      allCartItems: cartItems,
    });
    api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload)
      .catch(err => {
        console.error('[CancelOrder] CRITICAL:', err?.response?.status, err?.response?.data);
        toast({ title: "Cancel Failed", description: err.readableMessage, variant: "destructive" });
        setIsPlacingOrder(false);
      });

    await engagePromise;
    console.log('[CancelOrder] Socket engaged — redirecting to dashboard');
    toast({
      title: "Order Cancelled",
      description: `Order cancelled for ${table?.label || table?.id}`,
    });
    navigateAfterOrderAction();
  };
```

**Replace with:**
```
  // CR-165: accept (reason, note) — note used only for Razorpay refund
  const handleCancelOrder = async (reason, note = '') => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    if (!orderId) return;

    setIsPlacingOrder(true);
    const engagePromise = waitForOrderEngaged(orderId);

    const payload = orderToAPI.cancelOrder(orderId, permissions?.[0] || 'Manager', reason, {
      // CR-POS2-003-REOPEN-A (May-2026): printer agents + cart for all-stations rule.
      printerAgents: printerAgents || [],
      allCartItems: cartItems,
    });
    api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload)
      .catch(err => {
        console.error('[CancelOrder] CRITICAL:', err?.response?.status, err?.response?.data);
        toast({ title: "Cancel Failed", description: err.readableMessage, variant: "destructive" });
        setIsPlacingOrder(false);
      });

    await engagePromise;
    console.log('[CancelOrder] Socket engaged — redirecting to dashboard');
    toast({
      title: "Order Cancelled",
      description: `Order cancelled for ${table?.label || table?.id}`,
    });

    // CR-165: Trigger A — auto-refund for Razorpay PG orders
    if (orderData?.razorpayOrderId) {
      try {
        await cancelAndRefund(orderId, reason?.reasonText || String(reason), note);
        toast({ title: "Refund Initiated", description: "Razorpay refund has been initiated." });
      } catch (err) {
        console.error('[CR-165] Refund failed after cancel:', err);
        toast({
          title: "Refund Failed",
          description: "Order cancelled but refund could not be initiated. Contact support.",
          variant: "destructive",
        });
      }
    }

    navigateAfterOrderAction();
  };
```

### 5c — Update CancelOrderModal call site (line 2720–2727)

**Exact search:**
```
      {showCancelOrderModal && (
        <CancelOrderModal
          table={table}
          itemCount={cartItems.filter(i => i.placed && i.status !== 'cancelled').length}
          reasons={getOrderCancellationReasons()}
          onClose={() => setShowCancelOrderModal(false)}
          onCancel={handleCancelOrder}
        />
      )}
```

**Replace with:**
```
      {showCancelOrderModal && (
        <CancelOrderModal
          table={table}
          itemCount={cartItems.filter(i => i.placed && i.status !== 'cancelled').length}
          reasons={getOrderCancellationReasons()}
          onClose={() => setShowCancelOrderModal(false)}
          onCancel={handleCancelOrder}
          mode={orderData?.razorpayOrderId ? 'refund' : 'cancel'}
        />
      )}
```

---

## Edit 6 — `src/pages/DashboardPage.jsx`

### 6a — Add import for `cancelAndRefund` (after existing api import)

**Find:**
```
import api from '../api/axios';
```
**Insert after:**
```
import { cancelAndRefund } from '../api/services/razorpayRefundService'; // CR-165
```

### 6b — Replace `handleCancelOrderConfirm` (line 1332–1350)

**Exact search:**
```
  const handleCancelOrderConfirm = useCallback(async (reason) => {
    if (!cancelOrderEntry) return;

    const order = getOrderDataForEntry(cancelOrderEntry);
    if (!order) return;

    // Await API call, then socket handler does removeOrder + updateTableStatus
    try {
      const payload = orderToAPI.cancelOrder(order.orderId, permissions?.[0] || 'Manager', reason);
      await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
      
      // Wait for socket to confirm removal
      await waitForOrderRemoval(order.orderId, 5000);
    } catch (err) {
      console.error('[CancelOrder] Failed:', err);
    }

    setCancelOrderEntry(null);
  }, [cancelOrderEntry, getOrderDataForEntry, permissions, waitForOrderRemoval]);
```

**Replace with:**
```
  // CR-165: accept (reason, note) — note used only for Razorpay refund
  const handleCancelOrderConfirm = useCallback(async (reason, note = '') => {
    if (!cancelOrderEntry) return;

    const order = getOrderDataForEntry(cancelOrderEntry);
    if (!order) return;

    // Await API call, then socket handler does removeOrder + updateTableStatus
    try {
      const payload = orderToAPI.cancelOrder(order.orderId, permissions?.[0] || 'Manager', reason);
      await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, payload);
      
      // Wait for socket to confirm removal
      await waitForOrderRemoval(order.orderId, 5000);
    } catch (err) {
      console.error('[CancelOrder] Failed:', err);
    }

    // CR-165: Trigger A — auto-refund for Razorpay PG orders
    if (order.razorpayOrderId) {
      try {
        await cancelAndRefund(order.orderId, reason?.reasonText || String(reason), note);
        toast({ title: "Refund Initiated", description: "Razorpay refund has been initiated." });
      } catch (err) {
        console.error('[CR-165] Refund failed after cancel:', err);
        toast({
          title: "Refund Failed",
          description: "Order cancelled but refund could not be initiated. Contact support.",
          variant: "destructive",
        });
      }
    }

    setCancelOrderEntry(null);
  }, [cancelOrderEntry, getOrderDataForEntry, permissions, waitForOrderRemoval]);
```

### 6c — Update CancelOrderModal call site (line 2040–2050)

**Exact search:**
```
        {cancelOrderEntry && (
          <CancelOrderModal
            table={cancelOrderEntry}
            itemCount={(() => {
              const order = getOrderDataForEntry(cancelOrderEntry);
              return order?.items?.filter(i => i.status !== 'cancelled').length || 0;
            })()}
            reasons={getOrderCancellationReasons()}
            onClose={() => setCancelOrderEntry(null)}
            onCancel={handleCancelOrderConfirm}
          />
        )}
```

**Replace with:**
```
        {cancelOrderEntry && (
          <CancelOrderModal
            table={cancelOrderEntry}
            itemCount={(() => {
              const order = getOrderDataForEntry(cancelOrderEntry);
              return order?.items?.filter(i => i.status !== 'cancelled').length || 0;
            })()}
            reasons={getOrderCancellationReasons()}
            onClose={() => setCancelOrderEntry(null)}
            onCancel={handleCancelOrderConfirm}
            mode={(() => {
              const order = getOrderDataForEntry(cancelOrderEntry);
              return order?.razorpayOrderId ? 'refund' : 'cancel'; // CR-165
            })()}
          />
        )}
```

---

## Edit 7 — `src/pages/reports-module/OrderReportBetaPage.jsx`

### 7a — Add import for `cancelAndRefund` + `CancelOrderModal`

Find the imports section at the top and add:
```js
import { cancelAndRefund } from '../../api/services/razorpayRefundService'; // CR-165
import CancelOrderModal from '../../components/order-entry/CancelOrderModal'; // CR-165
```

### 7b — Add state for refund modal

Find an existing `useState` block at the top of the component. Add:
```js
const [refundOrder, setRefundOrder] = useState(null); // CR-165: order selected for refund
```

### 7c — Add `handleRefundConfirm` handler

Add after the existing filter/sort logic (before the return statement):
```js
// CR-165: Trigger B — refund from Order Report
const handleRefundConfirm = async (reason, note) => {
  if (!refundOrder) return;
  try {
    await cancelAndRefund(refundOrder.order_id, reason?.reasonText || String(reason), note);
    toast({ title: "Refund Initiated", description: "Razorpay refund has been initiated." });
  } catch (err) {
    toast({
      title: "Refund Failed",
      description: err?.readableMessage || "Refund could not be initiated. Contact support.",
      variant: "destructive",
    });
  } finally {
    setRefundOrder(null);
  }
};
```

### 7d — Add [Refund] button in order row

In the row actions cell (wherever the row renders, find existing action buttons), add a Refund button conditional on `razorpay_order_id`:

```jsx
{row.razorpay_order_id && (
  <button
    onClick={() => setRefundOrder(row)}
    className="px-2 py-1 text-xs font-medium rounded-lg border"
    style={{ color: '#EF4444', borderColor: '#FECACA', backgroundColor: '#FEF2F2' }}
    data-testid={`refund-order-btn-${row.order_id}`}
  >
    Refund
  </button>
)}
```

### 7e — Add CancelOrderModal at bottom of JSX (before closing div)

```jsx
{refundOrder && (
  <CancelOrderModal
    table={{ label: `Order #${refundOrder.restaurant_order_id || refundOrder.order_id}` }}
    itemCount={refundOrder.items?.length || 1}
    reasons={cancellationReasons || []}
    onClose={() => setRefundOrder(null)}
    onCancel={handleRefundConfirm}
    mode="refund"
  />
)}
```

**Note:** `cancellationReasons` must be available in scope. Check if `OrderReportBetaPage` already loads them; if not, add `useCancellationReasons` hook or load from context.

---

## Verification Matrix

| Edit | File | Change | Self-Test |
|---|---|---|---|
| 1 | `constants.js` | `RAZORPAY_CANCEL_REFUND` key | `grep 'RAZORPAY_CANCEL_REFUND' src/api/constants.js` → 1 hit |
| 2 | `razorpayRefundService.js` | `cancelAndRefund` exported | Import check: no error |
| 3 | `orderTransform.js` | `razorpayOrderId` mapped | Confirm key present after transform line 237 |
| 4 | `CancelOrderModal.jsx` | `mode` prop, note textarea | Open modal in refund mode: title = "Cancel & Refund", textarea visible, button = "Confirm & Refund via Razorpay" |
| 5a | `OrderEntry.jsx` | Import added | No compile error |
| 5b | `OrderEntry.jsx` | `handleCancelOrder(reason, note)` | Cancel non-Razorpay order: 1 API call. Cancel Razorpay order: 2 API calls (cancel + refund) |
| 5c | `OrderEntry.jsx` | Modal `mode` prop | Non-Razorpay order: modal shows "Cancel Order". Razorpay order: modal shows "Cancel & Refund" |
| 6a | `DashboardPage.jsx` | Import added | No compile error |
| 6b | `DashboardPage.jsx` | `handleCancelOrderConfirm(reason, note)` | Same as 5b via card cancel |
| 6c | `DashboardPage.jsx` | Modal `mode` prop | Same as 5c |
| 7 | `OrderReportBetaPage.jsx` | Refund button + modal | PG row shows "Refund" button. Click → modal in refund mode. Confirm → `cancelAndRefund` called |
| R1 | Regression | Cancel cash order unchanged | No refund toast, 1 API call only |
| R2 | Regression | Cancel room/delivery unchanged | No regression on other order types |
| R3 | Regression | QSR cancel unchanged | Same single-call behaviour |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-165 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: row → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 7 files listed with CR-165 + 2026-08-24
- [ ] Code markers: // CR-165 in every modified file (see edits above)
- [ ] Compile: webpack 0 new errors/warnings
```

---

## Risk Notes

| Risk | Mitigation in this plan |
|---|---|
| Refund fires on non-Razorpay order | `razorpayOrderId` guard at both Trigger A sites. `mode` auto-set from order data. |
| Double cancel | Not possible — cancel fires once; refund only fires after cancel API call |
| Cancel success / refund fail | Separate error toast: "Order cancelled but refund failed — contact support." Never blocks cancel. |
| `orderTransform.js` change regression | Only additive field — `razorpayOrderId: null` for all non-PG orders. Zero risk to existing consumers. |
| `CancelOrderModal` backward compat | `mode` defaults to `'cancel'`. All existing call sites without `mode` prop are unaffected. |
| `handleCancelOrderConfirm` dep array | `cancelAndRefund` is a module-level import, NOT a dependency — no `useCallback` dep array update needed. |

---

## Credentials

- Test account (has Razorpay orders): `owner@18march.com / ***`
- Preview URL: `https://core-pos-deploy-12.preview.emergentagent.com`
