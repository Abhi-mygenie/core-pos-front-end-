# POS2.0 Wave 1 — Exact Code Diff Preview — 2026-05-17

No source files have been modified. This document contains the verbatim current code and the exact proposed replacement code for each Wave 1 bug.

---

## BUG-062 — Hide "To Room" for Takeaway / Delivery

### File
`frontend/src/components/order-entry/CollectPaymentPanel.jsx`

### Component / function
`CollectPaymentPanel` — JSX render, To Room button block.

### Current code (lines 1952–1953)
```jsx
            {/* To Room Button - only for non-room postpaid orders with rooms available (hidden for prepaid/Place+Pay) */}
            {!isRoom && hasRooms && hasPlacedItems && (
```

### Proposed code (lines 1952–1953)
```jsx
            {/* To Room Button — dine-in/walk-in only, non-room, postpaid, rooms available (BUG-062: hidden for takeaway/delivery/prepaid/Place+Pay) */}
            {!isRoom && hasRooms && hasPlacedItems && (orderType === 'dineIn' || orderType === 'walkIn') && (
```

### Why safe
- `orderType` is already declared as a prop at line 29 (`orderType = 'dineIn'`). No new variable introduced.
- The rest of the `<button>` block (lines 1954–1966) is untouched.
- No financial, payload, or API change — purely a render gate.

### Side effects
None. The button is the only element gated by this condition. All other payment method buttons and the rest of the payment flow are unaffected.

---

## BUG-073 — Empty Customization Wrapper Fix

### File
`frontend/src/components/order-entry/CartPanel.jsx`

### Component / function
`CartPanel` — JSX render, two locations where `item.customizations` is checked.

### Site A: Current code (line 65)
```jsx
        {item.customizations && !isCancelled && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
            {item.customizations.size && <span>{item.customizations.size}</span>}
            {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
            {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
          </div>
        )}
```

### Site A: Proposed code (line 65)
```jsx
        {item.customizations && !isCancelled && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
          <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
            {item.customizations.size && <span>{item.customizations.size}</span>}
            {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
            {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
          </div>
        )}
```

### Site B: Current code (line 192)
```jsx
      {item.customizations && (
        <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
          {item.customizations.size && <span>{item.customizations.size}</span>}
          {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
          {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
        </div>
      )}
```

### Site B: Proposed code (line 192)
```jsx
      {item.customizations && (item.customizations.size || item.customizations.variants?.length > 0 || item.customizations.addons?.length > 0) && (
        <div className="text-xs mt-0.5 leading-relaxed" style={{ color: COLORS.primaryGreen }}>
          {item.customizations.size && <span>{item.customizations.size}</span>}
          {item.customizations.variants?.length > 0 && <span>{item.customizations.size ? ', ' : ''}{item.customizations.variants.join(", ")}</span>}
          {item.customizations.addons?.length > 0 && <span> + {item.customizations.addons.join(", ")}</span>}
        </div>
      )}
```

### Why safe
- The inner `<span>` elements already guard themselves — this fix prevents the empty outer `<div>` from rendering when all three children would be empty.
- No data, payload, or state change. The DOM just no longer contains an empty `<div>` with a green background.

### Side effects
None. The fallback path (lines 73–99, for existing API orders without `customizations`) is untouched and already correctly self-guards via `(item.variation?.length > 0 || item.addOns?.length > 0)`.

---

## BUG-066 — Food Transfer: Exclude Rooms from Destination List

### File
`frontend/src/components/order-entry/TransferFoodModal.jsx`

### Component / function
`TransferFoodModal` — `occupiedOrders` useMemo filter.

### Current code (lines 13–22)
```jsx
  // All active orders eligible for food transfer — only dine-in tables and walk-in orders
  // Excludes takeaway/delivery (not eligible for food transfer)
  // BUG-271: Exclude prepaid orders — cannot transfer across payment types
  const occupiedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderId !== currentTable?.orderId &&
             (o.orderType === 'dineIn' || o.isWalkIn) &&
             o.paymentType !== 'prepaid'
    );
  }, [orders, currentTable?.orderId]);
```

