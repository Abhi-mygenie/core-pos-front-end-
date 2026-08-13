# BUG-097 Bucket 4 — Exact Diff Preview
**Date:** 2026-05-20
**Status:** PREVIEW ONLY — no files modified yet. Pending owner ack.
**Companion to:** `POS3_0_BUG_097_BUCKET_4_OWNER_APPROVAL_PLAN_2026_05_20.md`

---

## File 1 (EDIT) — `frontend/src/api/services/deliveryService.js`

### Before (current, full file)
```js
// Delivery Service — BUG-097: Dispatch + Assign Rider API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Dispatch a delivery order (own delivery, no rider assignment).
 * Calls order-status-update with order_dispatch_status: "Yes".
 *
 * @param {number|string} orderId - Order ID
 * @param {string} roleName - User role from auth (e.g., "Owner", "Manager")
 * @returns {Promise<object>} API response data
 */
export const dispatchOrder = async (orderId, roleName) => {
  const response = await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, {
    order_id: orderId,
    order_status: 'serve',
    role_name: roleName,
    order_dispatch_status: 'Yes',
  });
  return response.data;
};
```

### After (additive — `dispatchOrder` unchanged)
```js
// Delivery Service — BUG-097: Dispatch + Assign Rider API calls

import api from '../axios';
import { API_ENDPOINTS } from '../constants';

/**
 * Dispatch a delivery order (own delivery, no rider assignment).
 * Calls order-status-update with order_dispatch_status: "Yes".
 */
export const dispatchOrder = async (orderId, roleName) => {
  const response = await api.put(API_ENDPOINTS.ORDER_STATUS_UPDATE, {
    order_id: orderId,
    order_status: 'serve',
    role_name: roleName,
    order_dispatch_status: 'Yes',
  });
  return response.data;
};

/**
 * BUG-097 Bucket 4: Fetch list of delivery employees (riders).
 * GET /api/v1/vendoremployee/delivery-employee-list
 *
 * Returns normalized riders: { id, fullName, phone, image, _raw }.
 * Per user directive 2026-05-20: NO role/availability filter — backend does
 * not expose such a field today, show ALL employees as-is.
 */
export const getDeliveryEmployees = async () => {
  const response = await api.get(API_ENDPOINTS.DELIVERY_EMPLOYEE_LIST);
  const raw = response?.data?.data ?? response?.data ?? [];
  const list = Array.isArray(raw) ? raw : [];
  return list.map((r) => ({
    id: r.id,
    fullName: [r.f_name, r.l_name].filter(Boolean).join(' ').trim() || `Rider #${r.id}`,
    phone: r.phone || '',
    image: r.image || null,
    _raw: r,
  }));
};

/**
 * BUG-097 Bucket 4: Assign a rider to a delivery order.
 * POST /api/v1/vendoremployee/delivery-order-assign
 *
 * Payload (minimal — confirm with backend on first smoke):
 *   { order_id, delivery_man_id }
 *
 * Bucket 5 (socket reflection of rider accept/reject) is NOT wired here —
 * the parent will rely on the existing socket refresh for the order to
 * pick up the new delivery_man / delivery_man_status.
 */
export const assignDeliveryRider = async (orderId, deliveryManId) => {
  const response = await api.post(API_ENDPOINTS.DELIVERY_ORDER_ASSIGN, {
    order_id: orderId,
    delivery_man_id: deliveryManId,
  });
  return response.data;
};
```

**Diff summary:** +2 functions, 0 deletions, `dispatchOrder` untouched.

---

## File 2 (NEW) — `frontend/src/components/modals/AssignRiderModal.jsx`

```jsx
import { useEffect, useState } from "react";
import { X, Bike, Loader2, RotateCw } from "lucide-react";
import { COLORS } from "../../constants";
import { getDeliveryEmployees, assignDeliveryRider } from "../../api/services/deliveryService";
import { useToast } from "../../hooks/use-toast";

