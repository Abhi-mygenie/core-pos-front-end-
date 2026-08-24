# CR-163 — Implementation Plan (Gate 3)
## Move Food Items from Room Order to Table (Room-to-Table Split)

**Date:** 2026-08-24
**Role:** PLANNING (Gate 3 — Implementation Plan)
**Based on:** `/app/memory/impact/CR-163_IMPACT_ANALYSIS.md`
**Design ref:** `/app/design_guidelines.json` (2026-08-24 — SplitRoomItemsModal spec)

---

## Pre-Implementation Entry Verification (MANDATORY)

Implementation agent must verify ALL before writing a single line:

```
1. constants.js line 86 reads EXACTLY:
   PAYMENT_LINK:      '/api/v1/razor-pay/payment-link',
   → confirm verbatim

2. roomService.js is 146 lines. Last export is:
   export const getRoomList = async () => {
   → confirm line count + last function name

3. CartPanel.jsx prop block ends at line 802 with:
   setScheduleAt,
   }) => {
   → confirm verbatim

4. CartPanel.jsx line 1198-1203 reads EXACTLY:
   {/* Column Headers */}
   <div className="px-4 py-2 flex items-center text-xs font-medium"
     style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
     <span className="flex-1">Items</span>
     <span className="w-16 text-center" ...>Qty</span>
     <span className="w-20 text-right" ...>Price</span>
   </div>
   → confirm verbatim

5. OrderEntry.jsx line 143 reads:
   const [transferItem, setTransferItem] = useState(initialTransferItem);
   → confirm verbatim

6. OrderEntry.jsx line 2578-2581 reads:
   setScheduleAt={setScheduleAt}
              />
   → confirm verbatim (this is where new CartPanel prop is inserted)

7. OrderEntry.jsx line 2701-2702 reads:
   {transferItem && table && (
     <TransferFoodModal item={transferItem} ...
   → confirm verbatim (SplitRoomItemsModal renders right after this block)

8. SplitRoomItemsModal.jsx does NOT exist yet:
   ls /app/frontend/src/components/order-entry/SplitRoomItemsModal.jsx → not found
```

---

## Scope Lock

**Files WILL change (5):**
1. `src/api/constants.js`
2. `src/api/services/roomService.js`
3. `src/components/order-entry/SplitRoomItemsModal.jsx` ← NEW
4. `src/components/order-entry/CartPanel.jsx`
5. `src/components/order-entry/OrderEntry.jsx`

**Files will NOT touch:**
`TransferFoodModal.jsx`, `DashboardPage.jsx`, `socketHandlers.js`,
`orderTransform.js`, `CollectPaymentPanel.jsx`, `AppProviders.jsx`

---

## Edit 1 — `src/api/constants.js`

**Position:** After line 86 (`PAYMENT_LINK`)

**Search (verbatim):**
```
  // CR-017: WhatsApp Payment Link — generates Razorpay link + sends WhatsApp/SMS
  PAYMENT_LINK:      '/api/v1/razor-pay/payment-link',
```

**Replace with:**
```
  // CR-017: WhatsApp Payment Link — generates Razorpay link + sends WhatsApp/SMS
  PAYMENT_LINK:      '/api/v1/razor-pay/payment-link',
  // CR-163: Split room order items to a new walk-in order
  SPLIT_ROOM_ORDER:  '/api/v2/vendoremployee/order/split-room-order',
```

---

## Edit 2 — `src/api/services/roomService.js`

**Position:** Append at end of file (after line 146, after `getRoomList`)

**Append:**
```js

// CR-163: Split selected items from room order into a new walk-in order.
// Backend creates the destination order automatically.
// customer_name is sent so the created order shows as "Room {N}" on Dashboard;
// backend uses it if supported, falls back to Walk-In label if not.
export const splitRoomOrder = async ({ orderId, orderDetailIds, customerName, remark = '' }) => {
  const payload = {
    order_id: orderId,
    order_detail_ids: orderDetailIds,           // flat array of item IDs (confirmed format)
    ...(customerName ? { customer_name: customerName } : {}),
    remark,
  };
  const res = await api.post(API_ENDPOINTS.SPLIT_ROOM_ORDER, payload);
  return res.data;
};
```