### Proposed code (lines 13–22)
```jsx
  // All active orders eligible for food transfer — only dine-in tables and walk-in orders
  // Excludes takeaway/delivery (not eligible for food transfer)
  // BUG-271: Exclude prepaid orders — cannot transfer across payment types
  // BUG-066: Exclude room orders — rooms use orderType 'dineIn' but are not valid food transfer destinations
  const occupiedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.orderId !== currentTable?.orderId &&
             (o.orderType === 'dineIn' || o.isWalkIn) &&
             o.paymentType !== 'prepaid' &&
             !o.isRoom
    );
  }, [orders, currentTable?.orderId]);
```

### Why safe
- `isRoom` is a standard boolean property on order objects, set by `orderTransform.js` during from-API mapping. It is used in 20+ locations across the codebase (CollectPaymentPanel, DashboardPage, OrderEntry, etc.).
- This only affects the destination list. The transfer execution logic (`onTransfer`) is untouched.
- Room orders with `orderType === 'dineIn'` currently pass the filter but should not. This is the exact root cause.

### Side effects
None. The filter is consumed only within `TransferFoodModal` for the destination list. No other component reads `occupiedOrders`.

---

## BUG-067 — Station View Toggle: Disabled When No Stations

### File
`frontend/src/pages/StatusConfigPage.jsx`

### Component / function
`StatusConfigPage` — Station View Configuration section, toggle button.

### Current code (lines 766–780)
```jsx
                {/* Enable/Disable Toggle */}
                <button
                  data-testid="station-view-toggle"
                  onClick={toggleStationViewEnabled}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: stationViewConfig.enabled ? COLORS.primaryGreen : COLORS.borderGray,
                    color: 'white',
                  }}
                >
                  {stationViewConfig.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {stationViewConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
```

### Proposed code (lines 766–780)
```jsx
                {/* Enable/Disable Toggle — BUG-067: disabled when no stations configured */}
                <button
                  data-testid="station-view-toggle"
                  onClick={availableStations.length === 0 ? undefined : toggleStationViewEnabled}
                  disabled={availableStations.length === 0}
                  title={availableStations.length === 0 ? 'No stations available — configure stations in your product catalog first' : ''}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors${availableStations.length === 0 ? ' opacity-50 cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: availableStations.length === 0 ? COLORS.borderGray : stationViewConfig.enabled ? COLORS.primaryGreen : COLORS.borderGray,
                    color: 'white',
                  }}
                >
                  {stationViewConfig.enabled && availableStations.length > 0 ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  <span className="text-sm font-medium">
                    {availableStations.length === 0 ? 'No Stations' : stationViewConfig.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </button>
```

### Why safe
- `availableStations` is already in scope (destructured from `useStations()` at line 126). No new imports.
- The `disabled` HTML attribute plus `onClick={undefined}` double-gate prevents any toggle when there are no stations.
- `toggleStationViewEnabled` (lines 339–345) is untouched — only the button calling it is gated.
- No localStorage writes, no context mutations, no API calls affected.

### Side effects
None. When stations later become available (product catalog update + bootstrap reload), `availableStations` repopulates and the button re-enables on the next render. No persistent state is changed.

---

## BUG-079 — Polling Threshold: 1-Miss Removal

### File
`frontend/src/hooks/useOrderPollingReconciliation.js`

### Component / function
`useOrderPollingReconciliation` hook — constants and comments.

### Site A: Current code (line 13)
```js
//   - Two consecutive missing polls required before removal
```

### Site A: Proposed code (line 13)
```js
//   - One missing poll required before removal (BUG-079: owner accepted trade-off)
```

### Site B: Current code (line 34)
```js
export const REMOVAL_MISS_THRESHOLD = 2;          // two consecutive misses
```

