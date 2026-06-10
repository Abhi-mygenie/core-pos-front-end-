# CR-017 — Implementation Plan (Gate 3)

**Status:** COMPLETE
**Date:** 2026-06-09
**CR:** CR-017 — WhatsApp Payment Link
**Priority:** P1
**Sprint:** POS 4.0
**Depends on:** Gate 2 Impact Analysis (COMPLETE)

---

## 1. Change Summary

| # | File | Action | Lines (est.) |
|---|---|---|---|
| 1 | `frontend/src/api/constants.js` | MODIFY — add 1 endpoint constant | +2 |
| 2 | `frontend/src/api/services/paymentLinkService.js` | **CREATE** — API call wrapper | ~35 |
| 3 | `frontend/src/components/cards/WhatsAppPaymentModal.jsx` | **CREATE** — popup component | ~130 |
| 4 | `frontend/src/components/cards/OrderCard.jsx` | MODIFY — add icon + modal state + import | ~25 |

**Total: 2 new files, 2 modified files. ~190 lines added. 0 lines removed.**

---

## 2. Files NOT Touched (explicit scope lock)

| File | Reason |
|---|---|
| `CollectPaymentPanel.jsx` | Out of scope (Q-017-1: OrderCard only) |
| `TableCard.jsx` | WhatsApp is OrderCard-only |
| `DashboardPage.jsx` | No prop changes needed — OrderCard is self-contained |
| `ChannelColumnsLayout.jsx` | Pass-through, no changes |
| `ChannelColumn.jsx` | Pass-through, no changes |
| `OrderEntry.jsx` | Not related |
| `profileTransform.js` | No Razorpay ID gating (Q-017-5: show for everybody) |
| `RestaurantContext.jsx` | No new fields needed |
| `featureFlags.js` | No feature flag (Q-017-5: show for everybody) |
| Any `.bak.*` files | Never touch backups |

---

## 3. Detailed Changes Per File

### File 1: `frontend/src/api/constants.js` (MODIFY)

**Location:** After line 62 (`BILL_PAYMENT` endpoint), before `EDIT_ORDER_ITEM`

**Add:**
```js
  // CR-017: WhatsApp Payment Link — generates Razorpay link + sends WhatsApp/SMS
  PAYMENT_LINK:      '/api/v1/razor-pay/payment-link',
```

**Risk:** ZERO (additive, no existing lines changed)

---

### File 2: `frontend/src/api/services/paymentLinkService.js` (CREATE)

**Purpose:** API call wrapper for the payment link endpoint.

**Exports:**
```js
/**
 * Send payment link via WhatsApp/SMS
 * @param {Object} params
 * @param {string|number} params.orderId - Order ID
 * @param {number} params.amount - Payment amount
 * @param {string} params.phone - 10-digit customer phone
 * @param {string} params.customerName - Customer name (optional, defaults to "Customer")
 * @param {string} params.restaurantName - Restaurant name (optional)
 * @returns {Promise<{ orderId, paymentLink, source }>}
 *   source: "razorpay" (new link) | "db" (existing reused)
 */
export const sendPaymentLink = async ({ orderId, amount, phone, customerName, restaurantName }) => { ... }
```

**Implementation:**
- Import `api` from `../axios`
- Import `API_ENDPOINTS` from `../constants`
- POST to `API_ENDPOINTS.PAYMENT_LINK`
- Payload: `{ order_id, payment_amount, customer_name, customer_phone, restaurant_name }`
- Return: `{ orderId, paymentLink, source }` (transformed from API response)
- Error: re-throw with `readableMessage` (axios interceptor already attaches this)

**Dependencies:** `api` (existing axios instance), `API_ENDPOINTS` (existing constants)

---

### File 3: `frontend/src/components/cards/WhatsAppPaymentModal.jsx` (CREATE)

**Purpose:** Small modal/dialog for entering/confirming phone + name before sending payment link.

**Props:**
```js
WhatsAppPaymentModal.propTypes = {
  isOpen: bool,           // Controls visibility
  onClose: func,          // Close handler
  order: object,          // Order object (for orderId, amount, customerName, phone)
  restaurantName: string, // From restaurant context
}
```

**Component Structure:**
```
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Send Payment Link</DialogTitle>
    </DialogHeader>
    
    <!-- Amount (read-only display) -->
    <div>₹{order.amount}</div>
    
    <!-- Customer Name input (auto-populated) -->
    <Input value={name} onChange={setName} placeholder="Customer name" />
    
    <!-- Phone input (auto-populated if available) -->
    <Input value={phone} onChange={setPhone} placeholder="10-digit phone" type="tel" maxLength={10} />
    
    <!-- Validation error (inline, below phone) -->
    {error && <p className="text-red-500">{error}</p>}
    
    <!-- Send button -->
    <Button onClick={handleSend} disabled={isSending}>
      {isSending ? <Loader2 spinning /> : "Send via WhatsApp"}
    </Button>
  </DialogContent>
</Dialog>
```