---

## Edit 3 — `src/components/order-entry/SplitRoomItemsModal.jsx` (NEW FILE)

**Full file:**

```jsx
// CR-163: Modal for splitting selected food items from a room order to a new table.
// Multi-item selection + remark. Entire row is tap target (touch-friendly POS).
// Mirrors CancelOrderModal + TransferFoodModal structure (fixed overlay, COLORS, Tailwind).
import { useState, useMemo } from 'react';
import { X, CheckCircle2, Circle, ArrowRightLeft } from 'lucide-react';
import { COLORS } from '../../constants';

const SplitRoomItemsModal = ({ cartItems = [], roomNo, onClose, onSplit }) => {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Only show placed, non-marker, non-cancelled items
  const splitableItems = useMemo(() =>
    cartItems.filter(i => i.placed && !i.isCheckInMarker && i.status !== 'cancelled'),
    [cartItems]
  );

  const runningTotal = useMemo(() =>
    [...selectedIds].reduce((sum, id) => {
      const item = splitableItems.find(i => i.id === id);
      return sum + (item ? (item.totalPrice || item.price * item.qty || 0) : 0);
    }, 0),
    [selectedIds, splitableItems]
  );

  const toggleItem = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    if (selectedIds.size === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSplit([...selectedIds], remark);
      onClose();
    } catch (err) {
      setError(err?.readableMessage || err?.message || 'Failed to move items. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const count = selectedIds.size;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      data-testid="split-items-modal"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex items-start justify-between"
          style={{ borderColor: COLORS.borderGray }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ArrowRightLeft className="w-5 h-5" style={{ color: COLORS.primaryGreen }} />
              <h2 className="text-xl font-bold" style={{ color: COLORS.darkText }}>
                Move Items to Table
              </h2>
            </div>
            <p className="text-sm" style={{ color: COLORS.grayText }}>
              Moving from{' '}
              <span
                className="font-semibold px-2 py-0.5 rounded-full text-xs"
                style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}
              >
                {roomNo ? `Room ${roomNo}` : 'Room'}
              </span>
              {' '}· Select items to split out
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            data-testid="split-items-close-btn"
          >
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-2"
          style={{ backgroundColor: COLORS.sectionBg }}
        >
          <p
            className="text-xs font-bold uppercase tracking-wider px-1 pb-2"
            style={{ color: COLORS.grayText, letterSpacing: '0.1em' }}
          >
            Select items to move
          </p>

          {/* Check-in marker — always shown as disabled if present */}
          {cartItems.some(i => i.isCheckInMarker) && (
            <div
              className="flex items-center gap-4 p-4 rounded-xl border cursor-not-allowed select-none opacity-50"
              style={{ backgroundColor: '#f9fafb', borderColor: 'transparent' }}
              data-testid="split-item-checkin"
            >
              <Circle className="w-6 h-6 flex-shrink-0" style={{ color: '#d1d5db' }} />
              <div className="flex-1">
                <div className="text-sm font-medium" style={{ color: COLORS.grayText }}>
                  Room Stay Marker
                </div>
                <div className="text-xs" style={{ color: COLORS.grayText }}>Check-in item — cannot be moved</div>
              </div>
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText, border: `1px solid ${COLORS.borderGray}` }}
              >
                excluded
              </span>
            </div>
          )}

          {/* Selectable placed items */}
          {splitableItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            const price = item.totalPrice || (item.itemUnitPrice || item.price) * item.qty || 0;
            return (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all"
                style={{
                  backgroundColor: isSelected ? '#f0fdf4' : '#ffffff',
                  borderColor: isSelected ? COLORS.primaryGreen : COLORS.borderGray,
                  boxShadow: isSelected ? `0 0 0 3px rgba(34,197,94,0.12)` : 'none',
                  minHeight: '64px',
                }}
                data-testid={`split-item-row-${item.id}`}
                aria-selected={isSelected}
              >
                {isSelected
                  ? <CheckCircle2 className="w-6 h-6 flex-shrink-0" style={{ color: COLORS.primaryGreen }} />
                  : <Circle className="w-6 h-6 flex-shrink-0" style={{ color: '#d1d5db' }} />
                }
                <div className="flex-1">
                  <div className="text-sm font-semibold" style={{ color: COLORS.darkText }}>
                    {item.name}
                  </div>
                  <div className="text-xs" style={{ color: COLORS.grayText }}>
                    {item.qty} × ₹{((item.itemUnitPrice || item.price) || 0).toLocaleString()}
                  </div>
                </div>
                <div
                  className="text-base font-bold tabular-nums flex-shrink-0"
                  style={{ color: isSelected ? '#16a34a' : COLORS.darkText }}
                >
                  ₹{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </button>
            );
          })}

          {/* Remark */}
          <div
            className="p-4 rounded-xl border"
            style={{ backgroundColor: '#ffffff', borderColor: COLORS.borderGray }}
          >
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: COLORS.grayText, letterSpacing: '0.1em' }}
            >
              Note (optional)
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="e.g. friends paying separately..."
              rows={2}
              className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 border"
              style={{
                borderColor: COLORS.borderGray,
                color: COLORS.darkText,
                backgroundColor: COLORS.sectionBg,
                focusRingColor: COLORS.primaryGreen,
              }}
              data-testid="split-items-remark"
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className="p-5 border-t flex items-center justify-between gap-4"
          style={{ borderColor: COLORS.borderGray, backgroundColor: '#ffffff' }}
        >
          <div>
            <div className="text-xs font-medium" style={{ color: COLORS.grayText }}>Moving</div>
            <div
              className="text-xl font-bold tabular-nums"
              style={{ color: count > 0 ? '#16a34a' : COLORS.darkText }}
            >
              ₹{runningTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border font-semibold text-sm transition-colors"
              style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
              data-testid="split-items-cancel-btn"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={count === 0 || submitting}
              className="px-5 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ backgroundColor: COLORS.primaryGreen }}
              data-testid="split-confirm-btn"
            >
              <ArrowRightLeft className="w-4 h-4" />
              {submitting
                ? 'Moving...'
                : count === 0
                  ? 'Select Items'
                  : `Move ${count} Item${count > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <div
            className="px-5 pb-4 text-xs font-medium"
            style={{ color: '#ef4444', backgroundColor: '#ffffff' }}
            data-testid="split-items-error"
          >
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitRoomItemsModal;
```

---

## Edit 4 — `src/components/order-entry/CartPanel.jsx`

### 4a — Add `onSplitItems` prop (after line 802)

**Search (verbatim):**
```
  setScheduleAt,
}) => {
```

**Replace with:**
```
  setScheduleAt,
  onSplitItems = null, // CR-163: room order split trigger — null for non-room orders
}) => {
```

### 4b — Add trigger button to Column Headers row (line 1198-1203)

**Search (verbatim):**
```
      {/* Column Headers */}
      <div className="px-4 py-2 flex items-center text-xs font-medium" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
        <span className="flex-1">Items</span>
        <span className="w-16 text-center" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Qty</span>
        <span className="w-20 text-right" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Price</span>
      </div>
```

**Replace with:**
```
      {/* Column Headers */}
      {/* CR-163: Move Items trigger — visible only for room orders with placed items */}
      <div className="px-4 py-2 flex items-center text-xs font-medium" style={{ backgroundColor: COLORS.sectionBg, color: COLORS.grayText }}>
        <span className="flex-1">Items</span>
        <span className="w-16 text-center" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Qty</span>
        <span className="w-20 text-right" style={{ borderLeft: `1px solid ${COLORS.borderGray}` }}>Price</span>
        {isRoom && hasPlacedItems && onSplitItems && (
          <button
            onClick={onSplitItems}
            className="ml-3 flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold transition-colors hover:bg-white"
            style={{ borderColor: COLORS.borderGray, color: COLORS.darkText, backgroundColor: '#f9fafb' }}
            data-testid="move-items-trigger"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.primaryGreen} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M21 16v3a2 2 0 0 0-2 2h-3M8 21H5a2 2 0 0 0-2-2v-3"/>
              <path d="m7 11 5-5 5 5M7 13l5 5 5-5"/>
            </svg>
            Move Items
          </button>
        )}
      </div>