### Site B: Proposed code (line 34)
```js
export const REMOVAL_MISS_THRESHOLD = 1;          // one miss (BUG-079: owner accepted faster removal)
```

### Site C: Current code (line 201)
```js
        // Confirmed orphan after two consecutive missing polls.
```

### Site C: Proposed code (line 201)
```js
        // Confirmed orphan after one missing poll (BUG-079).
```

### Why safe
- The comparison at line 200 (`if (nextMisses >= REMOVAL_MISS_THRESHOLD)`) is **untouched**. With threshold = 1, the first miss (prevMisses=0, nextMisses=1, 1 >= 1 = true) triggers removal.
- All protections remain intact:
  - Hold orders (fOrderStatus 8/9): skipped at line 180–188 **before** the miss counter is reached.
  - Engaged orders: skipped at line 190–195 **before** the miss counter is reached.
  - Open-in-OrderEntry orders: handled by `engagedOrders` set.
- The `else` branch at line 216–218 (`missCountRef.current.set(orderId, nextMisses)`) is unreachable with threshold=1 because `nextMisses` will always be >= 1 on the first miss. This is harmless dead code — the branch is retained for future threshold changes.

### Side effects
- Orders disappear from the dashboard ~60s faster after server-side removal (was ~120s).
- If a single poll response is delayed/lost (network blip), an order may be momentarily removed. Socket re-add will restore it immediately on the next socket event. Owner explicitly accepted this trade-off.

---

## BUG-078 — CRM Timeout: Toast + Manual Proceed

### Files
1. `frontend/src/api/services/customerService.js`
2. `frontend/src/components/order-entry/CustomerModal.jsx`

### Component / function
1. `lookupCustomer` function (customerService.js)
2. `CustomerModal.handleSave` method (CustomerModal.jsx)

---

### File 1: customerService.js

### Current code (lines 40–49)
```js
export const lookupCustomer = async (phone) => {
  if (!phone?.trim()) return null;
  try {
    const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_LOOKUP, { phone: phone.trim() });
    if (!response.data?.success || !response.data?.data?.registered) return null;
    return fromAPI.customerLookup(response.data.data);
  } catch (err) {
    console.warn('[CRM] Customer lookup failed:', err.readableMessage || err.message);
    return null;
  }
};
```

### Proposed code (lines 40–49)
```js
export const lookupCustomer = async (phone) => {
  if (!phone?.trim()) return null;
  try {
    const response = await crmApi.post(API_ENDPOINTS.CUSTOMER_LOOKUP, { phone: phone.trim() });
    if (!response.data?.success || !response.data?.data?.registered) return null;
    return fromAPI.customerLookup(response.data.data);
  } catch (err) {
    // BUG-078: Distinguish CRM timeout from other failures.
    // Timeout / network-down → throw typed error so caller can show toast.
    // Other failures (4xx, parse) → return null (silent, same as "not found").
    const isTimeout = err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK';
    console.warn(`[CRM] Customer lookup ${isTimeout ? 'timed out' : 'failed'}:`, err.readableMessage || err.message);
    if (isTimeout) {
      const timeoutErr = new Error('CRM is not responding. You can proceed with manual entry.');
      timeoutErr.type = 'CRM_TIMEOUT';
      throw timeoutErr;
    }
    return null;
  }
};
```

### Why safe (customerService.js)
- The function signature and return type for the **happy path** and **non-timeout error path** are unchanged. `null` is still returned for "not found" and non-timeout errors.
- The **new throw** only fires when `err.code` is `'ECONNABORTED'` (Axios timeout, configured at 15s in `crmAxios.js` L49) or `'ERR_NETWORK'` (DNS/WiFi failure). These are the exact codes Axios sets for these scenarios.
- The thrown error has `.type = 'CRM_TIMEOUT'` so the caller can distinguish it from other exceptions.
- There is exactly **one** caller of `lookupCustomer` in the entire codebase: `CustomerModal.jsx` line 74. No other call site needs updating.