**Internal State:**
- `name` — initialized from `order.customerName || order.customer || ""`
- `phone` — initialized from `order.phone || ""`
- `isSending` — loading boolean
- `error` — validation error string

**Logic:**
1. On open: populate `name` and `phone` from order context
2. On send: validate phone is 10 digits → call `sendPaymentLink()` → toast → close
3. Toast messages:
   - New link (`source: "razorpay"`): *"Payment link sent to {phone} via WhatsApp"*
   - Reused link (`source: "db"`): *"Payment link resent to {phone}"*
   - Error: *"Failed to send payment link: {message}"*

**UI Components Used (existing):**
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `../ui/dialog`
- `Input` from `../ui/input`
- `Button` from `../ui/button`
- `Loader2` from `lucide-react`
- `useToast` hook

---

### File 4: `frontend/src/components/cards/OrderCard.jsx` (MODIFY)

**Change A — Import (line 11, after AssignRiderModal import):**
```js
import WhatsAppPaymentModal from "./WhatsAppPaymentModal";
```

**Change B — State (line 66, after showAssignRider state):**
```js
const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
```

**Change C — Visibility flag (line 93, after fOrderStatus declaration):**
```js
// CR-017: WhatsApp payment link visible on unpaid orders only
const showWhatsAppPayment = ![3, 6, 10].includes(fOrderStatus);
```

**Change D — WhatsApp icon button (line 877, after Cancel button closing `)}`, before `</div>` that closes the left group):**
```jsx
              {/* CR-017: WhatsApp Payment Link button */}
              {showWhatsAppPayment && (
              <button
                data-testid={`whatsapp-payment-btn-${orderId}`}
                className={`min-h-[44px] min-w-[44px] rounded-lg border flex items-center justify-center ${isActionInProgress ? 'opacity-50' : ''}`}
                style={{ borderColor: '#25D366' }}
                title="Send Payment Link via WhatsApp"
                onClick={(e) => { e.stopPropagation(); setShowWhatsAppModal(true); }}
                disabled={isActionInProgress}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </button>
              )}
```

**Change E — Modal instance (line ~1034, after AssignRiderModal closing tag, before `</div>`):**
```jsx
      {/* CR-017: WhatsApp Payment Link Modal */}
      <WhatsAppPaymentModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        order={order}
        restaurantName={restaurant?.name}
      />
```

---

## 4. Data Flow Diagram

```
User taps WhatsApp icon on OrderCard
  │
  ├─ showWhatsAppModal → true
  │
  ▼
WhatsAppPaymentModal opens
  │ Pre-populated: name (order.customerName), phone (order.phone), amount (order.amount)
  │
  ├─ User enters/edits phone → validates 10 digits
  │
  ▼
User taps "Send via WhatsApp"
  │
  ├─ paymentLinkService.sendPaymentLink({
  │     orderId: order.orderId,
  │     amount: order.amount,
  │     phone: inputPhone,
  │     customerName: inputName || "Customer",
  │     restaurantName: restaurant.name
  │   })
  │
  ├─ POST /api/v1/razor-pay/payment-link
  │     Authorization: Bearer {token from localStorage}
  │
  ▼
Response
  ├─ source: "razorpay" → toast "Payment link sent to {phone} via WhatsApp"
  ├─ source: "db"       → toast "Payment link resent to {phone}"
  ├─ error              → toast "Failed: {message}", modal stays open
  │
  ▼
Modal closes (on success)
Icon remains unchanged — ready for re-tap
```

---

## 5. Error Handling

| Scenario | Handling |
|---|---|
| Phone empty or < 10 digits | Inline validation error below phone field: "Enter a valid 10-digit phone number" |
| API returns 4xx/5xx | Error toast with `error.readableMessage` (from axios interceptor). Modal stays open for retry. |
| Network timeout (60s) | Same as above — axios default timeout |
| Order has no orderId | Should never happen — icon only renders when `order` exists. Defensive: early return in service. |

---

## 6. Test IDs

| Element | data-testid |
|---|---|
| WhatsApp icon button | `whatsapp-payment-btn-{orderId}` |
| Modal dialog | `whatsapp-payment-modal` |
| Name input | `whatsapp-payment-name` |
| Phone input | `whatsapp-payment-phone` |
| Amount display | `whatsapp-payment-amount` |
| Send button | `whatsapp-payment-send-btn` |

---

*CR-017 Implementation Plan — Gate 3 complete. Ready for Gate 4 (Code Gate — owner GO).*