```

**Import note:** The `ArrowRightLeft` icon from lucide-react can be used as an alternative to the inline SVG. If lucide-react version installed supports `ArrowRightLeft`, use it. Otherwise the inline SVG above is the fallback. Implementation agent must check: `grep -r "ArrowRightLeft" /app/frontend/src/` — if found elsewhere, import from lucide-react; if not, use inline SVG.

---

## Edit 5 — `src/components/order-entry/OrderEntry.jsx`

### 5a — Add imports (top of file, after existing service imports)

**Find existing import block for services and add:**
```js
import SplitRoomItemsModal from './SplitRoomItemsModal'; // CR-163
import { splitRoomOrder } from '../../api/services/roomService'; // CR-163
```

Verify roomService is already imported. If it is (check `grep -n "roomService" OrderEntry.jsx`), just add `splitRoomOrder` to the named imports rather than adding a new import line.

### 5b — Add `showSplitModal` state (line 143 area)

**Search (verbatim):**
```
  const [transferItem, setTransferItem] = useState(initialTransferItem);
```

**Replace with:**
```
  const [transferItem, setTransferItem] = useState(initialTransferItem);
  const [showSplitModal, setShowSplitModal] = useState(false); // CR-163
```

### 5c — Add `handleSplitRoomItems` handler

**Position:** After `handleTransfer` function (search: `const handleTransfer = async`)

**Add new function after handleTransfer's closing `};`:**
```js
  // CR-163: Split selected items from room order to a new walk-in table
  const handleSplitRoomItems = async (selectedIds, remark) => {
    const orderId = effectiveTable?.orderId || placedOrderId;
    const roomNo = orderData?.roomInfo?.roomNo;
    if (!orderId || selectedIds.length === 0) return;
    await splitRoomOrder({
      orderId,
      orderDetailIds: selectedIds,
      customerName: roomNo ? `Room ${roomNo}` : undefined,
      remark,
    });
    toast({ title: 'Items Moved', description: 'Selected items split to a new table.' });
  };