### Side effects (customerService.js)
- `lookupCustomer` can now throw. Before this change, it **never** threw (always returned `null` or a customer object). The single caller must handle the throw. Future callers must also handle it.

---

### File 2: CustomerModal.jsx

### Current code (lines 1–4, imports)
```jsx
import { useState, useEffect, useRef } from "react";
import { X, Search, User, Calendar, CreditCard, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";
import { searchCustomers, createCustomer, updateCustomer, lookupCustomer } from "../../api/services/customerService";
```

### Proposed code (lines 1–5, imports)
```jsx
import { useState, useEffect, useRef } from "react";
import { X, Search, User, Calendar, CreditCard, Loader2 } from "lucide-react";
import { COLORS } from "../../constants";
import { searchCustomers, createCustomer, updateCustomer, lookupCustomer } from "../../api/services/customerService";
import { useToast } from "../../hooks/use-toast";
```

### Current code (lines 6, inside component body — first line after opening)
```jsx
const CustomerModal = ({ onClose, onSave, initialData = null, restaurantId = '' }) => {
  const [name, setName] = useState(initialData?.name || "");
```

### Proposed code (lines 6, inside component body — add toast hook)
```jsx
const CustomerModal = ({ onClose, onSave, initialData = null, restaurantId = '' }) => {
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name || "");
```

### Current code (lines 72–84, inside handleSave try block — the lookupCustomer call)
```jsx
      } else {
        // New customer — first check if phone exists in CRM
        const existing = await lookupCustomer(phone.trim());
        if (existing) {
          // Phone already registered — use existing, update details
          customerId = existing.id;
          await updateCustomer(customerId, {
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);
        } else {
```

### Proposed code (lines 72–84, inside handleSave try block)
```jsx
      } else {
        // New customer — first check if phone exists in CRM
        let existing = null;
        try {
          existing = await lookupCustomer(phone.trim());
        } catch (lookupErr) {
          if (lookupErr.type === 'CRM_TIMEOUT') {
            // BUG-078: CRM timeout — show toast, allow cashier to proceed with manual entry.
            toast({
              title: 'CRM Timeout',
              description: lookupErr.message,
              variant: 'destructive',
              duration: 5000,
            });
            // existing stays null — fall through to "Truly new customer" create path below
          } else {
            throw lookupErr; // Re-throw unexpected errors to outer catch at L113
          }
        }
        if (existing) {
          // Phone already registered — use existing, update details
          customerId = existing.id;
          await updateCustomer(customerId, {
            name: name.trim(),
            phone: phone.trim(),
            dob: birthday || undefined,
            anniversary: anniversary || undefined,
          }, restaurantId);
        } else {
```

### Why safe (CustomerModal.jsx)
- The outer try/catch at line 113 (`} catch (err) { setError(...) }`) already handles unexpected errors. The re-throw in the `else` branch ensures non-timeout errors still reach it.
- On CRM timeout, `existing` stays `null`, so execution falls through to the `else` at line 84 → "Truly new customer — create in CRM" (line 85–98). The cashier can still save.
- `useToast` is available from `../../hooks/use-toast` — the same hook used in 10+ other components (OrderCard, StatusConfigPage, OrderEntry, etc.). No new dependency.
- The toast uses `variant: 'destructive'` (red/warning style) and `duration: 5000` (auto-dismiss after 5s). No blocking modal. No retry button per owner direction.

### Side effects (CustomerModal.jsx)
- A new `useToast()` hook call is added to the component. This is a standard React hook — no performance cost.
- On CRM timeout, the cashier sees a toast AND the customer is created as new (since `lookupCustomer` returned `null`). If the customer actually existed in CRM, this creates a duplicate. This is the same behavior as before (silent `null` return → create) but now with a **visible warning** so the cashier knows CRM was unreachable.

---

## BUG-072 — Notes on Order Card: Already Implemented

### File
`frontend/src/components/cards/OrderCard.jsx`