/**
 * BUG-097 Bucket 4 — Assign Rider Modal
 *
 * Single-select rider picker. Lists ALL employees returned by
 * `delivery-employee-list` (no role/availability filter — backend
 * does not expose such a field today, per user directive 2026-05-20).
 *
 * Props:
 *   - isOpen (bool)
 *   - onClose (fn)
 *   - orderId (int|string) — order to assign
 *   - orderNumber (string) — display only
 *   - orderAmount (number)  — display only
 *   - onAssigned (fn)       — invoked after successful assign;
 *                              parent should refresh order (socket already does).
 */
const AssignRiderModal = ({ isOpen, onClose, orderId, orderNumber, orderAmount, onAssigned }) => {
  const { toast } = useToast();
  const [riders, setRiders] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [assigning, setAssigning] = useState(false);

  const loadRiders = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getDeliveryEmployees();
      setRiders(list);
    } catch (err) {
      setError(err?.readableMessage || err?.message || 'Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedId(null);
      loadRiders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (!selectedId || assigning) return;
    setAssigning(true);
    try {
      await assignDeliveryRider(orderId, selectedId);
      const picked = riders.find(r => r.id === selectedId);
      toast({ title: 'Rider assigned', description: `${picked?.fullName || ''} assigned to order #${orderNumber || orderId}` });
      onAssigned?.(picked);
      onClose?.();
    } catch (err) {
      toast({
        title: 'Assign failed',
        description: err?.readableMessage || err?.message || 'Could not assign rider',
        variant: 'destructive',
      });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
      data-testid="assign-rider-modal-backdrop"
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
        data-testid="assign-rider-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: COLORS.borderGray }}>
          <div className="flex items-center gap-2">
            <Bike className="w-5 h-5" style={{ color: COLORS.primaryOrange }} />
            <div>
              <h3 className="font-semibold text-base" style={{ color: COLORS.darkText }}>Assign Rider</h3>
              {(orderNumber || orderAmount) && (
                <div className="text-xs" style={{ color: COLORS.grayText }}>
                  {orderNumber ? `Order #${orderNumber}` : ''}
                  {orderNumber && orderAmount ? '  •  ' : ''}
                  {orderAmount ? `₹${orderAmount}` : ''}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            data-testid="assign-rider-close"
            aria-label="Close"
          >
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2" data-testid="assign-rider-list">
          {loading && (
            <div className="flex items-center justify-center py-8 gap-2" style={{ color: COLORS.grayText }} data-testid="assign-rider-loading">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading riders…</span>
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center py-6 gap-2" data-testid="assign-rider-error">
              <div className="text-sm text-red-600">{error}</div>
              <button
                onClick={loadRiders}
                className="flex items-center gap-1 text-sm px-3 py-2 rounded border"
                style={{ borderColor: COLORS.borderGray, color: COLORS.darkText }}
                data-testid="assign-rider-retry"
              >
                <RotateCw className="w-4 h-4" /> Retry
              </button>
            </div>
          )}

          {!loading && !error && riders.length === 0 && (
            <div className="text-center py-8 text-sm" style={{ color: COLORS.grayText }} data-testid="assign-rider-empty">
              No riders available.
            </div>
          )}

          {!loading && !error && riders.map((r) => {
            const checked = selectedId === r.id;
            return (
              <label
                key={r.id}
                className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 border"
                style={{
                  borderColor: checked ? COLORS.primaryOrange : COLORS.borderGray,
                  backgroundColor: checked ? '#FFF3E8' : 'white',
                }}
                data-testid={`assign-rider-option-${r.id}`}
              >
                <input
                  type="radio"
                  name="assign-rider"
                  checked={checked}
                  onChange={() => setSelectedId(r.id)}
                  className="w-4 h-4"
                  style={{ accentColor: COLORS.primaryOrange }}
                  data-testid={`assign-rider-radio-${r.id}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate" style={{ color: COLORS.darkText }}>{r.fullName}</div>
                  {r.phone && (
                    <div className="text-xs" style={{ color: COLORS.grayText }}>{r.phone}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-4 py-3 border-t" style={{ borderColor: COLORS.borderGray }}>
          <button
            onClick={onClose}
            disabled={assigning}
            className="flex-1 py-3 rounded-lg font-medium border disabled:opacity-50"
            style={{ borderColor: COLORS.borderGray, color: COLORS.grayText }}
            data-testid="assign-rider-cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || assigning || loading}
            className="flex-1 py-3 rounded-lg font-medium text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: COLORS.primaryOrange }}
            data-testid="assign-rider-confirm"
          >
            {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assign Rider'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignRiderModal;
```

**Diff summary:** New file, ~165 lines. Mirrors `StationPickerModal.jsx` conventions (z-index, backdrop click, COLORS palette, data-testids).

---

## File 3 (EDIT) — `frontend/src/components/cards/OrderCard.jsx`

### Change 3.1 — Import the new modal
```diff
 import StationPickerModal from "../modals/StationPickerModal";
+import AssignRiderModal from "../modals/AssignRiderModal";
```

### Change 3.2 — Add modal state next to existing modal state (~L62)
```diff
   const [showStationPicker, setShowStationPicker] = useState(false);
   const [availableStations, setAvailableStations] = useState([]);
+  // BUG-097 Bucket 4: Assign Rider modal state
+  const [showAssignRider, setShowAssignRider] = useState(false);
```

### Change 3.3 — Replace `console.log` stub at L863 with modal open
```diff
                 <button
                   data-testid={`assign-rider-btn-${orderId}`}
                   className={`min-h-[44px] px-6 text-sm font-bold rounded-lg flex items-center justify-center gap-2 ${isActionInProgress ? 'opacity-50 cursor-not-allowed' : ''}`}
                   style={{ backgroundColor: "#FFF3E8", color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
-                  onClick={() => console.log(`Assign Rider order ${orderId}`)}
+                  onClick={() => setShowAssignRider(true)}
                   disabled={isActionInProgress}
                 >
                   Assign Rider
                 </button>
```

### Change 3.4 — Lift rider chip gate so own-delivery assigned orders also show the chip + add status badge (~L750)
```diff
-      {isDelivery && !isOwn && (
+      {isDelivery && (hasRiderAssigned || !isOwn) && (
         <div
           className="px-3 py-2 border-b flex items-center gap-2"
           style={{ borderColor: COLORS.borderGray, backgroundColor: COLORS.sectionBg }}
           onClick={(e) => e.stopPropagation()}
         >
           <div
             className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
             style={{ backgroundColor: COLORS.borderGray }}
           >
             <User className="w-3 h-3" style={{ color: COLORS.grayText }} />
           </div>
           <div className="flex-1 min-w-0">
             {order.rider ? (
               <>
                 <div className="text-xs font-medium truncate" style={{ color: COLORS.darkText }}>{order.rider}</div>
                 <div className="text-[10px]" style={{ color: COLORS.grayText }}>{order.riderPhone}</div>
               </>
             ) : (
               <div className="text-xs" style={{ color: COLORS.grayText }}>Awaiting Runner</div>
             )}
           </div>
+          {/* BUG-097 Bucket 4: Rider status badge — sourced from orderTransform.riderStatus */}
+          {order.riderStatus === 'riderAssigned' && (
+            <span
+              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
+              style={{ backgroundColor: '#FFF3E8', color: COLORS.primaryOrange, border: `1px solid ${COLORS.primaryOrange}` }}
+              data-testid={`rider-status-assigned-${orderId}`}
+            >
+              Assigned
+            </span>
+          )}
+          {order.riderStatus === 'riderReached' && (
+            <span
+              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
+              style={{ backgroundColor: '#E8F5E9', color: COLORS.primaryGreen, border: `1px solid ${COLORS.primaryGreen}` }}
+              data-testid={`rider-status-reached-${orderId}`}
+            >
+              Reached
+            </span>
+          )}
         </div>
       )}
```

### Change 3.5 — Mount the modal next to StationPickerModal at file bottom
```diff
       {/* Station Picker Modal for KOT */}
       <StationPickerModal ... />
+
+      {/* BUG-097 Bucket 4: Assign Rider Modal */}
+      <AssignRiderModal
+        isOpen={showAssignRider}
+        onClose={() => setShowAssignRider(false)}
+        orderId={orderId}
+        orderNumber={orderNumber}
+        orderAmount={order.amount}
+        onAssigned={() => {/* socket refresh will pick up the change */}}
+      />
```

**Diff summary:** +1 import, +1 useState, 1 onClick replace, 1 gate widen, 2 badge spans, 1 modal mount. No other behavior changed.

---

## File 4 (EDIT) — `frontend/src/components/cards/TableCard.jsx`

### Change 4.1 — Import the new modal
```diff
 import { dispatchOrder } from "../../api/services/deliveryService";
+import AssignRiderModal from "../modals/AssignRiderModal";
```

### Change 4.2 — Add modal state (~L80)
```diff
   const [isDispatching, setIsDispatching] = useState(false);
+  // BUG-097 Bucket 4: Assign Rider modal state
+  const [showAssignRider, setShowAssignRider] = useState(false);
```

### Change 4.3 — Replace `console.log` stub at L450 with modal open
```diff
-                      onClick={isDelivery && !hasRiderAssigned
-                        ? (deliveryAssign
-                          ? () => console.log(`Assign Rider order ${table.orderId}`)
-                          : handleDispatch)
-                        : handleMarkServedClick}
+                      onClick={isDelivery && !hasRiderAssigned
+                        ? (deliveryAssign
+                          ? (e) => { e?.stopPropagation?.(); setShowAssignRider(true); }
+                          : handleDispatch)
+                        : handleMarkServedClick}
```

### Change 4.4 — Mount the modal at the end of the component JSX
```diff
       </div>
+      {/* BUG-097 Bucket 4: Assign Rider Modal */}
+      <AssignRiderModal
+        isOpen={showAssignRider}
+        onClose={() => setShowAssignRider(false)}
+        orderId={table.orderId}
+        orderNumber={table.order?.orderNumber}
+        orderAmount={table.order?.amount}
+      />
   );
```

**Open question TC-1:** Should TableCard also render the rider chip + status badge (matching the OrderCard chip)? Currently TableCard has no rider chip at all. **Default in this preview = NO chip in TableCard** (keep TableCard footprint minimal; chip already exists in OrderCard). Owner to confirm or override.

**Diff summary:** +1 import, +1 useState, 1 onClick replace, 1 modal mount. No other behavior changed.

---

## 5. Files explicitly NOT touched (re-affirmed)

- `api/transforms/orderTransform.js` — already has `riderStatus`, `rider`, `riderPhone`, `deliveryManId` from Bucket 1. No change.
- `api/transforms/profileTransform.js` — `deliveryAssign` already mapped. No change.
- `api/constants.js` — `DELIVERY_EMPLOYEE_LIST` + `DELIVERY_ORDER_ASSIGN` already present. No change.
- `components/cards/DeliveryCard.jsx` — legacy/unused. No change.
- Any socket handler files — Bucket 5, still blocked. No change.
- `/app/memory/final/` — out of scope per user directive.

---

## 6. Risk + Rollback

- All changes are additive UI / service-level. No transform or context change, no payload change to existing endpoints.
- Rollback path = single git revert on the implementation commit; nothing in transforms or shared state is touched.
- API smoke risk: if `delivery-order-assign` expects extra fields, the first live click will surface a 4xx with the backend's own validator message → patched additively in a follow-up edit (no schema migration on FE side needed).

---

## 7. Owner Ack Required Before Code

Owner to reply approving:
- [ ] All 4 file changes above as-shown.
- [ ] OQ-B4-* in the companion Owner Approval Plan answered.
- [ ] TC-1 (TableCard chip) decision recorded.

Only after this ack will the agent run the actual `search_replace` / `create_file` operations.