```

### 5d — Pass `onSplitItems` prop to CartPanel (line 2578-2581 area)

**Search (verbatim):**
```
                setScheduleAt={setScheduleAt}
              />
```

**Replace with:**
```
                setScheduleAt={setScheduleAt}
                onSplitItems={table?.isRoom ? () => setShowSplitModal(true) : null}
              />
```

### 5e — Render SplitRoomItemsModal (after TransferFoodModal, line 2702 area)

**Search (verbatim):**
```
      {transferItem && table && (
        <TransferFoodModal item={transferItem} currentTable={table} orders={orders} onClose={() => setTransferItem(null)} onTransfer={handleTransfer} />
      )}
```

**Replace with:**
```
      {transferItem && table && (
        <TransferFoodModal item={transferItem} currentTable={table} orders={orders} onClose={() => setTransferItem(null)} onTransfer={handleTransfer} />
      )}
      {showSplitModal && table?.isRoom && (
        <SplitRoomItemsModal
          cartItems={cartItems}
          roomNo={orderData?.roomInfo?.roomNo}
          onClose={() => setShowSplitModal(false)}
          onSplit={handleSplitRoomItems}
        />
      )}
```

---

## Execution Sequence

```
1. Edit 1 — constants.js          (LOW risk, additive — no dependencies)
2. Edit 2 — roomService.js         (LOW risk, additive new export)
3. Edit 3 — SplitRoomItemsModal.jsx (NEW FILE — safe, no consumers yet)
4. Edit 4a — CartPanel.jsx prop    (additive, defaults null — zero regression)
4b — CartPanel.jsx trigger button (conditional render, no existing logic changed)
5a — OrderEntry.jsx imports
5b — OrderEntry.jsx state
5c — OrderEntry.jsx handler
5d — OrderEntry.jsx CartPanel prop
5e — OrderEntry.jsx modal render