### Component / function
`OrderCard` — JSX render.

### Proof: Order-level note already rendered (lines 425–437)
```jsx
      {/* ── HEADER ROW 3: Order Note (same background, part of header) ── */}
      {order.orderNote && (
        <div 
          className="px-3 pb-2 flex items-start gap-1.5" 
          style={{ backgroundColor: getHeaderBgColor() }}
          onClick={(e) => e.stopPropagation()}
        >
          <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: COLORS.primaryOrange }} />
          <span className="text-xs" style={{ color: COLORS.darkText }}>
            {order.orderNote}
          </span>
        </div>
      )}
```
- `order.orderNote` is mapped from `api.order_note` at `orderTransform.js` line 272.
- The render uses `FileText` icon (orange) + dark text. Visible when truthy, hidden when empty.

### Proof: Item-level notes already rendered (lines 489–533)
```jsx
            // Item-level notes
            const itemNote = item.notes || '';
            
            // ... (inside item render loop)

                    {/* Item note inline */}
                    {itemNote && (
                      <div className="flex items-center gap-1 text-[9px] leading-tight">
                        <FileText className="w-2 h-2" style={{ color: COLORS.grayText }} />
                        <span className="italic" style={{ color: COLORS.grayText }}>
                          {itemNote}
                        </span>
                      </div>
                    )}
```
- `item.notes` is mapped from `detail.food_level_notes` at `orderTransform.js` line 130.
- Renders inline per item with a small `FileText` icon (gray) + italic gray text.

### Proof: No table_note / room_note fields exist in the data model
```
$ grep -rn "tableNote\|table_note\|roomNote\|room_note" frontend/src/api/transforms/orderTransform.js
(no results)

$ grep -rn "table_note\|room_note" frontend/src/api/transforms/
(no results)
```
The order transform maps only `orderNote` (order-level) and `item.notes` (item-level). There are no `table_note` or `room_note` fields in the API response schema or the transform layer.

### Why no change is recommended
1. Both available note types (`orderNote`, `item.notes`) are already rendered on the OrderCard.
2. The master plan audit correction (Finding 4) says: "Mirror the existing order-screen note format on the order card. **Do not invent backend fields.**"
3. `table_note` and `room_note` do not exist in the frontend data model. Adding them would require backend API changes, which violates the "do not change backend code" and "do not change API contracts" rules.
4. The bug intake says "room notes, table notes, and item notes should appear on the order card." All note data that the frontend has access to is already displayed.

### Proposed change
**No code change.** Mark BUG-072 as `already_implemented` for the available note fields. If the owner requires separate `table_note` / `room_note` fields, that is a backend feature request + frontend follow-up, not a Wave 1 bug fix.

### Side effects
None (no change).

---

## Summary

| Bug | File(s) | Change type | Lines changed | New imports |
|---|---|---|---|---|
| BUG-062 | `CollectPaymentPanel.jsx` | Tighten render gate (1 line) | 2 | None |
| BUG-073 | `CartPanel.jsx` | Tighten render gate (2 sites) | 2 | None |
| BUG-066 | `TransferFoodModal.jsx` | Add filter condition + comment | 3 | None |
| BUG-067 | `StatusConfigPage.jsx` | Add disabled/label logic to button | ~10 | None |
| BUG-079 | `useOrderPollingReconciliation.js` | Change constant + 3 comments | 3 | None |
| BUG-078 | `customerService.js` + `CustomerModal.jsx` | Timeout detection + toast | ~25 | `useToast` in CustomerModal |
| BUG-072 | `OrderCard.jsx` | **No change** (already implemented) | 0 | None |

**Total lines changed: ~45 across 6 files. Zero financial / payment / print / API impact.**

---

## Final Status

`wave_1_code_diff_preview_created_pending_final_approval`

- No source files modified
- No `/app/memory/final/` updated
- No pending freeze docs updated
- No deployment
- No bugs marked fixed