→ webpack compile check after Edit 3 (new file)
→ webpack compile check after Edit 5e (full integration)
```

---

## Verification Matrix

| Edit | File | Change | How to Verify |
|---|---|---|---|
| 1 | `constants.js` | `SPLIT_ROOM_ORDER` key | `grep 'SPLIT_ROOM_ORDER' src/api/constants.js` → 1 hit |
| 2 | `roomService.js` | `splitRoomOrder` exported | `grep 'splitRoomOrder' src/api/services/roomService.js` → 1 hit |
| 3 | `SplitRoomItemsModal.jsx` | File exists + renders | Webpack compile: 0 errors |
| 3 | `SplitRoomItemsModal.jsx` | Check-in marker excluded | Inspect: `isCheckInMarker` items render disabled row, not in `splitableItems` |
| 4a | `CartPanel.jsx` | `onSplitItems` prop | `grep 'onSplitItems' src/components/order-entry/CartPanel.jsx` → 2 hits (prop + usage) |
| 4b | `CartPanel.jsx` | Trigger visible for rooms | Room order in OrderEntry: "Move Items" button appears in column header. `data-testid="move-items-trigger"` present |
| 4b | `CartPanel.jsx` | Trigger hidden for tables | Regular dine-in order: no Move Items button visible |
| 5b | `OrderEntry.jsx` | `showSplitModal` state | Inspect file — state declaration present |
| 5c | `OrderEntry.jsx` | `handleSplitRoomItems` handler | `grep 'handleSplitRoomItems' src/components/order-entry/OrderEntry.jsx` → 2 hits |
| 5e | `OrderEntry.jsx` | Modal renders on trigger | Click "Move Items" → SplitRoomItemsModal opens, `data-testid="split-items-modal"` found in DOM |
| — | Full flow | Item selection updates total | Select 2 items → footer total = sum of those items |
| — | Full flow | Confirm calls splitRoomOrder | Network tab: POST `/api/v2/vendoremployee/order/split-room-order` with `order_detail_ids`, `customer_name`, `remark` |
| — | Full flow | Room order total reduces after split | Socket update-order fires → room order total decreases |
| R1 | Regression | Table order: no Move Items btn | Regular T5 order: button absent |
| R2 | Regression | Room checkout unchanged | Room checkout flow after adding prop: no change to billing/collect |
| R3 | Regression | TransferFoodModal unchanged | Regular table item transfer: works as before |

---

## Post-Code Registry Checklist

```
- [ ] registry.json: CR-163 → status: IMPLEMENTED, sprint_key: pos_6_0
- [ ] CR_REGISTRY.md: row updated → IMPLEMENTED
- [ ] FILE_OWNERSHIP.md: all 5 files listed with CR-163 + 2026-08-24
- [ ] Code markers: // CR-163 comment in every modified file
- [ ] Compile: webpack 0 new errors, 0 new warnings
```

---

## Risk Notes

| Risk | Mitigation |
|---|---|
| CartPanel prop default = null | Existing callers (DashboardPage etc.) pass no `onSplitItems` → null → button never renders. Zero regression. |
| `orderData?.roomInfo?.roomNo` undefined | `undefined` → `customer_name` not sent (spread skips undefined). Backend creates anonymous walk-in. Graceful degradation. |
| `ArrowRightLeft` lucide icon missing | Fallback inline SVG provided in plan. Implementation agent checks version first. |
| OrderEntry R5 hotspot | Only additive: 1 state, 1 handler, 1 prop, 1 modal. No existing cancel/transfer/billing logic touched. |
| `splitRoomOrder` already in roomService | If it exists from a prior session, skip Edit 2. Entry verification step 2 confirms. |

---

## Credentials

- Test (needs active room order): any hotel/resort account on preprod
- Preview URL: `https://core-pos-deploy-12.preview.emergentagent.com`
